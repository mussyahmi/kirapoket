"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import PullToRefresh from "@/components/common/PullToRefresh";
import { cn } from "@/lib/utils";

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (Math.abs(delta) < 4) return;
      setHeaderVisible(delta < 0 || currentY < 50);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className={cn(
        "sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-card/90 backdrop-blur-md transition-transform duration-300",
        headerVisible ? "translate-y-0" : "-translate-y-full"
      )}>
        <button
          type="button"
          onClick={() => window.history.length > 1 ? router.back() : router.push("/")}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </button>
        <ThemeToggle />
      </header>
      <main className="flex-1">
        <PullToRefresh onRefresh={async () => { await new Promise((r) => setTimeout(r, 300)); window.location.reload(); }}>
          {children}
        </PullToRefresh>
      </main>
    </div>
  );
}
