"use server";

import { revalidatePath } from "next/cache";
import {
  deleteRecipe,
  insertRecipe,
  setRecipeIngredients,
  updateRecipe,
  type NewRecipeInput,
} from "@/lib/db/recipes";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Ingredient } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function setIngredientProductAction(
  recipeId: string,
  ingredientId: string,
  productId: string | null
): Promise<ActionResult> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("recipes")
      .select("ingredients")
      .eq("id", recipeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { ok: false, error: "Recipe not found" };

    const ingredients: Ingredient[] = Array.isArray(data.ingredients)
      ? (data.ingredients as Ingredient[])
      : [];
    let touched = false;
    const updated = ingredients.map((ing) => {
      if (ing.id !== ingredientId) return ing;
      touched = true;
      return { ...ing, productId, useAnyMatching: false };
    });
    if (!touched) return { ok: false, error: "Ingredient not found" };

    await setRecipeIngredients(recipeId, updated);
    revalidatePath("/recipes");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Update failed",
    };
  }
}

function validateRecipe(input: NewRecipeInput): string | null {
  if (!input.name.trim()) return "Recipe name is required";
  if (!Number.isFinite(input.batches) || input.batches < 1) {
    return "Batches must be 1 or more";
  }
  if (!Number.isFinite(input.cookiesPerBatch) || input.cookiesPerBatch <= 0) {
    return "Cookies per batch must be greater than zero";
  }
  return null;
}

export async function createRecipeAction(
  input: NewRecipeInput
): Promise<CreateResult> {
  const err = validateRecipe(input);
  if (err) return { ok: false, error: err };
  try {
    const id = await insertRecipe({ ...input, name: input.name.trim() });
    revalidatePath("/recipes");
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Create failed",
    };
  }
}

export async function updateRecipeAction(
  id: string,
  input: NewRecipeInput
): Promise<ActionResult> {
  const err = validateRecipe(input);
  if (err) return { ok: false, error: err };
  try {
    await updateRecipe(id, { ...input, name: input.name.trim() });
    revalidatePath("/recipes");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Update failed",
    };
  }
}

export async function deleteRecipeAction(id: string): Promise<ActionResult> {
  try {
    await deleteRecipe(id);
    revalidatePath("/recipes");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Delete failed",
    };
  }
}
