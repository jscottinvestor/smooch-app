"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
import { bakeRecipesAction } from "@/app/(app)/recipes/actions";
import { computeBakeUsage, type BakeUsage, type BakeIssue } from "@/lib/bake";
import { formatQty } from "@/lib/format";
import type { Product, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PreviewState {
  usage: BakeUsage[];
  issues: BakeIssue[];
  plan: { recipeName: string; batches: number }[];
}

export function BakeDialog({
  recipes,
  products,
  children,
}: {
  recipes: Recipe[];
  products: Product[];
  children: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"input" | "preview">("input");
  const [batches, setBatches] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedRecipes = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes]
  );

  function reset() {
    setBatches({});
    setPreview(null);
    setError(null);
    setView("input");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  const hasAnyBatches = Object.values(batches).some(
    (v) => parseFloat(v ?? "") > 0
  );

  function buildPlan() {
    return sortedRecipes
      .map((r) => ({
        recipeId: r.id,
        recipeName: r.name,
        batches: parseFloat(batches[r.id] ?? "") || 0,
      }))
      .filter((p) => p.batches > 0);
  }

  function showPreview() {
    setError(null);
    const plan = buildPlan();
    if (plan.length === 0) return;
    const result = computeBakeUsage(plan, recipes, products);
    setPreview({
      usage: result.usage,
      issues: result.issues,
      plan: plan.map((p) => ({ recipeName: p.recipeName, batches: p.batches })),
    });
    setView("preview");
  }

  function confirmBake() {
    setError(null);
    const plan = buildPlan();
    if (plan.length === 0) return;
    startTransition(async () => {
      const res = await bakeRecipesAction(
        plan.map((p) => ({ recipeId: p.recipeId, batches: p.batches }))
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent className="max-w-[calc(100vw-0.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden grid-cols-[minmax(0,1fr)]">
        {view === "input" ? (
          <>
            <DialogHeader className="min-w-0">
              <DialogTitle className="flex items-center gap-2 truncate">
                <ChefHat className="w-5 h-5 shrink-0" />
                Bake products
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground -mt-2">
              How many batches of each recipe did you bake? Inventory will be
              reduced by the ingredients those batches used.
            </p>

            {sortedRecipes.length === 0 ? (
              <p className="text-sm italic text-muted-foreground py-4">
                You don't have any recipes yet. Add one from the Recipes tab.
              </p>
            ) : (
              <div className="space-y-2 min-w-0">
                {sortedRecipes.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 border rounded-md px-3 py-2 min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm leading-snug truncate">
                        {r.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatQty(r.itemsPerBatch)} products/batch
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
              <Button type="button" onClick={showPreview} disabled={!hasAnyBatches}>
                Review changes
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="min-w-0">
              <DialogTitle className="flex items-center gap-2 truncate">
                <ChefHat className="w-5 h-5 shrink-0" />
                Confirm bake
              </DialogTitle>
            </DialogHeader>
            <PreviewView preview={preview} />
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2 sm:justify-between flex-wrap">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setView("input")}
                disabled={pending}
              >
                <ArrowLeft className="w-4 h-4" />
                Adjust batches
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmBake}
                  disabled={pending || !preview || preview.usage.length === 0}
                >
                  {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reduce inventory
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewView({ preview }: { preview: PreviewState | null }) {
  if (!preview) return null;
  const planSummary = preview.plan
    .map((p) => `${p.batches} × ${p.recipeName}`)
    .join(" · ");

  return (
    <div className="space-y-3 min-w-0">
      <p className="text-xs text-muted-foreground">{planSummary}</p>

      {preview.usage.length === 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          None of these ingredients are linked to products yet — nothing to
          reduce. Link products on each ingredient first.
        </div>
      ) : (
        <div className="rounded-md border bg-emerald-50/40">
          <div className="px-3 py-2 border-b text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Inventory changes ({preview.usage.length})
          </div>
          <ul className="divide-y">
            {preview.usage.map((u) => {
              const willGoNegative = u.newStock < 0;
              return (
                <li
                  key={u.productId}
                  className={cn(
                    "px-3 py-2 text-sm flex items-baseline justify-between gap-2",
                    willGoNegative && "bg-amber-50/60"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.productName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      uses {formatQty(u.totalUnits)} {u.packageUnit} (
                      {formatQty(u.packagesUsed)} pkg)
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs tabular-nums">
                      {formatQty(u.currentStock)} → {formatQty(u.newStock)} pkg
                    </div>
                    {willGoNegative && (
                      <div className="text-[10px] text-amber-700">
                        not enough on hand
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {preview.issues.length > 0 && (
        <div className="rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-900">
            <AlertTriangle className="w-4 h-4" />
            Not deducted ({preview.issues.length})
          </div>
          <ul className="space-y-0.5 text-xs text-amber-900/90">
            {preview.issues.map((iss, i) => (
              <li key={i}>
                <span className="font-medium">{iss.recipeName}</span>
                {" → "}
                <span>{iss.ingredientName}</span>
                <span className="italic"> — {iss.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
