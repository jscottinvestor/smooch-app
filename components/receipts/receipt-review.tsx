"use client";

import { CornerUpLeft, Undo, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyReceiptAction,
  saveReceiptForLaterAction,
  type ApplyLineInput,
} from "@/app/(app)/receipts/actions";
import type { CategoryPath } from "@/lib/category-paths";
import { formatMoney } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { ALL_UNITS } from "@/lib/units";
import { cn } from "@/lib/utils";

const SENTINEL_NEW = "__new__";
const SENTINEL_SKIP = "__skip__";
const SENTINEL_NO_CATEGORY = "__none__";

export interface ReviewLine {
  id: string;
  rawName: string;
  qty: number;
  price: number;
  score: number;
  mode: "match" | "new" | "skip";
  productId: string | null;
  markReceived: boolean;
  newProduct: {
    name: string;
    categoryId: string | null;
    packageSize: number;
    packageUnit: string;
  };
}

export interface ReviewState {
  store: string;
  date: string;
  total: number | null;
  lines: ReviewLine[];
}

export function ReceiptReview({
  state,
  onChange,
  products,
  categories,
  categoryPaths,
  onDone,
  onCancel,
}: {
  state: ReviewState;
  onChange: (next: ReviewState) => void;
  products: Product[];
  categories: Category[];
  categoryPaths: CategoryPath[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const counts = {
    matched: state.lines.filter((l) => l.mode === "match").length,
    newWithCat: state.lines.filter(
      (l) => l.mode === "new" && l.newProduct.categoryId
    ).length,
    ignored: state.lines.filter(
      (l) => l.mode === "new" && !l.newProduct.categoryId
    ).length,
    skipped: state.lines.filter((l) => l.mode === "skip").length,
  };

  function updateLine(id: string, patch: Partial<ReviewLine>) {
    onChange({
      ...state,
      lines: state.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  }

  function updateLineNewProduct(
    id: string,
    patch: Partial<ReviewLine["newProduct"]>
  ) {
    onChange({
      ...state,
      lines: state.lines.map((l) =>
        l.id === id ? { ...l, newProduct: { ...l.newProduct, ...patch } } : l
      ),
    });
  }

  function buildInput() {
    return {
      date: state.date,
      store: state.store.trim(),
      total: state.total,
      lines: state.lines.map<ApplyLineInput>((l) => ({
        rawName: l.rawName,
        qty: l.qty,
        price: l.price,
        mode: l.mode,
        productId: l.productId,
        markReceived: l.markReceived,
        newProduct: l.newProduct,
      })),
    };
  }

  function onApply() {
    setError(null);
    const input = buildInput();
    startTransition(async () => {
      const res = await applyReceiptAction(input);
      if (res.ok) {
        const s = res.summary;
        const bits: string[] = [];
        if (s.updated) bits.push(`${s.updated} price${s.updated === 1 ? "" : "s"} updated`);
        if (s.unchanged) bits.push(`${s.unchanged} unchanged`);
        if (s.created) bits.push(`${s.created} new product${s.created === 1 ? "" : "s"} created`);
        if (s.stockBumped) bits.push(`${s.stockBumped} pkg added to stock`);
        if (s.skipped) bits.push(`${s.skipped} skipped`);
        if (s.ignored) bits.push(`${s.ignored} ignored`);
        alert("Done. " + bits.join(", ") + ".");
        onDone();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onSaveForLater() {
    setError(null);
    const input = buildInput();
    startTransition(async () => {
      const res = await saveReceiptForLaterAction(input);
      if (res.ok) {
        alert(
          "Saved. The receipt's in your history — Reopen it from the list when you're ready to apply."
        );
        onDone();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card className="shadow-sm shadow-foreground/[0.03] overflow-hidden">
      <CardHeader className="pb-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2
            className="font-display text-2xl tracking-tight"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
          >
            Review receipt
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            <CornerUpLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Store</Label>
            <Input
              value={state.store}
              onChange={(e) => onChange({ ...state, store: e.target.value })}
              placeholder="e.g., Costco"
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Date</Label>
            <Input
              type="date"
              value={state.date}
              onChange={(e) => onChange({ ...state, date: e.target.value })}
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Total</Label>
            <Input
              type="number"
              step="0.01"
              value={state.total ?? ""}
              onChange={(e) =>
                onChange({
                  ...state,
                  total: e.target.value === "" ? null : parseFloat(e.target.value),
                })
              }
              className="h-8 tabular-nums"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="text-emerald-700 font-medium">{counts.matched}</span>{" "}
          matched ·{" "}
          <span className="text-foreground font-medium">{counts.newWithCat}</span>{" "}
          new ·{" "}
          <span>{counts.ignored}</span> will be ignored ·{" "}
          <span>{counts.skipped}</span> skipped
        </p>
      </CardHeader>
      <CardContent className="p-0 border-t bg-muted/10">
        <div className="space-y-2.5 p-4">
          {state.lines.map((line) => (
            <ReviewRow
              key={line.id}
              line={line}
              products={products}
              categories={categories}
              categoryPaths={categoryPaths}
              onUpdate={(patch) => updateLine(line.id, patch)}
              onUpdateNewProduct={(patch) => updateLineNewProduct(line.id, patch)}
            />
          ))}
        </div>
        {error && (
          <p className="m-4 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t p-4 bg-card">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveForLater}
            disabled={isPending}
            title="Save the receipt to history without changing any products. You can apply it later from the past-receipts list."
          >
            Save for later
          </Button>
          <Button type="button" onClick={onApply} disabled={isPending}>
            {isPending ? "Working…" : "Apply receipt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewRow({
  line,
  products,
  categories,
  categoryPaths,
  onUpdate,
  onUpdateNewProduct,
}: {
  line: ReviewLine;
  products: Product[];
  categories: Category[];
  categoryPaths: CategoryPath[];
  onUpdate: (patch: Partial<ReviewLine>) => void;
  onUpdateNewProduct: (patch: Partial<ReviewLine["newProduct"]>) => void;
}) {
  const matched = line.productId
    ? products.find((p) => p.id === line.productId)
    : null;
  const qty = line.qty > 0 ? line.qty : 1;
  const lineUnitPrice = line.price / qty;
  const unitPriceDelta = matched ? lineUnitPrice - matched.price : 0;

  const willBeIgnored = line.mode === "new" && !line.newProduct.categoryId;

  const tone =
    line.mode === "skip"
      ? "bg-stone-100 border-stone-400 opacity-60"
      : line.mode === "match"
        ? "bg-emerald-50 border-emerald-400"
        : willBeIgnored
          ? "bg-stone-100 border-stone-400"
          : "bg-amber-50 border-amber-400";

  const tag =
    line.mode === "skip"
      ? { label: "skipped", className: "bg-stone-200 text-stone-700" }
      : line.mode === "match"
        ? { label: "match", className: "bg-emerald-200 text-emerald-900" }
        : willBeIgnored
          ? {
              label: "will be ignored",
              className: "bg-stone-200 text-stone-700",
            }
          : { label: "new product", className: "bg-amber-200 text-amber-900" };

  return (
    <div
      className={cn(
        "rounded-md border-2 p-3 space-y-2 transition-colors",
        tone
      )}
    >
      {/* Header row: rawName + price input + skip toggle */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                tag.className
              )}
            >
              {tag.label}
            </span>
          </div>
          <div className="text-sm font-medium font-mono tracking-tight truncate">
            {line.rawName}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            qty {line.qty}
            {qty > 1 && (
              <span className="ml-1">
                ({formatMoney(lineUnitPrice)}/pkg)
              </span>
            )}
            {matched && (
              <>
                {" · was "}
                {formatMoney(matched.price)}/pkg
                {Math.abs(unitPriceDelta) > 0.005 && (
                  <span
                    className={cn(
                      "ml-1 font-medium",
                      unitPriceDelta > 0 ? "text-red-700" : "text-emerald-700"
                    )}
                  >
                    {unitPriceDelta > 0 ? "+" : ""}
                    {formatMoney(unitPriceDelta)}/pkg
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={String(line.price)}
            onChange={(e) =>
              onUpdate({ price: parseFloat(e.target.value) || 0 })
            }
            className="h-8 w-20 text-right text-xs tabular-nums"
          />
          {line.mode !== "skip" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onUpdate({ mode: "skip" })}
              title="Skip this row"
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() =>
                onUpdate({ mode: line.productId ? "match" : "new" })
              }
              title="Restore"
              className="text-muted-foreground hover:text-foreground"
            >
              <Undo className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {line.mode === "skip" ? (
        <p className="text-xs italic text-muted-foreground">Skipped</p>
      ) : line.mode === "match" ? (
        <MatchControls
          line={line}
          products={products}
          onUpdate={onUpdate}
        />
      ) : (
        <NewControls
          line={line}
          products={products}
          categories={categories}
          categoryPaths={categoryPaths}
          onUpdate={onUpdate}
          onUpdateNewProduct={onUpdateNewProduct}
        />
      )}
    </div>
  );
}

function MatchControls({
  line,
  products,
  onUpdate,
}: {
  line: ReviewLine;
  products: Product[];
  onUpdate: (patch: Partial<ReviewLine>) => void;
}) {
  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const items = [
    { value: SENTINEL_NEW, label: "✨ Create as new product" },
    { value: SENTINEL_SKIP, label: "× Skip this row" },
    ...sorted.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="space-y-2 pl-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground">
          Will update this product:
        </span>
        <button
          type="button"
          onClick={() => onUpdate({ mode: "new", productId: null })}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Wrong match? Create as new product →
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-[11px] text-muted-foreground w-16 shrink-0">
          Match to
        </Label>
        <Select
          value={line.productId ?? ""}
          onValueChange={(v) => {
            if (v === SENTINEL_NEW) onUpdate({ mode: "new" });
            else if (v === SENTINEL_SKIP) onUpdate({ mode: "skip" });
            else if (v) onUpdate({ productId: v });
          }}
          items={items}
        >
          <SelectTrigger
            size="sm"
            className="h-8 flex-1 min-w-[180px] text-xs"
          >
            <SelectValue placeholder="Pick a product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL_NEW}>
              <span className="font-medium">✨ Create as new product</span>
            </SelectItem>
            <SelectItem value={SENTINEL_SKIP}>
              <span className="text-muted-foreground">× Skip this row</span>
            </SelectItem>
            {sorted.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.store && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    · {p.store}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={line.markReceived}
            onChange={(e) => onUpdate({ markReceived: e.target.checked })}
          />
          +{line.qty} pkg
        </label>
      </div>
    </div>
  );
}

function NewControls({
  line,
  products,
  categories,
  categoryPaths,
  onUpdate,
  onUpdateNewProduct,
}: {
  line: ReviewLine;
  products: Product[];
  categories: Category[];
  categoryPaths: CategoryPath[];
  onUpdate: (patch: Partial<ReviewLine>) => void;
  onUpdateNewProduct: (patch: Partial<ReviewLine["newProduct"]>) => void;
}) {
  const sortedProducts = [...products].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const noCategory = !line.newProduct.categoryId;

  return (
    <div className="space-y-2 pl-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground">
          {noCategory
            ? "Pick a category to create as a new product, or match to an existing one →"
            : "Will create a new product:"}
        </span>
        <button
          type="button"
          onClick={() => onUpdate({ mode: "match" })}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Match to existing…
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-[11px] text-muted-foreground w-14 shrink-0">
            Category
          </Label>
          <Select
            value={line.newProduct.categoryId ?? ""}
            onValueChange={(v) => {
              const newId = v === SENTINEL_NO_CATEGORY || !v ? null : v;
              onUpdateNewProduct({ categoryId: newId });
            }}
            items={[
              { value: SENTINEL_NO_CATEGORY, label: "(ignore this row)" },
              ...categoryPaths.map((c) => ({ value: c.id, label: c.label })),
            ]}
          >
            <SelectTrigger size="sm" className="h-8 flex-1 text-xs">
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SENTINEL_NO_CATEGORY}>
                <span className="italic text-muted-foreground">
                  (ignore this row)
                </span>
              </SelectItem>
              {categoryPaths.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-[11px] text-muted-foreground w-14 shrink-0">
            Name
          </Label>
          <Input
            value={line.newProduct.name}
            onChange={(e) => onUpdateNewProduct({ name: e.target.value })}
            placeholder="Product name"
            className="h-8 flex-1 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-[11px] text-muted-foreground w-14 shrink-0">
            Size
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={String(line.newProduct.packageSize)}
            onChange={(e) =>
              onUpdateNewProduct({
                packageSize: parseFloat(e.target.value) || 0,
              })
            }
            className="h-8 w-20 text-right text-xs tabular-nums"
          />
          <Select
            value={line.newProduct.packageUnit}
            onValueChange={(v) => v && onUpdateNewProduct({ packageUnit: v })}
            items={ALL_UNITS.map((u) => ({ value: u, label: u }))}
          >
            <SelectTrigger size="sm" className="h-8 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={line.markReceived}
            onChange={(e) => onUpdate({ markReceived: e.target.checked })}
            disabled={noCategory}
          />
          Initial stock: +{line.qty} pkg
        </label>
      </div>
    </div>
  );
}
