"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_UID } from "@/contexts/AppContext";
import { getAllUsers } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useState, useEffect } from "react";
import type { Timestamp } from "firebase/firestore";

const MAU_MS = 30 * 24 * 60 * 60 * 1000;

function lastLoginMs(lastLogin: Timestamp | null | undefined): number {
  if (!lastLogin) return 0;
  try { return lastLogin.toDate().getTime(); } catch { return 0; }
}

const MILESTONE_DEFS = [
  {
    step: "01",
    phase: "Now",
    mau: "0 – 100 MAU",
    action: "Free only. Focus on retention, fix pain points, word of mouth.",
    threshold: 0,
  },
  {
    step: "02",
    phase: "Early Adopter Pricing",
    mau: "100+ MAU",
    action: "Launch Pro at RM 29/year — locked forever. First 50 users only. Half the regular price.",
    threshold: 100,
  },
  {
    step: "03",
    phase: "Full Monetize",
    mau: "500+ MAU",
    action: "Activate freemium paywall at RM 59/year.",
    threshold: 500,
  },
];

const FREE_FEATURES = [
  "1 partner link",
  "AI insights once per 24 hours",
  "Up to 3 accounts",
  "Core transactions & budgeting",
];

const PRO_FEATURES = [
  "Unlimited accounts",
  "AI insights on-demand, no cooldown",
  "Export CSV / PDF monthly report",
  "Debt reminders (push notification)",
  "Priority support",
];

const REVENUE_ROWS = [
  { mau: "500", paying: "25", monthly: "RM 123", annual: "RM 1,475", pct: 5 },
  { mau: "1,000", paying: "50", monthly: "RM 245", annual: "RM 2,950", pct: 10 },
  { mau: "3,000", paying: "150", monthly: "RM 736", annual: "RM 8,850", pct: 30, highlight: true },
  { mau: "5,000", paying: "250", monthly: "RM 1,227", annual: "RM 14,700", pct: 50, highlight: true },
  { mau: "10,000", paying: "500", monthly: "RM 2,455", annual: "RM 29,450", pct: 100 },
];

const MOATS = [
  {
    n: "01",
    title: "Salary Cycle",
    desc: "No other Malaysian app handles pay-cycle scoping. This is the core differentiator.",
  },
  {
    n: "02",
    title: "AI Insights",
    desc: "Already feels premium. Rate-limiting it creates a natural freemium paywall.",
  },
  {
    n: "03",
    title: "Partner Budgeting",
    desc: "Couples and households are high-LTV users — stickier than solo users.",
  },
  {
    n: "04",
    title: "Malaysian-Native",
    desc: "MYR, local bank names, Malay UX tone. Imports can't replicate this.",
  },
];

