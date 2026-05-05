/**
 * Validate the `?next=` param on /admin/login and /admin/auth/callback
 * before redirecting. Without this, an attacker can craft
 * /admin/login?next=https://evil.com — Astro.redirect will happily send
 * the user there after a successful sign-in.
 *
 * Rules:
 *  - Must start with "/admin" (any deeper path is OK).
 *  - Must NOT start with "//" or "/\" — those are protocol-relative or
 *    Windows-y URLs that some browsers normalise to off-site.
 *  - Defaults to "/admin" if any rule fails.
 */
export function safeAdminNext(next: string | null | undefined): string {
  if (!next) return "/admin";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/admin";
  if (!/^\/admin(\/|$|\?)/.test(next)) return "/admin";
  return next;
}
