import { AlertCircle, ChefHat, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { maxBatches, recipeCost } from "@/lib/recipe-math";
import type { Category, Product, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DashboardView({
  products,
  recipes,
}: {
  products: Product[];
  recipes: Recipe[];
  categories: Category[];
}) {
  const inventoryValue = products.reduce(
    (s, p) => s + (p.stock || 0) * (p.price || 0),
    0
  );
  const outOfStock = products.filter((p) => (p.stock || 0) <= 0).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Inventory value"
          value={formatMoney(inventoryValue)}
          icon={Wallet}
          tint="bg-amber-100 text-amber-700"
        />
        <MetricCard
          label="Recipes"
          value={String(recipes.length)}
          icon={ChefHat}
          tint="bg-rose-100 text-rose-700"
        />
        <MetricCard
          label="Out of stock"
          value={String(outOfStock)}
          icon={AlertCircle}
          tint={
            outOfStock > 0
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }
          subline={
            outOfStock > 0
              ? `${outOfStock} product${outOfStock === 1 ? "" : "s"} at zero`
              : "All stocked"
          }
        />
      </div>

      <RecipeSummary recipes={recipes} products={products} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tint,
  subline,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tint: string;
  subline?: string;
}) {
  return (
    <Card className="shadow-sm shadow-foreground/[0.03]">
      <CardContent className="flex items-center gap-4 py-5">
        <span
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            tint
          )}
        >
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div
            className="font-display text-2xl tabular-nums leading-tight"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
          >
            {value}
          </div>
          {subline && (
            <div className="text-xs text-muted-foreground mt-0.5">{subline}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecipeSummary({
  recipes,
  products,
}: {
  recipes: Recipe[];
  products: Product[];
}) {
  if (recipes.length === 0) {
    return (
      <Card className="shadow-sm shadow-foreground/[0.03]">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No recipes yet —{" "}
            <Link href="/recipes" className="underline">
              go to Recipes
            </Link>{" "}
            to add one.
          </p>
        </CardContent>
      </Card>
    );
  }

  const summaries = recipes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => {
      const { total, missing } = recipeCost(r, products);
      const cookies = (r.batches || 1) * (r.cookiesPerBatch || 1);
      const costPerCookie = cookies > 0 ? total / cookies : 0;
      const { batches: batchesPossible, limitingIngredient } = maxBatches(
        r,
        products
      );
      const allKnown = missing.length === 0;
      return {
        recipe: r,
        costPerBatch: total,
        costPerCookie,
        batchesPossible,
        limitingIngredient,
        allKnown,
        partialCount: missing.length,
      };
    });

  return (
    <Card className="shadow-sm shadow-foreground/[0.03] overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle
          className="font-display text-xl font-normal"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          Recipe costing
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted/20 text-[11px] tracking-wide uppercase text-muted-foreground">
                <th className="text-left font-normal px-5 py-2.5">Recipe</th>
                <th className="text-right font-normal py-2.5">Cost / batch</th>
                <th className="text-right font-normal py-2.5">Cost / cookie</th>
                <th className="text-right font-normal py-2.5">Can make</th>
                <th className="text-left font-normal px-5 py-2.5">
                  Limited by
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.recipe.id} className="border-t hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <Link
                      href="/recipes"
                      className="font-medium hover:underline"
                    >
                      {s.recipe.name}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.recipe.batches || 1} batch × {s.recipe.cookiesPerBatch}{" "}
                      cookies
                    </div>
                  </td>
                  <td className="text-right py-3 tabular-nums">
                    {s.costPerBatch > 0 ? (
                      <span>
                        {s.allKnown ? "" : "~"}
                        {formatMoney(s.costPerBatch)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">
                        not priced
                      </span>
                    )}
                  </td>
                  <td className="text-right py-3 tabular-nums">
                    {s.costPerCookie > 0 ? (
                      <span>
                        {s.allKnown ? "" : "~"}
                        {formatMoney(s.costPerCookie, 4)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">
                        —
                      </span>
                    )}
                  </td>
                  <td className="text-right py-3 tabular-nums">
                    <span
                      className={cn(
                        s.batchesPossible === 0 && "text-muted-foreground"
                      )}
                    >
                      {s.batchesPossible}{" "}
                      <span className="text-muted-foreground text-xs">
                        batch{s.batchesPossible === 1 ? "" : "es"}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {s.limitingIngredient ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {summaries.some((s) => !s.allKnown) && (
              <tfoot>
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-2 text-[11px] italic text-muted-foreground"
                  >
                    * ~ prefix means partial total — some ingredients aren't
                    linked or priced yet.
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
