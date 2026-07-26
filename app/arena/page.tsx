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
import { useKognitTutor } from "@/hooks/use-kognit-tutor"
import { useAuth, useClerk } from "@clerk/nextjs"

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
  testCases: { input: string; expected: string; explanation: string }[]
  aiHintPrompt: string  // what the AI says when user clicks "Get AI Hint"
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
    category: "Arrays & Loops",
    title: "Array Boundary & Off-by-One Guard",
    prompt:
      "Write a function `sumRangeSafe(arr, n)` that calculates the sum of the first `n` elements of `arr`.\n\nReturn `0` if `arr` is empty, null, or `n` is 0.\n\nExample:\nInput: arr = [10, 20, 30, 40], n = 3\nOutput: 60",
    defaultTimeLimit: 600,
    hints: [
      "Use strict less-than `i < n` in your loop — never `i <= n`.",
      "Also guard against `i < arr.length` so you never go out of bounds.",
      "Handle the edge case: what if arr is null, undefined, or empty?",
    ],
    testCases: [
      { input: "arr = [10, 20, 30, 40], n = 3", expected: "60", explanation: "Sum of first 3 elements: 10+20+30" },
      { input: "arr = [5, 5, 5], n = 0", expected: "0", explanation: "n=0 means sum nothing" },
      { input: "arr = [], n = 3", expected: "0", explanation: "Empty array returns 0" },
      { input: "arr = [1, 2, 3], n = 10", expected: "6", explanation: "n > length — only sum what exists" },
    ],
    aiHintPrompt: "A student just clicked the hint button for the 'Array Boundary & Off-by-One Guard' problem. In 2 short spoken sentences, explain in simple words: what an off-by-one error is and how to avoid it using strict less-than in a for loop. Be encouraging, speak like a tutor, no code blocks.",
  },
  medium: {
    id: 2,
    difficulty: "medium",
    category: "Data Structures & Caching",
    title: "LRU Cache System",
    prompt:
      "Implement an LRU (Least Recently Used) cache with `get(key)` and `put(key, value)` operations.\n\nBoth must run in O(1) time. When capacity is reached, evict the least recently used item before inserting a new one.\n\nExample:\ncache = LRUCache(2)\ncache.put(1, 1)\ncache.put(2, 2)\ncache.get(1)  → 1\ncache.put(3, 3)  → evicts key 2\ncache.get(2)  → -1 (not found)",
    defaultTimeLimit: 1200,
    hints: [
      "A JavaScript Map preserves insertion order — use that to track recency.",
      "On every get or put of an existing key, delete it and re-insert it to move it to 'most recent'.",
      "When at capacity, `map.keys().next().value` gives you the oldest (least recently used) key.",
    ],
    testCases: [
      { input: "put(1,1), put(2,2), get(1)", expected: "1", explanation: "Key 1 was accessed most recently" },
      { input: "put(1,1), put(2,2), put(3,3), get(2)", expected: "-1", explanation: "Key 2 was evicted when 3 was added (capacity=2)" },
      { input: "get(nonexistent)", expected: "-1", explanation: "Missing key returns -1" },
    ],
    aiHintPrompt: "A student just clicked hint for the LRU Cache problem. In 2 short spoken sentences, explain what LRU means and why a JavaScript Map (which preserves insertion order) is a good starting point. Be encouraging, speak like a tutor, no code blocks.",
  },
  hard: {
    id: 3,
    difficulty: "hard",
    category: "Recursion & Trees",
    title: "Abstract Syntax Tree (AST) Evaluator",
    prompt:
      "Write `evaluateAST(node)` that evaluates a binary arithmetic expression tree.\n\nNode structure:\n{ type: 'operator' | 'literal', value: '+' | '-' | '*' | '/' | number, left?: Node, right?: Node }\n\nExample:\n{ type:'operator', value:'+', left:{type:'literal',value:10}, right:{type:'literal',value:5} }\n→ Output: 15",
    defaultTimeLimit: 1800,
    hints: [
      "Base case first: if node.type === 'literal', just return node.value.",
      "For operators, recursively evaluate left and right subtrees, then apply the operator.",
      "This is post-order traversal: left → right → root.",
    ],
    testCases: [
      { input: "operator(+, literal(10), literal(5))", expected: "15", explanation: "10 + 5" },
      { input: "operator(*, literal(3), operator(+, literal(2), literal(4)))", expected: "18", explanation: "3 * (2 + 4) = 18" },
      { input: "literal(7)", expected: "7", explanation: "Leaf node just returns its value" },
    ],
    aiHintPrompt: "A student just clicked hint for the AST Evaluator problem. In 2 short spoken sentences, explain what post-order tree traversal means and why you evaluate children before the parent node. Be encouraging, speak like a tutor, no code blocks.",
  },
}

