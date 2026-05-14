import type { SupabaseClient } from "@supabase/supabase-js";
import type { Unit } from "@/lib/types";

interface SeedProduct {
  name: string;
  unit: Unit;
}

interface SeedEntry {
  category?: string;
  topLevel: "DRY INGREDIENTS" | "WET INGREDIENTS" | "MIX-INS";
  /** Sub-products under a named sub-category. */
  products?: SeedProduct[];
  /** Products directly under the top-level group (no intermediate sub-category). */
  productsDirect?: SeedProduct[];
  /** Category is created but no products under it (user adds their own). */
  categoryOnly?: boolean;
}

export const SEED_TOP_LEVELS = [
  "DRY INGREDIENTS",
  "WET INGREDIENTS",
  "MIX-INS",
] as const;

export const SEED_CATALOG: SeedEntry[] = [
  // ── DRY INGREDIENTS ──
  {
    category: "Sugar",
    topLevel: "DRY INGREDIENTS",
    products: [
      { name: "Brown Sugar", unit: "g" },
      { name: "Confectioner's Sugar", unit: "g" },
      { name: "Cane Sugar", unit: "g" },
    ],
  },
  {
    category: "Flour",
    topLevel: "DRY INGREDIENTS",
    products: [
      { name: "All Purpose Flour", unit: "g" },
      { name: "Gluten Free Flour", unit: "g" },
    ],
  },
  { category: "Salt", topLevel: "DRY INGREDIENTS", categoryOnly: true },
  { category: "Baking Powder", topLevel: "DRY INGREDIENTS", categoryOnly: true },
  { category: "Baking Soda", topLevel: "DRY INGREDIENTS", categoryOnly: true },
  { category: "Corn Starch", topLevel: "DRY INGREDIENTS", categoryOnly: true },
  { category: "Cocoa Powder", topLevel: "DRY INGREDIENTS", categoryOnly: true },
  { category: "Coffee", topLevel: "DRY INGREDIENTS", categoryOnly: true },
  { category: "Cinnamon", topLevel: "DRY INGREDIENTS", categoryOnly: true },
  { category: "Cream of Tartar", topLevel: "DRY INGREDIENTS", categoryOnly: true },

  // ── WET INGREDIENTS ──
  {
    category: "Butter",
    topLevel: "WET INGREDIENTS",
    products: [
      { name: "Unsalted Butter", unit: "sticks" },
      { name: "Salted Butter", unit: "sticks" },
      { name: "Plant Butter", unit: "sticks" },
    ],
  },
  {
    category: "Oil",
    topLevel: "WET INGREDIENTS",
    products: [
      { name: "Extra Virgin Olive Oil", unit: "tbsp" },
      { name: "Coconut Oil", unit: "tbsp" },
    ],
  },
  {
    category: "Food Coloring",
    topLevel: "WET INGREDIENTS",
    products: [{ name: "Red Gel Food Coloring", unit: "tsp" }],
  },
  { category: "Eggs", topLevel: "WET INGREDIENTS", categoryOnly: true },
  { category: "Water", topLevel: "WET INGREDIENTS", categoryOnly: true },
  { category: "Vanilla", topLevel: "WET INGREDIENTS", categoryOnly: true },
  { category: "White Vinegar", topLevel: "WET INGREDIENTS", categoryOnly: true },
  { category: "Peanut Butter", topLevel: "WET INGREDIENTS", categoryOnly: true },

  // ── MIX-INS ──
  {
    topLevel: "MIX-INS",
    productsDirect: [
      { name: "Milk Chocolate", unit: "g" },
      { name: "Semi-Sweet Chocolate Chips", unit: "g" },
      { name: "Dark Chocolate Wafers", unit: "g" },
      { name: "Hershey Kisses", unit: "g" },
      { name: "Dark Chocolate", unit: "g" },
      { name: "Vanilla Candy Coating", unit: "g" },
      { name: "Peanut Butter Chips", unit: "g" },
      { name: "Reese's PB Cups", unit: "g" },
      { name: "Cream Cheese Flavored Chips", unit: "g" },
      { name: "White Chocolate", unit: "g" },
      { name: "White Melting Wafers", unit: "g" },
    ],
  },
  { category: "Brownie Mix", topLevel: "MIX-INS", categoryOnly: true },
];

/**
 * One-shot silent seed for a truly empty database.
 * No-op if categories already exist.
 */
export async function seedDatabaseIfEmpty(supabase: SupabaseClient): Promise<void> {
  const { count, error: countErr } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });
  if (countErr) throw new Error(`seed precheck: ${countErr.message}`);
  if ((count ?? 0) > 0) return;

  // 1. Top-level groups
  const { data: topRows, error: topErr } = await supabase
    .from("categories")
    .insert(SEED_TOP_LEVELS.map((name) => ({ name, parent_id: null })))
    .select("id, name");
  if (topErr) throw new Error(`seed top-levels: ${topErr.message}`);

  const topIdByName = new Map<string, string>();
  for (const r of topRows!) topIdByName.set(r.name as string, r.id as string);

  // 2. Each catalog entry: maybe create sub-category, maybe insert products.
  for (const entry of SEED_CATALOG) {
    const topId = topIdByName.get(entry.topLevel);
    if (!topId) continue;

    if (entry.productsDirect) {
      const inserts = entry.productsDirect.map((p) => ({
        name: p.name,
        category_id: topId,
        package_unit: p.unit,
      }));
      const { error } = await supabase.from("products").insert(inserts);
      if (error) throw new Error(`seed productsDirect: ${error.message}`);
      continue;
    }

    if (!entry.category) continue;

    const { data: catRow, error: catErr } = await supabase
      .from("categories")
      .insert({ name: entry.category, parent_id: topId })
      .select("id")
      .single();
    if (catErr) throw new Error(`seed category ${entry.category}: ${catErr.message}`);

    if (entry.categoryOnly || !entry.products?.length) continue;

    const inserts = entry.products.map((p) => ({
      name: p.name,
      category_id: catRow.id,
      package_unit: p.unit,
    }));
    const { error } = await supabase.from("products").insert(inserts);
    if (error) throw new Error(`seed products ${entry.category}: ${error.message}`);
  }
}
