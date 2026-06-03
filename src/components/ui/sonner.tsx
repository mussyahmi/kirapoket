"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
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
            "!backdrop-blur-2xl !backdrop-saturate-200",
            "!border !border-black/[0.08] dark:!border-white/[0.14]",
            "!shadow-[0_16px_40px_-12px_rgba(0,0,0,0.22),0_2px_6px_-2px_rgba(0,0,0,0.08)]",
            "dark:!shadow-[0_24px_50px_-14px_rgba(0,0,0,0.6),0_0_0_0.5px_rgba(255,255,255,0.04)]",
          ].join(" "),
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
