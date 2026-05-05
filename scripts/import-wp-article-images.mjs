/**
 * One-shot import: pull every /wp-content/uploads/... image referenced
 * by article markdown into the Supabase `articles` storage bucket, then
 * rewrite the markdown to point at the public Supabase URL.
 *
 *   node scripts/import-wp-article-images.mjs
 *
 * Why: articles were imported from WordPress with relative
 * /wp-content/uploads/... paths that don't resolve in the Astro build.
 * This mirrors the source images into Supabase storage so they survive
 * the domain cutover from the legacy WP site.
 *
 * Idempotent: re-running skips images that already exist in the bucket
 * and only rewrites markdown lines that still hold a wp-content path.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

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

const WP_HOST = "https://fineartprinting.com.sg";
const BUCKET = "articles";
const ARTICLES_DIR = resolve(__dirname, "..", "src", "content", "articles");

const CONTENT_TYPE_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

async function ensureBucket() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw error;
  if (buckets.some((b) => b.name === BUCKET)) return;
  const { error: createErr } = await sb.storage.createBucket(BUCKET, { public: true });
  if (createErr) throw createErr;
  console.log(`Created bucket "${BUCKET}" (public)`);
}

function publicUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function fileExistsInBucket(path) {
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const name = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
  const { data, error } = await sb.storage.from(BUCKET).list(dir, {
    limit: 1000,
    search: name,
  });
  if (error) return false;
  return Array.isArray(data) && data.some((f) => f.name === name);
}

async function downloadAndUpload(wpPath) {
  // wpPath: "/wp-content/uploads/2024/08/restored-master-1.jpg"
  // bucketPath: "2024/08/restored-master-1.jpg"
  const bucketPath = wpPath.replace(/^\/wp-content\/uploads\//, "");
  if (await fileExistsInBucket(bucketPath)) {
    return { bucketPath, status: "exists" };
  }
  const sourceUrl = `${WP_HOST}${wpPath}`;
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    return { bucketPath, status: `fetch-failed-${res.status}` };
  }
  const ext = extname(bucketPath).toLowerCase();
  const contentType =
    res.headers.get("content-type") || CONTENT_TYPE_BY_EXT[ext] || "application/octet-stream";
  const buffer = Buffer.from(await res.arrayBuffer());
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(bucketPath, buffer, { contentType, upsert: false });
  if (error && !/already exists/i.test(error.message)) {
    return { bucketPath, status: `upload-failed: ${error.message}` };
  }
  return { bucketPath, status: "uploaded" };
}

async function listMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => join(dir, e.name));
}

function extractWpPaths(markdown) {
  // Captures /wp-content/uploads/... up to the next quote, paren, space, or
  // markdown image-syntax close. Restricted to image extensions.
  const re = /\/wp-content\/uploads\/[^\s)"'<>]+?\.(?:jpg|jpeg|png|gif|webp|svg)/gi;
  return Array.from(new Set(markdown.match(re) ?? []));
}

async function run() {
  console.log("→ Ensuring articles bucket exists...");
  await ensureBucket();

  const files = await listMarkdownFiles(ARTICLES_DIR);
  console.log(`→ Found ${files.length} article markdown files.`);

  const allPathsToFiles = new Map();
  const fileContents = new Map();
  for (const file of files) {
    const md = await readFile(file, "utf8");
    fileContents.set(file, md);
    for (const p of extractWpPaths(md)) {
      if (!allPathsToFiles.has(p)) allPathsToFiles.set(p, new Set());
      allPathsToFiles.get(p).add(file);
    }
  }
  const uniquePaths = Array.from(allPathsToFiles.keys());
  console.log(`→ ${uniquePaths.length} unique wp-content image paths to import.`);

  const pathMap = new Map(); // wpPath -> publicUrl
  for (const wpPath of uniquePaths) {
    const result = await downloadAndUpload(wpPath);
    const status = result.status;
    if (status === "uploaded" || status === "exists") {
      pathMap.set(wpPath, publicUrl(result.bucketPath));
      console.log(`  [${status}] ${result.bucketPath}`);
    } else {
      console.log(`  [SKIP ${status}] ${wpPath}`);
    }
  }

  console.log("→ Rewriting markdown files...");
  let touchedFiles = 0;
  for (const [file, md] of fileContents) {
    let next = md;
    for (const [wpPath, url] of pathMap) {
      if (!next.includes(wpPath)) continue;
      next = next.split(wpPath).join(url);
    }
    if (next !== md) {
      await writeFile(file, next);
      touchedFiles += 1;
      console.log(`  rewrote ${file.split("/").pop()}`);
    }
  }
  console.log(`✓ Done. Rewrote ${touchedFiles} file(s).`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
