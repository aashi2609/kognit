"use client"

import { motion } from "motion/react"

/**
 * A stylized coding-arena backdrop: architectural pillars, soft ambient
 * backlighting and a tactical floor grid. Purely decorative.
 */
export function ArenaBackdrop({ lit = true }: { lit?: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      initial={false}
      animate={{ opacity: lit ? 1 : 0 }}
      transition={{ duration: 1 }}
      aria-hidden="true"
    >
      {/* deep ambient wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 8%, oklch(0.14 0.02 165 / 55%), transparent 60%), radial-gradient(70% 50% at 50% 100%, oklch(0.12 0.02 350 / 45%), transparent 65%)",
        }}
      />

      {/* structural pillars */}
      <div className="absolute inset-0 flex items-stretch justify-between px-[4%]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="relative w-[6%]">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
            <div
              className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(to right, transparent, oklch(1 0 0 / 3%), transparent)",
              }}
            />
            {/* backlight strip */}
            <div
              className={
                i % 2 === 0
                  ? "absolute left-1/2 top-1/4 h-40 w-[3px] -translate-x-1/2 rounded-full"
                  : "absolute left-1/2 bottom-1/4 h-40 w-[3px] -translate-x-1/2 rounded-full"
              }
              style={{
                background:
                  i % 2 === 0
                    ? "linear-gradient(to bottom, transparent, oklch(0.8 0.09 165 / 45%), transparent)"
                    : "linear-gradient(to bottom, transparent, oklch(0.8 0.07 350 / 40%), transparent)",
              }}
            />
          </div>
        ))}
      </div>

      {/* ceiling beam */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.06] to-transparent" />

      {/* perspective floor grid */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] overflow-hidden">
        <div
          className="absolute inset-0 fractured-grid opacity-40"
          style={{
            transform: "perspective(500px) rotateX(62deg)",
            transformOrigin: "bottom center",
            maskImage: "linear-gradient(to top, black, transparent)",
            WebkitMaskImage: "linear-gradient(to top, black, transparent)",
          }}
        />
      </div>

      {/* subtle floating motes */}
      {Array.from({ length: 14 }).map((_, i) => {
        const left = (i * 67) % 100
        const dur = 6 + (i % 5)
        return (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-primary/40"
            style={{ left: `${left}%`, bottom: "10%" }}
            animate={{ y: [-10, -160], opacity: [0, 0.6, 0] }}
            transition={{ duration: dur, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
          />
        )
      })}
    </motion.div>
  )
}
