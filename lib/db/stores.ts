import { getServerSupabase } from "@/lib/supabase/server";

export interface Store {
  id: string;
  name: string;
  aliases: string[];
}

export async function listStores(): Promise<Store[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, aliases")
    .order("name");
  if (error) throw new Error(`listStores: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    aliases: (r.aliases as string[] | null) ?? [],
  }));
}

/**
 * Look up the canonical store name for arbitrary text — used during
 * receipt OCR to map OCR output ("COSTCO WHOLESALE #1234") to whatever
 * the user calls that store today ("Costco").
 *
 * Matches case-insensitively against the store's name and aliases.
 * Returns null if no store recognizes the text.
 */
export async function findCanonicalStoreName(
  text: string
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const stores = await listStores();
  const lower = trimmed.toLowerCase();
  for (const s of stores) {
    if (s.name.toLowerCase() === lower) return s.name;
    for (const a of s.aliases) {
      if (a.toLowerCase() === lower) return s.name;
    }
  }
  return null;
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
 * tagged with the old name so the rename cascades. Also pushes the old
 * name into the row's `aliases` array so receipt OCR for that old
 * spelling auto-canonicalizes to the new name.
 */
export async function renameStore(id: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Store name is required.");
  const supabase = await getServerSupabase();

  const { data: current, error: getErr } = await supabase
    .from("stores")
    .select("name, aliases")
    .eq("id", id)
    .single();
  if (getErr || !current) {
    throw new Error(`renameStore: ${getErr?.message ?? "store not found"}`);
  }
  if (current.name === trimmed) return; // no-op

  // Build updated aliases: previous aliases + the old name, dedup-ed
  // case-insensitively, and never including the new canonical name.
  const oldName = current.name as string;
  const existingAliases = (current.aliases as string[] | null) ?? [];
  const seen = new Set<string>([trimmed.toLowerCase()]);
  const merged: string[] = [];
  for (const a of [...existingAliases, oldName]) {
    const key = a.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(a);
  }

  const { error: storeErr } = await supabase
    .from("stores")
    .update({ name: trimmed, aliases: merged })
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
    .eq("store", oldName);
  if (prodErr) throw new Error(`renameStore (products): ${prodErr.message}`);

  // Receipts also carry the store name; cascade the rename there too so the
  // Receipts tab and per-store totals stay consistent.
  const { error: recErr } = await supabase
    .from("receipts")
    .update({ store: trimmed })
    .eq("store", oldName);
  if (recErr) throw new Error(`renameStore (receipts): ${recErr.message}`);
}

/**
 * Append `text` to the aliases list of the store with canonical name
 * `canonicalName`. Used after the user accepts a receipt where the OCR'd
 * store text differs from what they finalized in the review form — we
 * silently record the correction so future scans match automatically.
 *
 * Silent no-op (not an error) when:
 *   - text is empty, or already equals canonicalName case-insensitively
 *   - no store with that canonical name exists
 *   - the alias is already in the list
 */
export async function rememberStoreAlias(
  canonicalName: string,
  text: string
): Promise<void> {
  const aliasText = text.trim();
  const canonical = canonicalName.trim();
  if (!aliasText || !canonical) return;
  if (aliasText.toLowerCase() === canonical.toLowerCase()) return;

  const supabase = await getServerSupabase();
  const { data: store, error: getErr } = await supabase
    .from("stores")
    .select("id, aliases")
    .eq("name", canonical)
    .maybeSingle();
  if (getErr || !store) return;

  const existing = (store.aliases as string[] | null) ?? [];
  if (existing.some((a) => a.toLowerCase() === aliasText.toLowerCase())) return;

  const merged = [...existing, aliasText];
  await supabase.from("stores").update({ aliases: merged }).eq("id", store.id);
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
