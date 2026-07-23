"use client"

import { motion, AnimatePresence } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Editor from "@monaco-editor/react"
import { GlassPanel } from "@/components/glass-panel"
import { StudentCharacter, type Expression } from "@/components/student-character"
import { DashboardThemeBox } from "@/components/dashboard-theme-box"

/* ------------------------------------------------------------------ */
/*  Types & Interfaces                                                 */
/* ------------------------------------------------------------------ */

interface CodeFile {
  id: string;
  filename: string;
  language: string;
  content: string;
}

type LogType = 'info' | 'success' | 'error' | 'hint' | 'warn';

interface LogEntry {
  type: LogType;
  text: string;
}

/* ------------------------------------------------------------------ */
/*  Constants & Config                                                 */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const RUNNABLE_LANGUAGES = new Set([
  "javascript", "javascript (react)",
  "typescript", "typescript (react)",
  "python", "java", "c", "c++", "c#",
  "go", "rust", "ruby", "php", "lua",
  "perl", "r", "bash", "shell",
  "haskell", "scala", "swift",
])

function toMonacoLanguage(lang: string | null): string {
  if (!lang) return "plaintext"
  const lower = lang.toLowerCase()
  const map: Record<string, string> = {
    "javascript": "javascript",
    "javascript (react)": "javascript",
    "typescript": "typescript",
    "typescript (react)": "typescript",
    "python": "python",
    "java": "java",
    "c": "c",
    "c++": "cpp",
    "c#": "csharp",
    "go": "go",
    "rust": "rust",
    "ruby": "ruby",
    "php": "php",
    "swift": "swift",
    "kotlin": "kotlin",
    "lua": "lua",
    "perl": "perl",
    "r": "r",
    "bash": "shell",
    "shell": "shell",
    "dart": "dart",
    "scala": "scala",
    "haskell": "haskell",
    "sql": "sql",
  }
  return map[lower] || "plaintext"
}

