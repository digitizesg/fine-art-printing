import type { APIRoute } from "astro";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "../../lib/supabase-server";
import {
  sendCustomerOrderConfirmation,
  sendStudioOrderNotification,
  type OrderEmailContext,
} from "../../lib/emails";
import { extractShippingAddress } from "../../lib/stripe-shipping";

export const prerender = false;

/**
 * Stripe webhook endpoint for /api/stripe-webhook.
 *
 * Verifies the signature against STRIPE_WEBHOOK_SECRET, then routes
 * events. Today we handle only checkout.session.completed: marks the
 * existing pending order as paid (or inserts a new row if the
 * pending insert from /api/checkout failed) and fires the two
 * confirmation emails via Resend.
 */
export const POST: APIRoute = async ({ request }) => {
  const stripeKey = import.meta.env.STRIPE_SECRET_KEY;
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return new Response("Webhook not configured", { status: 503 });
  }

  // Stripe signs the *raw* request bytes. request.text() can subtly
  // re-encode (e.g. normalise newlines) on some runtimes, so read as
  // an ArrayBuffer and hand Stripe a Buffer to keep the bytes verbatim.
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (e: any) {
    console.error("[stripe-webhook] signature verification failed:", e?.message);
    return new Response(`Webhook signature error: ${e?.message ?? "unknown"}`, {
      status: 400,
    });
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge other events without further work.
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Pull the full session including line items + customer details so we
  // can populate the customer-facing email even if the customer typed a
  // different email at the Stripe page than we had on file.
  let fullSession: Stripe.Checkout.Session;
  try {
    fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items", "customer_details", "shipping_details"],
    });
  } catch (e) {
    console.error("[stripe-webhook] failed to expand session:", e);
    fullSession = session;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    console.error("[stripe-webhook] Supabase admin client unavailable");
    return new Response("ok-but-not-recorded", { status: 200 });
  }

  const customerEmail = fullSession.customer_details?.email ?? null;
  const customerName = fullSession.customer_details?.name ?? null;
  const customerPhone = fullSession.customer_details?.phone ?? null;
  const shippingAddress = extractShippingAddress(fullSession);
  const deliveryMethod = (fullSession.metadata?.delivery as "self" | "local") ?? "self";
  const kind: "shop" | "custom_payment" =
    fullSession.metadata?.kind === "custom_payment" ? "custom_payment" : "shop";

  const paymentIntentId =
    typeof fullSession.payment_intent === "string"
      ? fullSession.payment_intent
      : fullSession.payment_intent?.id ?? null;

  // Try to update the existing pending row first.
  const { data: existing, error: lookupErr } = await supabase
    .from("orders")
    .select("id, reference, line_items, subtotal_sgd, delivery_sgd, total_sgd, status")
    .eq("stripe_session_id", fullSession.id)
    .maybeSingle();
  if (lookupErr) {
    console.error("[stripe-webhook] order lookup failed:", lookupErr.message);
  }

  let orderId: string | null = existing?.id ?? null;
  let reference: string | null = existing?.reference ?? null;
  let emailContextLines = (existing?.line_items as OrderEmailContext["lines"]) ?? [];
  let subtotalSGD = Number(existing?.subtotal_sgd ?? 0);
  let deliverySGD = Number(existing?.delivery_sgd ?? 0);
  let totalSGD = Number(existing?.total_sgd ?? 0);

  if (existing) {
    if (existing.status !== "paid") {
      const { error: updErr } = await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId,
          customer_email: customerEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          shipping_address: shippingAddress,
        })
        .eq("id", existing.id);
      if (updErr) {
        console.error("[stripe-webhook] order update failed:", updErr.message);
      }
    }
  } else {
    // Pending row was never written (e.g. checkout endpoint had a
    // Supabase blip). Reconstruct what we can from the Stripe session.
    const fallbackTotal = (fullSession.amount_total ?? 0) / 100;
    const fallbackDelivery =
      deliveryMethod === "local" ? 30 : 0;
    const fallbackSubtotal = Math.max(0, fallbackTotal - fallbackDelivery);
    const fallbackLines: OrderEmailContext["lines"] = (fullSession.line_items?.data ?? [])
      .filter((li) => li.description !== "Local Singapore delivery")
      .map((li) => ({
        artworkTitle: li.description ?? "Print",
        description: "",
        quantity: li.quantity ?? 1,
        unitPriceSGD: ((li.amount_total ?? 0) / 100) / Math.max(1, li.quantity ?? 1),
      }));

    const { data: inserted, error: insErr } = await supabase
      .from("orders")
      .insert({
        stripe_session_id: fullSession.id,
        stripe_payment_intent_id: paymentIntentId,
        status: "paid",
        kind,
        paid_at: new Date().toISOString(),
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_method: deliveryMethod,
        shipping_address: shippingAddress,
        subtotal_sgd: fallbackSubtotal,
        delivery_sgd: fallbackDelivery,
        total_sgd: fallbackTotal,
        line_items: fallbackLines,
      })
      .select("id, reference")
      .single();
    if (insErr) {
      console.error("[stripe-webhook] fallback insert failed:", insErr.message);
    } else if (inserted) {
      orderId = inserted.id;
      reference = inserted.reference;
      emailContextLines = fallbackLines;
      subtotalSGD = fallbackSubtotal;
      deliverySGD = fallbackDelivery;
      totalSGD = fallbackTotal;
    }
  }

  if (!reference) {
    // Couldn't establish an order — bail without sending email so we
    // don't promise the customer an order we can't track.
    return new Response("ok-without-record", { status: 200 });
  }

  const ctx: OrderEmailContext = {
    reference,
    customerEmail,
    customerName,
    deliveryMethod,
    shippingAddress: shippingAddress
      ? {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country,
        }
      : null,
    subtotalSGD,
    deliverySGD,
    totalSGD,
    lines: emailContextLines,
  };

  // Fire and forget the emails (errors logged but don't fail the webhook).
  await Promise.all([
    sendCustomerOrderConfirmation(ctx),
    sendStudioOrderNotification(ctx),
  ]);

  return new Response("ok", { status: 200 });
};
