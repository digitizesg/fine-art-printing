/**
 * Artworks — Supabase-backed catalog of sellable images.
 *
 * Public pages (/shop) call listArtworks() / getArtworkBySlug() at build time;
 * admin pages (/admin/artworks) use the same supabase server client they use
 * for frame-examples.
 */
import { supabasePublic } from "./supabase";
import { buildMemo } from "./build-cache";

export interface AvailableSize {
  width_cm: number;
  height_cm: number;
  label?: string;
}

export interface GalleryImage {
  path: string;
  url: string;
}

export interface Artwork {
  id: string;
  slug: string;
  title: string;
  artistName: string | null;
  description: string | null;
  heroImagePath: string;
  heroImageUrl: string;
  /** Cached pixel dimensions of heroImagePath. Null until the row has
   *  been backfilled (or the admin upload populates them). The shop
   *  page uses these to skip <Image inferSize> at build time. */
  imageWidth: number | null;
  imageHeight: number | null;
  galleryImages: GalleryImage[];
  availableSizes: AvailableSize[];
  allowPaper: boolean;
  allowCanvas: boolean;
  published: boolean;
  featured: boolean;
  displayOrder: number;
}

interface DbRow {
  id: string;
  slug: string;
  title: string;
  artist_name: string | null;
  description: string | null;
  hero_image_path: string;
  gallery_images: string[];
  available_sizes: AvailableSize[];
  allow_paper: boolean;
  allow_canvas: boolean;
  published: boolean;
  featured: boolean;
  display_order: number;
  image_width: number | null;
  image_height: number | null;
}

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
export const ARTWORKS_BUCKET = "artworks";

export function artworkImageUrl(imagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${ARTWORKS_BUCKET}/${imagePath}`;
}

function rowToArtwork(row: DbRow): Artwork {
  const galleryPaths = Array.isArray(row.gallery_images) ? row.gallery_images : [];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artistName: row.artist_name,
    description: row.description,
    heroImagePath: row.hero_image_path,
    heroImageUrl: artworkImageUrl(row.hero_image_path),
    galleryImages: galleryPaths.map((path) => ({
      path,
      url: artworkImageUrl(path),
    })),
    availableSizes: Array.isArray(row.available_sizes) ? row.available_sizes : [],
    allowPaper: row.allow_paper,
    allowCanvas: row.allow_canvas,
    published: row.published,
    featured: row.featured,
    displayOrder: row.display_order,
    imageWidth: row.image_width ?? null,
    imageHeight: row.image_height ?? null,
  };
}

export async function listArtworks(opts: { onlyPublished?: boolean } = {}): Promise<Artwork[]> {
  const onlyPublished = opts.onlyPublished !== false;
  return buildMemo(`artworks:onlyPublished=${onlyPublished}`, async () => {
    let query = supabasePublic
      .from("artworks")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (onlyPublished) {
      query = query.eq("published", true);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Failed to load artworks:", error.message);
      return [];
    }
    return (data as DbRow[]).map(rowToArtwork);
  });
}

export async function getArtworkBySlug(slug: string): Promise<Artwork | null> {
  const { data, error } = await supabasePublic
    .from("artworks")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !data) return null;
  return rowToArtwork(data as DbRow);
}
