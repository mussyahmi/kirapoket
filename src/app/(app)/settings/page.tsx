"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { LogOutIcon, SunIcon, MoonIcon, TrashIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ThemeOption = "light" | "dark";

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

export default function SettingsPage() {
  const { user, signOut, deleteUserAccount } = useAuth();
  const { userProfile, saveUserProfile } = useApp();
  const { resolvedTheme, setTheme } = useTheme();

  const [salaryDay, setSalaryDay] = useState<number | null>(null);
  const [salaryGraceDays, setSalaryGraceDays] = useState(0);
  const [hideBalance, setHideBalance] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (userProfile) {
      setSalaryDay(userProfile.salaryDay ?? null);
      setSalaryGraceDays(userProfile.salaryGraceDays ?? 0);
      setHideBalance(userProfile.hideBalance ?? false);
    }
  }, [userProfile]);

  const handleSelectDay = async (day: number) => {
    setSalaryDay(day);
    try {
      await saveUserProfile({ salaryDay: day });
    } catch {
      toast.error("Failed to save salary day.");
    }
  };

  const handleSelectGrace = async (days: number) => {
    setSalaryGraceDays(days);
    try {
      await saveUserProfile({ salaryGraceDays: days });
    } catch {
      toast.error("Failed to save grace period.");
    }
  };

  const handleToggleBalance = async () => {
    const next = !hideBalance;
    setHideBalance(next);
    try {
      await saveUserProfile({ hideBalance: next });
    } catch {
      toast.error("Failed to save preference.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out.");
    } catch {
      toast.error("Failed to sign out.");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteUserAccount();
    } catch {
      toast.error("Failed to delete account. Please sign out and sign in again before retrying.");
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar size="lg">
            {user?.photoURL ? (
              <AvatarImage src={user.photoURL} alt={user.displayName ?? "User"} />
            ) : null}
            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName ?? "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Salary Cycle */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Cycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium transition-colors",
                  salaryDay === day
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/70"
                )}
              >
                {day}
              </button>
            ))}
          </div>
          {salaryDay ? (
            <p className="text-xs text-muted-foreground">
              Your expense cycle resets on day {salaryDay} of each month.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Select your salary day.</p>
          )}

          {/* Grace period */}
          {salaryDay && (
            <div className="space-y-2 pt-1 border-t border-border">
              <div>
                <p className="text-sm font-medium">Early arrival buffer</p>
                <p className="text-xs text-muted-foreground">
                  Start the cycle this many days before your salary day.
                </p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectGrace(d)}
                    className={cn(
                      "flex-1 h-9 rounded-lg text-sm font-medium transition-colors",
                      salaryGraceDays === d
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/70"
                    )}
                  >
                    {d === 0 ? "Off" : `${d}d`}
                  </button>
                ))}
              </div>
              {salaryGraceDays > 0 && (
                <p className="text-xs text-muted-foreground">
                  Cycle will start on day {Math.max(salaryDay - salaryGraceDays, 1)}, {salaryGraceDays} day{salaryGraceDays > 1 ? "s" : ""} early.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-3 px-2 text-xs font-medium transition-colors",
                    resolvedTheme === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ label }) => (
                <div key={label} className="flex-1 h-16 rounded-lg border border-border bg-muted animate-pulse" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Hide balance</p>
              <p className="text-xs text-muted-foreground">
                Mask all monetary values with ••••
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hideBalance}
              onClick={handleToggleBalance}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none",
                hideBalance ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                  hideBalance ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Sign Out */}
      <Button
        variant="destructive"
        className="w-full gap-2"
        onClick={handleSignOut}
      >
        <LogOutIcon className="size-4" />
        Sign Out
      </Button>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive text-sm">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Permanently delete your account and all data — accounts, transactions, and categories. This cannot be undone.
          </p>
          <Button
            variant="ghost"
            className="w-full gap-2 border border-destructive/50 text-destructive hover:bg-destructive hover:text-white hover:border-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <TrashIcon className="size-4" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground/40 pb-2">
        v{process.env.NEXT_PUBLIC_APP_VERSION}
      </p>

      {/* Confirm delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => !deleting && setDeleteDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            All your data will be permanently deleted. This action <strong>cannot be undone</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? "Deleting..." : "Yes, delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
