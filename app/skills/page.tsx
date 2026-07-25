"use client"

import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import { GlassPanel } from "@/components/glass-panel"
import { useAuth, useClerk } from "@clerk/nextjs"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/* ================================================================== */
/*  Data Model                                                         */
/* ================================================================== */

type NodeState = 'locked' | 'struggling' | 'mastered'

interface CodeDiff {
  before: string
  after: string
  timestamp: string
}

interface BugEntry {
  issue: string
  resolution: string
  timestamp: string
}

interface SkillNode {
  id: string
  label: string
  category: string
  state: NodeState
  mastery: number
  retention: number
  readiness: number
  confusionScore: number
  practiceCount: number
  lastPracticed: string
  avgResolutionTime: string
  position: { x: number; y: number }
  codeDiffs: CodeDiff[]
  voiceReflections: string[]
  bugTimeline: BugEntry[]
}

/* ================================================================== */
/*  Skill Data (hardcoded, matching existing approach)                  */
/* ================================================================== */

const SKILLS: SkillNode[] = [
  {
    id: 'variables', label: 'Variables', category: 'Fundamentals',
    state: 'mastered', mastery: 98, retention: 95, readiness: 99, confusionScore: 2,
    practiceCount: 62, lastPracticed: '1h ago', avgResolutionTime: '12s',
    position: { x: 120, y: 320 },
    codeDiffs: [
      { before: 'let x = "5" + 3;', after: 'let x = Number("5") + 3; // 8', timestamp: '2 weeks ago' },
    ],
    voiceReflections: ['Oh right, type coercion — the string concatenation was hiding the bug!'],
    bugTimeline: [
      { issue: 'Type coercion causing string concat', resolution: 'Used explicit Number() cast', timestamp: '2 weeks ago' },
    ],
  },
  {
    id: 'functions', label: 'Functions', category: 'Fundamentals',
    state: 'mastered', mastery: 94, retention: 90, readiness: 96, confusionScore: 5,
    practiceCount: 55, lastPracticed: '3h ago', avgResolutionTime: '18s',
    position: { x: 300, y: 260 },
    codeDiffs: [
      { before: 'function add(a, b) {\n  a + b\n}', after: 'function add(a, b) {\n  return a + b;\n}', timestamp: '10 days ago' },
    ],
    voiceReflections: ['I keep forgetting the return statement — the function was returning undefined!'],
    bugTimeline: [
      { issue: 'Missing return statement', resolution: 'Added explicit return keyword', timestamp: '10 days ago' },
    ],
  },
  {
    id: 'arrays', label: 'Arrays', category: 'Data Structures',
    state: 'mastered', mastery: 92, retention: 88, readiness: 95, confusionScore: 8,
    practiceCount: 47, lastPracticed: '2h ago', avgResolutionTime: '25s',
    position: { x: 280, y: 420 },
    codeDiffs: [
      { before: 'arr.splice(i, 1);\n// inside for loop', after: 'arr = arr.filter((_, idx) => idx !== i);', timestamp: '1 week ago' },
    ],
    voiceReflections: ['Splice mutates in-place and shifts indices — filter is cleaner for removal!'],
    bugTimeline: [
      { issue: 'Array mutation inside loop caused skipped elements', resolution: 'Switched to filter()', timestamp: '1 week ago' },
    ],
  },
  {
    id: 'linked-lists', label: 'Linked Lists', category: 'Data Structures',
    state: 'struggling', mastery: 58, retention: 42, readiness: 50, confusionScore: 55,
    practiceCount: 19, lastPracticed: '4d ago', avgResolutionTime: '3m 20s',
    position: { x: 480, y: 460 },
    codeDiffs: [
      { before: 'curr = curr.next;\ncurr.next = prev;', after: 'let next = curr.next;\ncurr.next = prev;\nprev = curr;\ncurr = next;', timestamp: '4 days ago' },
    ],
    voiceReflections: ['I need to save the next pointer BEFORE overwriting it — otherwise I lose the rest of the list!'],
    bugTimeline: [
      { issue: 'Lost reference to rest of list during reversal', resolution: 'Saved next pointer before overwrite', timestamp: '4 days ago' },
      { issue: 'Infinite loop in cycle detection', resolution: 'Used fast/slow pointer technique', timestamp: '1 week ago' },
    ],
  },
  {
    id: 'hash-maps', label: 'Hash Maps', category: 'Data Structures',
    state: 'mastered', mastery: 85, retention: 80, readiness: 88, confusionScore: 12,
    practiceCount: 38, lastPracticed: '6h ago', avgResolutionTime: '30s',
    position: { x: 160, y: 500 },
    codeDiffs: [
      { before: 'if (map[key]) {', after: 'if (map.has(key)) {', timestamp: '5 days ago' },
    ],
    voiceReflections: ['Map.has() is the correct check — bracket notation can give false for 0 or empty string!'],
    bugTimeline: [
      { issue: 'Falsy value check failed for 0', resolution: 'Used Map.has() instead of truthy check', timestamp: '5 days ago' },
    ],
  },
  {
    id: 'recursion', label: 'Recursion', category: 'Algorithms',
    state: 'struggling', mastery: 52, retention: 38, readiness: 45, confusionScore: 62,
    practiceCount: 18, lastPracticed: '5d ago', avgResolutionTime: '4m 15s',
    position: { x: 500, y: 280 },
    codeDiffs: [
      { before: 'function sum(n) {\n  return n + sum(n-1);\n}', after: 'function sum(n) {\n  if (n <= 0) return 0;\n  return n + sum(n-1);\n}', timestamp: '5 days ago' },
    ],
    voiceReflections: ['Oh! sum is 0 because root becomes null! I need the base case before the recursive call.'],
    bugTimeline: [
      { issue: 'Stack overflow — missing base case', resolution: 'Added n <= 0 guard clause', timestamp: '5 days ago' },
      { issue: 'Off-by-one in factorial', resolution: 'Changed base case from n===0 to n<=1', timestamp: '1 week ago' },
    ],
  },
  {
    id: 'sorting', label: 'Sorting', category: 'Algorithms',
    state: 'mastered', mastery: 88, retention: 82, readiness: 90, confusionScore: 10,
    practiceCount: 42, lastPracticed: '4h ago', avgResolutionTime: '22s',
    position: { x: 680, y: 200 },
    codeDiffs: [
      { before: 'arr.sort();', after: 'arr.sort((a, b) => a - b);', timestamp: '3 days ago' },
    ],
    voiceReflections: ['Default sort is lexicographic — [10, 2, 1] sorts to [1, 10, 2] without comparator!'],
    bugTimeline: [
      { issue: 'Lexicographic sort on numbers', resolution: 'Added numeric comparator function', timestamp: '3 days ago' },
    ],
  },
  {
    id: 'trees', label: 'Trees', category: 'Data Structures',
    state: 'struggling', mastery: 45, retention: 32, readiness: 38, confusionScore: 58,
    practiceCount: 14, lastPracticed: '1w ago', avgResolutionTime: '5m 40s',
    position: { x: 680, y: 380 },
    codeDiffs: [
      { before: 'function height(node) {\n  return height(node.left)\n    + height(node.right);\n}', after: 'function height(node) {\n  if (!node) return 0;\n  return 1 + Math.max(\n    height(node.left),\n    height(node.right)\n  );\n}', timestamp: '1 week ago' },
    ],
    voiceReflections: ['Height is the MAX of subtrees plus 1 — I was adding both sides instead of taking the max!'],
    bugTimeline: [
      { issue: 'Tree height calculated as sum instead of max', resolution: 'Used Math.max() + 1', timestamp: '1 week ago' },
      { issue: 'Null pointer on leaf children', resolution: 'Added null base case', timestamp: '1 week ago' },
    ],
  },
  {
    id: 'tree-traversal', label: 'Tree Traversal', category: 'Algorithms',
    state: 'locked', mastery: 15, retention: 8, readiness: 10, confusionScore: 0,
    practiceCount: 3, lastPracticed: '3w ago', avgResolutionTime: '—',
    position: { x: 860, y: 340 },
    codeDiffs: [],
    voiceReflections: [],
    bugTimeline: [],
  },
  {
    id: 'graphs', label: 'Graphs', category: 'Data Structures',
    state: 'locked', mastery: 10, retention: 5, readiness: 8, confusionScore: 0,
    practiceCount: 2, lastPracticed: '1mo ago', avgResolutionTime: '—',
    position: { x: 860, y: 480 },
    codeDiffs: [],
    voiceReflections: [],
    bugTimeline: [],
  },
  {
    id: 'dp', label: 'Dynamic Prog.', category: 'Algorithms',
    state: 'locked', mastery: 5, retention: 2, readiness: 3, confusionScore: 0,
    practiceCount: 1, lastPracticed: 'never', avgResolutionTime: '—',
    position: { x: 900, y: 200 },
    codeDiffs: [],
    voiceReflections: [],
    bugTimeline: [],
  },
  {
    id: 'searching', label: 'Searching', category: 'Algorithms',
    state: 'mastered', mastery: 82, retention: 75, readiness: 80, confusionScore: 15,
    practiceCount: 30, lastPracticed: '1d ago', avgResolutionTime: '28s',
    position: { x: 480, y: 140 },
    codeDiffs: [
      { before: 'mid = (lo + hi) / 2;', after: 'mid = Math.floor((lo + hi) / 2);', timestamp: '1 day ago' },
    ],
    voiceReflections: ['Integer division! JavaScript gives floats — Math.floor prevents fractional indices.'],
    bugTimeline: [
      { issue: 'Fractional index in binary search', resolution: 'Used Math.floor() on midpoint', timestamp: '1 day ago' },
    ],
  },
  {
    id: 'big-o', label: 'Big-O Analysis', category: 'Complexity',
    state: 'mastered', mastery: 80, retention: 75, readiness: 82, confusionScore: 18,
    practiceCount: 35, lastPracticed: '8h ago', avgResolutionTime: '20s',
    position: { x: 680, y: 80 },
    codeDiffs: [],
    voiceReflections: ['Nested loops = O(n²) not O(n) — each inner loop runs n times for each outer iteration.'],
    bugTimeline: [
      { issue: 'Mistook O(n²) nested loop for O(n)', resolution: 'Traced iteration count: n × n = n²', timestamp: '3 days ago' },
    ],
  },
  {
    id: 'greedy', label: 'Greedy', category: 'Algorithms',
    state: 'struggling', mastery: 40, retention: 28, readiness: 35, confusionScore: 48,
    practiceCount: 12, lastPracticed: '6d ago', avgResolutionTime: '6m 10s',
    position: { x: 860, y: 120 },
    codeDiffs: [
      { before: '// always pick largest\nitems.sort((a,b) => b.value - a.value);', after: '// pick best value/weight ratio\nitems.sort((a,b) => (b.value/b.weight) - (a.value/a.weight));', timestamp: '6 days ago' },
    ],
    voiceReflections: ['Greedy by value alone fails — I need value-to-weight ratio for fractional knapsack!'],
    bugTimeline: [
      { issue: 'Greedy choice by raw value gave suboptimal result', resolution: 'Sorted by value/weight density ratio', timestamp: '6 days ago' },
    ],
  },
]

