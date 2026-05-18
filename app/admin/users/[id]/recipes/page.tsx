import { ChefHat } from "lucide-react";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RawIngredient {
  id?: string;
  name?: string;
  quantity?: number;
  unit?: string;
  productId?: string | null;
}

interface RecipeRow {
  id: string;
  name: string;
  batches: number;
  cookies_per_batch: number;
  ingredients: unknown;
  created_at: string;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

const fmtQty = (q: number | undefined) => {
  if (typeof q !== "number" || Number.isNaN(q)) return "?";
  // Trim trailing zeros (e.g., 2.500 → 2.5, 3.000 → 3).
  return q.toFixed(3).replace(/\.?0+$/, "");
};

function asIngredientList(raw: unknown): RawIngredient[] {
  return Array.isArray(raw) ? (raw as RawIngredient[]) : [];
}

export default async function UserRecipesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("recipes")
    .select("id, name, batches, cookies_per_batch, ingredients, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as RecipeRow[];

  // Collect every productId referenced across all recipes, then resolve
  // them in one batched query so we can show the linked product name.
  const productIds = new Set<string>();
  for (const r of rows) {
    for (const ing of asIngredientList(r.ingredients)) {
      if (ing.productId) productIds.add(ing.productId);
    }
  }
  const productNames = new Map<string, string>();
  if (productIds.size > 0) {
    const { data: prodRows } = await service
      .from("products")
      .select("id, name")
      .in("id", Array.from(productIds));
    for (const p of (prodRows ?? []) as { id: string; name: string }[]) {
      productNames.set(p.id, p.name);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {error ? "Error loading recipes" : `${rows.length} recipes`}
      </p>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error.message}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <ChefHat className="w-6 h-6 opacity-50" />
          This user has no recipes yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const ings = asIngredientList(r.ingredients);
            return (
              <li
                key={r.id}
                className="rounded-md border bg-amber-50/60 p-4 shadow-sm shadow-foreground/[0.03] space-y-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-medium text-foreground">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Created {fmtDate(r.created_at)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.batches} × {r.cookies_per_batch} items per batch ·{" "}
                  {ings.length} ingredients
                </div>

                {ings.length === 0 ? (
                  <div className="text-xs italic text-muted-foreground">
                    (No ingredients entered)
                  </div>
                ) : (
                  <ul className="rounded border bg-card divide-y text-sm">
                    {ings.map((ing, i) => {
                      const linkedName = ing.productId
                        ? productNames.get(ing.productId)
                        : null;
                      return (
                        <li
                          key={ing.id ?? i}
                          className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-1.5"
                        >
                          <span className="tabular-nums font-mono text-xs text-muted-foreground min-w-[5.5rem]">
                            {fmtQty(ing.quantity)} {ing.unit ?? ""}
                          </span>
                          <span className="text-foreground">
                            {ing.name || "(unnamed)"}
                          </span>
                          {ing.productId ? (
                            <span className="text-[11px] text-emerald-700">
                              → {linkedName ?? "linked product"}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-700">
                              unlinked
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
