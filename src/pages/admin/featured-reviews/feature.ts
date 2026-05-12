import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

export const prerender = false;

// POST /admin/featured-reviews/feature
// Body: author_name, author_url, rating, body, review_time (Unix seconds)
// Creates a featured_reviews row from a Google API review with one click.
export const POST: APIRoute = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);
  const form = await ctx.request.formData();

  const authorName = String(form.get("author_name") ?? "").trim();
  const authorUrl = String(form.get("author_url") ?? "").trim();
  const rating = parseInt(String(form.get("rating") ?? "5"), 10);
  const body = String(form.get("body") ?? "").trim();
  const reviewTime = parseInt(String(form.get("review_time") ?? "0"), 10);

  if (!authorName || !body) {
    return ctx.redirect("/admin/featured-reviews?error=missing_fields");
  }

  const reviewDate = reviewTime
    ? new Date(reviewTime * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const { error: insErr } = await supabase
    .from("featured_reviews")
    .insert({
      author_name: authorName,
      author_url: authorUrl,
      profile_photo_url: null,
      rating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : 5,
      body,
      review_date: reviewDate,
      display_order: 100,
      published: true,
    });

  if (insErr) {
    return ctx.redirect(
      `/admin/featured-reviews?error=${encodeURIComponent(insErr.message)}`,
    );
  }

  return ctx.redirect("/admin/featured-reviews?featured=1");
};
