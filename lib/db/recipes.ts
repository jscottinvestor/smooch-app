import { getServerSupabase } from "@/lib/supabase/server";
import type { Ingredient, Recipe } from "@/lib/types";
import { recipeFromRow, type RecipeRow } from "./mappers";

export async function listRecipes(): Promise<Recipe[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("name");
  if (error) throw new Error(`listRecipes: ${error.message}`);
  return (data as RecipeRow[]).map(recipeFromRow);
}

/** Replace a recipe's ingredients array in one shot. */
export async function setRecipeIngredients(
  recipeId: string,
  ingredients: Ingredient[]
): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("recipes")
    .update({ ingredients })
    .eq("id", recipeId);
  if (error) throw new Error(`setRecipeIngredients: ${error.message}`);
}

export interface NewRecipeInput {
  name: string;
  batches: number;
  cookiesPerBatch: number;
  ingredients: Ingredient[];
}

export async function insertRecipe(input: NewRecipeInput): Promise<string> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      name: input.name,
      batches: input.batches,
      cookies_per_batch: input.cookiesPerBatch,
      ingredients: input.ingredients,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insertRecipe: ${error.message}`);
  return data.id as string;
}

export async function updateRecipe(
  id: string,
  input: NewRecipeInput
): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("recipes")
    .update({
      name: input.name,
      batches: input.batches,
      cookies_per_batch: input.cookiesPerBatch,
      ingredients: input.ingredients,
    })
    .eq("id", id);
  if (error) throw new Error(`updateRecipe: ${error.message}`);
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw new Error(`deleteRecipe: ${error.message}`);
}
