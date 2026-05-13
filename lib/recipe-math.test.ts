import { describe, expect, it } from "vitest";
import { costForIngredient, maxBatches, recipeCost } from "./recipe-math";
import type { Ingredient, Product, Recipe } from "./types";

const sugar: Product = {
  id: "p1",
  name: "Cane Sugar",
  store: null,
  categoryId: null,
  packageSize: 1000, // 1 kg in grams
  packageUnit: "g",
  price: 4.0,
  stock: 2.5, // 2.5 packages = 2500 g
  conversions: [],
  priceHistory: [],
  receiptAliases: [],
};

const butter: Product = {
  id: "p2",
  name: "Unsalted Butter",
  store: null,
  categoryId: null,
  packageSize: 4, // 4 sticks per package
  packageUnit: "sticks",
  price: 6.0,
  stock: 3, // 12 sticks total
  conversions: [],
  priceHistory: [],
  receiptAliases: [],
};

function ing(overrides: Partial<Ingredient>): Ingredient {
  return {
    id: "i1",
    name: "x",
    quantity: 100,
    unit: "g",
    productId: null,
    useAnyMatching: false,
    filterCategoryId: null,
    ...overrides,
  };
}

describe("costForIngredient", () => {
  it("returns null without a product", () => {
    expect(costForIngredient(ing({}), null)).toBeNull();
  });

  it("computes cost when units match the package unit", () => {
    // 200g of a 1000g/$4 package → $0.80
    const cost = costForIngredient(ing({ quantity: 200, unit: "g" }), sugar);
    expect(cost).toBeCloseTo(0.8);
  });

  it("converts via built-in conversions (butter g → sticks)", () => {
    // 113.4g of butter = 1 stick of a 4-stick/$6 package → $1.50
    const cost = costForIngredient(
      ing({ name: "butter", quantity: 113.4, unit: "g" }),
      butter
    );
    expect(cost).toBeCloseTo(1.5, 2);
  });

  it("returns null when packageSize is zero (placeholder seed)", () => {
    const placeholder: Product = { ...sugar, packageSize: 0 };
    expect(costForIngredient(ing({ quantity: 100 }), placeholder)).toBeNull();
  });
});

describe("maxBatches", () => {
  it("is limited by the scarcest ingredient", () => {
    // Need 500g sugar (stock 2500g → 5 batches), need 4 sticks butter (stock 12 → 3 batches)
    // → Butter is limiting at 3 batches.
    const recipe: Recipe = {
      id: "r1",
      name: "Test",
      batches: 1,
      cookiesPerBatch: 10,
      ingredients: [
        ing({
          id: "a",
          name: "sugar",
          quantity: 500,
          unit: "g",
          productId: sugar.id,
        }),
        ing({
          id: "b",
          name: "butter",
          quantity: 4,
          unit: "sticks",
          productId: butter.id,
        }),
      ],
    };
    const result = maxBatches(recipe, [sugar, butter]);
    expect(result.batches).toBe(3);
    expect(result.limitingIngredient).toBe("butter");
  });

  it("returns zero if any ingredient has no linked product", () => {
    const recipe: Recipe = {
      id: "r2",
      name: "Test",
      batches: 1,
      cookiesPerBatch: 10,
      ingredients: [ing({ quantity: 100 })], // productId: null
    };
    expect(maxBatches(recipe, [sugar]).batches).toBe(0);
  });
});

describe("recipeCost", () => {
  it("sums priced ingredients and reports missing ones", () => {
    const recipe: Recipe = {
      id: "r3",
      name: "Test",
      batches: 1,
      cookiesPerBatch: 10,
      ingredients: [
        ing({
          id: "a",
          name: "sugar",
          quantity: 200,
          unit: "g",
          productId: sugar.id,
        }),
        ing({ id: "b", name: "salt", quantity: 1, unit: "tsp" }), // no productId
      ],
    };
    const result = recipeCost(recipe, [sugar]);
    expect(result.total).toBeCloseTo(0.8);
    expect(result.missing).toEqual(["salt"]);
  });
});
