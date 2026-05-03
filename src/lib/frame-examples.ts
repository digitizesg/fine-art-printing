/**
 * Frame examples — Supabase-backed.
 *
 * Marketing pages call these helpers in their frontmatter (build time when
 * prerender=true, request time otherwise). Admin pages fetch via the same
 * supabase client but with the user's session for write access.
 */
import { supabasePublic, frameExampleUrl } from "./supabase";

export type Service =
  | "custom-framing"
  | "canvas-printing"
  | "canvas-stretching";

export type Subject =
  | "photo-colour"
  | "photo-bw"
  | "artwork"
  | "illustration"
  | "document"
  | "memorabilia";

export const SERVICE_LABELS: Record<Service, string> = {
  "custom-framing": "Custom framing",
  "canvas-printing": "Canvas printing",
  "canvas-stretching": "Canvas stretching",
};

export const SUBJECT_LABELS: Record<Subject, string> = {
  "photo-colour": "Colour photo",
  "photo-bw": "B&W photo",
  artwork: "Original artwork",
  illustration: "Illustration",
  document: "Document",
  memorabilia: "Memorabilia",
};

export interface FrameExample {
  id: string;
  imagePath: string;
  imageUrl: string;
  service: Service;
  subject: Subject;
  caption: string | null;
  featured: boolean;
  pictureFrameId: string | null;
  floatFrameId: string | null;
  stretchingDepth: "1in" | "1.5in" | null;
  canvasId: string | null;
  displayOrder: number;
}

interface DbRow {
  id: string;
  service: Service;
  subject: Subject;
  caption: string | null;
  featured: boolean;
  picture_frame_id: string | null;
  float_frame_id: string | null;
  stretching_depth: "1in" | "1.5in" | null;
  canvas_id: string | null;
  image_path: string;
  display_order: number;
}

function rowToExample(row: DbRow): FrameExample {
  return {
    id: row.id,
    imagePath: row.image_path,
    imageUrl: frameExampleUrl(row.image_path),
    service: row.service,
    subject: row.subject,
    caption: row.caption,
    featured: row.featured,
    pictureFrameId: row.picture_frame_id,
    floatFrameId: row.float_frame_id,
    stretchingDepth: row.stretching_depth,
    canvasId: row.canvas_id,
    displayOrder: row.display_order,
  };
}

export async function listExamples(): Promise<FrameExample[]> {
  const { data, error } = await supabasePublic
    .from("frame_examples")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    console.error("Failed to load frame examples:", error.message);
    return [];
  }
  return (data as DbRow[]).map(rowToExample);
}

export async function featuredFor(
  service: Service,
  limit = 6,
): Promise<FrameExample[]> {
  const { data, error } = await supabasePublic
    .from("frame_examples")
    .select("*")
    .eq("service", service)
    .eq("featured", true)
    .order("display_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("Failed to load featured examples:", error.message);
    return [];
  }
  return (data as DbRow[]).map(rowToExample);
}