/* ------------------------------------------------------------------ */
/*  IDE File Icon component                                            */
/* ------------------------------------------------------------------ */

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, { label: string; color: string }> = {
    js:   { label: 'JS', color: '#f7df1e' },
    ts:   { label: 'TS', color: '#3178c6' },
    tsx:  { label: 'TX', color: '#61dafb' },
    jsx:  { label: 'JX', color: '#61dafb' },
    py:   { label: 'PY', color: '#3572a5' },
    java: { label: 'JV', color: '#b07219' },
    c:    { label: 'C',  color: '#555555' },
    cpp:  { label: 'C+', color: '#f34b7d' },
    cs:   { label: 'C#', color: '#178600' },
    go:   { label: 'GO', color: '#00add8' },
    rs:   { label: 'RS', color: '#dea584' },
    rb:   { label: 'RB', color: '#701516' },
    php:  { label: 'PH', color: '#4f5d95' },
    lua:  { label: 'LU', color: '#000080' },
    sh:   { label: 'SH', color: '#89e051' },
    sql:  { label: 'SQ', color: '#e38c00' },
    json: { label: '{}', color: '#fbc02d' },
    html: { label: '<>', color: '#e34c26' },
    css:  { label: 'CS', color: '#563d7c' },
  }
  const { label, color } = map[ext] ?? { label: 'FILE', color: '#34d399' }
  return (
    <span
      className="inline-flex items-center justify-center font-mono text-[9px] font-extrabold shrink-0 px-1 py-0.5 rounded"
      style={{
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}30`,
        minWidth: '20px',
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Filename Modal Component                                           */
/* ------------------------------------------------------------------ */

function FilenameModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (filename: string) => void;
}) {
  const [filename, setFilename] = useState("")

  useEffect(() => {
    if (isOpen) setFilename("")
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[320px] rounded-lg border border-primary/20 bg-neutral-950 p-4 shadow-[0_0_20px_rgba(52,211,153,0.1)]">
        <h3 className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">Enter Filename</h3>
        <input
          autoFocus
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="e.g. script.py"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filename.trim()) {
              onSubmit(filename.trim());
              onClose();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          className="w-full rounded bg-black/50 px-3 py-2 font-mono text-sm text-foreground outline-none border border-white/10 focus:border-primary/50"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="rounded px-3 py-1.5 font-mono text-xs text-muted-foreground hover:bg-white/5"
          >
            CANCEL
          </button>
          <button 
            onClick={() => {
              if (filename.trim()) {
                onSubmit(filename.trim())
                onClose()
              }
            }}
            className="rounded bg-primary/20 px-3 py-1.5 font-mono text-xs text-primary hover:bg-primary/30"
          >
            CREATE
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Character reaction hook                                            */
/* ------------------------------------------------------------------ */

type CharacterState = 'idle' | 'nod' | 'think' | 'gesture'

function useCharacterReaction() {
  const [state, setState] = useState<CharacterState>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback((s: CharacterState) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setState(s)
    timeoutRef.current = setTimeout(() => setState('idle'), 2200)
  }, [])

  const expression: Expression =
    state === 'nod' ? 'happy' : state === 'think' ? 'focus' : state === 'gesture' ? 'happy' : 'focus'

  return { state, expression, trigger }
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { state: charState, expression, trigger } = useCharacterReaction()
  
  // File state
  const [files, setFiles] = useState<CodeFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isFilenameModalOpen, setIsFilenameModalOpen] = useState(false)
  
  // Editor / Run state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isRunning, setIsRunning] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [consoleLines, setConsoleLines] = useState<LogEntry[]>([
    { type: 'info', text: '[KOGNIT] Session initialized — environment loaded' },
    { type: 'info', text: '[KOGNIT] Connecting to Socratic reasoning core...' }
  ])
  const consoleRef = useRef<HTMLDivElement>(null)

  // Auto-scroll console
  useEffect(() => {
    consoleRef.current?.scrollTo({
      top: consoleRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [consoleLines])

  const addLog = useCallback((type: LogType, text: string) => {
    setConsoleLines(prev => [...prev, { type, text }])
  }, [])

  // Track which file IDs have had their content loaded
  const contentLoadedRef = useRef<Set<string>>(new Set())

  // 1. Fetch file list on load
  useEffect(() => {
    fetch(`${API_BASE}/files`)
      .then(res => res.json())
      .then(data => {
        setFiles(data)
        if (data.length > 0) setActiveFileId(data[0].id)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Failed to load files:', err)
        setIsLoading(false)
        addLog('error', '[KOGNIT] Failed to load files from backend.')
      })
  }, [addLog])

  // 1b. Lazy fetch full content when active file changes
  useEffect(() => {
    if (!activeFileId) return
    if (contentLoadedRef.current.has(activeFileId)) return

    fetch(`${API_BASE}/files/${activeFileId}`)
      .then(res => res.json())
      .then(data => {
        contentLoadedRef.current.add(activeFileId)
        setFiles(prev =>
          prev.map(f => f.id === activeFileId ? { ...f, content: data.content ?? '' } : f)
        )
      })
      .catch(err => {
        console.error('Failed to load file content:', err)
      })
  }, [activeFileId])

  // Monaco custom theme
  const handleEditorBeforeMount = useCallback((monacoInstance: typeof import('monaco-editor')) => {
    monacoInstance.editor.defineTheme('kognit-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'e5e5e5' },
        { token: 'comment', foreground: '556b2f', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'f472b6' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: '7dd3fc' },
        { token: 'type', foreground: 'c084fc' },
      ],
      colors: {
        'editor.background': '#0d0d0d',
        'editor.foreground': '#e5e5e5',
        'editor.lineHighlightBackground': '#ffffff0a',
        'editorLineNumber.foreground': '#525252',
        'editorIndentGuide.background': '#262626',
        'editorCursor.foreground': '#34d399',
        'editor.selectionBackground': '#34d39930',
      }
    })
  }, [])

  const activeFile = files.find(f => f.id === activeFileId)

  // 2. Editor Change Handler with Debounced Save
  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || !activeFile) return;
    
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: value } : f));
    setSaveStatus('unsaved');
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await fetch(`${API_BASE}/files/${activeFileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: value })
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Save failed:', err);
        setSaveStatus('unsaved');
      }
    }, 1000);
  };

  // 3. Delete File Handler
  const handleDeleteFile = useCallback(async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`${API_BASE}/files/${fileId}`, { method: 'DELETE' })
      contentLoadedRef.current.delete(fileId)
      setFiles(prev => {
        const remaining = prev.filter(f => f.id !== fileId)
        if (activeFileId === fileId) {
          setActiveFileId(remaining.length > 0 ? remaining[0].id : '')
        }
        return remaining
      })
      addLog('warn', '[KOGNIT] File deleted')
    } catch (err) {
      console.error('Delete failed:', err)
      addLog('error', '[KOGNIT] Failed to delete file')
    }
  }, [activeFileId, addLog])

  // 4. Create File Handler
  const handleCreateFile = async (newFilename: string) => {
    try {
      const res = await fetch(`${API_BASE}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: newFilename,
          folder_path: "/"
        })
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      const newFile = await res.json();
      contentLoadedRef.current.add(newFile.id)
      setFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
    } catch (err) {
      console.error('Create failed:', err);
      addLog('error', `[KOGNIT] Failed to create file: ${newFilename}`);
    }
  };

  // 5. Run Code Handler
  const handleRunCode = async () => {
    if (!activeFile || !canRun) return
    setIsRunning(true)
    trigger('think')
    addLog('info', `[RUN] Executing ${activeFile.filename}...`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch(`${API_BASE}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: activeFile.language,
          content: activeFile.content
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || `Server returned ${res.status}`)
      }

      const { run, compile } = data
      let producedOutput = false

      if (compile?.stderr) {
        addLog('warn', `[COMPILE] ${compile.stderr}`)
        producedOutput = true
      }

      if (run?.stdout) {
        const lines = run.stdout.split('\n').filter(Boolean)
        lines.forEach((line: string) => addLog('info', `> ${line}`))
        trigger('nod')
        producedOutput = true
      }

      if (run?.stderr) {
        const lines = run.stderr.split('\n').filter(Boolean)
        lines.forEach((line: string) => addLog('error', `! ${line}`))
        trigger('gesture')
        producedOutput = true
      }

      if (run?.code !== 0 && run?.code !== undefined) {
        addLog('error', `[RUN] ✗ Process exited with code ${run.code}`)
        trigger('gesture')
      } else if (!producedOutput) {
        addLog('success', '[RUN] ✓ Program executed successfully but produced no output')
        trigger('nod')
      } else {
        addLog('success', '[RUN] ✓ Execution completed')
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        addLog('error', `[RUN] ✗ Execution timed out (took >15s)`)
      } else {
        addLog('error', `[RUN] ✗ Execution failed: ${err.message || err}`)
      }
      trigger('gesture')
    } finally {
      setIsRunning(false)
    }
  }

  const canRun = activeFile ? RUNNABLE_LANGUAGES.has(activeFile.language.toLowerCase()) : false
  const contentReady = activeFileId ? contentLoadedRef.current.has(activeFileId) : false

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6">
      {/* Filename Modal */}
      <FilenameModal
        isOpen={isFilenameModalOpen}
        onClose={() => setIsFilenameModalOpen(false)}
        onSubmit={handleCreateFile}
      />

      {/* Top navigation bar */}
      <nav className="mx-auto mb-6 flex max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-primary/90 transition-colors hover:text-primary"
          >
            KOGNIT
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 p-1.5 backdrop-blur-md shadow-md">
            {[
              { href: '/dashboard', label: 'Terminal', active: true },
              { href: '/skills', label: 'Skills' },
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
          </div>
        </div>

        {/* Soft Auth Buttons & Theme Box */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="liquid-glass-pill flex items-center gap-2 px-4 py-2 font-sans text-xs font-medium tracking-wide text-white outline-none"
          >
            <span className="h-2 w-2 rounded-full bg-slate-300/80 transition-all group-hover:bg-emerald-400 group-hover:shadow-[0_0_8px_#34d399]" />
            <span>Sign In</span>
          </Link>
          
          <Link
            href="/signup"
            className="liquid-glass-pill flex items-center gap-2 px-4 py-2 font-sans text-xs font-medium tracking-wide text-white outline-none"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 transition-transform group-hover:animate-pulse" />
            <span>Initialize Account</span>
          </Link>

          <DashboardThemeBox />
        </div>
      </nav>

      {/* Main grid: explorer + editor + character */}
      <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-[260px_1fr_320px]">
        
        {/* ---- LEFT: IDE-Style File Explorer & Telemetry ---- */}
        <div className="flex flex-col gap-4">
          
          <GlassPanel label="explorer" className="flex-1 min-h-[400px]">
            <div className="pt-8 pb-4 px-3 flex flex-col gap-3">
              {/* Explorer Header */}
              <div className="flex items-center justify-between px-1 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">KOGNIT_WORKSPACE</span>
                </div>
                <button 
                  onClick={() => setIsFilenameModalOpen(true)}
                  className="flex items-center gap-1 font-mono text-[10px] uppercase text-emerald-400/90 hover:text-emerald-300 transition-colors font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"
                  title="Create new file"
                >
                  <span>+</span> New
                </button>
              </div>

              {/* Tree View Item List */}
              <div className="flex flex-col gap-1">
                {isLoading ? (
                  <span className="font-mono text-[11px] text-muted-foreground/40 animate-pulse px-2">
                    Loading workspace files...
                  </span>
                ) : files.length === 0 ? (
                  <span className="font-mono text-[11px] text-muted-foreground/30 px-2">
                    No files found — click + New to create
                  </span>
                ) : (
                  files.map(file => (
                    <div
                      key={file.id}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all font-mono text-[11px] cursor-pointer ${
                        activeFileId === file.id
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.15)] font-semibold'
                          : 'text-slate-300/70 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                      }`}
                      onClick={() => setActiveFileId(file.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileIcon filename={file.filename} />
                        <span className="truncate">{file.filename}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {activeFileId === file.id && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] shrink-0" />
                        )}
                        <button
                          onClick={(e) => handleDeleteFile(file.id, e)}
                          title={`Delete ${file.filename}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/20 rounded px-1.5 py-0.5 font-mono text-[10px] leading-none shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </GlassPanel>

          {/* Telemetry bar */}
          <GlassPanel label="telemetry.live" className="px-5 py-4">
            <div className="flex flex-col gap-3 pt-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">Files</span>
                <span className="font-mono text-xs tabular-nums text-foreground">{files.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">Errors</span>
                <span className="font-mono text-xs tabular-nums text-foreground">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">Warnings</span>
                <span className="font-mono text-xs tabular-nums text-foreground">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">Session</span>
                <span className="font-mono text-xs tabular-nums text-foreground">00:14:32</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <motion.span
                  className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="font-mono text-[10px] text-emerald-400/70 tracking-widest">
                  RE retention: 94%
                </span>
              </div>
            </div>
          </GlassPanel>

        </div>

        {/* ---- MIDDLE: Code Editor + Console ---- */}
        <div className="flex flex-col gap-4">
          
          {/* Code editor */}
          <div className="relative rounded-2xl border border-emerald-400/10 bg-neutral-950/40 backdrop-blur-3xl hover:border-emerald-400/20 transition-colors duration-300" style={{ minHeight: '520px' }}>
            <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(60% 40% at 20% 30%, oklch(0.78 0.09 165 / 4%), transparent 70%)' }} aria-hidden="true" />
            
            {/* Header label */}
            <div className="absolute left-4 top-3 z-10 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/50">editor — {activeFile?.filename || 'none'}</span>
            </div>

            {/* Run button + Save status */}
            <div className="absolute right-4 top-3 z-20 flex items-center gap-3">
              {canRun && (
                <button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all ${
                    isRunning
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-400/70 cursor-wait'
                      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 hover:shadow-[0_0_12px_#34d39930]'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <motion.span
                        className="h-1.5 w-1.5 rounded-full bg-amber-400"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                      Running...
                    </>
                  ) : (
                    <>
                      <span className="text-[12px]">▶</span>
                      Run
                    </>
                  )}
                </button>
              )}

              {saveStatus === 'saving' && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400/70 animate-pulse">saving...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400/70">✓ saved</span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-pink-400/50">● unsaved</span>
              )}
            </div>

            {/* Editor Area */}
            <div style={{ height: '460px' }} className="pt-10 pb-2 px-4">
              {activeFile && contentReady ? (
                <Editor
                  key={activeFileId}
                  height="440px"
                  language={toMonacoLanguage(activeFile.language)}
                  theme="kognit-dark"
                  defaultValue={activeFile.content || ""}
                  beforeMount={handleEditorBeforeMount}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    lineHeight: 1.6,
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    formatOnPaste: true,
                    overviewRulerBorder: false,
                    renderLineHighlight: "all",
                    readOnly: false,
                  }}
                  loading={
                    <div className="flex items-center justify-center font-mono text-xs text-muted-foreground" style={{ height: '440px' }}>
                      Initializing Monaco core...
                    </div>
                  }
                />
              ) : (
                <div className="flex items-center justify-center font-mono text-xs text-muted-foreground/40" style={{ height: '440px' }}>
                  {!activeFile
                    ? (isLoading ? 'Loading...' : 'Create a file to start coding')
                    : (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
                        Loading file content...
                      </span>
                    )
                  }
                </div>
              )}
            </div>
          </div>

          {/* Console logger */}
          <div className="relative rounded-2xl border border-pink-400/10 bg-neutral-950/40 backdrop-blur-3xl hover:border-pink-400/20 transition-colors duration-300 shrink-0" style={{ height: '220px' }}>
            <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(60% 40% at 80% 30%, oklch(0.78 0.07 350 / 5%), transparent 70%)' }} aria-hidden="true" />
            <div className="absolute left-4 top-3 z-10 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400/60" />
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/50">console.output</span>
            </div>
            
            <div
              ref={consoleRef}
              className="no-scrollbar absolute inset-0 overflow-y-auto px-5"
              style={{ paddingTop: '36px', paddingBottom: '12px' }}
            >
              {consoleLines.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 py-1.5"
                >
                  <span
                    className={`mt-[3px] h-2 w-2 shrink-0 rounded-full ${getLogDotColor(entry.type)}`}
                  />
                  <span
                    className={`font-mono text-[13px] leading-relaxed ${getLogTextColor(entry.type)}`}
                  >
                    {entry.text}
                  </span>
                </motion.div>
              ))}
              {consoleLines.length === 0 && (
                <span className="font-mono text-[12px] text-slate-500">
                  Awaiting output...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ---- RIGHT: Character sidekick panel ---- */}
        <div className="flex flex-col gap-4">
          <GlassPanel label="socratic.copilot" className="flex flex-col">
            <div className="relative flex h-[360px] items-center justify-center pt-6">
              <AnimatePresence>
                {charState === 'nod' && (
                  <motion.div
                    key="aura-nod"
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background:
                        'radial-gradient(circle at 50% 50%, oklch(0.78 0.09 165 / 18%), transparent 65%)',
                    }}
                  />
                )}
                {charState === 'think' && (
                  <motion.div
                    key="aura-think"
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background:
                        'radial-gradient(circle at 50% 50%, oklch(0.78 0.07 350 / 14%), transparent 65%)',
                    }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                className="relative h-[290px] w-[230px]"
                animate={
                  charState === 'nod'
                    ? { y: [0, -6, 3, -2, 0] }
                    : charState === 'think'
                      ? { rotate: [0, -2, 0, 2, 0] }
                      : charState === 'gesture'
                        ? { x: [0, 6, 0] }
                        : {}
                }
                transition={
                  charState === 'nod'
                    ? { duration: 0.6, ease: 'easeOut' }
                    : charState === 'think'
                      ? { duration: 1.2, repeat: 2 }
                      : charState === 'gesture'
                        ? { duration: 0.8, repeat: 1 }
                        : {}
                }
              >
                <StudentCharacter
                  expression={expression}
                  className="h-full w-full"
                />
              </motion.div>
            </div>

            <div className="border-t border-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.span
                    className={`h-2 w-2 rounded-full ${
                      charState === 'idle'
                        ? 'bg-primary/40'
                        : charState === 'nod'
                          ? 'bg-emerald-400'
                          : charState === 'think'
                            ? 'bg-pink-400'
                            : 'bg-amber-400'
                    }`}
                    animate={{ scale: charState !== 'idle' ? [1, 1.4, 1] : 1 }}
                    transition={{ duration: 0.6, repeat: charState !== 'idle' ? 3 : 0 }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {charState === 'idle' && 'observing'}
                    {charState === 'nod' && 'milestone cleared ✓'}
                    {charState === 'think' && 'analyzing issue...'}
                    {charState === 'gesture' && 'delivering hint →'}
                  </span>
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* Quick nav links */}
          <GlassPanel className="px-5 py-4 flex-1 flex flex-col justify-end">
            <div className="flex flex-col gap-3">
              <Link
                href="/skills"
                className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60 transition-colors hover:text-primary"
              >
                <span className="h-3 w-3 rounded-sm border border-emerald-400/30 bg-emerald-400/10" />
                Knowledge Map
              </Link>
              <Link
                href="/arena"
                className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60 transition-colors hover:text-accent"
              >
                <span className="h-3 w-3 rounded-sm border border-pink-400/30 bg-pink-400/10" />
                Interview Arena
              </Link>
            </div>
          </GlassPanel>
        </div>
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/*  Log formatting helpers                                             */
/* ------------------------------------------------------------------ */

function getLogDotColor(type: string) {
  switch (type) {
    case 'success': return 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
    case 'error': return 'bg-pink-400 shadow-[0_0_6px_#f472b6]'
    case 'warn': return 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
    case 'hint': return 'bg-sky-400 shadow-[0_0_6px_#38bdf8]'
    default: return 'bg-slate-500'
  }
}

function getLogTextColor(type: string) {
  switch (type) {
    case 'success': return 'text-emerald-300'
    case 'error': return 'text-pink-300'
    case 'warn': return 'text-amber-300'
    case 'hint': return 'text-sky-300'
    default: return 'text-slate-300'
  }
}
