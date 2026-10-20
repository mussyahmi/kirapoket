"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SparklesIcon, SendIcon } from "lucide-react";
import { useApp, ADMIN_UID } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { buildAssistantContext } from "@/lib/aiContext";
import { ChatMarkdown } from "@/components/common/ChatMarkdown";
import type { AiUsageSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  /** A durable fact the model offered to remember. Never saved without a tap. */
  suggestedNote?: string;
  noteState?: "offered" | "saved" | "dismissed";
};

/** Settings keeps the same ceiling; appending must respect it. */
const NOTES_MAX = 1500;

const SUGGESTIONS = [
  // Forward-looking and decision-shaped. "How am I doing" describes the past;
  // the questions people actually need answered are about what happens next.
  "What's free to spend right now?",
  "What's due before payday?",
  "Will I make it to payday?",
  "Where is my money leaking?",
];

export default function AssistantPage() {
  // Admin-only while the assistant is still being finished; everyone else
  // keeps seeing the coming-soon page.
  const { user } = useAuth();
  if (user?.uid !== ADMIN_UID) return <ComingSoon />;
  return <AssistantChat />;
}

// Centred rather than top-aligned: a short standalone message pinned to the
// top of a tall viewport leaves a large void beneath it.
function ComingSoon() {
  return (
    <div className="max-w-content mx-auto flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <SparklesIcon className="size-8 text-primary" />
      </div>
      <h1 className="text-2xl font-semibold">AI Assistant</h1>
      <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        Coming soon
      </span>
      <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
        Chat with an AI that knows your accounts and spending, ask things like
        &ldquo;where am I overspending?&rdquo; or &ldquo;how much can I still
        spend this cycle?&rdquo; We&apos;re putting the finishing touches on it.
      </p>
    </div>
  );
}

