/**
 * Pricing for the photo-restoration / art-scanning quoter on
 * /scanning-restoration and /art-scanning. Job kinds:
 *
 *   1. "restoration"  — old photo + condition-based repair work
 *   2. "art-scanning" — artwork digitisation for resale, optional colour matching
 *
 * Both share a scanning base (A3 flatbed, $50 first scan + $10 each
 * additional + $25 stitching when scans > 1). Restoration jobs add
 * a level-based per-item fee. Scanning jobs optionally add a flat
 * colour-matching fee.
 *
 * Customer enters width × height in cm. The engine works out how
 * many flatbed passes are needed by trying both orientations and
 * picking the cheaper tile count.
 */

export type RestorationLevel = "none" | "light" | "heavy" | "major";
export type JobKind = "restoration" | "art-scanning";

export const SCAN_FIRST_SGD = 50;
export const SCAN_ADDITIONAL_SGD = 10;
export const STITCHING_SGD = 25;
export const COLOUR_MATCHING_SGD = 150;

/** Physical flatbed dimensions in cm (Epson Expression 13000XL = A3). */
export const FLATBED_LONG_CM = 42;
export const FLATBED_SHORT_CM = 29.7;
/** Items barely over a scan-edge (e.g. 30 cm vs the 29.7 short edge)
 *  shouldn't get billed for an extra scan they don't really need. */
const TOLERANCE_CM = 0.5;
/** Hard cap. Above this we punt to a custom quote — at that scale
 *  the workflow shifts to camera capture rather than flatbed tiling. */
export const MAX_DIMENSION_CM = 120;

export const RESTORATION_PRICE_SGD: Record<RestorationLevel, number> = {
  none: 0,
  light: 80,
  heavy: 150,
  major: 300,
};

export const RESTORATION_LABELS: Record<RestorationLevel, string> = {
  none: "Scan only",
  light: "Light restoration",
  heavy: "Heavy restoration",
  major: "Major restoration",
};

export const RESTORATION_DESCRIPTIONS: Record<RestorationLevel, string> = {
  none: "Just digitise it. No fixes applied.",
  light: "Colour fade correction, minor scratches and dust.",
  heavy: "Tears, mould, missing edges, significant fading.",
  major:
    "Extensive damage with in-painting. Slow, painstaking work; expect a longer turnaround.",
};

export interface PhotoQuoteInput {
  kind: JobKind;
  widthCm: number;
  heightCm: number;
  quantity: number;
  /** Restoration level — only used when kind === "restoration". */
  restoration?: RestorationLevel;
  /** Colour matching — only used when kind === "art-scanning". */
  colourMatching?: boolean;
}

export interface PhotoQuoteLine {
  label: string;
  amount: number;
}

export type PhotoQuoteResult =
  | {
      ok: true;
      perItemLines: PhotoQuoteLine[];
      perItemTotal: number;
      quantity: number;
      grandTotal: number;
    }
  | { ok: false; reason: "oversize" | "invalid-dimensions" | "invalid-quantity" };

function scansForEdge(dim: number, edge: number): number {
  if (dim <= edge + TOLERANCE_CM) return 1;
  return Math.ceil((dim - TOLERANCE_CM) / edge);
}

/**
 * Smallest number of A3 flatbed passes that cover an item with the
 * given dimensions. Tries both orientations (item-long vs flatbed-
 * long, item-long vs flatbed-short) and picks whichever tiles into
 * fewer scans.
 */
export function scanCountForDimensions(
  widthCm: number,
  heightCm: number,
): number | null {
  if (
    !Number.isFinite(widthCm) ||
    !Number.isFinite(heightCm) ||
    widthCm <= 0 ||
    heightCm <= 0
  ) {
    return null;
  }
  if (widthCm > MAX_DIMENSION_CM || heightCm > MAX_DIMENSION_CM) {
    return null;
  }
  const long = Math.max(widthCm, heightCm);
  const short = Math.min(widthCm, heightCm);
  const a = scansForEdge(long, FLATBED_LONG_CM) * scansForEdge(short, FLATBED_SHORT_CM);
  const b = scansForEdge(long, FLATBED_SHORT_CM) * scansForEdge(short, FLATBED_LONG_CM);
  return Math.min(a, b);
}

export function quotePhotoService(input: PhotoQuoteInput): PhotoQuoteResult {
  if (
    !Number.isFinite(input.widthCm) ||
    !Number.isFinite(input.heightCm) ||
    input.widthCm <= 0 ||
    input.heightCm <= 0
  ) {
    return { ok: false, reason: "invalid-dimensions" };
  }
  const quantity = Math.floor(input.quantity || 0);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, reason: "invalid-quantity" };
  }
  const scans = scanCountForDimensions(input.widthCm, input.heightCm);
  if (scans === null) {
    return { ok: false, reason: "oversize" };
  }

  const lines: PhotoQuoteLine[] = [];

  // Internal mechanics: $50 first scan + $10 each additional + $25
  // stitching when more than one scan. Customer-facing single line.
  const rawScanCost = SCAN_FIRST_SGD + Math.max(0, scans - 1) * SCAN_ADDITIONAL_SGD;
  const stitchingCost = scans > 1 ? STITCHING_SGD : 0;
  const scanLineAmount = rawScanCost + stitchingCost;
  lines.push({ label: "Scanning", amount: scanLineAmount });

  if (input.kind === "restoration") {
    const level = input.restoration ?? "none";
    const restorationCost = RESTORATION_PRICE_SGD[level];
    if (restorationCost > 0) {
      lines.push({ label: RESTORATION_LABELS[level], amount: restorationCost });
    }
  } else {
    if (input.colourMatching) {
      lines.push({ label: "Colour matching", amount: COLOUR_MATCHING_SGD });
    }
  }

  const perItemTotal = lines.reduce((s, l) => s + l.amount, 0);
  const grandTotal = perItemTotal * quantity;

  return {
    ok: true,
    perItemLines: lines,
    perItemTotal,
    quantity,
    grandTotal,
  };
}
