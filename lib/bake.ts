import type { Product, Recipe } from "./types";
import { findMatchingProduct } from "./recipe-math";
import { convertQuantity } from "./units";

export interface BakePlanEntry {
  recipeId: string;
  batches: number;
}

export interface BakeUsage {
  productId: string;
  productName: string;
  packageUnit: string;
  /** Quantity used across the whole plan, in product.packageUnit (e.g. grams). */
  totalUnits: number;
  packageSize: number;
  /** totalUnits / packageSize. Can be fractional. */
  packagesUsed: number;
  currentStock: number;
  newStock: number;
}

export interface BakeIssue {
  recipeName: string;
  ingredientName: string;
  ingredientUnit: string;
  reason:
    | "no product linked"
    | "package size not set"
    | "unit conversion missing";
}

export interface BakeUsageResult {
  usage: BakeUsage[];
  issues: BakeIssue[];
  plan: { recipe: Recipe; batches: number }[];
}

/**
 * Pure function: given a plan of (recipe, batches), figure out exactly how
 * much of each linked product gets consumed and what the new stock level
 * would be. Mirrors lib/shopping-list.ts but returns ALL demand (no
 * shortage filter) and computes new-stock instead of packages-to-buy.
 */
export function computeBakeUsage(
  plan: BakePlanEntry[],
  recipes: Recipe[],
  products: Product[]
): BakeUsageResult {
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const productById = new Map(products.map((p) => [p.id, p]));

  const totals = new Map<string, number>(); // productId -> totalUnits
  const issues: BakeIssue[] = [];
  const usedPlan: { recipe: Recipe; batches: number }[] = [];

  for (const { recipeId, batches } of plan) {
    if (!Number.isFinite(batches) || batches <= 0) continue;
    const recipe = recipeById.get(recipeId);
    if (!recipe) continue;
    usedPlan.push({ recipe, batches });

    const batchScale = batches / (recipe.batches || 1);

    for (const ing of recipe.ingredients) {
      if (!ing.name || !ing.quantity) continue;
      const product = findMatchingProduct(ing, products);

      if (!product) {
        issues.push({
          recipeName: recipe.name,
          ingredientName: ing.name,
          ingredientUnit: ing.unit,
          reason: "no product linked",
        });
        continue;
      }
      if (!product.packageSize || product.packageSize <= 0) {
        issues.push({
          recipeName: recipe.name,
          ingredientName: ing.name,
          ingredientUnit: ing.unit,
          reason: "package size not set",
        });
        continue;
      }

      const scaled = ing.quantity * batchScale;
      const qtyInPackageUnit = convertQuantity(
        scaled,
        ing.unit,
        product.packageUnit,
        product
      );
      if (qtyInPackageUnit === null) {
        issues.push({
          recipeName: recipe.name,
          ingredientName: ing.name,
          ingredientUnit: ing.unit,
          reason: "unit conversion missing",
        });
        continue;
      }

      totals.set(product.id, (totals.get(product.id) ?? 0) + qtyInPackageUnit);
    }
  }

  const usage: BakeUsage[] = [];
  for (const [productId, totalUnits] of totals) {
    const p = productById.get(productId);
    if (!p) continue;
    const packagesUsed = totalUnits / p.packageSize;
    usage.push({
      productId: p.id,
      productName: p.name,
      packageUnit: p.packageUnit,
      totalUnits,
      packageSize: p.packageSize,
      packagesUsed,
      currentStock: p.stock,
      newStock: p.stock - packagesUsed, // can go negative — user over-baked
    });
  }

  usage.sort((a, b) => a.productName.localeCompare(b.productName));

  return { usage, issues, plan: usedPlan };
}
