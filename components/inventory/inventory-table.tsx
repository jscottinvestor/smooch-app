import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategoryPath } from "@/lib/category-paths";
import { formatMoney, formatQty } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriceHistoryDialog } from "./price-history-dialog";
import { ProductDialog } from "./product-dialog";
import { StockInput } from "./stock-input";

export type InventoryEntry =
  | { type: "flat"; sortKey: string; product: Product }
  | { type: "group"; sortKey: string; label: string; products: Product[] }
  | { type: "empty"; sortKey: string; label: string; categoryId: string };

const STATUS_STYLES = {
  out: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200",
  low: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
  ok: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
} as const;

const ROW_TONE = {
  out: "bg-red-50/60",
  low: "bg-amber-50/60",
  ok: "",
} as const;

const CARD_TONE = {
  out: "bg-red-50 border-red-400",
  low: "bg-amber-50 border-amber-400",
  ok: "bg-card border-border",
} as const;

export function InventoryTable({
  entries,
  categoryPaths,
  existingStores,
}: {
  entries: InventoryEntry[];
  categoryPaths: CategoryPath[];
  existingStores: string[];
}) {
  const rows: React.ReactNode[] = [];
  for (const e of entries) {
    if (e.type === "flat") {
      rows.push(
        <ProductRow
          key={`f-${e.product.id}`}
          product={e.product}
          indent={false}
          categoryPaths={categoryPaths}
          existingStores={existingStores}
        />
      );
    } else if (e.type === "empty") {
      rows.push(
        <SubgroupHeader key={`eh-${e.categoryId}`} label={e.label} count={0} />
      );
      rows.push(
        <TableRow key={`er-${e.categoryId}`} className="hover:bg-transparent">
          <TableCell
            colSpan={9}
            className="pl-10 py-2 text-xs text-muted-foreground"
          >
            <ProductDialog
              categoryPaths={categoryPaths}
              defaultCategoryId={e.categoryId}
              existingStores={existingStores}
            >
              <Button
                variant="ghost"
                size="xs"
                className="text-xs text-muted-foreground hover:text-foreground -ml-2"
              >
                <Plus className="w-3 h-3" />
                Add a product
              </Button>
            </ProductDialog>
          </TableCell>
        </TableRow>
      );
    } else {
      rows.push(
        <SubgroupHeader
          key={`gh-${e.label}-${e.products[0]?.id ?? ""}`}
          label={e.label}
          count={e.products.length}
        />
      );
      for (const p of e.products) {
        rows.push(
          <ProductRow
            key={`g-${p.id}`}
            product={p}
            indent={true}
            categoryPaths={categoryPaths}
            existingStores={existingStores}
          />
        );
      }
    }
  }

  return (
    <>
      {/* Desktop — full 9-column table */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20 [&_th]:h-9 [&_th]:font-normal [&_th]:text-[11px] [&_th]:tracking-wide [&_th]:uppercase [&_th]:text-muted-foreground">
              <TableHead className="pl-5">Product</TableHead>
              <TableHead>Store</TableHead>
              <TableHead className="text-right">Package</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">$/unit</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Hist.</TableHead>
              <TableHead className="pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
            {rows}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — stacked cards */}
      <div className="md:hidden p-3 space-y-3">
        {entries.map((e) => {
          if (e.type === "flat") {
            return (
              <ProductCard
                key={`mf-${e.product.id}`}
                product={e.product}
                categoryPaths={categoryPaths}
                existingStores={existingStores}
              />
            );
          }
          if (e.type === "empty") {
            return (
              <div key={`me-${e.categoryId}`} className="px-1 pt-1">
                <div className="font-display text-sm text-foreground/80 mb-1">
                  {e.label}
                </div>
                <ProductDialog
                  categoryPaths={categoryPaths}
                  defaultCategoryId={e.categoryId}
                  existingStores={existingStores}
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-xs text-muted-foreground hover:text-foreground -ml-2"
                  >
                    <Plus className="w-3 h-3" />
                    Add a product
                  </Button>
                </ProductDialog>
              </div>
            );
          }
          return (
            <div key={`mg-${e.label}`} className="space-y-2">
              <div className="font-display text-sm text-foreground/80 px-1 pt-1">
                {e.label}
                <span className="ml-2 text-xs text-muted-foreground font-sans tabular-nums">
                  {e.products.length}
                </span>
              </div>
              {e.products.map((p) => (
                <ProductCard
                  key={`mp-${p.id}`}
                  product={p}
                  categoryPaths={categoryPaths}
                  existingStores={existingStores}
                />
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ProductCard({
  product: p,
  categoryPaths,
  existingStores,
}: {
  product: Product;
  categoryPaths: CategoryPath[];
  existingStores: string[];
}) {
  const stockKey: keyof typeof STATUS_STYLES =
    p.stock <= 0 ? "out" : p.stock < 0.25 ? "low" : "ok";
  const stockLabel =
    stockKey === "out" ? "Out" : stockKey === "low" ? "Low" : "In Stock";

  const meta: string[] = [];
  if (p.store) meta.push(p.store);
  if (p.packageSize > 0) meta.push(`${formatQty(p.packageSize)} ${p.packageUnit}`);
  if (p.price > 0) meta.push(formatMoney(p.price));

  const pricePerUnit =
    p.packageSize > 0 && p.price > 0 ? p.price / p.packageSize : null;

  return (
    <div
      className={cn(
        "rounded-md border-2 p-3 transition-colors",
        CARD_TONE[stockKey]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="font-medium leading-snug break-words">{p.name}</div>
          {meta.length > 0 && (
            <div className="text-xs text-muted-foreground">{meta.join(" · ")}</div>
          )}
          {pricePerUnit !== null && (
            <div className="text-[11px] text-muted-foreground tabular-nums">
              ${pricePerUnit.toFixed(4)}/{p.packageUnit}
            </div>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
            STATUS_STYLES[stockKey]
          )}
        >
          {stockLabel}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Stock</span>
          <StockInput productId={p.id} initialValue={p.stock} />
        </div>
        <div className="flex items-center gap-1">
          {p.priceHistory.length > 0 && (
            <span className="text-[11px] text-muted-foreground mr-1">
              History <PriceHistoryDialog product={p} />
            </span>
          )}
          <ProductDialog categoryPaths={categoryPaths} product={p} existingStores={existingStores}>
            <Button variant="ghost" size="icon-xs" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
          </ProductDialog>
        </div>
      </div>
    </div>
  );
}

function SubgroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <TableRow className="hover:bg-transparent border-t border-border/60">
      <TableCell
        colSpan={9}
        className="px-5 pt-4 pb-1 font-display text-sm text-foreground/80"
      >
        {label}
        <span className="ml-2 text-xs text-muted-foreground font-sans tabular-nums">
          {count}
        </span>
      </TableCell>
    </TableRow>
  );
}

function ProductRow({
  product: p,
  indent,
  categoryPaths,
  existingStores,
}: {
  product: Product;
  indent: boolean;
  categoryPaths: CategoryPath[];
  existingStores: string[];
}) {
  const stockKey: keyof typeof STATUS_STYLES =
    p.stock <= 0 ? "out" : p.stock < 0.25 ? "low" : "ok";
  const stockLabel = stockKey === "out" ? "Out" : stockKey === "low" ? "Low" : "In Stock";

  const pricePerUnit =
    p.packageSize > 0 && p.price > 0 ? p.price / p.packageSize : null;

  return (
    <TableRow className={cn("hover:bg-muted/20", ROW_TONE[stockKey])}>
      <TableCell className={cn("font-medium pl-5", indent && "pl-10")}>
        {p.name}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {p.store || <span className="opacity-50">—</span>}
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">
        {p.packageSize > 0 ? (
          `${formatQty(p.packageSize)} ${p.packageUnit}`
        ) : (
          <span className="text-muted-foreground">
            <span className="opacity-50">—</span> {p.packageUnit}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {p.price > 0 ? (
          formatMoney(p.price)
        ) : (
          <span className="text-muted-foreground opacity-50">—</span>
        )}
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
        {pricePerUnit !== null
          ? `$${pricePerUnit.toFixed(4)}/${p.packageUnit}`
          : <span className="opacity-50">—</span>}
      </TableCell>
      <TableCell>
        <StockInput productId={p.id} initialValue={p.stock} />
      </TableCell>
      <TableCell className="text-center">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            STATUS_STYLES[stockKey]
          )}
        >
          {stockLabel}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {p.priceHistory.length === 0 ? (
          <span className="opacity-50">—</span>
        ) : (
          <PriceHistoryDialog product={p} />
        )}
      </TableCell>
      <TableCell className="text-right pr-4">
        <ProductDialog categoryPaths={categoryPaths} product={p} existingStores={existingStores}>
          <Button variant="ghost" size="icon-xs" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
        </ProductDialog>
      </TableCell>
    </TableRow>
  );
}
