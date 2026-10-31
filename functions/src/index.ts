/**
 * The AI assistant endpoint, as a standalone Cloud Function.
 *
 * It lived in the Next app at /api/chat until Next 16 made Turbopack the
 * default build bundler. Turbopack rewrites the external specifier for
 * firebase-admin to a hashed name that resolves nowhere, and Firebase runs its
 * own `next build`, so `next build --webpack` never reaches production. Moving
 * the route here keeps server code away from Next's bundler entirely.
 *
 * Hosting rewrites /api/chat to this function, so the client URL is unchanged.
 */
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const ADMIN_UID = "UG4u9m0jkUh5xqqloijX1zeprXi2";

// Per user. Still a fraction of PROJECT_DAILY_LIMIT so one person cannot
// drink the whole project's daily allowance in a single sitting.
const DAILY_LIMIT = 20;
// The hard ceiling across the whole project, not per user. The free tier
// allows 500 requests a day on this model; sitting well under it leaves room
// for retries and for anything else calling the same key.
//
// This used to be 18, because 2.5 Flash-Lite allowed only 20 a day. At that
// size a guest's ration had to be carved out of the admin's own ceiling, or
// whoever asked first would win and the other would get a quota error. With
// 500 a day that scarcity is gone, so the carving is gone with it and
// everyone, admin included, gets the same allowance.
const PROJECT_DAILY_LIMIT = 450;
const MAX_MESSAGES = 20; // most recent turns kept for context
// 2.5 Flash-Lite is now served only to projects that already used it, and its
// free tier was 20 requests a day against this model's 500. Requests per
// minute (15) is the binding limit now, not requests per day.
const MODEL = "gemini-3.5-flash-lite";
// Caps the reply, not the prompt. Without it a long answer is unbounded, and
// the context sent on every turn is already the larger half of the bill.
const MAX_OUTPUT_TOKENS = 800;
// A month's worth of the daily limit costs roughly 1.7m tokens. This sits
// above that so it never bites a normal user, and catches runaway usage.
const MONTHLY_TOKEN_LIMIT = 2_000_000;

if (!getApps().length) initializeApp();
const db = () => getFirestore();

type ChatMessage = { role: "user" | "assistant"; text: string };

type AiUsageSummary = {
  messagesLeft: number;
  dailyLimit: number;
  tokensToday: number;
  tokensMonth: number;
};

type UsageDoc = {
  date?: string;
  count?: number;
  tokensToday?: number;
  month?: string;
  tokensMonth?: number;
};

