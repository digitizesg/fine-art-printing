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

/* ----------------------------------------------------------------------------
 * Paper substrates — the canonical list lives in Supabase (src/lib/papers.ts).
 * The engine just needs the fields below; lib's Paper type structurally
 * satisfies this interface.
 * -------------------------------------------------------------------------- */

export interface PaperFamily {
  id: string;
  name: string;
  sellPricePerSqm: number;
  maxPrintWidthCm: number;
  maxPrintLengthCm: number;
}


/* ----------------------------------------------------------------------------
 * Pricing engine
 * -------------------------------------------------------------------------- */

export interface QuoteInput {
  /** Pre-resolved paper profile. Caller looks up the slug → object once. */
  paper: PaperFamily;
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
      reason: "invalid-dimensions" | "oversize";
      message: string;
      paper?: PaperFamily;
    };

const roundUpCents = (n: number) => Math.ceil(n * 100) / 100;

export function quotePaperPrint(input: QuoteInput): QuoteResult {
  const paper = input.paper;

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
