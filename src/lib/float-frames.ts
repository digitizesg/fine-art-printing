/**
 * Float frame profiles — Supabase-backed list of moulding options for canvas
 * float framing. Replaces the static FLOAT_FRAME_COLOURS constant; public
 * pages call listFloatFrames() at build time.
 */
import { supabasePublic } from "./supabase";
import { buildMemo } from "./build-cache";

export interface FloatFrame {
  id: string;
  slug: string;
  label: string;
  costPerFoot: number;
  imagePath: string | null;
  imageUrl: string | null;
  published: boolean;
  displayOrder: number;
}

interface DbRow {
  id: string;
  slug: string;
  label: string;
  cost_per_foot: number | string;
  image_path: string | null;
  published: boolean;
  display_order: number;
}

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
export const FLOAT_FRAMES_BUCKET = "float-frames";

export function floatFrameImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${FLOAT_FRAMES_BUCKET}/${imagePath}`;
}

function rowToFloatFrame(row: DbRow): FloatFrame {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    costPerFoot: typeof row.cost_per_foot === "string"
      ? parseFloat(row.cost_per_foot)
      : row.cost_per_foot,
    imagePath: row.image_path,
    imageUrl: floatFrameImageUrl(row.image_path),
    published: row.published,
    displayOrder: row.display_order,
  };
}

export async function listFloatFrames(opts: { onlyPublished?: boolean } = {}): Promise<FloatFrame[]> {
  const onlyPublished = opts.onlyPublished !== false;
  return buildMemo(`float-frames:onlyPublished=${onlyPublished}`, async () => {
    let query = supabasePublic
      .from("float_frames")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (onlyPublished) {
      query = query.eq("published", true);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Failed to load float_frames:", error.message);
      return [];
    }
    return (data as DbRow[]).map(rowToFloatFrame);
  });
}

export async function getFloatFrameBySlug(slug: string): Promise<FloatFrame | null> {
  const { data, error } = await supabasePublic
    .from("float_frames")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToFloatFrame(data as DbRow);
}