function AssistantChat() {
  const {
    userProfile,
    activeAccounts,
    categories,
    transactions,
    debts,
    isViewingPartner,
    isImpersonating,
    saveUserProfile,
  } = useApp();
  const { user } = useAuth();
  const readOnly = isViewingPartner || isImpersonating;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.uid === ADMIN_UID;

  /**
   * Appends a proposed fact to the user's notes. Nothing is ever written
   * without this tap, and the result stays visible and editable in Settings.
   */
  const rememberNote = async (index: number, note: string) => {
    const existing = (userProfile?.assistantNotes ?? "").trim();
    if (existing.includes(note)) {
      setMessages((m) =>
        m.map((x, i) => (i === index ? { ...x, noteState: "saved" } : x)),
      );
      return;
    }
    const next = existing ? `${existing}\n${note}` : note;
    if (next.length > NOTES_MAX) {
      toast.error("Your notes are full. Trim them in Settings and try again.");
      return;
    }
    setSavingNote(true);
    try {
      await saveUserProfile({ assistantNotes: next });
      setMessages((m) =>
        m.map((x, i) => (i === index ? { ...x, noteState: "saved" } : x)),
      );
      toast.success("Saved. You can edit it in Settings.");
    } catch {
      toast.error("Couldn't save that.");
    } finally {
      setSavingNote(false);
    }
  };

  // Usage is admin-only, so the line stays hidden once the assistant opens up
  // to everyone. Loaded up front so it shows before the first message.
  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        });
        const data = await res.json();
        if (!cancelled && data.usage) setUsage(data.usage);
      } catch {
        /* the line just stays hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

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
      const context = buildAssistantContext({
        userProfile,
        accounts: activeAccounts,
        categories,
        transactions,
        debts,
      });
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: next, context }),
      });
      // A missing route answers with an HTML 404 page, not JSON. Don't let
      // that fall through to the "check your connection" catch below.
      const data = await res.json().catch(() => ({
        error: "The assistant isn't available right now.",
      }));
      if (data.usage) setUsage(data.usage);
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: data.error ?? "Something went wrong. Please try again.",
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: data.reply ?? "",
            suggestedNote: data.suggestedNote || undefined,
            noteState: data.suggestedNote ? "offered" : undefined,
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Couldn't reach the assistant. Check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (readOnly) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <SparklesIcon className="size-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          The AI assistant isn&apos;t available while viewing another account.
        </p>
      </div>
    );
  }

  return (
    <div
      // Fills the screen under the mobile header (61px, or 69px with the
      // larger touch targets). The shell's pb-32 nav gutter is cancelled
      // with -mb-32: it's sized for scrolling content, and left in place it
      // parks the composer a whole nav-height above the nav. The composer
      // clears the nav itself.
      className="max-w-2xl mx-auto px-4 flex flex-col min-h-[calc(100dvh-61px)] pointer-coarse:min-h-[calc(100dvh-69px)] -mb-32 md:mb-0 md:min-h-[calc(100dvh-2rem)]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 py-4 shrink-0">
        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <SparklesIcon className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight">AI Assistant</h1>
          <p className="text-xs text-muted-foreground">
            Ask about your spending this cycle
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 pb-4">
        {messages.length === 0 && !loading && (
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-foreground/80">
              Hi
              {userProfile?.displayName
                ? `, ${userProfile.displayName.split(" ")[0]}`
                : ""}
              ! I can see your accounts and this salary cycle&apos;s spending.
              Ask me anything, or try:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Admin-only: the exact snapshot sent with every message. Worth being
            able to read, because a wrong answer is usually a wrong context
            rather than a wrong model. */}
        {user?.uid === ADMIN_UID && messages.length === 0 && (
          <details className="rounded-2xl border border-border bg-muted/20 p-4">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Context sent with each message
            </summary>
            {(() => {
              const ctx = buildAssistantContext({
                userProfile,
                accounts: activeAccounts,
                categories,
                transactions,
                debts,
              });
              return (
                <>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {ctx.length.toLocaleString()} characters, roughly{" "}
                    {Math.round(ctx.length / 4).toLocaleString()} tokens, paid
                    on every message
                  </p>
                  <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-background p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
                    {ctx}
                  </pre>
                </>
              );
            })()}
          </details>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {m.role === "assistant" && (
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <SparklesIcon className="size-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-lg"
                  : "bg-muted text-foreground rounded-bl-lg",
              )}
            >
              {m.role === "assistant" ? <ChatMarkdown text={m.text} /> : m.text}
              {/* An offer, never an action. Nothing reaches the user's notes
                  without this tap, and whatever is saved stays visible and
                  editable in Settings. */}
              {m.suggestedNote && m.noteState !== "dismissed" && (
                <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground">
                    {m.noteState === "saved"
                      ? "Saved to your notes"
                      : "Remember this?"}
                  </p>
                  <p className="mt-1 text-xs text-foreground/90">
                    {m.suggestedNote}
                  </p>
                  {m.noteState === "offered" && !readOnly && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs"
                        disabled={savingNote}
                        onClick={() => rememberNote(i, m.suggestedNote!)}
                      >
                        Remember
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-3 text-xs"
                        onClick={() =>
                          setMessages((prev) =>
                            prev.map((x, xi) =>
                              xi === i ? { ...x, noteState: "dismissed" } : x,
                            ),
                          )
                        }
                      >
                        No thanks
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {m.role === "user" && (
              <Avatar className="size-7 shrink-0 mt-0.5">
                {(userProfile?.customPhotoURL ?? user?.photoURL) && (
                  <AvatarImage
                    src={
                      userProfile?.customPhotoURL ?? user?.photoURL ?? undefined
                    }
                    alt={userProfile?.displayName ?? "You"}
                  />
                )}
                <AvatarFallback
                  className="text-xs font-semibold"
                  delay={
                    (userProfile?.customPhotoURL ?? user?.photoURL)
                      ? 600
                      : undefined
                  }
                >
                  {getInitials(userProfile?.displayName ?? user?.displayName)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <SparklesIcon className="size-4 text-primary animate-pulse" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-lg px-4 py-3 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {/* Not sticky on mobile: the shell's <main> is the nearest scroll
          container but never scrolls itself (the document does), and its
          pb-32 shifts any sticky bottom up by 8rem. Bottom padding = the
          nav's bottom offset (same max() as AppShell) + its 4rem height + a
          0.75rem gap, so the composer sits just above the nav. */}
      <div className="z-20 shrink-0 bg-background pb-[calc(max(1.25rem,_env(safe-area-inset-bottom)_+_0.5rem)_+_4.75rem)] md:sticky md:bottom-4 md:pb-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-e1 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
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
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm pointer-coarse:text-base outline-none max-h-32"
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-xl"
            disabled={loading || !input.trim()}
          >
            <SendIcon />
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground/70">
          AI can make mistakes. Double-check important numbers.
        </p>
        {isAdmin && usage && (
          <p className="mt-1 text-center text-xs tabular-nums text-muted-foreground/70">
            {usage.messagesLeft} of {usage.dailyLimit} messages left today ·{" "}
            {usage.tokensToday.toLocaleString("en-MY")} tokens today ·{" "}
            {usage.tokensMonth.toLocaleString("en-MY")} this month
          </p>
        )}
      </div>
    </div>
  );
}
