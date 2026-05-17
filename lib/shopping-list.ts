import type { Category, Product, Recipe } from "./types";
import { convertQuantity } from "./units";
import { findMatchingProduct } from "./recipe-math";

export interface ShoppingPlanEntry {
  recipeId: string;
  batches: number;
}

export interface ShoppingNeed {
  productId: string;
  productName: string;
  store: string | null;
  topLevelName: string | null;
  packageSize: number;
  packageUnit: string;
  /** Total quantity needed across all recipes, in product.packageUnit. */
  totalUnitsNeeded: number;
  /** Stock × packageSize, in product.packageUnit. */
  haveUnits: number;
  /** totalUnitsNeeded − haveUnits when positive; 0 otherwise. */
  shortUnits: number;
  /** ceil(shortUnits / packageSize). 0 means we already have enough. */
  packagesToBuy: number;
  /** Recipes contributing to this need. */
  contributors: {
    recipeName: string;
    batches: number;
    ingredientName: string;
    qty: number;
    unit: string;
  }[];
}

export type IssueReason =
  | "no product linked"
  | "package size not set"
  | "unit conversion missing";

export interface ShoppingIssue {
  recipeName: string;
  ingredientName: string;
  ingredientUnit: string;
  productName: string | null;
  productPackageUnit: string | null;
  reason: IssueReason;
}

export interface ShoppingListResult {
  /** Products you need to buy. shortUnits > 0 means we have a real need. */
  needs: ShoppingNeed[];
  /** Ingredients we couldn't translate into a package count. */
  issues: ShoppingIssue[];
  /** Recipes the user requested batches for. */
  plan: { recipe: Recipe; batches: number }[];
}

function topLevelOfCategory(
  categoryId: string,
  categories: Category[]
): Category | null {
  let cur = categories.find((c) => c.id === categoryId) ?? null;
  while (cur?.parentId) {
    const parent = categories.find((c) => c.id === cur!.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur;
}

/**
 * Aggregate ingredient demand across the selected recipes, subtract what
 * we already have on hand, and round up to whole packages. Pure function.
 */
export function computeShoppingList(
  plan: ShoppingPlanEntry[],
  recipes: Recipe[],
  products: Product[],
  categories: Category[]
): ShoppingListResult {
  const productById = new Map(products.map((p) => [p.id, p]));
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  // Aggregate by product
  const needsMap = new Map<string, ShoppingNeed>();
  const issues: ShoppingIssue[] = [];
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
          productName: null,
          productPackageUnit: null,
          reason: "no product linked",
        });
        continue;
      }
      if (!product.packageSize || product.packageSize <= 0) {
        issues.push({
          recipeName: recipe.name,
          ingredientName: ing.name,
          ingredientUnit: ing.unit,
          productName: product.name,
          productPackageUnit: product.packageUnit,
          reason: "package size not set",
        });
        continue;
      }

      const scaledQty = ing.quantity * batchScale;
      const qtyInPackageUnit = convertQuantity(
        scaledQty,
        ing.unit,
        product.packageUnit,
        product
      );
      if (qtyInPackageUnit === null) {
        issues.push({
          recipeName: recipe.name,
          ingredientName: ing.name,
          ingredientUnit: ing.unit,
          productName: product.name,
          productPackageUnit: product.packageUnit,
          reason: "unit conversion missing",
        });
        continue;
      }

      const existing = needsMap.get(product.id);
      const contributor = {
        recipeName: recipe.name,
        batches,
        ingredientName: ing.name,
        qty: scaledQty,
        unit: ing.unit,
      };
      if (existing) {
        existing.totalUnitsNeeded += qtyInPackageUnit;
        existing.contributors.push(contributor);
      } else {
        const top = product.categoryId
          ? topLevelOfCategory(product.categoryId, categories)
          : null;
        needsMap.set(product.id, {
          productId: product.id,
          productName: product.name,
          store: product.store,
          topLevelName: top?.name ?? null,
          packageSize: product.packageSize,
          packageUnit: product.packageUnit,
          totalUnitsNeeded: qtyInPackageUnit,
          haveUnits: 0,
          shortUnits: 0,
          packagesToBuy: 0,
          contributors: [contributor],
        });
      }
    }
  }

  // Fill in stock-aware shortage + packages-to-buy
  const needs: ShoppingNeed[] = [];
  for (const need of needsMap.values()) {
    const product = productById.get(need.productId);
    if (!product) continue;
    need.haveUnits = (product.stock || 0) * product.packageSize;
    const short = need.totalUnitsNeeded - need.haveUnits;
    need.shortUnits = short > 0 ? short : 0;
    need.packagesToBuy =
      short > 0 ? Math.ceil(short / product.packageSize) : 0;
    if (need.packagesToBuy > 0) needs.push(need);
  }

  // Sort needs: by top-level (DRY/WET/MIX-INS first), then product name
  const TOP_ORDER = ["DRY INGREDIENTS", "WET INGREDIENTS", "MIX-INS"];
  needs.sort((a, b) => {
    const ra = a.topLevelName ? TOP_ORDER.indexOf(a.topLevelName) : -1;
    const rb = b.topLevelName ? TOP_ORDER.indexOf(b.topLevelName) : -1;
    const fa = ra === -1 ? TOP_ORDER.length : ra;
    const fb = rb === -1 ? TOP_ORDER.length : rb;
    return (
      fa - fb ||
      (a.topLevelName ?? "").localeCompare(b.topLevelName ?? "") ||
      a.productName.localeCompare(b.productName)
    );
  });

  return { needs, issues, plan: usedPlan };
}

