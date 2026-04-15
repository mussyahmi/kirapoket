"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useApp, ADMIN_UID } from "@/contexts/AppContext";
import { getAllUsers, getUserActivities } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDownIcon, ChevronUpIcon, ShieldAlertIcon, UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Activity, UserProfile } from "@/lib/types";
import type { Timestamp } from "firebase/firestore";

function lastLoginMs(lastLogin: Timestamp | null | undefined): number {
  if (!lastLogin) return 0;
  try {
    return lastLogin.toDate().getTime();
  } catch {
    return 0;
  }
}

function formatTimestamp(ts: Timestamp): string {
  try {
    return formatDistanceToNow(ts.toDate(), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}


function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <p className="text-xs text-muted-foreground leading-snug">{activity.description}</p>
      <p className="text-xs text-muted-foreground/50 shrink-0 whitespace-nowrap">
        {formatTimestamp(activity.timestamp)}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isImpersonating, impersonate, stopImpersonating } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);

  // Per-user drill-down: uid → activities (fetched on expand)
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [userActivities, setUserActivities] = useState<Record<string, Activity[]>>({});
  const [loadingActivity, setLoadingActivity] = useState<string | null>(null);

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    if (!isAdmin) return;
    getAllUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const diff = lastLoginMs(b.lastLogin) - lastLoginMs(a.lastLogin);
      return sortAsc ? -diff : diff;
    });
  }, [users, sortAsc]);

  if (authLoading) return null;

  if (!isAdmin) {
    router.replace("/home");
    return null;
  }

  const handleImpersonate = (uid: string) => {
    impersonate(uid);
    router.push("/home");
  };

  const handleStop = () => {
    stopImpersonating();
  };

  const toggleExpand = async (uid: string) => {
    if (expandedUid === uid) {
      setExpandedUid(null);
      return;
    }
    setExpandedUid(uid);
    if (userActivities[uid]) return; // already loaded
    setLoadingActivity(uid);
    try {
      const acts = await getUserActivities(uid, 20);
      setUserActivities((prev) => ({ ...prev, [uid]: acts }));
    } finally {
      setLoadingActivity(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlertIcon className="size-5 text-orange-500" />
        <h1 className="text-xl font-semibold">Admin</h1>
      </div>

      {isImpersonating && (
        <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-orange-500 font-medium">Currently viewing as another user</p>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStop}>
            Stop
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Users ({users.length})</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => setSortAsc((v) => !v)}
          >
            Last login {sortAsc ? "↑" : "↓"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : sortedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No users found.</p>
          ) : (
            <div className="divide-y divide-border">
              {sortedUsers.map((u) => {
                const isExpanded = expandedUid === u.uid;
                const acts = userActivities[u.uid];
                const isLoadingActs = loadingActivity === u.uid;

                return (
                  <div key={u.uid}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex items-center justify-center size-8 rounded-full bg-muted shrink-0">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="size-8 rounded-full object-cover" />
                        ) : (
                          <UserIcon className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.displayName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email ?? u.uid}</p>
                        {u.lastLogin && (
                          <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                            Last login · {formatTimestamp(u.lastLogin)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => toggleExpand(u.uid)}
                          title="Activity history"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronDownIcon className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                        {u.uid === user.uid ? (
                          <span className="text-xs text-muted-foreground">You</span>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleImpersonate(u.uid)}>
                            View
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-border bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground pt-2 pb-1">Recent activity</p>
                        {isLoadingActs ? (
                          <div className="space-y-1.5 py-1">
                            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                          </div>
                        ) : !acts || acts.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50 py-1">No activity recorded.</p>
                        ) : (
                          <div className="divide-y divide-border/50">
                            {acts.map((a) => <ActivityRow key={a.id} activity={a} />)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
