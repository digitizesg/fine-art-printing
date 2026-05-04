/**
 * Frame examples — Supabase-backed.
 *
 * Marketing pages call these helpers in their frontmatter (build time when
 * prerender=true, request time otherwise). Admin pages fetch via the same
 * supabase client but with the user's session for write access.
 */
import { supabasePublic, frameExampleUrl } from "./supabase";
import { PICTURE_FRAMES } from "../data/picture-frames";
import type { FloatFrame } from "./float-frames";
import type { Canvas } from "./canvases";
import type { Paper } from "./papers";

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
  paperId: string | null;
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
  paper_id: string | null;
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
    paperId: row.paper_id,
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

/**
 * Pick the most relevant detail string for an example. Resolves the IDs
 * stored on the row to the canonical user-facing labels (so e.g.
 * "natural-brown-oak" becomes "Natural Brown Oak", from the float-frame
 * catalog rather than a slug-titlecase guess).
 *
 * - custom-framing → picture frame name
 * - canvas-stretching → float frame name (the canvas is the customer's;
 *   what we did was stretch + frame it)
 * - canvas-printing → canvas substrate name; falls back to float frame
 */
export function detailLabelFor(
  ex: FrameExample,
  floatFrames: Pick<FloatFrame, "slug" | "label">[] = [],
  canvases: Pick<Canvas, "slug" | "shortName">[] = [],
  papers: Pick<Paper, "slug" | "shortName">[] = [],
): string {
  const lookupFloat = (id: string) =>
    floatFrames.find((f) => f.slug === id)?.label;
  const lookupCanvas = (id: string) =>
    canvases.find((c) => c.slug === id)?.shortName;
  const lookupPaper = (id: string) =>
    papers.find((p) => p.slug === id)?.shortName;
  if (ex.service === "custom-framing") {
    const paper = ex.paperId ? lookupPaper(ex.paperId) : undefined;
    const frame = ex.pictureFrameId
      ? PICTURE_FRAMES.find((p) => p.id === ex.pictureFrameId)?.label
      : undefined;
    return [paper, frame].filter(Boolean).join(" · ");
  }
  if (ex.service === "canvas-stretching" && ex.floatFrameId) {
    const label = lookupFloat(ex.floatFrameId);
    if (label) return label;
  }
  if (ex.service === "canvas-printing") {
    const canvas = ex.canvasId ? lookupCanvas(ex.canvasId) : undefined;
    const float = ex.floatFrameId ? lookupFloat(ex.floatFrameId) : undefined;
    return [canvas, float].filter(Boolean).join(" · ");
  }
  return "";
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
