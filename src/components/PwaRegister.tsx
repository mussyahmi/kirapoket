"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

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
                  newSW.postMessage({ type: "SKIP_WAITING" });
                  window.location.reload();
                },
              },
            });
          }
        });
      });

      return () => window.removeEventListener("focus", checkUpdate);
    }).catch(() => {});
  }, []);

  return null;
}
