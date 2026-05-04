/**
 * One-time seed: copy the existing float-frame swatch photos into the
 * Supabase `float-frames` bucket and insert the 8 starter rows into
 * the `float_frames` table.
 *
 * Run after applying supabase/float-frames.sql:
 *   node scripts/seed-float-frames.mjs
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY + PUBLIC_SUPABASE_URL from .env.local.
 * Idempotent on the table side (skips rows whose slug already exists);
 * uploads use upsert=true so re-running won't duplicate storage objects.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
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

const SEED = [
  { slug: "smooth-white", label: "Smooth White", costPerFoot: 0.77, image: "3740-W-Smooth-White.jpg" },
  { slug: "smooth-black", label: "Smooth Black", costPerFoot: 0.77, image: "3740-B-Smooth-Black.jpg" },
  { slug: "champagne", label: "Champagne", costPerFoot: 0.77, image: "3740-S-Champagne.jpg" },
  { slug: "glossy-light-brown-pine", label: "Glossy Light Brown Pine", costPerFoot: 0.77, image: "S3536-Glossy-Light-Brown-Pine.jpg" },
  { slug: "natural-brown-oak", label: "Natural Brown Oak", costPerFoot: 0.77, image: "3535-19-Natural-Brown-Oak.jpg" },
  { slug: "natural-dark-brown-oak", label: "Natural Dark Brown Oak", costPerFoot: 0.77, image: "3535-15-Natural-Dark-Brown-Oak.jpg" },
  { slug: "natural-black-oak", label: "Natural Black Oak", costPerFoot: 0.77, image: "3535-11-Natural-Black-Oak.jpg" },
  { slug: "gold", label: "Gold", costPerFoot: 0.945 },
];

const PUBLIC_DIR = resolve(__dirname, "..", "public", "photos", "float-frames");
const BUCKET = "float-frames";

let order = 1;
for (const row of SEED) {
  let imagePath = null;

  if (row.image) {
    const filePath = resolve(PUBLIC_DIR, row.image);
    try {
      const buf = await readFile(filePath);
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(row.image, buf, { contentType: "image/jpeg", upsert: true });
      if (upErr) {
        console.error(`✗ Upload ${row.image}: ${upErr.message}`);
        continue;
      }
      imagePath = row.image;
      console.log(`✓ Uploaded ${row.image}`);
    } catch (e) {
      console.error(`✗ Read ${row.image}: ${e.message}`);
    }
  }

  const { data: existing } = await sb
    .from("float_frames")
    .select("id")
    .eq("slug", row.slug)
    .maybeSingle();

  if (existing) {
    console.log(`= Row "${row.slug}" already exists, skipping insert.`);
    order++;
    continue;
  }

  const { error: insErr } = await sb.from("float_frames").insert({
    slug: row.slug,
    label: row.label,
    cost_per_foot: row.costPerFoot,
    image_path: imagePath,
    published: true,
    display_order: order,
  });
  if (insErr) {
    console.error(`✗ Insert ${row.slug}: ${insErr.message}`);
  } else {
    console.log(`+ Inserted ${row.slug}`);
  }
  order++;
}

console.log("\nDone.");
