/**
 * POST /admin/publish
 *
 * Fires the Vercel deploy hook to rebuild the marketing site, then bumps
 * publish_state.last_published_at so the admin pending-changes counter resets.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase-server";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const hookUrl = import.meta.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return ctx.redirect("/admin?publish=error&reason=no_hook");
  }

  const supabase = createSupabaseServerClient(ctx);

  // Fire the deploy hook.
  let hookOk = false;
  try {
    const res = await fetch(hookUrl, { method: "POST" });
    hookOk = res.ok;
  } catch {
    hookOk = false;
  }

  if (!hookOk) {
    return ctx.redirect("/admin?publish=error&reason=hook_failed");
  }

  // Reset pending counter and bump last_published_at.
  const { error } = await supabase
    .from("publish_state")
    .update({
      last_published_at: new Date().toISOString(),
      pending_count: 0,
    })
    .eq("id", 1);

  if (error) {
    return ctx.redirect(
      `/admin?publish=error&reason=${encodeURIComponent(error.message)}`,
    );
  }

  return ctx.redirect("/admin?publish=ok");
};
