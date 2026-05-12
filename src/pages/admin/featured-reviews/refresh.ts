import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { fetchAllBusinessProfileReviews } from "../../../lib/google-business";

export const prerender = false;

// POST /admin/featured-reviews/refresh
// Pulls every review from the Business Profile API and upserts them into
// the google_business_reviews cache table. Triggered by the "Refresh from
// Google" button in /admin/featured-reviews.
export const POST: APIRoute = async (ctx) => {
  const result = await fetchAllBusinessProfileReviews();
  if (!result.ok) {
    return ctx.redirect(
      `/admin/featured-reviews?refresh_error=${encodeURIComponent(result.error ?? "Unknown error")}`,
    );
  }

  if (result.reviews.length === 0) {
    return ctx.redirect("/admin/featured-reviews?refresh_empty=1");
  }

  const supabase = createSupabaseServerClient(ctx);
  const rows = result.reviews.map((r) => ({
    review_id: r.reviewId,
    author_name: r.authorName,
    profile_photo_url: r.profilePhotoUrl,
    rating: r.rating,
    body: r.body,
    create_time: r.createTime,
    fetched_at: new Date().toISOString(),
  }));

  // Upsert by review_id so existing rows get refreshed body/rating in case
  // someone edited their Google review.
  const { error: upErr } = await supabase
    .from("google_business_reviews")
    .upsert(rows, { onConflict: "review_id" });

  if (upErr) {
    return ctx.redirect(
      `/admin/featured-reviews?refresh_error=${encodeURIComponent(upErr.message)}`,
    );
  }

  return ctx.redirect(
    `/admin/featured-reviews?refreshed=${result.reviews.length}`,
  );
};