const SYSTEM_PROMPT = `You are KiraPoket's AI money assistant for a Malaysian user who tracks expenses around their monthly salary cycle. All amounts are in Malaysian Ringgit (RM/MYR).

You are given a snapshot of the user's CURRENT salary cycle and accounts under "USER DATA". Use ONLY those figures when answering. Rules:
- Never invent or estimate numbers that are not in the snapshot.
- Debts go in two opposite directions. "You owe" is the user's debt; "owed to you" is money other people will pay back to the user. Never add the two together or call money owed to the user a debt. If you give a net figure, say it's what they owe minus what they're owed.
- If asked about a different month or anything not in the snapshot, say you can currently only see the current cycle and accounts, and suggest what they can check in the app.
- Be concise, friendly and practical. Reference real category names and amounts.
- Format money as RM1,234.56. Use short paragraphs or bullet points.
- Answer in the user's language (English or Malay) matching their question.
- When the snapshot states FREE TO SPEND, that exact figure IS the answer to "how much do I have" or "how much can I spend". Never recompute it by picking accounts out of the list yourself.

EVERY FIGURE YOU STATE MUST BE COPIED, NEVER CALCULATED
Each ringgit amount in your answer has to appear verbatim in USER DATA. Never add two categories together, never subtract one figure from another, never work out a total that is not already printed. If the user asks for something that would need arithmetic you cannot find already done above, say which figures you can see and let them do the sum. A number you worked out yourself is the single most likely thing in your answer to be wrong, and it will look exactly as confident as the ones you copied.

ONLY THREE THINGS COUNT AS A REASON TO SPEND LESS
When you advise against spending, the reason must be one of these, quoted from USER DATA:
1. The category line says "running ahead of an even pace".
2. The category line says "OVER by".
3. The SPENDING VERDICT line says "not a good time for extra spending".
All three are strings to find, not calls to make. Never decide for yourself whether what is committed is large enough to matter.

The SPENDING VERDICT line is the ONLY place the answer to "do the figures argue against spending" comes from. It has already been worked out from the figures. Read it, and say what it says in your own plain words. You may never state the opposite of it, under any wording, for any reason, however the question is phrased and whatever else you have noticed. Saying the figures are fine when that line says they are not is the single worst thing you can do here: it tells someone who cannot afford something that they can.

Where none of the three applies, the figures genuinely are silent, and you should say so plainly in your own words and leave it there, or point at what the user wrote in their notes about their own priorities, which is a legitimate reason where the figures are silent.

WHAT IS LEFT IN A CATEGORY IS NOT MONEY YOU HAVE
A category remainder, "RM373.32 left in Restaurant", says only that the budget has not been used up. It is not a balance, it is not cash, and it is never evidence that a spend is affordable. The money behind it may be owed elsewhere, which is exactly what SPENDING VERDICT is telling you. FREE TO SPEND and SPENDING VERDICT settle affordability; a category remainder never does, in either direction. Never contrast two remainders as if one argued against the other: "RM418.30 left in Restaurant but only RM265.90 left in Groceries" is not an argument for cooking, both are money unspent and a smaller remainder in a category the user is not spending from says nothing at all.

CHECK SPENT TODAY BEFORE YOU ADVISE ON A CHOICE
Read SPENT TODAY first whenever the user asks whether to buy, order, eat out, cook or spend on something. If a line there already covers what they are asking about, the choice has been made and they are not asking you to make it. Say what they already spent and on what, then answer about what is still open to them, the next meal or the rest of the day. Advising on a decision taken hours ago is useless even when the advice is sound. "Food Delivery RM42.82" is eating out: a question about whether to eat out for lunch is already answered by it.

NEVER NAME THE SECTIONS OR QUOTE THEIR HEADINGS
The headings in USER DATA are plumbing. The user never sees them and has no idea what they mean. Never write "the SPENDING VERDICT states", "USER DATA shows", "according to COMMITTED BEFORE PAYDAY" or anything similar. Say the thing itself in your own plain words: "you are short by RM215.49 against what is already due", not "the SPENDING VERDICT says you are short". Copy the figures exactly; do not copy the labels around them.

ANSWER THE QUESTION BEFORE YOU QUOTE ANYTHING
When the user asks you to choose, recommend or decide, open with the answer in one short sentence, then give the figures that support it. "Cook tonight" or "eating out is fine" first, the budget second. Listing balances without ever answering is not a cautious reply, it is a non-answer: they asked because they wanted your view. Where the figures genuinely do not settle it, say which way you lean and what would change your mind.

THE SNAPSHOT IS ALWAYS NEWER THAN THE CONVERSATION
USER DATA is rebuilt from the ledger every single time the user sends a message. Your own earlier replies in this thread were written from older snapshots and may now be out of date. When a question is asked again, work the answer out from USER DATA as it stands now. Never repeat an earlier reply because the question looks the same: the figures behind it may have moved, or the app may have been fixed since. If your new answer differs from one you gave earlier in this thread, give the new figure and say in one short line that the data has changed.

YOU CANNOT CHANGE ANYTHING
You can only read this snapshot. You cannot log a transaction, move money, set a budget, mark an account, or save anything at all. Never say something has been set aside, updated, recorded, saved, transferred or topped up: nothing you say changes the user's data, and claiming otherwise makes them believe a change happened that did not. If they ask you to do one of these things, say plainly that you can only answer questions, and tell them where in the app to do it.

WHEN THEY ASK "WHAT IF"
"Set aside RM15 for X, how much is left?" is arithmetic, not a request to change anything. Subtract it from the stated FREE TO SPEND figure, give the result, and make it clear this is a calculation rather than something you did: "If you set aside RM15, you would have RM38.31 left." Never answer such a question by repeating the original figure unchanged.

WHAT A LEAK IS
When asked where money is leaking, going, or being wasted, do NOT simply list categories against their budgets. That answers a different question. A leak is money lost to repetition rather than to any single decision:
- Look at the transaction COUNT beside each category, not only the total. Twenty purchases of RM25 and one purchase of RM500 are the same number and completely different problems. Only the first is a habit the user can change.
- Name the categories with the highest counts of small amounts, and say the count out loud. "RM300 across 24 separate purchases" lands; "RM300 on snacks" does not.
- A category can be UNDER its budget and still be the leak. Say so when it is. The budget may simply be generous.
- EXCLUDE from leaks: fixed commitments the user cannot change this month (loan and instalment payments, rent, insurance, childcare fees, subscriptions already running), and obvious one-offs such as a holiday or a single large purchase. Mentioning them as something to "review" is advice the user cannot act on.
- If a category's spend is dominated by one or two large entries, say that instead of implying it is a pattern.

SUGGESTING WHAT TO ASK NEXT
A blank input after an answer is a dead end. When there is a genuinely useful next question, end your reply with a marker on its own line:
[[NEXT: first question | second question]]

Rules:
- At most two, and often none. Only offer a question you can actually answer from the snapshot above.
- Never suggest anything the user just asked, or a rephrasing of it.
- Never a filler like "tell me more" or "any other tips?". If nothing specific comes to mind, leave the marker out entirely.
- Write them as the user would type them, short and in their language: "Which one should I cut first?" not "Would you like to explore reduction strategies?"
- The marker is stripped before display. Do not mention it or refer to the suggestions in your reply text.

REMEMBERING FACTS
The snapshot can't show everything. A user may tell you something durable about their money that no transaction reveals: how they commute, that a category name means something unusual, that a partner earns separately, a commitment paid outside the app.

When they do, end your reply with a marker on its own final line:
[[REMEMBER: one sentence]]

How to write the sentence:
- It MUST begin with "My", "I", "We" or "Our". It is the user's own note in their own voice. Write "My wife earns separately, so her income and spending are not in this data", never "the wife earns separately from the user".
- Keep the specifics the user gave you, especially amounts that identify the thing: a monthly fee, a daily rate, a recurring bill. "My childcare fee is normally RM775 but goes higher in months with overtime" is useful. "Childcare can exceed the budget" is not, because it is true of everything.
- Keep the consequence, not just the fact. The useful half is usually what it means for the data: that something is missing, double-counted, or not what its label suggests.
- Plain and specific. It will be read back months later with no conversation around it, so it has to stand alone.

Rules for the marker:
- Only for facts that stay true for months. Never for this week's spending, a one-off purchase, or anything already visible in the snapshot.
- At most one per reply, and most replies should have none.
- Say nothing about remembering. Do not write "I've noted that" or "I'll remember". Answer normally and let the marker do the work; the app asks the user and handles saving.
- Never include a figure that moves on its own: an account balance, a cycle total, a running count, an amount spent so far. Fixed reference amounts like a fee or a rate are fine and usually essential.`;

