import type { APIRoute } from "astro";
import { Resend } from "resend";

export const prerender = false;

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/pdf",
]);
const ALLOWED_EXT = /\.(jpe?g|png|heic|pdf)$/i;
const MAX_TOTAL_ATTACHMENT_BYTES = 35 * 1024 * 1024; // Resend's per-email cap

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // No secret configured — skip the check, rely on honeypot only.
    console.warn("[contact] TURNSTILE_SECRET_KEY not set, skipping captcha check");
    return true;
  }
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      },
    );
    const data = (await res.json()) as { success: boolean };
    return !!data.success;
  } catch (e) {
    console.error("[contact] turnstile verify failed:", e);
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const resendKey = import.meta.env.RESEND_API_KEY;
  const fromEmail = import.meta.env.ORDER_FROM_EMAIL || "hello@fineartprinting.com.sg";
  const toEmail = import.meta.env.ORDER_NOTIFICATION_EMAIL || "hello@fineartprinting.com.sg";
  if (!resendKey) {
    return bad(
      "Email isn't configured on this environment. Please WhatsApp us instead.",
      503,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Could not parse form submission.");
  }

  // Honeypot: hidden "website" field. Any value at all = bot.
  const honey = String(form.get("website") ?? "").trim();
  if (honey) {
    // Pretend success so the bot moves on. Don't waste an email send.
    return new Response(JSON.stringify({ ok: true, attachmentCount: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const name = String(form.get("name") ?? "").trim();
  const preferred = String(form.get("preferred_contact") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const turnstileToken = String(form.get("cf-turnstile-response") ?? "");

  const ALLOWED_PREF = new Set(["whatsapp", "phone", "email"]);
  if (!name) return bad("Please provide your name.");
  if (!ALLOWED_PREF.has(preferred)) {
    return bad("Please pick a contact preference.");
  }
  if (preferred === "email") {
    if (!email || !/.+@.+\..+/.test(email)) return bad("Please provide a valid email.");
  } else {
    if (!phone || phone.replace(/\D/g, "").length < 6) {
      return bad("Please provide a phone number we can reach you on.");
    }
  }
  if (!message) return bad("Please add a message.");
  if (
    name.length > 200 ||
    email.length > 254 ||
    phone.length > 40 ||
    message.length > 5000
  ) {
    return bad("That submission is too long.");
  }

  const captchaOk = await verifyTurnstile(
    turnstileToken,
    clientAddress ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!captchaOk) {
    return bad("Captcha check failed. Please refresh the page and try again.");
  }

  // Validate + collect files.
  const fileEntries = form.getAll("files").filter(
    (f): f is File => f instanceof File && f.size > 0,
  );
  if (fileEntries.length > MAX_FILES) {
    return bad(`Maximum ${MAX_FILES} files.`);
  }
  let totalBytes = 0;
  const attachments: { filename: string; content: Buffer }[] = [];
  for (const f of fileEntries) {
    if (f.size > MAX_BYTES) return bad(`"${f.name}" is over 10 MB.`);
    if (!ALLOWED_MIME.has(f.type) && !ALLOWED_EXT.test(f.name)) {
      return bad(`"${f.name}" is not a supported file type.`);
    }
    totalBytes += f.size;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return bad("Combined attachment size is too large to email. Please reduce file sizes.");
    }
    attachments.push({
      filename: f.name,
      content: Buffer.from(await f.arrayBuffer()),
    });
  }

  const prefLabel =
    preferred === "whatsapp" ? "WhatsApp"
    : preferred === "phone" ? "Phone call"
    : "Email";
  const prefLabelHtml = `<strong style="color:#1a3550;">${escapeHtml(prefLabel)}</strong>`;

  const resend = new Resend(resendKey);
  const subject = `Contact form: ${name} · prefers ${prefLabel}`;

  const phoneRow = phone
    ? `<tr><td style="padding:6px 0;color:#666;">Phone</td><td style="padding:6px 0;"><a href="tel:${escapeHtml(phone.replace(/\s/g, ""))}" style="color:#1a3550;">${escapeHtml(phone)}</a>${preferred === "whatsapp" ? ` <a href="https://wa.me/${escapeHtml(phone.replace(/\D/g, ""))}" style="margin-left:8px;color:#1ebe5b;">Open WhatsApp →</a>` : ""}</td></tr>`
    : "";
  const emailRow = email
    ? `<tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#1a3550;">${escapeHtml(email)}</a></td></tr>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f3ec;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.06);padding:28px;">
    <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">Fine Art Printing</p>
    <h1 style="margin:0 0 16px;font-family:'Lora',Georgia,serif;font-weight:500;font-size:22px;color:#1a1a1a;">Contact form: ${escapeHtml(name)}</h1>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;color:#1a1a1a;margin:0 0 20px;">
      <tr><td style="padding:6px 0;color:#666;width:120px;">Name</td><td style="padding:6px 0;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Prefers contact via</td><td style="padding:6px 0;">${prefLabelHtml}</td></tr>
      ${phoneRow}
      ${emailRow}
      ${attachments.length > 0 ? `<tr><td style="padding:6px 0;color:#666;">Attachments</td><td style="padding:6px 0;">${attachments.length} file${attachments.length === 1 ? "" : "s"}</td></tr>` : ""}
    </table>
    <div style="border-top:1px solid #eee;padding-top:18px;">
      <p style="margin:0 0 8px;font-size:12px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">Message</p>
      <div style="font-size:14.5px;line-height:1.6;color:#1a1a1a;white-space:pre-wrap;">${escapeHtml(message)}</div>
    </div>
  </div>
  <p style="margin:18px 8px 0;font-size:12px;color:#888;line-height:1.6;">${preferred === "email" ? "Reply directly to this email to respond — the customer's email is set as the Reply-To." : `Customer prefers ${prefLabel.toLowerCase()}. Reach them on the number above.`}</p>
</div>
</body></html>`;

  try {
    await resend.emails.send({
      from: `Fine Art Printing site <${fromEmail}>`,
      to: toEmail,
      // Only set replyTo if the customer gave an email — otherwise leave it
      // off so replies go to the studio's own inbox by default.
      ...(email ? { replyTo: email } : {}),
      subject,
      html,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
  } catch (e: any) {
    console.error("[contact] resend send failed:", e);
    return bad(
      "We couldn't send your message right now. Please WhatsApp us or try again in a few minutes.",
      502,
    );
  }

  return new Response(
    JSON.stringify({ ok: true, attachmentCount: attachments.length }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
