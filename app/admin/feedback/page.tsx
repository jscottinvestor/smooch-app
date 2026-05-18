import { MessageSquare } from "lucide-react";
import { FeedbackNoteForm } from "@/components/admin/feedback-note-form";
import { getServiceSupabase } from "@/lib/supabase/server";

interface FeedbackRow {
  id: string;
  email: string | null;
  page: string | null;
  message: string;
  created_at: string;
  admin_note: string | null;
  admin_note_at: string | null;
}

export const dynamic = "force-dynamic";

export default async function FeedbackAdminPage() {
  // Auth gate is handled by app/admin/layout.tsx. Use the service-role
  // client to bypass RLS and read everyone's feedback.
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("feedback")
    .select("id, email, page, message, created_at, admin_note, admin_note_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Feedback inbox</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {error ? "Error loading feedback" : `${data?.length ?? 0} entries`}
          {data && data.length >= 500 ? " (showing most recent 500)" : ""}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error.message}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-md border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <MessageSquare className="w-6 h-6 opacity-50" />
          No feedback yet.
        </div>
      ) : (
        <ul className="space-y-3 max-w-3xl">
          {(data as FeedbackRow[]).map((f) => (
            <li
              key={f.id}
              className="rounded-md border bg-card p-4 shadow-sm shadow-foreground/[0.03] space-y-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground truncate">
                  {f.email || "(no email)"}
                </span>
                <span className="font-mono">
                  {new Date(f.created_at).toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                page: <span className="font-mono">{f.page || "—"}</span>
              </div>
              <div className="text-sm whitespace-pre-wrap break-words">
                {f.message}
              </div>
              <FeedbackNoteForm
                feedbackId={f.id}
                initialNote={f.admin_note}
                initialNoteAt={f.admin_note_at}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
