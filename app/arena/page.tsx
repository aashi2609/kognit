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
/*  Types & Interfaces                                                 */
/* ------------------------------------------------------------------ */

export type Difficulty = "easy" | "medium" | "hard"

export interface Question {
  id: number
  difficulty: Difficulty
  category: string
  title: string
  prompt: string
  defaultTimeLimit: number // seconds
  hints: string[]
}

type LogType = 'info' | 'success' | 'error' | 'warn' | 'hint'

interface OutputEntry {
  type: LogType
  text: string
}

/* ------------------------------------------------------------------ */
/*  API & Config                                                       */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const POPULAR_LANGUAGES = ["javascript", "python", "java", "c++", "c", "typescript", "go", "rust", "ruby"]

/* ------------------------------------------------------------------ */
/*  Adaptive Contextual Mock Exam Challenges                           */
/* ------------------------------------------------------------------ */

const ADAPTIVE_CHALLENGES: Record<Difficulty, Question> = {
  easy: {
    id: 1,
    difficulty: "easy",
    category: "Array & Algorithm Optimization",
    title: "Array Merge & Deduplication Engine",
    prompt:
      "Implement a function `mergeAndDeduplicate(arr1, arr2)` that takes two sorted arrays of numbers, merges them into a single sorted array, and removes any duplicate values.\n\nExample:\nInput: arr1 = [1, 3, 5], arr2 = [2, 3, 6]\nOutput: [1, 2, 3, 5, 6]\n\nRequirements:\n1. Solve this with O(N + M) time complexity.\n2. Do not rely on external sorting libraries.",
    defaultTimeLimit: 600,
    hints: [
      "Use a two-pointer technique to iterate through both sorted arrays simultaneously.",
      "Compare elements at current pointers and append the smaller element while avoiding duplicates.",
    ],
  },
  medium: {
    id: 2,
    difficulty: "medium",
    category: "State Management & Caching",
    title: "LRU (Least Recently Used) Cache System",
    prompt:
      "Implement an LRU (Least Recently Used) cache data structure with `get(key)` and `put(key, value)` operations.\n\nRequirements:\n1. Both operations must run in O(1) average time complexity.\n2. When the cache reaches its capacity limit, invalidate the least recently accessed item before inserting a new key.",
    defaultTimeLimit: 1200,
    hints: [
      "A Map object in JavaScript preserves key insertion order.",
      "Re-inserting an existing key moves it to the end (most recent).",
    ],
  },
  hard: {
    id: 3,
    difficulty: "hard",
    category: "Recursion & Data Structures",
    title: "Abstract Syntax Tree (AST) Evaluator",
    prompt:
      "Write an evaluator function `evaluateAST(node)` that parses and evaluates a binary arithmetic expression tree.\n\nTree Node Structure:\n{\n  type: 'operator' | 'literal',\n  value: '+' | '-' | '*' | '/' | number,\n  left?: ASTNode,\n  right?: ASTNode\n}\n\nExample:\nRoot with operator '+' and left=literal(10), right=literal(5) -> Output: 15",
    defaultTimeLimit: 1800,
    hints: [
      "Use post-order tree traversal (evaluate left child, evaluate right child, apply root operator).",
      "Check base case when node.type === 'literal'.",
    ],
  },
}

/* ------------------------------------------------------------------ */
/*  Countdown Timer Component                                          */
/* ------------------------------------------------------------------ */

