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
    const n = 52
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
    <div className="relative flex h-full flex-col items-center justify-center py-4">
      {/* Ambient background aura glow */}
      <motion.div
        className="pointer-events-none absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[50px]"
        animate={{
          background: [
            "radial-gradient(circle, oklch(0.82 0.11 165 / 0.25) 0%, transparent 70%)",
            "radial-gradient(circle, oklch(0.82 0.09 350 / 0.25) 0%, transparent 70%)",
            "radial-gradient(circle, oklch(0.82 0.11 165 / 0.25) 0%, transparent 70%)",
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rotating 3D Fibonacci Particle Sphere */}
      <div className="relative flex items-center justify-center h-44 w-44">
        {/* Soft center core glow */}
        <motion.div
          className="absolute h-14 w-14 rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.82 0.11 165 / 0.35) 0%, transparent 75%)",
          }}
          animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Rotating 3D Particle Swarm */}
        <motion.div
          className="relative h-44 w-44"
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="-1.3 -1.3 2.6 2.6" className="h-full w-full">
            {mounted &&
              points.map((p, i) => {
                const scale = (p.z + 1.4) / 2.4
                const emerald = i % 2 === 0
                return (
                  <motion.circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={0.022 + scale * 0.028}
                    fill={
                      emerald ? "oklch(0.82 0.11 165)" : "oklch(0.82 0.09 350)"
                    }
                    opacity={0.35 + scale * 0.55}
                    animate={{ opacity: [0.3, 0.85, 0.3] }}
                    transition={{
                      duration: 2.5 + (i % 4) * 0.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )
              })}
          </svg>
        </motion.div>
      </div>

      {/* Sleek Pedestal Base */}
      <div className="relative mt-2 flex flex-col items-center">
        <div className="h-1.5 w-32 rounded-[50%] bg-primary/20 blur-md" />
        <div className="mt-1 h-0.5 w-40 rounded-[50%] border-t border-primary/30" />
      </div>
    </div>
  )
}
