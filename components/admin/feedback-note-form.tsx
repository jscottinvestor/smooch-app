"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateFeedbackNoteAction } from "@/app/admin/feedback/actions";

export function FeedbackNoteForm({
  feedbackId,
  initialNote,
  initialNoteAt,
}: {
  feedbackId: string;
  initialNote: string | null;
  initialNoteAt: string | null;
}) {
  const [note, setNote] = useState(initialNote ?? "");
  const [savedNote, setSavedNote] = useState(initialNote ?? "");
  const [savedAt, setSavedAt] = useState(initialNoteAt);
  const [editing, setEditing] = useState(!initialNote);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateFeedbackNoteAction(feedbackId, note);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedNote(note.trim());
      setSavedAt(res.updatedAt);
      setEditing(false);
    });
  }

  function cancel() {
    setNote(savedNote);
    setEditing(false);
    setError(null);
  }

  // Read-only display when a saved note exists and we're not editing.
  if (!editing) {
    return (
      <div className="rounded-md bg-emerald-50/60 border border-emerald-200 px-3 py-2 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[11px] uppercase tracking-wide text-emerald-800/80 font-medium">
            Your note
            {savedAt && (
              <span className="ml-2 normal-case text-emerald-700/70 font-normal">
                {new Date(savedAt).toLocaleString()}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditing(true)}
            title="Edit note"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="text-sm whitespace-pre-wrap break-words text-emerald-950">
          {savedNote}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-muted/40 border border-border px-3 py-2 space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        Add a note
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="What did you do about this? (fixed in v0.4, won't-fix, etc.)"
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-y min-h-[56px]"
      />
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2 justify-end">
        {savedNote && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancel}
            disabled={pending}
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={pending || note.trim() === savedNote.trim()}
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Save note
        </Button>
      </div>
    </div>
  );
}
