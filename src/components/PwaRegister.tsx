"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    // On iOS standalone PWA, window.location.reload() is a soft reload that keeps
    // the old JS heap alive. window.location.replace() forces a true navigation,
    // resetting the JS context so all pages see the new bundle.
    const hardNav = () => {
      if (reloading) return;
      reloading = true;
      window.location.replace(window.location.href);
    };

    navigator.serviceWorker.addEventListener("controllerchange", hardNav);

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      const checkUpdate = () => reg.update().catch(() => {});
      window.addEventListener("focus", checkUpdate);

      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;

        newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            toast("New version available", {
              description: "Refresh to get the latest update.",
              duration: Infinity,
              action: {
                label: "Refresh",
                onClick: () => {
                  newSW.postMessage({ type: "SKIP_WAITING" });
                  // Fallback: iOS may not fire controllerchange reliably
                  setTimeout(hardNav, 1500);
                },
              },
            });
          }
        });
      });

      return () => window.removeEventListener("focus", checkUpdate);
    }).catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", hardNav);
    };
  }, []);

  return null;
}
