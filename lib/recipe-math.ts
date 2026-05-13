import { convertQuantity } from "./units";
import type { Ingredient, Product, Recipe } from "./types";

export function findMatchingProduct(
  ingredient: Ingredient,
  products: Product[]
): Product | null {
  if (ingredient.productId && !ingredient.useAnyMatching) {
    return products.find((p) => p.id === ingredient.productId) || null;
  }
  if (ingredient.useAnyMatching) {
    const ingName = ingredient.name.toLowerCase().trim();
    const candidates = products.filter((p) => {
      const pn = p.name.toLowerCase();
      return pn.includes(ingName) || ingName.includes(pn);
    });
    if (candidates.length === 0) return null;
    let best: Product | null = null;
    let bestCost = Infinity;
    for (const p of candidates) {
      const cost = costForIngredient(ingredient, p);
      if (cost !== null && cost < bestCost) {
        bestCost = cost;
        best = p;
      }
    }
    return best || candidates[0];
  }
  return null;
}

export function costForIngredient(
  ingredient: Ingredient,
  product: Product | null
): number | null {
  if (!product) return null;
  if (!product.packageSize || product.packageSize <= 0) return null;
  const qtyInPackageUnit = convertQuantity(
    ingredient.quantity,
    ingredient.unit,
    product.packageUnit,
    product
  );
  if (qtyInPackageUnit === null) return null;
  const pricePerPackageUnit = product.price / product.packageSize;
  return qtyInPackageUnit * pricePerPackageUnit;
}

export interface RecipeCostBreakdown {
  ingredient: Ingredient;
  product: Product | null;
  cost: number | null;
}

export function recipeCost(
  recipe: Recipe,
  products: Product[]
): {
  total: number;
  missing: string[];
  breakdown: RecipeCostBreakdown[];
} {
  let total = 0;
  const missing: string[] = [];
  const breakdown: RecipeCostBreakdown[] = [];
  for (const ing of recipe.ingredients) {
    if (!ing.name || !ing.quantity) continue;
    const product = findMatchingProduct(ing, products);
    const cost = costForIngredient(ing, product);
    if (cost === null) {
      missing.push(ing.name);
      breakdown.push({ ingredient: ing, product, cost: null });
    } else {
      total += cost;
      breakdown.push({ ingredient: ing, product, cost });
    }
  }
  return { total, missing, breakdown };
}

export function maxBatches(
  recipe: Recipe,
  products: Product[]
): { batches: number; limitingIngredient: string | null } {
  if (!recipe.ingredients.length) {
    return { batches: 0, limitingIngredient: null };
  }
  let minBatches = Infinity;
  let limiting: string | null = null;
  for (const ing of recipe.ingredients) {
    if (!ing.name || !ing.quantity) continue;
    const product = findMatchingProduct(ing, products);
    if (!product) return { batches: 0, limitingIngredient: ing.name };
    const needInPackageUnit = convertQuantity(
      ing.quantity,
      ing.unit,
      product.packageUnit,
      product
    );
    if (needInPackageUnit === null) {
      return { batches: 0, limitingIngredient: ing.name };
    }
    if (needInPackageUnit <= 0) continue;
    // Stock is in packages; convert to units available before computing batches possible.
    const unitsAvailable = (product.stock || 0) * (product.packageSize || 0);
    const possible = unitsAvailable / needInPackageUnit;
    if (possible < minBatches) {
      minBatches = possible;
      limiting = ing.name;
    }
  }
  return {
    batches: minBatches === Infinity ? 0 : Math.floor(minBatches),
    limitingIngredient: limiting,
  };
}
