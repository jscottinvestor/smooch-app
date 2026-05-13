import { describe, expect, it } from "vitest";
import { bestProductMatch, classifyMatch, normalizeAlias, similarity } from "./matching";
import type { Product } from "./types";

function p(overrides: Partial<Product>): Product {
  return {
    id: "p1",
    name: "",
    store: null,
    categoryId: null,
    packageSize: 1,
    packageUnit: "g",
    price: 0,
    stock: 0,
    conversions: [],
    priceHistory: [],
    receiptAliases: [],
    ...overrides,
  };
}

describe("normalizeAlias", () => {
  it("uppercases, collapses whitespace, trims", () => {
    expect(normalizeAlias("  ks  unsalted  butter  ")).toBe("KS UNSALTED BUTTER");
  });
  it("handles empty input", () => {
    expect(normalizeAlias("")).toBe("");
  });
});

describe("similarity", () => {
  it("is 1 for identical strings", () => {
    expect(similarity("brown sugar", "brown sugar")).toBe(1);
  });
  it("is high for token overlap", () => {
    // "ks brown sugar 7lb" (4 tokens) vs "brown sugar" (2 tokens): 2 common / max(4,2) = 0.5
    expect(similarity("KS brown sugar 7lb", "Brown Sugar")).toBeGreaterThanOrEqual(0.5);
  });
  it("is 0 for unrelated strings", () => {
    expect(similarity("xyz", "abc")).toBe(0);
  });
});

describe("bestProductMatch", () => {
  it("alias hit returns score 1.0 via alias", () => {
    const products = [
      p({ id: "a", name: "Brown Sugar", receiptAliases: ["KS BROWN SUGAR 7LB"] }),
      p({ id: "b", name: "Cane Sugar" }),
    ];
    const result = bestProductMatch("KS Brown Sugar 7LB", null, products);
    expect(result.product?.id).toBe("a");
    expect(result.score).toBe(1);
    expect(result.viaAlias).toBe(true);
  });

  it("falls back to similarity when no alias match", () => {
    const products = [
      p({ id: "a", name: "Brown Sugar" }),
      p({ id: "b", name: "Olive Oil" }),
    ];
    const result = bestProductMatch("Sugar Brown 5lb", null, products);
    expect(result.product?.id).toBe("a");
    expect(result.score).toBeGreaterThan(0);
  });

  it("returns null product when nothing scores", () => {
    const products = [p({ id: "a", name: "Olive Oil" })];
    const result = bestProductMatch("xyzabc", null, products);
    expect(result.product).toBeNull();
  });

  it("applies store bonus when receipt store matches product store", () => {
    // nameScore is tied at 0.5 for both; store bonus (+0.15) tips it to 'b'.
    // (Bonus is wasted when nameScore is already 1.0 because score is capped at 1.)
    const products = [
      p({ id: "a", name: "Sugar", store: "Walmart" }),
      p({ id: "b", name: "Sugar", store: "Costco" }),
    ];
    const result = bestProductMatch("Sugar 5lb", "Costco Wholesale", products);
    expect(result.product?.id).toBe("b");
  });
});

describe("classifyMatch", () => {
  it("thresholds bucket scores correctly", () => {
    expect(classifyMatch(0.9)).toBe("high");
    expect(classifyMatch(0.5)).toBe("low");
    expect(classifyMatch(0.1)).toBe("none");
  });
});