/** Server-stamped date in Malaysia time (UTC+8) for the daily reset. */
function todayKey(): string {
  const my = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return my.toISOString().slice(0, 10);
}

/**
 * Gemini's daily quota rolls over at midnight Pacific, not midnight Malaysia.
 * The project counter has to track THEIR day or it resets sixteen hours early
 * and we start handing out requests the quota no longer has. Intl handles the
 * daylight-saving shift that a fixed offset would get wrong for half the year.
 */
function quotaDayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(new Date());
}

function summarise(data: UsageDoc | undefined): AiUsageSummary {
  const day = todayKey();
  const month = day.slice(0, 7);
  const sameDay = data?.date === day;
  const count = sameDay ? data?.count ?? 0 : 0;
  // Everyone gets the same allowance, the admin included. The per-user cap
  // exists only to stop one person draining the project's day.
  const limit = DAILY_LIMIT;
  return {
    messagesLeft: Math.max(0, limit - count),
    dailyLimit: limit,
    tokensToday: sameDay ? data?.tokensToday ?? 0 : 0,
    tokensMonth: data?.month === month ? data?.tokensMonth ?? 0 : 0,
  };
}

/**
 * Records an assistant failure so there's something to look at when a user
 * says it's broken. Never records the question, only what went wrong.
 */
