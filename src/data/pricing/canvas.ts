/**
 * Canvas pricing — print + stretching + float frame.
 *
 * Print component reuses the V6 economics from paper.ts (ink $11.25/sqm,
 * studio labour $20, two-tier surcharge above 0.3 / 1.0 sqm, $30 min,
 * ceil to whole dollar).
 *
 * Stretching and float frames are computed from V10 of Ben's
 * "printing-stretching-float" spreadsheet. We use the structurally-
 * correct inner-bar formula (both cross-bracing runs multiplied by the
 * per-foot rate); V10 only multiplied one of the two terms by the rate.
 * The bar markup is set above V10's value so customer-facing prices
 * land a few % above the historic V10 prices despite the correct math.
 *
 * Wire/hooks (S$5) is automatically included when stretching or framing
 * is chosen. Customer doesn't see editing time, wastage coefficients,
 * or per-foot costs — only finishing radio + colour.
 */

import {
  PAPER_PRICING,
  formatSGD,
  formatSGDWhole,
  formatSGDCeil,
} from "./paper";

// Reuse paper pricing constants — same V6 print economics for canvas.
export const CANVAS_PRINT_PRICING = PAPER_PRICING;

export { formatSGD, formatSGDWhole, formatSGDCeil };

const CM_TO_INCH = 0.393701;
const INCH_PER_FOOT = 12;

/* ----------------------------------------------------------------------------
 * Canvas substrates
 * Sell prices use the 44" roll rate for each (or 60" where 44" doesn't exist).
 * Same simplification as paper: customer sees one rate per canvas.
 * -------------------------------------------------------------------------- */

export type CanvasFinish =
  | "matt"
  | "smooth-matt"
  | "high-gloss";

export interface CanvasSubstrate {
  id: string;
  brand: string;
  name: string;
  shortName: string;
  gsm: number;
  finish: CanvasFinish;
  /** Texture descriptor for the comparison table. */
  texture: string;
  /** Tone descriptor, e.g. "Bright white". */
  tone: string;
  /** One-liner for the picker card. */
  blurb: string;
  /** Two-line description for the showcase / picker card body. */
  description: string;
  /** Multi-paragraph marketing copy for the showcase panel. */
  longDescription: string;
  featured: boolean;
  /** Customer-facing sell price per SQM, pre-GST, SGD. */
  sellPricePerSqm: number;
  maxPrintWidthCm: number;
  maxPrintLengthCm: number;
  /** Filenames in /public/photos/canvases/ — empty until Ben supplies. */
  images: string[];
}

