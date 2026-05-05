/**
 * One-shot: re-encode every JPG in /public/photos/ at q=80 with a max
 * long edge of 2400px. Done in-place. Main motivation: a few canvas-
 * sample originals are 6-8 MB, which makes Vercel deploy uploads slow
 * without any matching visual benefit (they're served via Astro's
 * image service anyway, so the optimised CDN copy is what users see).
 *
 *   node scripts/compress-public-photos.mjs
 *
 * Idempotent in spirit: re-encoding an already-compressed JPG at the
 * same settings is a no-op visually, just saves a tiny bit more.
 */
import sharp from "sharp";
import { readdir, stat, writeFile, readFile } from "node:fs/promises";
import { resolve, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "public", "photos");

const MAX_EDGE = 2400;
const JPG_QUALITY = 80;
// Below this size we still re-encode (cheap), but skip the resize.
const SMALL_FILE_BYTES = 300 * 1024;

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(p)));
    } else if (e.isFile() && /\.(jpe?g)$/i.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function compressOne(file) {
  const beforeStat = await stat(file);
  const before = beforeStat.size;
  const input = await readFile(file);
  const meta = await sharp(input).metadata();
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
  let pipeline = sharp(input).rotate(); // honour EXIF orientation
  if (longEdge > MAX_EDGE) {
    pipeline = pipeline.resize({
      width: meta.width >= meta.height ? MAX_EDGE : undefined,
      height: meta.height > meta.width ? MAX_EDGE : undefined,
      withoutEnlargement: true,
    });
  } else if (before < SMALL_FILE_BYTES) {
    // Already small + not oversized — leave alone to avoid a re-encode
    // that might soften crisp originals slightly.
    return { file, before, after: before, skipped: true };
  }
  const out = await pipeline
    .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
    .toBuffer();
  // Don't write if our re-encode is bigger than the original (rare
  // but happens with already-tiny JPGs); keeps the script safe.
  if (out.length >= before) {
    return { file, before, after: before, skipped: true };
  }
  await writeFile(file, out);
  return { file, before, after: out.length, skipped: false };
}

async function run() {
  const files = await walk(ROOT);
  console.log(`→ Found ${files.length} JPG files under /public/photos/`);
  let totalBefore = 0;
  let totalAfter = 0;
  let touched = 0;
  for (const file of files) {
    try {
      const r = await compressOne(file);
      totalBefore += r.before;
      totalAfter += r.after;
      if (!r.skipped) touched += 1;
      const tag = r.skipped ? "skip" : "done";
      const name = file.split("/photos/")[1];
      console.log(
        `  [${tag}] ${name.padEnd(48)} ${fmt(r.before).padStart(8)} → ${fmt(r.after).padStart(8)}`,
      );
    } catch (e) {
      console.warn(`  [error] ${file}: ${e?.message ?? e}`);
    }
  }
  console.log(
    `\n✓ Done. ${touched} re-encoded. ${fmt(totalBefore)} → ${fmt(totalAfter)} (saved ${fmt(totalBefore - totalAfter)}).`,
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
