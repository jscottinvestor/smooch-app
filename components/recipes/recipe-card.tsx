"use client";

import { AlertTriangle, Loader2, Pencil, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { autoMatchRecipeAction } from "@/app/(app)/recipes/actions";
import { buildCategoryPaths, type CategoryPath } from "@/lib/category-paths";
import { formatMoney, formatQty } from "@/lib/format";
import { costForIngredient, findMatchingProduct, maxBatches } from "@/lib/recipe-math";
import type { Category, Ingredient, Product, Recipe } from "@/lib/types";
import { convertQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";
import { IngredientProductPicker } from "./ingredient-product-picker";
import { RecipeDialog } from "./recipe-dialog";

const TOP_ORDER = ["DRY INGREDIENTS", "WET INGREDIENTS", "MIX-INS"] as const;

/** Light section tint for grouping rows + mobile group cards by top-level category. */
function groupTint(topName: string | null): string {
  switch (topName) {
    case "DRY INGREDIENTS":
      return "bg-amber-50/40";
    case "WET INGREDIENTS":
      return "bg-sky-50/40";
    case "MIX-INS":
      return "bg-rose-50/40";
    default:
      return "";
  }
}

export function RecipeCard({
  recipe,
  products,
  categories,
}: {
  recipe: Recipe;
  products: Product[];
  categories: Category[];
}) {
  const savedBatches = recipe.batches || 1;
  const [batchesDraft, setBatchesDraft] = useState<string>(String(savedBatches));
  const effectiveBatches =
    parseFloat(batchesDraft) > 0 ? parseFloat(batchesDraft) : savedBatches;
  const batchScale = effectiveBatches / savedBatches;
  const isMultiplied = effectiveBatches !== savedBatches;
  const totalCookies = effectiveBatches * (recipe.cookiesPerBatch || 1);

  // Compute per-line costs with the batch scale applied.
  const lines = recipe.ingredients.map((ing) =>
    computeLine(ing, products, batchScale)
  );

  const knownCosts = lines.filter((l) => l.cost !== null);
  const total = knownCosts.reduce((sum, l) => sum + (l.cost ?? 0), 0);
  const allKnown = knownCosts.length === lines.length && lines.length > 0;
  const someKnown = knownCosts.length > 0 && !allKnown;
  const noneKnown = knownCosts.length === 0;

  const costPerCookie = totalCookies > 0 ? total / totalCookies : 0;
  const { batches: batchesPossible, limitingIngredient } = maxBatches(
    recipe,
    products
  );

  // Group lines by top-level category
  const grouped = groupByTopLevel(lines, categories);
  const recipeId = recipe.id;

  // Shared inputs for the New-product dialog opened from each ingredient
  // picker. Computed once at the recipe level since they don't vary per row.
  const categoryPaths = buildCategoryPaths(categories);
  const existingStores = Array.from(
    new Set(
      products
        .map((p) => p.store?.trim())
        .filter((s): s is string => !!s)
    )
  ).sort((a, b) => a.localeCompare(b));

  const router = useRouter();
  const [matchPending, startMatchTransition] = useTransition();
  const [matchToast, setMatchToast] = useState<
    | { kind: "success" | "info" | "error"; message: string }
    | null
  >(null);

  function tryAutoMatch() {
    setMatchToast(null);
    startMatchTransition(async () => {
      const res = await autoMatchRecipeAction(recipeId);
      if (!res.ok) {
        setMatchToast({ kind: "error", message: res.error });
        return;
      }
      if (res.matched === 0) {
        setMatchToast({
          kind: "info",
          message:
            res.checked === 0
              ? "Nothing to match — every ingredient is already linked."
              : "No confident matches. Try linking ingredients manually.",
        });
        return;
      }
      setMatchToast({
        kind: "success",
        message: `Matched ${res.matched} of ${res.checked} ingredient${res.checked === 1 ? "" : "s"}.`,
      });
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden shadow-sm shadow-foreground/[0.03]">
      <CardHeader className="pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2
            className="font-display text-2xl tracking-tight"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
          >
            {recipe.name}
          </h2>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatQty(savedBatches)} × {formatQty(recipe.cookiesPerBatch)}{" "}
              products/batch
            </span>
            <RecipeDialog
              recipe={recipe}
              products={products}
              categories={categories}
            >
              <Button variant="ghost" size="icon-xs" title="Edit recipe">
                <Pencil className="w-3.5 h-3.5" />
                <span className="sr-only">Edit recipe</span>
              </Button>
            </RecipeDialog>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Make</span>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={batchesDraft}
              onChange={(e) => setBatchesDraft(e.target.value)}
              onBlur={() => {
                if (parseFloat(batchesDraft) <= 0 || !batchesDraft) {
                  setBatchesDraft(String(savedBatches));
                }
              }}
              className="h-7 w-16 text-right text-sm tabular-nums"
            />
            <span className="text-muted-foreground">
              batches → {formatQty(totalCookies)} products
            </span>
            {isMultiplied && (
              <button
                type="button"
                onClick={() => setBatchesDraft(String(savedBatches))}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                title="Reset to saved value"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </label>
        </div>

        {someKnown && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div className="flex-1 flex items-start justify-between gap-3 flex-wrap">
              <p>
                Some ingredients aren't linked to products yet — totals shown
                with{" "}
                <span className="font-medium">~</span> are partial.
              </p>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={tryAutoMatch}
                disabled={matchPending}
                className="shrink-0"
              >
                {matchPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Try auto-match
              </Button>
            </div>
          </div>
        )}
        {noneKnown && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div className="flex-1 flex items-start justify-between gap-3 flex-wrap">
              <p>
                Link each ingredient to a product (column 2) to see
                cost-per-product and stock availability.
              </p>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={tryAutoMatch}
                disabled={matchPending}
                className="shrink-0"
              >
                {matchPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Try auto-match
              </Button>
            </div>
          </div>
        )}
        {matchToast && (
          <div
            className={cn(
              "mt-2 rounded-md border px-3 py-2 text-xs",
              matchToast.kind === "success" &&
                "border-emerald-200 bg-emerald-50 text-emerald-900",
              matchToast.kind === "info" &&
                "border-stone-200 bg-stone-50 text-stone-800",
              matchToast.kind === "error" &&
                "border-red-200 bg-red-50 text-red-900"
            )}
            role="status"
          >
            {matchToast.message}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 border-t">
        {/* Desktop — 5-column table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted/20 text-[11px] tracking-wide uppercase text-muted-foreground">
                <th className="text-left font-normal px-5 py-2.5 w-[24%]">
                  Ingredient
                </th>
                <th className="text-left font-normal py-2.5 w-[32%]">Product</th>
                <th className="text-right font-normal py-2.5 w-[12%]">
                  Quantity
                </th>
                <th className="text-right font-normal py-2.5 w-[12%]">Cost</th>
                <th className="text-right font-normal px-5 py-2.5 w-[20%]">
                  In stock?
                </th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ topName, items }) => (
                <GroupSection
                  key={topName ?? "_uncat"}
                  topName={topName}
                  items={items}
                  recipeId={recipeId}
                  products={products}
                  categoryPaths={categoryPaths}
                  existingStores={existingStores}
                />
              ))}
            </tbody>
            <tfoot className="border-t">
              <tr className="bg-muted/10">
                <td className="px-5 py-3.5 text-sm" colSpan={3}>
                  <span className="text-muted-foreground">Total recipe cost</span>
                </td>
                <td className="text-right py-3.5 font-medium tabular-nums">
                  {allKnown ? formatMoney(total) : "~" + formatMoney(total)}
                </td>
                <td />
              </tr>
              <tr>
                <td className="px-5 py-2 text-sm" colSpan={3}>
                  <span className="text-muted-foreground">Cost per product</span>
                </td>
                <td className="text-right py-2 font-medium tabular-nums">
                  {allKnown
                    ? formatMoney(costPerCookie, 4)
                    : "~" + formatMoney(costPerCookie, 4)}
                </td>
                <td />
              </tr>
              <tr>
                <td className="px-5 pt-2 pb-4 text-sm" colSpan={3}>
                  <span className="text-muted-foreground">
                    Batches possible from current stock
                  </span>
                </td>
                <td className="text-right pt-2 pb-4 font-medium tabular-nums">
                  {batchesPossible}
                </td>
                <td className="text-right px-5 pt-2 pb-4 text-xs text-muted-foreground">
                  {limitingIngredient && batchesPossible < 100
                    ? `limited by ${limitingIngredient}`
                    : ""}
                </td>
              </tr>
              {someKnown || noneKnown ? (
                <tr>
                  <td
                    className="px-5 pb-3 text-[11px] text-muted-foreground italic"
                    colSpan={5}
                  >
                    * Partial total — some ingredients couldn't be priced.
                  </td>
                </tr>
              ) : null}
            </tfoot>
          </table>
        </div>

        {/* Mobile — stacked ingredient cards by group */}
        <div className="md:hidden">
          {grouped.map(({ topName, items }) => (
            <div
              key={`m-${topName ?? "_uncat"}`}
              className={cn(
                "border-t first:border-t-0",
                groupTint(topName)
              )}
            >
              <div className="px-4 pt-4 pb-1 font-display text-sm text-foreground/80">
                {topName ? topName.toLowerCase() : "uncategorized"}
                <span className="ml-2 text-xs text-muted-foreground font-sans tabular-nums">
                  {items.length}
                </span>
              </div>
              <div className="px-3 pb-3 space-y-2">
                {items.map((line) => (
                  <IngredientCard
                    key={`mi-${line.ingredient.id}`}
                    line={line}
                    recipeId={recipeId}
                    products={products}
                    categoryPaths={categoryPaths}
                    existingStores={existingStores}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="border-t p-4 space-y-1.5 text-sm bg-muted/10">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total recipe cost</span>
              <span className="font-medium tabular-nums">
                {allKnown ? formatMoney(total) : "~" + formatMoney(total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cost per product</span>
              <span className="font-medium tabular-nums">
                {allKnown
                  ? formatMoney(costPerCookie, 4)
                  : "~" + formatMoney(costPerCookie, 4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Batches possible</span>
              <span className="font-medium tabular-nums">{batchesPossible}</span>
            </div>
            {limitingIngredient && batchesPossible < 100 && (
              <div className="text-right text-[11px] text-muted-foreground">
                limited by {limitingIngredient}
              </div>
            )}
            {(someKnown || noneKnown) && (
              <div className="text-[11px] italic text-muted-foreground pt-1">
                * Partial total — some ingredients couldn't be priced.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IngredientCard({
  line,
  recipeId,
  products,
  categoryPaths,
  existingStores,
}: {
  line: ComputedLine;
  recipeId: string;
  products: Product[];
  categoryPaths: CategoryPath[];
  existingStores: string[];
}) {
  const {
    ingredient,
    scaledQty,
    product,
    cost,
    shortPackages,
    costReason,
    stockReason,
    reasonTag,
  } = line;

  const inStock =
    shortPackages === null
      ? null
      : shortPackages <= 0
        ? { ok: true as const, label: "Yes" }
        : { ok: false as const, label: `Short ${Math.ceil(shortPackages)} pkg` };

  const tone = lineTone(line);

  return (
    <div
      className={cn(
        "rounded-md border-2 p-3 space-y-2 transition-colors",
        tone.card
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium leading-snug break-words">
            {ingredient.name}
          </div>
          <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
            {formatQty(scaledQty)} {ingredient.unit}
          </div>
        </div>
        <div className="text-right shrink-0">
          {cost === null ? (
            <span
              className="text-[11px] italic text-muted-foreground cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2"
              title={costReason || "Cost unavailable"}
            >
              {reasonTag || "—"}
            </span>
          ) : (
            <div className="font-medium tabular-nums">{formatMoney(cost)}</div>
          )}
          {inStock === null ? (
            <span
              className="text-[11px] italic text-muted-foreground cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 block mt-0.5"
              title={stockReason || "Stock unavailable"}
            >
              {reasonTag || "—"}
            </span>
          ) : inStock.ok ? (
            <span
              className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 px-2 py-0.5 text-[10px] font-medium mt-1"
              title={`Have ${formatQty(product?.stock ?? 0)} pkg in stock`}
            >
              Yes
            </span>
          ) : (
            <span
              className="inline-flex items-center rounded-full bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 px-2 py-0.5 text-[10px] font-medium mt-1"
              title={`Need ${formatQty((shortPackages ?? 0) + (product?.stock ?? 0))} pkg; have ${formatQty(product?.stock ?? 0)} pkg`}
            >
              {inStock.label}
            </span>
          )}
        </div>
      </div>
      <IngredientProductPicker
        recipeId={recipeId}
        ingredientId={ingredient.id}
        ingredientName={ingredient.name}
        productId={ingredient.productId}
        products={products}
        categoryPaths={categoryPaths}
        existingStores={existingStores}
      />
    </div>
  );
}

interface ComputedLine {
  ingredient: Ingredient;
  scaledQty: number;
  product: Product | null;
  cost: number | null;
  /** Negative if short. Null if can't compute. */
  shortPackages: number | null;
  /** Plain-English reason cost is null. Empty when cost is known. */
  costReason: string;
  /** Plain-English reason stock is null. Empty when known. */
  stockReason: string;
  /** Short tag inline-displayed in place of "—" (e.g., "no price"). */
  reasonTag: string;
}

/** Classify an ingredient line by its state for visual treatment. */
function lineTone(line: ComputedLine): { card: string; row: string } {
  const { product, cost, shortPackages } = line;
  if (!product) {
    return {
      card: "bg-stone-100 border-stone-400",
      row: "bg-stone-50/50",
    };
  }
  if (cost === null) {
    return {
      card: "bg-amber-50 border-amber-400",
      row: "bg-amber-50/50",
    };
  }
  if (shortPackages !== null && shortPackages > 0) {
    return {
      card: "bg-red-50 border-red-400",
      row: "bg-red-50/50",
    };
  }
  return {
    card: "bg-card border-border",
    row: "",
  };
}

function computeLine(
  ing: Ingredient,
  products: Product[],
  batchScale: number
): ComputedLine {
  const scaledQty = (ing.quantity || 0) * batchScale;
  const product = findMatchingProduct(ing, products);
  const scaledIng = { ...ing, quantity: scaledQty };
  const cost = costForIngredient(scaledIng, product);

  let shortPackages: number | null = null;
  let stockReason = "";
  let costReason = "";
  let reasonTag = "";

  if (!product) {
    costReason = "Pick a product (column 2) to see cost.";
    stockReason = costReason;
    reasonTag = "no product";
  } else if (!product.packageSize || product.packageSize <= 0) {
    costReason = `${product.name}: set its package size in Inventory.`;
    stockReason = costReason;
    reasonTag = "no pkg size";
  } else {
    const needInPackageUnit = convertQuantity(
      scaledQty,
      ing.unit,
      product.packageUnit,
      product
    );
    if (needInPackageUnit === null) {
      costReason = `Can't convert ${ing.unit} → ${product.packageUnit}. Add a per-product conversion in Inventory (Edit ${product.name}).`;
      stockReason = costReason;
      reasonTag = `${ing.unit}→${product.packageUnit}?`;
    } else {
      const needPackages = needInPackageUnit / product.packageSize;
      shortPackages = needPackages - (product.stock || 0);
      if (cost === null && !product.price) {
        costReason = `${product.name}: set its price in Inventory.`;
        reasonTag = "no price";
      }
    }
  }

  return {
    ingredient: ing,
    scaledQty,
    product,
    cost,
    shortPackages,
    costReason,
    stockReason,
    reasonTag,
  };
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

function groupByTopLevel(
  lines: ComputedLine[],
  categories: Category[]
): { topName: string | null; items: ComputedLine[] }[] {
  const buckets = new Map<string | null, ComputedLine[]>();

  for (const line of lines) {
    let topName: string | null = null;
    const refCatId =
      line.product?.categoryId ?? line.ingredient.filterCategoryId;
    if (refCatId) {
      const top = topLevelOfCategory(refCatId, categories);
      topName = top?.name ?? null;
    }
    if (!buckets.has(topName)) buckets.set(topName, []);
    buckets.get(topName)!.push(line);
  }

  const keys = [...buckets.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    const ra = (TOP_ORDER as readonly string[]).indexOf(a);
    const rb = (TOP_ORDER as readonly string[]).indexOf(b);
    return (
      (ra === -1 ? TOP_ORDER.length : ra) -
        (rb === -1 ? TOP_ORDER.length : rb) || a.localeCompare(b)
    );
  });

  return keys.map((k) => ({ topName: k, items: buckets.get(k)! }));
}

function GroupSection({
  topName,
  items,
  recipeId,
  products,
  categoryPaths,
  existingStores,
}: {
  topName: string | null;
  items: ComputedLine[];
  recipeId: string;
  products: Product[];
  categoryPaths: CategoryPath[];
  existingStores: string[];
}) {
  const tint = groupTint(topName);
  return (
    <>
      <tr className={cn("border-t border-border/60", tint)}>
        <td
          colSpan={5}
          className="px-5 pt-4 pb-1 font-display text-sm text-foreground/80"
        >
          {topName ? topName.toLowerCase() : "uncategorized"}
          <span className="ml-2 text-xs text-muted-foreground font-sans tabular-nums">
            {items.length}
          </span>
        </td>
      </tr>
      {items.map((line) => (
        <IngredientRow
          key={line.ingredient.id}
          line={line}
          recipeId={recipeId}
          products={products}
          groupTint={tint}
          categoryPaths={categoryPaths}
          existingStores={existingStores}
        />
      ))}
    </>
  );
}

function IngredientRow({
  line,
  recipeId,
  products,
  groupTint: groupTintClass,
  categoryPaths,
  existingStores,
}: {
  line: ComputedLine;
  recipeId: string;
  products: Product[];
  groupTint?: string;
  categoryPaths: CategoryPath[];
  existingStores: string[];
}) {
  const {
    ingredient,
    scaledQty,
    product,
    cost,
    shortPackages,
    costReason,
    stockReason,
    reasonTag,
  } = line;

  const inStock =
    shortPackages === null
      ? null
      : shortPackages <= 0
        ? { ok: true as const, label: "Yes" }
        : { ok: false as const, label: `Short ${Math.ceil(shortPackages)} pkg` };

  const tone = lineTone(line);

  return (
    <tr className={cn("hover:bg-muted/20", groupTintClass, tone.row)}>
      <td className="px-5 py-3 font-medium">{ingredient.name}</td>
      <td className="py-3 pr-3">
        <IngredientProductPicker
          recipeId={recipeId}
          ingredientId={ingredient.id}
          ingredientName={ingredient.name}
          productId={ingredient.productId}
          products={products}
          categoryPaths={categoryPaths}
          existingStores={existingStores}
        />
      </td>
      <td className="text-right py-3 tabular-nums">
        {formatQty(scaledQty)} {ingredient.unit}
      </td>
      <td className="text-right py-3 tabular-nums">
        {cost === null ? (
          <span
            className="text-[11px] italic text-muted-foreground cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2"
            title={costReason || "Cost unavailable"}
          >
            {reasonTag || "—"}
          </span>
        ) : (
          formatMoney(cost)
        )}
      </td>
      <td className="text-right px-5 py-3 text-xs">
        {inStock === null ? (
          <span
            className="text-[11px] italic text-muted-foreground cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2"
            title={stockReason || "Stock unavailable"}
          >
            {reasonTag || "—"}
          </span>
        ) : inStock.ok ? (
          <span
            className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 px-2 py-0.5 text-[11px] font-medium"
            title={`Have ${formatQty(product?.stock ?? 0)} pkg in stock`}
          >
            Yes
          </span>
        ) : (
          <span
            className="inline-flex items-center rounded-full bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 px-2 py-0.5 text-[11px] font-medium"
            title={`Need ${formatQty((shortPackages ?? 0) + (product?.stock ?? 0))} pkg; have ${formatQty(product?.stock ?? 0)} pkg`}
          >
            {inStock.label}
          </span>
        )}
      </td>
    </tr>
  );
}
