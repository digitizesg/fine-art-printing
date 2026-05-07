/**
 * Verify a Cloudflare Turnstile token server-side. Shared between the
 * contact form and any other endpoint that wants bot protection.
 *
 * Returns true if the token is valid (or if Turnstile isn't configured
 * — soft-fail-open is the right default for endpoints that have other
 * defences like honeypots, rate limits, or signed URLs).
 */
export async function verifyTurnstile(
  token: string,
  ip: string | null,
  source = "endpoint",
): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn(`[${source}] TURNSTILE_SECRET_KEY not set, skipping captcha check`);
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
    console.error(`[${source}] turnstile verify failed:`, e);
    return false;
  }
}