const EDGES: [string, string][] = [
  ['variables', 'functions'],
  ['variables', 'arrays'],
  ['functions', 'recursion'],
  ['functions', 'searching'],
  ['arrays', 'sorting'],
  ['arrays', 'hash-maps'],
  ['arrays', 'linked-lists'],
  ['recursion', 'trees'],
  ['recursion', 'tree-traversal'],
  ['recursion', 'dp'],
  ['trees', 'tree-traversal'],
  ['trees', 'graphs'],
  ['linked-lists', 'trees'],
  ['sorting', 'big-o'],
  ['searching', 'big-o'],
  ['sorting', 'greedy'],
  ['big-o', 'dp'],
  ['greedy', 'dp'],
]

/* ================================================================== */
/*  AI Diagnosis (derived from skill data)                             */
/* ================================================================== */

function useAIDiagnosis(skills: SkillNode[]) {
  return useMemo(() => {
    const mastered = skills
      .filter(s => s.state === 'mastered')
      .sort((a, b) => b.mastery - a.mastery)
    const struggling = skills
      .filter(s => s.state === 'struggling')
      .sort((a, b) => b.confusionScore - a.confusionScore)
    const weakest = [...skills]
      .filter(s => s.state !== 'locked')
      .sort((a, b) => a.mastery - b.mastery)[0]

    const strengths = mastered.slice(0, 3).map(s => s.label).join(', ')
    const blindspot = struggling[0]
    const overallMastery = Math.round(
      skills.filter(s => s.state !== 'locked').reduce((sum, s) => sum + s.mastery, 0) /
      skills.filter(s => s.state !== 'locked').length
    )

    return { strengths, blindspot, weakest, overallMastery, mastered, struggling }
  }, [skills])
}

