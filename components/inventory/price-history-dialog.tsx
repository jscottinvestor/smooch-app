"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export function PriceHistoryDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const entries = [...product.priceHistory].reverse(); // most recent first

  // Per-row trend hint (vs the entry immediately older than it)
  const trends = entries.map((entry, i) => {
    const older = entries[i + 1];
    if (!older) return null;
    if (entry.price > older.price) return "up" as const;
    if (entry.price < older.price) return "down" as const;
    return "same" as const;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="text-xs tabular-nums cursor-pointer underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
        title="View price history"
      >
        {product.priceHistory.length}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-normal">
            Price history
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{product.name}</p>
        </DialogHeader>
        <div className="space-y-1.5 text-sm max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {entries.map((entry, i) => {
            const trend = trends[i];
            return (
              <div
                key={`${entry.date}-${i}`}
                className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-1.5 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="text-muted-foreground tabular-nums">
                    {entry.date}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70 italic">
                    {entry.source === "receipt" ? "via receipt" : "manual edit"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-medium tabular-nums">
                    {formatMoney(entry.price)}
                  </div>
                  {trend === "up" && (
                    <div className="text-[11px] text-red-700">↑ increase</div>
                  )}
                  {trend === "down" && (
                    <div className="text-[11px] text-emerald-700">
                      ↓ decrease
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
