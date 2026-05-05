import { describe, expect, it } from "vitest";
import {
  PAPER_PRICING,
  quotePaperPrint,
  type PaperFamily,
} from "../src/data/pricing/paper";

// Minimal fixtures matching the slim engine shape. Real values mirror
// what's in Supabase for "Hahnemühle Photo Rag" + a small Datajet-ish
// paper used to exercise the minimum-job floor.
const photoRag: PaperFamily = {
  id: "hahnemuhle-photo-rag",
  name: "Hahnemühle Photo Rag",
  sellPricePerSqm: 136.46,
  maxPrintWidthCm: 111.76,
  maxPrintLengthCm: 1200,
};

const cheapPaper: PaperFamily = {
  id: "datajet-cotton",
  name: "Datajet Cotton",
  sellPricePerSqm: 25,
  maxPrintWidthCm: 111.76,
  maxPrintLengthCm: 1500,
};

describe("quotePaperPrint", () => {
  it("computes Photo Rag at 30×40cm above the minimum-job floor", () => {
    const r = quotePaperPrint({
      paper: photoRag,
      widthCm: 30,
      heightCm: 40,
      quantity: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Sqm = 0.12. Paper 136.46 × 0.12 = 16.38; ink 11.25 × 0.12 = 1.35;
      // labour 20; no surcharge tiers triggered. ≈ 37.73 → ceil 38.
      expect(r.grandTotal).toBe(38);
      expect(r.minTopUp).toBe(0);
    }
  });

  it("hits the minimum-job floor for tiny prints on a cheap paper", () => {
    const r = quotePaperPrint({
      paper: cheapPaper,
      widthCm: 5,
      heightCm: 5,
      quantity: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.grandTotal).toBe(PAPER_PRICING.minJobSell);
      expect(r.minTopUp).toBeGreaterThan(0);
    }
  });

  it("rejects oversize prints with reason: oversize", () => {
    const r = quotePaperPrint({
      paper: photoRag,
      widthCm: 200, // > 111.76 max
      heightCm: 200,
      quantity: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("oversize");
    }
  });

  it("hits both surcharge tiers above 1.0 sqm", () => {
    const r = quotePaperPrint({
      paper: photoRag,
      widthCm: 110,
      heightCm: 130,
      quantity: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // sqm = 1.43. Tier1 0.7 × 28 = 19.6 (capped). Tier2 0.43 × 40 = 17.2.
      const labels = r.perPrintLines.map((l) => l.label);
      expect(labels).toContain("Large-print handling");
      expect(labels).toContain("Oversize handling");
    }
  });
});