export const CANVASES: CanvasSubstrate[] = [
  {
    id: "hahnemuhle-daguerre-canvas",
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
    id: "hahnemuhle-artist-canvas",
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
    id: "hahnemuhle-metallic-canvas",
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
    id: "hahnemuhle-photo-canvas",
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
  // NOTE: Hahnemühle Art Canvas Smooth was in V10 spreadsheet but is not
  // currently stocked. Re-add here with featured: true if/when it returns.
  {
    id: "datajet-polycotton-canvas",
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

/* ----------------------------------------------------------------------------
 * Stretching options
 * -------------------------------------------------------------------------- */

export interface StretchingOption {
  id: "1in" | "1.5in";
  label: string;
  shortLabel: string;
  /** Extra dimension added to width AND height for stretcher wrap, in cm. */
  addCm: number;
  barCostPerFoot: number;
  innerBarCostPerFoot: number;
}

export const STRETCHING_OPTIONS: readonly StretchingOption[] = [
  {
    id: "1in",
    label: 'Standard 1" stretching',
    shortLabel: 'Standard 1"',
    addCm: 7.6,
    barCostPerFoot: 0.335,
    innerBarCostPerFoot: 0.353,
  },
  {
    id: "1.5in",
    label: 'Deep 1.5" stretching',
    shortLabel: 'Deep 1.5"',
    addCm: 10.0,
    barCostPerFoot: 0.45,
    innerBarCostPerFoot: 0.353,
  },
] as const;

export const STRETCHING_WASTAGE = 1.15;
// Bumped from 5 → 8 (2026-05-04). Our inner-bar formula is structurally
// correct (both cross-bracing terms multiplied by the per-foot rate);
// V10 only multiplied one term, which inflated material costs and held
// historic prices a bit higher. Lifting the markup lands us a few %
// above V10 across the size range with the correct math.
export const STRETCHING_BAR_MARKUP = 8;
export const LABOUR_MARKUP = 2;

/* ----------------------------------------------------------------------------
 * Float frame options — all 7 colours cost the same.
 * -------------------------------------------------------------------------- */

export interface FloatFrameColour {
  id: string;
  label: string;
  /** Wholesale moulding cost in SGD per foot. Drives the per-frame material line. */
  costPerFoot: number;
  /** Filename in /public/photos/float-frames/ for the picker thumbnail. Optional for new profiles where we don't have a photo yet. */
  image?: string;
}

export const FLOAT_FRAME_COLOURS: readonly FloatFrameColour[] = [
  { id: "smooth-white", label: "Smooth White", costPerFoot: 0.77, image: "3740-W-Smooth-White.jpg" },
  { id: "smooth-black", label: "Smooth Black", costPerFoot: 0.77, image: "3740-B-Smooth-Black.jpg" },
  { id: "champagne", label: "Champagne", costPerFoot: 0.77, image: "3740-S-Champagne.jpg" },
  { id: "glossy-light-brown-pine", label: "Glossy Light Brown Pine", costPerFoot: 0.77, image: "S3536-Glossy-Light-Brown-Pine.jpg" },
  { id: "natural-brown-oak", label: "Natural Brown Oak", costPerFoot: 0.77, image: "3535-19-Natural-Brown-Oak.jpg" },
  { id: "natural-dark-brown-oak", label: "Natural Dark Brown Oak", costPerFoot: 0.77, image: "3535-15-Natural-Dark-Brown-Oak.jpg" },
  { id: "natural-black-oak", label: "Natural Black Oak", costPerFoot: 0.77, image: "3535-11-Natural-Black-Oak.jpg" },
  // $3.10/m wholesale = $0.945/ft. No swatch photo yet — picker shows a placeholder.
  { id: "gold", label: "Gold", costPerFoot: 0.945 },
] as const;

export const FLOAT_FRAME_ADD_CM = 1.2;
export const FLOAT_FRAME_WASTAGE = 1.2;
export const FLOAT_FRAME_MARKUP = 10;

/* ----------------------------------------------------------------------------
 * Wire/hooks + delivery
 * -------------------------------------------------------------------------- */

export const WIRE_HOOKS_SELL = 5;
export const DELIVERY_LOCAL_SELL = 30;

/* ----------------------------------------------------------------------------
 * Labour brackets — same table for stretching and float frame fitting,
 * indexed by perimeter in feet.
 * -------------------------------------------------------------------------- */

const LABOUR_BRACKETS: { upToFeet: number; charge: number }[] = [
  { upToFeet: 5, charge: 14 },
  { upToFeet: 6, charge: 17 },
  { upToFeet: 7, charge: 20 },
  { upToFeet: 8, charge: 24 },
  { upToFeet: 10, charge: 29 },
  { upToFeet: 12, charge: 35 },
  { upToFeet: 14, charge: 42 },
  { upToFeet: 16, charge: 50 },
  { upToFeet: 18, charge: 60 },
  { upToFeet: 20, charge: 72 },
  { upToFeet: 22, charge: 87 },
  { upToFeet: 24, charge: 104 },
  { upToFeet: 26, charge: 125 },
  { upToFeet: 28, charge: 150 },
  { upToFeet: 30, charge: 180 },
  { upToFeet: 32, charge: 216 },
  { upToFeet: 36, charge: 259 },
  { upToFeet: 40, charge: 310 },
  { upToFeet: 45, charge: 373 },
];

function lookupLabour(perimeterFt: number): number {
  for (const b of LABOUR_BRACKETS) {
    if (perimeterFt <= b.upToFeet) return b.charge;
  }
  return LABOUR_BRACKETS[LABOUR_BRACKETS.length - 1]!.charge;
}

/* ----------------------------------------------------------------------------
 * Quote engine
 * -------------------------------------------------------------------------- */

export type StretchingChoice = "none" | "1in" | "1.5in";
export type DeliveryChoice = "self" | "local";

export interface CanvasQuoteInput {
  canvasId: string;
  /** Image dimensions in cm (width and height of the visible image area). */
  widthCm: number;
  heightCm: number;
  /** "none" = unstretched roll. Mutually exclusive with float frame. */
  stretching: StretchingChoice;
  /** If a colour id is supplied, the canvas is float-framed (overrides stretching). */
  floatFrameColourId: string | null;
  delivery: DeliveryChoice;
}

export interface CanvasQuoteLine {
  label: string;
  amount: number;
}

export type CanvasQuoteResult =
  | {
      ok: true;
      canvas: CanvasSubstrate;
      effectiveWidthCm: number;
      effectiveHeightCm: number;
      effectiveSqm: number;
      perimeterFeet: number;
      /**
       * Float-frame choice always includes 1" stretching as a prerequisite —
       * the canvas is stretched first, then mounted into the wooden float frame.
       */
      finishingChoice:
        | { kind: "none" }
        | { kind: "stretching"; option: StretchingOption }
        | {
            kind: "float-frame";
            colour: FloatFrameColour;
            stretchingOption: StretchingOption;
          };
      lines: CanvasQuoteLine[];
      subtotal: number;
      minTopUp: number;
      grandTotal: number;
    }
  | {
      ok: false;
      reason: "unknown-canvas" | "invalid-dimensions" | "oversize" | "invalid-frame-colour";
      message: string;
      canvas?: CanvasSubstrate;
    };

const roundUpCents = (n: number) => Math.ceil(n * 100) / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function quoteCanvasPrint(input: CanvasQuoteInput): CanvasQuoteResult {
  const canvas = CANVASES.find((c) => c.id === input.canvasId);
  if (!canvas) {
    return {
      ok: false,
      reason: "unknown-canvas",
      message: `Canvas not found: ${input.canvasId}`,
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
      canvas,
    };
  }

  // Resolve finishing choice. Float frame is mounted ON TOP of 1" stretching,
  // so picking a float-frame colour implicitly requires 1" stretching as well.
  let finishingChoice: NonNullable<
    Extract<CanvasQuoteResult, { ok: true }>["finishingChoice"]
  > = { kind: "none" };
  let stretchingForCalc: StretchingOption | null = null;
  let frameForCalc: FloatFrameColour | null = null;
  let addCm = 0;

  if (input.floatFrameColourId) {
    const colour = FLOAT_FRAME_COLOURS.find(
      (c) => c.id === input.floatFrameColourId,
    );
    if (!colour) {
      return {
        ok: false,
        reason: "invalid-frame-colour",
        message: `Float frame colour not recognised: ${input.floatFrameColourId}`,
        canvas,
      };
    }
    // Float frame is built on top of 1" stretching.
    const oneInch = STRETCHING_OPTIONS.find((o) => o.id === "1in")!;
    stretchingForCalc = oneInch;
    frameForCalc = colour;
    addCm = oneInch.addCm; // canvas wrap follows the stretcher bars
    finishingChoice = {
      kind: "float-frame",
      colour,
      stretchingOption: oneInch,
    };
  } else if (input.stretching === "1in" || input.stretching === "1.5in") {
    const option = STRETCHING_OPTIONS.find((o) => o.id === input.stretching)!;
    stretchingForCalc = option;
    addCm = option.addCm;
    finishingChoice = { kind: "stretching", option };
  }

  // Effective dimensions for printing — include the wrap allowance.
  const effW = input.widthCm + addCm;
  const effH = input.heightCm + addCm;

  // Oversize check on effective dimensions vs the canvas roll.
  const minSide = Math.min(effW, effH);
  const maxSide = Math.max(effW, effH);
  if (minSide > canvas.maxPrintWidthCm || maxSide > canvas.maxPrintLengthCm) {
    return {
      ok: false,
      reason: "oversize",
      message: `${canvas.name} can print up to ${canvas.maxPrintWidthCm.toFixed(0)}cm wide. With the chosen finishing this size doesn't fit. Try a smaller image, drop the stretching, or pick a different canvas.`,
      canvas,
    };
  }

  const sqm = (effW * effH) / 10000;

  // Print component — V6 economics, same as paper.
  const canvasLine = roundUpCents(canvas.sellPricePerSqm * sqm);
  const inkLine = roundUpCents(CANVAS_PRINT_PRICING.inkSellPerSqm * sqm);
  const studioLine = CANVAS_PRINT_PRICING.baseLaborSellPerJob;
  const tier1Area = Math.min(
    Math.max(0, sqm - CANVAS_PRINT_PRICING.surchargeT1TriggerSqm),
    CANVAS_PRINT_PRICING.surchargeT2TriggerSqm -
      CANVAS_PRINT_PRICING.surchargeT1TriggerSqm,
  );
  const tier2Area = Math.max(
    0,
    sqm - CANVAS_PRINT_PRICING.surchargeT2TriggerSqm,
  );
  const tier1Line = round2(
    CANVAS_PRINT_PRICING.surchargeT1SellPerSqm * tier1Area,
  );
  const tier2Line = round2(
    CANVAS_PRINT_PRICING.surchargeT2SellPerSqm * tier2Area,
  );

  const lines: CanvasQuoteLine[] = [
    { label: "Canvas", amount: canvasLine },
    { label: "Ink", amount: inkLine },
    { label: "Studio labour", amount: studioLine },
  ];
  if (tier1Line > 0) lines.push({ label: "Large-print handling", amount: tier1Line });
  if (tier2Line > 0) lines.push({ label: "Oversize handling", amount: tier2Line });

  // Stretching / Float frame component.
  // Perimeter and inner-bar runs use the IMAGE (frame) dimensions, not the
  // effective canvas dimensions. The wrap allowance hangs over the back of
  // the bars and isn't part of the frame itself. Matches V10 behavior.
  const perimeterInches = (input.widthCm + input.heightCm) * 2 * CM_TO_INCH;
  const perimeterFt = perimeterInches / INCH_PER_FOOT;

  // Stretching cost — applies to plain stretching AND to float frame
  // (since the canvas must be stretched onto bars before the frame is mounted).
  if (stretchingForCalc) {
    const opt = stretchingForCalc;
    const heightInch = input.heightCm * CM_TO_INCH;
    const widthInch = input.widthCm * CM_TO_INCH;
    // Inner-bar feet = both cross-bracing runs (horizontal + vertical),
    // each multiplied by the per-foot rate. V10's spreadsheet only
    // multiplies one term by the rate and adds the other raw — a long-
    // standing quirk that inflated material cost. We use the structurally
    // correct version here; STRETCHING_BAR_MARKUP is bumped above V10's
    // value to keep prices a few % above V10 with the correct math.
    const innerBarRuns =
      (heightInch / 25) * (widthInch / 12) + (widthInch / 25) * (heightInch / 12);
    const materialCost =
      perimeterFt * opt.barCostPerFoot +
      innerBarRuns * opt.innerBarCostPerFoot;
    const labour = lookupLabour(perimeterFt);

    const stretchingSell = round2(
      round2(materialCost) *
        STRETCHING_WASTAGE *
        STRETCHING_BAR_MARKUP +
        round2(labour) * STRETCHING_WASTAGE * LABOUR_MARKUP,
    );
    lines.push({
      label: `Stretching (${opt.shortLabel})`,
      amount: stretchingSell,
    });
  }

  // Float frame cost — added ON TOP of the stretching above.
  if (frameForCalc) {
    const materialCost = perimeterFt * frameForCalc.costPerFoot;
    const labour = lookupLabour(perimeterFt);

    const frameSell = round2(
      round2(materialCost) * FLOAT_FRAME_WASTAGE * FLOAT_FRAME_MARKUP +
        round2(labour) * FLOAT_FRAME_WASTAGE * LABOUR_MARKUP,
    );
    lines.push({
      label: `Float frame (${frameForCalc.label})`,
      amount: frameSell,
    });
  }

  // Wire & hooks included whenever there's any finishing.
  if (stretchingForCalc || frameForCalc) {
    lines.push({ label: "Wire & hooks", amount: WIRE_HOOKS_SELL });
  }

  // Delivery
  if (input.delivery === "local") {
    lines.push({ label: "Local delivery", amount: DELIVERY_LOCAL_SELL });
  }

  // Sum + apply min + ceil to whole dollar
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const minTopUp = Math.max(
    0,
    round2(CANVAS_PRINT_PRICING.minJobSell - subtotal),
  );
  const grandTotal = Math.ceil(subtotal + minTopUp);

  return {
    ok: true,
    canvas,
    effectiveWidthCm: effW,
    effectiveHeightCm: effH,
    effectiveSqm: sqm,
    perimeterFeet: perimeterFt,
    finishingChoice,
    lines,
    subtotal,
    minTopUp,
    grandTotal,
  };
}

/* ----------------------------------------------------------------------------
 * Canvas stretching (no print) — for customers who bring their own canvas.
 *
 * Same stretching/float-frame math as canvas-printing, just without the
 * paper/ink/print-labour lines. Customer enters the FINISHED frame size
 * (the visible front), and we tell them how big a canvas they need to bring.
 * -------------------------------------------------------------------------- */

export interface CanvasStretchingInput {
  /** Finished frame width in cm — what they want it to look like on the wall. */
  frameWidthCm: number;
  frameHeightCm: number;
  /** "1in" or "1.5in"; "none" isn't allowed (the whole job IS stretching). */
  depth: "1in" | "1.5in";
  /** If a colour id is supplied, mount inside a float frame of that colour. */
  floatFrameColourId: string | null;
  delivery: DeliveryChoice;
}

export type CanvasStretchingResult =
  | {
      ok: true;
      finishedWidthCm: number;
      finishedHeightCm: number;
      /** What the customer needs to bring (canvas dimensions including wrap). */
      requiredCanvasWidthCm: number;
      requiredCanvasHeightCm: number;
      perimeterFeet: number;
      finishingChoice:
        | { kind: "stretching"; option: StretchingOption }
        | {
            kind: "float-frame";
            colour: FloatFrameColour;
            stretchingOption: StretchingOption;
          };
      lines: CanvasQuoteLine[];
      subtotal: number;
      minTopUp: number;
      grandTotal: number;
    }
  | {
      ok: false;
      reason: "invalid-dimensions" | "invalid-frame-colour";
      message: string;
    };

export function quoteCanvasStretching(
  input: CanvasStretchingInput,
): CanvasStretchingResult {
  if (
    !Number.isFinite(input.frameWidthCm) ||
    !Number.isFinite(input.frameHeightCm) ||
    input.frameWidthCm <= 0 ||
    input.frameHeightCm <= 0
  ) {
    return {
      ok: false,
      reason: "invalid-dimensions",
      message: "Please enter a positive width and height.",
    };
  }

  const stretchingOpt = STRETCHING_OPTIONS.find((o) => o.id === input.depth)!;
  let frameColour: FloatFrameColour | null = null;

  if (input.floatFrameColourId) {
    const colour = FLOAT_FRAME_COLOURS.find(
      (c) => c.id === input.floatFrameColourId,
    );
    if (!colour) {
      return {
        ok: false,
        reason: "invalid-frame-colour",
        message: `Float frame colour not recognised: ${input.floatFrameColourId}`,
      };
    }
    frameColour = colour;
  }

  // Bars surround the visible front (frame), not the canvas itself.
  const heightInch = input.frameHeightCm * CM_TO_INCH;
  const widthInch = input.frameWidthCm * CM_TO_INCH;
  const perimeterInches =
    (input.frameWidthCm + input.frameHeightCm) * 2 * CM_TO_INCH;
  const perimeterFt = perimeterInches / INCH_PER_FOOT;

  const lines: CanvasQuoteLine[] = [];

  const innerBarRuns =
    (heightInch / 25) * (widthInch / 12) +
    (widthInch / 25) * (heightInch / 12);
  const stretchingMaterialCost =
    perimeterFt * stretchingOpt.barCostPerFoot +
    innerBarRuns * stretchingOpt.innerBarCostPerFoot;
  const stretchingLabour = lookupLabour(perimeterFt);
  const stretchingSell = round2(
    round2(stretchingMaterialCost) *
      STRETCHING_WASTAGE *
      STRETCHING_BAR_MARKUP +
      round2(stretchingLabour) * STRETCHING_WASTAGE * LABOUR_MARKUP,
  );
  lines.push({
    label: `Stretching (${stretchingOpt.shortLabel})`,
    amount: stretchingSell,
  });

  if (frameColour) {
    const frameMaterialCost = perimeterFt * frameColour.costPerFoot;
    const frameLabour = lookupLabour(perimeterFt);
    const frameSell = round2(
      round2(frameMaterialCost) * FLOAT_FRAME_WASTAGE * FLOAT_FRAME_MARKUP +
        round2(frameLabour) * FLOAT_FRAME_WASTAGE * LABOUR_MARKUP,
    );
    lines.push({
      label: `Float frame (${frameColour.label})`,
      amount: frameSell,
    });
  }

  lines.push({ label: "Wire & hooks", amount: WIRE_HOOKS_SELL });

  if (input.delivery === "local") {
    lines.push({ label: "Local delivery", amount: DELIVERY_LOCAL_SELL });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const minTopUp = Math.max(
    0,
    round2(CANVAS_PRINT_PRICING.minJobSell - subtotal),
  );
  const grandTotal = Math.ceil(subtotal + minTopUp);

  return {
    ok: true,
    finishedWidthCm: input.frameWidthCm,
    finishedHeightCm: input.frameHeightCm,
    requiredCanvasWidthCm: input.frameWidthCm + stretchingOpt.addCm,
    requiredCanvasHeightCm: input.frameHeightCm + stretchingOpt.addCm,
    perimeterFeet: perimeterFt,
    finishingChoice: frameColour
      ? {
          kind: "float-frame",
          colour: frameColour,
          stretchingOption: stretchingOpt,
        }
      : { kind: "stretching", option: stretchingOpt },
    lines,
    subtotal,
    minTopUp,
    grandTotal,
  };
}