export default function ProjectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mau, setMau] = useState<number | null>(null);

  useEffect(() => {
    getAllUsers().then((users) => {
      const count = users.filter(
        (u) => Date.now() - lastLoginMs(u.lastLogin) < MAU_MS
      ).length;
      setMau(count);
    });
  }, []);

  if (authLoading) return null;
  if (user?.uid !== ADMIN_UID) { router.replace("/home"); return null; }

  // Determine current milestone index based on live MAU
  const activeMilestoneIdx =
    mau === null ? 0 : MILESTONE_DEFS.length - 1 - [...MILESTONE_DEFS].reverse().findIndex((m) => (mau ?? 0) >= m.threshold);

  const milestones = MILESTONE_DEFS.map((m, i) => ({
    ...m,
    status:
      i < activeMilestoneIdx ? "done" :
      i === activeMilestoneIdx ? "current" :
      i === activeMilestoneIdx + 1 ? "upcoming" : "future",
  }));

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto space-y-10 pb-16">

      {/* Header */}
      <div className="space-y-3">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 -ml-1"
          onClick={() => router.push("/admin")}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>

        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight leading-tight">
            Growth &<br />Monetization
          </h1>
          <span className="mt-1.5 shrink-0 rounded-full bg-orange-100 dark:bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400">
            Internal
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
          KiraPoket · Malaysian personal finance market · All figures MYR ·
          Based on 5% freemium conversion rate, consistent with niche personal finance apps.
        </p>
      </div>

      {/* Milestones */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Path to Monetization
        </p>

        <div className="space-y-0">
          {milestones.map((m, i) => (
            <div key={m.step} className="flex gap-4">
              {/* connector */}
              <div className="flex flex-col items-center">
                <div
                  className={`size-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-3 ${
                    m.status === "done"
                      ? "bg-primary/20 text-primary"
                      : m.status === "current"
                      ? "bg-primary text-primary-foreground"
                      : m.status === "upcoming"
                      ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.status === "done" ? "✓" : m.step}
                </div>
                {i < milestones.length - 1 && (
                  <div className={`w-px flex-1 my-1 ${m.status === "done" ? "bg-primary/30" : "bg-border"}`} />
                )}
              </div>

              {/* content */}
              <div className="pb-6 pt-3 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p
                    className={`text-sm font-bold ${
                      m.status === "done"
                        ? "text-primary/60 line-through"
                        : m.status === "current"
                        ? "text-primary"
                        : m.status === "upcoming"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {m.phase}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/60">{m.mau}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{m.action}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Pricing Model — Freemium + Annual Sub
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Free */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Free</p>
              <p className="text-xl font-black mt-0.5">RM 0</p>
            </div>
            <ul className="space-y-1.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="text-[11px] text-muted-foreground flex gap-2 items-start leading-snug">
                  <span className="shrink-0 text-muted-foreground/50 mt-0.5">—</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 dark:bg-primary/10 p-4 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg">
              Recommended
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Pro</p>
              <p className="text-xl font-black mt-0.5">RM 59<span className="text-xs font-normal text-muted-foreground">/yr</span></p>
              <p className="text-[10px] text-muted-foreground">≈ RM 4.90/mo · or RM 6.90/mo monthly</p>
            </div>
            <ul className="space-y-1.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="text-[11px] text-foreground flex gap-2 items-start leading-snug">
                  <span className="shrink-0 text-primary mt-0.5 font-bold">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Early adopter note</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Early adopter pricing is <span className="font-semibold text-foreground">annual only (RM 29/yr)</span> — no monthly option.
            Annual gives committed cash upfront and "locked forever" only makes sense as a yearly deal.
            Add monthly billing later when launching regular Pro.
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed">
          Why RM 59/year — Malaysian users resist monthly subs but accept annual if value is clear.
          Under the "feels expensive" threshold. Comparable local apps: RM 40–80/year.
        </p>
      </section>

      {/* Revenue Table */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Revenue Projection · 5% Conversion
        </p>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">MAU</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Paying</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Monthly</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Annual</th>
              </tr>
            </thead>
            <tbody>
              {REVENUE_ROWS.map((r, i) => (
                <tr
                  key={r.mau}
                  className={`border-b border-border last:border-0 ${
                    r.highlight
                      ? "bg-primary/5 dark:bg-primary/10"
                      : "bg-card"
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className={`font-mono font-bold ${r.highlight ? "text-primary" : ""}`}>
                      {r.mau}
                    </span>
                    {r.highlight && (
                      <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-primary/70">
                        ★ target
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.paying}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.monthly}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`font-bold ${r.highlight ? "text-primary" : ""}`}>{r.annual}</span>
                      <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 bg-muted/30 border-t border-border">
            <p className="text-[10px] text-muted-foreground/60">
              Sweet spot: RM 1,000–2,000/mo at 3k–5k MAU — Firebase costs stay low, product sustains itself.
            </p>
          </div>
        </div>
      </section>

      {/* Moats */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Competitive Advantages
        </p>

        <div className="grid grid-cols-2 gap-3">
          {MOATS.map((m) => (
            <div key={m.n} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-2xl font-black text-primary/20 leading-none">{m.n}</p>
              <p className="text-xs font-bold">{m.title}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Growth callout */}
      <section className="rounded-xl bg-primary/8 dark:bg-primary/12 border border-primary/20 p-5 space-y-2">
        <p className="text-base font-black leading-snug">
          "The biggest lever isn&apos;t pricing — it&apos;s MAU growth."
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Organic is slow. Fastest paths: Malaysian personal finance Facebook groups,
          Reddit&nbsp;r/MalaysianPF, TikTok budgeting content.
        </p>
      </section>

    </div>
  );
}
