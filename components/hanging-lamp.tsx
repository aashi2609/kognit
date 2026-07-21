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

      {/* lamp shade (inspired by nordic industrial pendant with collar & protruding bulb) */}
      <div className="relative mx-auto flex flex-col items-center">
        <svg
          width="140"
          height="106"
          viewBox="0 0 140 106"
          className="overflow-visible pointer-events-none"
        >
          <defs>
            {/* Matte sage/slate shade gradient matching inspiration */}
            <linearGradient id="shade-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#28342f" />
              <stop offset="25%" stopColor="#43554d" />
              <stop offset="70%" stopColor="#32413b" />
              <stop offset="100%" stopColor="#1e2723" />
            </linearGradient>

            {/* Natural top-down light highlight */}
            <linearGradient id="shade-highlight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
            </linearGradient>

            {/* Glowing bulb gradient */}
            <radialGradient id="bulb-glow" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fffae0" />
              <stop offset="85%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#eab308" />
            </radialGradient>
          </defs>

          {/* Top Collar / Neck */}
          <ellipse cx="70" cy="8" rx="15" ry="3" fill="#4a5c54" stroke="#1e2723" strokeWidth="0.8" />
          <rect x="55" y="8" width="30" height="20" fill="url(#shade-body)" />
          <rect x="55" y="8" width="30" height="20" fill="url(#shade-highlight)" />
          <path d="M 53 28 Q 70 31 87 28" fill="none" stroke="#1a231f" strokeWidth="1.5" />

          {/* Main Bell / Dome Shade Body */}
          <path
            d="M 53 28
               C 35 34, 15 50, 12 76
               L 12 84
               Q 70 90, 128 84
               L 128 76
               C 125 50, 105 34, 87 28
               Z"
            fill="url(#shade-body)"
            stroke="#17201c"
            strokeWidth="1"
          />
          <path
            d="M 53 28
               C 35 34, 15 50, 12 76
               L 12 84
               Q 70 90, 128 84
               L 128 76
               C 125 50, 105 34, 87 28
               Z"
            fill="url(#shade-highlight)"
          />

          {/* Mid Horizontal Ridge Lip Line */}
          <path
            d="M 17 62 Q 70 67 123 62"
            fill="none"
            stroke="#17201c"
            strokeWidth="1.8"
            opacity="0.8"
          />
          <path
            d="M 17 63 Q 70 68 123 63"
            fill="none"
            stroke="#5c7066"
            strokeWidth="0.8"
            opacity="0.5"
          />

          {/* Bottom Flanged Lip Rim */}
          <path
            d="M 10 83 C 10 82, 130 82, 130 83 C 130 87, 10 87, 10 83 Z"
            fill="#374740"
            stroke="#151e1a"
            strokeWidth="0.8"
          />

          {/* Inner Shade Underside (dark interior cavity) */}
          <ellipse cx="70" cy="84" rx="57" ry="4" fill="#121a16" stroke="#25332c" strokeWidth="0.8" />

          {/* Socket & Protruding Glass Bulb */}
          <g>
            <rect x="64" y="80" width="12" height="5" fill="#1c1c1c" rx="1" />
            <circle
              cx="70"
              cy="91"
              r="10"
              fill={on ? "url(#bulb-glow)" : "#3a3d3c"}
              stroke={on ? "#fffbeb" : "#242625"}
              strokeWidth="0.8"
            />
          </g>
        </svg>

        {/* Focused ambient halo glow when ON */}
        <motion.div
          className="absolute top-[84px] left-1/2 h-6 w-14 -translate-x-1/2 rounded-[50%] pointer-events-none"
          animate={{
            backgroundColor: on ? "oklch(0.95 0.12 90)" : "transparent",
            boxShadow: on
              ? "0 4px 45px 16px oklch(0.92 0.13 90 / 80%)"
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
            className="mt-[1px] h-5 w-5 rounded-full transition-shadow duration-500"
            style={{
              background:
                "radial-gradient(circle at 32% 28%, oklch(0.95 0.02 265), oklch(0.6 0.02 265) 55%, oklch(0.35 0.02 265) 100%)",
              boxShadow: !on
                ? "0 0 12px oklch(0.9 0.1 90 / 60%), 0 3px 8px oklch(0 0 0 / 55%), inset 0 -2px 3px oklch(0 0 0 / 40%)"
                : "0 3px 8px oklch(0 0 0 / 55%), inset 0 -2px 3px oklch(0 0 0 / 40%)",
            }}
          />
        </motion.button>

        {/* prompt */}
        <motion.p
          className="pointer-events-none mt-4 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.42em] text-amber-200/90"
          style={{ textShadow: "0 0 8px rgba(251, 191, 36, 0.4)" }}
          animate={{ opacity: on ? 0 : [0.5, 1, 0.5], y: on ? -4 : 0 }}
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
