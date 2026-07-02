"use client"

import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { useMounted } from "@/hooks/use-mounted"

/**
 * Card 1 visual — scattered, floating syntax brackets that magnetically snap
 * into a clean, structured block while the card is hovered.
 */
export function BracketReassemble({ hovered }: { hovered: boolean }) {
  const mounted = useMounted()
  const glyphs = ["{", "[", "(", ")", "]", "}"]
  // resting chaos offsets when idle
  const chaos = [
    { x: -22, y: -12, r: -40 },
    { x: 18, y: 14, r: 34 },
    { x: -10, y: 18, r: -24 },
    { x: 12, y: -16, r: 30 },
    { x: 24, y: 10, r: -36 },
    { x: -20, y: -8, r: 46 },
  ]
  return (
    <div className="flex h-16 items-center justify-center gap-1" aria-hidden="true">
      {glyphs.map((g, i) => (
        <motion.span
          key={i}
          className="font-mono text-2xl"
          initial={false}
          animate={
            hovered
              ? { x: 0, y: 0, rotate: 0, opacity: 1, color: "oklch(0.85 0.11 165)" }
              : mounted
                ? {
                  x: [chaos[i].x, chaos[i].x * 0.6, chaos[i].x],
                  y: [chaos[i].y, chaos[i].y * 0.5, chaos[i].y],
                  rotate: [chaos[i].r, chaos[i].r * 0.7, chaos[i].r],
                  opacity: 0.45,
                  color: "oklch(0.78 0.09 165 / 70%)",
                }
                : { opacity: 0.45 }
          }
          transition={
            hovered
              ? { type: "spring", stiffness: 220, damping: 16, delay: i * 0.04 }
              : { duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }
          }
        >
          {g}
        </motion.span>
      ))}
    </div>
  )
}

/**
 * Card 2 visual — a circular countdown ring under interview pressure. The
 * stroke lerps from calm emerald toward deep pink as the clock depletes.
 */
export function CountdownRing({ hovered }: { hovered: boolean }) {
  const mounted = useMounted()
  const [n, setN] = useState(30)
  const R = 26
  const C = 2 * Math.PI * R

  useEffect(() => {
    if (!mounted) return
    // ticks faster while hovered to sell the "pressure" theme
    const step = hovered ? 90 : 200
    const id = setInterval(() => setN((v) => (v <= 0 ? 30 : v - 1)), step)
    return () => clearInterval(id)
  }, [mounted, hovered])

  // 30 -> emerald, 0 -> pink
  const t = 1 - n / 30
  const stroke = mixEmeraldPink(t)
  const offset = C * (1 - n / 30)

  return (
    <div className="flex h-16 items-center gap-3" aria-hidden="true">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth="4" />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            stroke={stroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 6px ${stroke})`, transition: "stroke 0.3s, stroke-dashoffset 0.2s linear" }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-mono text-xs tabular-nums"
          style={{ color: stroke }}
        >
          {String(n).padStart(2, "0")}
        </span>
      </div>
      <div className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-muted-foreground/70">
        live drill
        <br />
        recall window
      </div>
    </div>
  )
}

/** emerald (165) -> pink (350) blend via oklch */
function mixEmeraldPink(t: number) {
  const clamp = Math.max(0, Math.min(1, t))
  const hue = 165 + (350 - 165) * clamp
  const chroma = 0.09 + 0.02 * clamp
  return `oklch(0.78 ${chroma.toFixed(3)} ${hue.toFixed(1)})`
}

/**
 * Card 3 visual — a living voice-mentor waveform. Frequency nodes scale with
 * horizontal mouse position over the card; idles with a gentle breathing wave.
 */
export function AudioWave({ pointerX }: { pointerX: number }) {
  const mounted = useMounted()
  const bars = 40
  // pointerX is 0..1 across the card; nearest bars react strongest
  return (
    <div className="flex h-16 items-center justify-between gap-[3px]" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const pos = i / (bars - 1)
        const dist = Math.abs(pos - pointerX)
        const boost = pointerX >= 0 ? Math.max(0, 1 - dist * 4) : 0
        const base = 0.2 + ((i % 5) * 0.06)
        return (
          <motion.span
            key={i}
            className="h-10 w-full flex-1 rounded-full"
            style={{
              transformOrigin: "center",
              backgroundColor: boost > 0.4 ? "oklch(0.82 0.09 350)" : "oklch(0.78 0.09 165 / 70%)",
            }}
            initial={false}
            animate={
              mounted
                ? { scaleY: base + boost * (1 - base) + (pointerX < 0 ? [0, 0.25, 0][i % 3] : 0) }
                : { scaleY: base }
            }
            transition={
              pointerX >= 0
                ? { type: "spring", stiffness: 300, damping: 18 }
                : { duration: 1.4 + (i % 5) * 0.18, repeat: Infinity, ease: "easeInOut", delay: (i % 8) * 0.08 }
            }
          />
        )
      })}
    </div>
  )
}

/**
 * Dim scrolling binary matrix used as a background layer behind the headline.
 */
export function BinaryMatrix() {
  const mounted = useMounted()
  const rows = 14
  const cols = 60
  const [grid] = useState(() =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() > 0.5 ? "1" : "0")).join(""),
    ),
  )
  if (!mounted) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]" aria-hidden="true">
      <motion.div
        className="flex flex-col gap-1 font-mono text-[10px] leading-none tracking-[0.35em] text-primary whitespace-nowrap"
        animate={{ y: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {[...grid, ...grid].map((row, i) => (
          <span key={i}>{row}</span>
        ))}
      </motion.div>
    </div>
  )
}


