import { Users } from "lucide-react";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  recipes: number;
  ingredients: number;
  receipts: number;
  feedback: number;
}

// Pull every row's user_id from a table and tally by user. RLS is
// bypassed via the service-role client so we see everyone's rows.
async function countByUser(
  service: ReturnType<typeof getServiceSupabase>,
  table: "recipes" | "products" | "receipts" | "feedback"
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  // Page through to avoid the default 1000-row limit on a single select.
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await service
      .from(table)
      .select("user_id")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as { user_id: string | null }[]) {
      if (!row.user_id) continue;
      counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return counts;
}

export default async function UsersAdminPage() {
  const service = getServiceSupabase();

  const [
    { data: authData, error: authError },
    recipeCounts,
    ingredientCounts,
    receiptCounts,
    feedbackCounts,
  ] = await Promise.all([
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    countByUser(service, "recipes"),
    countByUser(service, "products"),
    countByUser(service, "receipts"),
    countByUser(service, "feedback"),
  ]);

  const users: UserRow[] = (authData?.users ?? [])
    .map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        null;
      return {
        id: u.id,
        email: u.email ?? null,
        name,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        recipes: recipeCounts.get(u.id) ?? 0,
        ingredients: ingredientCounts.get(u.id) ?? 0,
        receipts: receiptCounts.get(u.id) ?? 0,
        feedback: feedbackCounts.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "—";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {authError ? "Error loading users" : `${users.length} signed up`}
        </p>
      </div>

      {authError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {authError.message}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-md border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Users className="w-6 h-6 opacity-50" />
          No users yet.
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">User</th>
                  <th className="text-left font-medium px-3 py-2">Joined</th>
                  <th className="text-left font-medium px-3 py-2">Last sign-in</th>
                  <th className="text-right font-medium px-3 py-2">Recipes</th>
                  <th className="text-right font-medium px-3 py-2">Ingredients</th>
                  <th className="text-right font-medium px-3 py-2">Receipts</th>
                  <th className="text-right font-medium px-3 py-2">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">
                        {u.name || u.email || "(no email)"}
                      </div>
                      {u.name && u.email && (
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {fmtDate(u.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {fmtDate(u.lastSignInAt)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {u.recipes}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {u.ingredients}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {u.receipts}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {u.feedback}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card view */}
          <ul className="md:hidden space-y-3">
            {users.map((u) => {
              // Color-tint by activity so the most engaged users stand out.
              const activity = u.recipes + u.ingredients + u.receipts;
              const tint =
                activity === 0
                  ? "bg-muted/30"
                  : activity < 5
                  ? "bg-amber-50/60"
                  : "bg-emerald-50/60";
              return (
                <li
                  key={u.id}
                  className={`rounded-md border ${tint} p-4 shadow-sm shadow-foreground/[0.03] space-y-3`}
                >
                  <div>
                    <div className="font-medium text-foreground truncate">
                      {u.name || u.email || "(no email)"}
                    </div>
                    {u.name && u.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Joined {fmtDate(u.createdAt)} · Last seen{" "}
                      {fmtDate(u.lastSignInAt)}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <Stat label="Recipes" value={u.recipes} />
                    <Stat label="Ingred." value={u.ingredients} />
                    <Stat label="Receipts" value={u.receipts} />
                    <Stat label="Feedback" value={u.feedback} />
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-card px-2 py-1.5">
      <div className="text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
