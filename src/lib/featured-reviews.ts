/**
 * Featured Google reviews shown in the testimonial wall.
 *
 * Curated in /admin/featured-reviews because Google's Places API returns
 * reviews ranked by relevance (with no date-sort parameter), so we can't
 * reliably surface the newest five via the API. The aggregate rating and
 * total review count are still pulled live from Google on every deploy via
 * scripts/refresh-reviews.mjs.
 *
 * If the featured_reviews table is empty (fresh environment, nothing
 * curated yet) or unreachable, the lib falls back to whatever the latest
 * Google API call returned (reviews.json, refreshed every deploy) so the
 * wall is never blank.
 */
import { supabasePublic } from "./supabase";
import { buildMemo } from "./build-cache";
import googleApiReviews from "../data/reviews.json";

export interface FeaturedReview {
  id: string;
  authorName: string;
  authorUrl: string;
  profilePhotoUrl: string | null;
  rating: number;
  body: string;
  reviewDate: string;
  displayOrder: number;
  published: boolean;
}

interface DbRow {
  id: string;
  author_name: string;
  author_url: string;
  profile_photo_url: string | null;
  rating: number;
  body: string;
  review_date: string;
  display_order: number;
  published: boolean;
}

function rowToFeaturedReview(row: DbRow): FeaturedReview {
  return {
    id: row.id,
    authorName: row.author_name,
    authorUrl: row.author_url,
    profilePhotoUrl: row.profile_photo_url,
    rating: row.rating,
    body: row.body,
    reviewDate: row.review_date,
    displayOrder: row.display_order,
    published: row.published,
  };
}

function fallbackFromGoogleApi(): FeaturedReview[] {
  return (googleApiReviews.reviews ?? [])
    .filter((r) => r.rating === 5)
    .map((r, i) => ({
      id: `google-${i}`,
      authorName: r.author_name,
      authorUrl: r.author_url,
      profilePhotoUrl: r.profile_photo_url,
      rating: r.rating,
      body: r.text,
      reviewDate: r.time
        ? new Date(r.time * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      displayOrder: 100,
      published: true,
    }));
}

export async function listFeaturedReviews(
  opts: { onlyPublished?: boolean } = {},
): Promise<FeaturedReview[]> {
  const onlyPublished = opts.onlyPublished !== false;
  return buildMemo(
    `featured-reviews:onlyPublished=${onlyPublished}`,
    async () => {
      let query = supabasePublic
        .from("featured_reviews")
        .select("*")
        .order("display_order", { ascending: true })
        .order("review_date", { ascending: false });
      if (onlyPublished) {
        query = query.eq("published", true);
      }
      const { data, error } = await query;
      if (error) {
        console.warn(
          "Failed to load featured_reviews, falling back to Google API:",
          error.message,
        );
        return fallbackFromGoogleApi();
      }
      const rows = (data as DbRow[]).map(rowToFeaturedReview);
      // Empty table (nothing curated yet) falls back to the latest Google
      // API call so the wall is never blank.
      return rows.length > 0 ? rows : fallbackFromGoogleApi();
    },
  );
}

export async function getFeaturedReviewById(
  id: string,
): Promise<FeaturedReview | null> {
  const { data, error } = await supabasePublic
    .from("featured_reviews")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToFeaturedReview(data as DbRow);
}
