/**
 * Paper pricing data + quote function for /print-on-paper.
 *
 * Sourced from Ben's "Printing Price Formula V5.xlsx", customer-facing list
 * matched to current fineartprinting.com.sg/fine-art-printing/.
 *
 * Formula (per print, pre-GST, SGD), based on Ben's V6 economics:
 *   per-print =
 *       paperSell$/sqm × sqm
 *     + 11.25 × sqm                                   (ink)
 *     + 20.00                                         (studio labour, includes 5 min standard editing)
 *     + 28.00 × min(max(0, sqm - 0.3), 0.7)           (size surcharge tier 1, area 0.3-1.0 sqm)
 *     + 40.00 × max(0, sqm - 1.0)                     (size surcharge tier 2, area above 1.0 sqm)
 *
 *   subtotal  = per-print × quantity
 *   floored   = max(subtotal, 30.00)                  (minimum job charge)
 *   total     = ceil(floored)                         (round up to whole dollar)
 *
 * Editing time isn't shown to customers; V6's $15 base labour + 5 min × $1/min
 * editing = $20 is collapsed into one "Studio labour" line. Heavier retouching
 * is quoted separately offline.
 *
 * Simplification vs V5: each paper has ONE customer-facing rate per SQM
 * regardless of which internal roll the print is cut from. By default we use
 * the 44" roll rate (the most common production roll). For most papers the
 * roll-to-roll spread is ~2%; Silk Baryta is the exception (V5 60" roll uses
 * markup 3.0 so its rate is 32% higher than the 44" rate). Override the
 * `sellPricePerSqm` per paper if a different rate is desired.
 */

export const PAPER_PRICING = {
  inkSellPerSqm: 11.25,
  /** $15 base + 5 min × $1/min standard editing folded in. */
  baseLaborSellPerJob: 20.0,
  surchargeT1SellPerSqm: 28.0,
  surchargeT1TriggerSqm: 0.3,
  surchargeT2SellPerSqm: 40.0,
  surchargeT2TriggerSqm: 1.0,
  /** Floor on the grand total (after quantity), per-job, applied last. */
  minJobSell: 30.0,
} as const;

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

export interface PaperFamily {
  id: string;
  /** Manufacturer, e.g. "Hahnemühle" or "Datajet". Shown as a small overline above the paper name. */
  brand: string;
  /** Full official name including brand. Used in WhatsApp / contact messages. */
  name: string;
  /** Paper name without the brand prefix. Shown as the picker-card title. */
  shortName: string;
  gsm: number;
  finish: PaperFinish;
  /** Paper-tone label as Hahnemühle markets it, e.g. "Natural White", "Warm White". */
  tone: string;
  /** Surface texture description, e.g. "Smooth", "Light texture". */
  texture: string;
  /** How fragile the surface is, for handling/mounting suitability. */
  durability: PaperDurability;
  /** One-liner shown next to the radio in the picker. */
  blurb: string;
  /** Longer marketing copy used in the picker (was the only copy field). */
  description: string;
  /** Multi-paragraph marketing copy for the paper-showcase section. */
  longDescription: string;
  /** True for the papers featured on /print-on-paper. */
  featured: boolean;
  /** Use cases this paper is well-suited for. Drives the filter chips on /print-on-paper. */
  bestFor: PaperUseCase[];
  /** Customer-facing sell price per SQM, pre-GST, SGD. */
  sellPricePerSqm: number;
  /** Maximum short-side dimension we can print, in cm (= widest available roll). */
  maxPrintWidthCm: number;
  /** Maximum long-side dimension we can print, in cm (= longest available roll). */
  maxPrintLengthCm: number;
  /**
   * Image filenames in /public/photos/. First entry is the picker swatch and
   * page hero; rest are gallery shots. Empty array if no images yet.
   */
  images: string[];
}

/* ----------------------------------------------------------------------------
 * Featured papers (matches fineartprinting.com.sg/fine-art-printing/).
 *
 * NOTE: "Hahnemühle Hemp" is featured on the current public site but has no
 * pricing in V5. Excluded here pending a row in V6 or removal from the public
 * featured list.
 * -------------------------------------------------------------------------- */

