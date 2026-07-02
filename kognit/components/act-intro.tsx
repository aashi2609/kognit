"use client"

import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { OfficeScene } from "@/components/office-scene"
import { HangingLamp } from "@/components/hanging-lamp"
import { StudentCharacter } from "@/components/student-character"

const LETTERS = ["K", "O", "G", "N", "I", "T"]

type Phase = "dark" | "reveal" | "walk" | "juggle" | "lock" | "confirm"

/**
 * ACT 1 — the cinematic hero. A colorful but dim classroom is lit by pulling
 * the hanging lamp cord, casting a warm cone of light that reveals the student
 * juggling glowing letters into the title "KOGNIT". After the final green
 * pulse it waits 600ms and calls `onComplete` to advance into the arena.
 */
export function ActIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("dark")
  const on = phase !== "dark"
  const timers = useRef<number[]>([])
  const startedRef = useRef(false)

  // schedule the full reveal timeline exactly once when the cord is pulled
  const handlePull = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    setPhase("reveal")
    timers.current = [
      // 200ms after the cone activates the student walks out of the shadows
      window.setTimeout(() => setPhase("walk"), 200),
      // once centered, begin the hand-juggling of the letters
      window.setTimeout(() => setPhase("juggle"), 1500),
      window.setTimeout(() => setPhase("lock"), 3800),
      window.setTimeout(() => setPhase("confirm"), 5600),
      // final letters lock with a green pulse -> hold -> advance
      window.setTimeout(onComplete, 6800),
    ]
  }, [onComplete])

  // clean up any pending timers on unmount
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const chaos = useMemo(
    () =>
      LETTERS.map((_, i) => ({
        x: [-120, 96, -54, 78, -96, 54][i],
        y: [-30, -70, 10, -84, -16, -54][i],
        r: [-24, 28, -14, 22, -28, 16][i],
      })),
    [],
  )

  const juggling = phase === "juggle"
  const locked = phase === "lock" || phase === "confirm"

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* room */}
      <OfficeScene lit={on} />

      {/* volumetric cone of warm light from the lamp */}
      <AnimatePresence>
        {on && (
          <motion.div
            key="cone"
            className="pointer-events-none absolute left-1/2 top-[76px] z-10 -translate-x-1/2"
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
            {/* letters */}
            <div className="relative mb-2 flex h-40 items-end justify-center gap-1 sm:gap-2">
              {LETTERS.map((letter, i) => (
                <motion.span
                  key={letter + i}
                  className="relative font-mono text-6xl font-bold sm:text-7xl md:text-8xl"
                  initial={{ opacity: 0, x: chaos[i].x, y: chaos[i].y, rotate: chaos[i].r }}
                  animate={
                    juggling
                      ? {
                        opacity: 1,
                        x: [chaos[i].x, chaos[i].x * -0.4, chaos[i].x * 0.3],
                        y: [chaos[i].y, chaos[i].y - 26, chaos[i].y + 10],
                        rotate: [chaos[i].r, -chaos[i].r, chaos[i].r * 0.5],
                      }
                      : locked
                        ? { opacity: 1, x: 0, y: 0, rotate: 0 }
                        : { opacity: 0 }
                  }
                  transition={
                    juggling
                      ? {
                        duration: 1.1,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: i * 0.08,
                      }
                      : { type: "spring", stiffness: 220, damping: 16, delay: i * 0.07 }
                  }
                  style={{
                    color: locked ? "oklch(0.92 0.14 165)" : "oklch(0.85 0.09 350)",
                    textShadow: locked
                      ? "0 0 10px oklch(0.95 0.15 165 / 90%), 0 0 34px oklch(0.86 0.14 165 / 70%)"
                      : "0 0 18px oklch(0.82 0.08 350 / 55%)",
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
                        color: "oklch(0.96 0.14 165)",
                        textShadow: "0 0 34px oklch(0.92 0.15 165)",
                      }}
                      aria-hidden="true"
                    >
                      {letter}
                    </motion.span>
                  )}
                </motion.span>
              ))}
            </div>

            {/* character walks out of the left shadows into the cone */}
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
