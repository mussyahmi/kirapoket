"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useApp, ADMIN_UID } from "@/contexts/AppContext";
import { getAllUsers, getUserActivities, getUserStats, clearAndSeedDemoData, DEMO_UID } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronDownIcon, ChevronUpIcon, UserIcon, SearchIcon, TrendingUpIcon, ChevronRightIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Activity, UserProfile } from "@/lib/types";
import type { Timestamp } from "firebase/firestore";

const MAU_MS = 30 * 24 * 60 * 60 * 1000;
const EARLY_ADOPTER_TARGET = 100;
const FULL_MONETIZE_TARGET = 500;

function lastLoginMs(lastLogin: Timestamp | null | undefined): number {
  if (!lastLogin) return 0;
  try { return lastLogin.toDate().getTime(); } catch { return 0; }
}

function formatTimestamp(ts: Timestamp): string {
  try { return formatDistanceToNow(ts.toDate(), { addSuffix: true }); } catch { return "Unknown"; }
}

function isActive(lastLogin: Timestamp | null | undefined): boolean {
  return Date.now() - lastLoginMs(lastLogin) < MAU_MS;
}

function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <p className="text-xs text-muted-foreground leading-snug">{activity.description}</p>
      <p className="text-[10px] text-muted-foreground/40 shrink-0 whitespace-nowrap">
        {formatTimestamp(activity.timestamp)}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { impersonate } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [userActivities, setUserActivities] = useState<Record<string, Activity[]>>({});
  const [userStats, setUserStats] = useState<Record<string, { transactions: number; accounts: number }>>({});
  const [loadingActivity, setLoadingActivity] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    if (!isAdmin) return;
    getAllUsers().then(setUsers).finally(() => setLoading(false));
  }, [isAdmin]);

  const mau = useMemo(
    () => users.filter((u) => isActive(u.lastLogin)).length,
    [users]
  );

  const mauPct = users.length ? Math.round((mau / users.length) * 100) : 0;
  const currentTarget = mau < EARLY_ADOPTER_TARGET ? EARLY_ADOPTER_TARGET : FULL_MONETIZE_TARGET;
  const currentLabel = mau < EARLY_ADOPTER_TARGET ? "early adopter launch" : "full monetization";
  const targetPct = Math.min(Math.round((mau / currentTarget) * 100), 100);

  const sortedUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? users.filter((u) =>
          u.displayName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
        )
      : users;
    return [...filtered].sort((a, b) => {
      const diff = lastLoginMs(b.lastLogin) - lastLoginMs(a.lastLogin);
      return sortAsc ? -diff : diff;
    });
  }, [users, sortAsc, search]);

  if (authLoading) return null;
  if (!isAdmin) { router.replace("/home"); return null; }

  const handleImpersonate = (uid: string) => {
    impersonate(uid);
    router.push("/home");
  };

  const handleSeedDemo = async () => {
    if (!confirm("This will wipe all data for the demo account and replace it with fresh seed data. Continue?")) return;
    setSeedingDemo(true);
    try {
      await clearAndSeedDemoData();
      toast.success("Demo data seeded");
    } catch (e) {
      console.error(e);
      toast.error("Seed failed — check console");
    } finally {
      setSeedingDemo(false);
    }
  };

  const toggleExpand = async (uid: string) => {
    if (expandedUid === uid) { setExpandedUid(null); return; }
    setExpandedUid(uid);
    if (userActivities[uid]) return;
    setLoadingActivity(uid);
    try {
      const [acts, stats] = await Promise.all([
        getUserActivities(uid, 20),
        getUserStats(uid),
      ]);
      setUserActivities((prev) => ({ ...prev, [uid]: acts }));
      setUserStats((prev) => ({ ...prev, [uid]: stats }));
    } finally {
      setLoadingActivity(null);
    }
  };

  return (
    <>
    <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-xs">
        {lightboxUrl && (
          <img src={lightboxUrl} alt="" className="w-full rounded-2xl object-cover" />
        )}
      </DialogContent>
    </Dialog>

    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-5 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">KiraPoket</p>
          <h1 className="text-2xl font-black tracking-tight">Admin</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground font-medium">Live</span>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card px-3 py-3">
                <Skeleton className="h-2.5 w-8 mb-2" />
                <Skeleton className="h-7 w-10" />
              </div>
            ))}
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
          <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-2.5 w-48" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border bg-card px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
              <p className="text-2xl font-black mt-1 leading-none">{users.length}</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-primary/70">MAU</p>
              <p className="text-2xl font-black mt-1 leading-none text-primary">{mau}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Active</p>
              <p className="text-2xl font-black mt-1 leading-none">
                {mauPct}<span className="text-sm font-normal text-muted-foreground">%</span>
              </p>
            </div>
          </div>

          {/* MAU calculation note */}
          <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2 leading-relaxed">
            MAU = <span className="font-semibold">login-based</span>. Switch to activity-based at ~50 MAU before the 100 MAU milestone locks in early adopter pricing.
          </p>

          {/* Progress to 500 MAU */}
          <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Path to monetization
              </p>
              <p className="text-[10px] font-mono text-muted-foreground">
                {mau} <span className="text-muted-foreground/40">/ {currentTarget} MAU</span>
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${targetPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              {targetPct}% — {currentTarget - mau > 0 ? `${currentTarget - mau} more to unlock ${currentLabel}` : "Ready to monetize 🎉"}
            </p>
          </div>
        </div>
      )}

      {/* Growth & Monetization link */}
      <button
        onClick={() => router.push("/admin/projection")}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/40 transition-colors group"
      >
        <div className="flex items-center justify-center size-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 shrink-0">
          <TrendingUpIcon className="size-4 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Growth & Monetization</p>
          <p className="text-xs text-muted-foreground">Milestones · pricing model · revenue projection</p>
        </div>
        <ChevronRightIcon className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
      </button>

      {/* User list */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border bg-muted/20">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="h-8 pl-7 text-xs bg-background"
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs gap-1 text-muted-foreground shrink-0"
            onClick={() => setSortAsc((v) => !v)}
          >
            {sortAsc ? "Oldest" : "Recent"} {sortAsc ? "↑" : "↓"}
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="divide-y divide-border">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="relative shrink-0">
                  <Skeleton className="size-9 rounded-full" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-muted" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className={`h-3 ${["w-28", "w-36", "w-24", "w-32"][i]}`} />
                  <Skeleton className={`h-2.5 ${["w-40", "w-48", "w-36", "w-44"][i]}`} />
                  <Skeleton className="h-2 w-16" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Skeleton className="size-7 rounded-md" />
                  <Skeleton className="h-7 w-12 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">No users found.</p>
        ) : (
          <div className="divide-y divide-border">
            {sortedUsers.map((u) => {
              const isExpanded = expandedUid === u.uid;
              const acts = userActivities[u.uid];
              const stats = userStats[u.uid];
              const isLoadingActs = loadingActivity === u.uid;
              const active = isActive(u.lastLogin);

              return (
                <div key={u.uid}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">

                    {/* Avatar with active dot */}
                    <div className="relative shrink-0">
                      <div
                        className={`flex items-center justify-center size-9 rounded-full bg-muted overflow-hidden ${u.photoURL ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                        onClick={() => u.photoURL && setLightboxUrl(u.photoURL)}
                      >
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="size-9 object-cover" />
                        ) : (
                          <UserIcon className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${
                          active ? "bg-emerald-500" : "bg-muted-foreground/30"
                        }`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">{u.displayName ?? "—"}</p>
                        {u.uid === user.uid && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</p>
                      {u.lastLogin && (
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                          {formatTimestamp(u.lastLogin)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleExpand(u.uid)}
                      >
                        {isExpanded
                          ? <ChevronUpIcon className="size-3.5 text-muted-foreground" />
                          : <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                        }
                      </Button>
                      {u.uid !== user.uid && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5"
                          onClick={() => handleImpersonate(u.uid)}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/20 space-y-3">

                      {/* UID */}
                      <p
                        className="text-[10px] font-mono text-muted-foreground/40 cursor-pointer hover:text-muted-foreground/70 transition-colors break-all"
                        title="Click to copy UID"
                        onClick={() => { navigator.clipboard.writeText(u.uid); toast.success("UID copied"); }}
                      >
                        {u.uid}
                      </p>

                      {/* Demo seed button */}
                      {u.uid === DEMO_UID && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-500/10"
                          disabled={seedingDemo}
                          onClick={handleSeedDemo}
                        >
                          {seedingDemo ? "Seeding…" : "Reset demo data"}
                        </Button>
                      )}

                      {/* Stats */}
                      {isLoadingActs ? (
                        <div className="flex gap-5">
                          <div className="space-y-1.5">
                            <Skeleton className="h-2 w-16" />
                            <Skeleton className="h-5 w-8" />
                          </div>
                          <div className="space-y-1.5">
                            <Skeleton className="h-2 w-12" />
                            <Skeleton className="h-5 w-5" />
                          </div>
                        </div>
                      ) : stats && (
                        <div className="flex gap-5">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/50 font-medium">Transactions</p>
                            <p className="text-base font-bold">{stats.transactions}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/50 font-medium">Accounts</p>
                            <p className="text-base font-bold">{stats.accounts}</p>
                          </div>
                        </div>
                      )}

                      {/* Activity */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                          Recent activity
                        </p>
                        {isLoadingActs ? (
                          <div className="space-y-2.5">
                            {(["w-full", "w-4/5", "w-3/4", "w-full", "w-11/12"] as const).map((w, i) => (
                              <div key={i} className="flex items-center justify-between gap-4">
                                <Skeleton className={`h-2.5 ${w}`} />
                                <Skeleton className="h-2 w-10 shrink-0" />
                              </div>
                            ))}
                          </div>
                        ) : !acts || acts.length === 0 ? (
                          <p className="text-xs text-muted-foreground/40">No activity recorded.</p>
                        ) : (
                          <div className="divide-y divide-border/50">
                            {acts.map((a) => <ActivityRow key={a.id} activity={a} />)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
