/**
 * Shop line pricing: the one place that turns a shop cart line
 * (artwork on paper or canvas, with its options) into a unit price.
 *
 * Used by the product page configurator (/shop/[slug], client side)
 * and by /api/checkout (server side, which re-prices every line so the
 * client's number is never trusted). Keep it pure: no DOM, no Supabase.
 *
 * Rules layered on top of the paper / canvas engines:
 * - Paper white border adds border x 2 to each printed dimension.
 * - Canvas finishing maps to stretching: "1in" / "1.5in" as named,
 *   "float" is priced as 1" stretching plus the chosen float frame.
 * - Rolled canvas with future-stretching margin adds 1.5" (3.81 cm)
 *   on every side to the printed dimensions.
 * - Every shop print carries the flat SHOP_ARTWORK_BASE_SGD fee.
 */
import { quotePaperPrint, type PaperFamily } from "../data/pricing/paper";
import {
  quoteCanvasPrint,
  type CanvasSubstrate,
  type FloatFrameColour,
  type StretchingChoice,
} from "../data/pricing/canvas";
import { SHOP_ARTWORK_BASE_SGD } from "../data/pricing/shop";

export type ShopFinishing = "none" | "1in" | "1.5in" | "float";

/** 1.5" in cm: the extra canvas kept on each side for future stretching. */
export const FUTURE_STRETCH_MARGIN_CM = 3.81;

export interface ShopLineInput {
  substrate: "paper" | "canvas";
  /** Visible image size in cm. */
  widthCm: number;
  heightCm: number;
  paperSlug?: string;
  borderCm?: number;
  canvasSlug?: string;
  finishing?: ShopFinishing;
  floatFrameSlug?: string | null;
  futureMargin?: boolean;
}

/** Engine-shaped catalog entries, keyed by slug in `id`. */
export interface ShopCatalog {
  papers: PaperFamily[];
  canvases: CanvasSubstrate[];
  floatFrames: FloatFrameColour[];
}

export type ShopLinePrice =
  | {
      ok: true;
      substrate: "paper";
      unitPriceSGD: number;
      paper: PaperFamily;
      borderCm: number;
      /** Size actually printed (image + border). */
      printWidthCm: number;
      printHeightCm: number;
    }
  | {
      ok: true;
      substrate: "canvas";
      unitPriceSGD: number;
      canvas: CanvasSubstrate;
      finishing: ShopFinishing;
      futureMargin: boolean;
      floatFrame: FloatFrameColour | null;
      marginCm: number;
      /** Size actually printed (image + any future-stretching margin). */
      printWidthCm: number;
      printHeightCm: number;
    }
  | {
      ok: false;
      reason:
        | "paper-not-found"
        | "canvas-not-found"
        | "float-frame-not-found"
        | "unknown-substrate"
        | "quote";
      message: string;
    };

export function priceShopLine(
  line: ShopLineInput,
  catalog: ShopCatalog,
): ShopLinePrice {
  if (line.substrate === "paper") {
    const paper = catalog.papers.find((p) => p.id === line.paperSlug);
    if (!paper) {
      return { ok: false, reason: "paper-not-found", message: `Paper not found: ${line.paperSlug}` };
    }
    const borderCm = Math.max(0, Number(line.borderCm) || 0);
    const printWidthCm = line.widthCm + borderCm * 2;
    const printHeightCm = line.heightCm + borderCm * 2;
    const result = quotePaperPrint({
      paper,
      widthCm: printWidthCm,
      heightCm: printHeightCm,
      quantity: 1,
    });
    if (!result.ok) return { ok: false, reason: "quote", message: result.message };
    return {
      ok: true,
      substrate: "paper",
      unitPriceSGD: result.grandTotal + SHOP_ARTWORK_BASE_SGD,
      paper,
      borderCm,
      printWidthCm,
      printHeightCm,
    };
  }

  if (line.substrate === "canvas") {
    const canvas = catalog.canvases.find((c) => c.id === line.canvasSlug);
    if (!canvas) {
      return { ok: false, reason: "canvas-not-found", message: `Canvas not found: ${line.canvasSlug}` };
    }
    const finishing: ShopFinishing = line.finishing ?? "none";
    const futureMargin = !!line.futureMargin;

    let stretching: StretchingChoice = "none";
    let floatFrame: FloatFrameColour | null = null;
    if (finishing === "1in") stretching = "1in";
    else if (finishing === "1.5in") stretching = "1.5in";
    else if (finishing === "float") {
      stretching = "1in";
      floatFrame = catalog.floatFrames.find((f) => f.id === line.floatFrameSlug) ?? null;
      if (!floatFrame) {
        return {
          ok: false,
          reason: "float-frame-not-found",
          message: `Float frame not found: ${line.floatFrameSlug}`,
        };
      }
    }

    const marginCm = finishing === "none" && futureMargin ? FUTURE_STRETCH_MARGIN_CM : 0;
    const printWidthCm = line.widthCm + marginCm * 2;
    const printHeightCm = line.heightCm + marginCm * 2;
    const result = quoteCanvasPrint({
      canvas,
      widthCm: printWidthCm,
      heightCm: printHeightCm,
      stretching,
      floatFrame,
      delivery: "self",
    });
    if (!result.ok) return { ok: false, reason: "quote", message: result.message };
    return {
      ok: true,
      substrate: "canvas",
      unitPriceSGD: result.grandTotal + SHOP_ARTWORK_BASE_SGD,
      canvas,
      finishing,
      futureMargin,
      floatFrame,
      marginCm,
      printWidthCm,
      printHeightCm,
    };
  }

  return { ok: false, reason: "unknown-substrate", message: "Unknown substrate." };
}
