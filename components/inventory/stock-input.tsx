"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { saveStockAction } from "@/app/(app)/inventory/actions";

export function StockInput({
  productId,
  initialValue,
}: {
  productId: string;
  initialValue: number;
}) {
  const [savedValue, setSavedValue] = useState(initialValue);
  const [draft, setDraft] = useState(formatForInput(initialValue));
  const [isPending, startTransition] = useTransition();
  const [showCheck, setShowCheck] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function commit() {
    const n = parseFloat(draft);
    if (!Number.isFinite(n) || n < 0) {
      setDraft(formatForInput(savedValue));
      setErrorMsg(null);
      return;
    }
    if (n === savedValue) return;

    setErrorMsg(null);
    startTransition(async () => {
      const result = await saveStockAction(productId, n);
      if (result.ok) {
        setSavedValue(n);
        setShowCheck(true);
        setTimeout(() => setShowCheck(false), 1200);
      } else {
        setErrorMsg(result.error);
        setDraft(formatForInput(savedValue));
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        step="0.001"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(formatForInput(savedValue));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="h-7 w-16 text-right text-xs"
        title={errorMsg ?? "Number of packages in stock"}
        aria-invalid={errorMsg ? true : undefined}
      />
      <span className="text-xs text-muted-foreground">pkg</span>
      {isPending && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
      {showCheck && !isPending && (
        <Check className="h-3 w-3 text-green-600" />
      )}
    </div>
  );
}

function formatForInput(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(n);
}
