"use client";

import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteReceiptAction } from "@/app/(app)/receipts/actions";
import { formatMoney, formatQty } from "@/lib/format";
import type { Product, Receipt } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReceiptHistory({
  receipts,
  products,
}: {
  receipts: Receipt[];
  products: Product[];
}) {
  if (receipts.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm shadow-foreground/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle
          className="font-display text-xl font-normal"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          Past receipts
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {receipts.length} receipt{receipts.length === 1 ? "" : "s"} applied so
          far.
        </p>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <div className="divide-y">
          {receipts.map((r) => (
            <ReceiptRow key={r.id} receipt={r} products={products} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReceiptRow({
  receipt,
  products,
}: {
  receipt: Receipt;
  products: Product[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function commitDelete() {
    startTransition(async () => {
      const res = await deleteReceiptAction(receipt.id);
      if (res.ok) {
        setConfirming(false);
        router.refresh();
      }
    });
  }

  const actionCounts: Record<string, number> = {};
  for (const l of receipt.lines) {
    actionCounts[l.action] = (actionCounts[l.action] ?? 0) + 1;
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {receipt.store || <span className="italic">Unknown store</span>}
              <span className="ml-2 text-muted-foreground font-normal text-xs">
                {receipt.date}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {receipt.lines.length} item{receipt.lines.length === 1 ? "" : "s"}
              {receipt.total !== null && (
                <span className="ml-1 tabular-nums">
                  · total {formatMoney(receipt.total)}
                </span>
              )}
              {Object.keys(actionCounts).length > 0 && (
                <>
                  {" · "}
                  {Object.entries(actionCounts)
                    .map(([k, v]) => `${v} ${k}`)
                    .join(", ")}
                </>
              )}
            </div>
          </div>
        </button>
        {confirming ? (
          <>
            <Button
              type="button"
              variant="destructive"
              size="xs"
              onClick={commitDelete}
              disabled={isPending}
              className="text-xs"
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setConfirming(true)}
            title="Delete receipt"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>

      {expanded && (
        <div className="pl-6 space-y-1 mt-2">
          {receipt.lines.map((l, i) => {
            const product = l.productId
              ? products.find((p) => p.id === l.productId)
              : null;
            return (
              <div
                key={`${receipt.id}-${i}`}
                className="flex items-center gap-2 text-xs"
              >
                <span className="font-mono flex-1 truncate text-muted-foreground">
                  {l.rawName}
                </span>
                <span className="tabular-nums w-14 text-right">
                  {formatMoney(l.price)}
                </span>
                <span
                  className={cn(
                    "w-20 text-right",
                    l.action === "updated" && "text-emerald-700",
                    l.action === "created" && "text-emerald-700",
                    l.action === "unchanged" && "text-muted-foreground",
                    l.action === "skipped" && "text-muted-foreground italic",
                    l.action === "ignored" && "text-muted-foreground italic"
                  )}
                >
                  {l.action}
                </span>
                <span className="w-32 text-right text-muted-foreground truncate">
                  {product?.name ?? ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
