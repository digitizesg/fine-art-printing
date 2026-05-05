/**
 * Adds `hero:` frontmatter to article markdown that doesn't already
 * have one, picking the first ![alt](url) image found in the body.
 *
 *   node scripts/set-article-heros.mjs
 *
 * Articles with no body images are left untouched. Articles with a
 * pre-existing hero are left untouched.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = resolve(__dirname, "..", "src", "content", "articles");

function splitFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { frontmatter: null, body: md };
  return { frontmatter: m[1], body: m[2] };
}

function firstBodyImage(body) {
  const m = body.match(/!\[[^\]]*\]\(([^)]+?\.(?:jpe?g|png|gif|webp))\)/i);
  return m?.[1] ?? null;
}

async function run() {
  const entries = await readdir(ARTICLES_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => join(ARTICLES_DIR, e.name));

  let updated = 0;
  let skippedExisting = 0;
  let skippedNoImage = 0;
  for (const file of files) {
    const md = await readFile(file, "utf8");
    const { frontmatter, body } = splitFrontmatter(md);
    if (!frontmatter) {
      console.log(`  no-frontmatter ${file.split("/").pop()}`);
      continue;
    }
    if (/^hero:/m.test(frontmatter)) {
      skippedExisting += 1;
      continue;
    }
    const url = firstBodyImage(body);
    if (!url) {
      skippedNoImage += 1;
      continue;
    }
    const newFrontmatter = `${frontmatter.trimEnd()}\nhero: ${url}`;
    const next = `---\n${newFrontmatter}\n---\n${body}`;
    await writeFile(file, next);
    updated += 1;
    console.log(`  hero set: ${file.split("/").pop()} → ${url.slice(0, 60)}...`);
  }

  console.log(`\n✓ Done. ${updated} updated, ${skippedExisting} already had hero, ${skippedNoImage} have no body image.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
