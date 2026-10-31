import { describe, expect, it } from "vitest";
import { priceShopLine, type ShopCatalog } from "../src/lib/shop-pricing";
import { quotePaperPrint } from "../src/data/pricing/paper";
import { quoteCanvasPrint } from "../src/data/pricing/canvas";
import { SHOP_ARTWORK_BASE_SGD } from "../src/data/pricing/shop";

// Expected prices below were captured from the pre-refactor shop page
// and /api/checkout logic, so this pins the behaviour the extraction
// had to preserve.
const catalog: ShopCatalog = {
  papers: [
    {
      id: "hahnemuhle-photo-rag",
      name: "Hahnemühle Photo Rag",
      sellPricePerSqm: 136.46,
      maxPrintWidthCm: 111.76,
      maxPrintLengthCm: 1200,
    },
  ],
  canvases: [
    {
      id: "datajet-polycotton-canvas",
      name: "Datajet Polycotton Canvas",
      sellPricePerSqm: 53.69,
      maxPrintWidthCm: 152.4,
      maxPrintLengthCm: 2000,
    },
  ],
  floatFrames: [{ id: "smooth-white", label: "Smooth White", sellPerM: 30 }],
};

const paper = { substrate: "paper" as const, paperSlug: "hahnemuhle-photo-rag" };
const canvas = { substrate: "canvas" as const, canvasSlug: "datajet-polycotton-canvas" };

function price(line: Parameters<typeof priceShopLine>[0]): number {
  const r = priceShopLine(line, catalog);
  if (!r.ok) throw new Error(r.message);
  return r.unitPriceSGD;
}

describe("priceShopLine", () => {
  it("adds the S$10 artwork fee on top of the engine total", () => {
    expect(SHOP_ARTWORK_BASE_SGD).toBe(10);
    const engine = quotePaperPrint({
      paper: catalog.papers[0]!,
      widthCm: 50,
      heightCm: 70,
      quantity: 1,
    });
    expect(engine.ok && engine.grandTotal).toBe(74);
    expect(price({ ...paper, widthCm: 50, heightCm: 70 })).toBe(84);

    const canvasEngine = quoteCanvasPrint({
      canvas: catalog.canvases[0]!,
      widthCm: 60,
      heightCm: 90,
      stretching: "1in",
      floatFrame: null,
      delivery: "self",
    });
    expect(canvasEngine.ok && canvasEngine.grandTotal).toBe(194);
    expect(price({ ...canvas, widthCm: 60, heightCm: 90, finishing: "1in" })).toBe(204);
  });

  it("paper, no border", () => {
    const r = priceShopLine({ ...paper, widthCm: 50, heightCm: 70 }, catalog);
    expect(r).toMatchObject({ ok: true, unitPriceSGD: 84, printWidthCm: 50, printHeightCm: 70, borderCm: 0 });
  });

  it("paper border adds twice the border to each axis", () => {
    const r = priceShopLine({ ...paper, widthCm: 50, heightCm: 70, borderCm: 3 }, catalog);
    expect(r).toMatchObject({ ok: true, unitPriceSGD: 97, printWidthCm: 56, printHeightCm: 76, borderCm: 3 });
    // Same as quoting the bigger sheet directly.
    const engine = quotePaperPrint({ paper: catalog.papers[0]!, widthCm: 56, heightCm: 76, quantity: 1 });
    expect(engine.ok && engine.grandTotal + 10).toBe(97);
  });

  it("negative or junk border is treated as zero", () => {
    expect(price({ ...paper, widthCm: 50, heightCm: 70, borderCm: -2 })).toBe(84);
    expect(price({ ...paper, widthCm: 50, heightCm: 70, borderCm: Number.NaN })).toBe(84);
  });

  it("canvas rolled", () => {
    expect(price({ ...canvas, widthCm: 60, heightCm: 90, finishing: "none" })).toBe(72);
    // finishing defaults to rolled
    expect(price({ ...canvas, widthCm: 60, heightCm: 90 })).toBe(72);
  });

  it("canvas rolled with future-stretching margin adds 3.81 cm per side", () => {
    const r = priceShopLine(
      { ...canvas, widthCm: 60, heightCm: 90, finishing: "none", futureMargin: true },
      catalog,
    );
    expect(r).toMatchObject({ ok: true, unitPriceSGD: 83, marginCm: 3.81 });
    if (r.ok) {
      expect(r.printWidthCm).toBeCloseTo(67.62, 10);
      expect(r.printHeightCm).toBeCloseTo(97.62, 10);
    }
  });

  it("canvas stretched 1\" and 1.5\"", () => {
    expect(price({ ...canvas, widthCm: 60, heightCm: 90, finishing: "1in" })).toBe(204);
    expect(price({ ...canvas, widthCm: 60, heightCm: 90, finishing: "1.5in" })).toBe(218);
  });

  it("future margin is ignored once the canvas is stretched", () => {
    const r = priceShopLine(
      { ...canvas, widthCm: 60, heightCm: 90, finishing: "1in", futureMargin: true },
      catalog,
    );
    expect(r).toMatchObject({ ok: true, unitPriceSGD: 204, marginCm: 0 });
  });

  it("float frame is priced as 1\" stretching plus the frame", () => {
    const r = priceShopLine(
      { ...canvas, widthCm: 60, heightCm: 90, finishing: "float", floatFrameSlug: "smooth-white" },
      catalog,
    );
    expect(r).toMatchObject({ ok: true, unitPriceSGD: 363 });
    if (r.ok && r.substrate === "canvas") expect(r.floatFrame?.id).toBe("smooth-white");
  });

  it("reports unknown slugs", () => {
    expect(priceShopLine({ ...paper, paperSlug: "nope", widthCm: 50, heightCm: 70 }, catalog)).toMatchObject({
      ok: false,
      reason: "paper-not-found",
    });
    expect(priceShopLine({ ...canvas, canvasSlug: "nope", widthCm: 50, heightCm: 70 }, catalog)).toMatchObject({
      ok: false,
      reason: "canvas-not-found",
    });
    expect(
      priceShopLine({ ...canvas, widthCm: 50, heightCm: 70, finishing: "float", floatFrameSlug: "nope" }, catalog),
    ).toMatchObject({ ok: false, reason: "float-frame-not-found" });
  });

  it("passes engine errors through (oversize)", () => {
    expect(priceShopLine({ ...paper, widthCm: 150, heightCm: 150 }, catalog)).toMatchObject({
      ok: false,
      reason: "quote",
    });
  });
});
