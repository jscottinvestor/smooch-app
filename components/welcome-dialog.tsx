"use client";

import { useEffect, useState } from "react";
import { HelpCircle, MessageSquare, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WelcomeDialogProps {
  userId: string | null;
}

// Bump the version suffix to re-show the welcome to everyone (e.g.,
// after a major feature drop).
const STORAGE_KEY_PREFIX = "cbb_welcome_seen_v1:";

export function WelcomeDialog({ userId }: WelcomeDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    try {
      const key = STORAGE_KEY_PREFIX + userId;
      if (localStorage.getItem(key) === "1") return;
      setOpen(true);
    } catch {
      // localStorage can throw in private modes — silently skip.
    }
  }, [userId]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && userId) {
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + userId, "1");
      } catch {
        // ignore
      }
    }
  }

  if (!userId) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-700" />
            Welcome to Cottage Baking Buddy
          </DialogTitle>
          <DialogDescription>
            At the bottom of every page you&apos;ll find three buttons to help
            you get the most out of the app:
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-sm">
          <li className="flex gap-3">
            <PlayCircle className="w-5 h-5 mt-0.5 shrink-0 text-violet-700" />
            <div>
              <div className="font-medium text-foreground">Watch the tour</div>
              <div className="text-muted-foreground">
                Four quick videos that walk you through the whole product.
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <HelpCircle className="w-5 h-5 mt-0.5 shrink-0 text-violet-700" />
            <div>
              <div className="font-medium text-foreground">Ask a question</div>
              <div className="text-muted-foreground">
                Opens an AI chatbot that can answer questions about the app —
                or reach me directly if it can&apos;t help.
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <MessageSquare className="w-5 h-5 mt-0.5 shrink-0 text-violet-700" />
            <div>
              <div className="font-medium text-foreground">Provide feedback</div>
              <div className="text-muted-foreground">
                Send me issues, suggestions, or feature ideas any time.
              </div>
            </div>
          </li>
        </ul>
        <div className="flex justify-end pt-2">
          <DialogClose render={<Button>Got it</Button>} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
