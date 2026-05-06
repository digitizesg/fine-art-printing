/**
 * Pricing for the photo-restoration / art-scanning quoter on
 * /scanning-restoration. Job kinds:
 *
 *   1. "restoration"  — old photo + condition-based repair work
 *   2. "art-scanning" — artwork digitisation for resale, optional colour matching
 *
 * Both share a scanning base (A3 flatbed, $50 first scan + $10 each
 * additional + $25 stitching when scans > 1). Restoration jobs add
 * a level-based per-item fee. Scanning jobs optionally add a flat
 * colour-matching fee.
 *
 * Prices in SGD whole dollars. Tune in one place if the brackets
 * shift; the component imports straight from here.
 */

export type SizeBucket = "a4" | "a3" | "a2" | "a1" | "larger";
export type RestorationLevel = "none" | "light" | "heavy" | "major";
export type JobKind = "restoration" | "art-scanning";

export const SCAN_FIRST_SGD = 50;
export const SCAN_ADDITIONAL_SGD = 10;
export const STITCHING_SGD = 25;
export const COLOUR_MATCHING_SGD = 150;

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

export const SIZE_BUCKETS: { id: SizeBucket; label: string; scans: number | null; note: string }[] = [
  { id: "a4", label: "A4 or smaller", scans: 1, note: "Postcard, family photo, small print" },
  { id: "a3", label: "A3", scans: 1, note: "Magazine, large family photo" },
  { id: "a2", label: "A2", scans: 2, note: "Two scans + stitching" },
  { id: "a1", label: "A1", scans: 4, note: "Four scans + stitching" },
  { id: "larger", label: "Larger than A1", scans: null, note: "Needs a custom quote" },
];

export interface PhotoQuoteInput {
  kind: JobKind;
  size: SizeBucket;
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
  | { ok: false; reason: "oversize" | "invalid-quantity" };

export function quotePhotoService(input: PhotoQuoteInput): PhotoQuoteResult {
  const bucket = SIZE_BUCKETS.find((b) => b.id === input.size);
  if (!bucket || bucket.scans === null) {
    return { ok: false, reason: "oversize" };
  }
  const quantity = Math.floor(input.quantity || 0);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, reason: "invalid-quantity" };
  }
  const scans = bucket.scans;

  const lines: PhotoQuoteLine[] = [];

  // Scan cost: $50 first + $10 each additional.
  const scanCost = SCAN_FIRST_SGD + Math.max(0, scans - 1) * SCAN_ADDITIONAL_SGD;
  lines.push({
    label: scans === 1 ? "Scan" : `Scanning (${scans} scans)`,
    amount: scanCost,
  });

  // Stitching when more than one scan.
  if (scans > 1) {
    lines.push({ label: "Photoshop stitching", amount: STITCHING_SGD });
  }

  // Restoration / colour-matching add-on, depending on job kind.
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
