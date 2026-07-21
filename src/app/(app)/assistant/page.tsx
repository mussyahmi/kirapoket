"use client";

import { useEffect, useRef, useState } from "react";
import { SparklesIcon, SendIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { buildAssistantContext } from "@/lib/aiContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

type ChatMessage = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "How am I doing this cycle?",
  "Where am I overspending?",
  "How much can I still spend?",
  "Summarise my debts",
];

// Flip to false to enable the live chat experience below.
const COMING_SOON = true;

export default function AssistantPage() {
  if (COMING_SOON) return <ComingSoon />;
  return <AssistantChat />;
}

function ComingSoon() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <SparklesIcon className="size-8 text-primary" />
      </div>
      <h1 className="text-2xl font-semibold">AI Assistant</h1>
      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        Coming soon
      </span>
      <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
        Chat with an AI that knows your accounts and spending — ask things like
        &ldquo;where am I overspending?&rdquo; or &ldquo;how much can I still
        spend this cycle?&rdquo; We&apos;re putting the finishing touches on it.
      </p>
    </div>
  );
}

function AssistantChat() {
  const { userProfile, accounts, categories, transactions, debts, isViewingPartner, isImpersonating } = useApp();
  const { user } = useAuth();
  const readOnly = isViewingPartner || isImpersonating;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !user) return;

    const next: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const context = buildAssistantContext({ userProfile, accounts, categories, transactions, debts });
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: next, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", text: data.error ?? "Something went wrong. Please try again." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.reply ?? "" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Couldn't reach the assistant. Check your connection and try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (readOnly) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <SparklesIcon className="size-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          The AI assistant isn&apos;t available while viewing another account.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 flex flex-col min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-1px)]">
      {/* Header */}
      <div className="flex items-center gap-3 py-4 shrink-0">
        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <SparklesIcon className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight">AI Assistant</h1>
          <p className="text-xs text-muted-foreground">Ask about your spending this cycle</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 pb-4">
        {messages.length === 0 && !loading && (
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-foreground/80">
              Hi{userProfile?.displayName ? `, ${userProfile.displayName.split(" ")[0]}` : ""}! I can see your
              accounts and this salary cycle&apos;s spending. Ask me anything, or try:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <SparklesIcon className="size-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              )}
            >
              {m.text}
            </div>
            {m.role === "user" && (
              <Avatar className="size-7 shrink-0 mt-0.5">
                {(userProfile?.customPhotoURL ?? user?.photoURL) && (
                  <AvatarImage src={userProfile?.customPhotoURL ?? user?.photoURL ?? undefined} alt={userProfile?.displayName ?? "You"} />
                )}
                <AvatarFallback className="text-[10px] font-semibold">
                  {getInitials(userProfile?.displayName ?? user?.displayName)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <SparklesIcon className="size-4 text-primary animate-pulse" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-3 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-24 md:bottom-4 z-20 pb-2 bg-background">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about your money..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none max-h-32"
          />
          <Button type="submit" size="icon" className="shrink-0 rounded-xl" disabled={loading || !input.trim()}>
            <SendIcon className="size-4" />
          </Button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">
          AI can make mistakes — double-check important numbers.
        </p>
      </div>
    </div>
  );
}
