"use client"

import { motion } from "motion/react"
import { useMounted } from "@/hooks/use-mounted"

/**
 * A continuous horizontal audio visualizer ribbon of animated bars.
 */
export function SoundRibbon({ bars = 64 }: { bars?: number }) {
  const mounted = useMounted()
  if (!mounted) return <div className="h-14 w-full" aria-hidden="true" />
  return (
    <div
      className="flex h-14 w-full items-center justify-between gap-[3px] overflow-hidden px-1"
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => {
        const base = 0.2 + Math.abs(Math.sin(i * 0.6)) * 0.5
        const useEmerald = i % 2 === 0
        return (
          <motion.span
            key={i}
            className="h-9 w-full flex-1 rounded-full"
            style={{
              background: useEmerald
                ? "oklch(0.78 0.09 165)"
                : "oklch(0.78 0.07 350)",
              opacity: 0.7,
            }}
            initial={{ scaleY: base }}
            animate={{ scaleY: [base, base + 0.5, base * 0.6, base] }}
            transition={{
              duration: 1.1 + (i % 5) * 0.14,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 7) * 0.08,
            }}
          />
        )
      })}
    </div>
  )
}
