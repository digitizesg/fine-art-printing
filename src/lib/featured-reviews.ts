/**
 * Featured Google reviews shown in the testimonial wall.
 *
 * Curated in /admin/featured-reviews because Google's Places API returns
 * reviews ranked by relevance (with no date-sort parameter), so we can't
 * reliably surface the newest five via the API. The aggregate rating and
 * total review count are still pulled live from Google on every deploy via
 * scripts/refresh-reviews.mjs.
 *
 * If the Supabase table doesn't exist yet (e.g. before the migration has
 * been run on a given environment), the lib falls back to the seed JSON in
 * src/data/featured-reviews.json so the site still renders cards.
 */
import { supabasePublic } from "./supabase";
import { buildMemo } from "./build-cache";
import seedData from "../data/featured-reviews.json";

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

function fallbackFromJson(): FeaturedReview[] {
  return (seedData.reviews ?? []).map((r, i) => ({
    id: `seed-${i}`,
    authorName: r.author_name,
    authorUrl: r.author_url,
    profilePhotoUrl: r.profile_photo_url,
    rating: r.rating,
    body: r.text,
    reviewDate: r.date,
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
          "Failed to load featured_reviews, falling back to JSON seed:",
          error.message,
        );
        return fallbackFromJson();
      }
      const rows = (data as DbRow[]).map(rowToFeaturedReview);
      // If the table exists but has no rows yet (fresh environment, seed
      // hasn't been inserted), still render the JSON seed so the wall
      // isn't empty.
      return rows.length > 0 ? rows : fallbackFromJson();
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
