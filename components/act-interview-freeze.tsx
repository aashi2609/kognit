"use client"

import { motion } from "motion/react"
import { useEffect } from "react"
import { PanelFrame } from "@/components/panel-frame"
import { SectionTag } from "@/components/act-clone-console"
import { StudentCharacter } from "@/components/student-character"
import { BrainTicker } from "@/components/brain-ticker"

/**
 * ACT 4 — dual-pane interview simulator. Left: mechanical corporate probe.
 * Right: the student's real-time panic freeze + a "mental workspace" brain
 * bubble streaming frantic thoughts. Auto-advances after one loop cycle.
 */
export function ActInterviewFreeze({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onComplete, 6500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div className="w-full max-w-5xl">
      <SectionTag index="02" title="The Interview Freeze" accent="pink" />

      <div className="grid gap-5 md:grid-cols-2">
        {/* Left: mechanical corporate probe */}
        <PanelFrame label="corporate.panel" accent="pink">
          <div className="flex min-h-[300px] flex-col justify-between px-6 py-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              interviewer
            </div>
            <div className="my-6">
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0px var(--pink-glow)",
                    "0 0 22px var(--pink-glow)",
                    "0 0 0px var(--pink-glow)",
                  ],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-4"
              >
                <p className="font-mono text-sm leading-relaxed text-foreground">
                  <span className="text-accent">[ critical probe ]</span>
                  <br />
                  Explain the time complexity on line 24.
                </p>
              </motion.div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="inline-block h-3 w-1.5 animate-pulse bg-accent/70" />
              awaiting response
              <span className="ml-auto tabular-nums text-muted-foreground/50">00:07</span>
            </div>
          </div>
        </PanelFrame>

        {/* Right: real-time panic freeze + brain workspace */}
        <PanelFrame label="candidate.state" accent="pink">
          <div className="relative flex min-h-[300px] items-stretch">
            {/* character close-up */}
            <div className="relative flex w-1/2 items-end justify-center overflow-hidden">
              <div className="pointer-events-none absolute inset-0 fractured-grid opacity-15" />
              <motion.div
                animate={{ x: [-1.5, 1.5, -1, 1, 0], y: [1, -1, 1.5, -0.5, 0] }}
                transition={{ duration: 0.25, repeat: Infinity, ease: "linear" }}
                className="h-[240px] w-[190px]"
              >
                <StudentCharacter expression="panic" className="h-full w-full" />
              </motion.div>

              {/* glowing arrow from head to brain */}
              <motion.div
                className="absolute right-0 top-8 z-10 text-accent"
                animate={{ opacity: [0.4, 1, 0.4], x: [0, 4, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                aria-hidden="true"
              >
                <svg width="46" height="24" viewBox="0 0 46 24" fill="none">
                  <path
                    d="M2 12 H36 M30 5 L38 12 L30 19"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </div>

            {/* mental workspace brain bubble */}
            <div className="relative w-1/2 border-l border-white/5">
              <div className="absolute left-3 top-3 z-10 font-mono text-[10px] uppercase tracking-[0.2em] text-accent/70">
                mental workspace
              </div>
              {/* brain outline */}
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 h-full w-full opacity-20"
                aria-hidden="true"
              >
                <path
                  d="M60 70 Q40 55 55 40 Q65 25 85 32 Q100 18 120 30 Q145 22 150 45 Q170 55 158 75 Q170 95 150 110 Q152 135 125 135 Q110 150 88 138 Q62 145 58 118 Q40 105 52 88 Q45 78 60 70 Z"
                  fill="none"
                  stroke="oklch(0.78 0.07 350)"
                  strokeWidth="1.5"
                />
              </svg>
              <BrainTicker />
            </div>
          </div>
          <div className="border-t border-white/5 px-4 py-2.5">
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className="text-center font-mono text-[11px] uppercase tracking-[0.24em] text-accent/80"
            >
              cognition destabilized — logic never internalized
            </motion.p>
          </div>
        </PanelFrame>
      </div>
    </div>
  )
}
