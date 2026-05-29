/**
 * Canvas substrates — Supabase-backed list of canvas options for printing
 * and stretching. Replaces the static CANVASES constant in canvas.ts.
 */
import { supabasePublic } from "./supabase";
import { buildMemo } from "./build-cache";

export type CanvasFinish = "matt" | "smooth-matt" | "high-gloss";

export interface Canvas {
  id: string;
  slug: string;
  brand: string;
  name: string;
  shortName: string;
  gsm: number;
  finish: CanvasFinish;
  texture: string;
  tone: string;
  blurb: string;
  description: string;
  longDescription: string;
  /** Optional customer-facing notice (e.g. discontinuation, supply issues). */
  notice: string | null;
  sellPricePerSqm: number;
  maxPrintWidthCm: number;
  maxPrintLengthCm: number;
  /** Filenames in the canvases bucket. First is the picker thumbnail. */
  images: string[];
  /** Resolved public URLs in display order. */
  imageUrls: string[];
  featured: boolean;
  popular: boolean;
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
  finish: CanvasFinish;
  texture: string;
  tone: string;
  blurb: string;
  description: string;
  long_description: string;
  notice: string | null;
  sell_price_per_sqm: number | string;
  max_print_width_cm: number | string;
  max_print_length_cm: number | string;
  images: string[];
  featured: boolean;
  popular: boolean;
  published: boolean;
  display_order: number;
}

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
export const CANVASES_BUCKET = "canvases";

export function canvasImageUrl(imagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${CANVASES_BUCKET}/${imagePath}`;
}

const num = (v: number | string) =>
  typeof v === "string" ? parseFloat(v) : v;

function rowToCanvas(row: DbRow): Canvas {
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.name,
    shortName: row.short_name,
    gsm: row.gsm,
    finish: row.finish,
    texture: row.texture,
    tone: row.tone,
    blurb: row.blurb,
    description: row.description,
    longDescription: row.long_description,
    notice: row.notice && row.notice.trim().length > 0 ? row.notice : null,
    sellPricePerSqm: num(row.sell_price_per_sqm),
    maxPrintWidthCm: num(row.max_print_width_cm),
    maxPrintLengthCm: num(row.max_print_length_cm),
    images,
    imageUrls: images.map(canvasImageUrl),
    featured: row.featured,
    popular: row.popular ?? false,
    published: row.published,
    displayOrder: row.display_order,
  };
}

export async function listCanvases(opts: { onlyPublished?: boolean } = {}): Promise<Canvas[]> {
  const onlyPublished = opts.onlyPublished !== false;
  return buildMemo(`canvases:onlyPublished=${onlyPublished}`, async () => {
    let query = supabasePublic
      .from("canvases")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (onlyPublished) {
      query = query.eq("published", true);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Failed to load canvases:", error.message);
      return [];
    }
    return (data as DbRow[]).map(rowToCanvas);
  });
}

export async function getCanvasBySlug(slug: string): Promise<Canvas | null> {
  const { data, error } = await supabasePublic
    .from("canvases")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !data) return null;
  return rowToCanvas(data as DbRow);
}
