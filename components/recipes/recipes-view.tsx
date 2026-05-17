"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Category, Product, Recipe } from "@/lib/types";
import { RecipeCard } from "./recipe-card";
import { RecipeDialog } from "./recipe-dialog";
import { RecipeSelector } from "./recipe-selector";

export function RecipesView({
  recipes,
  products,
  categories,
}: {
  recipes: Recipe[];
  products: Product[];
  categories: Category[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    recipes[0]?.id ?? null
  );

  const selected = recipes.find((r) => r.id === selectedId) ?? recipes[0];

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-sm text-muted-foreground">No recipes yet.</p>
        <RecipeDialog
          products={products}
          categories={categories}
          onCreated={setSelectedId}
        >
          <Button size="sm">
            <Plus className="w-4 h-4" />
            New recipe
          </Button>
        </RecipeDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <RecipeSelector
          recipes={recipes}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />
        <RecipeDialog
          products={products}
          categories={categories}
          onCreated={setSelectedId}
        >
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4" />
            New recipe
          </Button>
        </RecipeDialog>
      </div>
      {selected && (
        <RecipeCard
          key={selected.id}
          recipe={selected}
          products={products}
          categories={categories}
        />
      )}
    </div>
  );
}
