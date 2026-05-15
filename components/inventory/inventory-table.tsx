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

export function InventoryTable({
  entries,
  categoryPaths,
}: {
  entries: InventoryEntry[];
  categoryPaths: CategoryPath[];
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
          />
        );
      }
    }
  }

  return (
    <div className="overflow-x-auto">
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
            <TableHead>History</TableHead>
            <TableHead className="pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">{rows}</TableBody>
      </Table>
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
}: {
  product: Product;
  indent: boolean;
  categoryPaths: CategoryPath[];
}) {
  const stockKey: keyof typeof STATUS_STYLES =
    p.stock <= 0 ? "out" : p.stock < 0.25 ? "low" : "ok";
  const stockLabel = stockKey === "out" ? "Out" : stockKey === "low" ? "Low" : "OK";

  const pricePerUnit =
    p.packageSize > 0 && p.price > 0 ? p.price / p.packageSize : null;

  return (
    <TableRow className="hover:bg-muted/20">
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
        <ProductDialog categoryPaths={categoryPaths} product={p}>
          <Button variant="ghost" size="icon-xs" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
        </ProductDialog>
      </TableCell>
    </TableRow>
  );
}
