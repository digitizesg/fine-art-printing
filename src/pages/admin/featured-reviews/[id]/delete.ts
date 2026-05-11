import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return ctx.redirect("/admin/featured-reviews?error=missing_id");

  const supabase = createSupabaseServerClient(ctx);

  const { error: delErr } = await supabase
    .from("featured_reviews")
    .delete()
    .eq("id", id);
  if (delErr) {
    return ctx.redirect(
      `/admin/featured-reviews/${id}?error=${encodeURIComponent(delErr.message)}`,
    );
  }

  return ctx.redirect("/admin/featured-reviews?deleted=1");
};
