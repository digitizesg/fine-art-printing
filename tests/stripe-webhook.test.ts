import { describe, expect, it } from "vitest";
import { extractShippingAddress } from "../src/lib/stripe-shipping";

const ADDR = {
  city: "Singapore",
  country: "SG",
  line1: "120 Lower Delta Road",
  line2: "08-01/02 Cendex Centre",
  postal_code: "169208",
  state: null,
} as const;

const ALT_ADDR = {
  city: null,
  country: "SG",
  line1: "1 Other Road",
  line2: null,
  postal_code: "111111",
  state: null,
} as const;

// Helper: build a minimally-typed Checkout.Session with whichever
// shipping fields we want populated. We only care about the fields
// extractShippingAddress reads.
function makeSession(opts: {
  collected?: typeof ADDR;
  legacy?: typeof ADDR;
  billing?: typeof ADDR;
}) {
  return {
    collected_information: opts.collected
      ? { shipping_details: { address: opts.collected } }
      : null,
    shipping_details: opts.legacy
      ? { address: opts.legacy }
      : null,
    customer_details: opts.billing
      ? { address: opts.billing }
      : null,
  } as unknown as Parameters<typeof extractShippingAddress>[0];
}

describe("extractShippingAddress", () => {
  it("prefers collected_information.shipping_details (the modern path)", () => {
    const r = extractShippingAddress(
      makeSession({ collected: ADDR, legacy: ALT_ADDR, billing: ALT_ADDR }),
    );
    expect(r?.line1).toBe("120 Lower Delta Road");
  });

  it("falls back to the legacy top-level shipping_details", () => {
    const r = extractShippingAddress(
      makeSession({ legacy: ADDR, billing: ALT_ADDR }),
    );
    expect(r?.line1).toBe("120 Lower Delta Road");
  });

  it("falls back to customer billing address when no shipping", () => {
    const r = extractShippingAddress(makeSession({ billing: ADDR }));
    expect(r?.line1).toBe("120 Lower Delta Road");
  });

  it("returns null when no address is anywhere", () => {
    const r = extractShippingAddress(makeSession({}));
    expect(r).toBeNull();
  });
});
