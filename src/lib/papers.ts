/**
 * Papers — Supabase-backed list of paper substrates. Replaces the static
 * PAPERS constant in src/data/pricing/paper.ts.
 */
import { supabasePublic } from "./supabase";

export type PaperFinish =
  | "matt"
  | "gloss"
  | "high-gloss"
  | "pearl"
  | "satin"
  | "silk-gloss"
  | "metallic";

export type PaperDurability = "delicate" | "good" | "high";

export type PaperUseCase =
  | "colour-photo"
  | "bw-photo"
  | "original-art"
  | "illustration";

export interface Paper {
  id: string;
  slug: string;
  brand: string;
  name: string;
  shortName: string;
  gsm: number;
  finish: PaperFinish;
  tone: string;
  texture: string;
  durability: PaperDurability;
  blurb: string;
  description: string;
  longDescription: string;
  bestFor: PaperUseCase[];
  sellPricePerSqm: number;
  maxPrintWidthCm: number;
  maxPrintLengthCm: number;
  images: string[];
  imageUrls: string[];
  featured: boolean;
  published: boolean;
  displayOrder: number;
}

interface DbRow {
  id: string;
  slug: string;
  brand: string;
  name: string;
  short_name: string;
  gsm: number;
  finish: PaperFinish;
  tone: string;
  texture: string;
  durability: PaperDurability;
  blurb: string;
  description: string;
  long_description: string;
  best_for: PaperUseCase[];
  sell_price_per_sqm: number | string;
  max_print_width_cm: number | string;
  max_print_length_cm: number | string;
  images: string[];
  featured: boolean;
  published: boolean;
  display_order: number;
}

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
export const PAPERS_BUCKET = "papers";

export function paperImageUrl(imagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${PAPERS_BUCKET}/${imagePath}`;
}

const num = (v: number | string) =>
  typeof v === "string" ? parseFloat(v) : v;

function rowToPaper(row: DbRow): Paper {
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.name,
    shortName: row.short_name,
    gsm: row.gsm,
    finish: row.finish,
    tone: row.tone,
    texture: row.texture,
    durability: row.durability,
    blurb: row.blurb,
    description: row.description,
    longDescription: row.long_description,
    bestFor: Array.isArray(row.best_for) ? row.best_for : [],
    sellPricePerSqm: num(row.sell_price_per_sqm),
    maxPrintWidthCm: num(row.max_print_width_cm),
    maxPrintLengthCm: num(row.max_print_length_cm),
    images,
    imageUrls: images.map(paperImageUrl),
    featured: row.featured,
    published: row.published,
    displayOrder: row.display_order,
  };
}

export async function listPapers(opts: { onlyPublished?: boolean } = {}): Promise<Paper[]> {
  let query = supabasePublic
    .from("papers")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (opts.onlyPublished !== false) {
    query = query.eq("published", true);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Failed to load papers:", error.message);
    return [];
  }
  return (data as DbRow[]).map(rowToPaper);
}

export async function getPaperBySlug(slug: string): Promise<Paper | null> {
  const { data, error } = await supabasePublic
    .from("papers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToPaper(data as DbRow);
}
