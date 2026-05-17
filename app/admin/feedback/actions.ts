"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";

// Mirrors the gate on app/admin/feedback/page.tsx. Both must stay in sync.
const ADMIN_EMAILS = new Set<string>(["j@jscott.com"]);

export type AdminActionResult =
  | { ok: true; updatedAt: string | null }
  | { ok: false; error: string };

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.has(email)) {
    return { ok: false, error: "Forbidden" };
  }
  return { ok: true };
}

/**
 * Set or clear the admin note on a single feedback row. Passing an empty
 * string clears both the note and its timestamp.
 *
 * Uses the service-role client because RLS scopes feedback rows to the
 * user who submitted them; the admin can't read/write them otherwise.
 */
export async function updateFeedbackNoteAction(
  id: string,
  note: string
): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const trimmed = (note ?? "").trim();
  const now = trimmed ? new Date().toISOString() : null;

  const service = getServiceSupabase();
  const { error } = await service
    .from("feedback")
    .update({
      admin_note: trimmed || null,
      admin_note_at: now,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/feedback");
  return { ok: true, updatedAt: now };
}
