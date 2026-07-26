"use client"

import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GlassPanel } from "@/components/glass-panel"
import { StudentCharacter } from "@/components/student-character"
import { useAuth, useClerk } from "@clerk/nextjs"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ── Types ─────────────────────────────────────────────────────────────

export interface SkillNode {
  id: string
  label: string
  category: 'Fundamentals' | 'Data Structures' | 'Algorithms' | 'Complexity'
  state: 'mastered' | 'struggling' | 'locked'
  mastery: number
  retention: number
  readiness: number
  confusionScore: number
  practiceCount: number
  lastPracticed: string
  avgResolutionTime: string
  position: { x: number; y: number }
  codeDiffs: { before: string; after: string; timestamp: string }[]
  voiceReflections: string[]
  bugTimeline: { issue: string; resolution: string; timestamp: string }[]
}

interface SkillRecord {
  concept_tag: string
  mastery_level: number
  confusion_count: number
  resolved_count: number
  xp: number
  last_practiced_at: string
}

interface UserSummary {
  file_count: number
  primary_language: string | null
  languages_used: Record<string, number>
  mastery_records: SkillRecord[]
}

// ── Baseline Skill Constellation Nodes ─────────────────────────────────

const INITIAL_SKILLS: SkillNode[] = [
  {
    id: 'variables', label: 'Variables & Scope', category: 'Fundamentals',
    state: 'mastered', mastery: 98, retention: 95, readiness: 99, confusionScore: 2,
    practiceCount: 62, lastPracticed: '1h ago', avgResolutionTime: '12s',
    position: { x: 140, y: 300 },
    codeDiffs: [
      { before: 'let x = "5" + 3;', after: 'let x = Number("5") + 3; // 8', timestamp: '2 days ago' },
    ],
    voiceReflections: ['Type coercion was implicitly turning numeric addition into string concat!'],
    bugTimeline: [
      { issue: 'Type coercion string concat', resolution: 'Explicit Number() cast applied', timestamp: '2 days ago' },
    ],
  },
  {
    id: 'functions', label: 'Functions & Return', category: 'Fundamentals',
    state: 'mastered', mastery: 94, retention: 90, readiness: 96, confusionScore: 5,
    practiceCount: 55, lastPracticed: '3h ago', avgResolutionTime: '18s',
    position: { x: 300, y: 240 },
    codeDiffs: [
      { before: 'function add(a, b) {\n  a + b\n}', after: 'function add(a, b) {\n  return a + b;\n}', timestamp: '4 days ago' },
    ],
    voiceReflections: ['Missing return statement — function evaluated result but returned undefined!'],
    bugTimeline: [
      { issue: 'Missing explicit return', resolution: 'Added return keyword to closure', timestamp: '4 days ago' },
    ],
  },
  {
    id: 'arrays', label: 'Array Boundaries', category: 'Data Structures',
    state: 'mastered', mastery: 92, retention: 88, readiness: 95, confusionScore: 8,
    practiceCount: 47, lastPracticed: '2h ago', avgResolutionTime: '25s',
    position: { x: 280, y: 440 },
    codeDiffs: [
      { before: 'for (let i = 0; i <= arr.length; i++)', after: 'for (let i = 0; i < arr.length; i++)', timestamp: 'Yesterday' },
    ],
    voiceReflections: ['Off-by-one loop boundary read arr[length] which returned undefined!'],
    bugTimeline: [
      { issue: 'Index out of bounds on last iteration', resolution: 'Changed <= to strict inequality <', timestamp: 'Yesterday' },
    ],
  },
  {
    id: 'linked-lists', label: 'Linked List Pointers', category: 'Data Structures',
    state: 'struggling', mastery: 58, retention: 42, readiness: 50, confusionScore: 55,
    practiceCount: 19, lastPracticed: '4d ago', avgResolutionTime: '3m 20s',
    position: { x: 480, y: 480 },
    codeDiffs: [
      { before: 'curr = curr.next;\ncurr.next = prev;', after: 'let next = curr.next;\ncurr.next = prev;\nprev = curr;\ncurr = next;', timestamp: '4 days ago' },
    ],
    voiceReflections: ['Pointer overwrite lost reference to the remaining chain before traversal!'],
    bugTimeline: [
      { issue: 'Lost list reference in reversal', resolution: 'Cached next pointer before mutating .next', timestamp: '4 days ago' },
    ],
  },
  {
    id: 'hash-maps', label: 'Hash Maps & O(1) Keys', category: 'Data Structures',
    state: 'mastered', mastery: 85, retention: 80, readiness: 88, confusionScore: 12,
    practiceCount: 38, lastPracticed: '6h ago', avgResolutionTime: '30s',
    position: { x: 160, y: 520 },
    codeDiffs: [
      { before: 'if (map[key]) {', after: 'if (map.has(key)) {', timestamp: '5 days ago' },
    ],
    voiceReflections: ['Map.has() is the correct check — truthy checks fail for 0 or empty string!'],
    bugTimeline: [
      { issue: 'Falsy value key check failure', resolution: 'Used Map.has() key lookup', timestamp: '5 days ago' },
    ],
  },
  {
    id: 'recursion', label: 'Recursion Base Case', category: 'Algorithms',
    state: 'struggling', mastery: 52, retention: 38, readiness: 45, confusionScore: 62,
    practiceCount: 18, lastPracticed: '5d ago', avgResolutionTime: '4m 15s',
    position: { x: 520, y: 260 },
    codeDiffs: [
      { before: 'function sum(n) {\n  return n + sum(n-1);\n}', after: 'function sum(n) {\n  if (n <= 0) return 0;\n  return n + sum(n-1);\n}', timestamp: '5 days ago' },
    ],
    voiceReflections: ['Stack overflow — call stack exceeded maximum depth due to missing base condition guard!'],
    bugTimeline: [
      { issue: 'Stack overflow exception', resolution: 'Added n <= 0 base case guard', timestamp: '5 days ago' },
    ],
  },
  {
    id: 'sorting', label: 'Sorting Algorithms', category: 'Algorithms',
    state: 'mastered', mastery: 88, retention: 82, readiness: 90, confusionScore: 10,
    practiceCount: 42, lastPracticed: '4h ago', avgResolutionTime: '22s',
    position: { x: 680, y: 180 },
    codeDiffs: [
      { before: 'arr.sort();', after: 'arr.sort((a, b) => a - b);', timestamp: '3 days ago' },
    ],
    voiceReflections: ['Default Array.prototype.sort converts elements to strings before comparing!'],
    bugTimeline: [
      { issue: 'Lexicographic numeric sort flaw', resolution: 'Passed numeric comparator (a, b) => a - b', timestamp: '3 days ago' },
    ],
  },
  {
    id: 'trees', label: 'Binary Tree Traversal', category: 'Data Structures',
    state: 'struggling', mastery: 45, retention: 32, readiness: 38, confusionScore: 58,
    practiceCount: 14, lastPracticed: '1w ago', avgResolutionTime: '5m 40s',
    position: { x: 680, y: 380 },
    codeDiffs: [
      { before: 'return height(node.left) + height(node.right);', after: 'return 1 + Math.max(height(node.left), height(node.right));', timestamp: '1 week ago' },
    ],
    voiceReflections: ['Tree height is max subtree depth + 1, not the sum of both subtrees!'],
    bugTimeline: [
      { issue: 'Incorrect height calculation', resolution: 'Used Math.max() for depth comparison', timestamp: '1 week ago' },
    ],
  },
  {
    id: 'tree-traversal', label: 'AST Expression Tree', category: 'Algorithms',
    state: 'locked', mastery: 15, retention: 8, readiness: 10, confusionScore: 0,
    practiceCount: 3, lastPracticed: '3w ago', avgResolutionTime: '—',
    position: { x: 860, y: 340 },
    codeDiffs: [],
    voiceReflections: [],
    bugTimeline: [],
  },
  {
    id: 'graphs', label: 'Graph Adjacency', category: 'Data Structures',
    state: 'locked', mastery: 10, retention: 5, readiness: 8, confusionScore: 0,
    practiceCount: 2, lastPracticed: '1mo ago', avgResolutionTime: '—',
    position: { x: 860, y: 500 },
    codeDiffs: [],
    voiceReflections: [],
    bugTimeline: [],
  },
  {
    id: 'dp', label: 'Dynamic Programming', category: 'Algorithms',
    state: 'locked', mastery: 5, retention: 2, readiness: 3, confusionScore: 0,
    practiceCount: 1, lastPracticed: 'never', avgResolutionTime: '—',
    position: { x: 900, y: 200 },
    codeDiffs: [],
    voiceReflections: [],
    bugTimeline: [],
  },
  {
    id: 'searching', label: 'Binary Search Bounds', category: 'Algorithms',
    state: 'mastered', mastery: 82, retention: 75, readiness: 80, confusionScore: 15,
    practiceCount: 30, lastPracticed: '1d ago', avgResolutionTime: '28s',
    position: { x: 480, y: 120 },
    codeDiffs: [
      { before: 'mid = (lo + hi) / 2;', after: 'mid = Math.floor((lo + hi) / 2);', timestamp: '1 day ago' },
    ],
    voiceReflections: ['Math.floor is mandatory in JS to prevent non-integer indices in array access!'],
    bugTimeline: [
      { issue: 'Floating point index in binary search', resolution: 'Wrapped midpoint in Math.floor()', timestamp: '1 day ago' },
    ],
  },
  {
    id: 'big-o', label: 'Big-O Complexity', category: 'Complexity',
    state: 'mastered', mastery: 80, retention: 75, readiness: 82, confusionScore: 18,
    practiceCount: 35, lastPracticed: '8h ago', avgResolutionTime: '20s',
    position: { x: 680, y: 60 },
    codeDiffs: [],
    voiceReflections: ['Nested loops iterating over n result in quadratic O(n²) complexity, not O(n)!'],
    bugTimeline: [
      { issue: 'Miscalculated nested loop time complexity', resolution: 'Traced iteration product: n × n = n²', timestamp: '3 days ago' },
    ],
  },
  {
    id: 'greedy', label: 'Greedy Optimization', category: 'Algorithms',
    state: 'struggling', mastery: 40, retention: 28, readiness: 35, confusionScore: 48,
    practiceCount: 12, lastPracticed: '6d ago', avgResolutionTime: '6m 10s',
    position: { x: 860, y: 100 },
    codeDiffs: [
      { before: 'items.sort((a,b) => b.val - a.val);', after: 'items.sort((a,b) => (b.val/b.wt) - (a.val/a.wt));', timestamp: '6 days ago' },
    ],
    voiceReflections: ['Greedy choice by raw value fails — sort by value-to-weight density ratio!'],
    bugTimeline: [
      { issue: 'Suboptimal greedy choice', resolution: 'Sorted items by value/weight ratio', timestamp: '6 days ago' },
    ],
  },
]

