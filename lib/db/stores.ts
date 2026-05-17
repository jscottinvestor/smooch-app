import { getServerSupabase } from "@/lib/supabase/server";

export interface Store {
  id: string;
  name: string;
}

export async function listStores(): Promise<Store[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name")
    .order("name");
  if (error) throw new Error(`listStores: ${error.message}`);
  return (data ?? []) as Store[];
}

export async function insertStore(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Store name is required.");
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("stores").insert({ name: trimmed });
  if (error) {
    if (error.code === "23505") {
      throw new Error(`A store named "${trimmed}" already exists.`);
    }
    throw new Error(`insertStore: ${error.message}`);
  }
}

/**
 * Rename a store. Updates the stores row AND every product currently
 * tagged with the old name so the rename cascades.
 */
export async function renameStore(id: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Store name is required.");
  const supabase = await getServerSupabase();

  const { data: current, error: getErr } = await supabase
    .from("stores")
    .select("name")
    .eq("id", id)
    .single();
  if (getErr || !current) {
    throw new Error(`renameStore: ${getErr?.message ?? "store not found"}`);
  }
  if (current.name === trimmed) return; // no-op

  const { error: storeErr } = await supabase
    .from("stores")
    .update({ name: trimmed })
    .eq("id", id);
  if (storeErr) {
    if (storeErr.code === "23505") {
      throw new Error(`A store named "${trimmed}" already exists.`);
    }
    throw new Error(`renameStore (store): ${storeErr.message}`);
  }

  const { error: prodErr } = await supabase
    .from("products")
    .update({ store: trimmed })
    .eq("store", current.name);
  if (prodErr) throw new Error(`renameStore (products): ${prodErr.message}`);
}

/**
 * Delete a store. Blocked when any product is still tagged with it —
 * the user must clear those products first.
 */
export async function deleteStore(id: string): Promise<void> {
  const supabase = await getServerSupabase();

  const { data: store, error: getErr } = await supabase
    .from("stores")
    .select("name")
    .eq("id", id)
    .single();
  if (getErr || !store) {
    throw new Error(`deleteStore: ${getErr?.message ?? "store not found"}`);
  }

  const { count, error: countErr } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("store", store.name);
  if (countErr) throw new Error(`deleteStore: ${countErr.message}`);
  if ((count ?? 0) > 0) {
    throw new Error(
      `Can't delete — ${count} product${count === 1 ? "" : "s"} still use${count === 1 ? "s" : ""} this store. Change those first.`
    );
  }

  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) throw new Error(`deleteStore: ${error.message}`);
}
