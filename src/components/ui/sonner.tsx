"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          // Make the toast surface translucent so backdrop-filter can do its work
          "--normal-bg": "transparent",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "transparent",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: [
            "cn-toast",
            "!bg-white/75 dark:!bg-white/[0.10]",
            "!backdrop-blur-xl !backdrop-saturate-[2.2]",
            "!border !border-black/[0.06] dark:!border-white/[0.08]",
            "!shadow-[var(--shadow-e4),var(--shadow-lit)]",
          ].join(""),
          // Per-state tints. The glass `!bg-white/75` on `toast` above used to
          // override sonner's richColors entirely, leaving success and error
          // toasts visually identical apart from their icon.
          success:
            "!bg-success-soft/90 !text-success-strong !border-success/20",
          error: "!bg-danger-soft/90 !text-danger-strong !border-danger/20",
          warning:
            "!bg-warning-soft/90 !text-warning-strong !border-warning/25",
          info: "!bg-info-soft/90 !text-info-strong !border-info/20",
          actionButton:
            "!bg-primary !text-primary-foreground !text-xs !font-semibold",
          cancelButton:
            "!bg-muted !text-muted-foreground !text-xs !font-semibold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