export function groupNeedsByTopLevel(
  needs: ShoppingNeed[]
): { topName: string | null; items: ShoppingNeed[] }[] {
  const map = new Map<string | null, ShoppingNeed[]>();
  for (const n of needs) {
    if (!map.has(n.topLevelName)) map.set(n.topLevelName, []);
    map.get(n.topLevelName)!.push(n);
  }
  return [...map.entries()].map(([topName, items]) => ({ topName, items }));
}

/**
 * Group shopping needs by store. Items with no store land in a final
 * "No store set" group so they aren't hidden.
 */
export function groupNeedsByStore(
  needs: ShoppingNeed[]
): { store: string | null; items: ShoppingNeed[] }[] {
  const map = new Map<string | null, ShoppingNeed[]>();
  for (const n of needs) {
    const key = n.store && n.store.trim() ? n.store.trim() : null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  }
  // Stores alphabetically; null (No store set) last
  return [...map.entries()]
    .sort((a, b) => {
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return a[0].localeCompare(b[0]);
    })
    .map(([store, items]) => ({ store, items }));
}

/**
 * Build a plain-text shopping list suitable for an email body or
 * clipboard paste. Groups by store, lists package counts.
 */
export function formatShoppingListText(result: ShoppingListResult): string {
  const today = new Date().toISOString().slice(0, 10);
  const planLine = result.plan
    .map((p) => `${p.batches} × ${p.recipe.name}`)
    .join(" + ");

  const lines: string[] = [];
  lines.push(`COTTAGE BAKING BUDDY — Shopping list`);
  lines.push(`Generated ${today}`);
  if (planLine) lines.push(`For: ${planLine}`);
  lines.push("");

  if (result.needs.length === 0) {
    lines.push("You're all set — current inventory covers everything.");
    return lines.join("\n");
  }

  const groups = groupNeedsByStore(result.needs);
  for (const { store, items } of groups) {
    lines.push(`${store ? store.toUpperCase() : "NO STORE SET"}`);
    for (const n of items) {
      const sizeNote = `${n.packageSize} ${n.packageUnit}/pkg`;
      lines.push(`  • ${n.productName} — ${n.packagesToBuy} pkg  (${sizeNote})`);
    }
    lines.push("");
  }

  if (result.issues.length > 0) {
    lines.push(`NEEDS ATTENTION (${result.issues.length})`);
    for (const iss of result.issues) {
      lines.push(`  • ${iss.recipeName} → ${iss.ingredientName} (${iss.reason})`);
    }
  }

  return lines.join("\n").trim();
}
