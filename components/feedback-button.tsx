"use client";

import { CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { submitFeedbackAction } from "@/app/feedback-actions";

export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setMessage("");
      setError(null);
      setSubmitted(false);
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitFeedbackAction(message, pathname || "");
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Provide Feedback
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-1rem)] grid-cols-[minmax(0,1fr)]">
        {submitted ? (
          <>
            <DialogHeader className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                Thanks!
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Your feedback was submitted. Appreciate you taking the time.
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 shrink-0" />
                Provide feedback
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground -mt-2">
              Anything you want to share — bugs, confusing bits, things you'd
              love to see. We'll know what page you were on when you sent it.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Type away…"
              autoFocus
              maxLength={5000}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-y min-h-[120px]"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{message.length}/5000</span>
              <span className="truncate ml-2">on {pathname || "/"}</span>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={pending || !message.trim()}
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
