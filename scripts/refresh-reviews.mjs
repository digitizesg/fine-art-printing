// Fetch reviews from Google Places API (v2) and write the result to
// src/data/reviews.json so Astro can statically import it at build time.
//
// Runs as a `prebuild` step. If GOOGLE_PLACES_API_KEY is missing or the
// API call fails for any reason, we leave the existing reviews.json
// in place rather than failing the build — that way an outage in
// Google's API or a missing env var on a preview deploy doesn't break
// production.
//
// Required env vars:
//   GOOGLE_PLACES_API_KEY  — server-only key with Places API enabled
//   GOOGLE_PLACE_ID        — optional override; default below is FAP's
//                            current Google Business Profile.

import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "src", "data", "reviews.json");

const PLACE_ID =
  process.env.GOOGLE_PLACE_ID ?? "ChIJke7_b1gZ2jERBZIUs8hiUJE";
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

function bail(reason) {
  console.warn(`[refresh-reviews] skipping: ${reason}`);
  console.warn("[refresh-reviews] keeping existing reviews.json");
  process.exit(0);
}

async function main() {
  if (!API_KEY) bail("GOOGLE_PLACES_API_KEY not set");

  const endpoint = `https://places.googleapis.com/v1/places/${PLACE_ID}`;
  let res;
  try {
    res = await fetch(endpoint, {
      headers: {
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
    });
  } catch (err) {
    bail(`network error · ${err?.message ?? err}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    bail(`API returned ${res.status} · ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // Map v2 shape onto the shape the existing components consume so we
  // don't have to touch every consumer.
  const out = {
    rating: typeof data.rating === "number" ? data.rating : 0,
    userRatingsTotal:
      typeof data.userRatingCount === "number" ? data.userRatingCount : 0,
    fetchedAt: new Date().toISOString(),
    source: "google",
    placeId: PLACE_ID,
    reviews: (data.reviews ?? []).map((r) => ({
      author_name: r.authorAttribution?.displayName ?? "",
      author_url: r.authorAttribution?.uri ?? null,
      profile_photo_url: r.authorAttribution?.photoUri ?? null,
      rating: typeof r.rating === "number" ? r.rating : 0,
      relative_time_description: r.relativePublishTimeDescription ?? "",
      text: r.text?.text ?? r.originalText?.text ?? "",
      time: r.publishTime
        ? Math.floor(new Date(r.publishTime).getTime() / 1000)
        : 0,
    })),
  };

  // Sanity check — if Google returns a 200 with empty data (e.g.
  // wrong place id), don't blow away the existing JSON.
  if (out.userRatingsTotal === 0 && out.reviews.length === 0) {
    bail("API returned empty rating + reviews — likely wrong place id");
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `[refresh-reviews] wrote ${out.reviews.length} reviews · ${out.rating}/5 · ${out.userRatingsTotal} total`,
  );
}

main().catch((err) => {
  console.error("[refresh-reviews] unexpected error:", err);
  // Don't fail the build.
  process.exit(0);
});
