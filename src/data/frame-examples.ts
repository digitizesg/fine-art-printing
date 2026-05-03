/**
 * Customer-facing examples of finished work — used by the standalone /gallery
 * page and by featured strips on the service pages.
 *
 * Phase 1: file-based. Adding new examples = drop a JPG in
 * /public/photos/frame-examples/ and append an entry below.
 * Phase 2 (later): migrate to Supabase + admin upload UI.
 */

export type Service = "custom-framing" | "canvas-printing" | "canvas-stretching";

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
  /** Stable slug — used for URL anchors and React-style keys. */
  id: string;
  /** Filename in /public/photos/frame-examples/ */
  image: string;
  /** Top-level service category. */
  service: Service;
  /** Subject of the framed/printed work. */
  subject: Subject;
  /** Optional one-line caption for the lightbox / hover. */
  caption?: string;
  /** Promote to the service-page featured strip. */
  featured?: boolean;

  // ---- Custom-framing-specific ------------------------------------------
  /** Picture frame profile id (matches the ids on /custom-framing). */
  pictureFrameId?: string;

  // ---- Canvas-only (printing or stretching) -----------------------------
  /** Float frame surrounding the canvas, if any. Matches FLOAT_FRAME_COLOURS id. */
  floatFrameId?: string | null;
  /** Stretching bar depth. */
  stretchingDepth?: "1in" | "1.5in";

  // ---- Canvas-printing-specific -----------------------------------------
  /** Which canvas substrate. Matches CANVASES id. */
  canvasId?: string;
}

/* ----------------------------------------------------------------------------
 * Examples
 *
 * NOTE: a couple of the filename slugs reference profile ids that don't yet
 * exist in the /custom-framing picture-frame data ("2.2cm-raw-oak",
 * "2.2cm-soft-oak"). Ben to confirm whether those are new 2.2cm variants of
 * the 2cm Raw / Soft Oak profiles or mislabelled photos of the existing 2cm
 * versions. Subjects are best-guessed as "photo-colour" until verified.
 * -------------------------------------------------------------------------- */

export const FRAME_EXAMPLES: FrameExample[] = [
  // 2.5cm Classic Champagne — five examples (assume new "Decorative" profile)
  {
    id: "classic-champagne-1",
    image: "2.5cm-classic-champagne-1.jpg",
    service: "custom-framing",
    pictureFrameId: "classic-champagne",
    subject: "photo-colour",
    featured: true,
  },
  {
    id: "classic-champagne-2",
    image: "2.5cm-classic-champagne-2.jpg",
    service: "custom-framing",
    pictureFrameId: "classic-champagne",
    subject: "photo-colour",
  },
  {
    id: "classic-champagne-3",
    image: "2.5cm-classic-champagne-3.jpg",
    service: "custom-framing",
    pictureFrameId: "classic-champagne",
    subject: "photo-colour",
  },
  {
    id: "classic-champagne-4",
    image: "2.5cm-classic-champagne-4.jpg",
    service: "custom-framing",
    pictureFrameId: "classic-champagne",
    subject: "photo-colour",
  },
  {
    id: "classic-champagne-5",
    image: "2.5cm-classic-champagne-5.jpg",
    service: "custom-framing",
    pictureFrameId: "classic-champagne",
    subject: "photo-colour",
  },

  // 2.5cm Classic Gold
  {
    id: "classic-gold-1",
    image: "2.5cm-classic-gold-1.jpg",
    service: "custom-framing",
    pictureFrameId: "classic-gold",
    subject: "photo-colour",
    featured: true,
  },

  // 2.2cm Wood Grain Black
  {
    id: "wood-grain-black-1",
    image: "2.2cm-wood-grain-black-1.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-wood-grain-black",
    subject: "photo-colour",
    featured: true,
  },
  {
    id: "wood-grain-black-2",
    image: "2.2cm-wood-grain-black-2.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-wood-grain-black",
    subject: "photo-colour",
  },

  // 2.2cm Soft Oak — three examples (new natural-line profile, distinct from 2cm)
  {
    id: "soft-oak-22-1",
    image: "2.2cm-soft-oak-1.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-soft-oak",
    subject: "photo-colour",
    featured: true,
  },
  {
    id: "soft-oak-22-2",
    image: "2.2cm-soft-oak-2.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-soft-oak",
    subject: "photo-colour",
  },
  {
    id: "soft-oak-22-3",
    image: "2.2cm-soft-oak-3.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-soft-oak",
    subject: "photo-colour",
  },

  // 2.2cm Raw Oak
  {
    id: "raw-oak-22-1",
    image: "2.2cm-raw-oak-1.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-raw-oak",
    subject: "photo-colour",
    featured: true,
  },

  // Black with gold inlet
  {
    id: "black-gold-1",
    image: "black-gold-1.jpg",
    service: "custom-framing",
    pictureFrameId: "black-gold-inlet",
    subject: "photo-colour",
    featured: true,
  },
  {
    id: "black-gold-2",
    image: "black-gold-2.jpg",
    service: "custom-framing",
    pictureFrameId: "black-gold-inlet",
    subject: "photo-colour",
  },
];

/* ----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

export const featuredFor = (service: Service, limit = 6): FrameExample[] =>
  FRAME_EXAMPLES.filter((e) => e.service === service && e.featured).slice(
    0,
    limit,
  );

export const allFor = (service: Service): FrameExample[] =>
  FRAME_EXAMPLES.filter((e) => e.service === service);
