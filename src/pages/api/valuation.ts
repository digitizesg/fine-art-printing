/**
 * POST /api/valuation
 *
 * Submission endpoint for the online art-valuation form. Validates
 * the form, uploads the customer's photos to the private
 * `valuation-uploads` bucket, creates a Stripe checkout session for
 * S$80 × n, and inserts a pending order row tying the two together.
 *
 * The webhook (api/stripe-webhook.ts) marks the row paid on
 * checkout.session.completed and dispatches the customer + studio
 * emails (with signed download URLs to the photos).
 *
 * Security notes:
 *  - Files go to a private bucket; only signed URLs (7-day expiry)
 *    leave the server, sent in the studio notification email.
 *  - Stripe holds the funds until the customer completes payment, so
 *    a half-finished submission costs nothing — uploads are still
 *    written but become orphans we can sweep later.
 */
import type { APIRoute } from "astro";
import Stripe from "stripe";
import { extname } from "node:path";
import { createSupabaseAdminClient } from "../../lib/supabase-server";
import { verifyTurnstile } from "../../lib/turnstile";

export const prerender = false;

const PRICE_PER_ARTWORK_SGD = 80;
const MAX_QUANTITY = 6;
const MIN_QUANTITY = 1;
const MAX_FILES = 10;
const MAX_BYTES_PER_FILE = 25 * 1024 * 1024; // 25 MB cap; bigger than email but small enough for sane upload
const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB across all files
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/tiff",
  "application/pdf",
]);
const ALLOWED_EXT = /\.(jpe?g|png|heic|heif|tiff?|pdf)$/i;
const VALUATION_BUCKET = "valuation-uploads";

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function safeFilename(name: string): string {
  // Strip path bits and anything risky; keep extension.
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120);
}

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  const stripeKey = import.meta.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return bad("Payments aren't configured on this environment. Please WhatsApp us.", 503);
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return bad("Storage isn't configured. Please WhatsApp us.", 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Could not parse form submission.");
  }

  // Honeypot.
  if (String(form.get("website") ?? "").trim()) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // Turnstile — guard the heavy upload + Stripe path against bots.
  // Soft-fails open if TURNSTILE_SECRET_KEY isn't configured (matches
  // contact form behaviour).
  const turnstileToken = String(form.get("cf-turnstile-response") ?? "");
  const captchaOk = await verifyTurnstile(
    turnstileToken,
    clientAddress ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    "valuation",
  );
  if (!captchaOk) {
    return bad("Captcha check failed. Please refresh and try again.");
  }

  const quantityRaw = String(form.get("quantity") ?? "").trim();
  const quantity = parseInt(quantityRaw, 10);
  const firstName = String(form.get("first_name") ?? "").trim();
  const lastName = String(form.get("last_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const additionalDetails = String(form.get("additional_details") ?? "").trim();

  if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    return bad(`Pick a quantity between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`);
  }
  if (!firstName) return bad("Please provide your first name.");
  if (!lastName) return bad("Please provide your last name.");
  if (!email || !/.+@.+\..+/.test(email)) return bad("Please provide a valid email.");
  if (!phone || phone.replace(/\D/g, "").length < 6) {
    return bad("Please provide a phone number we can reach you on.");
  }
  if (!additionalDetails) {
    return bad("Please share any details you have about the artist, medium, year, or provenance.");
  }
  if (
    firstName.length > 100 ||
    lastName.length > 100 ||
    email.length > 254 ||
    phone.length > 40 ||
    additionalDetails.length > 5000
  ) {
    return bad("That submission is too long.");
  }

  const fileEntries = form.getAll("photos").filter(
    (f): f is File => f instanceof File && f.size > 0,
  );
  if (fileEntries.length === 0) {
    return bad("Please upload at least one photo of the artwork.");
  }
  if (fileEntries.length > MAX_FILES) {
    return bad(`Maximum ${MAX_FILES} files.`);
  }
  let totalBytes = 0;
  for (const f of fileEntries) {
    if (f.size > MAX_BYTES_PER_FILE) {
      return bad(`"${f.name}" is over 25 MB.`);
    }
    if (!ALLOWED_MIME.has(f.type) && !ALLOWED_EXT.test(f.name)) {
      return bad(`"${f.name}" is not a supported file type.`);
    }
    totalBytes += f.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return bad("Combined upload size is over 100 MB. Please reduce file sizes.");
    }
  }

  // Upload photos under a per-submission UUID prefix so we can scope
  // signed URLs and clean up if the customer abandons checkout.
  const uploadGroupId = crypto.randomUUID();
  const uploadPaths: { path: string; name: string }[] = [];
  for (const f of fileEntries) {
    const ext = extname(f.name).toLowerCase() || "";
    const path = `${uploadGroupId}/${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await f.arrayBuffer());
    const { error } = await supabase.storage
      .from(VALUATION_BUCKET)
      .upload(path, buffer, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
    if (error) {
      console.error("[valuation] upload failed:", error.message);
      return bad("Upload failed. Please try again.", 502);
    }
    uploadPaths.push({ path, name: safeFilename(f.name) });
  }

  const total = quantity * PRICE_PER_ARTWORK_SGD;
  const customerName = `${firstName} ${lastName}`.trim();

  // Create Stripe Checkout session.
  const stripe = new Stripe(stripeKey);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity,
          price_data: {
            currency: "sgd",
            unit_amount: PRICE_PER_ARTWORK_SGD * 100,
            product_data: {
              name: "Art valuation",
              description: `Online art valuation · S$${PRICE_PER_ARTWORK_SGD} per artwork`,
            },
          },
        },
      ],
      success_url: `${url.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url.origin}/art-valuation`,
      metadata: {
        kind: "valuation",
        quantity: String(quantity),
      },
    });
  } catch (e: any) {
    return bad(`Stripe error: ${e?.message ?? String(e)}`, 502);
  }

  // Insert pending order row that ties the Stripe session to the
  // upload group. Webhook reads it back on payment to send emails.
  try {
    await supabase.from("orders").insert({
      stripe_session_id: session.id,
      status: "pending",
      kind: "valuation",
      delivery_method: "self",
      customer_name: customerName,
      customer_email: email,
      customer_phone: phone,
      subtotal_sgd: total,
      delivery_sgd: 0,
      total_sgd: total,
      line_items: [
        {
          kind: "valuation",
          uploadGroupId,
          uploadPaths,
          quantity,
          unitPriceSGD: PRICE_PER_ARTWORK_SGD,
          additionalDetails,
        },
      ],
    });
  } catch (e) {
    console.error("[valuation] failed to insert pending order:", e);
  }

  return new Response(
    JSON.stringify({ url: session.url, id: session.id }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
