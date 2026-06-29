"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";

const THRESHOLD = 60; // px pulled before a refresh fires
const MAX_PULL = 120; // px the content can travel
const RESTING = 56; // px the content rests at while refreshing
const RESISTANCE = 0.6; // fraction of finger travel the indicator follows

// Light haptic tap on supported devices (Android/Chrome; a no-op on iOS Safari)
function haptic(ms = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

/**
 * Pull-to-refresh for the installed PWA, where the browser's native gesture is
 * gone (standalone display mode). Engages only when the window is scrolled to
 * the very top and the user drags down. Touch-only — inert on desktop.
 */
export default function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Refs hold the live gesture state so the window listeners stay stable
  const startY = useRef(0);
  const active = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      // Only arm when already at the top of the page
      if (window.scrollY > 0) return;
      // Don't hijack scrolling inside dialogs / bottom sheets
      const target = e.target as Element | null;
      if (target?.closest('[role="dialog"], [data-no-ptr]')) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active.current || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      // Cancel if the user scrolled up or the page left the top
      if (dy <= 0 || window.scrollY > 0) {
        active.current = false;
        pullRef.current = 0;
        setPull(0);
        setDragging(false);
        return;
      }
      // Rubber-band resistance, capped
      const next = Math.min(MAX_PULL, dy * RESISTANCE);
      pullRef.current = next;
      setPull(next);
      setDragging(true);
      // Stop the native overscroll/bounce so our gesture owns the drag
      if (e.cancelable) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!active.current || refreshingRef.current) return;
      active.current = false;
      setDragging(false);
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(RESTING);
        haptic();
        try {
          await onRefresh();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          pullRef.current = 0;
          setPull(0);
        }
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh]);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <>
      {/* Spinner indicator — centred in the gap the sliding content opens up,
          just below the sticky header */}
      <div
        aria-hidden={pull === 0}
        className="md:hidden pointer-events-none fixed inset-x-0 z-40 flex justify-center"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
      >
        <span
          className="flex size-9 items-center justify-center rounded-full bg-background/80 shadow-md backdrop-blur-sm border border-border"
          style={{
            transform: `translateY(${pull / 2 - 18}px)`,
            opacity: pull > 4 ? 1 : 0,
            transition: dragging ? "none" : "transform 300ms cubic-bezier(0.34,1.4,0.5,1), opacity 200ms ease",
          }}
        >
          <Loader2Icon
            className={`size-5 text-primary ${refreshing ? "animate-spin" : ""}`}
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }}
          />
        </span>
      </div>

      <div
        className={className}
        style={{
          transform: `translateY(${pull}px)`,
          transition: dragging ? "none" : "transform 300ms cubic-bezier(0.34,1.4,0.5,1)",
        }}
      >
        {children}
      </div>
    </>
  );
}
