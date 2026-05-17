import { getServerSupabase } from "@/lib/supabase/server";
import type { Receipt, ReceiptLine } from "@/lib/types";

interface ReceiptRow {
  id: string;
  date: string;
  store: string;
  total: number | string | null;
  lines: unknown;
}

function receiptFromRow(r: ReceiptRow): Receipt {
  return {
    id: r.id,
    date: r.date,
    store: r.store,
    total: r.total === null ? null : Number(r.total),
    lines: Array.isArray(r.lines) ? (r.lines as ReceiptLine[]) : [],
  };
}

export async function listReceipts(): Promise<Receipt[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listReceipts: ${error.message}`);
  return (data as ReceiptRow[]).map(receiptFromRow);
}

export async function insertReceipt(input: {
  date: string;
  store: string;
  total: number | null;
  lines: ReceiptLine[];
}): Promise<string> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("receipts")
    .insert({
      date: input.date,
      store: input.store,
      total: input.total,
      lines: input.lines,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insertReceipt: ${error.message}`);
  return data.id as string;
}

export async function updateReceipt(
  id: string,
  input: {
    date: string;
    store: string;
    total: number | null;
    lines: ReceiptLine[];
  }
): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("receipts")
    .update({
      date: input.date,
      store: input.store,
      total: input.total,
      lines: input.lines,
    })
    .eq("id", id);
  if (error) throw new Error(`updateReceipt: ${error.message}`);
}

export async function deleteReceipt(id: string): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) throw new Error(`deleteReceipt: ${error.message}`);
}
