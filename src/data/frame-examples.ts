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
 * "2.2cm-smooth-oak"). Ben to confirm whether those are new 2.2cm variants of
 * the 2cm Raw / Smooth Oak profiles or mislabelled photos of the existing 2cm
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
    subject: "memorabilia",
    caption: "Service medals, deep shadow box mount",
    featured: true,
  },
  {
    id: "wood-grain-black-2",
    image: "2.2cm-wood-grain-black-2.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-wood-grain-black",
    subject: "artwork",
    caption: "Chinese ink calligraphy on paper",
  },

  // 2.2cm Soft Oak — three examples (new natural-line profile, distinct from 2cm)
  {
    id: "smooth-oak-22-1",
    image: "2.2cm-smooth-oak-1.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-smooth-oak",
    subject: "photo-colour",
    featured: true,
  },
  {
    id: "smooth-oak-22-2",
    image: "2.2cm-smooth-oak-2.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-smooth-oak",
    subject: "photo-colour",
  },
  {
    id: "smooth-oak-22-3",
    image: "2.2cm-smooth-oak-3.jpg",
    service: "custom-framing",
    pictureFrameId: "2.2cm-smooth-oak",
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

  /* --------------------------------------------------------------------------
   * Custom framing — canvas-style mount + picture frame
   * -------------------------------------------------------------------------- */
  {
    id: "canvas-black-frame-acrylic-1",
    image: "canvas-black-frame-acrylic-1.jpg",
    service: "custom-framing",
    pictureFrameId: "2cm-smooth-black",
    subject: "illustration",
    caption: "Tiger illustration, black frame with mat",
    featured: true,
  },
  {
    id: "canvas-black-frame-black-mount",
    image: "canvas-black-frame-black-mount.jpg",
    service: "custom-framing",
    pictureFrameId: "2cm-smooth-black",
    subject: "illustration",
    caption: "Black frame, black mat",
  },

  /* --------------------------------------------------------------------------
   * Canvas stretching — original artworks stretched + float-framed.
   * The _DSC* files and the Aboriginal piece (1-black-float-frame-1) are
   * confirmed paintings; remaining numbered float-frame examples are assumed
   * canvas-printing for now (easy to flip per file).
   * -------------------------------------------------------------------------- */
  {
    id: "stretched-artwork-dsc0134",
    image: "_DSC0134.jpg",
    service: "canvas-stretching",
    floatFrameId: "natural-dark-brown-oak",
    subject: "artwork",
    caption: "Original painting, dark oak float frame",
    featured: true,
  },
  {
    id: "stretched-artwork-dsc0135",
    image: "_DSC0135.jpg",
    service: "canvas-stretching",
    floatFrameId: "natural-dark-brown-oak",
    subject: "artwork",
  },
  {
    id: "stretched-artwork-dsc0136",
    image: "_DSC0136.jpg",
    service: "canvas-stretching",
    floatFrameId: "natural-dark-brown-oak",
    subject: "artwork",
  },
  {
    id: "stretched-artwork-dsc9654",
    image: "_DSC9654.jpg",
    service: "canvas-stretching",
    floatFrameId: "natural-brown-oak",
    subject: "artwork",
    caption: "Pink orchids, light wood float frame",
    featured: true,
  },
  {
    id: "stretched-artwork-dsc9655",
    image: "_DSC9655.jpg",
    service: "canvas-stretching",
    floatFrameId: "natural-brown-oak",
    subject: "artwork",
  },
  {
    id: "stretched-artwork-dsc9657",
    image: "_DSC9657.jpg",
    service: "canvas-stretching",
    floatFrameId: "natural-brown-oak",
    subject: "artwork",
  },
  {
    id: "stretched-artwork-dsc9658",
    image: "_DSC9658.jpg",
    service: "canvas-stretching",
    floatFrameId: "natural-brown-oak",
    subject: "artwork",
  },
  {
    id: "stretched-aboriginal-1",
    image: "1-black-float-frame-1.jpg",
    service: "canvas-stretching",
    floatFrameId: "smooth-black",
    subject: "artwork",
    caption: "Aboriginal-style painting, black float frame",
    featured: true,
  },

  /* --------------------------------------------------------------------------
   * Black float frame — assumed canvas-printing for the remaining shots.
   * -------------------------------------------------------------------------- */
  {
    id: "black-float-2",
    image: "2-black-float-frame.jpg",
    service: "canvas-printing",
    floatFrameId: "smooth-black",
    subject: "photo-colour",
  },
  {
    id: "black-float-3",
    image: "3-black-float-frame.jpg",
    service: "canvas-printing",
    floatFrameId: "smooth-black",
    subject: "photo-colour",
    featured: true,
  },
  {
    id: "black-float-4",
    image: "4-black-float-frame.jpg",
    service: "canvas-printing",
    floatFrameId: "smooth-black",
    subject: "photo-colour",
  },
  {
    id: "black-float-5",
    image: "5-black-float-frame.jpg",
    service: "canvas-printing",
    floatFrameId: "smooth-black",
    subject: "photo-colour",
  },

  /* Dark brown oak float frame */
  {
    id: "dark-oak-float-1",
    image: "1-dark-brown-oak-float.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-dark-brown-oak",
    subject: "photo-colour",
    featured: true,
  },
  {
    id: "dark-oak-float-2",
    image: "2-dark-brown-oak-float.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-dark-brown-oak",
    subject: "photo-colour",
  },
  {
    id: "dark-oak-float-3",
    image: "3-dark-brown-oak-float.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-dark-brown-oak",
    subject: "photo-colour",
  },
  {
    id: "dark-oak-float-4",
    image: "4-dark-brown-oak-float.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-dark-brown-oak",
    subject: "photo-colour",
  },
  {
    id: "dark-oak-float-5",
    image: "5-dark-brown-oak-float.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-dark-brown-oak",
    subject: "photo-colour",
  },

  /* Natural wood / oak float frame */
  {
    id: "natural-wood-float-1",
    image: "1-natural-wood-float-1.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-brown-oak",
    subject: "photo-colour",
    featured: true,
  },
  {
    id: "natural-wood-float-2-polycotton",
    image: "2-natural-wood-float-polycotton-canvas-1.jpg",
    service: "canvas-printing",
    canvasId: "datajet-polycotton-canvas",
    floatFrameId: "natural-brown-oak",
    subject: "photo-colour",
    caption: "Polycotton canvas, light wood float frame",
  },
  {
    id: "natural-oak-float-2",
    image: "2-natural-oak-float-frame.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-brown-oak",
    subject: "photo-colour",
  },
  {
    id: "natural-wood-float-3",
    image: "3-natural-wood-float-1.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-brown-oak",
    subject: "photo-colour",
  },
  {
    id: "natural-wood-float-4",
    image: "4-natural-wood-float-1.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-brown-oak",
    subject: "photo-colour",
  },
  {
    id: "natural-wood-float-5",
    image: "5-natural-wood-float-1.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-brown-oak",
    subject: "photo-colour",
  },
  {
    id: "natural-wood-float-6",
    image: "6-natural-wood-float.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-brown-oak",
    subject: "photo-colour",
  },
  {
    id: "natural-wood-float-7",
    image: "7-natural-wood-float.jpg",
    service: "canvas-printing",
    floatFrameId: "natural-brown-oak",
    subject: "photo-colour",
  },

  /* Silver float frame — no exact match in catalog, mapped to champagne */
  {
    id: "silver-float-1",
    image: "1-silver-float-frame-1.jpg",
    service: "canvas-printing",
    floatFrameId: "champagne",
    subject: "photo-colour",
    featured: true,
  },
  {
    id: "silver-float-2",
    image: "2-silver-float-frame-1.jpg",
    service: "canvas-printing",
    floatFrameId: "champagne",
    subject: "photo-colour",
  },
  {
    id: "silver-float-3",
    image: "3-silver-float-frame-1.jpg",
    service: "canvas-printing",
    floatFrameId: "champagne",
    subject: "photo-colour",
  },

  /* White float frame */
  {
    id: "white-float-1",
    image: "1-white-float-frame.jpg",
    service: "canvas-printing",
    floatFrameId: "smooth-white",
    subject: "photo-colour",
    featured: true,
  },

  /* --------------------------------------------------------------------------
   * Canvas-substrate-tagged examples
   * -------------------------------------------------------------------------- */
  {
    id: "daguerre-1",
    image: "1-daguerre-canvas-1.jpg",
    service: "canvas-printing",
    canvasId: "hahnemuhle-daguerre-canvas",
    subject: "photo-bw",
    caption: "Vintage B&W photograph on Daguerre Canvas",
    featured: true,
  },
  {
    id: "artist-canvas-1",
    image: "1-hahnemuhle-artist-canvas-1.jpg",
    service: "canvas-printing",
    canvasId: "hahnemuhle-artist-canvas",
    subject: "illustration",
    caption: "Mixed-media portrait collage on Artist Canvas",
    featured: true,
  },
  {
    id: "polycotton-1",
    image: "1-polycotton-canvas-1.jpg",
    service: "canvas-printing",
    canvasId: "datajet-polycotton-canvas",
    subject: "artwork",
    caption: "Painted-style sailing scene on Polycotton Canvas",
    featured: true,
  },
  {
    id: "polycotton-2",
    image: "2-polycotton-canvas-3.jpg",
    service: "canvas-printing",
    canvasId: "datajet-polycotton-canvas",
    subject: "photo-colour",
    caption: "Pastel beach scene on Polycotton Canvas",
  },
  {
    id: "polycotton-3",
    image: "3-polycotton-canvas-3.jpg",
    service: "canvas-printing",
    canvasId: "datajet-polycotton-canvas",
    subject: "artwork",
    caption: "Hopper-style interior on Polycotton Canvas",
  },

  /* --------------------------------------------------------------------------
   * Generic numbered canvas examples (no substrate hint in filename).
   * Mostly look like original paintings (canvas-stretching), with the botanicals
   * looking more like printed reproductions (canvas-printing).
   * -------------------------------------------------------------------------- */
  {
    id: "canvas-stretched-1",
    image: "1-canvas-1.jpg",
    service: "canvas-stretching",
    subject: "artwork",
    caption: "Abstract dot/ring composition",
  },
  {
    id: "canvas-stretched-2",
    image: "2-canvas-1.jpg",
    service: "canvas-stretching",
    subject: "artwork",
    caption: "Tonal green-gold abstract",
  },
  {
    id: "canvas-stretched-3",
    image: "3-canvas-1.jpg",
    service: "canvas-stretching",
    subject: "artwork",
    caption: "Tonal red-black abstract",
  },
  {
    id: "canvas-stretched-4",
    image: "4-canvas-1.jpg",
    service: "canvas-stretching",
    subject: "artwork",
    caption: "Village scene painting",
    featured: true,
  },
  {
    id: "canvas-printed-tree",
    image: "5-canvas-1.jpg",
    service: "canvas-printing",
    subject: "illustration",
    caption: "Silvered tree silhouette",
  },
  {
    id: "canvas-stretched-6",
    image: "6-canvas.jpg",
    service: "canvas-stretching",
    subject: "artwork",
    caption: "Gold-leaf abstract landscape",
  },
  {
    id: "canvas-printed-bird-1",
    image: "7-canvas.jpg",
    service: "canvas-printing",
    subject: "illustration",
    caption: "Vintage botanical print, single bird",
  },
  {
    id: "canvas-printed-bird-2",
    image: "8-canvas.jpg",
    service: "canvas-printing",
    subject: "illustration",
    caption: "Vintage botanical print, paired birds",
    featured: true,
  },

  /* --------------------------------------------------------------------------
   * Multi-canvas custom framing — multiple panels presented inside a single
   * picture frame with mat / text-band layout.
   * -------------------------------------------------------------------------- */
  {
    id: "multi-canvas-1",
    image: "1-multi-canvas-frame.jpg",
    service: "custom-framing",
    subject: "artwork",
    caption: "Three small paintings, single oak frame",
    featured: true,
  },
  {
    id: "multi-canvas-5",
    image: "5-multi-canvas-frame.jpg",
    service: "custom-framing",
    subject: "illustration",
    caption: "Quadriptych watercolour with verse banding",
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
