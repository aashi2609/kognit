"use client"

import { motion, AnimatePresence } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { PanelFrame } from "@/components/panel-frame"
import { SectionTag } from "@/components/act-clone-console"
import { SoundRibbon } from "@/components/sound-ribbon"
import { ParticleMesh } from "@/components/particle-mesh"

/* The scripted program. One line carries an intentional off-by-one flaw. */
const CODE = [
  "function sumRange(arr, n) {",
  "  let total = 0",
  "  for (let i = 0; i <= n; i++) {", // BUG line (index 2)
  "    total += arr[i]",
  "  }",
  "  return total",
  "}",
]
const BUG_INDEX = 2
const BUG_LINE = "  for (let i = 0; i <= n; i++) {"
const FIXED_LINE = "  for (let i = 0; i < n; i++) {"

const PROBE =
  "When i reaches n, which slot are you reading? Trace arr[n] on an array of length n — what comes back, and where does that boundary belong?"

type Step = "type" | "probe" | "fix" | "done"
type FixMode = "idle" | "delete" | "type"

/**
 * ACT — the Kognit Resolution Workspace. A live, end-to-end simulation loop:
 *  1. code auto-types with a logical flaw (off-by-one boundary)
 *  2. the AI core glows pink and types a Socratic probe pinpointing the flaw
 *  3. the user cursor deletes the bad line and types the verified fix
 *  4. an emerald checkmark confirms mastery and the core settles to a calm pulse
 * Only then does the "enter the arena" pointer appear.
 */
