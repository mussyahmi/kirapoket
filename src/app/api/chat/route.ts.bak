import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

// firebase-admin requires the Node.js runtime (not Edge)
export const runtime = "nodejs";

const DAILY_LIMIT = 30; // messages per user per day
const MAX_MESSAGES = 20; // most recent turns kept for context
const MODEL = "gemini-2.5-flash-lite";

type ChatMessage = { role: "user" | "assistant"; text: string };

const SYSTEM_PROMPT = `You are KiraPoket's AI money assistant for a Malaysian user who tracks expenses around their monthly salary cycle. All amounts are in Malaysian Ringgit (RM/MYR).

You are given a snapshot of the user's CURRENT salary cycle and accounts under "USER DATA". Use ONLY those figures when answering. Rules:
- Never invent or estimate numbers that are not in the snapshot.
- If asked about a different month or anything not in the snapshot, say you can currently only see the current cycle and accounts, and suggest what they can check in the app.
- Be concise, friendly and practical. Reference real category names and amounts.
- Format money as RM1,234.56. Use short paragraphs or bullet points.
- Answer in the user's language (English or Malay) matching their question.`;

function todayKey(): string {
  // Server-stamped date in Malaysia time (UTC+8) for the daily reset
  const now = new Date();
  const my = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return my.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch (e) {
    console.error("[/api/chat] token verification failed:", e);
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { messages?: ChatMessage[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const messages = (body.messages ?? []).slice(-MAX_MESSAGES);
  const context = (body.context ?? "").slice(0, 8000);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "No message to answer." }, { status: 400 });
  }

  // ── Rate limit (per user per day) ────────────────────────────────────────────
  const db = getAdminDb();
  const usageRef = db.collection("aiUsage").doc(uid);
  try {
    const day = todayKey();
    const remaining = await db.runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const data = snap.data();
      const count = data?.date === day ? (data.count ?? 0) : 0;
      if (count >= DAILY_LIMIT) return -1;
      tx.set(
        usageRef,
        { date: day, count: count + 1, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return DAILY_LIMIT - (count + 1);
    });
    if (remaining < 0) {
      return NextResponse.json(
        { error: `You've reached today's limit of ${DAILY_LIMIT} messages. Please try again tomorrow.` },
        { status: 429 }
      );
    }
  } catch {
    // If the usage check fails, don't hard-block the user — continue.
  }

  // ── Gemini ───────────────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: `${SYSTEM_PROMPT}\n\n=== USER DATA ===\n${context}`,
    });

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    const result = await model.generateContent({ contents });
    const reply = result.response.text().trim();
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[/api/chat] Gemini call failed:", e);
    return NextResponse.json(
      { error: "The assistant is having trouble right now. Please try again." },
      { status: 502 }
    );
  }
}
