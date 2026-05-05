import { describe, expect, it } from "vitest";
import {
  quoteCanvasPrint,
  quoteCanvasStretching,
  type CanvasSubstrate,
  type FloatFrameColour,
} from "../src/data/pricing/canvas";

// Real Polycotton + Smooth White float frame values for the engine.
const polycotton: CanvasSubstrate = {
  id: "datajet-polycotton-canvas",
  name: "Datajet Polycotton Canvas",
  sellPricePerSqm: 53.69,
  maxPrintWidthCm: 152.4,
  maxPrintLengthCm: 2000,
};

const smoothWhite: FloatFrameColour = {
  id: "smooth-white",
  label: "Smooth White",
  costPerFoot: 0.77,
};

describe("quoteCanvasPrint", () => {
  it("100×100 Polycotton with 1\" stretching matches the post-fix V10 target", () => {
    const r = quoteCanvasPrint({
      canvas: polycotton,
      widthCm: 100,
      heightCm: 100,
      stretching: "1in",
      floatFrame: null,
      delivery: "self",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // After the bar-markup bump 5→8, this case lands ≈ S$170 — a few
      // % above V10's S$162.09 historic price (intentional uplift).
      // Pin it so a future change to wastage / labour / inner-bar
      // formula can't drift by surprise.
      const stretching = r.lines.find((l) => l.label.startsWith("Stretching"));
      expect(stretching).toBeDefined();
      expect(stretching!.amount).toBeGreaterThan(160);
      expect(stretching!.amount).toBeLessThan(180);
    }
  });

  it("treats float frame as a 1\" stretcher under the hood", () => {
    const r = quoteCanvasPrint({
      canvas: polycotton,
      widthCm: 50,
      heightCm: 70,
      stretching: "none", // ignored when floatFrame is set
      floatFrame: smoothWhite,
      delivery: "self",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // The stretching component must still be charged (1") even though
      // the customer asked for "float frame" — float = 1" + frame.
      const stretching = r.lines.find((l) => l.label.startsWith("Stretching"));
      expect(stretching).toBeDefined();
      expect(stretching!.label).toContain('1"');
      const floatLine = r.lines.find((l) => l.label.startsWith("Float frame"));
      expect(floatLine).toBeDefined();
      expect(r.finishingChoice.kind).toBe("float-frame");
    }
  });

  it("rejects oversize prints", () => {
    const r = quoteCanvasPrint({
      canvas: polycotton,
      widthCm: 200,
      heightCm: 200,
      stretching: "none",
      floatFrame: null,
      delivery: "self",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("oversize");
    }
  });
});

describe("quoteCanvasStretching", () => {
  it("1.5\" depth is more expensive than 1\" depth at the same size", () => {
    const oneInch = quoteCanvasStretching({
      frameWidthCm: 60,
      frameHeightCm: 90,
      depth: "1in",
      floatFrame: null,
      delivery: "self",
    });
    const deepInch = quoteCanvasStretching({
      frameWidthCm: 60,
      frameHeightCm: 90,
      depth: "1.5in",
      floatFrame: null,
      delivery: "self",
    });
    expect(oneInch.ok).toBe(true);
    expect(deepInch.ok).toBe(true);
    if (oneInch.ok && deepInch.ok) {
      expect(deepInch.grandTotal).toBeGreaterThan(oneInch.grandTotal);
    }
  });
});
