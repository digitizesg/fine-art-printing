/**
 * One-shot: read each artwork's hero image from Supabase, measure its
 * pixel dimensions with sharp, and write them to image_width /
 * image_height columns. Lets the shop product page skip <Image
 * inferSize> at build time, halving Vercel deploy duration.
 *
 *   node scripts/backfill-artwork-dimensions.mjs
 *
 * Idempotent: skips rows that already have dimensions set.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const { data: rows, error } = await sb
    .from("artworks")
    .select("id, slug, hero_image_path, image_width, image_height");
  if (error) throw error;

  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    if (row.image_width && row.image_height) {
      skipped += 1;
      continue;
    }
    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/${row.hero_image_path}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  [skip ${res.status}] ${row.slug}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buffer).metadata();
      if (!meta.width || !meta.height) {
        console.warn(`  [no-dimensions] ${row.slug}`);
        continue;
      }
      const { error: upErr } = await sb
        .from("artworks")
        .update({ image_width: meta.width, image_height: meta.height })
        .eq("id", row.id);
      if (upErr) {
        console.warn(`  [update-failed] ${row.slug}: ${upErr.message}`);
        continue;
      }
      console.log(`  ${row.slug.padEnd(40)} ${meta.width} × ${meta.height}`);
      updated += 1;
    } catch (e) {
      console.warn(`  [error] ${row.slug}: ${e?.message ?? e}`);
    }
  }
  console.log(`\n✓ Done. ${updated} updated, ${skipped} already had dimensions.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
