import type { APIRoute } from "astro";
import { Resend } from "resend";
import { verifyTurnstile } from "../../lib/turnstile";
import { CAREER_ROLE_VALUES } from "../../data/careers";

export const prerender = false;

const MAX_FILES = 3;
// Per-file cap: 3 MB. Total request body must stay under Vercel's serverless
// body limit (~4.5 MB), so we keep the whole envelope under 4 MB. A CV and a
// couple of work samples fit comfortably; anything larger should be shared via
// a link in the covering note.
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/heic",
]);
const ALLOWED_EXT = /\.(pdf|docx?|jpe?g|png|heic)$/i;

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

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const resendKey = import.meta.env.RESEND_API_KEY;
  const fromEmail =
    import.meta.env.ORDER_FROM_EMAIL || "hello@fineartprinting.com.sg";
  // Applications go to Ben directly. Overridable via env if that changes.
  const toEmail =
    import.meta.env.CAREERS_NOTIFICATION_EMAIL || "ben@fineartprinting.com.sg";
  if (!resendKey) {
    return bad(
      "Applications aren't configured on this environment. Please email ben@fineartprinting.com.sg instead.",
      503,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Could not parse your application.");
  }

  // Honeypot: hidden "website" field. Any value at all = bot.
  const honey = String(form.get("website") ?? "").trim();
  if (honey) {
    // Pretend success so the bot moves on; don't waste an email send.
    return new Response(JSON.stringify({ ok: true, attachmentCount: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const role = String(form.get("role") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const turnstileToken = String(form.get("cf-turnstile-response") ?? "");

  if (!name) return bad("Please provide your name.");
  if (!email || !/.+@.+\..+/.test(email)) {
    return bad("Please provide a valid email so we can reply.");
  }
  if (!phone || phone.replace(/\D/g, "").length < 6) {
    return bad("Please provide a phone number we can reach you on.");
  }
  if (!CAREER_ROLE_VALUES.has(role)) {
    return bad("Please pick the role you're applying for.");
  }
  if (
    name.length > 200 ||
    email.length > 254 ||
    phone.length > 40 ||
    message.length > 5000
  ) {
    return bad("That application is too long.");
  }

  const captchaOk = await verifyTurnstile(
    turnstileToken,
    clientAddress ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null,
    "careers",
  );
  if (!captchaOk) {
    return bad("Captcha check failed. Please refresh the page and try again.");
  }

  // Validate + collect files (CV, optional work samples).
  const fileEntries = form
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (fileEntries.length > MAX_FILES) {
    return bad(`Maximum ${MAX_FILES} files.`);
  }
  let totalBytes = 0;
  const attachments: { filename: string; content: Buffer }[] = [];
  for (const f of fileEntries) {
    if (f.size > MAX_BYTES) {
      return bad(
        `"${f.name}" is over 3 MB. Please attach a smaller file, or share a link in your note.`,
      );
    }
    if (!ALLOWED_MIME.has(f.type) && !ALLOWED_EXT.test(f.name)) {
      return bad(`"${f.name}" is not a supported file type (PDF, DOC, or image).`);
    }
    totalBytes += f.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return bad(
        "Combined attachment size is too large. Please attach fewer or smaller files.",
      );
    }
    attachments.push({
      filename: f.name,
      content: Buffer.from(await f.arrayBuffer()),
    });
  }

  const resend = new Resend(resendKey);
  const subject = `Careers application: ${name} · ${role}`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f3ec;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.06);padding:28px;">
    <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">Fine Art Printing · Careers</p>
    <h1 style="margin:0 0 16px;font-family:'Lora',Georgia,serif;font-weight:500;font-size:22px;color:#1a1a1a;">${escapeHtml(name)} — ${escapeHtml(role)}</h1>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;color:#1a1a1a;margin:0 0 20px;">
      <tr><td style="padding:6px 0;color:#666;width:120px;">Name</td><td style="padding:6px 0;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Applying for</td><td style="padding:6px 0;"><strong style="color:#1a3550;">${escapeHtml(role)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#1a3550;">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#666;">Phone</td><td style="padding:6px 0;"><a href="tel:${escapeHtml(phone.replace(/\s/g, ""))}" style="color:#1a3550;">${escapeHtml(phone)}</a> <a href="https://wa.me/${escapeHtml(phone.replace(/\D/g, ""))}" style="margin-left:8px;color:#1ebe5b;">WhatsApp →</a></td></tr>
      ${attachments.length > 0 ? `<tr><td style="padding:6px 0;color:#666;">Attachments</td><td style="padding:6px 0;">${attachments.length} file${attachments.length === 1 ? "" : "s"}</td></tr>` : `<tr><td style="padding:6px 0;color:#666;">Attachments</td><td style="padding:6px 0;color:#888;">None attached</td></tr>`}
    </table>
    <div style="border-top:1px solid #eee;padding-top:18px;">
      <p style="margin:0 0 8px;font-size:12px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">Covering note</p>
      <div style="font-size:14.5px;line-height:1.6;color:#1a1a1a;white-space:pre-wrap;">${message ? escapeHtml(message) : '<span style="color:#888;">(none provided)</span>'}</div>
    </div>
  </div>
  <p style="margin:18px 8px 0;font-size:12px;color:#888;line-height:1.6;">Reply directly to this email to respond — the applicant's email is set as the Reply-To.</p>
</div>
</body></html>`;

  try {
    await resend.emails.send({
      from: `Fine Art Printing careers <${fromEmail}>`,
      to: toEmail,
      replyTo: email,
      subject,
      html,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
  } catch (e: any) {
    console.error("[careers] resend send failed:", e);
    return bad(
      "We couldn't send your application right now. Please email ben@fineartprinting.com.sg or try again in a few minutes.",
      502,
    );
  }

  return new Response(
    JSON.stringify({ ok: true, attachmentCount: attachments.length }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
