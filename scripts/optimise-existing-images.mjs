/**
 * One-off: downscale + recompress oversized images already in Supabase storage.
 *
 * - Reads every image referenced by the catalog tables (papers, canvases,
 *   float_frames, artworks, frame_examples).
 * - Skips anything already small (<= SIZE_FLOOR and <= EDGE_FLOOR on the long side).
 * - Resizes the rest to MAX_EDGE, recompresses, and (unless dry-run) overwrites
 *   the SAME storage path so all existing references keep working.
 * - Backs up every original it touches to ./image-backup/<bucket>/<path> first.
 * - Keeps the original format (jpeg->jpeg, png->png) so extensions/paths stay valid.
 *
 * Usage:
 *   node scripts/optimise-existing-images.mjs           # DRY RUN (no writes)
 *   node scripts/optimise-existing-images.mjs --apply   # actually overwrite
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");
const MAX_EDGE = 2000;          // long-edge cap — generous so lightbox zoom stays crisp
const SIZE_FLOOR = 800 * 1024;  // leave images already under this alone...
const EDGE_FLOOR = 2200;        // ...unless they're also bigger than this on the long side
const JPEG_QUALITY = 82;
const PNG_QUALITY = 80;
const BACKUP_DIR = "/Users/benrush/fine-art-printing/image-backup";

const env = readFileSync("/Users/benrush/fine-art-printing/.env.local", "utf8");
const ev = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1] || "").trim().replace(/^["']|["']$/g, "");
const URL_ = ev("PUBLIC_SUPABASE_URL");
const SERVICE_KEY = ev("SUPABASE_SERVICE_ROLE_KEY");
const pub = (bucket, path) => `${URL_}/storage/v1/object/public/${bucket}/${path}`;

async function rest(table, select) {
  const r = await fetch(`${URL_}/rest/v1/${table}?select=${select}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) { console.error(`  ${table}: HTTP ${r.status}`); return []; }
  return r.json();
}

async function storageUpload(bucket, path, buffer, contentType) {
  const r = await fetch(`${URL_}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!r.ok) throw new Error(`upload ${r.status}: ${await r.text()}`);
}

// ---- enumerate every referenced image ----
const targets = [];
for (const [table, bucket] of [["papers", "papers"], ["canvases", "canvases"]]) {
  for (const row of await rest(table, "images")) for (const p of row.images || []) targets.push({ bucket, path: p });
}
for (const row of await rest("float_frames", "image_path")) if (row.image_path) targets.push({ bucket: "float-frames", path: row.image_path });
for (const row of await rest("artworks", "hero_image_path,gallery_images")) {
  if (row.hero_image_path) targets.push({ bucket: "artworks", path: row.hero_image_path });
  for (const p of row.gallery_images || []) targets.push({ bucket: "artworks", path: p });
}
for (const row of await rest("frame_examples", "image_path")) if (row.image_path) targets.push({ bucket: "frame-examples", path: row.image_path });

// de-dupe
const seen = new Set();
const unique = targets.filter((t) => { const k = `${t.bucket}/${t.path}`; if (seen.has(k)) return false; seen.add(k); return true; });

console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${unique.length} referenced images\n`);

let touched = 0, before = 0, after = 0, skipped = 0, errors = 0;
const fmtKB = (b) => (b / 1024).toFixed(0).padStart(5) + "KB";

for (const t of unique) {
  try {
    const res = await fetch(pub(t.bucket, t.path));
    if (!res.ok) { console.error(`  ! fetch ${t.bucket}/${t.path}: ${res.status}`); errors++; continue; }
    const origBuf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(origBuf).metadata();
    const longEdge = Math.max(meta.width || 0, meta.height || 0);

    if (origBuf.length <= SIZE_FLOOR && longEdge <= EDGE_FLOOR) { skipped++; continue; }

    const isPng = (meta.format === "png");
    let pipeline = sharp(origBuf).rotate().resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true });
    pipeline = isPng
      ? pipeline.png({ quality: PNG_QUALITY, effort: 7, compressionLevel: 9 })
      : pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    const outBuf = await pipeline.toBuffer();

    // Never replace with something bigger or barely-smaller.
    if (outBuf.length >= origBuf.length * 0.95) {
      console.log(`  =  ${fmtKB(origBuf.length)} (no gain)        ${t.bucket}/${t.path}`);
      skipped++; continue;
    }

    console.log(`  ${APPLY ? "↓" : "·"}  ${fmtKB(origBuf.length)} -> ${fmtKB(outBuf.length)}  (${longEdge}px)  ${t.bucket}/${t.path}`);
    before += origBuf.length; after += outBuf.length; touched++;

    if (APPLY) {
      const backupPath = `${BACKUP_DIR}/${t.bucket}/${t.path}`;
      mkdirSync(dirname(backupPath), { recursive: true });
      writeFileSync(backupPath, origBuf);
      const contentType = isPng ? "image/png" : "image/jpeg";
      await storageUpload(t.bucket, t.path, outBuf, contentType);
    }
  } catch (e) {
    console.error(`  ! ${t.bucket}/${t.path}: ${e.message}`);
    errors++;
  }
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Would-shrink: ${touched} images   skipped: ${skipped}   errors: ${errors}`);
console.log(`Total: ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB  (saves ${((before - after) / 1024 / 1024).toFixed(1)}MB)`);
if (!APPLY) console.log(`\nThis was a DRY RUN. Re-run with --apply to overwrite (originals backed up to ${BACKUP_DIR}).`);
