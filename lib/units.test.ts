import { describe, expect, it } from "vitest";
import { convertQuantity, unitDimension } from "./units";

describe("unitDimension", () => {
  it("classifies weights", () => {
    expect(unitDimension("g")).toBe("weight");
    expect(unitDimension("lb")).toBe("weight");
  });
  it("classifies volumes", () => {
    expect(unitDimension("ml")).toBe("volume");
    expect(unitDimension("cup")).toBe("volume");
  });
  it("classifies counts as their own dimension each", () => {
    expect(unitDimension("each")).toBe("count:each");
    expect(unitDimension("sticks")).toBe("count:sticks");
  });
  it("returns null for unknown units", () => {
    expect(unitDimension("furlong")).toBeNull();
  });
});

describe("convertQuantity", () => {
  it("returns qty unchanged for same unit", () => {
    expect(convertQuantity(5, "g", "g", null)).toBe(5);
  });

  it("converts within weight family", () => {
    expect(convertQuantity(1, "kg", "g", null)).toBeCloseTo(1000);
    expect(convertQuantity(1, "lb", "g", null)).toBeCloseTo(453.592);
    expect(convertQuantity(16, "oz", "lb", null)).toBeCloseTo(1, 3);
  });

  it("converts within volume family", () => {
    expect(convertQuantity(1, "cup", "tbsp", null)).toBeCloseTo(16, 1);
    expect(convertQuantity(1, "l", "ml", null)).toBeCloseTo(1000);
  });

  it("returns null across unrelated dimensions without product conversion", () => {
    expect(convertQuantity(1, "g", "ml", null)).toBeNull();
    expect(convertQuantity(1, "each", "g", null)).toBeNull();
  });

  it("applies the built-in butter sticks→g conversion", () => {
    const butter = { name: "Unsalted Butter", conversions: [] };
    expect(convertQuantity(1, "sticks", "g", butter)).toBeCloseTo(113.4);
    expect(convertQuantity(113.4, "g", "sticks", butter)).toBeCloseTo(1);
  });

  it("bridges butter sticks→lb through grams", () => {
    const butter = { name: "Unsalted Butter", conversions: [] };
    const lbs = convertQuantity(4, "sticks", "lb", butter);
    expect(lbs).not.toBeNull();
    expect(lbs!).toBeCloseTo(1, 2); // 4 sticks ≈ 1 lb
  });

  it("does not apply butter conversion to non-butter products", () => {
    const flour = { name: "All Purpose Flour", conversions: [] };
    expect(convertQuantity(1, "sticks", "g", flour)).toBeNull();
  });

  it("applies a per-product user conversion (cup flour → g)", () => {
    const flour = {
      name: "All Purpose Flour",
      conversions: [{ fromQty: 1, fromUnit: "cup", toQty: 120, toUnit: "g" }] as const,
    };
    expect(
      convertQuantity(2, "cup", "g", {
        name: flour.name,
        conversions: [...flour.conversions],
      })
    ).toBeCloseTo(240);
  });
});
