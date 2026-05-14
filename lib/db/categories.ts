import { getServerSupabase } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { categoryFromRow, type CategoryRow } from "./mappers";

export async function listCategories(): Promise<Category[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("name");
  if (error) throw new Error(`listCategories: ${error.message}`);
  return (data as CategoryRow[]).map(categoryFromRow);
}

export async function insertCategory(
  name: string,
  parentId: string | null
): Promise<string> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, parent_id: parentId })
    .select("id")
    .single();
  if (error) throw new Error(`insertCategory: ${error.message}`);
  return data.id as string;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(`renameCategory: ${error.message}`);
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(`deleteCategory: ${error.message}`);
}

export async function categoryHasProducts(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);
  if (error) throw new Error(`categoryHasProducts: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function categoryHasChildren(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  const { count, error } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", id);
  if (error) throw new Error(`categoryHasChildren: ${error.message}`);
  return (count ?? 0) > 0;
}
