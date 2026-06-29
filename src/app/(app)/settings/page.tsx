"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  LogOutIcon, SunIcon, MoonIcon, TrashIcon,
  HeartHandshakeIcon, SendIcon, XCircleIcon,
  StopCircleIcon, CheckCircle2Icon,
  ClockIcon, PencilIcon, ClipboardCheckIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { InstallAppCard } from "@/components/common/InstallAppCard";
import { OnboardingNextModal } from "@/components/common/OnboardingNextModal";

type ThemeOption = "light" | "dark";

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut, deleteUserAccount } = useAuth();
  const {
    userProfile, ownProfile, saveUserProfile, loadingProfile, partnership, isViewingPartner, isImpersonating,
    invitePartner, cancelInvite, pausePartnerView, resumePartnerView, terminatePartnership,
  } = useApp();
  const { resolvedTheme, setTheme } = useTheme();

  const [salaryDay, setSalaryDay] = useState<number | null>(null);
  const [confirmBeforeSaving, setConfirmBeforeSaving] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const isReadOnly = mounted && (isViewingPartner || isImpersonating);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removePartnerDialogOpen, setRemovePartnerDialogOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (userProfile) {
      setSalaryDay(userProfile.salaryDay ?? null);
      setConfirmBeforeSaving(userProfile.confirmBeforeSaving ?? true);
    }
  }, [userProfile]);

  const handleSelectDay = async (day: number) => {
    setSalaryDay(day);
    try {
      await saveUserProfile({ salaryDay: day });
      if (searchParams.get("from") === "onboarding") {
        setOnboardingModalOpen(true);
      }
    } catch {
      toast.error("Failed to save salary day.");
    }
  };

  const handleToggleConfirm = async () => {
    const next = !confirmBeforeSaving;
    setConfirmBeforeSaving(next);
    try {
      await saveUserProfile({ confirmBeforeSaving: next });
    } catch {
      toast.error("Failed to save preference.");
    }
  };

  const handleOpenEditName = () => {
    setNameInput(ownProfile?.displayName ?? user?.displayName ?? "");
    setEditNameDialogOpen(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { toast.error("Name can't be empty."); return; }
    setSavingName(true);
    try {
      await saveUserProfile({ displayName: trimmed });
      setEditNameDialogOpen(false);
      toast.success("Name updated.");
    } catch {
      toast.error("Failed to update name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleInvitePartner = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast.error("Please enter a valid email address."); return; }
    if (email.toLowerCase() === user?.email?.toLowerCase()) { toast.error("You can't invite yourself."); return; }
    setInviting(true);
    try {
      await invitePartner(email);
      setInviteEmail("");
      toast.success("Invite sent! They'll see it when they next open KiraPoket.");
    } catch {
      toast.error("Failed to send invite.");
    } finally {
      setInviting(false);
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

  const partnerName = partnership
    ? (partnership.inviterUid === user?.uid
      ? partnership.inviteeEmail
      : partnership.inviterName ?? partnership.inviterEmail)
    : null;

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4 pb-10">

      {/* Profile */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex items-center gap-4 py-5">
          {loadingProfile ? (
            <div className="size-10 shrink-0 rounded-full bg-muted animate-pulse" />
          ) : (
            <Avatar size="lg" className="shrink-0 shadow-sm">
              {user?.photoURL ? (
                <AvatarImage src={user.photoURL} alt={ownProfile?.displayName ?? user.displayName ?? "User"} />
              ) : null}
              <AvatarFallback className="text-sm font-semibold">{getInitials(ownProfile?.displayName ?? user?.displayName)}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            {loadingProfile ? (
              <div className="space-y-2">
                <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-44 rounded-md bg-muted animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold truncate leading-tight">{ownProfile?.displayName ?? user?.displayName ?? "User"}</p>
                  <button
                    type="button"
                    onClick={handleOpenEditName}
                    title="Edit name"
                    className="shrink-0 rounded-md p-1 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <PencilIcon className="size-3" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSignOutDialogOpen(true)}
            title="Sign out"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <LogOutIcon className="size-4" />
          </button>
        </CardContent>
      </Card>

      {/* Salary Cycle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Salary Cycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Select the day your salary arrives each month.
          </p>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  if (isReadOnly) {
                    toast.info("You can't change your partner's salary date.");
                    return;
                  }
                  handleSelectDay(day);
                }}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium transition-all",
                  salaryDay === day
                    ? "bg-primary text-primary-foreground shadow-sm scale-105"
                    : isReadOnly
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-muted text-foreground hover:bg-muted/70"
                )}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {salaryDay
              ? <>Cycle resets on day <strong>{salaryDay}</strong> each month. Days 29–31 fall back to the last day of shorter months.</>
              : "Pick your salary day to start tracking cycles."}
          </p>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <div className="grid grid-cols-2 gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border-2 p-3 text-left transition-all",
                    resolvedTheme === value
                      ? "border-primary"
                      : "border-border hover:border-border/80 hover:bg-muted/40"
                  )}
                >
                  <div className={cn(
                    "mb-2 h-10 rounded-md border",
                    value === "light"
                      ? "bg-white border-zinc-200"
                      : "bg-zinc-900 border-zinc-700"
                  )}>
                    <div className={cn(
                      "m-1.5 h-2 w-1/2 rounded-full",
                      value === "light" ? "bg-zinc-200" : "bg-zinc-700"
                    )} />
                    <div className={cn(
                      "mx-1.5 h-1.5 w-3/4 rounded-full",
                      value === "light" ? "bg-zinc-100" : "bg-zinc-800"
                    )} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                  {resolvedTheme === value && (
                    <div className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {THEME_OPTIONS.map(({ label }) => (
                <div key={label} className="h-20 rounded-xl border-2 border-border bg-muted animate-pulse" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            role="switch"
            aria-checked={confirmBeforeSaving}
            onClick={handleToggleConfirm}
            disabled={isReadOnly}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <ClipboardCheckIcon className={cn("size-4 shrink-0", confirmBeforeSaving ? "text-primary" : "text-muted-foreground")} />
              <div>
                <p className="text-sm font-medium">Confirm before saving</p>
                <p className="text-xs text-muted-foreground">
                  {confirmBeforeSaving
                    ? "Review a summary and balance changes before saving"
                    : "Save transactions immediately"}
                </p>
              </div>
            </div>
            <div className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
              confirmBeforeSaving ? "bg-primary" : "bg-muted"
            )}>
              <span className={cn(
                "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                confirmBeforeSaving ? "translate-x-6" : "translate-x-1"
              )} />
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Partner Access */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Partner Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!partnership && (
            <>
              <p className="text-xs text-muted-foreground">
                Invite your partner to view each other&apos;s finances in read-only mode.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="partner@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvitePartner()}
                  disabled={inviting || isImpersonating}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleInvitePartner} disabled={inviting || !inviteEmail.trim() || isImpersonating}>
                  <SendIcon className="size-3.5 mr-1.5" />
                  {inviting ? "Sending…" : "Invite"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/60">
                They must have a KiraPoket account with that email.
              </p>
            </>
          )}

          {partnership?.status === "pending" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-4 py-3">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Waiting for acceptance</p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-400/70 truncate">{partnership.inviteeEmail}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full border border-destructive/30"
                disabled={isImpersonating}
                onClick={async () => { await cancelInvite(); toast.success("Invite cancelled."); }}
              >
                <XCircleIcon className="size-3.5 mr-1.5" />
                Cancel Invite
              </Button>
            </div>
          )}

          {partnership?.status === "active" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 px-4 py-3">
                <CheckCircle2Icon className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-green-800 dark:text-green-300">Connected</p>
                  <p className="text-xs text-green-700/70 dark:text-green-400/70 truncate">{partnerName}</p>
                </div>
              </div>
              {isViewingPartner ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={isImpersonating}
                  onClick={() => { pausePartnerView(); toast.success("Switched back to your data."); }}
                >
                  <StopCircleIcon className="size-3.5 mr-1.5" />
                  Stop Viewing
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={isImpersonating}
                  onClick={() => { resumePartnerView(); toast.success("Viewing partner's finances."); }}
                >
                  <HeartHandshakeIcon className="size-3.5 mr-1.5" />
                  View Partner&apos;s Finances
                </Button>
              )}
              {!isViewingPartner && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full border border-destructive/30"
                  disabled={isImpersonating}
                  onClick={() => setRemovePartnerDialogOpen(true)}
                >
                  <StopCircleIcon className="size-3.5 mr-1.5" />
                  Remove Partner Access
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Install App */}
      <InstallAppCard />

      {!isReadOnly && <>
        <Separator />

        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive text-sm">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Permanently deletes your account, all transactions, accounts, and categories. Cannot be undone.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 border border-destructive/40 text-destructive hover:bg-destructive hover:text-white hover:border-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <TrashIcon className="size-3.5" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </>}

      <p className="text-center text-xs text-muted-foreground/40 pb-2 space-x-2">
        <span>KiraPoket &copy; {new Date().getFullYear()}</span>
        <span>·</span>
        <Link href="/changelog" className="hover:text-muted-foreground transition-colors">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-muted-foreground transition-colors">
          Privacy Policy
        </Link>
      </p>

      <Dialog open={editNameDialogOpen} onOpenChange={(o) => !savingName && setEditNameDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit display name</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
            disabled={savingName}
            placeholder="Your name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameDialogOpen(false)} disabled={savingName}>
              Cancel
            </Button>
            <Button onClick={handleSaveName} disabled={savingName || !nameInput.trim()}>
              {savingName ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removePartnerDialogOpen} onOpenChange={setRemovePartnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove partner access?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You and your partner will no longer be able to view each other&apos;s finances. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovePartnerDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setRemovePartnerDialogOpen(false);
                await terminatePartnership();
                toast.success("Partner access removed.");
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You&apos;ll need to sign in again to access your data.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOutDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSignOut}>Sign out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <OnboardingNextModal
        open={onboardingModalOpen}
        onClose={() => setOnboardingModalOpen(false)}
        completedStep="Salary day set!"
        nextStep="Add your first account"
        nextDescription="Track your cash, bank, and e-wallet balances."
        ctaLabel="Add Account"
        ctaHref="/accounts?from=onboarding"
      />
    </div>
  );
}

export default function SettingsPageWrapper() {
  return <Suspense><SettingsPage /></Suspense>;
}
