"use client"

import { animate, motion, useMotionValue, useTransform } from "motion/react"
import { useCallback, useRef, useState } from "react"

/**
 * A detailed industrial hanging desk lamp with an interactive, draggable
 * pull-cord (metallic bead handle). Pulling the cord past a threshold — or
 * clicking it — triggers `onPull` once, snaps the cord, and lets the parent
 * cast the cone of light.
 */
export function HangingLamp({
  on,
  onPull,
}: {
  on: boolean
  onPull: () => void
}) {
  const y = useMotionValue(0)
  const cordHeight = useTransform(y, (v) => 92 + v)
  const [snapped, setSnapped] = useState(false)
  const firedRef = useRef(false)

  const fire = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    setSnapped(true)
    onPull()
    // relax the cord back with a springy settle
    window.setTimeout(() => setSnapped(false), 260)
  }, [onPull])

  const handleDrag = useCallback(() => {
    if (y.get() > 46) fire()
  }, [fire, y])

  const settle = useCallback(() => {
    animate(y, 0, { type: "spring", stiffness: 300, damping: 14 })
  }, [y])

  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2">
      {/* ceiling mount plate */}
      <div className="mx-auto h-2 w-24 rounded-b-md bg-[oklch(0.22_0.01_265)] shadow-[0_2px_6px_oklch(0_0_0/50%)]" />
      {/* power rod */}
      <div className="mx-auto h-10 w-[3px] bg-gradient-to-b from-[oklch(0.3_0.01_265)] to-[oklch(0.2_0.01_265)]" />

      {/* lamp shade (industrial dome) */}
      <div className="relative mx-auto">
        <motion.div
          className="relative mx-auto h-16 w-40"
          style={{
            clipPath: "polygon(24% 0, 76% 0, 100% 100%, 0 100%)",
            background:
              "linear-gradient(180deg, oklch(0.4 0.02 265) 0%, oklch(0.26 0.015 265) 60%, oklch(0.18 0.01 265) 100%)",
            boxShadow: "inset 0 3px 8px oklch(1 0 0 / 12%)",
          }}
        >
          {/* rim highlight */}
          <div className="absolute inset-x-0 top-0 h-1 bg-white/15" />
        </motion.div>
        {/* inner bulb */}
        <motion.div
          className="absolute bottom-1 left-1/2 h-6 w-16 -translate-x-1/2 rounded-[50%]"
          animate={{
            backgroundColor: on ? "oklch(0.95 0.12 90)" : "oklch(0.3 0.01 90)",
            boxShadow: on
              ? "0 0 60px 24px oklch(0.92 0.13 90 / 75%)"
              : "0 0 0 0 transparent",
          }}
          transition={{ duration: 0.25 }}
        />
      </div>

      {/* ================= PULL CORD ================= */}
      <div className="pointer-events-none relative mx-auto flex flex-col items-center">
        {/* cord line, stretches while dragging */}
        <motion.div
          className="w-[2px] origin-top rounded-full bg-gradient-to-b from-white/40 via-white/20 to-white/10"
          style={{ height: cordHeight }}
        />
        {/* draggable bead handle */}
        <motion.button
          type="button"
          aria-label="Pull the cord to turn on the lights"
          onClick={() => {
            fire()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              fire()
            }
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 96 }}
          dragElastic={0.25}
          style={{ y }}
          onDrag={handleDrag}
          onDragEnd={settle}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.92 }}
          className="pointer-events-auto -mt-[2px] flex cursor-grab flex-col items-center outline-none active:cursor-grabbing"
        >
          {/* small beads */}
          <span className="h-2 w-2 rounded-full bg-[oklch(0.7_0.02_265)] shadow-[0_0_4px_oklch(0_0_0/40%)]" />
          <span className="-mt-[1px] h-2 w-2 rounded-full bg-[oklch(0.62_0.02_265)]" />
          {/* metallic bead handle */}
          <span
            className="mt-[1px] h-5 w-5 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 32% 28%, oklch(0.95 0.02 265), oklch(0.6 0.02 265) 55%, oklch(0.35 0.02 265) 100%)",
              boxShadow:
                "0 3px 8px oklch(0 0 0 / 55%), inset 0 -2px 3px oklch(0 0 0 / 40%)",
            }}
          />
        </motion.button>

        {/* prompt */}
        <motion.p
          className="pointer-events-none mt-4 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.42em] text-foreground/80"
          animate={{ opacity: on ? 0 : [0.4, 1, 0.4], y: on ? -4 : 0 }}
          transition={on ? { duration: 0.3 } : { duration: 2, repeat: Infinity }}
        >
          pull to enlighten
        </motion.p>
      </div>

      {/* mechanical click flash */}
      {snapped && (
        <motion.span
          className="absolute left-1/2 top-[92px] h-10 w-10 -translate-x-1/2 rounded-full"
          initial={{ opacity: 0.9, scale: 0.4 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 0.3 }}
          style={{ background: "radial-gradient(circle, oklch(1 0.1 95 / 80%), transparent 70%)" }}
        />
      )}
    </div>
  )
}
