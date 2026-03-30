"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // When the SW controller changes (new SW took over via SKIP_WAITING + clients.claim),
    // reload every tab — not just the one that clicked the toast.
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Check for updates every time the page gains focus
      const checkUpdate = () => reg.update().catch(() => {});
      window.addEventListener("focus", checkUpdate);

      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;

        newSW.addEventListener("statechange", () => {
          // New SW installed and waiting — a previous SW was controlling the page
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            toast("New version available", {
              description: "Refresh to get the latest update.",
              duration: Infinity,
              action: {
                label: "Refresh",
                onClick: () => {
                  // SKIP_WAITING → SW activates → clients.claim() → controllerchange fires on all tabs → all reload
                  newSW.postMessage({ type: "SKIP_WAITING" });
                },
              },
            });
          }
        });
      });

      return () => window.removeEventListener("focus", checkUpdate);
    }).catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
