/**
 * Magic-link callback. Supabase sends the user here with `?code=...` after
 * they click the email link; we exchange the code for a session and drop a
 * cookie, then redirect to wherever they were headed.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { safeAdminNext } from "../../../lib/admin-redirect";

export const GET: APIRoute = async (ctx) => {
  const code = ctx.url.searchParams.get("code");
  const next = safeAdminNext(ctx.url.searchParams.get("next"));

  if (!code) {
    return ctx.redirect("/admin/login?error=missing_code");
  }

  const supabase = createSupabaseServerClient(ctx);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return ctx.redirect(
      `/admin/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return ctx.redirect(next);
};
