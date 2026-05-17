import {
  Cookie,
  Droplets,
  FolderTree,
  Plus,
  Store,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryPath } from "@/lib/category-paths";
import type { Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoriesDialog } from "./categories-dialog";
import { InventoryTable, type InventoryEntry } from "./inventory-table";
import { ProductDialog } from "./product-dialog";
import { StoresDialog } from "./stores-dialog";

const TOP_ORDER = ["DRY INGREDIENTS", "WET INGREDIENTS", "MIX-INS"] as const;

const TOP_META: Record<
  string,
  { Icon: LucideIcon; tint: string; cardBg: string }
> = {
  "DRY INGREDIENTS": {
    Icon: Wheat,
    tint: "bg-amber-100 text-amber-700",
    cardBg: "bg-amber-50/40",
  },
  "WET INGREDIENTS": {
    Icon: Droplets,
    tint: "bg-sky-100 text-sky-700",
    cardBg: "bg-sky-50/40",
  },
  "MIX-INS": {
    Icon: Cookie,
    tint: "bg-rose-100 text-rose-700",
    cardBg: "bg-rose-50/40",
  },
};

const DEFAULT_META = {
  Icon: Wheat,
  tint: "bg-muted text-foreground",
  cardBg: "",
};

interface SubBucket {
  label: string | null;
  products: Product[];
  isEmpty?: boolean;
  categoryId?: string;
}
interface TopBucket {
  label: string;
  subs: Map<string, SubBucket>;
}

export function InventoryView({
  categories,
  products,
  categoryPaths,
  stores,
}: {
  categories: Category[];
  products: Product[];
  categoryPaths: CategoryPath[];
  stores: { id: string; name: string; aliases: string[] }[];
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const tree = new Map<string, TopBucket>();

  for (const cat of categories) {
    if (!cat.parentId) tree.set(cat.id, { label: cat.name, subs: new Map() });
  }

  for (const p of products) {
    if (!p.categoryId) continue;
    const cat = catById.get(p.categoryId);
    if (!cat) continue;

    let topId: string;
    let topName: string;
    let subId: string;
    let subName: string | null;
    if (!cat.parentId) {
      topId = cat.id;
      topName = cat.name;
      subId = cat.id;
      subName = null;
    } else {
      const top = catById.get(cat.parentId);
      if (!top) continue;
      topId = top.id;
      topName = top.name;
      subId = cat.id;
      subName = cat.name;
    }

    let topBucket = tree.get(topId);
    if (!topBucket) {
      topBucket = { label: topName, subs: new Map() };
      tree.set(topId, topBucket);
    }
    let subBucket = topBucket.subs.get(subId);
    if (!subBucket) {
      subBucket = { label: subName, products: [] };
      topBucket.subs.set(subId, subBucket);
    }
    subBucket.products.push(p);
  }

  for (const sub of categories) {
    if (!sub.parentId) continue;
    const topBucket = tree.get(sub.parentId);
    if (!topBucket) continue;
    if (!topBucket.subs.has(sub.id)) {
      topBucket.subs.set(sub.id, {
        label: sub.name,
        products: [],
        isEmpty: true,
        categoryId: sub.id,
      });
    }
  }

  const topRank = (label: string) => {
    const idx = (TOP_ORDER as readonly string[]).indexOf(label);
    return idx === -1 ? TOP_ORDER.length : idx;
  };
  const orderedTopIds = [...tree.keys()].sort((a, b) => {
    const la = tree.get(a)!.label;
    const lb = tree.get(b)!.label;
    return topRank(la) - topRank(lb) || la.localeCompare(lb);
  });

  // Dropdown source — names come from the stores table now, not from
  // distinct product.store values. Lets a user add a store before any
  // product uses it, and prevents typo-driven splits in the shopping list.
  const existingStores = stores.map((s) => s.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {products.length} product{products.length === 1 ? "" : "s"} across{" "}
          {orderedTopIds.length} group{orderedTopIds.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StoresDialog stores={stores} products={products}>
            <Button size="sm" variant="outline">
              <Store className="w-4 h-4" />
              Manage stores
            </Button>
          </StoresDialog>
          <CategoriesDialog categories={categories} products={products}>
            <Button size="sm" variant="outline">
              <FolderTree className="w-4 h-4" />
              Manage categories
            </Button>
          </CategoriesDialog>
          <ProductDialog
            categoryPaths={categoryPaths}
            existingStores={existingStores}
          >
            <Button size="sm">
              <Plus className="w-4 h-4" />
              New product
            </Button>
          </ProductDialog>
        </div>
      </div>

      {orderedTopIds.map((topId) => {
        const top = tree.get(topId)!;
        const total = [...top.subs.values()].reduce(
          (s, b) => s + b.products.length,
          0
        );
        const meta = TOP_META[top.label] ?? DEFAULT_META;
        const Icon = meta.Icon;

        const entries: InventoryEntry[] = [];
        for (const sub of top.subs.values()) {
          if (sub.isEmpty) {
            entries.push({
              type: "empty",
              sortKey: sub.label ?? "",
              label: sub.label ?? "",
              categoryId: sub.categoryId!,
            });
          } else if (sub.label === null) {
            // Products directly under a top-level group (no intermediate
            // sub-category). Render each one flat — no subgroup header
            // because there's no named sub-category to label it with.
            for (const p of sub.products) {
              entries.push({ type: "flat", sortKey: p.name, product: p });
            }
          } else {
            // Named sub-category: always show its header, even when it
            // has only one product. (Without the header, the lone product
            // would visually look like a sibling sub-category.)
            const sorted = [...sub.products].sort((a, b) =>
              a.name.localeCompare(b.name)
            );
            entries.push({
              type: "group",
              sortKey: sub.label,
              label: sub.label,
              products: sorted,
            });
          }
        }
        entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        return (
          <Card
            key={topId}
            className={cn(
              "overflow-hidden shadow-sm shadow-foreground/[0.03]",
              meta.cardBg
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-5">
              <CardTitle className="flex items-center gap-3 font-display text-xl font-normal">
                <span
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                    meta.tint
                  )}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span
                  className="capitalize"
                  style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
                >
                  {top.label.toLowerCase()}
                </span>
              </CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {total} {total === 1 ? "product" : "products"}
              </span>
            </CardHeader>
            <CardContent className="p-0 border-t">
              <InventoryTable
                entries={entries}
                categoryPaths={categoryPaths}
                existingStores={existingStores}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
