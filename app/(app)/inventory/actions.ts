"use server";

import { revalidatePath } from "next/cache";
import {
  categoryHasChildren,
  categoryHasProducts,
  deleteCategory,
  insertCategory,
  renameCategory,
} from "@/lib/db/categories";
import {
  deleteProduct,
  insertProduct,
  setProductStock,
  updateProduct,
  type NewProductInput,
} from "@/lib/db/products";
import {
  deleteStore,
  insertStore,
  renameStore,
} from "@/lib/db/stores";
import { ALL_UNITS } from "@/lib/units";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveStockAction(
  productId: string,
  stock: number
): Promise<ActionResult> {
  try {
    await setProductStock(productId, stock);
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function createProductAction(
  input: NewProductInput
): Promise<ActionResult> {
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Name is required" };
  if (!input.categoryId) return { ok: false, error: "Category is required" };
  if (!(ALL_UNITS as readonly string[]).includes(input.packageUnit)) {
    return { ok: false, error: `Unknown unit: ${input.packageUnit}` };
  }
  if (input.packageSize < 0 || !Number.isFinite(input.packageSize)) {
    return { ok: false, error: "Package size must be 0 or greater" };
  }
  if (input.price < 0 || !Number.isFinite(input.price)) {
    return { ok: false, error: "Price must be 0 or greater" };
  }
  if (input.stock < 0 || !Number.isFinite(input.stock)) {
    return { ok: false, error: "Stock must be 0 or greater" };
  }

  try {
    await insertProduct({ ...input, name });
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

function validateProductInput(input: NewProductInput): string | null {
  const name = input.name?.trim();
  if (!name) return "Name is required";
  if (!input.categoryId) return "Category is required";
  if (!(ALL_UNITS as readonly string[]).includes(input.packageUnit)) {
    return `Unknown unit: ${input.packageUnit}`;
  }
  if (input.packageSize < 0 || !Number.isFinite(input.packageSize)) {
    return "Package size must be 0 or greater";
  }
  if (input.price < 0 || !Number.isFinite(input.price)) {
    return "Price must be 0 or greater";
  }
  if (input.stock < 0 || !Number.isFinite(input.stock)) {
    return "Stock must be 0 or greater";
  }
  return null;
}

export async function updateProductAction(
  id: string,
  input: NewProductInput
): Promise<ActionResult> {
  const err = validateProductInput(input);
  if (err) return { ok: false, error: err };
  try {
    await updateProduct(id, { ...input, name: input.name.trim() });
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    await deleteProduct(id);
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}

export async function createCategoryAction(
  name: string,
  parentId: string | null
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };
  try {
    await insertCategory(trimmed, parentId);
    revalidatePath("/inventory");
    revalidatePath("/recipes");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Create failed",
    };
  }
}

export async function renameCategoryAction(
  id: string,
  name: string
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };
  try {
    await renameCategory(id, trimmed);
    revalidatePath("/inventory");
    revalidatePath("/recipes");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Rename failed",
    };
  }
}

export async function deleteCategoryAction(
  id: string
): Promise<ActionResult> {
  try {
    if (await categoryHasProducts(id)) {
      return {
        ok: false,
        error: "This category still has products. Move or delete them first.",
      };
    }
    if (await categoryHasChildren(id)) {
      return {
        ok: false,
        error: "This category has sub-categories. Delete those first.",
      };
    }
    await deleteCategory(id);
    revalidatePath("/inventory");
    revalidatePath("/recipes");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Delete failed",
    };
  }
}

export async function createStoreAction(name: string): Promise<ActionResult> {
  try {
    await insertStore(name);
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Create failed",
    };
  }
}

export async function renameStoreAction(
  id: string,
  name: string
): Promise<ActionResult> {
  try {
    await renameStore(id, name);
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Rename failed",
    };
  }
}

export async function deleteStoreAction(id: string): Promise<ActionResult> {
  try {
    await deleteStore(id);
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Delete failed",
    };
  }
}