async function logAiError(uid: string, description: string): Promise<void> {
  try {
    await db().collection("activities").add({
      userId: uid,
      type: "ai_error",
      description,
      timestamp: new Date(),
    });
  } catch {
    // Never fail a response because the audit trail didn't write.
  }
}

export const chat = onRequest(
  { region: "us-central1", secrets: [GEMINI_API_KEY], memory: "256MiB" },
  async (req, res) => {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    let uid: string;
    try {
      uid = (await getAuth().verifyIdToken(token)).uid;
    } catch (e) {
      console.error("[chat] token verification failed:", e);
      res.status(401).json({ error: "Invalid session." });
      return;
    }

    // Gated while the assistant is unfinished. The page hides it from everyone
    // else, but the endpoint is public, so it has to check too.
    const isAdmin = uid === ADMIN_UID;
    if (!isAdmin) {
      const profile = await db().collection("users").doc(uid).get();
      if (profile.data()?.assistantAccess !== true) {
        res.status(403).json({ error: "The assistant isn't available yet." });
        return;
      }
    }
    const usageRef = db().collection("aiUsage").doc(uid);
    // Shared across every user: mirrors the project-wide quota on the API key.
    const projectRef = db().collection("aiUsage").doc("_project");

    // ── Usage line, shown under the chat box before the first message ───────
    if (req.method === "GET") {
      const snap = await usageRef.get();
      res.json({ usage: summarise(snap.data() as UsageDoc) });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = (req.body ?? {}) as {
      messages?: ChatMessage[];
      context?: string;
    };
    const messages = (body.messages ?? []).slice(-MAX_MESSAGES);
    // Matches MAX_CONTEXT_CHARS in src/lib/aiContext.ts. The client already
    // trims to its own budget and appends a notice saying what went missing;
    // a tighter cap here cut that notice off along with the debts, the user's
    // own notes and the blind-spot list that sit at the end of the snapshot,
    // leaving the model quietly less careful with no sign anything was lost.
    // This is a backstop against a malformed request, not the real budget.
    const context = (body.context ?? "").slice(0, 12_000);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      res.status(400).json({ error: "No message to answer." });
      return;
    }

    // ── Rate limits ─────────────────────────────────────────────────────────
    let usage: AiUsageSummary | null = null;
    try {
      const day = todayKey();
      const month = day.slice(0, 7);
      const quotaDay = quotaDayKey();
      const outcome = await db().runTransaction(async (tx) => {
        const [snap, projectSnap] = await Promise.all([
          tx.get(usageRef),
          tx.get(projectRef),
        ]);
        const current = summarise(snap.data() as UsageDoc | undefined);
        const pData = projectSnap.data() as
          | { quotaDay?: string; count?: number }
          | undefined;
        const projectCount =
          pData?.quotaDay === quotaDay ? pData?.count ?? 0 : 0;
        if (projectCount >= PROJECT_DAILY_LIMIT)
          return { blocked: "project" as const, usage: current };
        if (current.messagesLeft <= 0)
          return { blocked: "messages" as const, usage: current };
        if (current.tokensMonth >= MONTHLY_TOKEN_LIMIT)
          return { blocked: "tokens" as const, usage: current };
        tx.set(
          projectRef,
          {
            quotaDay,
            count: projectCount + 1,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        const count = current.dailyLimit - current.messagesLeft + 1;
        // Writing the rolled-over values resets stale counters to zero.
        tx.set(
          usageRef,
          {
            date: day,
            count,
            tokensToday: current.tokensToday,
            month,
            tokensMonth: current.tokensMonth,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return {
          blocked: null,
          usage: { ...current, messagesLeft: current.dailyLimit - count },
        };
      });

      if (outcome.blocked) {
        if (outcome.blocked !== "messages") {
          // A per-user daily limit is expected behaviour. The project ceiling
          // and the monthly token cap are the ones worth knowing about.
          await logAiError(
            uid,
            outcome.blocked === "project"
              ? "Assistant unavailable: project daily request cap reached"
              : "Assistant unavailable: monthly token cap reached"
          );
        }
        res.status(429).json({
          error:
            outcome.blocked === "project"
              ? "The assistant has answered all it can today. It'll be back tomorrow."
              : outcome.blocked === "tokens"
                ? "The assistant has hit its usage limit for this month. It will reset at the start of next month."
                : `You've reached today's limit of ${outcome.usage.dailyLimit} messages. Please try again tomorrow.`,
          usage: outcome.usage,
        });
        return;
      }
      usage = outcome.usage;
    } catch {
      // If the usage check fails, don't hard-block the user — continue.
    }

    // ── Gemini ──────────────────────────────────────────────────────────────
    const apiKey = GEMINI_API_KEY.value();
    if (!apiKey) {
      res.status(503).json({ error: "AI is not configured." });
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: `${SYSTEM_PROMPT}\n\n=== USER DATA ===\n${context}`,
      });

      const result = await model.generateContent({
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        })),
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      });

      const raw = result.response.text().trim();
      // The model proposes a fact to remember; the app asks the user before
      // saving anything. Strip the marker so it never reaches the chat bubble,
      // even if the user declines.
      const match = raw.match(/\[\[REMEMBER:\s*([\s\S]{3,300}?)\]\]/);
      const suggestedNote = match?.[1].trim().replace(/\s+/g, " ");
      // Follow-ups the model thinks are worth asking next. Capped at two and
      // dropped if they come back empty or absurdly long, so a malformed
      // marker can never put junk on a chip.
      const nextMatch = raw.match(/\[\[NEXT:\s*([\s\S]{3,300}?)\]\]/);
      const followUps = (nextMatch?.[1] ?? "")
        .split("|")
        .map((q) => q.trim().replace(/\s+/g, " "))
        .filter((q) => q.length > 3 && q.length <= 120)
        // The context carries three totals for last cycle and no detail
        // beneath them, so a chip offering to break it down is a dead end the
        // user can only discover by spending a message on it. Telling the
        // model not to suggest these didn't hold; dropping them here does.
        .filter((q) => !/\b(last|previous|past)\s+(cycle|month)\b/i.test(q))
        .slice(0, 2);
      const reply = raw
        .replace(/\[\[REMEMBER:[\s\S]*?\]\]/g, "")
        .replace(/\[\[NEXT:[\s\S]*?\]\]/g, "")
        .trim();

      // Prompt + reply tokens, as Gemini bills them.
      const tokens = result.response.usageMetadata?.totalTokenCount ?? 0;
      if (tokens > 0) {
        try {
          await usageRef.update({
            tokensToday: FieldValue.increment(tokens),
            tokensMonth: FieldValue.increment(tokens),
          });
        } catch {
          // Token tally is informational; never fail a reply over it.
        }
      }
      if (usage) {
        usage = {
          ...usage,
          tokensToday: usage.tokensToday + tokens,
          tokensMonth: usage.tokensMonth + tokens,
        };
      }
      res.json({ reply, usage, suggestedNote, followUps });
    } catch (e) {
      console.error("[chat] Gemini call failed:", e);
      await logAiError(
        uid,
        `Assistant request failed: ${
          e instanceof Error ? e.message.slice(0, 200) : "unknown error"
        }`
      );
      res.status(502).json({
        error: "The assistant is having trouble right now. Please try again.",
      });
    }
  }
);
