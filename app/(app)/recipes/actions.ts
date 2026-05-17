"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import {
  deleteRecipe,
  insertRecipe,
  setRecipeIngredients,
  updateRecipe,
  type NewRecipeInput,
} from "@/lib/db/recipes";
import {
  RECIPE_OCR_SYSTEM_PROMPT,
  RecipeOcrSchema,
  type RecipeOcrResult,
} from "@/lib/recipe-ocr";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Ingredient, Unit } from "@/lib/types";

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
    const supabase = await getServerSupabase();
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

export interface ParsedRecipeImage {
  name: string | null;
  productsPerBatch: number | null;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: Unit;
  }>;
}

export type ParseRecipeImageResult =
  | { ok: true; parsed: ParsedRecipeImage }
  | { ok: false; error: string };

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Send a recipe photo to Claude vision and return the parsed fields the
 * New-recipe modal can pre-fill into its draft state.
 */
export async function parseRecipeImageAction(
  base64Image: string,
  mimeType: string
): Promise<ParseRecipeImageResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY isn't configured on the server.",
    };
  }
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    return {
      ok: false,
      error: `Unsupported image type: ${mimeType}. Use JPEG, PNG, WebP, or GIF.`,
    };
  }
  if (!base64Image || base64Image.length < 100) {
    return { ok: false, error: "Image data missing or too small." };
  }

  const client = new Anthropic();

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 8000,
      system: RECIPE_OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "image/gif",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: "Extract the recipe's name, yield (products per batch), and full ingredient list from this photo.",
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(RecipeOcrSchema) },
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return {
        ok: false,
        error: `Claude API error (${e.status}): ${e.message}`,
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "OCR call failed",
    };
  }

  const parsed = response.parsed_output as RecipeOcrResult | null;
  if (!parsed) {
    return {
      ok: false,
      error:
        "Claude returned an unparseable response. Try a clearer photo (better lighting, less skew, fewer cut-off lines).",
    };
  }

  return {
    ok: true,
    parsed: {
      name: parsed.name,
      productsPerBatch: parsed.productsPerBatch,
      ingredients: parsed.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit as Unit,
      })),
    },
  };
}
