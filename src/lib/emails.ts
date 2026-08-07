/**
 * Transactional email helpers for the artwork shop.
 *
 * Two emails fire on a successful Stripe checkout:
 *   1. Customer confirmation — sent to the email Stripe collected.
 *   2. Studio notification  — sent to ORDER_NOTIFICATION_EMAIL.
 *
 * Both run through Resend. Failures are logged but never block the
 * webhook response, so Stripe doesn't retry on a transient email blip.
 */
import { Resend } from "resend";
import { business } from "../data/business";

interface OrderEmailLine {
  artworkTitle: string;
  artworkArtist?: string | null;
  description: string;
  quantity: number;
  unitPriceSGD: number;
}

export interface OrderEmailContext {
  reference: string;
  customerEmail: string | null;
  customerName: string | null;
  deliveryMethod: "self" | "local";
  shippingAddress: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  subtotalSGD: number;
  deliverySGD: number;
  totalSGD: number;
  lines: OrderEmailLine[];
}

const fmtSGD = (n: number) => `S$${n.toLocaleString("en-SG")}`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAddress(addr: OrderEmailContext["shippingAddress"]): string {
  if (!addr) return "";
  const parts = [addr.line1, addr.line2, addr.city, addr.postal_code, addr.country]
    .filter((p): p is string => !!p && p.trim() !== "");
  return parts.join(", ");
}