const PREREQUISITES: [string, string][] = [
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

// Calculate Ease Factor En = 2.5 + 0.1 * Mastery - 0.05 * Confusion
function calculateEaseFactor(mastery: number, confusion: number): number {
  const score = 2.5 + (0.1 * (mastery / 10)) - (0.05 * (confusion / 10))
  return Math.min(3.0, Math.max(1.3, Number(score.toFixed(2))))
}

function timeAgo(isoString: string): string {
  if (!isoString || isoString === 'never') return 'never'
  const diff = Date.now() - new Date(isoString).getTime()
  if (isNaN(diff)) return isoString
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Main Page Component ───────────────────────────────────────────────

export default function SkillsPage() {
  const { getToken } = useAuth()
  const { signOut } = useClerk()

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken()
    const headers = new Headers(options.headers || {})
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return fetch(url, { ...options, headers })
  }, [getToken])

  const [skills, setSkills] = useState<SkillNode[]>(INITIAL_SKILLS)
  const [selectedSkillId, setSelectedSkillId] = useState<string>("recursion")
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null)
  const [summary, setSummary] = useState<UserSummary | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<string>("just now")
  const [isSyncingPulse, setIsSyncingPulse] = useState(false)
  const [viewMode, setViewMode] = useState<'constellation' | 'analytics'>('constellation')

  // Pan & Zoom SVG canvas state
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState({ x: 40, y: 0, w: 940, h: 580 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, vx: 40, vy: 0 })
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(INITIAL_SKILLS.map(s => [s.id, { ...s.position }]))
  )

  // Real-time Database Synchronization
  const loadRealtimeSkills = useCallback(() => {
    setIsSyncingPulse(true)
    fetchWithAuth(`${API_BASE}/skills/summary`)
      .then(res => res.json())
      .then((data: UserSummary) => {
        setSummary(data)
        if (data.mastery_records && data.mastery_records.length > 0) {
          setSkills(prev => prev.map(node => {
            const match = data.mastery_records.find(
              m => m.concept_tag === node.id || m.concept_tag === node.label.toLowerCase()
            )
            if (match) {
              const masteryPct = Math.floor((match.mastery_level || 0) * 100)
              const confusionScore = Math.min(100, (match.confusion_count || 0) * 10)
              const state: 'mastered' | 'struggling' | 'locked' =
                (match.mastery_level || 0) > 0.75
                  ? 'mastered'
                  : (match.confusion_count || 0) > (match.resolved_count || 0) || (match.mastery_level || 0) > 0
                    ? 'struggling'
                    : node.state

              return {
                ...node,
                mastery: masteryPct || node.mastery,
                confusionScore: confusionScore || node.confusionScore,
                practiceCount: (match.confusion_count || 0) + (match.resolved_count || 0) || node.practiceCount,
                state: state,
                lastPracticed: match.last_practiced_at ? timeAgo(match.last_practiced_at) : node.lastPracticed
              }
            }
            return node
          }))
        }
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      })
      .catch(err => console.log("[KOGNIT] Realtime skill telemetry sync:", err))
      .finally(() => {
        setTimeout(() => setIsSyncingPulse(false), 800)
      })
  }, [fetchWithAuth])

  useEffect(() => {
    loadRealtimeSkills()
    const interval = setInterval(loadRealtimeSkills, 3500)
    return () => clearInterval(interval)
  }, [loadRealtimeSkills])

  // Reset skills DB telemetry to pure 0
  const handleResetTelemetry = useCallback(() => {
    fetchWithAuth(`${API_BASE}/skills/reset`, { method: "POST" })
      .then(res => res.json())
      .then(() => loadRealtimeSkills())
      .catch(err => console.log("[KOGNIT] Skills reset error:", err))
  }, [fetchWithAuth, loadRealtimeSkills])

  // Selected skill node object
  const selectedSkill = useMemo(() => {
    return skills.find(s => s.id === selectedSkillId) || skills[0]
  }, [skills, selectedSkillId])

  // Diagnostic metrics
  const diagnosis = useMemo(() => {
    const mastered = skills.filter(s => s.state === 'mastered').sort((a, b) => b.mastery - a.mastery)
    const struggling = skills.filter(s => s.state === 'struggling').sort((a, b) => b.confusionScore - a.confusionScore)
    const weakest = [...skills].sort((a, b) => a.mastery - b.mastery)[0]

    const overallMindMapScore = Math.round(
      skills.reduce((sum, s) => sum + s.mastery, 0) / skills.length
    )
    const topStrength = mastered[0]?.label || "Variables & Scope"
    const primaryBlindspot = struggling[0]?.label || "Pointer & Memory Leaks"

    return { overallMindMapScore, topStrength, primaryBlindspot, mastered, struggling, weakest }
  }, [skills])

  // Category breakdown stats
  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; mastered: number; struggling: number; locked: number }>()
    for (const s of skills) {
      const entry = map.get(s.category) || { total: 0, mastered: 0, struggling: 0, locked: 0 }
      entry.total++
      entry[s.state]++
      map.set(s.category, entry)
    }
    return Array.from(map.entries())
  }, [skills])

  // Reactive character avatar expression
  const charExpression = useMemo(() => {
    if (selectedSkill?.state === 'struggling') return 'panic'
    if (diagnosis.overallMindMapScore > 75) return 'happy'
    return 'focus'
  }, [selectedSkill, diagnosis.overallMindMapScore])

  // Canvas Pan & Drag event handlers
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (draggedNode) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y }
  }, [draggedNode, viewBox])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = viewBox.w / rect.width
      const scaleY = viewBox.h / rect.height
      const nx = viewBox.x + (e.clientX - rect.left) * scaleX
      const ny = viewBox.y + (e.clientY - rect.top) * scaleY
      setNodePositions(prev => ({ ...prev, [draggedNode]: { x: nx, y: ny } }))
      return
    }
    if (!isPanning || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
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

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <nav className="mx-auto mb-6 flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-kognit text-base tracking-[0.25em] text-foreground transition-colors hover:text-primary"
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
                    link.active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-400/50'
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
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-white/10 bg-black/60 p-1">
            <button
              onClick={() => setViewMode('constellation')}
              className={`rounded px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                viewMode === 'constellation'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              🕸️ Constellation Mesh
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`rounded px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                viewMode === 'analytics'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              📊 Telemetry Analytics
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Layout Workspace Container ─────────────────────────────── */}
      <div className="mx-auto max-w-7xl">
        {/* Header Bar */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div>
            <h1 className="font-mono text-lg uppercase tracking-[0.3em] text-foreground flex items-center gap-3">
              <span>[ KNOWLEDGE_CONSTELLATION_MESH ]</span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-mono tracking-normal normal-case">
                ● Live Realtime Sync
              </span>
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50">
              Interactive 2D prerequisite tree mapped according to Computer Science concept hierarchies
            </p>
          </div>

          {/* Sync indicator pill */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md">
            <span className={`h-2 w-2 rounded-full ${isSyncingPulse ? 'animate-ping bg-emerald-400' : 'bg-emerald-400/80'}`} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
              {lastSyncTime}
            </span>
          </div>
        </div>

        {/* ── Layout View Option 1: Central Constellation Mesh Graph Layout ── */}
        {viewMode === 'constellation' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* LEFT COLUMN: Central Knowledge Mesh (Interactive 2D Visual) */}
            <div className="flex flex-col gap-4">
              <GlassPanel label="central.knowledge.mesh" className="relative min-h-[580px] overflow-hidden">
                {/* SVG Interactive Canvas */}
                <div className="relative h-[580px] w-full cursor-grab active:cursor-grabbing">
                  <svg
                    ref={svgRef}
                    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                    className="h-full w-full select-none"
                    onMouseDown={handlePanStart}
                    onMouseMove={handlePanMove}
                    onMouseUp={handlePanEnd}
                    onMouseLeave={handlePanEnd}
                  >
                    <defs>
                      {/* Glow Filters */}
                      <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      {/* Directional Gradient Lines */}
                      <linearGradient id="beam-active" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>

                    {/* Prerequisite Pathways Lines */}
                    {PREREQUISITES.map(([fromId, toId], idx) => {
                      const fromNode = skills.find(s => s.id === fromId)
                      const toNode = skills.find(s => s.id === toId)
                      if (!fromNode || !toNode) return null

                      const posFrom = nodePositions[fromId] || fromNode.position
                      const posTo = nodePositions[toId] || toNode.position
                      const isMasteredPath = fromNode.state === 'mastered' && toNode.state !== 'locked'
                      const isSelectedPath = selectedSkillId === fromId || selectedSkillId === toId

                      return (
                        <g key={`${fromId}-${toId}-${idx}`}>
                          {/* Outer Glow Path */}
                          <line
                            x1={posFrom.x}
                            y1={posFrom.y}
                            x2={posTo.x}
                            y2={posTo.y}
                            stroke={isMasteredPath ? "url(#beam-active)" : "#334155"}
                            strokeWidth={isSelectedPath ? 3 : isMasteredPath ? 2 : 1}
                            strokeDasharray={isMasteredPath ? "none" : "6 4"}
                            opacity={isMasteredPath ? 0.85 : 0.35}
                          />
                          {/* Pulsing Light Beam Particle */}
                          {isMasteredPath && (
                            <circle r="3" fill="#22d3ee">
                              <animateMotion
                                path={`M ${posFrom.x} ${posFrom.y} L ${posTo.x} ${posTo.y}`}
                                dur={`${2 + (idx % 3)}s`}
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}
                        </g>
                      )
                    })}

                    {/* Interactive Concept Nodes */}
                    {skills.map((skill) => {
                      const pos = nodePositions[skill.id] || skill.position
                      const isSelected = skill.id === selectedSkillId
                      const isHovered = skill.id === hoveredSkillId
                      const isMastered = skill.state === 'mastered'
                      const isStruggling = skill.state === 'struggling'

                      const nodeColor = isMastered
                        ? "#06b6d4"
                        : isStruggling
                          ? "#e11d48"
                          : "#1e293b"

                      const strokeColor = isMastered
                        ? "#22d3ee"
                        : isStruggling
                          ? "#f472b6"
                          : "#475569"

                      const badgeIcon = isMastered ? "⚡" : isStruggling ? "⚠️" : "🔒"

                      return (
                        <g
                          key={skill.id}
                          className="cursor-pointer transition-transform duration-200"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            setDraggedNode(skill.id)
                            setSelectedSkillId(skill.id)
                          }}
                          onMouseEnter={() => setHoveredSkillId(skill.id)}
                          onMouseLeave={() => setHoveredSkillId(null)}
                        >
                          {/* Static Ring for Selected node */}
                          {isSelected && (
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r={28}
                              fill="none"
                              stroke="#22d3ee"
                              strokeWidth="1.5"
                              opacity="0.5"
                            />
                          )}

                          {/* Node Main Circle */}
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={isSelected ? 22 : 18}
                            fill={nodeColor}
                            stroke={strokeColor}
                            strokeWidth={isSelected ? 3 : 2}
                            strokeDasharray={skill.state === 'locked' ? "4 3" : "none"}
                            filter={isMastered ? "url(#glow-cyan)" : isStruggling ? "url(#glow-red)" : "none"}
                          />

                          {/* Node Icon */}
                          <text
                            x={pos.x}
                            y={pos.y + 4}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#ffffff"
                            className="font-mono font-bold pointer-events-none"
                          >
                            {badgeIcon}
                          </text>

                          {/* Node Label Text Below */}
                          <text
                            x={pos.x}
                            y={pos.y + 36}
                            textAnchor="middle"
                            fontSize="10"
                            fill={isSelected ? "#22d3ee" : isMastered ? "#e2e8f0" : "#94a3b8"}
                            className="font-mono font-semibold uppercase tracking-wider pointer-events-none"
                            style={{
                              textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                            }}
                          >
                            {skill.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {/* Graph Legend Overlay */}
                  <div className="absolute bottom-3 left-4 flex items-center gap-4 rounded-xl border border-white/10 bg-black/60 px-4 py-2 backdrop-blur-md">
                    {[
                      { icon: '⚡', color: 'text-cyan-400', label: 'Mastered' },
                      { icon: '⚠️', color: 'text-pink-400', label: 'Struggling' },
                      { icon: '🔒', color: 'text-slate-400', label: 'Locked' },
                    ].map(item => (
                      <span key={item.label} className="flex items-center gap-1.5">
                        <span className="text-xs">{item.icon}</span>
                        <span className={`font-mono text-[9px] uppercase tracking-widest ${item.color}`}>{item.label}</span>
                      </span>
                    ))}
                  </div>

                  {/* Zoom Controls */}
                  <div className="absolute bottom-3 right-4 flex flex-col gap-1.5">
                    <button
                      onClick={() => setViewBox(vb => ({ ...vb, w: Math.max(400, vb.w * 0.85), h: Math.max(240, vb.h * 0.85) }))}
                      className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-black/60 font-mono text-sm font-bold text-white hover:bg-white/20 transition-all"
                    >+</button>
                    <button
                      onClick={() => setViewBox(vb => ({ ...vb, w: Math.min(1600, vb.w * 1.15), h: Math.min(1000, vb.h * 1.15) }))}
                      className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-black/60 font-mono text-sm font-bold text-white hover:bg-white/20 transition-all"
                    >−</button>
                    <button
                      onClick={() => setViewBox({ x: 40, y: 0, w: 940, h: 580 })}
                      className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-black/60 font-mono text-[9px] font-bold text-slate-300 hover:bg-white/20 transition-all"
                      title="Reset View"
                    >↻</button>
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* RIGHT COLUMN: Side HUD (Diagnostic Analytics) + Selected Node Evidence Drawer */}
            <div className="flex flex-col gap-5">
              {/* ── Side HUD: Diagnostic Analytics ──────────────────── */}
              <GlassPanel label="side.hud.diagnostics" accent="emerald">
                <div className="p-5 pt-10">
                  {/* Reactive Kognit Avatar + Mind Map Score Header */}
                  <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                    <div className="relative h-20 w-20 shrink-0 rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-inner">
                      <StudentCharacter
                        expression={charExpression}
                        className="h-full w-full scale-125 translate-y-1"
                      />
                    </div>

                    <div className="flex-1">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
                        Overall Mind-Map Score
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                          {diagnosis.overallMindMapScore}%
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          {diagnosis.overallMindMapScore > 75 ? "Optimal Flow" : "Active Friction"}
                        </span>
                      </div>

                      {/* Mini Mastery Bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-slate-300 transition-all duration-500"
                          style={{ width: `${diagnosis.overallMindMapScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Top Strength & Primary Blindspot */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70 block">
                        ⚡ Top Strength
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground mt-1 block truncate">
                        {diagnosis.topStrength}
                      </span>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70 block">
                        ⚠️ Primary Blindspot
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground mt-1 block truncate">
                        {diagnosis.primaryBlindspot}
                      </span>
                    </div>
                  </div>

                  {/* Launch Practice Sandbox Button */}
                  <div className="mt-4">
                    <Link
                      href="/arena"
                      className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground hover:bg-white/10 hover:border-white/30 transition-all"
                    >
                      <span>⚡ LAUNCH PRACTICE SANDBOX</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                  </div>
                </div>
              </GlassPanel>

              {/* ── Selected Node Evidence Drawer ───────────────────── */}
              <GlassPanel label="selected.node.evidence.drawer" accent={selectedSkill.state === 'struggling' ? 'pink' : 'emerald'}>
                <div className="p-5 pt-10">
                  {/* Concept Header + Ease Factor En Calculation */}
                  <div className="flex items-start justify-between border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
                          {selectedSkill.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase font-bold border ${
                          selectedSkill.state === 'mastered'
                            ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                            : selectedSkill.state === 'struggling'
                              ? 'border-pink-400/40 bg-pink-400/10 text-pink-300'
                              : 'border-slate-400/30 bg-slate-400/10 text-slate-400'
                        }`}>
                          {selectedSkill.state}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-1 block">
                        Category: {selectedSkill.category}
                      </span>
                    </div>

                    {/* Mathematical Ease Factor En */}
                    <div className="text-right shrink-0">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 block">
                        Ease Factor (E_n)
                      </span>
                      <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                        {calculateEaseFactor(selectedSkill.mastery, selectedSkill.confusionScore)}
                      </span>
                    </div>
                  </div>

                  {/* Before / After Code Diff Proof */}
                  <div className="mt-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 block mb-2 font-semibold">
                      Before / After Code Diff Proof
                    </span>
                    {selectedSkill.codeDiffs.length > 0 ? (
                      <div className="rounded-xl border border-white/10 bg-black/80 overflow-hidden font-mono text-[11px] leading-relaxed">
                        <div className="border-b border-red-500/20 bg-red-500/5 px-3 py-2 text-red-300">
                          <span className="text-red-400 select-none mr-2">-</span>
                          <span>{selectedSkill.codeDiffs[0].before}</span>
                        </div>
                        <div className="bg-emerald-500/5 px-3 py-2 text-emerald-300">
                          <span className="text-emerald-400 select-none mr-2">+</span>
                          <span>{selectedSkill.codeDiffs[0].after}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/5 bg-black/40 p-3 font-mono text-[10px] text-muted-foreground/50 italic">
                        No code diffs recorded yet. Solve questions in the Sandbox to capture diff proofs.
                      </div>
                    )}
                  </div>

                  {/* Socratic Audio Transcript Highlight */}
                  <div className="mt-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1 font-semibold flex items-center gap-1">
                      <span>🔊 Socratic Audio Transcript Highlight</span>
                    </span>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 font-mono text-[11px] text-foreground/80 leading-relaxed italic">
                      "{selectedSkill.voiceReflections[0] || 'Type coercion and boundary guards were pinpointed by the AI Tutor during execution.'}"
                    </div>
                  </div>

                  {/* Practice Skill Action CTA */}
                  <div className="mt-5">
                    <Link
                      href="/arena"
                      className="block text-center rounded-lg border border-white/10 bg-white/5 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      [ PRACTICE {selectedSkill.label.toUpperCase()} IN ARENA ]
                    </Link>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        )}

        {/* ── Layout View Option 2: Full Telemetry Analytics Table View ────── */}
        {viewMode === 'analytics' && (
          <div className="flex flex-col gap-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Total XP', value: (summary?.mastery_records?.reduce((s, r) => s + r.xp, 0) || 0).toString(), color: 'text-amber-300', icon: '⚡' },
                { label: 'Bugs Fixed', value: (summary?.mastery_records?.reduce((s, r) => s + r.resolved_count, 0) || 0).toString(), color: 'text-emerald-300', icon: '✓' },
                { label: 'Errors Caught', value: (summary?.mastery_records?.reduce((s, r) => s + r.confusion_count, 0) || 0).toString(), color: 'text-pink-300', icon: '⚠️' },
                { label: 'Avg Mastery', value: `${diagnosis.overallMindMapScore}%`, color: 'text-cyan-300', icon: '◆' },
              ].map(s => (
                <GlassPanel key={s.label} className="px-4 py-3">
                  <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">{s.icon} {s.label}</span>
                  <span className={`block font-mono text-2xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</span>
                </GlassPanel>
              ))}
            </div>

            {/* Concept Cards Table */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map(s => {
                const easeFactor = calculateEaseFactor(s.mastery, s.confusionScore)
                return (
                  <GlassPanel
                    key={s.id}
                    onClick={() => { setSelectedSkillId(s.id); setViewMode('constellation') }}
                    className={`p-4 cursor-pointer transition-all hover:border-emerald-400/50 ${
                      selectedSkillId === s.id ? 'border-emerald-400/60 bg-emerald-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">{s.label}</span>
                      <span className="font-mono text-[10px] text-emerald-300 font-bold">E_n: {easeFactor}</span>
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground/50 block mt-0.5">{s.category}</span>
                    <div className="mt-3 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-muted-foreground">Mastery: {s.mastery}%</span>
                      <span className="text-muted-foreground">Practiced: {s.lastPracticed}</span>
                    </div>
                  </GlassPanel>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Category Breakdown Summary Section ──────────────────────── */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-white/10 pt-6">
          {categoryStats.map(([cat, data]) => (
            <GlassPanel key={cat} className="px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-foreground/80 block">
                {cat}
              </span>
              <div className="mt-2 flex items-end justify-between">
                <span className="font-mono text-xl font-bold text-foreground tabular-nums">{data.total} <span className="text-[9px] text-muted-foreground/50 font-normal">skills</span></span>
                <div className="flex gap-1.5">
                  {data.mastered > 0 && <span className="rounded bg-cyan-400/10 border border-cyan-400/30 px-1.5 py-0.5 font-mono text-[9px] text-cyan-300">⚡ {data.mastered}</span>}
                  {data.struggling > 0 && <span className="rounded bg-pink-400/10 border border-pink-400/30 px-1.5 py-0.5 font-mono text-[9px] text-pink-300">⚠️ {data.struggling}</span>}
                  {data.locked > 0 && <span className="rounded bg-slate-400/10 border border-slate-400/30 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">🔒 {data.locked}</span>}
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </main>
  )
}
