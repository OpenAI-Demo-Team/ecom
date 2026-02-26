import { describe, expect, it } from "vitest";
import {
  calculateCartTotal,
  calculateCartTotalFixed,
  calculateCartTotalWithFixState
} from "../src/backend/services/checkout";

const cart = [
  { sku: "mecha-k1", qty: 1, unitPriceCents: 10000 },
  { sku: "arcview-34", qty: 1, unitPriceCents: 5000 }
];

describe("checkout promo calculation", () => {
  it("demonstrates the bugged total when promo is active", () => {
    const buggy = calculateCartTotal(cart, { code: "SAVE10", percentOff: 10 });
    expect(buggy).toBe(12000);
  });

  it("computes the correct total when fixed logic is used", () => {
    const fixed = calculateCartTotalFixed(cart, { code: "SAVE10", percentOff: 10 });
    expect(fixed).toBe(13500);
  });

  it("switches behavior based on promoBugFixed state", () => {
    const beforeFix = calculateCartTotalWithFixState(cart, { code: "SAVE10", percentOff: 10 }, false);
    const afterFix = calculateCartTotalWithFixState(cart, { code: "SAVE10", percentOff: 10 }, true);

    expect(beforeFix).toBe(12000);
    expect(afterFix).toBe(13500);
  });
});