function lineItemsHtml(lines: OrderEmailLine[]): string {
  return lines
    .map(
      (l) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-family:'Lora',Georgia,serif;font-size:14px;color:#1a1a1a;">
          <strong>${escapeHtml(l.artworkTitle)}</strong>
          ${l.artworkArtist ? `<br><span style="font-size:12px;color:#666;">${escapeHtml(l.artworkArtist)}</span>` : ""}
          <br><span style="font-size:12px;color:#666;">${escapeHtml(l.description)}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;color:#1a1a1a;text-align:center;font-variant-numeric:tabular-nums;">${l.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px;color:#1a1a1a;text-align:right;font-variant-numeric:tabular-nums;">${fmtSGD(l.unitPriceSGD * l.quantity)}</td>
      </tr>`,
    )
    .join("");
}

const STUDIO_ADDRESS_HTML =
  "120 Lower Delta Road, 08-01/02 Cendex Centre, Singapore 169208";

function shellHtml(opts: {
  heading: string;
  intro: string;
  ctx: OrderEmailContext;
  footer: string;
}): string {
  const { heading, intro, ctx, footer } = opts;
  const addressLine =
    ctx.deliveryMethod === "local"
      ? formatAddress(ctx.shippingAddress)
      : `Self-collection from our studio · ${STUDIO_ADDRESS_HTML}`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3ec;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);">
    <div style="padding:28px 28px 8px;">
      <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">Fine Art Printing</p>
      <h1 style="margin:0 0 12px;font-family:'Lora',Georgia,serif;font-weight:500;font-size:22px;color:#1a1a1a;">${escapeHtml(heading)}</h1>
      <p style="margin:0;font-size:14.5px;line-height:1.6;color:#444;">${intro}</p>
    </div>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0 0;border-collapse:collapse;">
      <thead>
        <tr style="background:#faf7f1;">
          <th style="padding:10px 12px;border-bottom:1px solid #eee;text-align:left;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#666;">Item</th>
          <th style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#666;width:60px;">Qty</th>
          <th style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#666;width:90px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml(ctx.lines)}
      </tbody>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px 12px;text-align:right;font-size:13px;color:#666;">Subtotal</td><td style="padding:10px 12px;text-align:right;width:90px;font-size:13px;color:#1a1a1a;font-variant-numeric:tabular-nums;">${fmtSGD(ctx.subtotalSGD)}</td></tr>
      <tr><td style="padding:6px 12px;text-align:right;font-size:13px;color:#666;">Delivery</td><td style="padding:6px 12px;text-align:right;width:90px;font-size:13px;color:#1a1a1a;font-variant-numeric:tabular-nums;">${ctx.deliverySGD === 0 ? "Free" : fmtSGD(ctx.deliverySGD)}</td></tr>
      <tr><td style="padding:10px 12px;text-align:right;font-family:'Lora',Georgia,serif;font-size:16px;color:#1a1a1a;border-top:1px solid #eee;font-weight:500;">Total</td><td style="padding:10px 12px;text-align:right;width:90px;font-family:'Lora',Georgia,serif;font-size:16px;color:#1a1a1a;border-top:1px solid #eee;font-weight:500;font-variant-numeric:tabular-nums;">${fmtSGD(ctx.totalSGD)}</td></tr>
    </table>
    <div style="padding:20px 28px 28px;border-top:1px solid #eee;background:#faf7f1;">
      <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">Order reference</p>
      <p style="margin:0 0 14px;font-family:ui-monospace,Menlo,monospace;font-size:14px;color:#1a1a1a;">${escapeHtml(ctx.reference)}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">${ctx.deliveryMethod === "local" ? "Delivery to" : "Collection"}</p>
      <p style="margin:0;font-size:13.5px;color:#1a1a1a;line-height:1.5;">${escapeHtml(addressLine || "Self-collection from our studio")}</p>
    </div>
  </div>
  <p style="margin:20px 8px 0;font-size:12px;color:#888;line-height:1.6;">${footer}</p>
</div>
</body>
</html>`;
}

let resendInstance: Resend | null = null;
function getResend(): Resend | null {
  if (resendInstance) return resendInstance;
  const key = import.meta.env.RESEND_API_KEY;
  if (!key) return null;
  resendInstance = new Resend(key);
  return resendInstance;
}

export async function sendCustomerOrderConfirmation(ctx: OrderEmailContext): Promise<void> {
  if (!ctx.customerEmail) return;
  const resend = getResend();
  const from = import.meta.env.ORDER_FROM_EMAIL || "hello@fineartprinting.com.sg";
  if (!resend) {
    console.warn("[emails] RESEND_API_KEY not set, skipping customer email");
    return;
  }

  const heading = "Order confirmed.";
  const intro = `Thanks${ctx.customerName ? `, ${escapeHtml(ctx.customerName.split(" ")[0] ?? "")}` : ""}. We've received your order and the studio is queueing it up. We'll be in touch with a production ETA within one business day.`;
  // Local delivery is charged as a from-price, so flag that a bigger or more
  // fragile piece may need a top-up we'll agree with the customer first.
  const deliveryNote =
    ctx.deliveryMethod === "local"
      ? "Local delivery starts at S$30. If your piece needs a bigger vehicle or extra handling, we'll contact you to confirm the difference before we deliver. "
      : "";
  const footer =
    deliveryNote +
    `Questions about your order? Reply to this email or message us on WhatsApp at ${business.whatsapp}. ` +
    "Fine Art Printing — Hahnemühle Gold-certified studio in Singapore.";

  try {
    await resend.emails.send({
      from: `Fine Art Printing <${from}>`,
      to: ctx.customerEmail,
      subject: `Order confirmed · ${ctx.reference}`,
      html: shellHtml({ heading, intro, ctx, footer }),
    });
  } catch (e) {
    console.error("[emails] customer confirmation failed:", e);
  }
}

export async function sendStudioOrderNotification(ctx: OrderEmailContext): Promise<void> {
  const resend = getResend();
  const from = import.meta.env.ORDER_FROM_EMAIL || "hello@fineartprinting.com.sg";
  const to = import.meta.env.ORDER_NOTIFICATION_EMAIL || "hello@fineartprinting.com.sg";
  if (!resend) {
    console.warn("[emails] RESEND_API_KEY not set, skipping studio notification");
    return;
  }

  const customerLine = [ctx.customerName, ctx.customerEmail].filter(Boolean).join(" · ");
  const heading = `New order · ${ctx.reference}`;
  const intro = `New order from ${escapeHtml(customerLine || "(unknown customer)")}. Details below.`;
  const footer = "Sent automatically from the Fine Art Printing site.";

  try {
    await resend.emails.send({
      from: `Fine Art Printing orders <${from}>`,
      to,
      subject: `New order · ${ctx.reference} · ${fmtSGD(ctx.totalSGD)}`,
      html: shellHtml({ heading, intro, ctx, footer }),
    });
  } catch (e) {
    console.error("[emails] studio notification failed:", e);
  }
}

// ─── Valuation submission emails ───────────────────────────────────────

export interface ValuationEmailContext {
  reference: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  quantity: number;
  totalSGD: number;
  additionalDetails: string;
  /**
   * Pre-signed download URLs for the customer-uploaded photos. The
   * webhook generates these at email-send time using the service-role
   * client; they expire after 7 days, giving the studio a reasonable
   * window to download.
   */
  signedPhotoUrls: { name: string; url: string }[];
}

export async function sendValuationCustomerConfirmation(
  ctx: ValuationEmailContext,
): Promise<void> {
  if (!ctx.customerEmail) return;
  const resend = getResend();
  const from = import.meta.env.ORDER_FROM_EMAIL || "hello@fineartprinting.com.sg";
  if (!resend) {
    console.warn("[emails] RESEND_API_KEY not set, skipping valuation customer email");
    return;
  }

  const firstName = ctx.customerName?.split(" ")[0] ?? null;
  const subject = `Valuation submission received · ${ctx.reference}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f3ec;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.06);overflow:hidden;">
    <div style="padding:28px;">
      <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">Fine Art Printing</p>
      <h1 style="margin:0 0 12px;font-family:'Lora',Georgia,serif;font-weight:500;font-size:22px;color:#1a1a1a;">Submission received.</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">
        Thanks${firstName ? `, ${escapeHtml(firstName)}` : ""}. We've received your art valuation submission and your payment of <strong>${fmtSGD(ctx.totalSGD)}</strong> for ${ctx.quantity} artwork${ctx.quantity === 1 ? "" : "s"}.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">
        We'll review your submission and respond within <strong>2 to 3 working days</strong>. If we need any further information about the artwork or artist we'll reach out by email.
      </p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:16px 0 8px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666;">Reference</td>
          <td style="padding:6px 0;font-size:13px;color:#1a1a1a;font-family:monospace;text-align:right;">${escapeHtml(ctx.reference)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666;">Artworks submitted</td>
          <td style="padding:6px 0;font-size:13px;color:#1a1a1a;text-align:right;">${ctx.quantity}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666;border-top:1px solid #eee;">Paid</td>
          <td style="padding:6px 0;font-family:'Lora',Georgia,serif;font-size:16px;color:#1a1a1a;text-align:right;border-top:1px solid #eee;">${fmtSGD(ctx.totalSGD)}</td>
        </tr>
      </table>
    </div>
    <div style="padding:16px 28px;background:#FAF7F1;border-top:1px solid rgba(0,0,0,0.06);font-size:12px;color:#666;line-height:1.5;">
      Reply to this email if you need to add any details, or message us on WhatsApp.
      <br>Fine Art Printing — Hahnemühle Gold-certified studio in Singapore.
    </div>
  </div>
</div>
</body></html>`;

  try {
    await resend.emails.send({
      from: `Fine Art Printing <${from}>`,
      to: ctx.customerEmail,
      subject,
      html,
    });
  } catch (e) {
    console.error("[emails] valuation customer confirmation failed:", e);
  }
}

export async function sendValuationStudioNotification(
  ctx: ValuationEmailContext,
): Promise<void> {
  const resend = getResend();
  const from = import.meta.env.ORDER_FROM_EMAIL || "hello@fineartprinting.com.sg";
  const to = import.meta.env.ORDER_NOTIFICATION_EMAIL || "hello@fineartprinting.com.sg";
  if (!resend) {
    console.warn("[emails] RESEND_API_KEY not set, skipping valuation studio email");
    return;
  }

  const customerLine = [ctx.customerName, ctx.customerEmail, ctx.customerPhone]
    .filter(Boolean)
    .join(" · ");
  const subject = `New valuation · ${ctx.reference} · ${ctx.quantity} works · ${fmtSGD(ctx.totalSGD)}`;

  const photosHtml = ctx.signedPhotoUrls.length
    ? `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#1a1a1a;">Photos (links expire in 7 days)</p>
       <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:#1a3550;">
         ${ctx.signedPhotoUrls
           .map(
             (p) =>
               `<li><a href="${escapeHtml(p.url)}" style="color:#1a3550;">${escapeHtml(p.name)}</a></li>`,
           )
           .join("")}
       </ul>`
    : "";

  const detailsHtml = ctx.additionalDetails
    ? `<p style="margin:16px 0 4px;font-size:13px;font-weight:600;color:#1a1a1a;">Additional details from customer</p>
       <p style="margin:0;font-size:13.5px;line-height:1.6;color:#333;white-space:pre-wrap;">${escapeHtml(ctx.additionalDetails)}</p>`
    : "";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f3ec;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.06);overflow:hidden;">
    <div style="padding:24px 28px;">
      <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">New valuation submission</p>
      <h1 style="margin:0 0 8px;font-family:'Lora',Georgia,serif;font-weight:500;font-size:20px;color:#1a1a1a;">${escapeHtml(ctx.reference)}</h1>
      <p style="margin:0 0 12px;font-size:13.5px;color:#444;">
        ${escapeHtml(customerLine || "(unknown customer)")}
      </p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666;">Artworks</td>
          <td style="padding:6px 0;font-size:13px;color:#1a1a1a;text-align:right;">${ctx.quantity}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666;border-top:1px solid #eee;">Total paid</td>
          <td style="padding:6px 0;font-family:'Lora',Georgia,serif;font-size:16px;color:#1a1a1a;text-align:right;border-top:1px solid #eee;">${fmtSGD(ctx.totalSGD)}</td>
        </tr>
      </table>
      ${detailsHtml}
      ${photosHtml}
    </div>
  </div>
</div>
</body></html>`;

  try {
    await resend.emails.send({
      from: `Fine Art Printing <${from}>`,
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error("[emails] valuation studio notification failed:", e);
  }
}
