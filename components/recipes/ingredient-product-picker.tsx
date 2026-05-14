"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setIngredientProductAction } from "@/app/(app)/recipes/actions";
import { productSkuDetail } from "@/lib/format";
import type { Product } from "@/lib/types";

const UNLINK = "__unlink__";

export function IngredientProductPicker({
  recipeId,
  ingredientId,
  productId,
  products,
}: {
  recipeId: string;
  ingredientId: string;
  productId: string | null;
  products: Product[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));

  const items = [
    { value: UNLINK, label: "— Unlink —" },
    ...sorted.map((p) => ({ value: p.id, label: p.name })),
  ];

  const currentValue = productId ?? "";

  function onValueChange(v: string | null) {
    const newProductId =
      v === UNLINK || !v || v === "" ? null : v;
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

  return (
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
      </SelectContent>
    </Select>
  );
}
