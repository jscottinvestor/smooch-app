"use client";

import { AlertTriangle, ArrowLeft, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatQty } from "@/lib/format";
import {
  computeShoppingList,
  groupNeedsByTopLevel,
  type ShoppingListResult,
} from "@/lib/shopping-list";
import type { Category, Product, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

const SECTION_TINTS: Record<string, string> = {
  "DRY INGREDIENTS": "bg-amber-50/40",
  "WET INGREDIENTS": "bg-sky-50/40",
  "MIX-INS": "bg-rose-50/40",
};

export function ShoppingListDialog({
  recipes,
  products,
  categories,
  children,
}: {
  recipes: Recipe[];
  products: Product[];
  categories: Category[];
  children: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"input" | "output">("input");
  const [batches, setBatches] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ShoppingListResult | null>(null);

  const sortedRecipes = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes]
  );

  function reset() {
    setBatches({});
    setResult(null);
    setView("input");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function generate() {
    const plan = sortedRecipes
      .map((r) => ({
        recipeId: r.id,
        batches: parseFloat(batches[r.id] ?? "") || 0,
      }))
      .filter((p) => p.batches > 0);

    if (plan.length === 0) return;

    const r = computeShoppingList(plan, recipes, products, categories);
    setResult(r);
    setView("output");
  }

  const hasAnyBatches = Object.values(batches).some(
    (v) => parseFloat(v ?? "") > 0
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {view === "input" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Create shopping list
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground -mt-2">
              How many batches of each recipe do you want to make? I'll
              subtract what's already in inventory and tell you the minimum
              packages to buy.
            </p>

            {sortedRecipes.length === 0 ? (
              <p className="text-sm italic text-muted-foreground py-4">
                You don't have any recipes yet. Add one from the Recipes tab.
              </p>
            ) : (
              <div className="space-y-2">
                {sortedRecipes.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 border rounded-md px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm leading-snug truncate">
                        {r.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        saved: {r.batches} × {formatQty(r.cookiesPerBatch)}{" "}
                        products/batch
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={batches[r.id] ?? ""}
                        onChange={(e) =>
                          setBatches((b) => ({ ...b, [r.id]: e.target.value }))
                        }
                        placeholder="0"
                        className="h-8 w-16 text-right text-sm tabular-nums"
                      />
                      <span className="text-xs text-muted-foreground">
                        batch{(parseFloat(batches[r.id] ?? "") || 0) === 1 ? "" : "es"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={generate}
                disabled={!hasAnyBatches}
              >
                Generate list
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Shopping list
              </DialogTitle>
            </DialogHeader>
            <OutputView result={result} />
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setView("input")}
              >
                <ArrowLeft className="w-4 h-4" />
                Adjust batches
              </Button>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OutputView({ result }: { result: ShoppingListResult | null }) {
  if (!result) return null;
  const groups = groupNeedsByTopLevel(result.needs);

  const planSummary = result.plan
    .map((p) => `${p.batches} × ${p.recipe.name}`)
    .join(" · ");

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{planSummary}</p>

      {result.needs.length === 0 ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
          <span className="font-medium">You're all set —</span> current
          inventory covers everything those batches need.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ topName, items }) => (
            <div
              key={topName ?? "_uncat"}
              className={cn(
                "rounded-md border p-3 space-y-1.5",
                topName ? SECTION_TINTS[topName] : ""
              )}
            >
              <div className="font-display text-sm text-foreground/80">
                {topName ? topName.toLowerCase() : "uncategorized"}
              </div>
              <ul className="space-y-1.5">
                {items.map((n) => (
                  <li key={n.productId} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{n.productName}</span>
                      <span className="font-medium tabular-nums shrink-0">
                        {n.packagesToBuy} pkg
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {n.store && <span>{n.store} · </span>}
                      <span>
                        {formatQty(n.packageSize)} {n.packageUnit}/pkg
                      </span>
                      <span>
                        {" · need "}
                        {formatQty(n.totalUnitsNeeded)} {n.packageUnit},{" "}
                        have {formatQty(n.haveUnits)} {n.packageUnit}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {result.issues.length > 0 && (
        <div className="rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-900">
            <AlertTriangle className="w-4 h-4" />
            Needs attention ({result.issues.length})
          </div>
          <ul className="space-y-0.5 text-xs text-amber-900/90">
            {result.issues.map((iss, i) => (
              <li key={i}>
                <span className="font-medium">{iss.recipeName}</span>
                {" → "}
                <span>{iss.ingredientName}</span>
                {": "}
                <span className="italic">
                  {iss.reason === "unit conversion missing"
                    ? `can't convert ${iss.ingredientUnit} → ${iss.productPackageUnit ?? "?"}`
                    : iss.reason === "package size not set"
                      ? `${iss.productName}: set its package size`
                      : "no product linked"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
