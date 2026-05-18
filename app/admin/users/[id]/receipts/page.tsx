import { Receipt as ReceiptIcon } from "lucide-react";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ReceiptRow {
  id: string;
  date: string;
  store: string;
  total: number | null;
  lines: unknown;
  created_at: string;
}

const fmtMoney = (n: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
      }).format(n);

export default async function UserReceiptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("receipts")
    .select("id, date, store, total, lines, created_at")
    .eq("user_id", id)
    .order("date", { ascending: false });

  const rows = (data ?? []) as ReceiptRow[];
  const lineCount = (raw: unknown) => (Array.isArray(raw) ? raw.length : 0);
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {error ? "Error loading receipts" : `${rows.length} receipts`}
      </p>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error.message}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <ReceiptIcon className="w-6 h-6 opacity-50" />
          This user has no receipts yet.
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Date</th>
                  <th className="text-left font-medium px-3 py-2">Store</th>
                  <th className="text-right font-medium px-3 py-2">Lines</th>
                  <th className="text-right font-medium px-3 py-2">Total</th>
                  <th className="text-left font-medium px-3 py-2">Scanned</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2">{r.store}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {lineCount(r.lines)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtMoney(r.total)}
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
                className="rounded-md border bg-sky-50/60 p-4 shadow-sm shadow-foreground/[0.03] space-y-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {r.store}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(r.date)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {lineCount(r.lines)} lines · Total {fmtMoney(r.total)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Scanned {fmtDate(r.created_at)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