export function ActSynapse({
  onUnlock,
  onResolved,
}: {
  onUnlock: () => void
  onResolved?: () => void
}) {
  const [step, setStep] = useState<Step>("type")
  const [visLines, setVisLines] = useState(0)
  const [probeText, setProbeText] = useState("")
  const [fixText, setFixText] = useState(BUG_LINE)
  const [fixMode, setFixMode] = useState<FixMode>("idle")
  const [check, setCheck] = useState(false)
  const notified = useRef(false)

  // Step 1 — type the program line by line, revealing the flawed line
  useEffect(() => {
    if (step !== "type") return
    if (visLines >= CODE.length) {
      const t = window.setTimeout(() => setStep("probe"), 800)
      return () => clearTimeout(t)
    }
    const t = window.setTimeout(() => setVisLines((v) => v + 1), 320)
    return () => clearTimeout(t)
  }, [step, visLines])

  // Step 2 — the Socratic probe types out char by char
  useEffect(() => {
    if (step !== "probe") return
    if (probeText.length >= PROBE.length) {
      const t = window.setTimeout(() => {
        setStep("fix")
        setFixMode("delete")
      }, 1400)
      return () => clearTimeout(t)
    }
    const t = window.setTimeout(
      () => setProbeText(PROBE.slice(0, probeText.length + 1)),
      24,
    )
    return () => clearTimeout(t)
  }, [step, probeText])

  // Step 3a — delete the flawed line
  useEffect(() => {
    if (step !== "fix" || fixMode !== "delete") return
    if (fixText.length === 0) {
      const t = window.setTimeout(() => setFixMode("type"), 260)
      return () => clearTimeout(t)
    }
    const t = window.setTimeout(() => setFixText((s) => s.slice(0, -1)), 26)
    return () => clearTimeout(t)
  }, [step, fixMode, fixText])

  // Step 3b — type the verified fix
  useEffect(() => {
    if (step !== "fix" || fixMode !== "type") return
    if (fixText.length >= FIXED_LINE.length) {
      const t = window.setTimeout(() => setStep("done"), 500)
      return () => clearTimeout(t)
    }
    const t = window.setTimeout(
      () => setFixText(FIXED_LINE.slice(0, fixText.length + 1)),
      45,
    )
    return () => clearTimeout(t)
  }, [step, fixMode, fixText])

  // Step 4 — mastery confirmed
  useEffect(() => {
    if (step !== "done") return
    setCheck(true)
    if (!notified.current) {
      notified.current = true
      onResolved?.()
    }
  }, [step, onResolved])

  const coreAccent = step === "done" ? "emerald" : step === "probe" || step === "fix" ? "pink" : "neutral"
  const status =
    step === "type"
      ? { label: "tracking logic", tone: "text-muted-foreground" }
      : step === "probe"
        ? { label: "socratic probe", tone: "text-[oklch(0.8_0.09_350)]" }
        : step === "fix"
          ? { label: "guided fix", tone: "text-[oklch(0.8_0.09_350)]" }
          : { label: "mastery verified", tone: "text-primary" }

  return (
    <div className="w-full max-w-5xl">
      <SectionTag index="03" title="The Kognit Resolution Workspace" accent="emerald" />

      <PanelFrame label="kognit.workspace" accent="emerald">
        {/* status bar */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-2.5">
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="rounded bg-white/5 px-2 py-0.5 text-foreground/70">sumRange.ts</span>
            <span className="text-muted-foreground/40">•</span>
            <span className={step === "done" ? "text-primary" : "text-[oklch(0.82_0.13_80)]"}>
              {step === "done" ? "0 issues" : "1 issue"}
            </span>
          </div>
          <div className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] ${status.tone}`}>
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ backgroundColor: "currentColor" }}
            />
            {status.label}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr]">
          {/* Left 60%: the live code editor */}
          <div className="relative border-b border-white/5 md:border-b-0 md:border-r">
            <pre className="min-h-[300px] px-5 py-5 font-mono text-[13px] leading-relaxed">
              <code>
                {CODE.map((line, i) => {
                  const shown = step === "type" ? i < visLines : true
                  const isBug = i === BUG_INDEX
                  const text = isBug && (step === "fix" || step === "done") ? fixText : line
                  const fixed = isBug && step === "done"
                  const flawed = isBug && (step === "probe" || (step === "type" && i < visLines))
                  return (
                    <div key={i} className="flex min-h-[22px] items-center gap-4">
                      <span className="w-5 select-none text-right tabular-nums text-white/15">
                        {i + 1}
                      </span>
                      {!shown ? (
                        <span className="text-transparent">.</span>
                      ) : flawed ? (
                        <motion.span
                          className="rounded px-1 text-foreground/90"
                          animate={{
                            boxShadow: [
                              "inset 0 0 0 1px oklch(0.8 0.12 80 / 25%)",
                              "inset 0 0 0 1px oklch(0.8 0.14 80 / 70%)",
                              "inset 0 0 0 1px oklch(0.8 0.12 80 / 25%)",
                            ],
                            backgroundColor: [
                              "oklch(0.8 0.12 80 / 5%)",
                              "oklch(0.8 0.12 80 / 13%)",
                              "oklch(0.8 0.12 80 / 5%)",
                            ],
                          }}
                          transition={{ duration: 1.6, repeat: Infinity }}
                        >
                          {line}
                        </motion.span>
                      ) : (
                        <span
                          className={
                            fixed
                              ? "rounded bg-primary/10 px-1 text-primary"
                              : isBug && step === "fix"
                                ? "rounded bg-[oklch(0.8_0.09_350_/_10%)] px-1 text-foreground/90"
                                : "text-foreground/70"
                          }
                        >
                          {text}
                          {isBug && step === "fix" && (
                            <span className="ml-0.5 inline-block h-[15px] w-[7px] translate-y-[2px] animate-pulse bg-[oklch(0.8_0.09_350)]" />
                          )}
                        </span>
                      )}
                    </div>
                  )
                })}
              </code>
            </pre>

            {/* mastery checkmark flash overlay */}
            <AnimatePresence>
              {check && (
                <motion.div
                  key="check"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.6, times: [0, 0.15, 0.7, 1] }}
                >
                  <div className="absolute inset-0 bg-primary/5" />
                  <motion.svg
                    width="96"
                    height="96"
                    viewBox="0 0 96 96"
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 240, damping: 14 }}
                  >
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="none"
                      stroke="oklch(0.78 0.09 165)"
                      strokeWidth="3"
                      opacity="0.5"
                    />
                    <motion.path
                      d="M30 50 L44 63 L68 34"
                      fill="none"
                      stroke="oklch(0.85 0.13 165)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.15 }}
                      style={{ filter: "drop-shadow(0 0 10px oklch(0.85 0.13 165))" }}
                    />
                  </motion.svg>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right 40%: the AI mentor core */}
          <div className="relative flex min-h-[300px] flex-col bg-neutral-950/30">
            <div className="pointer-events-none absolute inset-0 tactical-grid opacity-20" />
            <div
              className="relative flex-1 transition-shadow duration-700"
              style={{
                boxShadow:
                  coreAccent === "pink"
                    ? "inset 0 0 80px oklch(0.8 0.09 350 / 22%)"
                    : coreAccent === "emerald"
                      ? "inset 0 0 80px oklch(0.78 0.09 165 / 22%)"
                      : "none",
              }}
            >
              <ParticleMesh />
            </div>

            {/* projected Socratic prompt */}
            <div className="relative min-h-[132px] px-4 pb-4">
              <AnimatePresence mode="wait">
                {(step === "probe" || step === "fix" || step === "done") && (
                  <motion.div
                    key="probe"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-lg border px-4 py-3"
                    style={{
                      borderColor:
                        step === "done"
                          ? "oklch(0.78 0.09 165 / 30%)"
                          : "oklch(0.8 0.09 350 / 30%)",
                      backgroundColor:
                        step === "done"
                          ? "oklch(0.78 0.09 165 / 6%)"
                          : "oklch(0.8 0.09 350 / 6%)",
                    }}
                  >
                    <p
                      className="font-mono text-[10px] uppercase tracking-[0.2em]"
                      style={{
                        color:
                          step === "done"
                            ? "oklch(0.78 0.09 165)"
                            : "oklch(0.8 0.09 350)",
                      }}
                    >
                      {step === "done" ? "understanding secured" : "socratic mentor"}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
                      {step === "done"
                        ? "Exactly. The loop now stops before the out-of-bounds index — and you can explain why."
                        : probeText}
                      {step === "probe" && (
                        <span className="ml-0.5 inline-block h-[13px] w-[6px] translate-y-[2px] animate-pulse bg-[oklch(0.8_0.09_350)]" />
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom dock: live voice sound ribbon */}
        <div className="border-t border-white/5 bg-neutral-950/40 px-4 py-3">
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            live voice dialog
          </div>
          <SoundRibbon />
        </div>
      </PanelFrame>

      {/* Final tactical pointer — appears only after mastery, unlocks scrolling */}
      <div className="mt-10 flex h-16 items-center justify-center">
        <AnimatePresence>
          {step === "done" && (
            <motion.button
              key="cta"
              type="button"
              onClick={onUnlock}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative inline-flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-8 py-4 font-mono text-xs uppercase tracking-[0.24em] text-primary transition-colors hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_28px_var(--emerald-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--emerald-glow)]"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              [ Mission Resolved // Click to Enter the Arena ]
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
