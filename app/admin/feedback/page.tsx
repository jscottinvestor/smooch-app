import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { FeedbackNoteForm } from "@/components/admin/feedback-note-form";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";

// Mirrors the unlimited-tier allowlist in lib/limits.ts. Add an email
// here to grant access to this admin feedback inbox.
const ADMIN_EMAILS = new Set<string>(["j@jscott.com"]);

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
  // Gate on email — non-admin signed-in users land on the dashboard.
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.has(email)) {
    redirect("/dashboard");
  }

  // Use the service-role client to bypass RLS and read everyone's feedback.
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("feedback")
    .select("id, email, page, message, created_at, admin_note, admin_note_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to dashboard
          </Link>
          <h1
            className="font-display text-3xl tracking-tight mt-2"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
          >
            Feedback inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {error ? "Error loading feedback" : `${data?.length ?? 0} entries`}
            {data && data.length >= 500 ? " (showing most recent 500)" : ""}
          </p>
        </div>
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
        <ul className="space-y-3">
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
