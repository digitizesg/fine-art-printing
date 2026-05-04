/**
 * One-shot import: pull "Art Reproductions" (WP user id 1) artworks
 * from fineartprinting.com.sg into our Supabase artworks table.
 *
 *   node scripts/import-wp-artworks.mjs
 *
 * What it does per artwork:
 *   1. Fetches title, slug, description, featured image URL from WP REST.
 *   2. Skips if a row with the same slug already exists.
 *   3. Downloads the featured image, uploads it to the 'artworks' bucket.
 *   4. Inserts a row with sensible defaults:
 *      - published = false (so they land as drafts; review before publishing)
 *      - allow_paper = true, allow_canvas = false
 *      - available_sizes derived from image aspect ratio (landscape /
 *        portrait / square variants of 30/40/50/70 cm long side)
 *      - artist_name = null (Ben edits per-artwork in admin)
 *
 * Idempotent: re-running skips rows that already exist by slug.
 */
import { createClient } from "@supabase/supabase-js";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const WP_BASE = "https://fineartprinting.com.sg/wp-json/wp/v2";
const ART_REPRODUCTIONS_USER_ID = 1;

function htmlToText(html) {
  if (!html) return null;
  // Strip tags. Decode the few entities WP commonly emits.
  return html
    .replace(/<\/?[a-z][\s\S]*?>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#038;/g, "&")
    .replace(/\s+/g, " ")
    .trim() || null;
}

function pickSizes(width, height) {
  // 4 standard size points along the long edge.
  const longs = [30, 40, 50, 70];
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return longs.map((l) => ({ width_cm: l, height_cm: Math.round(l * 0.7) }));
  }
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.05) {
    // Square-ish.
    return longs.map((l) => ({ width_cm: l, height_cm: l }));
  }
  if (ratio > 1) {
    // Landscape: long edge is width.
    return longs.map((l) => ({
      width_cm: l,
      height_cm: Math.round(l / ratio),
    }));
  }
  // Portrait: long edge is height.
  return longs.map((l) => ({
    width_cm: Math.round(l * ratio),
    height_cm: l,
  }));
}

function inferArtist(title, description) {
  // Many of the Art Reproductions titles include " by <artist>".
  // Extract that if present; otherwise leave null for Ben to edit.
  const m = (title ?? "").match(/\bby\s+(.+)$/i);
  if (m) return m[1].trim();
  return null;
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch ${url} returned ${res.status}`);
  const ab = await res.arrayBuffer();
  const buffer = Buffer.from(ab);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return { buffer, contentType };
}

async function importOne(item) {
  const slug = item.slug;
  const titleHtml = item.title?.rendered ?? "";
  const title = htmlToText(titleHtml) ?? slug;
  const description = htmlToText(item.content?.rendered);

  // Skip if already imported.
  const { data: existing } = await sb
    .from("artworks")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return { slug, status: "skipped" };
  }

  const featured = item._embedded?.["wp:featuredmedia"]?.[0];
  if (!featured?.source_url) {
    return { slug, status: "no-image" };
  }
  // WP sometimes returns relative paths like "/wp-content/uploads/...". Make absolute.
  const sourceUrl = featured.source_url.startsWith("http")
    ? featured.source_url
    : `https://fineartprinting.com.sg${featured.source_url}`;
  const width = featured.media_details?.width;
  const height = featured.media_details?.height;
  // Get extension from the path part of the URL, ignoring querystrings.
  const pathOnly = sourceUrl.split("?")[0];
  const ext = extname(pathOnly).toLowerCase() || ".jpg";

  // Download + upload.
  const { buffer, contentType } = await downloadImage(sourceUrl);
  const heroPath = `${crypto.randomUUID()}${ext}`;
  const { error: upErr } = await sb.storage
    .from("artworks")
    .upload(heroPath, buffer, { contentType, upsert: false });
  if (upErr) {
    return { slug, status: "upload-failed", error: upErr.message };
  }

  // Insert row.
  const row = {
    slug,
    title,
    artist_name: inferArtist(title, description),
    description,
    hero_image_path: heroPath,
    gallery_images: [],
    available_sizes: pickSizes(width, height),
    allow_paper: true,
    allow_canvas: false,
    published: false,
    featured: false,
  };
  const { error: insErr } = await sb.from("artworks").insert(row);
  if (insErr) {
    // Roll back the storage upload so re-running is clean.
    await sb.storage.from("artworks").remove([heroPath]);
    return { slug, status: "insert-failed", error: insErr.message };
  }
  return { slug, status: "imported" };
}

async function fetchAllArtworks() {
  const all = [];
  let page = 1;
  for (;;) {
    const url = `${WP_BASE}/art_works?author=${ART_REPRODUCTIONS_USER_ID}&per_page=100&_embed=1&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`WP API ${url} returned ${res.status}`);
    }
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    all.push(...items);
    if (items.length < 100) break;
    page++;
  }
  return all;
}

async function main() {
  console.log("Fetching artworks from WP…");
  const items = await fetchAllArtworks();
  console.log(`Found ${items.length} artworks for "Art Reproductions".\n`);

  const results = [];
  for (const item of items) {
    process.stdout.write(`• ${item.slug} … `);
    try {
      const r = await importOne(item);
      results.push(r);
      console.log(r.status + (r.error ? ` (${r.error})` : ""));
    } catch (e) {
      results.push({ slug: item.slug, status: "error", error: e.message });
      console.log("error: " + e.message);
    }
  }

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n--- Summary ---");
  for (const [status, n] of Object.entries(counts)) {
    console.log(`${status}: ${n}`);
  }
  console.log(
    "\nAll imported artworks are status=draft (published=false). Review at /admin/artworks, edit titles/sizes/artist as needed, then flip published on.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
