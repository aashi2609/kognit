"use client"

import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { GlassPanel } from "@/components/glass-panel"
import { useAuth, useClerk } from "@clerk/nextjs"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ── Types ─────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────

const CONCEPT_LABELS: Record<string, string> = {
  'semicolons': 'Semicolons',
  'indentation': 'Indentation',
  'control-flow-syntax': 'Control Flow Syntax',
  'parentheses': 'Parentheses',
  'braces': 'Curly Braces',
  'brackets': 'Square Brackets',
  'return-statements': 'Return Statements',
  'null-handling': 'Null Handling',
  'imports': 'Imports & Modules',
  'strings': 'Strings',
  'types': 'Type Handling',
  'loops': 'Loops',
  'functions': 'Functions',
  'variables': 'Variables',
  'arrays': 'Arrays',
  'recursion': 'Recursion',
  'oop': 'Object-Oriented',
  'hash-maps': 'Hash Maps',
  'linked-lists': 'Linked Lists',
  'sorting': 'Sorting',
  'trees': 'Trees',
  'general': 'General Syntax',
}

function label(tag: string) {
  return CONCEPT_LABELS[tag] || tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function mastery_color(level: number) {
  if (level > 0.75) return { bar: '#22d3ee', text: 'text-cyan-300', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' }
  if (level > 0.4)  return { bar: '#f59e0b', text: 'text-amber-300', border: 'border-amber-500/30', bg: 'bg-amber-500/10' }
  return { bar: '#f472b6', text: 'text-pink-300', border: 'border-pink-500/30', bg: 'bg-pink-500/10' }
}

function time_ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Page ──────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const { getToken } = useAuth()
  const { signOut } = useClerk()

  const fetchWithAuth = useCallback(async (url: string) => {
    const token = await getToken()
    const headers = new Headers()
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return fetch(url, { headers })
  }, [getToken])

  const [summary, setSummary] = useState<UserSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'struggling' | 'mastered'>('all')

  const load = useCallback(() => {
    fetchWithAuth(`${API_BASE}/skills/summary`)
      .then(r => r.json())
      .then(d => { setSummary(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [fetchWithAuth])

  useEffect(() => { load() }, [load])

  const records = summary?.mastery_records ?? []
  const sorted = [...records].sort((a, b) => new Date(b.last_practiced_at).getTime() - new Date(a.last_practiced_at).getTime())

  const filtered = sorted.filter(r => {
    if (filter === 'struggling') return r.mastery_level <= 0.4
    if (filter === 'mastered') return r.mastery_level > 0.75
    return true
  })

  const totalXP = records.reduce((s, r) => s + r.xp, 0)
  const totalFixed = records.reduce((s, r) => s + r.resolved_count, 0)
  const totalErrors = records.reduce((s, r) => s + r.confusion_count, 0)
  const avgMastery = records.length ? Math.round(records.reduce((s, r) => s + r.mastery_level, 0) / records.length * 100) : 0

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6">
      {/* Nav */}
      <nav className="mx-auto mb-6 flex max-w-5xl items-center gap-8">
        <Link href="/" className="font-mono text-sm uppercase tracking-[0.3em] text-primary/80 hover:text-primary">KOGNIT</Link>
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 p-1.5 backdrop-blur-md">
          {[{ href: '/dashboard', label: 'Terminal' }, { href: '/skills', label: 'Skills', active: true }, { href: '/arena', label: 'Arena' }].map(link => (
            <Link key={link.href} href={link.href} className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-all ${link.active ? 'border border-emerald-400/70 bg-emerald-500/25 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)]' : 'border border-transparent text-slate-200 hover:border-white/20 hover:bg-white/10'}`}>
              <span className={`h-2 w-2 rounded-full ${link.active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-400/50'}`} />
              {link.label}
            </Link>
          ))}
          <button onClick={() => signOut({ redirectUrl: '/' })} className="flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] border border-transparent text-red-400/80 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300 ml-2">
            <span className="h-2 w-2 rounded-full bg-red-400/50" />Logout
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="font-mono text-lg uppercase tracking-[0.3em] text-foreground">[ SKILL_PROGRESS ]</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50">
            Real data from your coding sessions — every error caught, every bug fixed
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="font-mono text-sm text-muted-foreground/50 animate-pulse">Loading your session data...</span>
          </div>
        )}

        {!loading && records.length === 0 && (
          <GlassPanel className="p-10 text-center">
            <p className="font-mono text-2xl mb-3">🎓</p>
            <p className="font-mono text-sm text-foreground/70 mb-2">No session data yet.</p>
            <p className="font-mono text-[11px] text-muted-foreground/50 mb-5">
              Go to the Dashboard, open a file, write some code — the AI tutor will track your errors and progress automatically.
            </p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/25 transition-all">
              ▶ Start Coding
            </Link>
          </GlassPanel>
        )}

        {!loading && records.length > 0 && (
          <>
            {/* Stats row */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Total XP', value: totalXP.toString(), color: 'text-amber-300', icon: '⚡' },
                { label: 'Bugs Fixed', value: totalFixed.toString(), color: 'text-emerald-300', icon: '✓' },
                { label: 'Errors Caught', value: totalErrors.toString(), color: 'text-pink-300', icon: '⚠' },
                { label: 'Avg Mastery', value: `${avgMastery}%`, color: 'text-cyan-300', icon: '◆' },
              ].map(s => (
                <GlassPanel key={s.label} className="px-4 py-3">
                  <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">{s.icon} {s.label}</span>
                  <span className={`block font-mono text-2xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</span>
                </GlassPanel>
              ))}
            </div>

            {/* Workspace context */}
            {summary && (
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">Your workspace</span>
                <span className="font-mono text-[10px] text-foreground/60">{summary.file_count} file{summary.file_count !== 1 ? 's' : ''}</span>
                {Object.entries(summary.languages_used).slice(0, 5).map(([lang, count]) => (
                  <span key={lang} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[9px] text-muted-foreground/60">
                    {lang} <span className="text-emerald-400/70">×{count}</span>
                  </span>
                ))}
                {summary.primary_language && (
                  <span className="ml-auto font-mono text-[9px] text-emerald-400/50">primary: {summary.primary_language}</span>
                )}
              </div>
            )}

            {/* Filter tabs */}
            <div className="mb-4 flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40 mr-2">Filter:</span>
              {(['all', 'struggling', 'mastered'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1 font-mono text-[10px] uppercase tracking-widest border transition-all ${filter === f
                  ? f === 'struggling' ? 'border-pink-400/50 bg-pink-500/15 text-pink-300'
                  : f === 'mastered' ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                  : 'border-white/20 bg-white/10 text-white'
                  : 'border-white/5 text-muted-foreground/50 hover:border-white/15 hover:text-white'}`}>
                  {f === 'all' ? `All (${records.length})` : f === 'struggling' ? `⚠ Struggling (${records.filter(r => r.mastery_level <= 0.4).length})` : `⚡ Mastered (${records.filter(r => r.mastery_level > 0.75).length})`}
                </button>
              ))}
              <button onClick={load} className="ml-auto font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40 hover:text-white border border-white/5 rounded-lg px-3 py-1 hover:border-white/15 transition-all">↻ Refresh</button>
            </div>

            {/* Concept cards */}
            {filtered.length === 0 ? (
              <p className="font-mono text-[11px] text-muted-foreground/40 text-center py-10">No concepts match this filter yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(r => {
                  const c = mastery_color(r.mastery_level)
                  const pct = Math.round(r.mastery_level * 100)
                  const total = r.confusion_count + r.resolved_count
                  const fixRate = total > 0 ? Math.round((r.resolved_count / total) * 100) : 0
                  return (
                    <motion.div
                      key={r.concept_tag}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border ${c.border} ${c.bg} px-4 py-4 flex flex-col gap-3`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${c.text}`}>
                          {label(r.concept_tag)}
                        </span>
                        <span className={`font-mono text-lg font-bold tabular-nums shrink-0 ${c.text}`}>{pct}%</span>
                      </div>

                      {/* Mastery bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          style={{ background: c.bar }}
                        />
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="block font-mono text-[8px] uppercase tracking-widest text-muted-foreground/40">Errors</span>
                          <span className="block font-mono text-sm text-pink-300/80 font-bold">{r.confusion_count}</span>
                        </div>
                        <div>
                          <span className="block font-mono text-[8px] uppercase tracking-widest text-muted-foreground/40">Fixed</span>
                          <span className="block font-mono text-sm text-emerald-300/80 font-bold">{r.resolved_count}</span>
                        </div>
                        <div>
                          <span className="block font-mono text-[8px] uppercase tracking-widest text-muted-foreground/40">XP</span>
                          <span className="block font-mono text-sm text-amber-300/80 font-bold">{r.xp}</span>
                        </div>
                      </div>

                      {/* Fix rate bar */}
                      {total > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/30 shrink-0">Fix rate</span>
                          <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-emerald-400/50" style={{ width: `${fixRate}%` }} />
                          </div>
                          <span className="font-mono text-[9px] text-muted-foreground/40 shrink-0">{fixRate}%</span>
                        </div>
                      )}

                      {/* Last practiced */}
                      <span className="font-mono text-[8px] text-muted-foreground/30 uppercase tracking-widest">
                        Last session: {time_ago(r.last_practiced_at)}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* CTA if struggling concepts exist */}
            {records.some(r => r.mastery_level <= 0.4) && (
              <div className="mt-6 rounded-xl border border-pink-500/20 bg-pink-500/5 px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] text-pink-300/80 font-semibold">You have concepts you&apos;re still struggling with.</p>
                  <p className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">Open the dashboard and keep coding — the AI tutor will help you work through them.</p>
                </div>
                <Link href="/dashboard" className="shrink-0 rounded-xl border border-pink-400/40 bg-pink-500/15 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-pink-300 hover:bg-pink-500/25 transition-all">
                  Practice Now
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
