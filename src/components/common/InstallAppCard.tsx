"use client";

import { useState, useEffect } from "react";
import { DownloadIcon, ShareIcon, PlusSquareIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS Safari
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    // navigator.standalone is an Apple extension; undefined on non-iOS
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    if (ios && !standalone) {
      setIsIos(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
    setInstalling(false);
  };

  // Nothing to show
  if (isInstalled || (!deferredPrompt && !isIos)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install App</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deferredPrompt ? (
          <>
            <p className="text-sm text-muted-foreground">
              Install KiraPoket on your device for quick access — no browser bar, works offline.
            </p>
            <Button className="w-full gap-2" onClick={handleInstall} disabled={installing}>
              <DownloadIcon className="size-4" />
              {installing ? "Installing…" : "Add to Home Screen"}
            </Button>
          </>
        ) : isIos ? (
          <>
            <p className="text-sm text-muted-foreground">
              Install KiraPoket on your iPhone for quick access — no browser bar, works offline.
            </p>
            <ol className="space-y-2 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                <span>Tap the <ShareIcon className="inline size-3.5 align-text-bottom" /> <strong>Share</strong> button in Safari&apos;s toolbar</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                <span>Scroll and tap <PlusSquareIcon className="inline size-3.5 align-text-bottom" /> <strong>&ldquo;Add to Home Screen&rdquo;</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                <span>Tap <strong>&ldquo;Add&rdquo;</strong> to confirm</span>
              </li>
            </ol>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
