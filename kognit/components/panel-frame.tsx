"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

/**
 * A sharp glassmorphic editor pane frame with a tactical title bar.
 */
export function PanelFrame({
  label,
  accent = "emerald",
  children,
  className,
}: {
  label?: string
  accent?: "emerald" | "pink" | "neutral"
  children: ReactNode
  className?: string
}) {
  const dot =
    accent === "pink"
      ? "bg-accent shadow-[0_0_8px_var(--pink-glow)]"
      : accent === "neutral"
        ? "bg-muted-foreground"
        : "bg-primary shadow-[0_0_8px_var(--emerald-glow)]"

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/5 bg-neutral-950/40 backdrop-blur-md",
        className,
      )}
    >
      {label ? (
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <span className={cn("h-2 w-2 rounded-full", dot)} />
          <span className="h-2 w-2 rounded-full bg-white/10" />
          <span className="h-2 w-2 rounded-full bg-white/10" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {label}
          </span>
        </div>
      ) : null}
      {children}
    </div>
  )
}
