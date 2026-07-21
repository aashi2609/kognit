"use client"

import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { OfficeScene } from "@/components/office-scene"
import { HangingLamp } from "@/components/hanging-lamp"
import { StudentCharacter } from "@/components/student-character"

const LETTERS = ["K", "O", "G", "N", "I", "T"]

type Phase = "dark" | "reveal" | "walk" | "juggle" | "lock" | "confirm"

/**
 * ACT 1 — the cinematic hero. A colorful but dim classroom is lit by pulling
 * the hanging lamp cord, casting a warm cone of light that reveals the student
 * juggling glowing letters into the title "KOGNIT".
 *
 * UPGRADED: Letters now launch from hand coordinates on parabolic arcs.
 * Arms follow independent overlapping elliptical cascade paths.
 */
export function ActIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("dark")
  const on = phase !== "dark"
  const timers = useRef<number[]>([])
  const startedRef = useRef(false)

  const handlePull = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    setPhase("reveal")
    timers.current = [
      window.setTimeout(() => setPhase("walk"), 200),
      window.setTimeout(() => setPhase("juggle"), 1500),
      window.setTimeout(() => setPhase("lock"), 3800),
      window.setTimeout(() => setPhase("confirm"), 5600),
      window.setTimeout(onComplete, 6800),
    ]
  }, [onComplete])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const juggling = phase === "juggle"
  const locked = phase === "lock" || phase === "confirm"

  // Parabolic arc parameters for each letter
  // Each letter launches from a hand position and arcs to its final grid slot
  const letterArcs = useMemo(
    () =>
      LETTERS.map((_, i) => {
        // Alternate launch from left hand (even) and right hand (odd)
        const fromLeft = i % 2 === 0
        const startX = fromLeft ? -60 : 60
        const startY = 50 // hand height relative to title
        // Final position: evenly spaced in the title bar
        const finalX = (i - 2.5) * 38
        const finalY = 0
        // Parabolic peak height (higher arc for letters launched from farther)
        const peakY = -80 - Math.abs(startX - finalX) * 0.3

        return { startX, startY, finalX, finalY, peakY, fromLeft }
      }),
    [],
  )

  /**
   * Compute parabolic keyframes for a letter arc.
   * Uses parametric quadratic: y(t) = startY + (peakY - startY)*4t(1-t) mapped to keyframes
   */
  function getArcKeyframes(arc: (typeof letterArcs)[number]) {
    const steps = 8
    const xs: number[] = []
    const ys: number[] = []
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      xs.push(arc.startX + (arc.finalX - arc.startX) * t)
      // Quadratic arc: peaks at t=0.5
      const linearY = arc.startY + (arc.finalY - arc.startY) * t
      const arcOffset = (arc.peakY - Math.max(arc.startY, arc.finalY)) * 4 * t * (1 - t)
      ys.push(linearY + arcOffset)
    }
    return { xs, ys }
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* room */}
      <OfficeScene lit={on} />

      {/* volumetric cone of warm light from the lamp */}
      <AnimatePresence>
        {on && (
          <motion.div
            key="cone"
            className="pointer-events-none absolute left-1/2 top-[124px] z-10 -translate-x-1/2"
            initial={{ opacity: 0, scaleY: 0.3 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ transformOrigin: "top center" }}
            aria-hidden="true"
          >
            <div
              className="h-[80vh] w-[70vw] max-w-[720px]"
              style={{
                clipPath: "polygon(43% 0, 57% 0, 100% 100%, 0 100%)",
                background:
                  "linear-gradient(180deg, oklch(0.95 0.09 90 / 42%) 0%, oklch(0.9 0.09 90 / 16%) 45%, transparent 92%)",
                filter: "blur(2px)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* floor pool of light */}
      <AnimatePresence>
        {on && (
          <motion.div
            key="pool"
            className="pointer-events-none absolute bottom-[10%] left-1/2 z-10 h-40 w-[52vw] max-w-[560px] -translate-x-1/2 rounded-[50%] blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              background:
                "radial-gradient(circle, oklch(0.9 0.1 90 / 40%), transparent 70%)",
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ===== TITLE + CHARACTER (inside the cone) ===== */}
      <AnimatePresence>
        {on && (
          <motion.div
            key="stage"
            className="relative z-20 flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {/* Letters with parabolic arc animation */}
            <div className="relative mb-2 flex h-40 items-end justify-center gap-1 sm:gap-2">
              {LETTERS.map((letter, i) => {
                const arc = letterArcs[i]
                const kf = getArcKeyframes(arc)

                return (
                  <motion.span
                    key={letter + i}
                    className="relative font-mono text-6xl font-bold sm:text-7xl md:text-8xl"
                    initial={{
                      opacity: 0,
                      x: arc.startX,
                      y: arc.startY,
                    }}
                    animate={
                      juggling
                        ? {
                            opacity: 1,
                            x: kf.xs,
                            y: kf.ys,
                          }
                        : locked
                          ? { opacity: 1, x: 0, y: 0 }
                          : { opacity: 0, x: arc.startX, y: arc.startY }
                    }
                    transition={
                      juggling
                        ? {
                            duration: 1.4,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut",
                            delay: i * 0.12,
                          }
                        : {
                            type: "spring",
                            stiffness: 220,
                            damping: 16,
                            delay: i * 0.07,
                          }
                    }
                    style={{
                      color: locked
                        ? "oklch(0.8 0.24 345)"
                        : "oklch(0.86 0.2 165)",
                      textShadow: locked
                        ? "-0.7px -0.7px 0 rgba(0,0,0,0.85), 0.7px -0.7px 0 rgba(0,0,0,0.85), -0.7px 0.7px 0 rgba(0,0,0,0.85), 0.7px 0.7px 0 rgba(0,0,0,0.85), 0 0 12px oklch(0.85 0.24 345 / 95%), 0 0 34px oklch(0.8 0.24 345 / 75%)"
                        : "-0.7px -0.7px 0 rgba(0,0,0,0.85), 0.7px -0.7px 0 rgba(0,0,0,0.85), -0.7px 0.7px 0 rgba(0,0,0,0.85), 0.7px 0.7px 0 rgba(0,0,0,0.85), 0 0 12px oklch(0.9 0.2 165 / 95%), 0 0 30px oklch(0.86 0.2 165 / 70%)",
                    }}
                  >
                    {letter}
                    {phase === "confirm" && (
                      <motion.span
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.5, delay: i * 0.09 }}
                        style={{
                          color: "oklch(0.9 0.24 345)",
                          textShadow: "-0.7px -0.7px 0 rgba(0,0,0,0.85), 0.7px -0.7px 0 rgba(0,0,0,0.85), -0.7px 0.7px 0 rgba(0,0,0,0.85), 0.7px 0.7px 0 rgba(0,0,0,0.85), 0 0 40px oklch(0.85 0.24 345)",
                        }}
                        aria-hidden="true"
                      >
                        {letter}
                      </motion.span>
                    )}
                  </motion.span>
                )
              })}
            </div>

            {/* Character walks out of the left shadows into the cone */}
            <motion.div
              className="relative h-[280px] w-[230px]"
              initial={{ x: "-62vw", opacity: 0 }}
              animate={
                phase === "reveal"
                  ? { x: "-62vw", opacity: 0 }
                  : { x: 0, opacity: 1 }
              }
              transition={{ duration: 1.25, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <motion.div
                animate={
                  phase === "walk"
                    ? { y: [0, -7, 0, -7, 0] }
                    : phase === "confirm"
                      ? { y: [0, 8, 0] }
                      : {}
                }
                transition={
                  phase === "walk"
                    ? { duration: 1.2, ease: "easeInOut" }
                    : { duration: 0.6, repeat: phase === "confirm" ? 1 : 0 }
                }
                className="h-full w-full"
              >
                <StudentCharacter
                  expression={phase === "confirm" ? "happy" : "focus"}
                  juggle={juggling}
                  className="h-full w-full"
                />
              </motion.div>
            </motion.div>

            {phase === "confirm" && (
              <motion.p
                className="mt-1 font-mono text-xs uppercase tracking-[0.4em] text-primary"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ↓ entering the arena
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* the interactive hanging lamp sits on top of everything */}
      <HangingLamp on={on} onPull={handlePull} />
    </div>
  )
}
