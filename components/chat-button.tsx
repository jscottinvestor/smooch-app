"use client";

import { HelpCircle, Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { chatAction, type ChatMessage } from "@/app/chat-actions";
import { cn } from "@/lib/utils";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I can answer questions about how COTTAGE BAKING BUDDY works — features, how to import receipts, how the shopping list math works, that kind of thing. What can I help with?",
};

export function ChatButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom whenever messages change.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setMessages([GREETING]);
      setDraft("");
      setError(null);
    }
  }

  function send() {
    const text = draft.trim();
    if (!text || pending) return;
    setError(null);

    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(next);
    setDraft("");

    startTransition(async () => {
      // Strip the synthetic greeting from what we send to Claude — it's
      // just for UI; the real conversation starts with the user's first
      // message.
      const forApi = next.filter((m, i) => !(i === 0 && m === GREETING));
      const res = await chatAction(forApi);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessages([...next, { role: "assistant", content: res.content }]);
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
            <HelpCircle className="w-3.5 h-3.5" />
            Ask a question
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-w-[calc(100vw-1rem)] max-h-[90vh] grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto] flex flex-col">
        <DialogHeader className="min-w-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 shrink-0 text-violet-700" />
            Ask the app
          </DialogTitle>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto -mx-4 px-4 py-2 space-y-3 min-h-[200px] max-h-[60vh]"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words max-w-[85%]",
                  m.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 bg-muted text-muted-foreground text-sm flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking…
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2 shrink-0">
            {error}
          </div>
        )}

        <div className="flex gap-2 items-end shrink-0 pt-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Type your question…"
            maxLength={2000}
            disabled={pending}
            className="flex-1 min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-y min-h-[40px] max-h-[120px]"
          />
          <Button
            type="button"
            size="sm"
            onClick={send}
            disabled={pending || !draft.trim()}
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center shrink-0">
          Answers are AI-generated and may be incomplete or wrong.
        </p>
      </DialogContent>
    </Dialog>
  );
}
