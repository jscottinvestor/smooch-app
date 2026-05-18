import { Package } from "lucide-react";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ProductRow {
  id: string;
  name: string;
  store: string | null;
  package_size: number;
  package_unit: string;
  price: number;
  stock: number;
  created_at: string;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n);

export default async function UserIngredientsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("products")
    .select(
      "id, name, store, package_size, package_unit, price, stock, created_at"
    )
    .eq("user_id", id)
    .order("name", { ascending: true });

  const rows = (data ?? []) as ProductRow[];
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {error ? "Error loading ingredients" : `${rows.length} ingredients`}
      </p>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error.message}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Package className="w-6 h-6 opacity-50" />
          This user has no ingredients yet.
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Name</th>
                  <th className="text-left font-medium px-3 py-2">Store</th>
                  <th className="text-right font-medium px-3 py-2">Package</th>
                  <th className="text-right font-medium px-3 py-2">Price</th>
                  <th className="text-right font-medium px-3 py-2">Stock</th>
                  <th className="text-left font-medium px-3 py-2">Added</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.store || "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.package_size} {p.package_unit}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtMoney(p.price)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.stock}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {fmtDate(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden space-y-3">
            {rows.map((p) => {
              const tint =
                p.stock === 0
                  ? "bg-rose-50/60"
                  : p.stock < 1
                  ? "bg-amber-50/60"
                  : "bg-emerald-50/60";
              return (
                <li
                  key={p.id}
                  className={`rounded-md border ${tint} p-4 shadow-sm shadow-foreground/[0.03] space-y-2`}
                >
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.store || "—"} · {p.package_size} {p.package_unit} ·{" "}
                    {fmtMoney(p.price)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stock: <span className="tabular-nums">{p.stock}</span> ·
                    Added {fmtDate(p.created_at)}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
