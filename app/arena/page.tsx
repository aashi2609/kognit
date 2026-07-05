"use client"

import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { GlassPanel } from "@/components/glass-panel"
import { StudentCharacter } from "@/components/student-character"

/* ------------------------------------------------------------------ */
/*  Mock interview questions                                           */
/* ------------------------------------------------------------------ */

const QUESTIONS = [
  {
    id: 1,
    difficulty: "medium" as const,
    title: "Two Sum",
    prompt:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    timeLimit: 1200, // 20 minutes in seconds
    hints: [
      "Think about what complement you need for each element.",
      "Could a hash map help you track values you've already seen?",
    ],
  },
  {
    id: 2,
    difficulty: "hard" as const,
    title: "Merge K Sorted Lists",
    prompt:
      "You are given an array of `k` linked-lists, each sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
    timeLimit: 1800, // 30 minutes
    hints: [
      "What data structure lets you efficiently find the minimum of k elements?",
      "Consider a divide-and-conquer approach — merge pairs of lists.",
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Countdown Timer                                                    */
/* ------------------------------------------------------------------ */

function CountdownTimer({
  totalSeconds,
  elapsed,
}: {
  totalSeconds: number
  elapsed: number
}) {
  const remaining = Math.max(0, totalSeconds - elapsed)
  const fraction = remaining / totalSeconds // 1 → 0
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  // Green → amber → deep pink as time runs out
  const hue = fraction > 0.5 ? 165 : fraction > 0.2 ? 90 : 350
  const chroma = fraction > 0.2 ? 0.09 : 0.12
  const timerColor = `oklch(0.78 ${chroma} ${hue})`
  const glowColor = `oklch(0.82 ${chroma + 0.02} ${hue} / 35%)`

  // SVG ring parameters
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - fraction)

  return (
    <div className="relative flex flex-col items-center gap-3">
      <svg width="130" height="130" className="-rotate-90">
        {/* Background ring */}
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke="oklch(1 0 0 / 5%)"
          strokeWidth="4"
        />
        {/* Active ring */}
        <motion.circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke={timerColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`,
            transition: 'stroke 0.5s ease, stroke-dashoffset 0.3s linear',
          }}
        />
      </svg>
      {/* Time display in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="font-mono text-2xl tabular-nums"
          style={{ color: timerColor }}
          animate={
            fraction < 0.15
              ? { scale: [1, 1.05, 1], opacity: [1, 0.7, 1] }
              : {}
          }
          transition={
            fraction < 0.15
              ? { duration: 0.8, repeat: Infinity }
              : {}
          }
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </motion.span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Soundwave Ribbon — reacts to typing speed                          */
/* ------------------------------------------------------------------ */

function SoundwaveRibbon({ typingSpeed }: { typingSpeed: number }) {
  const barCount = 40
  // Generate bar heights based on typing speed (amplitude modulation)
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      const base = Math.sin(i * 0.4) * 0.3 + 0.5
      const amplitude = Math.min(typingSpeed / 12, 1) // normalize to 0–1
      return base * amplitude
    })
  }, [typingSpeed])

  return (
    <div className="flex h-10 items-center justify-center gap-[2px]">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          animate={{
            height: Math.max(3, h * 36),
            background:
              typingSpeed > 8
                ? "oklch(0.78 0.09 165)"
                : typingSpeed > 4
                  ? "oklch(0.78 0.12 90)"
                  : "oklch(0.5 0.03 300)",
          }}
          transition={{
            duration: 0.15,
            delay: i * 0.01,
          }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ArenaPage() {
  const [questionIndex] = useState(0)
  const question = QUESTIONS[questionIndex]
  const [elapsed, setElapsed] = useState(0)
  const [answer, setAnswer] = useState("")
  const [showHint, setShowHint] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Typing speed tracking (chars per second over a 2s window)
  const [typingSpeed, setTypingSpeed] = useState(0)
  const keyTimestamps = useRef<number[]>([])

  const trackKeystroke = useCallback(() => {
    const now = Date.now()
    keyTimestamps.current.push(now)
    // Keep only last 2 seconds
    keyTimestamps.current = keyTimestamps.current.filter(
      (t) => now - t < 2000,
    )
    setTypingSpeed(keyTimestamps.current.length / 2)
  }, [])

  // Timer
  useEffect(() => {
    if (submitted) return
    const id = setInterval(() => setElapsed((p) => p + 1), 1000)
    return () => clearInterval(id)
  }, [submitted])

  // Decay typing speed when not typing
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      keyTimestamps.current = keyTimestamps.current.filter(
        (t) => now - t < 2000,
      )
      setTypingSpeed(keyTimestamps.current.length / 2)
    }, 200)
    return () => clearInterval(id)
  }, [])

  const fraction = Math.max(0, (question.timeLimit - elapsed) / question.timeLimit)
  const isLowTime = fraction < 0.2

  const handleSubmit = useCallback(() => {
    setSubmitted(true)
  }, [])

  const handleHint = useCallback(() => {
    setShowHint(true)
    setHintIndex((prev) => Math.min(prev + 1, question.hints.length - 1))
  }, [question.hints.length])

  // Character expression based on pressure
  const charExpression = submitted
    ? "happy"
    : isLowTime
      ? "panic"
      : typingSpeed > 6
        ? "focus"
        : ("happy" as const)

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6">
      {/* Nav */}
      <nav className="mx-auto mb-6 flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm uppercase tracking-[0.3em] text-primary/80 transition-colors hover:text-primary"
        >
          KOGNIT
        </Link>
        <div className="flex items-center gap-6">
          {[
            { href: "/dashboard", label: "Terminal" },
            { href: "/skills", label: "Skills" },
            { href: "/arena", label: "Arena", active: true },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
                link.active
                  ? "text-accent"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl">
        {/* Header bar */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-lg uppercase tracking-[0.3em] text-foreground">
              [ INTERVIEW_ARENA ]
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50">
              Mock interview simulator — pressure calibrated
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-md border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
                question.difficulty === "hard"
                  ? "border-pink-400/30 bg-pink-400/10 text-pink-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-300"
              }`}
            >
              {question.difficulty}
            </span>
            <span className="font-mono text-xs text-muted-foreground/60">
              #{question.id}
            </span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          {/* Left: question + answer area */}
          <div className="flex flex-col gap-4">
            {/* Question panel */}
            <GlassPanel label="problem.statement" accent="pink">
              <div className="px-6 pb-5 pt-8">
                <h2 className="font-mono text-base uppercase tracking-[0.15em] text-foreground">
                  {question.title}
                </h2>
                <div className="mt-4 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-muted-foreground/80">
                  {question.prompt}
                </div>
              </div>
            </GlassPanel>

            {/* Hint panel */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <GlassPanel label="socratic.hint">
                    <div className="px-6 pb-4 pt-8">
                      <p className="font-mono text-[12px] leading-relaxed text-sky-300/80">
                        💡 {question.hints[hintIndex]}
                      </p>
                    </div>
                  </GlassPanel>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Answer area */}
            <GlassPanel label="solution.workspace">
              <div className="px-4 pb-4 pt-8">
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={trackKeystroke}
                  disabled={submitted}
                  placeholder="// Write your solution here..."
                  className="w-full resize-none rounded-xl border border-white/5 bg-neutral-950/50 px-5 py-4 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/25 focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10"
                  rows={12}
                />

                {/* Soundwave ribbon */}
                <div className="mt-3 rounded-lg border border-white/5 bg-neutral-950/30 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40">
                      input velocity
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                      {typingSpeed.toFixed(1)} cps
                    </span>
                  </div>
                  <SoundwaveRibbon typingSpeed={typingSpeed} />
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={submitted || answer.length === 0}
                    className="rounded-xl border border-primary/40 bg-primary/10 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-primary transition-all hover:border-primary hover:bg-primary/20 hover:shadow-[0_0_20px_var(--emerald-glow)] disabled:opacity-30 disabled:hover:border-primary/40 disabled:hover:bg-primary/10 disabled:hover:shadow-none"
                  >
                    {submitted ? "[ SUBMITTED ]" : "[ SUBMIT ]"}
                  </motion.button>
                  <button
                    onClick={handleHint}
                    disabled={submitted}
                    className="rounded-xl border border-white/8 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 transition-all hover:border-sky-400/30 hover:text-sky-300/80 disabled:opacity-30"
                  >
                    [ HINT ]
                  </button>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">
            {/* Timer */}
            <GlassPanel label="pressure.clock" accent={isLowTime ? "pink" : "emerald"}>
              <div className="flex justify-center px-5 pb-4 pt-8">
                <CountdownTimer
                  totalSeconds={question.timeLimit}
                  elapsed={elapsed}
                />
              </div>
              <div className="border-t border-white/5 px-4 py-2.5">
                <motion.p
                  className="text-center font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    color: isLowTime
                      ? "oklch(0.78 0.07 350)"
                      : "oklch(0.5 0.03 300)",
                  }}
                  animate={
                    isLowTime
                      ? { opacity: [0.5, 1, 0.5] }
                      : {}
                  }
                  transition={
                    isLowTime
                      ? { duration: 1, repeat: Infinity }
                      : {}
                  }
                >
                  {submitted
                    ? "completed"
                    : isLowTime
                      ? "time critical"
                      : "in progress"}
                </motion.p>
              </div>
            </GlassPanel>

            {/* Co-pilot character */}
            <GlassPanel label="copilot.state">
              <div className="relative flex h-[300px] items-center justify-center pt-4">
                {/* Pressure aura */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl transition-all duration-1000"
                  style={{
                    background: isLowTime
                      ? "radial-gradient(circle at 50% 50%, oklch(0.78 0.07 350 / 10%), transparent 65%)"
                      : "radial-gradient(circle at 50% 50%, oklch(0.78 0.09 165 / 6%), transparent 65%)",
                  }}
                />

                {/* Character with micro-expressions */}
                <motion.div
                  className="relative h-[260px] w-[200px]"
                  animate={
                    submitted
                      ? { y: [0, -8, 0] }
                      : isLowTime
                        ? { x: [-1, 1, -1] }
                        : {}
                  }
                  transition={
                    submitted
                      ? { duration: 0.5, repeat: 2 }
                      : isLowTime
                        ? { duration: 0.3, repeat: Infinity }
                        : {}
                  }
                >
                  <StudentCharacter
                    expression={charExpression}
                    className="h-full w-full"
                  />
                </motion.div>
              </div>
              <div className="border-t border-white/5 px-4 py-2.5">
                <div className="flex items-center justify-center gap-2">
                  <motion.span
                    className={`h-1.5 w-1.5 rounded-full ${
                      submitted
                        ? "bg-emerald-400"
                        : isLowTime
                          ? "bg-pink-400"
                          : "bg-primary/50"
                    }`}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                    {submitted
                      ? "solution reviewed ✓"
                      : isLowTime
                        ? "stay focused — you've got this"
                        : typingSpeed > 6
                          ? "great flow — keep going"
                          : "take your time, think it through"}
                  </span>
                </div>
              </div>
            </GlassPanel>

            {/* Session metrics */}
            <GlassPanel className="px-5 py-4">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                Session metrics
              </h3>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  { label: "Characters", value: answer.length.toString() },
                  { label: "Lines", value: answer.split("\n").length.toString() },
                  {
                    label: "Avg Speed",
                    value:
                      elapsed > 0
                        ? `${(answer.length / elapsed).toFixed(1)} cps`
                        : "—",
                  },
                  { label: "Hints Used", value: showHint ? (hintIndex + 1).toString() : "0" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      {m.label}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-foreground/80">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </main>
  )
}