function CountdownTimer({
  totalSeconds,
  elapsed,
}: {
  totalSeconds: number
  elapsed: number
}) {
  const remaining = Math.max(0, totalSeconds - elapsed)
  const fraction = totalSeconds > 0 ? remaining / totalSeconds : 0
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  const hue = fraction > 0.5 ? 165 : fraction > 0.2 ? 90 : 350
  const chroma = fraction > 0.2 ? 0.09 : 0.12
  const timerColor = `oklch(0.78 ${chroma} ${hue})`
  const glowColor = `oklch(0.82 ${chroma + 0.02} ${hue} / 35%)`

  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - fraction)

  return (
    <div className="relative flex flex-col items-center gap-3">
      <svg width="130" height="130" className="-rotate-90">
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke="oklch(1 0 0 / 5%)"
          strokeWidth="4"
        />
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
            transition: "stroke 0.5s ease, stroke-dashoffset 0.3s linear",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-mono text-2xl tabular-nums font-bold"
          style={{ color: timerColor }}
          animate={
            fraction < 0.15 && remaining > 0
              ? { scale: [1, 1.05, 1], opacity: [1, 0.7, 1] }
              : {}
          }
          transition={
            fraction < 0.15 && remaining > 0
              ? { duration: 0.8, repeat: Infinity }
              : {}
          }
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </motion.span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 mt-0.5">
          {remaining === 0 ? "TIME EXPIRED" : "REMAINING"}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Soundwave Ribbon                                                   */
/* ------------------------------------------------------------------ */

function SoundwaveRibbon({ typingSpeed }: { typingSpeed: number }) {
  const barCount = 40
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      const base = Math.sin(i * 0.4) * 0.3 + 0.5
      const amplitude = Math.min(typingSpeed / 12, 1)
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
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ArenaPage() {
  // Difficulty Filter
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("medium")

  // Active question is derived from selected difficulty
  const question = useMemo(() => ADAPTIVE_CHALLENGES[selectedDifficulty], [selectedDifficulty])

  // Language input state
  const [typedLanguage, setTypedLanguage] = useState<string>("javascript")

  // Timer configuration
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number>(Math.floor(question.defaultTimeLimit / 60))
  const [isEditingCustomTime, setIsEditingCustomTime] = useState(false)
  const [customInputVal, setCustomInputVal] = useState<string>("")
  const [elapsed, setElapsed] = useState(0)

  // Solution Workspace state — 100% BLANK FOR REAL MOCK EXAM
  const [answer, setAnswer] = useState<string>("")
  const [showHint, setShowHint] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Code Execution & Output Terminal State
  const [isRunning, setIsRunning] = useState(false)
  const [terminalLogs, setTerminalLogs] = useState<OutputEntry[]>([
    { type: 'info', text: '[TERMINAL] Mock exam environment ready' },
    { type: 'info', text: '[TERMINAL] Solution workspace is blank. Write code from scratch and click RUN CODE.' }
  ])
  const terminalScrollRef = useRef<HTMLDivElement>(null)

  // When active question changes, reset workspace
  useEffect(() => {
    setCustomTimeMinutes(Math.floor(question.defaultTimeLimit / 60))
    setElapsed(0)
    setSubmitted(false)
    setShowHint(false)
    setAnswer("") // Completely blank workspace for mock exam
    setTerminalLogs([
      { type: 'info', text: `[EXAM] Contextual Challenge Loaded: ${question.title}` },
      { type: 'info', text: '[EXAM] Write your solution from scratch in the workspace.' }
    ])
  }, [question])

  const totalSeconds = customTimeMinutes * 60

  // Typing speed tracking
  const [typingSpeed, setTypingSpeed] = useState(0)
  const keyTimestamps = useRef<number[]>([])

  const trackKeystroke = useCallback(() => {
    const now = Date.now()
    keyTimestamps.current.push(now)
    keyTimestamps.current = keyTimestamps.current.filter((t) => now - t < 2000)
    setTypingSpeed(keyTimestamps.current.length / 2)
  }, [])

  // Auto scroll terminal output
  useEffect(() => {
    terminalScrollRef.current?.scrollTo({
      top: terminalScrollRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [terminalLogs])

  const addTerminalLog = useCallback((type: LogType, text: string) => {
    setTerminalLogs(prev => [...prev, { type, text }])
  }, [])

  // Timer interval
  useEffect(() => {
    if (submitted) return
    const id = setInterval(() => {
      setElapsed((p) => {
        if (p >= totalSeconds) return p
        return p + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [submitted, totalSeconds])

  // Decay typing speed
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      keyTimestamps.current = keyTimestamps.current.filter((t) => now - t < 2000)
      setTypingSpeed(keyTimestamps.current.length / 2)
    }, 200)
    return () => clearInterval(id)
  }, [])

  const fraction = Math.max(0, (totalSeconds - elapsed) / (totalSeconds || 1))
  const isLowTime = fraction < 0.2

  const handleSubmit = useCallback(() => {
    setSubmitted(true)
    addTerminalLog('success', '[EXAM] Solution submitted for evaluation ✓')
  }, [addTerminalLog])

  const handleHint = useCallback(() => {
    setShowHint(true)
    setHintIndex((prev) => Math.min(prev + 1, question.hints.length - 1))
  }, [question.hints.length])

  // Timer Presets
  const handleSelectPresetTime = (mins: number) => {
    setCustomTimeMinutes(mins)
    setElapsed(0)
    setIsEditingCustomTime(false)
  }

  const handleApplyCustomTime = () => {
    const parsed = parseInt(customInputVal, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 180) {
      setCustomTimeMinutes(parsed)
      setElapsed(0)
    }
    setIsEditingCustomTime(false)
  }

  /* ------------------------------------------------------------------ */
  /*  Run Code Execution Function                                       */
  /* ------------------------------------------------------------------ */
  const handleRunCode = async () => {
    if (!answer.trim()) {
      addTerminalLog('warn', '[RUN] Workspace is empty. Write your code before running.')
      return
    }
    const langToRun = typedLanguage.trim() || "javascript"
    setIsRunning(true)
    addTerminalLog('info', `[RUN] Executing solution (${langToRun})...`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch(`${API_BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: langToRun,
          content: answer
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || `Execution failed with HTTP ${res.status}`)
      }

      const { run, compile } = data
      let outputProduced = false

      if (compile?.stderr) {
        addTerminalLog('warn', `[COMPILE] ${compile.stderr}`)
        outputProduced = true
      }

      if (run?.stdout) {
        run.stdout.split('\n').filter(Boolean).forEach((line: string) => {
          addTerminalLog('info', `> ${line}`)
        })
        outputProduced = true
      }

      if (run?.stderr) {
        run.stderr.split('\n').filter(Boolean).forEach((line: string) => {
          addTerminalLog('error', `! ${line}`)
        })
        outputProduced = true
      }

      if (run?.code !== 0 && run?.code !== undefined) {
        addTerminalLog('error', `[RUN] Process exited with exit code ${run.code}`)
      } else if (!outputProduced) {
        addTerminalLog('success', '[RUN] Program finished with 0 errors (no output printed)')
      } else {
        addTerminalLog('success', '[RUN] Execution complete ✓')
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        addTerminalLog('error', '[RUN] Execution timed out (>15s)')
      } else {
        addTerminalLog('error', `[RUN] Execution error: ${err.message || err}`)
      }
    } finally {
      setIsRunning(false)
    }
  }

  // Character expression
  const charExpression = submitted
    ? "happy"
    : isLowTime
      ? "panic"
      : isRunning
        ? "focus"
        : typingSpeed > 6
          ? "focus"
          : ("happy" as const)

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6">
      {/* Top Bar Navigation */}
      <nav className="mx-auto mb-6 flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm uppercase tracking-[0.3em] text-primary/80 transition-colors hover:text-primary"
        >
          KOGNIT
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 p-1.5 backdrop-blur-md shadow-md">
          {[
            { href: "/dashboard", label: "Terminal" },
            { href: "/skills", label: "Skills" },
            { href: "/arena", label: "Arena", active: true },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                link.active
                  ? "border border-emerald-400/70 bg-emerald-500/25 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)]"
                  : "border border-transparent text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full transition-all ${
                  link.active
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : "bg-slate-400/50"
                }`}
              />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl">
        {/* Header Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
          <div>
            <h1 className="font-mono text-lg uppercase tracking-[0.3em] text-foreground flex items-center gap-3">
              <span>[ INTERVIEW_ARENA ]</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 tracking-normal normal-case font-mono">
                Live Mock Exam
              </span>
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50">
              Adaptive mock exam questions based on workspace context
            </p>
          </div>

          {/* Difficulty Selector */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40 mr-1">
              Exam Level:
            </span>
            {(["easy", "medium", "hard"] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all border ${
                  selectedDifficulty === diff
                    ? diff === "easy"
                      ? "border-emerald-400/80 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                      : diff === "medium"
                        ? "border-amber-400/80 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                        : "border-pink-400/80 bg-pink-500/20 text-pink-300 shadow-[0_0_12px_rgba(244,114,182,0.3)]"
                    : "border-white/10 bg-black/30 text-muted-foreground/60 hover:border-white/20 hover:text-white"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left: Question + Workspace */}
          <div className="flex flex-col gap-4">
            {/* Question Panel */}
            <GlassPanel label="problem.statement" accent={question.difficulty === "hard" ? "pink" : "emerald"}>
              <div className="px-6 pb-5 pt-8">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h2 className="font-mono text-base font-bold uppercase tracking-[0.15em] text-foreground">
                    {question.title}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground/60">
                      {question.category}
                    </span>
                    <span
                      className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] font-bold ${
                        question.difficulty === "hard"
                          ? "border-pink-400/30 bg-pink-400/10 text-pink-300"
                          : question.difficulty === "medium"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      }`}
                    >
                      {question.difficulty}
                    </span>
                  </div>
                </div>

                <div className="mt-4 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-muted-foreground/80 border-t border-white/5 pt-4">
                  {question.prompt}
                </div>
              </div>
            </GlassPanel>

            {/* Hint Panel */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <GlassPanel label="socratic.hint">
                    <div className="px-6 pb-4 pt-8">
                      <p className="font-mono text-[12px] leading-relaxed text-sky-300/90 flex items-start gap-2">
                        <span>💡</span>
                        <span>{question.hints[hintIndex]}</span>
                      </p>
                    </div>
                  </GlassPanel>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SOLUTION WORKSPACE — 100% BLANK FOR REAL MOCK EXAM */}
            <GlassPanel label="solution.workspace">
              <div className="px-4 pb-4 pt-8">
                {/* Editable Language Header Bar */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                      Language:
                    </span>
                    
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        list="language-suggestions"
                        value={typedLanguage}
                        onChange={(e) => setTypedLanguage(e.target.value)}
                        placeholder="e.g. python, cpp, javascript"
                        className="w-36 rounded-lg bg-black/60 px-3 py-1 font-mono text-xs text-emerald-300 border border-emerald-500/30 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
                      />
                      <datalist id="language-suggestions">
                        {POPULAR_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Popular Quick-Select Badges */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/30 mr-1 hidden sm:inline">
                      Quick:
                    </span>
                    {POPULAR_LANGUAGES.slice(0, 5).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setTypedLanguage(lang)}
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase transition-colors border ${
                          typedLanguage.toLowerCase() === lang
                            ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 font-bold"
                            : "border-white/5 bg-black/40 text-muted-foreground/50 hover:text-white hover:border-white/20"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 100% BLANK Textarea Editor */}
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={trackKeystroke}
                  disabled={submitted}
                  placeholder="// Write your solution code here from scratch..."
                  className="w-full resize-none rounded-xl border border-white/5 bg-neutral-950/60 px-5 py-4 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/25 focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10"
                  rows={11}
                />

                {/* Velocity Ribbon */}
                <div className="mt-3 rounded-lg border border-white/5 bg-neutral-950/30 px-4 py-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40">
                      input velocity
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                      {typingSpeed.toFixed(1)} cps
                    </span>
                  </div>
                  <SoundwaveRibbon typingSpeed={typingSpeed} />
                </div>

                {/* Action Buttons Bar */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {/* RUN CODE BUTTON */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRunCode}
                    disabled={isRunning || answer.trim().length === 0}
                    className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-all ${
                      isRunning
                        ? 'border-amber-400/40 bg-amber-500/10 text-amber-400 cursor-wait'
                        : 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400 hover:shadow-[0_0_16px_rgba(52,211,153,0.3)]'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <motion.span
                          className="h-2 w-2 rounded-full bg-amber-400"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">▶</span>
                        <span>RUN CODE</span>
                      </>
                    )}
                  </motion.button>

                  {/* SUBMIT BUTTON */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={submitted || answer.length === 0}
                    className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10 hover:border-white/40 disabled:opacity-30 font-bold"
                  >
                    {submitted ? "[ SUBMITTED ]" : "[ SUBMIT ]"}
                  </motion.button>

                  {/* GET HINT BUTTON */}
                  <button
                    onClick={handleHint}
                    disabled={submitted}
                    className="rounded-xl border border-white/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 transition-all hover:border-sky-400/40 hover:text-sky-300 hover:bg-sky-400/10 disabled:opacity-30"
                  >
                    [ GET HINT ]
                  </button>
                </div>

                {/* OUTPUT TERMINAL CONTAINER */}
                <div className="mt-4 rounded-xl border border-white/10 bg-black/70 overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between bg-neutral-900/80 px-4 py-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_6px_#34d399]" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-slate-300">
                        TERMINAL.OUTPUT
                      </span>
                    </div>

                    <button
                      onClick={() => setTerminalLogs([])}
                      className="font-mono text-[9px] uppercase text-muted-foreground/40 hover:text-white transition-colors"
                    >
                      Clear Terminal
                    </button>
                  </div>

                  <div
                    ref={terminalScrollRef}
                    className="h-36 overflow-y-auto px-4 py-3 font-mono text-xs no-scrollbar flex flex-col gap-1"
                  >
                    {terminalLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span
                          className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                            log.type === 'success'
                              ? 'bg-emerald-400'
                              : log.type === 'error'
                                ? 'bg-pink-400'
                                : log.type === 'warn'
                                  ? 'bg-amber-400'
                                  : 'bg-slate-500'
                          }`}
                        />
                        <span
                          className={
                            log.type === 'success'
                              ? 'text-emerald-300'
                              : log.type === 'error'
                                ? 'text-pink-300'
                                : log.type === 'warn'
                                  ? 'text-amber-300'
                                  : 'text-slate-300'
                          }
                        >
                          {log.text}
                        </span>
                      </div>
                    ))}
                    {terminalLogs.length === 0 && (
                      <span className="text-slate-500 italic">Terminal output cleared. Write code and click "RUN CODE" to test.</span>
                    )}
                  </div>
                </div>

              </div>
            </GlassPanel>
          </div>

          {/* Right Panel: Custom Timer + Copilot + Metrics */}
          <div className="flex flex-col gap-4">
            
            {/* PRESSURE.CLOCK WITH CUSTOM TIMER SELECTOR */}
            <GlassPanel label="pressure.clock" accent={isLowTime ? "pink" : "emerald"}>
              <div className="pt-7 px-5 pb-2">
                {/* Timer Preset Bar */}
                <div className="mb-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/50 font-semibold">
                      Timer Preset
                    </span>
                    <button
                      onClick={() => {
                        setIsEditingCustomTime(!isEditingCustomTime)
                        setCustomInputVal(customTimeMinutes.toString())
                      }}
                      className="font-mono text-[9px] uppercase text-emerald-400/80 hover:text-emerald-300 underline font-bold"
                    >
                      {isEditingCustomTime ? "Close" : "Custom"}
                    </button>
                  </div>

                  {/* Preset Pills */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => handleSelectPresetTime(mins)}
                        className={`rounded py-1 font-mono text-[10px] font-bold transition-all border ${
                          customTimeMinutes === mins && !isEditingCustomTime
                            ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                            : "border-white/5 bg-black/40 text-muted-foreground/60 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>

                  {/* Custom Minutes Input Box */}
                  {isEditingCustomTime && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-black/60 border border-emerald-500/30"
                    >
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={customInputVal}
                        onChange={(e) => setCustomInputVal(e.target.value)}
                        placeholder="Mins"
                        className="w-16 rounded bg-black/80 px-2 py-1 font-mono text-xs text-white border border-white/10 outline-none focus:border-emerald-400/60"
                      />
                      <span className="font-mono text-xs text-muted-foreground">min</span>
                      <button
                        onClick={handleApplyCustomTime}
                        className="ml-auto rounded bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 font-mono text-[10px] uppercase font-bold text-emerald-300 hover:bg-emerald-500/30"
                      >
                        Set
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Clock Visual */}
                <div className="flex justify-center my-2">
                  <CountdownTimer
                    totalSeconds={totalSeconds}
                    elapsed={elapsed}
                  />
                </div>
              </div>

              {/* Status bar */}
              <div className="border-t border-white/5 px-4 py-2.5 flex items-center justify-between">
                <motion.p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    color: isLowTime ? "oklch(0.78 0.07 350)" : "oklch(0.5 0.03 300)",
                  }}
                  animate={isLowTime ? { opacity: [0.5, 1, 0.5] } : {}}
                  transition={isLowTime ? { duration: 1, repeat: Infinity } : {}}
                >
                  {submitted
                    ? "completed ✓"
                    : isLowTime
                      ? "time critical ⚠"
                      : "in progress..."}
                </motion.p>

                <button
                  onClick={() => setElapsed(0)}
                  className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/40 hover:text-emerald-400 transition-colors"
                  title="Reset Timer"
                >
                  ↻ Reset
                </button>
              </div>
            </GlassPanel>

            {/* Copilot Character */}
            <GlassPanel label="copilot.state">
              <div className="relative flex h-[280px] items-center justify-center pt-4">
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl transition-all duration-1000"
                  style={{
                    background: isLowTime
                      ? "radial-gradient(circle at 50% 50%, oklch(0.78 0.07 350 / 10%), transparent 65%)"
                      : "radial-gradient(circle at 50% 50%, oklch(0.78 0.09 165 / 6%), transparent 65%)",
                  }}
                />

                <motion.div
                  className="relative h-[240px] w-[180px]"
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
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
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

            {/* Session Metrics */}
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
