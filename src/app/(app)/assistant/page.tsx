"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  SparklesIcon,
  SendIcon,
  ArrowLeftIcon,
  CopyIcon,
  SquarePenIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  /** Up to two questions worth asking next. Shown under the latest reply only. */
  followUps?: string[];
};

/** Settings keeps the same ceiling; appending must respect it. */
const NOTES_MAX = 1500;

/**
 * Forward-looking and decision-shaped. "How am I doing" describes the past;
 * the questions people actually need answered are about what happens next.
 *
 * "Can I afford" needs a number only the user has, so it fills the box and
 * waits instead of sending. Dropped: "What's due before payday?" — it answers
 * "nothing" for anyone who hasn't entered a debt with a due date, and both
 * questions below already subtract what's committed.
 */
const SUGGESTIONS: { label: string; prefill?: boolean }[] = [
  { label: "What's free to spend right now?" },
  { label: "Will I make it to payday?" },
  { label: "Where is my money leaking?" },
  { label: "Can I afford", prefill: true },
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
  const router = useRouter();
  const readOnly = isViewingPartner || isImpersonating;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isAdmin = user?.uid === ADMIN_UID;

  /**
   * True if the user has effectively saved this already. Compared loosely,
   * since the model rarely proposes the exact same wording twice.
   */
  const alreadyKnown = (note?: string) => {
    if (!note) return false;
    const norm = (t: string) =>
      t
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const existing = norm(userProfile?.assistantNotes ?? "");
    if (!existing) return false;
    const candidate = norm(note);
    if (existing.includes(candidate)) return true;
    // Fall back to word overlap so a reworded duplicate is still caught.
    const words = candidate.split(" ").filter((w) => w.length > 3);
    if (words.length === 0) return false;
    const hits = words.filter((w) => existing.includes(w)).length;
    return hits / words.length >= 0.8;
  };

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
            // Don't offer something already in their notes. The save path
            // catches duplicates too, but being re-asked for a fact you
            // already saved reads as the app not listening.
            followUps: Array.isArray(data.followUps)
              ? data.followUps
              : undefined,
            suggestedNote: alreadyKnown(data.suggestedNote)
              ? undefined
              : data.suggestedNote || undefined,
            noteState:
              data.suggestedNote && !alreadyKnown(data.suggestedNote)
                ? "offered"
                : undefined,
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
      // On mobile the shell hides its header and bottom nav for this route, so
      // the conversation owns the viewport and the composer can sit on the
      // keyboard. On desktop the sidebar stays and only the top padding differs.
      className="max-w-2xl mx-auto px-4 flex flex-col h-[100dvh] md:h-auto md:min-h-[calc(100dvh-2rem)]"
    >
      {/* Header. The back button only exists on mobile, where the shell's
          chrome is hidden and this is the only way out. */}
      <div className="flex items-center gap-3 py-4 shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="md:hidden size-9 pointer-coarse:size-11 -ml-2 flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold leading-tight">AI Assistant</h1>
          <p className="text-xs text-muted-foreground">
            Ask about your spending this cycle
          </p>
        </div>
        {/* Nothing to clear until something has been said, so the button only
            appears once there is a conversation. No confirmation: the chat is
            already lost on a refresh, so this takes nothing that was being
            kept. */}
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setInput("");
              inputRef.current?.focus();
            }}
            aria-label="New chat"
            title="New chat"
            className="ml-auto size-9 pointer-coarse:size-11 flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SquarePenIcon className="size-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pb-4 md:overflow-visible">
        {messages.length === 0 && !loading && (
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-foreground/80">
              Hi
              {userProfile?.displayName
                ? `, ${userProfile.displayName.split(" ")[0]}`
                : ""}
              ! I can see your accounts, this cycle&apos;s spending and pace,
              what&apos;s committed before payday, last cycle for comparison,
              and anything you&apos;ve told me to remember. Ask me anything, or
              try:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map(({ label, prefill }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (!prefill) {
                      send(label);
                      return;
                    }
                    // Hand them the sentence and the cursor; the amount is
                    // theirs to type.
                    setInput(`${label} `);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
                >
                  {prefill ? `${label}\u2026` : label}
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
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {ctx.length.toLocaleString()} characters, roughly{" "}
                      {Math.round(ctx.length / 4).toLocaleString()} tokens, paid
                      on every message
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 gap-1.5 px-2 text-xs"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(ctx);
                          toast.success("Context copied.");
                        } catch {
                          toast.error("Couldn't copy.");
                        }
                      }}
                    >
                      <CopyIcon className="size-3.5" />
                      Copy
                    </Button>
                  </div>
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
              {m.role === "assistant" ? (
                // A reply can be empty when the model answered with nothing
                // but a REMEMBER marker, which gets stripped before display.
                // The card below still has something to say, so show that
                // rather than a bubble of blank space.
                m.text.trim() ? (
                  <ChatMarkdown text={m.text} />
                ) : null
              ) : (
                m.text
              )}
              {/* An offer, never an action. Nothing reaches the user's notes
                  without this tap, and whatever is saved stays visible and
                  editable in Settings. */}
              {/* Only under the latest reply. Leaving them on older messages
                  turns the whole conversation into a wall of buttons, and a
                  follow-up to something three answers ago is rarely what the
                  user wants now. */}
              {m.role === "assistant" &&
                i === messages.length - 1 &&
                !loading &&
                m.followUps &&
                m.followUps.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.followUps.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
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
      {/* Pinned to the bottom of the conversation. With the nav gone there is
          nothing to clear but the home indicator. */}
      <div className="z-20 shrink-0 bg-background pb-[max(0.5rem,env(safe-area-inset-bottom))] md:sticky md:bottom-4 md:pb-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-e1 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
        >
          <textarea
            ref={inputRef}
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
