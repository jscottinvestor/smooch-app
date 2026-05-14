import type { SupabaseClient } from "@supabase/supabase-js";
import type { Unit } from "@/lib/types";

interface SeedIngredient {
  name: string;
  quantity: number;
  unit: Unit;
  /** Optional — the prototype tracked this for documentation but doesn't auto-link. */
  productName?: string;
  /** Used to set `filterCategoryId` on the resulting ingredient. */
  categoryName?: string;
}

interface SeedRecipe {
  name: string;
  batches: number;
  cookiesPerBatch: number;
  ingredients: SeedIngredient[];
}

export const SEED_RECIPES: SeedRecipe[] = [
  {
    name: "Chunky Chocolate Chip",
    batches: 1,
    cookiesPerBatch: 12.5,
    ingredients: [
      { name: "Unsalted Butter", quantity: 2, unit: "sticks", productName: "Unsalted Butter", categoryName: "Butter" },
      { name: "Eggs", quantity: 1, unit: "each", categoryName: "Eggs" },
      { name: "Water", quantity: 2, unit: "tbsp", categoryName: "Water" },
      { name: "Vanilla", quantity: 2, unit: "tsp", categoryName: "Vanilla" },
      { name: "Brown Sugar", quantity: 220, unit: "g", productName: "Brown Sugar", categoryName: "Sugar" },
      { name: "Confectioner's Sugar", quantity: 85, unit: "g", productName: "Confectioner's Sugar", categoryName: "Sugar" },
      { name: "All Purpose Flour", quantity: 320, unit: "g", productName: "All Purpose Flour", categoryName: "Flour" },
      { name: "Salt", quantity: 1.5, unit: "tsp", categoryName: "Salt" },
      { name: "Baking Powder", quantity: 2, unit: "tsp", categoryName: "Baking Powder" },
      { name: "Baking Soda", quantity: 2, unit: "tsp", categoryName: "Baking Soda" },
      { name: "Corn Starch", quantity: 2, unit: "tsp", categoryName: "Corn Starch" },
      { name: "Milk Chocolate", quantity: 100, unit: "g", productName: "Milk Chocolate" },
      { name: "Semi-Sweet Chocolate Chips", quantity: 100, unit: "g", productName: "Semi-Sweet Chocolate Chips" },
      { name: "Dark Chocolate Wafers", quantity: 87, unit: "g", productName: "Dark Chocolate Wafers" },
    ],
  },
  {
    name: "Double Brownie Blast",
    batches: 1,
    cookiesPerBatch: 10,
    ingredients: [
      { name: "Unsalted Butter", quantity: 1, unit: "sticks", productName: "Unsalted Butter", categoryName: "Butter" },
      { name: "Eggs", quantity: 1, unit: "each", categoryName: "Eggs" },
      { name: "Water", quantity: 1, unit: "tbsp", categoryName: "Water" },
      { name: "Vanilla", quantity: 2, unit: "tsp", categoryName: "Vanilla" },
      { name: "Brownie Mix Eggs", quantity: 1, unit: "each", categoryName: "Eggs" },
      { name: "Brownie Mix Water", quantity: 0.333, unit: "cup", categoryName: "Water" },
      { name: "Brownie Mix EVOO", quantity: 0.333, unit: "cup", productName: "Extra Virgin Olive Oil", categoryName: "Oil" },
      { name: "Brown Sugar", quantity: 110, unit: "g", productName: "Brown Sugar", categoryName: "Sugar" },
      { name: "Cane Sugar", quantity: 65, unit: "g", productName: "Cane Sugar", categoryName: "Sugar" },
      { name: "All Purpose Flour", quantity: 120, unit: "g", productName: "All Purpose Flour", categoryName: "Flour" },
      { name: "Cocoa Powder", quantity: 33, unit: "g", categoryName: "Cocoa Powder" },
      { name: "Coffee", quantity: 1, unit: "tsp", categoryName: "Coffee" },
      { name: "Salt", quantity: 1, unit: "tsp", categoryName: "Salt" },
      { name: "Baking Powder", quantity: 1, unit: "tsp", categoryName: "Baking Powder" },
      { name: "Baking Soda", quantity: 1, unit: "tsp", categoryName: "Baking Soda" },
      { name: "Corn Starch", quantity: 1, unit: "tsp", categoryName: "Corn Starch" },
      { name: "Semi-Sweet Chocolate Chips", quantity: 100, unit: "g", productName: "Semi-Sweet Chocolate Chips" },
      { name: "Hershey Kisses", quantity: 100, unit: "g", productName: "Hershey Kisses" },
      { name: "Brownie Mix", quantity: 1, unit: "bag", categoryName: "Brownie Mix" },
    ],
  },
];

/**
 * Insert seed recipes into an empty recipes table. Ingredients start unlinked
 * (productId: null) per spec — the user picks each product from the in-card
 * dropdown. filterCategoryId is resolved from categoryName so the Edit modal
 * can narrow the picker.
 */
export async function seedRecipesIfEmpty(
  supabase: SupabaseClient
): Promise<void> {
  const { count, error: countErr } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });
  if (countErr) throw new Error(`seedRecipesIfEmpty precheck: ${countErr.message}`);
  if ((count ?? 0) > 0) return;

  const { data: cats, error: catErr } = await supabase
    .from("categories")
    .select("id, name");
  if (catErr) throw new Error(`seedRecipesIfEmpty categories: ${catErr.message}`);
  const catIdByName = new Map<string, string>();
  for (const c of cats ?? []) catIdByName.set(c.name as string, c.id as string);

  const inserts = SEED_RECIPES.map((r) => ({
    name: r.name,
    batches: r.batches,
    cookies_per_batch: r.cookiesPerBatch,
    ingredients: r.ingredients.map((ing) => ({
      id: crypto.randomUUID(),
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      productId: null,
      useAnyMatching: false,
      filterCategoryId: ing.categoryName
        ? (catIdByName.get(ing.categoryName) ?? null)
        : null,
    })),
  }));

  const { error } = await supabase.from("recipes").insert(inserts);
  if (error) throw new Error(`seedRecipesIfEmpty insert: ${error.message}`);
}
