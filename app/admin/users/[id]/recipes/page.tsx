import { ChefHat } from "lucide-react";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RecipeRow {
  id: string;
  name: string;
  batches: number;
  cookies_per_batch: number;
  ingredients: unknown;
  created_at: string;
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
  const ingredientCount = (raw: unknown): number =>
    Array.isArray(raw) ? raw.length : 0;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

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
        <>
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Name</th>
                  <th className="text-right font-medium px-3 py-2">Batches</th>
                  <th className="text-right font-medium px-3 py-2">
                    Items/batch
                  </th>
                  <th className="text-right font-medium px-3 py-2">
                    Ingredients
                  </th>
                  <th className="text-left font-medium px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.batches}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.cookies_per_batch}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {ingredientCount(r.ingredients)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {fmtDate(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-md border bg-amber-50/60 p-4 shadow-sm shadow-foreground/[0.03] space-y-2"
              >
                <div className="font-medium text-foreground">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.batches} × {r.cookies_per_batch} items per batch ·{" "}
                  {ingredientCount(r.ingredients)} ingredients
                </div>
                <div className="text-xs text-muted-foreground">
                  Created {fmtDate(r.created_at)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