/* ------------------------------------------------------------------ */
/*  Countdown Timer Component                                          */
/* ------------------------------------------------------------------ */

function CountdownTimer({
  totalSeconds,
  elapsed,
  isTimerStarted = true,
}: {
  totalSeconds: number
  elapsed: number
  isTimerStarted?: boolean
}) {
  const remaining = Math.max(0, totalSeconds - elapsed)
  const fraction = totalSeconds > 0 ? remaining / totalSeconds : 0
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  const hue = fraction > 0.5 ? 165 : fraction > 0.2 ? 90 : 350
  const chroma = fraction > 0.2 ? 0.09 : 0.12
  const timerColor = isTimerStarted ? `oklch(0.78 ${chroma} ${hue})` : `oklch(0.6 0.02 200)`
  const glowColor = isTimerStarted ? `oklch(0.82 ${chroma + 0.02} ${hue} / 35%)` : `transparent`

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
            fraction < 0.15 && remaining > 0 && isTimerStarted
              ? { scale: [1, 1.05, 1], opacity: [1, 0.7, 1] }
              : {}
          }
          transition={
            fraction < 0.15 && remaining > 0 && isTimerStarted
              ? { duration: 0.8, repeat: Infinity }
              : {}
          }
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </motion.span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 mt-0.5">
          {remaining === 0 ? "TIME EXPIRED" : !isTimerStarted ? "START CODING" : "REMAINING"}
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
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken()
    const headers = new Headers(options.headers || {})
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return fetch(url, { ...options, headers })
  }, [getToken])

  // Tutor Hook Integration
  const { aiState, aiEmotion, aiText, userTranscript, isMicActive, sendCodeUpdate, startMic, stopMic } = useKognitTutor()

  // Difficulty Filter — DEFAULT TO EASY PROBLEM
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("easy")

  // Active question is derived from selected difficulty
  const question = useMemo(() => ADAPTIVE_CHALLENGES[selectedDifficulty], [selectedDifficulty])

  // Automatic Socratic Topic Adaptation from Terminal activity
  useEffect(() => {
    const lastConcept = localStorage.getItem('kognit_last_concept')
    if (lastConcept) {
      if (lastConcept.includes('recursion') || lastConcept.includes('tree')) {
        setSelectedDifficulty('hard')
      } else if (lastConcept.includes('hash') || lastConcept.includes('list') || lastConcept.includes('pointer')) {
        setSelectedDifficulty('medium')
      } else if (lastConcept.includes('array') || lastConcept.includes('variable')) {
        setSelectedDifficulty('easy')
      }
    }
  }, [])

  // Language input state — initially empty so user selects or fills in their own language
  const [typedLanguage, setTypedLanguage] = useState<string>("")

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
  const [showTestCases, setShowTestCases] = useState(false)
  const [aiHintRequested, setAiHintRequested] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Code Execution & Output Terminal State
  const [isRunning, setIsRunning] = useState(false)
  const [terminalLogs, setTerminalLogs] = useState<OutputEntry[]>([
    { type: 'info', text: '[TERMINAL] Mock exam environment ready (Default: Easy Contextual Challenge)' },
    { type: 'info', text: '[TERMINAL] Solution workspace is blank. Choose your language, start writing code, and click RUN CODE.' }
  ])
  const terminalScrollRef = useRef<HTMLDivElement>(null)

  // When active question changes, reset workspace
  useEffect(() => {
    setCustomTimeMinutes(Math.floor(question.defaultTimeLimit / 60))
    setElapsed(0)
    setSubmitted(false)
    setShowHint(false)
    setAnswer("") // Completely blank workspace for mock exam
    setShowTestCases(false)
    setAiHintRequested(false)
    setTerminalLogs([
      { type: 'info', text: `[EXAM] Contextual Challenge Loaded (${question.difficulty.toUpperCase()}): ${question.title}` },
      { type: 'info', text: '[EXAM] Write your solution from scratch in the workspace.' }
    ])
  }, [question])

  // AI speech bubble state
  const [speechBubbleText, setSpeechBubbleText] = useState('')
  const [showSpeechBubble, setShowSpeechBubble] = useState(false)
  const speechBubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Log AI responses to the terminal + show speech bubble
  useEffect(() => {
    if (aiText) {
      setTerminalLogs(prev => [...prev, { type: 'hint', text: `[AI TUTOR] ${aiText}` }])
      setSpeechBubbleText(aiText)
      setShowSpeechBubble(true)
      if (speechBubbleTimerRef.current) clearTimeout(speechBubbleTimerRef.current)
      speechBubbleTimerRef.current = setTimeout(() => setShowSpeechBubble(false), 10000)
    }
  }, [aiText])

  // Log user transcript to the terminal
  useEffect(() => {
    if (userTranscript) {
      setTerminalLogs(prev => [...prev, { type: 'info', text: `[YOU] ${userTranscript}` }])
    }
  }, [userTranscript])

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

  // Timer starts ONLY after user begins writing code into the solution workspace
  const isTimerStarted = answer.trim().length > 0
  const isTimerActive = isTimerStarted && !submitted

  // Timer interval
  useEffect(() => {
    if (!isTimerActive) return
    const id = setInterval(() => {
      setElapsed((p) => {
        if (p >= totalSeconds) return p
        return p + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isTimerActive, totalSeconds])

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
    addTerminalLog('info', '[EXAM] Recording skill telemetry to database...')

    // Determine concept tag from question category
    let conceptTag = 'variables'
    const cat = question.category.toLowerCase()
    if (cat.includes('array')) conceptTag = 'arrays'
    else if (cat.includes('cache') || cat.includes('state')) conceptTag = 'hash-maps'
    else if (cat.includes('window') || cat.includes('pointer')) conceptTag = 'searching'
    else if (cat.includes('recursion') || cat.includes('tree')) conceptTag = 'trees'

    // Persist real skill progress telemetry to DB
    fetchWithAuth(`${API_BASE}/skills/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concept_tag: conceptTag,
        action: "resolved",
        mastery_delta: 0.12,
        xp_delta: 60,
        resolved_delta: 1
      })
    })
      .then(res => res.json())
      .then(d => {
        addTerminalLog('success', `[DATABASE] Telemetry recorded: ${conceptTag} (+60 XP, Mastery +12%) ✓`)
      })
      .catch(err => console.log("[KOGNIT] Skill DB record error:", err))

    // Inject the prompt as a comment so the AI knows what we're solving
    const codeWithContext = `/* Exam Question: ${question.title}\n${question.prompt}\n*/\n\n${answer}`
    sendCodeUpdate(codeWithContext, typedLanguage || 'javascript')
  }, [addTerminalLog, answer, typedLanguage, question, sendCodeUpdate, fetchWithAuth])

  const handleHint = useCallback(() => {
    setShowHint(true)
    setHintIndex((prev) => Math.min(prev + 1, question.hints.length - 1))

    // On first hint click, trigger AI voice guidance about the problem
    if (!aiHintRequested) {
      setAiHintRequested(true)
      // Send the AI hint prompt as a code_update with special context
      // so the AI speaks an encouraging explanation of where to start
      const hintContext = `/* AI_HINT_REQUEST: ${question.aiHintPrompt} */\n// Student is looking at: ${question.title}`
      sendCodeUpdate(hintContext, typedLanguage || 'javascript')
    }
  }, [question.hints.length, question.aiHintPrompt, question.title, aiHintRequested, sendCodeUpdate, typedLanguage])

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
      const res = await fetchWithAuth(`${API_BASE}/run`, {
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

      // Determine concept tag from question category
      let conceptTag = 'variables'
      const cat = question.category.toLowerCase()
      if (cat.includes('array')) conceptTag = 'arrays'
      else if (cat.includes('cache') || cat.includes('state')) conceptTag = 'hash-maps'
      else if (cat.includes('window') || cat.includes('pointer')) conceptTag = 'searching'
      else if (cat.includes('recursion') || cat.includes('tree')) conceptTag = 'trees'

      const isError = Boolean((run?.code !== 0 && run?.code !== undefined) || compile?.stderr)

      // Persist real execution progress to database
      fetchWithAuth(`${API_BASE}/skills/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept_tag: conceptTag,
          action: isError ? "confusion" : "resolved",
          mastery_delta: isError ? -0.02 : 0.06,
          xp_delta: isError ? 10 : 30
        })
      }).catch(err => console.log("[KOGNIT] Run telemetry DB record error:", err))

      if (compile?.stderr) {
        addTerminalLog('warn', `[COMPILE] ${compile.stderr}`)
        outputProduced = true
        // Notify AI about compile error immediately
        const codeWithError = `${answer}\n/* COMPILE ERROR (from execution):\n${compile.stderr}\n*/`
        sendCodeUpdate(codeWithError, langToRun)
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
        // Notify AI about the runtime/compile error
        const errorDetail = run.stderr || compile?.stderr || `exit code ${run.code}`
        const codeWithError = `${answer}\n/* RUNTIME ERROR (from execution):\n${errorDetail}\n*/`
        sendCodeUpdate(codeWithError, langToRun)
      } else if (!outputProduced) {
        addTerminalLog('success', '[RUN] Program finished with 0 errors (no output printed)')
        // Notify AI of clean execution
        const codeWithSuccess = `${answer}\n/* EXECUTION SUCCESS */`
        sendCodeUpdate(codeWithSuccess, langToRun)
      } else {
        addTerminalLog('success', '[RUN] Execution complete ✓')
        // Notify AI of successful execution with output
        const codeWithSuccess = `${answer}\n/* EXECUTION SUCCESS */`
        sendCodeUpdate(codeWithSuccess, langToRun)
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
      <nav className="mx-auto mb-6 flex max-w-7xl items-center gap-8">
        <Link
          href="/"
          className="font-kognit text-base tracking-[0.25em] text-foreground transition-colors hover:text-primary"
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
          <button
            onClick={() => signOut({ redirectUrl: '/' })}
            className="flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 border border-transparent text-red-400/80 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300 ml-2"
          >
            <span className="h-2 w-2 rounded-full bg-red-400/50" />
            <span>Logout</span>
          </button>
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
            {/* Question Panel — LeetCode style with tabs */}
            <GlassPanel label="problem.statement" accent={question.difficulty === "hard" ? "pink" : "emerald"}>
              <div className="px-6 pb-5 pt-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="font-mono text-base font-bold uppercase tracking-[0.15em] text-foreground">
                    {question.title}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
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

                {/* Tab bar */}
                <div className="flex items-center gap-1 mb-4 border-b border-white/5 pb-2">
                  {[
                    { id: 'problem', label: 'Problem' },
                    { id: 'testcases', label: `Test Cases (${question.testCases.length})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setShowTestCases(tab.id === 'testcases')}
                      className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all ${
                        (tab.id === 'testcases') === showTestCases
                          ? 'bg-white/10 text-white border border-white/15'
                          : 'text-muted-foreground/50 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Problem description */}
                {!showTestCases && (
                  <div className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-muted-foreground/80">
                    {question.prompt}
                  </div>
                )}

                {/* Test cases */}
                {showTestCases && (
                  <div className="flex flex-col gap-3">
                    {question.testCases.map((tc, i) => (
                      <div key={i} className="rounded-xl border border-white/5 bg-black/30 overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">Test Case {i + 1}</span>
                          <span className="font-mono text-[9px] text-muted-foreground/30">{tc.explanation}</span>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-white/5 px-4 py-3 gap-4">
                          <div>
                            <span className="block font-mono text-[9px] uppercase tracking-widest text-sky-400/60 mb-1">Input</span>
                            <code className="font-mono text-[11px] text-sky-200/80">{tc.input}</code>
                          </div>
                          <div className="pl-4">
                            <span className="block font-mono text-[9px] uppercase tracking-widest text-emerald-400/60 mb-1">Expected</span>
                            <code className="font-mono text-[11px] text-emerald-200/80">{tc.expected}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassPanel>

            {/* Hint Panel — text hints + AI voice */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <GlassPanel label="hints">
                    <div className="px-6 pb-5 pt-8">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-sky-400/70">
                          Hint {hintIndex + 1} / {question.hints.length}
                        </span>
                        {aiHintRequested && (
                          <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-400/60 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            AI explained via voice
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {question.hints.slice(0, hintIndex + 1).map((hint, i) => (
                          <div key={i} className="flex items-start gap-2 rounded-lg border border-sky-400/10 bg-sky-400/5 px-4 py-3">
                            <span className="text-sky-400/60 mt-0.5">💡</span>
                            <p className="font-mono text-[12px] leading-relaxed text-sky-300/90">{hint}</p>
                          </div>
                        ))}
                        {hintIndex < question.hints.length - 1 && (
                          <button
                            onClick={handleHint}
                            className="mt-1 self-start rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:border-sky-400/30 hover:text-sky-300 hover:bg-sky-400/5 transition-all"
                          >
                            Next hint →
                          </button>
                        )}
                      </div>
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
                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/90 font-semibold flex items-center gap-1">
                      <span>Language:</span>
                      {typedLanguage.trim() === "" && (
                        <span className="text-[9px] text-amber-400 font-normal animate-pulse">(Choose or type)</span>
                      )}
                    </span>
                    
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        list="language-suggestions"
                        value={typedLanguage}
                        onChange={(e) => setTypedLanguage(e.target.value)}
                        placeholder="Choose language (e.g. Python, C++, JS)..."
                        className="w-56 rounded-lg bg-black/70 px-3 py-1 font-mono text-xs text-emerald-300 border border-emerald-500/40 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 placeholder:text-muted-foreground/40"
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
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40 mr-1 hidden sm:inline">
                      Select:
                    </span>
                    {POPULAR_LANGUAGES.slice(0, 6).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setTypedLanguage(lang)}
                        className={`rounded px-2 py-0.5 font-mono text-[9px] uppercase transition-colors border ${
                          typedLanguage.toLowerCase() === lang
                            ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 font-bold shadow-[0_0_8px_rgba(52,211,153,0.3)]"
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
                    className={`rounded-xl border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all disabled:opacity-30 ${
                      aiHintRequested
                        ? 'border-sky-400/40 text-sky-300 bg-sky-400/10 hover:bg-sky-400/20'
                        : 'border-white/10 text-muted-foreground/70 hover:border-sky-400/40 hover:text-sky-300 hover:bg-sky-400/10'
                    }`}
                  >
                    {showHint ? '[ NEXT HINT ]' : '[ GET HINT + AI VOICE ]'}
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
                    isTimerStarted={isTimerStarted}
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
                    : !isTimerStarted
                      ? "ready — timer starts when you code"
                      : isLowTime
                        ? "time critical ⚠"
                        : "timer in progress..."}
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
                {/* ── AI Speech Bubble ── */}
                <AnimatePresence>
                  {showSpeechBubble && speechBubbleText && (
                    <motion.div
                      key="speech-bubble"
                      className="absolute -top-2 left-2 right-2 z-40"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                      <div
                        className="relative rounded-xl border border-sky-400/30 bg-sky-950/80 backdrop-blur-md px-4 py-3 shadow-[0_0_20px_rgba(56,189,248,0.15)]"
                        onClick={() => setShowSpeechBubble(false)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Bubble tail */}
                        <div
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
                          style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '8px solid oklch(0.22 0.03 230 / 80%)',
                          }}
                        />
                        <div className="flex items-start gap-2">
                          <motion.span
                            className="mt-0.5 text-sky-400 text-sm shrink-0"
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {aiState === 'speaking' ? '🔊' : '💬'}
                          </motion.span>
                          <p className="font-mono text-[11px] leading-relaxed text-sky-100/90 line-clamp-4">
                            {speechBubbleText}
                          </p>
                        </div>
                        <span className="absolute top-1.5 right-2 font-mono text-[8px] text-sky-400/40 uppercase tracking-widest">
                          click to dismiss
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    emotion={aiEmotion}
                    isSpeaking={aiState === 'speaking'}
                    showConfetti={submitted}
                    className="h-full w-full"
                  />
                </motion.div>
              </div>
              <div className="border-t border-white/5 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                      {aiState === 'speaking' && '🔊 speaking...'}
                      {aiState === 'thinking' && '🧠 analyzing...'}
                      {aiState === 'listening' && '🎙️ listening...'}
                      {aiState === 'idle' && (
                        submitted
                          ? "solution reviewed ✓"
                          : isLowTime
                            ? "stay focused — you've got this"
                            : typingSpeed > 6
                              ? "great flow — keep going"
                              : "take your time, think it through"
                      )}
                    </span>
                  </div>

                  {/* Microphone toggle */}
                  <button
                    onClick={() => isMicActive ? stopMic() : startMic()}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all duration-200 ${
                      isMicActive
                        ? 'bg-sky-400 text-slate-950 font-bold border border-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.5)]'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-400/50 hover:bg-sky-500/30 hover:border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                    }`}
                    title={isMicActive ? 'Microphone active — click to mute' : 'Click to start voice conversation'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                    {isMicActive ? '● live' : 'talk to me'}
                  </button>
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
