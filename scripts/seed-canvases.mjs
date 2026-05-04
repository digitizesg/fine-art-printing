/**
 * One-time seed: copy the existing canvas substrate definitions and photos
 * into Supabase, mirroring the float-frames seed.
 *
 * Run after applying supabase/canvases.sql:
 *   node scripts/seed-canvases.mjs
 *
 * Idempotent on the table side (skips rows whose slug already exists);
 * uploads use upsert=true so re-running won't duplicate storage objects.
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
    slug: "hahnemuhle-daguerre-canvas",
    brand: "Hahnemühle",
    name: "Hahnemühle Daguerre Canvas",
    shortName: "Daguerre Canvas",
    gsm: 400,
    finish: "matt",
    texture: "Fine, uniform",
    tone: "Bright white",
    blurb: "Fine, even-textured matt canvas.",
    description:
      "Poly-cotton blend with a fine, uniform texture and a bright-white matt coating. The cleanest, most consistent canvas surface we offer.",
    longDescription:
      "A poly-cotton inkjet canvas with a fine, uniform texture and a bright-white matt coating. Vivid colours, crisp detail, and high-contrast black-and-white prints. Acid- and lignin-free for longevity, and its high weight combined with excellent stretchability makes it ideal for stretching on canvas frames.",
    featured: true,
    sellPricePerSqm: 103.13,
    maxPrintWidthCm: 152.4,
    maxPrintLengthCm: 1200,
    images: [
      "hahnemuhle-daguerre-canvas-1.jpg",
      "hahnemuhle-daguerre-canvas-2.jpg",
      "hahnemuhle-daguerre-canvas-3.jpg",
      "hahnemuhle-daguerre-canvas-4.jpg",
    ],
  },
  {
    slug: "hahnemuhle-artist-canvas",
    brand: "Hahnemühle",
    name: "Hahnemühle Artist Canvas",
    shortName: "Artist Canvas",
    gsm: 340,
    finish: "matt",
    texture: "Coarse",
    tone: "Natural white",
    blurb: "Coarse, traditional canvas weave.",
    description:
      "Matte-coated polyester-cotton blend with a natural-white tone and a coarse, traditional canvas texture. The most painterly canvas in the range.",
    longDescription:
      "A matte-coated polyester-cotton blend with a natural-white colour, no optical brighteners, and a coarse texture. The premium matt coating produces sharp images with vivid colour, deep blacks, and high contrast. Acid-free, lignin-free, age-resistant. A particularly good choice for artwork reproductions and works that benefit from a visible weave reading underneath the image.",
    featured: true,
    sellPricePerSqm: 150.77,
    maxPrintWidthCm: 152.4,
    maxPrintLengthCm: 1200,
    images: [
      "hahnemuhle-canvas-artist-1.jpg",
      "hahnemuhle-canvas-artist-2.jpg",
      "hahnemuhle-canvas-artist-3.jpg",
      "hahnemuhle-canvas-artist-4.jpg",
    ],
  },
  {
    slug: "hahnemuhle-metallic-canvas",
    brand: "Hahnemühle",
    name: "Hahnemühle Metallic Canvas",
    shortName: "Metallic Canvas",
    gsm: 350,
    finish: "high-gloss",
    texture: "Fine, uniform",
    tone: "Off-white",
    blurb: "Silvery shimmer, high-gloss surface.",
    description:
      "Heavyweight canvas with a silvery-shimmering high-gloss finish that produces striking, dimensional prints.",
    longDescription:
      "A heavyweight canvas with a silvery-shimmering, high-gloss finish that produces exceptional results. Works particularly well with images featuring metallic elements, reflections, ice and glass, architecture, landscape, night and city-light scenes, and many black-and-white photographs. Acid- and lignin-free, meeting the most exacting standards for ageing resistance.",
    featured: true,
    sellPricePerSqm: 162.18,
    maxPrintWidthCm: 152.4,
    maxPrintLengthCm: 1200,
    images: [
      "hahnemuhle-canvas-metallic.jpg",
      "hahnemuhle-canvas-metallic-1.jpg",
      "hahnemuhle-canvas-metallic-2.jpg",
      "hahnemuhle-canvas-metallic-3.jpg",
      "hahnemuhle-canvas-metallic-4.jpg",
      "hahnemuhle-canvas-metallic-5.jpg",
      "hahnemuhle-canvas-metallic-6.jpg",
      "hahnemuhle-canvas-metallic-7.jpg",
    ],
  },
  {
    slug: "hahnemuhle-photo-canvas",
    brand: "Hahnemühle",
    name: "Hahnemühle Photo Canvas",
    shortName: "Photo Canvas",
    gsm: 320,
    finish: "matt",
    texture: "Fine, uniform",
    tone: "Bright white",
    blurb: "Polyester-cotton, finer than Artist Canvas.",
    description:
      "Polyester-cotton blend with a bright-white tone and a finer surface than Artist Canvas. A good middle ground for canvas character without heavy texture.",
    longDescription:
      "A 320gsm canvas made from a polyester-cotton blend, with a bright-white tone and a matt coating optimised for photographic prints. Hahnemühle positions Photo Canvas a step below the Artist, Daguerre, and Metallic range, but we've found it produces excellent results at a more affordable price point. A frequent choice for portraits, product work, and editorial photography on canvas.",
    featured: true,
    sellPricePerSqm: 74.09,
    maxPrintWidthCm: 152.4,
    maxPrintLengthCm: 2000,
    images: [
      "hahnemuhle-photo-canvas-1.jpg",
      "hahnemuhle-photo-canvas-2.jpg",
      "hahnemuhle-photo-canvas-3.jpg",
      "hahnemuhle-photo-canvas-4.jpg",
    ],
  },
  {
    slug: "datajet-polycotton-canvas",
    brand: "Datajet",
    name: "Datajet Polycotton Canvas",
    shortName: "Polycotton Canvas",
    gsm: 420,
    finish: "matt",
    texture: "Smooth",
    tone: "Bright white",
    blurb: "Heaviest canvas, accessible price point.",
    description:
      "Matte-coated polyester-cotton blend with a bright-white tone. The heaviest weight in our lineup at the most accessible price.",
    longDescription:
      "Our only non-Hahnemühle canvas. A matte-coated polyester-cotton blend with a bright-white tone, producing strong-quality prints at a slightly lower price point. We find its print output and consistency on par with Hahnemühle Daguerre. Don't let the price fool you, it's still a high-quality canvas, and it's popular with our corporate and high-volume customers.",
    featured: true,
    sellPricePerSqm: 53.69,
    maxPrintWidthCm: 152.4,
    maxPrintLengthCm: 2000,
    images: [
      "datajet-polycotton-canvas-2.jpg",
      "datajet-polycotton-canvas.jpg",
      "datajet-polycotton-canvas-3.jpg",
      "datajet-polycotton-canvas-4.jpg",
      "datajet-polycotton-canvas-5.jpg",
    ],
  },
];

const PUBLIC_DIR = resolve(__dirname, "..", "public", "photos");
const BUCKET = "canvases";

let order = 1;
for (const row of SEED) {
  const uploadedImages = [];
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
      uploadedImages.push(img);
      console.log(`✓ Uploaded ${img}`);
    } catch (e) {
      console.error(`✗ Read ${img}: ${e.message}`);
    }
  }

  const { data: existing } = await sb
    .from("canvases")
    .select("id")
    .eq("slug", row.slug)
    .maybeSingle();

  if (existing) {
    console.log(`= Row "${row.slug}" already exists, skipping insert.`);
    order++;
    continue;
  }

  const { error: insErr } = await sb.from("canvases").insert({
    slug: row.slug,
    brand: row.brand,
    name: row.name,
    short_name: row.shortName,
    gsm: row.gsm,
    finish: row.finish,
    texture: row.texture,
    tone: row.tone,
    blurb: row.blurb,
    description: row.description,
    long_description: row.longDescription,
    sell_price_per_sqm: row.sellPricePerSqm,
    max_print_width_cm: row.maxPrintWidthCm,
    max_print_length_cm: row.maxPrintLengthCm,
    images: uploadedImages,
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
