import type { Category } from "@/lib/types";

export interface CategoryPath {
  id: string;
  label: string;
  /** 0 = top-level, 1 = sub-category, etc. */
  depth: number;
}

const TOP_ORDER = ["DRY INGREDIENTS", "WET INGREDIENTS", "MIX-INS"] as const;

/**
 * Flatten a category tree into an ordered list with display paths.
 * Top-level groups (DRY/WET/MIX-INS) come first in the canonical order;
 * sub-categories follow alphabetically under their parent.
 */
/** All descendant categoryIds of `rootId`, including `rootId` itself. */
export function getDescendantCategoryIds(
  rootId: string,
  categories: Category[]
): Set<string> {
  const result = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of categories) {
      if (c.parentId === cur && !result.has(c.id)) {
        result.add(c.id);
        stack.push(c.id);
      }
    }
  }
  return result;
}

export function buildCategoryPaths(categories: Category[]): CategoryPath[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of categories) {
    const k = c.parentId;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(c);
  }

  const result: CategoryPath[] = [];

  function topRank(name: string): number {
    const idx = (TOP_ORDER as readonly string[]).indexOf(name);
    return idx === -1 ? TOP_ORDER.length : idx;
  }

  function walk(parentId: string | null, prefix: string, depth: number) {
    const children = [...(byParent.get(parentId) ?? [])];
    if (parentId === null) {
      children.sort(
        (a, b) =>
          topRank(a.name) - topRank(b.name) || a.name.localeCompare(b.name)
      );
    } else {
      children.sort((a, b) => a.name.localeCompare(b.name));
    }
    for (const c of children) {
      const label = prefix ? `${prefix} › ${c.name}` : c.name;
      result.push({ id: c.id, label, depth });
      walk(c.id, label, depth + 1);
    }
  }

  walk(null, "", 0);
  return result;
}
