import type { APIRoute } from "astro";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "../../lib/supabase-server";
import { idempotencyKey } from "../../lib/stripe-idem";

export const prerender = false;

interface CustomCheckoutBody {
  amount: number; // in SGD whole/decimal dollars
  name: string;
  email: string;
  reference?: string;
}

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50_000;

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, url }) => {
  const stripeKey = import.meta.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return bad(
      "Payments aren't configured on this environment. Please WhatsApp us.",
      503,
    );
  }

  let body: CustomCheckoutBody;
  try {
    body = (await request.json()) as CustomCheckoutBody;
  } catch {
    return bad("Invalid JSON body.");
  }

  const amount = Number(body.amount);
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const reference = String(body.reference ?? "").trim().slice(0, 200);

  if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
    return bad(`Amount must be at least S$${MIN_AMOUNT}.`);
  }
  if (amount > MAX_AMOUNT) {
    return bad(`For amounts over S$${MAX_AMOUNT.toLocaleString("en-SG")}, please contact us directly.`);
  }
  if (!name) return bad("Please provide your name.");
  if (!email || !/.+@.+\..+/.test(email)) {
    return bad("Please provide a valid email.");
  }

  // Stripe expects whole-cent integers. Round to nearest cent to avoid
  // floating-point sub-cent values.
  const unitCents = Math.round(amount * 100);
  const description =
    reference || `Custom payment from ${name}`;

  const stripe = new Stripe(stripeKey);
  const idemKey = idempotencyKey("custom", { email, unitCents, reference });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "sgd",
              unit_amount: unitCents,
              product_data: {
                name: "Payment to Fine Art Printing",
                description,
              },
            },
          },
        ],
        success_url: `${url.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${url.origin}/make-payment`,
        metadata: {
          source: "fineartprinting",
          kind: "custom_payment",
        },
      },
      { idempotencyKey: idemKey },
    );
  } catch (e: any) {
    return bad(`Stripe error: ${e?.message ?? String(e)}`, 502);
  }

  // Best-effort pending row. The webhook will update it (or insert one
  // if this fails) on checkout.session.completed.
  try {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase.from("orders").insert({
        stripe_session_id: session.id,
        status: "pending",
        kind: "custom_payment",
        delivery_method: "self",
        customer_name: name,
        customer_email: email,
        subtotal_sgd: amount,
        delivery_sgd: 0,
        total_sgd: amount,
        line_items: [
          {
            artworkTitle: "Payment",
            artworkArtist: null,
            description,
            quantity: 1,
            unitPriceSGD: amount,
          },
        ],
      });
    }
  } catch (e) {
    console.error("[checkout-custom] failed to insert pending order:", e);
  }

  return new Response(
    JSON.stringify({ url: session.url, id: session.id }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