/* ================================================================== */
/*  Memory Decay helper                                                */
/* ================================================================== */

function getDecayLevel(lastPracticed: string): 'fresh' | 'fading' | 'rusty' {
  if (lastPracticed.includes('h ago') || lastPracticed.includes('1d ago')) return 'fresh'
  if (lastPracticed.includes('d ago') || lastPracticed.includes('w ago')) return 'fading'
  return 'rusty'
}

function getDecayOpacity(decay: 'fresh' | 'fading' | 'rusty'): number {
  if (decay === 'fresh') return 1
  if (decay === 'fading') return 0.65
  return 0.35
}

/* ================================================================== */
/*  SVG Graph Components                                               */
/* ================================================================== */

const NODE_RADIUS = 28

function getNodeColor(state: NodeState): string {
  switch (state) {
    case 'mastered': return '#22d3ee'   // bright cyan
    case 'struggling': return '#f472b6' // bright neon pink
    case 'locked': return '#475569'     // slate-600
  }
}

function getNodeGlowColor(state: NodeState): string {
  switch (state) {
    case 'mastered': return 'rgba(34, 211, 238, 0.5)'
    case 'struggling': return 'rgba(244, 114, 182, 0.5)'
    case 'locked': return 'rgba(71, 85, 105, 0.15)'
  }
}

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */

