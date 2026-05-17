import { getServerSupabase } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { productFromRow, type ProductRow } from "./mappers";

export async function listProducts(): Promise<Product[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");
  if (error) throw new Error(`listProducts: ${error.message}`);
  return (data as ProductRow[]).map(productFromRow);
}

export async function setProductStock(id: string, stock: number): Promise<void> {
  if (!Number.isFinite(stock) || stock < 0) {
    throw new Error("Stock must be a non-negative number");
  }
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("products")
    .update({ stock })
    .eq("id", id);
  if (error) throw new Error(`setProductStock: ${error.message}`);
}

export interface NewProductInput {
  name: string;
  categoryId: string;
  store: string | null;
  packageSize: number;
  packageUnit: string;
  price: number;
  stock: number;
  /** Optional cross-dimensional conversions. Defaults to []. */
  conversions?: Array<{
    fromQty: number;
    fromUnit: string;
    toQty: number;
    toUnit: string;
  }>;
}

export async function insertProduct(input: NewProductInput): Promise<string> {
  const supabase = await getServerSupabase();
  const priceHistory =
    input.price > 0
      ? [
          {
            date: new Date().toISOString().slice(0, 10),
            price: input.price,
            source: "manual" as const,
          },
        ]
      : [];
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      store: input.store,
      category_id: input.categoryId,
      package_size: input.packageSize,
      package_unit: input.packageUnit,
      price: input.price,
      stock: input.stock,
      conversions: input.conversions ?? [],
      price_history: priceHistory,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insertProduct: ${error.message}`);
  return data.id as string;
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProduct: ${error.message}`);
  return data ? productFromRow(data as ProductRow) : null;
}

export async function updateProduct(
  id: string,
  input: NewProductInput
): Promise<void> {
  const supabase = await getServerSupabase();
  const existing = await getProduct(id);
  if (!existing) throw new Error(`Product not found: ${id}`);

  // Append to price_history when price changes (and the new price is > 0).
  let priceHistory = existing.priceHistory;
  if (input.price !== existing.price && input.price > 0) {
    priceHistory = [
      ...priceHistory,
      {
        date: new Date().toISOString().slice(0, 10),
        price: input.price,
        source: "manual",
      },
    ];
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      store: input.store,
      category_id: input.categoryId,
      package_size: input.packageSize,
      package_unit: input.packageUnit,
      price: input.price,
      stock: input.stock,
      conversions: input.conversions ?? existing.conversions,
      price_history: priceHistory,
    })
    .eq("id", id);
  if (error) throw new Error(`updateProduct: ${error.message}`);
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(`deleteProduct: ${error.message}`);
}
