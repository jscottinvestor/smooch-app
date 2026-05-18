"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/(app)/inventory/actions";
import type { CategoryPath } from "@/lib/category-paths";
import { formatMoney } from "@/lib/format";
import type { Product, ProductConversion, Unit } from "@/lib/types";
import { ALL_UNITS } from "@/lib/units";
import { cn } from "@/lib/utils";

interface ProductDialogProps {
  categoryPaths: CategoryPath[];
  defaultCategoryId?: string;
  /** Pre-fill the Name field in create mode (e.g. from a recipe ingredient). */
  defaultName?: string;
  /** When set, dialog opens in edit mode for this product. */
  product?: Product;
  /** Existing store names from other products, fed into the Store dropdown. */
  existingStores: string[];
  /** External open-state control. When provided, internal state is bypassed. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Fires after a successful create with the new product's id. */
  onCreated?: (productId: string) => void;
  /** Trigger element. Optional when externally controlled via `open`. */
  children?: React.ReactElement;
}

const NEW_STORE_VALUE = "__add_new_store__";
const NO_STORE_VALUE = "__no_store__";

export function ProductDialog({
  categoryPaths,
  defaultCategoryId,
  defaultName,
  product,
  existingStores,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  onCreated,
  children,
}: ProductDialogProps) {
  const router = useRouter();
  const isEdit = !!product;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChangeProp?.(next);
  };
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(product?.name ?? defaultName ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    product?.categoryId ?? defaultCategoryId ?? ""
  );
  const [store, setStore] = useState(product?.store ?? "");
  const [storeMode, setStoreMode] = useState<"select" | "new">("select");
  const [packageSize, setPackageSize] = useState(
    product ? String(product.packageSize) : ""
  );
  const [packageUnit, setPackageUnit] = useState<string>(
    product?.packageUnit ?? "g"
  );
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [conversions, setConversions] = useState<ProductConversion[]>(
    product?.conversions ?? []
  );

  function resetForm() {
    if (product) {
      setName(product.name);
      setCategoryId(product.categoryId ?? "");
      setStore(product.store ?? "");
      setPackageSize(String(product.packageSize));
      setPackageUnit(product.packageUnit);
      setPrice(String(product.price));
      setStock(String(product.stock));
      setConversions(product.conversions ?? []);
    } else {
      setName(defaultName ?? "");
      setCategoryId(defaultCategoryId ?? "");
      setStore("");
      setPackageSize("");
      setPackageUnit("g");
      setPrice("");
      setStock("");
      setConversions([]);
    }
    setStoreMode("select");
    setError(null);
    setConfirmDelete(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!categoryId) {
      setError("Pick a category");
      return;
    }

    setError(null);
    startTransition(async () => {
      // Drop empty/invalid conversion rows on save
      const cleanedConversions = conversions.filter(
        (c) =>
          c.fromQty > 0 &&
          c.toQty > 0 &&
          c.fromUnit &&
          c.toUnit &&
          c.fromUnit !== c.toUnit
      );
      const input = {
        name: name.trim(),
        categoryId,
        store: store.trim() || null,
        packageSize: parseFloat(packageSize) || 0,
        packageUnit,
        price: parseFloat(price) || 0,
        stock: parseFloat(stock) || 0,
        conversions: cleanedConversions,
      };
      const result = product
        ? await updateProductAction(product.id, input)
        : await createProductAction(input);

      if (result.ok) {
        if (!product && "id" in result && typeof result.id === "string") {
          onCreated?.(result.id);
        }
        resetForm();
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function onConfirmDelete() {
    if (!product) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (result.ok) {
        setConfirmDelete(false);
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {children && <DialogTrigger render={children} />}
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? `Edit ${product.name}` : "New product"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., KS Unsalted Butter"
                autoFocus
              />
            </Field>

            <Field label="Category" required>
              <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "")}
                items={categoryPaths.map((c) => ({
                  value: c.id,
                  label: c.label,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryPaths.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span
                        className={cn(
                          c.depth === 0 &&
                            "font-semibold uppercase text-xs tracking-wider"
                        )}
                      >
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Store">
              {storeMode === "select" ? (
                <Select
                  value={store || NO_STORE_VALUE}
                  onValueChange={(v) => {
                    if (v === NEW_STORE_VALUE) {
                      setStoreMode("new");
                      setStore("");
                    } else if (v === NO_STORE_VALUE) {
                      setStore("");
                    } else if (v) {
                      setStore(v);
                    }
                  }}
                  items={[
                    { value: NO_STORE_VALUE, label: "—" },
                    ...existingStores.map((s) => ({ value: s, label: s })),
                    { value: NEW_STORE_VALUE, label: "+ Add a new store…" },
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_STORE_VALUE}>
                      <span className="text-muted-foreground">—</span>
                    </SelectItem>
                    {existingStores.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_STORE_VALUE}>
                      <span className="text-primary font-medium">
                        + Add a new store…
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    placeholder="New store name"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStoreMode("select");
                      setStore(product?.store ?? "");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Package size">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={packageSize}
                  onChange={(e) => setPackageSize(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Unit">
                <Select
                  value={packageUnit}
                  onValueChange={(v) => {
                    if (v) setPackageUnit(v);
                  }}
                  items={ALL_UNITS.map((u) => ({ value: u, label: u }))}
                >
                  <SelectTrigger className="w-full">
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
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price ($)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field label={isEdit ? "Stock (packages)" : "Initial stock"}>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>

            <ConversionsEditor
              conversions={conversions}
              onChange={setConversions}
              productPackageUnit={packageUnit}
            />

            {isEdit && product.priceHistory.length > 0 && (
              <details className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <summary className="cursor-pointer font-medium">
                  Price history ({product.priceHistory.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {[...product.priceHistory].reverse().map((h, i) => (
                    <div
                      key={`${h.date}-${i}`}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-muted-foreground">
                        {h.date}
                        {h.source === "receipt" && (
                          <span className="ml-1 italic opacity-70">
                            via receipt
                          </span>
                        )}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatMoney(h.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              {isEdit ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending}
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? isEdit
                      ? "Saving…"
                      : "Creating…"
                    : isEdit
                      ? "Save"
                      : "Create"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{product?.name}</span>{" "}
            will be permanently deleted, including its price history. Any recipe
            referencing it will be unlinked. This can't be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ConversionsEditor({
  conversions,
  onChange,
  productPackageUnit,
}: {
  conversions: ProductConversion[];
  onChange: (next: ProductConversion[]) => void;
  productPackageUnit: string;
}) {
  function update(i: number, patch: Partial<ProductConversion>) {
    onChange(conversions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function remove(i: number) {
    onChange(conversions.filter((_, idx) => idx !== i));
  }
  function add() {
    // Sensible default: 1 cup → N {package unit}. User edits to taste.
    onChange([
      ...conversions,
      {
        fromQty: 1,
        fromUnit: "cup" as Unit,
        toQty: 0,
        toUnit: (productPackageUnit as Unit) || ("g" as Unit),
      },
    ]);
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Unit conversions</Label>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Used when a recipe asks for a unit that doesn't match this product's
        package unit. Example: <span className="font-medium">1 cup = 120 g</span>.
      </p>
      {conversions.length > 0 && (
        <div className="space-y-1.5">
          {conversions.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-sm"
            >
              <Input
                type="number"
                step="0.001"
                min="0"
                value={String(c.fromQty)}
                onChange={(e) =>
                  update(i, { fromQty: parseFloat(e.target.value) || 0 })
                }
                className="h-8 w-14 text-right text-xs tabular-nums"
              />
              <Select
                value={c.fromUnit}
                onValueChange={(v) => v && update(i, { fromUnit: v as Unit })}
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
              <span className="text-muted-foreground px-1">=</span>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={String(c.toQty)}
                onChange={(e) =>
                  update(i, { toQty: parseFloat(e.target.value) || 0 })
                }
                className="h-8 w-16 text-right text-xs tabular-nums"
              />
              <Select
                value={c.toUnit}
                onValueChange={(v) => v && update(i, { toUnit: v as Unit })}
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
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => remove(i)}
                title="Remove this conversion"
                className="ml-auto text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={add}
        className="text-xs text-muted-foreground hover:text-foreground -ml-2"
      >
        <Plus className="w-3 h-3" />
        Add conversion
      </Button>
    </div>
  );
}
