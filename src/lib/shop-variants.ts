/**
 * Build the buyable variants for a shop artwork — one per (substrate
 * × size) combination that fits the cheapest featured roll of its
 * type. Shared between the product page (/shop/[slug]) and the
 * Google Merchant feed (/products.xml) so the price + SKU layouts
 * stay consistent.
 */
import type { Artwork } from "./artworks";
import { quotePaperPrint } from "../data/pricing/paper";
import { quoteCanvasPrint } from "../data/pricing/canvas";
import { SHOP_ARTWORK_BASE_SGD } from "../data/pricing/shop";

export type ShopVariant = {
  substrate: "paper" | "canvas";
  width_cm: number;
  height_cm: number;
  price: number;
};

type SubstrateOption = {
  slug: string;
  name: string;
  sellPricePerSqm: number;
  maxPrintWidthCm: number;
  maxPrintLengthCm: number;
};

export function buildShopVariants(args: {
  artwork: Artwork;
  featuredPapers: SubstrateOption[];
  featuredCanvases: SubstrateOption[];
}): ShopVariant[] {
  const { artwork, featuredPapers, featuredCanvases } = args;

  const cheapestPaper = artwork.allowPaper
    ? [...featuredPapers].sort(
        (a, b) => a.sellPricePerSqm - b.sellPricePerSqm,
      )[0]
    : null;
  const cheapestCanvas = artwork.allowCanvas
    ? [...featuredCanvases].sort(
        (a, b) => a.sellPricePerSqm - b.sellPricePerSqm,
      )[0]
    : null;

  const out: ShopVariant[] = [];
  for (const size of artwork.availableSizes) {
    if (cheapestPaper) {
      const r = quotePaperPrint({
        paper: {
          id: cheapestPaper.slug,
          name: cheapestPaper.name,
          sellPricePerSqm: cheapestPaper.sellPricePerSqm,
          maxPrintWidthCm: cheapestPaper.maxPrintWidthCm,
          maxPrintLengthCm: cheapestPaper.maxPrintLengthCm,
        },
        widthCm: size.width_cm,
        heightCm: size.height_cm,
        quantity: 1,
      });
      if (r.ok) {
        out.push({
          substrate: "paper",
          width_cm: size.width_cm,
          height_cm: size.height_cm,
          price: r.grandTotal + SHOP_ARTWORK_BASE_SGD,
        });
      }
    }
    if (cheapestCanvas) {
      const r = quoteCanvasPrint({
        canvas: {
          id: cheapestCanvas.slug,
          name: cheapestCanvas.name,
          sellPricePerSqm: cheapestCanvas.sellPricePerSqm,
          maxPrintWidthCm: cheapestCanvas.maxPrintWidthCm,
          maxPrintLengthCm: cheapestCanvas.maxPrintLengthCm,
        },
        widthCm: size.width_cm,
        heightCm: size.height_cm,
        stretching: "none",
        floatFrame: null,
        delivery: "self",
      });
      if (r.ok) {
        out.push({
          substrate: "canvas",
          width_cm: size.width_cm,
          height_cm: size.height_cm,
          price: r.grandTotal + SHOP_ARTWORK_BASE_SGD,
        });
      }
    }
  }
  return out;
}

export function variantSku(artworkSlug: string, v: ShopVariant): string {
  return `${artworkSlug}--${v.substrate}-${v.width_cm}x${v.height_cm}`;
}

export function variantTitle(
  artworkTitle: string,
  v: ShopVariant,
): string {
  const substrate = v.substrate === "paper" ? "paper" : "canvas";
  return `${artworkTitle} on ${substrate}, ${v.width_cm}×${v.height_cm} cm`;
}

export function variantUrl(siteOrigin: string, artworkSlug: string, v: ShopVariant): string {
  return `${siteOrigin}/shop/${artworkSlug}?substrate=${v.substrate}&size=${v.width_cm}x${v.height_cm}`;
}
