"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductDialog } from "@/components/inventory/product-dialog";
import { setIngredientProductAction } from "@/app/(app)/recipes/actions";
import type { CategoryPath } from "@/lib/category-paths";
import { productSkuDetail } from "@/lib/format";
import type { Product } from "@/lib/types";

const UNLINK = "__unlink__";
const CREATE_NEW = "__create_new_product__";

export function IngredientProductPicker({
  recipeId,
  ingredientId,
  ingredientName,
  productId,
  products,
  categoryPaths,
  existingStores,
}: {
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  productId: string | null;
  products: Product[];
  categoryPaths: CategoryPath[];
  existingStores: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));

  const items = [
    { value: UNLINK, label: "— Unlink —" },
    ...sorted.map((p) => ({ value: p.id, label: p.name })),
    { value: CREATE_NEW, label: "+ Create new product…" },
  ];

  const currentValue = productId ?? "";

  function onValueChange(v: string | null) {
    if (v === CREATE_NEW) {
      // Open the New Product dialog with this ingredient's name pre-filled.
      // Don't change the linked product yet — onCreated below does that
      // once the new product is actually saved.
      setCreateOpen(true);
      return;
    }
    const newProductId = v === UNLINK || !v || v === "" ? null : v;
    if (newProductId === productId) return;

    startTransition(async () => {
      const res = await setIngredientProductAction(
        recipeId,
        ingredientId,
        newProductId
      );
      if (res.ok) router.refresh();
    });
  }

  function onProductCreated(newProductId: string) {
    // Auto-link the freshly created product to this ingredient. router.refresh
    // is already called by ProductDialog after save; we follow up with the
    // link action and another refresh so the dropdown shows the new link.
    startTransition(async () => {
      const res = await setIngredientProductAction(
        recipeId,
        ingredientId,
        newProductId
      );
      if (res.ok) router.refresh();
    });
  }

  return (
    <>
      <Select
        value={currentValue}
        onValueChange={onValueChange}
        items={items}
        disabled={isPending}
      >
        <SelectTrigger
          size="sm"
          className="h-7 w-full max-w-[260px] text-xs font-normal data-placeholder:italic"
        >
          <SelectValue placeholder="— pick a product —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNLINK}>
            <span className="italic text-muted-foreground">— Unlink —</span>
          </SelectItem>
          {sorted.map((p) => {
            const sub = productSkuDetail(p);
            return (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex flex-col items-start gap-0 leading-snug">
                  <span className="text-sm">{p.name}</span>
                  {sub && (
                    <span className="text-[11px] text-muted-foreground">
                      {sub}
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
          <SelectItem value={CREATE_NEW}>
            <span className="text-primary font-medium">
              + Create new product…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <ProductDialog
        categoryPaths={categoryPaths}
        existingStores={existingStores}
        defaultName={ingredientName}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onProductCreated}
      />
    </>
  );
}
