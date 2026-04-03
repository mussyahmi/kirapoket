"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useApp, ADMIN_UID } from "@/contexts/AppContext";
import { getAllUsers } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlertIcon, UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { UserProfile } from "@/lib/types";
import type { Timestamp } from "firebase/firestore";

function formatLastLogin(lastLogin: Timestamp | null | undefined): string {
  if (!lastLogin) return "Never";
  try {
    const date = lastLogin.toDate();
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

function lastLoginMs(lastLogin: Timestamp | null | undefined): number {
  if (!lastLogin) return 0;
  try {
    return lastLogin.toDate().getTime();
  } catch {
    return 0;
  }
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isImpersonating, impersonate, stopImpersonating } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);

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
              {sortedUsers.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 px-4 py-3">
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
                    <p className="text-xs text-muted-foreground/60">{formatLastLogin(u.lastLogin)}</p>
                  </div>
                  {u.uid === user.uid ? (
                    <span className="text-xs text-muted-foreground shrink-0">You</span>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => handleImpersonate(u.uid)}>
                      View
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
