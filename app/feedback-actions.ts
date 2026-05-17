"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export type FeedbackResult = { ok: true } | { ok: false; error: string };

const MAX_LENGTH = 5000;

export async function submitFeedbackAction(
  message: string,
  page: string
): Promise<FeedbackResult> {
  try {
    const trimmed = (message ?? "").trim();
    if (!trimmed) return { ok: false, error: "Feedback can't be empty." };
    if (trimmed.length > MAX_LENGTH) {
      return {
        ok: false,
        error: `Feedback is too long (${trimmed.length}/${MAX_LENGTH} characters).`,
      };
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You're not signed in." };

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      email: user.email ?? null,
      page: (page ?? "").slice(0, 500),
      message: trimmed,
    });
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to submit feedback.",
    };
  }
}
