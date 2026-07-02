"use client"

import { motion } from "motion/react"
import { useMemo } from "react"
import { useMounted } from "@/hooks/use-mounted"

/**
 * A resting, slowly rotating abstract particle mesh cluster floating
 * above a glowing pedestal base, radiating alternating pink/green aura.
 */
export function ParticleMesh() {
  const points = useMemo(() => {
    // Fibonacci sphere distribution projected to 2D.
    const n = 46
    const pts: { x: number; y: number; z: number }[] = []
    const phi = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = phi * i
      pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r })
    }
    return pts
  }, [])

  const mounted = useMounted()

  return (
    <div className="relative flex h-full flex-col items-center justify-center">
      {/* Alternating aura */}
      <motion.div
        className="pointer-events-none absolute top-1/3 h-48 w-48 rounded-full blur-[60px]"
        animate={{
          background: [
            "oklch(0.82 0.11 165 / 0.28)",
            "oklch(0.82 0.09 350 / 0.28)",
            "oklch(0.82 0.11 165 / 0.28)",
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rotating mesh */}
      <motion.div
        className="relative h-40 w-40"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="-1.3 -1.3 2.6 2.6" className="h-full w-full">
          {mounted && points.map((p, i) => {
            const scale = (p.z + 1.4) / 2.4
            const emerald = i % 2 === 0
            return (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={0.02 + scale * 0.03}
                fill={
                  emerald ? "oklch(0.82 0.11 165)" : "oklch(0.82 0.09 350)"
                }
                opacity={0.35 + scale * 0.55}
                animate={{ opacity: [0.3, 0.85, 0.3] }}
                transition={{
                  duration: 3 + (i % 4),
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )
          })}
        </svg>
      </motion.div>

      {/* Pedestal base */}
      <div className="relative mt-2 flex flex-col items-center">
        <div className="h-2 w-32 rounded-[50%] bg-primary/20 blur-md" />
        <div className="mt-1 h-1 w-40 rounded-[50%] border-t border-primary/30" />
        <div className="mt-3 h-16 w-16 rounded-full border border-primary/25 bg-primary/5 shadow-[0_-8px_30px_var(--emerald-glow)]" />
      </div>
    </div>
  )
}
