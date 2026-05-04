/**
 * One-time seed: copy the 10 paper substrate definitions and photos into
 * Supabase. Mirrors the canvases / float-frames seeds.
 *
 * Run after applying supabase/papers.sql:
 *   node scripts/seed-papers.mjs
 *
 * Idempotent: skips inserts when slug already exists; uploads use upsert=true.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
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
  {
    slug: "hahnemuhle-photo-rag",
    brand: "Hahnemühle",
    name: "Hahnemühle Photo Rag",
    shortName: "Photo Rag",
    gsm: 308,
    finish: "matt",
    tone: "Natural white",
    texture: "Smooth",
    durability: "delicate",
    blurb: "Archival 100% cotton, smooth super-matt.",
    description:
      "The benchmark archival cotton paper. Muted blacks with even colour reproduction and excellent shadow detail. Suits both colour and monochrome work.",
    longDescription:
      "The super matt finish of Hahnemühle Photo Rag makes it one of our most popular papers among artists, illustrators, and photographers alike. The paper gives muted blacks with even colour reproduction and excellent detail. The surface has minimal texture with a chalky, smooth cotton feel that creates clean colour gradients. It has a delicate surface, so we recommend extra care when handling. Photo Rag suits mounting, but its cotton texture means edges can fray if not handled carefully.",
    featured: true,
    bestFor: ["bw-photo", "original-art", "illustration", "colour-photo"],
    sellPricePerSqm: 136.46,
    maxPrintWidthCm: 111.76,
    maxPrintLengthCm: 1200,
    images: [
      "photo-rag-1.jpg",
      "photo-rag-2.jpg",
      "photo-rag-3.jpg",
      "photo-rag-4.jpg",
    ],
  },
  {
    slug: "hahnemuhle-photo-rag-matt-baryta",
    brand: "Hahnemühle",
    name: "Hahnemühle Photo Rag Matt Baryta",
    shortName: "Photo Rag Matt Baryta",
    gsm: 308,
    finish: "matt",
    tone: "White",
    texture: "Smooth",
    durability: "good",
    blurb: "First matt baryta in the Photo Rag family.",
    description:
      "Combines the Photo Rag base with a matt baryta coating for vivid colours, fine detail, and deep blacks without surface gloss.",
    longDescription:
      "The first matt baryta paper in the Photo Rag family. In combination with a matt premium inkjet coating, it guarantees outstanding print results with vivid colour reproduction, fine detail, and deep blacks. The barium sulphate in the coating enhances the print's tonal range, sharpness, and clarity, while the matt surface keeps reflections under control.",
    featured: true,
    bestFor: ["colour-photo", "bw-photo"],
    sellPricePerSqm: 146.97,
    maxPrintWidthCm: 152.4,
    maxPrintLengthCm: 1200,
    images: [
      "photo-rag-matt-baryta.jpg",
      "photo-rag-matt-baryta-1.jpg",
      "photo-rag-matt-baryta-2.jpg",
      "photo-rag-matt-baryta-3.jpg",
      "photo-rag-matt-baryta-4.jpg",
    ],
  },
  {
    slug: "hahnemuhle-bamboo",
    brand: "Hahnemühle",
    name: "Hahnemühle Bamboo",
    shortName: "Bamboo",
    gsm: 290,
    finish: "matt",
    tone: "Warm white",
    texture: "Smooth",
    durability: "delicate",
    blurb: "90% bamboo, 10% cotton. Warm-toned matt.",
    description:
      "A sustainable matt paper made from bamboo fibres and cotton. Particularly suited to warm-tone colour and monochrome prints.",
    longDescription:
      "The world's first digital fine-art inkjet paper made from bamboo fibres. Bamboo represents naturalness and resource-saving paper production. Made from 90% bamboo fibres and 10% cotton, this naturally warm-toned, smooth-surfaced, optical-brightener-free paper offers maximum ageing resistance and an extremely large colour gamut. Particularly suited to warm-tone colour and monochrome prints.",
    featured: true,
    bestFor: ["colour-photo", "bw-photo", "original-art"],
    sellPricePerSqm: 125.94,
    maxPrintWidthCm: 111.76,
    maxPrintLengthCm: 1200,
    images: ["bamboo-1.jpg", "bamboo-2.jpg", "bamboo-3.jpg", "bamboo-4.jpg"],
  },
  {
    slug: "hahnemuhle-bamboo-gloss",
    brand: "Hahnemühle",
    name: "Hahnemühle Bamboo Gloss Baryta",
    shortName: "Bamboo Gloss Baryta",
    gsm: 305,
    finish: "gloss",
    tone: "Warm white",
    texture: "Smooth",
    durability: "high",
    blurb: "90% bamboo with a high-gloss baryta coating.",
    description:
      "Bamboo-fibre base with a gloss baryta surface. Natural feel of an analogue baryta paper, with vibrant tonal range.",
    longDescription:
      "90% bamboo fibres with a high-gloss baryta coating. The natural-white paper sits in a pleasant, warm shade of white and contains no optical brighteners. Combined with its lightly textured surface, Bamboo Gloss Baryta delivers a natural-looking aesthetic with the look and feel of an analogue baryta paper, while holding up well under handling.",
    featured: true,
    bestFor: ["colour-photo", "bw-photo"],
    sellPricePerSqm: 144.06,
    maxPrintWidthCm: 111.76,
    maxPrintLengthCm: 1200,
    images: [
      "bamboo-gloss-baryta.jpg",
      "bamboo-gloss-baryta-1.jpg",
      "bamboo-gloss-baryta-2.jpg",
      "bamboo-gloss-baryta-3.jpg",
      "bamboo-gloss-baryta-4.jpg",
    ],
  },
  {
    slug: "hahnemuhle-hemp",
    brand: "Hahnemühle",
    name: "Hahnemühle Hemp",
    shortName: "Hemp",
    gsm: 290,
    finish: "matt",
    tone: "White",
    texture: "Light texture",
    durability: "delicate",
    blurb: "60% hemp, 40% cotton. Sustainable, archival.",
    description:
      "Lightly textured hemp-fibre paper with a silky feel. Brilliant colour reproduction and deep blacks. Acid- and lignin-free for longevity.",
    longDescription:
      "Hahnemühle Hemp is made from 60% hemp fibre and 40% cotton, making it a more environmentally friendly choice. It has a natural-white tone and a lightly textured surface that gives the paper a pleasant, silky feel. Colours and details are brilliantly reproduced, and the depth of the black truly stands out. Free of acid and lignin, the paper can last 100+ years in fair environmental conditions.",
    featured: true,
    bestFor: ["original-art", "colour-photo", "bw-photo"],
    sellPricePerSqm: 92.46,
    maxPrintWidthCm: 111.76,
    maxPrintLengthCm: 1200,
    images: [
      "hahnemuhle-hemp.jpg",
      "hahnemuhle-hemp-2.jpg",
      "hahnemuhle-hemp-3.jpg",
      "hahnemuhle-hemp-4.jpg",
      "hahnemuhle-hemp-5.jpg",
    ],
  },
  {
    slug: "hahnemuhle-fineart-pearl",
    brand: "Hahnemühle",
    name: "Hahnemühle FineArt Pearl",
    shortName: "FineArt Pearl",
    gsm: 285,
    finish: "pearl",
    tone: "Natural white",
    texture: "Fine orange-peel",
    durability: "high",
    blurb: "Subtle orange-peel pearl finish.",
    description:
      "Smooth pearl/satin surface with subtle texture. Excellent for natural black-and-white work and vibrant colour reproduction.",
    longDescription:
      "FineArt Pearl has a smooth orange-peel texture and a bright neutral-white base. It creates natural black-and-white images and offers vibrant colour reproduction with great detail. The paper is resin-coated with a fibrous feel; the satin finish of the resin coating gives images depth which, combined with texture and vibrant colour, can give prints the feel of an oil painting. One of the most suitable Giclée art papers for mounting.",
    featured: true,
    bestFor: ["colour-photo", "bw-photo", "original-art", "illustration"],
    sellPricePerSqm: 141.60,
    maxPrintWidthCm: 111.76,
    maxPrintLengthCm: 1200,
    images: [
      "fineart-pearl-4.jpg",
      "fineart-pearl-1.jpg",
      "fineart-pearl-2.jpg",
      "fineart-pearl-3.jpg",
    ],
  },
  {
    slug: "hahnemuhle-metallic-rag",
    brand: "Hahnemühle",
    name: "Hahnemühle Photo Rag Metallic",
    shortName: "Photo Rag Metallic",
    gsm: 340,
    finish: "metallic",
    tone: "Off-white",
    texture: "Smooth",
    durability: "high",
    blurb: "Silvery-shimmering high-gloss surface.",
    description:
      "Heavyweight cotton paper with a metallic surface. Produces striking, high-gloss prints with a silvery shimmer.",
    longDescription:
      "An archival-grade Photo Rag paper with a silvery-shimmering surface that produces exceptional prints with a high-gloss metallic finish. An excellent choice for images featuring metallic elements, reflections, ice and glass, architecture, landscape, night and city-light scenes, and many black-and-white photographs. Acid- and lignin-free, meeting the highest standards for ageing resistance.",
    featured: true,
    bestFor: ["bw-photo", "colour-photo"],
    sellPricePerSqm: 179.18,
    maxPrintWidthCm: 111.76,
    maxPrintLengthCm: 1200,
    images: [
      "photo-rag-metallic.jpg",
      "photo-rag-metallic-2.jpg",
      "photo-rag-metallic-3.jpg",
      "photo-rag-metallic-4.jpg",
      "photo-rag-metallic-5.jpg",
    ],
  },
  {
    slug: "hahnemuhle-german-etching",
    brand: "Hahnemühle",
    name: "Hahnemühle German Etching",
    shortName: "German Etching",
    gsm: 310,
    finish: "matt",
    tone: "Slightly warm white",
    texture: "High texture",
    durability: "delicate",
    blurb: "Heavyweight, strongly textured matt paper.",
    description:
      "Heavyweight paper with a strong mottled etching texture. Renders strong colours and deep blacks with a hand-made feel.",
    longDescription:
      "A heavyweight paper with a slightly warm base tone and a strong, mottled texture. The texture lets the paper hold more ink and capture light, producing prints with strong colours and deep blacks that feel rich and high in contrast. Among our heaviest Giclée art papers, German Etching gives artwork a hand-crafted feel and resists fraying at the edges better than smoother fine-art cotton papers.",
    featured: true,
    bestFor: ["original-art", "illustration"],
    sellPricePerSqm: 123.93,
    maxPrintWidthCm: 111.76,
    maxPrintLengthCm: 1200,
    images: [
      "german-etching-3.jpg",
      "german-etching-1.jpg",
      "german-etching-2.jpg",
      "german-etching-4.jpg",
    ],
  },
  {
    slug: "hahnemuhle-photo-silk-baryta",
    brand: "Hahnemühle",
    name: "Hahnemühle Photo Silk Baryta X",
    shortName: "Photo Silk Baryta X",
    gsm: 310,
    finish: "silk-gloss",
    tone: "White",
    texture: "Smooth",
    durability: "high",
    blurb: "Alpha-cellulose paper with a silky gloss surface.",
    description:
      "Silky-gloss baryta paper, well-suited to photo and poster work where the print needs subtle reflectance and depth.",
    longDescription:
      "Part of the Hahnemühle Photo range, designed to produce strong-quality prints at a more attainable price point than the FineArt media. A 310gsm alpha-cellulose paper, perfectly suited to photo and poster prints where the intended output is a smooth, silky gloss finish.",
    featured: true,
    bestFor: ["colour-photo", "illustration"],
    sellPricePerSqm: 68.28,
    maxPrintWidthCm: 152.4,
    maxPrintLengthCm: 1500,
    images: [
      "hahnemuhle-photo-silk-baryta-x.jpg",
      "hahnemuhle-photo-silk-baryta-x-2.jpg",
      "hahnemuhle-photo-silk-baryta-x-3.jpg",
      "hahnemuhle-photo-silk-baryta-x-4.jpg",
    ],
  },
  {
    slug: "datajet-100-cotton-rag",
    brand: "Datajet",
    name: "Datajet 100% Cotton Rag",
    shortName: "100% Cotton Rag",
    gsm: 310,
    finish: "matt",
    tone: "Natural white",
    texture: "Smooth",
    durability: "delicate",
    blurb: "100% cotton archival matt, value alternative to Photo Rag.",
    description:
      "100% cotton rag paper at a more accessible price point. High archival quality, similar matt character to Hahnemühle Photo Rag.",
    longDescription:
      "Our only non-Hahnemühle paper, similar in character to Photo Rag. A matte-coated paper made from 100% cotton rags with a natural-white tone, delivering strong-quality prints at a slightly lower price point. Don't let the price fool you, it's still a high-quality archival-grade paper, and it's popular with our customers who want Photo Rag character without the Photo Rag premium.",
    featured: true,
    bestFor: ["colour-photo", "bw-photo", "original-art", "illustration"],
    sellPricePerSqm: 68.42,
    maxPrintWidthCm: 111.76,
    maxPrintLengthCm: 1500,
    images: [
      "datajet-100-cotton-rag.jpg",
      "datajet-100-cotton-rag-1.jpg",
      "datajet-100-cotton-rag-2.jpg",
      "datajet-100-cotton-rag-3.jpg",
      "datajet-100-cotton-rag-4.jpg",
    ],
  },
];

const PUBLIC_DIR = resolve(__dirname, "..", "public", "photos");
const BUCKET = "papers";

let order = 1;
for (const row of SEED) {
  const uploaded = [];
  for (const img of row.images) {
    try {
      const buf = await readFile(resolve(PUBLIC_DIR, img));
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(img, buf, { contentType: "image/jpeg", upsert: true });
      if (upErr) {
        console.error(`✗ Upload ${img}: ${upErr.message}`);
        continue;
      }
      uploaded.push(img);
      console.log(`✓ Uploaded ${img}`);
    } catch (e) {
      console.error(`✗ Read ${img}: ${e.message}`);
    }
  }

  const { data: existing } = await sb
    .from("papers")
    .select("id")
    .eq("slug", row.slug)
    .maybeSingle();

  if (existing) {
    console.log(`= Row "${row.slug}" already exists, skipping insert.`);
    order++;
    continue;
  }

  const { error: insErr } = await sb.from("papers").insert({
    slug: row.slug,
    brand: row.brand,
    name: row.name,
    short_name: row.shortName,
    gsm: row.gsm,
    finish: row.finish,
    tone: row.tone,
    texture: row.texture,
    durability: row.durability,
    blurb: row.blurb,
    description: row.description,
    long_description: row.longDescription,
    best_for: row.bestFor,
    sell_price_per_sqm: row.sellPricePerSqm,
    max_print_width_cm: row.maxPrintWidthCm,
    max_print_length_cm: row.maxPrintLengthCm,
    images: uploaded,
    featured: row.featured,
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