export default function SkillsPage() {
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken()
    const headers = new Headers(options.headers || {})
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return fetch(url, { ...options, headers })
  }, [getToken])

  const [skills, setSkills] = useState<SkillNode[]>(SKILLS)
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null)
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)
  const diagnosis = useAIDiagnosis(skills)

  useEffect(() => {
    fetchWithAuth(`${API_BASE}/skills`)
      .then(res => res.json())
      .then(data => {
        setSkills(prev => prev.map(s => {
          const bd = data.find((d: any) => d.concept_tag === s.id || d.concept_tag === s.label.toLowerCase())
          if (bd) {
            return {
              ...s,
              mastery: Math.floor(bd.mastery_level * 100),
              confusionScore: Math.min(100, bd.confusion_count * 10),
              practiceCount: bd.confusion_count + bd.resolved_count,
              state: bd.mastery_level > 0.8 ? 'mastered' : (bd.confusion_count > bd.resolved_count ? 'struggling' : 'locked'),
              lastPracticed: new Date(bd.last_practiced_at).toLocaleString()
            }
          } else {
            const isRoot = ['variables', 'functions', 'arrays'].includes(s.id)
            return {
              ...s,
              state: isRoot ? 'struggling' : 'locked',
              mastery: 0,
              confusionScore: 0,
              practiceCount: 0,
              lastPracticed: 'never'
            }
          }
          return s
        }))
      })
      .catch(err => console.error("Failed to fetch skills:", err))
  }, [fetchWithAuth])

  // Pan & zoom state
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 })

  // Dragging nodes
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(skills.map(s => [s.id, { ...s.position }]))
  )

  const handleWheel = useCallback((_e: React.WheelEvent) => {
    // Zoom disabled on scroll — use +/− buttons instead
  }, [])

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (draggedNode) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y }
  }, [draggedNode, viewBox])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode && svgRef.current) {
      // Drag node
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = viewBox.w / rect.width
      const scaleY = viewBox.h / rect.height
      const nx = viewBox.x + (e.clientX - rect.left) * scaleX
      const ny = viewBox.y + (e.clientY - rect.top) * scaleY
      setNodePositions(prev => ({ ...prev, [draggedNode]: { x: nx, y: ny } }))
      return
    }
    if (!isPanning) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const scaleX = viewBox.w / rect.width
    const scaleY = viewBox.h / rect.height
    const dx = (e.clientX - panStart.current.x) * scaleX
    const dy = (e.clientY - panStart.current.y) * scaleY
    setViewBox(vb => ({ ...vb, x: panStart.current.vx - dx, y: panStart.current.vy - dy }))
  }, [isPanning, draggedNode, viewBox])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
    setDraggedNode(null)
  }, [])

  // Category stats
  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; mastered: number; struggling: number; locked: number }>()
    for (const s of skills) {
      const entry = map.get(s.category) || { total: 0, mastered: 0, struggling: 0, locked: 0 }
      entry.total++
      entry[s.state]++
      map.set(s.category, entry)
    }
    return Array.from(map.entries())
  }, [])

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6">
      {/* Nav */}
      <nav className="mx-auto mb-6 flex max-w-7xl items-center gap-8">
        <Link
          href="/"
          className="font-mono text-sm uppercase tracking-[0.3em] text-primary/80 transition-colors hover:text-primary"
        >
          KOGNIT
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 p-1.5 backdrop-blur-md shadow-md">
          {[
            { href: '/dashboard', label: 'Terminal' },
            { href: '/skills', label: 'Skills', active: true },
            { href: '/arena', label: 'Arena' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                link.active
                  ? 'border border-emerald-400/70 bg-emerald-500/25 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)]'
                  : 'border border-transparent text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full transition-all ${
                  link.active
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-slate-400/50'
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

      {/* Header */}
      <div className="mx-auto mb-6 max-w-7xl">
        <h1 className="font-mono text-lg uppercase tracking-[0.3em] text-foreground">
          [ KNOWLEDGE_MAP ]
        </h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50">
          Interactive skill graph — retention decay · session evidence · AI diagnosis
        </p>
      </div>

      {/* ── AI Diagnosis Panel ──────────────────────────────────── */}
      <div className="mx-auto mb-6 max-w-7xl">
        <GlassPanel className="p-5">
          <div className="flex items-start gap-1.5 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400/80">◆ AI Diagnosis</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/40 ml-auto">
              overall mastery: {diagnosis.overallMastery}%
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Strengths */}
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/80">Top Strengths</span>
              </div>
              <p className="font-mono text-[11px] text-foreground/80 leading-relaxed">
                Strong at <span className="text-cyan-300">{diagnosis.strengths}</span>
              </p>
            </div>

            {/* Blindspot */}
            <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 px-4 py-3 shadow-[0_0_15px_rgba(244,114,182,0.1)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.7)] animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-pink-300 font-semibold">Primary Blindspot</span>
              </div>
              {diagnosis.blindspot && (
                <p className="font-mono text-[11px] text-foreground/90 leading-relaxed">
                  Struggling with <span className="text-pink-300 font-semibold underline decoration-pink-500/40 underline-offset-4">{diagnosis.blindspot.label}</span>
                  {' — '}confusion score: <span className="text-pink-300 font-bold">{diagnosis.blindspot.confusionScore}%</span>
                </p>
              )}
            </div>

            {/* Recommended Challenge */}
            <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-violet-300/80">Recommended Next</span>
              </div>
              {diagnosis.weakest && (
                <>
                  <p className="font-mono text-[11px] text-foreground/80 leading-relaxed mb-2">
                    Focus on <span className="text-violet-300">{diagnosis.weakest.label}</span> — only {diagnosis.weakest.mastery}% mastery
                  </p>
                  <Link
                    href="/arena"
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-violet-300 transition-all hover:bg-violet-500/25 hover:border-violet-400/60"
                  >
                    ⚡ Start Challenge
                  </Link>
                </>
              )}
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* ── Main Content Grid ──────────────────────────────────── */}
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_280px]">

        {/* ── 2D SVG Graph Canvas ─────────────────────────────── */}
        <GlassPanel label="knowledge.graph" className="relative h-[580px]">
          <div className="absolute inset-0 pt-6">
            {/* SVG-based graph */}
            <svg
              ref={svgRef}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              className="h-full w-full select-none"
              style={{ cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : 'grab' }}
              onWheel={handleWheel}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
            >
              <defs>
                {/* Glow filters */}
                <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-pink" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-edge" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Animated dash for locked edges */}
                <style>{`
                  @keyframes dashFlow {
                    to { stroke-dashoffset: -20; }
                  }
                  @keyframes pulsePink {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                  }
                  @keyframes glowPulse {
                    0%, 100% { r: ${NODE_RADIUS + 8}; opacity: 0.25; }
                    50% { r: ${NODE_RADIUS + 14}; opacity: 0.08; }
                  }
                `}</style>
              </defs>

              {/* ── Edges ─────────────────────────────────────── */}
              {EDGES.map(([fromId, toId]) => {
                const from = nodePositions[fromId]
                const to = nodePositions[toId]
                if (!from || !to) return null
                const fromSkill = skills.find(s => s.id === fromId)!
                const toSkill = skills.find(s => s.id === toId)!
                const isLocked = toSkill.state === 'locked'
                const isMasteredPath = fromSkill.state === 'mastered' && toSkill.state === 'mastered'

                return (
                  <line
                    key={`${fromId}-${toId}`}
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke={isMasteredPath ? '#34d399' : isLocked ? '#334155' : '#475569'}
                    strokeWidth={isMasteredPath ? 2 : 1.5}
                    strokeDasharray={isLocked ? '6 4' : 'none'}
                    opacity={isMasteredPath ? 0.5 : isLocked ? 0.3 : 0.35}
                    filter={isMasteredPath ? 'url(#glow-edge)' : undefined}
                    style={isLocked ? { animation: 'dashFlow 1.5s linear infinite' } : undefined}
                  />
                )
              })}

              {/* ── Nodes ─────────────────────────────────────── */}
              {skills.map(skill => {
                const pos = nodePositions[skill.id]
                if (!pos) return null
                const color = getNodeColor(skill.state)
                const glowColor = getNodeGlowColor(skill.state)
                const decay = getDecayLevel(skill.lastPracticed)
                const opacity = skill.state === 'locked' ? 0.4 : getDecayOpacity(decay)
                const isHovered = hoveredSkill === skill.id
                const isSelected = selectedSkill?.id === skill.id

                return (
                  <g
                    key={skill.id}
                    style={{ cursor: 'pointer', opacity }}
                    onMouseEnter={() => setHoveredSkill(skill.id)}
                    onMouseLeave={() => setHoveredSkill(null)}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      setDraggedNode(skill.id)
                    }}
                    onClick={(e) => {
                      if (!draggedNode) {
                        e.stopPropagation()
                        setSelectedSkill(skill)
                      }
                    }}
                  >
                    {/* Outer glow aura for mastered */}
                    {skill.state === 'mastered' && (
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={NODE_RADIUS + 10}
                        fill="none"
                        stroke={color}
                        strokeWidth={1}
                        opacity={0.2}
                        style={{ animation: 'glowPulse 3s ease-in-out infinite' }}
                      />
                    )}

                    {/* Struggling pulse ring */}
                    {skill.state === 'struggling' && (
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={NODE_RADIUS + 6}
                        fill="none"
                        stroke="#f472b6"
                        strokeWidth={1.5}
                        style={{ animation: 'pulsePink 2s ease-in-out infinite' }}
                      />
                    )}

                    {/* Main node circle */}
                    <circle
                      cx={pos.x} cy={pos.y}
                      r={NODE_RADIUS}
                      fill={skill.state === 'locked' ? 'transparent' : `${color}15`}
                      stroke={color}
                      strokeWidth={isHovered || isSelected ? 2.5 : skill.state === 'locked' ? 1 : 1.5}
                      strokeDasharray={skill.state === 'locked' ? '5 3' : 'none'}
                      filter={skill.state === 'mastered' ? 'url(#glow-cyan)' : skill.state === 'struggling' ? 'url(#glow-pink)' : undefined}
                    />

                    {/* Mastery fill arc (background indicator) */}
                    {skill.state !== 'locked' && (
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={NODE_RADIUS - 5}
                        fill="none"
                        stroke={color}
                        strokeWidth={3}
                        strokeDasharray={`${(skill.mastery / 100) * (2 * Math.PI * (NODE_RADIUS - 5))} ${2 * Math.PI * (NODE_RADIUS - 5)}`}
                        strokeDashoffset={(2 * Math.PI * (NODE_RADIUS - 5)) * 0.25}
                        strokeLinecap="round"
                        opacity={0.35}
                      />
                    )}

                    {/* State icon */}
                    <text
                      x={pos.x} y={pos.y - 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={skill.state === 'locked' ? 14 : 12}
                      fill={color}
                    >
                      {skill.state === 'locked' ? '🔒' : skill.state === 'struggling' ? '⚠️' : '⚡'}
                    </text>

                    {/* Label */}
                    <text
                      x={pos.x} y={pos.y + NODE_RADIUS + 14}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="ui-monospace, monospace"
                      fontWeight={600}
                      letterSpacing="0.08em"
                      fill={skill.state === 'mastered' ? '#a5f3fc' : skill.state === 'struggling' ? '#fbcfe8' : '#94a3b8'}
                    >
                      {skill.label}
                    </text>

                    {/* Mastery % badge */}
                    {skill.state !== 'locked' && (
                      <text
                        x={pos.x} y={pos.y + NODE_RADIUS + 26}
                        textAnchor="middle"
                        fontSize={8}
                        fontFamily="ui-monospace, monospace"
                        fill={color}
                        opacity={0.6}
                      >
                        {skill.mastery}%
                      </text>
                    )}

                    {/* Decay indicator (rusty ring) */}
                    {decay === 'rusty' && skill.state !== 'locked' && (
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={NODE_RADIUS + 3}
                        fill="none"
                        stroke="#78350f"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        opacity={0.5}
                      />
                    )}
                    {decay === 'fading' && skill.state !== 'locked' && (
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={NODE_RADIUS + 3}
                        fill="none"
                        stroke="#92400e"
                        strokeWidth={0.8}
                        strokeDasharray="6 4"
                        opacity={0.3}
                      />
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Graph legend overlay */}
            <div className="absolute bottom-3 left-4 flex items-center gap-4 rounded-lg border border-white/5 bg-black/40 px-3 py-2 backdrop-blur-md">
              {[
                { icon: '⚡', color: 'text-cyan-400', label: 'Mastered' },
                { icon: '⚠️', color: 'text-pink-400', label: 'Struggling' },
                { icon: '🔒', color: 'text-slate-500', label: 'Locked' },
              ].map(item => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <span className="text-xs">{item.icon}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${item.color}`}>{item.label}</span>
                </span>
              ))}
              <span className="ml-2 flex items-center gap-1.5">
                <span className="h-1.5 w-5 rounded-full bg-gradient-to-r from-amber-800/60 to-amber-800/20" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-amber-700">Fading</span>
              </span>
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-4 flex flex-col gap-1">
              <button
                onClick={() => setViewBox(vb => {
                  const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2
                  const nw = Math.max(400, vb.w * 0.85), nh = Math.max(240, vb.h * 0.85)
                  return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh }
                })}
                className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-black/40 font-mono text-xs text-white/60 hover:bg-white/10 hover:text-white transition-all"
              >+</button>
              <button
                onClick={() => setViewBox(vb => {
                  const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2
                  const nw = Math.min(2000, vb.w * 1.15), nh = Math.min(1200, vb.h * 1.15)
                  return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh }
                })}
                className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-black/40 font-mono text-xs text-white/60 hover:bg-white/10 hover:text-white transition-all"
              >−</button>
            </div>
          </div>
        </GlassPanel>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Category breakdown */}
          {categoryStats.map(([cat, data]) => (
            <GlassPanel key={cat} className="px-5 py-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/80">
                {cat}
              </h3>
              <div className="mt-3 flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg tabular-nums text-foreground">{data.total}</span>
                  <span className="font-mono text-[9px] text-muted-foreground/50">skills</span>
                </div>
                <div className="flex gap-2">
                  {data.mastered > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 font-mono text-[9px] text-cyan-300">
                      ⚡ {data.mastered}
                    </span>
                  )}
                  {data.struggling > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-pink-400/20 bg-pink-400/10 px-2 py-0.5 font-mono text-[9px] text-pink-300">
                      ⚠️ {data.struggling}
                    </span>
                  )}
                  {data.locked > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-slate-400/20 bg-slate-400/10 px-2 py-0.5 font-mono text-[9px] text-slate-400">
                      🔒 {data.locked}
                    </span>
                  )}
                </div>
              </div>
            </GlassPanel>
          ))}

          {/* Memory health overview */}
          <GlassPanel className="px-5 py-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
              Memory Health
            </h3>
            <div className="mt-3 flex flex-col gap-2.5">
              {skills.filter(s => s.state !== 'locked').map(s => {
                const decay = getDecayLevel(s.lastPracticed)
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      decay === 'fresh' ? 'bg-cyan-400' : decay === 'fading' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <span className="flex-1 font-mono text-[10px] text-foreground/70 truncate">{s.label}</span>
                    <span className={`font-mono text-[9px] ${
                      decay === 'fresh' ? 'text-cyan-400/60' : decay === 'fading' ? 'text-amber-400/60' : 'text-red-400/60'
                    }`}>
                      {s.retention}%
                    </span>
                    {/* Mini bar */}
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.retention}%`,
                          background: decay === 'fresh' ? '#22d3ee' : decay === 'fading' ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* ── Slide-Over Detail Panel ───────────────────────────── */}
      <AnimatePresence>
        {selectedSkill && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedSkill(null)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-neutral-950/95 backdrop-blur-2xl"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {selectedSkill.state === 'locked' ? '🔒' : selectedSkill.state === 'struggling' ? '⚠️' : '⚡'}
                      </span>
                      <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-foreground">
                        {selectedSkill.label}
                      </h2>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">
                      {selectedSkill.category}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSkill(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-muted-foreground/50 hover:bg-white/5 hover:text-white transition-all"
                  >
                    ✕
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Mastery', value: `${selectedSkill.mastery}%`, color: 'text-cyan-300' },
                    { label: 'Retention', value: `${selectedSkill.retention}%`, color: selectedSkill.retention < 50 ? 'text-red-300' : 'text-emerald-300' },
                    { label: 'Readiness', value: `${selectedSkill.readiness}%`, color: 'text-violet-300' },
                    { label: 'Confusion', value: `${selectedSkill.confusionScore}%`, color: selectedSkill.confusionScore > 40 ? 'text-amber-300' : 'text-emerald-300' },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                      <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">{stat.label}</span>
                      <span className={`block font-mono text-lg tabular-nums ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Avg Resolution Time */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 mb-6">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">Avg Time-to-Resolution</span>
                  <span className="block font-mono text-sm text-foreground mt-1">{selectedSkill.avgResolutionTime}</span>
                  <span className="block font-mono text-[9px] text-muted-foreground/40 mt-0.5">{selectedSkill.practiceCount} practice sessions · last: {selectedSkill.lastPracticed}</span>
                </div>

                {/* Confidence Health Meter */}
                <div className="mb-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Confidence Health</span>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedSkill.retention}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{
                        background: selectedSkill.retention >= 70 ? 'linear-gradient(90deg, #22d3ee, #34d399)'
                          : selectedSkill.retention >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                          : 'linear-gradient(90deg, #ef4444, #f87171)',
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground/40">
                    <span>{getDecayLevel(selectedSkill.lastPracticed) === 'rusty' ? '⚠ Memory decay detected' : getDecayLevel(selectedSkill.lastPracticed) === 'fading' ? 'Gradually fading' : 'Recently practiced'}</span>
                    <span>{selectedSkill.retention}%</span>
                  </div>
                </div>

                {/* Code Snapshots (Diffs) */}
                {selectedSkill.codeDiffs.length > 0 && (
                  <div className="mb-6">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Code Snapshots</span>
                    {selectedSkill.codeDiffs.map((diff, i) => (
                      <div key={i} className="mt-3 rounded-xl border border-white/5 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-1.5">
                          <span className="font-mono text-[9px] text-muted-foreground/40">Before → After</span>
                          <span className="font-mono text-[8px] text-muted-foreground/30">{diff.timestamp}</span>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-white/5">
                          <div className="p-3 bg-red-500/[0.03]">
                            <pre className="font-mono text-[10px] text-red-300/70 whitespace-pre-wrap leading-relaxed">{diff.before}</pre>
                          </div>
                          <div className="p-3 bg-emerald-500/[0.03]">
                            <pre className="font-mono text-[10px] text-emerald-300/70 whitespace-pre-wrap leading-relaxed">{diff.after}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Voice Reflections */}
                {selectedSkill.voiceReflections.length > 0 && (
                  <div className="mb-6">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Voice Reflections</span>
                    {selectedSkill.voiceReflections.map((text, i) => (
                      <div key={i} className="mt-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className="text-cyan-400/60 text-xs mt-0.5">💬</span>
                          <p className="font-mono text-[11px] text-cyan-200/70 leading-relaxed italic">
                            &ldquo;{text}&rdquo;
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bug Timeline */}
                {selectedSkill.bugTimeline.length > 0 && (
                  <div className="mb-6">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">Bug Timeline</span>
                    <div className="mt-3 relative pl-4">
                      {/* Timeline line */}
                      <div className="absolute left-[5px] top-1 bottom-1 w-px bg-white/10" />

                      {selectedSkill.bugTimeline.map((bug, i) => (
                        <div key={i} className="relative mb-4 last:mb-0">
                          {/* Dot */}
                          <div className="absolute -left-4 top-1 h-2.5 w-2.5 rounded-full border border-emerald-400/40 bg-emerald-400/20" />

                          <div className="ml-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[9px] text-muted-foreground/30">{bug.timestamp}</span>
                            </div>
                            <p className="font-mono text-[10px] text-red-300/60 mb-0.5">
                              <span className="text-red-400/40">bug:</span> {bug.issue}
                            </p>
                            <p className="font-mono text-[10px] text-emerald-300/60">
                              <span className="text-emerald-400/40">fix:</span> {bug.resolution}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Locked state message */}
                {selectedSkill.state === 'locked' && (
                  <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 px-4 py-6 text-center">
                    <span className="text-2xl mb-2 block">🔒</span>
                    <p className="font-mono text-[11px] text-slate-400/60">
                      This concept hasn&apos;t been encountered yet.
                    </p>
                    <p className="font-mono text-[10px] text-slate-500/40 mt-1">
                      Complete prerequisite skills to unlock.
                    </p>
                  </div>
                )}

                {/* Quick action */}
                {selectedSkill.state !== 'locked' && (
                  <Link
                    href="/arena"
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-3 font-mono text-[10px] uppercase tracking-widest text-cyan-300 transition-all hover:bg-cyan-400/20 hover:border-cyan-400/50"
                  >
                    ⚡ Practice {selectedSkill.label}
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
