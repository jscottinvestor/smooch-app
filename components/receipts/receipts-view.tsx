"use client";

import { CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CategoryPath } from "@/lib/category-paths";
import { bestProductMatch, classifyMatch } from "@/lib/matching";
import {
  extractPackageInfo,
  type ParsedReceipt,
} from "@/lib/receipt-parser";
import type { Category, Product, Receipt } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ReceiptHistory } from "./receipt-history";
import { ReceiptInput } from "./receipt-input";
import { ReceiptReview, type ReviewLine, type ReviewState } from "./receipt-review";

type Toast = { kind: "success" | "info"; message: string };

export function ReceiptsView({
  products,
  categories,
  categoryPaths,
  receipts,
}: {
  products: Product[];
  categories: Category[];
  categoryPaths: CategoryPath[];
  receipts: Receipt[];
}) {
  const [review, setReview] = useState<ReviewState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  function onParsed(parsed: ParsedReceipt) {
    const lines: ReviewLine[] = parsed.items.map((item) => {
      const { product, score } = bestProductMatch(
        item.rawName,
        parsed.store,
        products
      );
      const isMatch = classifyMatch(score) !== "none" && product !== null;
      const pkg = extractPackageInfo(item.rawName);
      const fallbackSize = pkg.packageSize > 0 ? pkg.packageSize : item.qty || 1;
      return {
        id: crypto.randomUUID(),
        rawName: item.rawName,
        qty: item.qty,
        price: item.price,
        score,
        mode: isMatch ? "match" : "new",
        productId: isMatch ? product!.id : null,
        markReceived: true,
        newProduct: {
          name: pkg.cleanName ? toTitleCase(pkg.cleanName) : item.rawName,
          categoryId: null,
          packageSize: fallbackSize,
          packageUnit: pkg.packageUnit,
        },
      };
    });
    setReview({
      store: parsed.store,
      ocrStore: parsed.ocrStore,
      date: parsed.date,
      total: parsed.total,
      lines,
    });
  }

  function onReopen(receipt: Receipt) {
    const lines: ReviewLine[] = receipt.lines.map((line) => {
      const { product, score } = bestProductMatch(
        line.rawName,
        receipt.store,
        products
      );
      const isMatch = classifyMatch(score) !== "none" && product !== null;
      const pkg = extractPackageInfo(line.rawName);
      const fallbackSize = pkg.packageSize > 0 ? pkg.packageSize : line.qty || 1;
      // Don't double-bump stock for lines that already applied successfully.
      const alreadyApplied =
        line.action === "created" ||
        line.action === "updated" ||
        line.action === "unchanged";
      return {
        id: crypto.randomUUID(),
        rawName: line.rawName,
        qty: line.qty,
        price: line.price,
        score,
        mode: isMatch ? "match" : "new",
        productId: isMatch ? product!.id : null,
        markReceived: !alreadyApplied,
        newProduct: {
          name: pkg.cleanName ? toTitleCase(pkg.cleanName) : line.rawName,
          categoryId: null,
          packageSize: fallbackSize,
          packageUnit: pkg.packageUnit,
        },
      };
    });
    setReview({
      store: receipt.store,
      date: receipt.date,
      total: receipt.total,
      lines,
      existingReceiptId: receipt.id,
    });
  }

  if (review) {
    return (
      <div className="space-y-4">
        <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
        <ReceiptReview
          state={review}
          onChange={setReview}
          products={products}
          categories={categories}
          categoryPaths={categoryPaths}
          onDone={(t) => {
            setReview(null);
            if (t) setToast(t);
          }}
          onCancel={() => setReview(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
      <ReceiptInput
        onParsed={(parsed) => {
          if (parsed.items.length === 0) {
            setToast({
              kind: "info",
              message:
                "Couldn't read any line-items from that photo. Try a clearer shot.",
            });
            return;
          }
          onParsed(parsed);
        }}
      />
      <ReceiptHistory
        receipts={receipts}
        products={products}
        onReopen={onReopen}
      />
    </div>
  );
}

function ToastBanner({
  toast,
  onDismiss,
}: {
  toast: Toast | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  const isSuccess = toast.kind === "success";
  const Icon = isSuccess ? CheckCircle2 : Info;
  return (
    <div
      className={cn(
        "rounded-md border-2 px-4 py-3 flex items-start gap-3",
        isSuccess
          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
          : "bg-amber-50 border-amber-300 text-amber-900"
      )}
      role="status"
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm leading-snug">
        <div className="font-semibold">
          {isSuccess ? "Success!" : "Heads up"}
        </div>
        <div>{toast.message}</div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onDismiss}
        className="-mt-1 -mr-1"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