export const PAPERS: PaperFamily[] = [
  {
    id: "hahnemuhle-photo-rag",
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
    id: "hahnemuhle-photo-rag-matt-baryta",
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
    id: "hahnemuhle-bamboo",
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
    images: [
      "bamboo-1.jpg",
      "bamboo-2.jpg",
      "bamboo-3.jpg",
      "bamboo-4.jpg",
    ],
  },
  {
    id: "hahnemuhle-bamboo-gloss",
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
    id: "hahnemuhle-hemp",
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
    // TODO: confirm Hemp pricing with Ben. Using Bamboo's S$125.94/sqm as a
    // placeholder since the papers are closest cousins (both 290gsm matt
    // sustainable-fibre Hahnemühle FineArt). V6 spreadsheet has no Hemp row.
    sellPricePerSqm: 125.94,
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
    id: "hahnemuhle-fineart-pearl",
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
    id: "hahnemuhle-metallic-rag",
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
    id: "hahnemuhle-german-etching",
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
    id: "hahnemuhle-photo-silk-baryta",
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
    // V5 60" roll for Silk Baryta uses markup 3 ($89.94/sqm) vs markup 2 on
    // 24"/44" ($79.07 / $68.28). Using 44" rate as the headline; wide prints
    // (>112cm) will be charged at the 44" rate. Adjust if Ben wants margin
    // protection on wide jobs.
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
    id: "datajet-100-cotton-rag",
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

/* ----------------------------------------------------------------------------
 * Pricing engine
 * -------------------------------------------------------------------------- */

export interface QuoteInput {
  paperId: string;
  /** Print width in cm. */
  widthCm: number;
  /** Print height in cm. */
  heightCm: number;
  /** Number of identical prints. */
  quantity: number;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

export type QuoteResult =
  | {
      ok: true;
      sqm: number;
      areaCm2: number;
      paper: PaperFamily;
      perPrintLines: QuoteLine[];
      perPrintTotal: number;
      quantity: number;
      /** perPrintTotal × quantity, before the minimum-job floor. */
      subtotal: number;
      /** Amount added to bring subtotal up to PAPER_PRICING.minJobSell, or 0. */
      minTopUp: number;
      grandTotal: number;
    }
  | {
      ok: false;
      reason: "unknown-paper" | "invalid-dimensions" | "oversize";
      message: string;
      paper?: PaperFamily;
    };

const roundUpCents = (n: number) => Math.ceil(n * 100) / 100;

export function quotePaperPrint(input: QuoteInput): QuoteResult {
  const paper = PAPERS.find((p) => p.id === input.paperId);
  if (!paper) {
    return {
      ok: false,
      reason: "unknown-paper",
      message: `Paper not found: ${input.paperId}`,
    };
  }

  if (
    !Number.isFinite(input.widthCm) ||
    !Number.isFinite(input.heightCm) ||
    input.widthCm <= 0 ||
    input.heightCm <= 0
  ) {
    return {
      ok: false,
      reason: "invalid-dimensions",
      message: "Please enter a positive width and height.",
      paper,
    };
  }

  const minSide = Math.min(input.widthCm, input.heightCm);
  const maxSide = Math.max(input.widthCm, input.heightCm);
  if (
    minSide > paper.maxPrintWidthCm ||
    maxSide > paper.maxPrintLengthCm
  ) {
    return {
      ok: false,
      reason: "oversize",
      message: `${paper.name} is available up to ${paper.maxPrintWidthCm.toFixed(0)}cm wide. Try a smaller size, or pick a paper available in a wider format.`,
      paper,
    };
  }

  const sqm = (input.widthCm * input.heightCm) / 10000;
  const quantity = Math.max(1, Math.floor(input.quantity || 1));

  const paperLine = roundUpCents(paper.sellPricePerSqm * sqm);
  const inkLine = roundUpCents(PAPER_PRICING.inkSellPerSqm * sqm);
  const baseLaborLine = PAPER_PRICING.baseLaborSellPerJob;

  // Two-tier size surcharge.
  const tier1Area = Math.min(
    Math.max(0, sqm - PAPER_PRICING.surchargeT1TriggerSqm),
    PAPER_PRICING.surchargeT2TriggerSqm - PAPER_PRICING.surchargeT1TriggerSqm,
  );
  const tier2Area = Math.max(0, sqm - PAPER_PRICING.surchargeT2TriggerSqm);
  const tier1Line =
    Math.round(PAPER_PRICING.surchargeT1SellPerSqm * tier1Area * 100) / 100;
  const tier2Line =
    Math.round(PAPER_PRICING.surchargeT2SellPerSqm * tier2Area * 100) / 100;

  const perPrintLines: QuoteLine[] = [
    { label: "Paper", amount: paperLine },
    { label: "Ink", amount: inkLine },
    { label: "Studio labour", amount: baseLaborLine },
  ];
  if (tier1Line > 0) {
    perPrintLines.push({ label: "Large-print handling", amount: tier1Line });
  }
  if (tier2Line > 0) {
    perPrintLines.push({ label: "Oversize handling", amount: tier2Line });
  }

  const perPrintTotal =
    Math.round(perPrintLines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const subtotal = Math.round(perPrintTotal * quantity * 100) / 100;
  const minTopUp = Math.max(
    0,
    Math.round((PAPER_PRICING.minJobSell - subtotal) * 100) / 100,
  );
  // House rule: round the grand total UP to the nearest dollar.
  const grandTotal = Math.ceil(subtotal + minTopUp);

  return {
    ok: true,
    sqm,
    areaCm2: input.widthCm * input.heightCm,
    paper,
    perPrintLines,
    perPrintTotal,
    quantity,
    subtotal,
    minTopUp,
    grandTotal,
  };
}

/** Convenience for SGD display. No GST applied per Ben's preference. */
export function formatSGD(amount: number): string {
  return `S$${amount.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Whole-dollar SGD display, used for the customer-facing grand total. */
export function formatSGDWhole(amount: number): string {
  return `S$${Math.round(amount).toLocaleString("en-SG")}`;
}

/** Whole-dollar SGD display, rounded UP. House rule for breakdown lines. */
export function formatSGDCeil(amount: number): string {
  return `S$${Math.ceil(amount).toLocaleString("en-SG")}`;
}
