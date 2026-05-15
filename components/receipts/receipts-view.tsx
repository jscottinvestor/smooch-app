"use client";

import { useState } from "react";
import type { CategoryPath } from "@/lib/category-paths";
import { bestProductMatch, classifyMatch } from "@/lib/matching";
import {
  extractPackageInfo,
  type ParsedReceipt,
} from "@/lib/receipt-parser";
import type { Category, Product, Receipt } from "@/lib/types";
import { ReceiptHistory } from "./receipt-history";
import { ReceiptInput } from "./receipt-input";
import { ReceiptReview, type ReviewLine, type ReviewState } from "./receipt-review";

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
    });
  }

  if (review) {
    return (
      <ReceiptReview
        state={review}
        onChange={setReview}
        products={products}
        categories={categories}
        categoryPaths={categoryPaths}
        onDone={() => setReview(null)}
        onCancel={() => setReview(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      <ReceiptInput
        onParsed={(parsed) => {
          if (parsed.items.length === 0) {
            alert(
              "I couldn't read any line-items from that photo. Try a clearer shot."
            );
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

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
