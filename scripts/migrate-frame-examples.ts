/**
 * One-shot migration: lifts the file-based frame-examples catalogue into
 * Supabase Storage + the `frame_examples` table.
 *
 *   npx tsx scripts/migrate-frame-examples.ts
 *
 * Reads .env.local for credentials. Idempotent on the storage side (skips
 * uploads when the object already exists) and on the table side (clears
 * existing rows first so re-running gives the same result).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { FRAME_EXAMPLES } from "../src/data/frame-examples";

loadEnv({ path: ".env.local" });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "frame-examples";
const PHOTOS_DIR = resolve(process.cwd(), "public/photos/frame-examples");

function camelToSnake(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    out[snake] = v;
  }
  return out;
}

async function uploadIfMissing(filename: string): Promise<void> {
  // Cheap existence check via list; uploadIfMissing is what we want.
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list("", { search: filename });
  if (existing?.some((f) => f.name === filename)) {
    return;
  }
  const path = resolve(PHOTOS_DIR, filename);
  const bytes = readFileSync(path);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Upload failed for ${filename}: ${error.message}`);
  }
}

async function main() {
  console.log(`Migrating ${FRAME_EXAMPLES.length} frame examples →`, SUPABASE_URL);

  // 1. Upload images.
  console.log("\nUploading images …");
  let uploaded = 0;
  for (const ex of FRAME_EXAMPLES) {
    process.stdout.write(`  ${ex.image} … `);
    try {
      await uploadIfMissing(ex.image);
      uploaded++;
      console.log("ok");
    } catch (err) {
      console.log("FAIL");
      throw err;
    }
  }
  console.log(`✓ ${uploaded}/${FRAME_EXAMPLES.length} images in storage`);

  // 2. Wipe + repopulate the table.
  console.log("\nClearing existing rows …");
  const { error: delErr } = await supabase
    .from("frame_examples")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw delErr;

  console.log("Inserting rows …");
  const rows = FRAME_EXAMPLES.map((ex, i) => {
    const row: Record<string, unknown> = {
      service: ex.service,
      subject: ex.subject,
      caption: ex.caption ?? null,
      featured: ex.featured ?? false,
      picture_frame_id: ex.pictureFrameId ?? null,
      float_frame_id: ex.floatFrameId ?? null,
      stretching_depth: ex.stretchingDepth ?? null,
      canvas_id: ex.canvasId ?? null,
      image_path: ex.image,
      display_order: i,
    };
    return row;
  });

  const { error: insErr, count } = await supabase
    .from("frame_examples")
    .insert(rows, { count: "exact" });
  if (insErr) throw insErr;

  console.log(`✓ Inserted ${count ?? rows.length} rows`);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});
