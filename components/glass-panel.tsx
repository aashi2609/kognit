"use client"

import { type ReactNode } from "react"

/**
 * Reusable glassmorphic panel wrapper used across all post-login pages.
 * Transparent blurred layers let the persistent cyber-classroom bleed through.
 */
export function GlassPanel({
  children,
  className = "",
  label,
  accent = "emerald",
}: {
  children: ReactNode
  className?: string
  label?: string
  accent?: "emerald" | "pink"
}) {
  const accentBorder =
    accent === "emerald"
      ? "border-emerald-400/10 hover:border-emerald-400/20"
      : "border-pink-400/10 hover:border-pink-400/20"

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-neutral-950/40 backdrop-blur-3xl transition-colors duration-300 ${accentBorder} ${className}`}
    >
      {/* Inner glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            accent === "emerald"
              ? "radial-gradient(60% 40% at 20% 30%, oklch(0.78 0.09 165 / 4%), transparent 70%)"
              : "radial-gradient(60% 40% at 80% 30%, oklch(0.78 0.07 350 / 4%), transparent 70%)",
        }}
        aria-hidden="true"
      />
      {label && (
        <div className="absolute left-4 top-3 z-10 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/50">
            {label}
          </span>
        </div>
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
