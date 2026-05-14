"use client";

import { cn } from "@/lib/utils";
import type { Recipe } from "@/lib/types";

export function RecipeSelector({
  recipes,
  selectedId,
  onSelect,
}: {
  recipes: Recipe[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {recipes.map((r) => {
        const active = r.id === selectedId;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm transition-colors border",
              active
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border text-foreground hover:bg-muted"
            )}
          >
            {r.name}
          </button>
        );
      })}
    </div>
  );
}
