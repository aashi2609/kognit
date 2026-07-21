"use client"

import { motion, AnimatePresence } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Editor, { useMonaco } from "@monaco-editor/react"
import { GlassPanel } from "@/components/glass-panel"
import { StudentCharacter, type Expression } from "@/components/student-character"
import { DashboardThemeBox } from "@/components/dashboard-theme-box"

/* ------------------------------------------------------------------ */
/*  Mock data — initial files, console log stream, Socratic hints     */
/* ------------------------------------------------------------------ */

interface CodeFile {
  id: string;
  filename: string;
  language: string;
  content: string;
}

const INITIAL_FILES: CodeFile[] = [
  { 
    id: '1', 
    filename: 'mergeSort.js', 
    language: 'javascript', 
    content: 'function mergeSort(arr) {\n  if (arr.length <= 1) return arr;\n  const mid = Math.floor(arr.length / 2);\n  const left = mergeSort(arr.slice(0, mid));\n  const right = mergeSort(arr.slice(mid));\n  return merge(left, right);\n}\n\nfunction merge(left, right) {\n  const result = [];\n  while (left.length && right.length) {\n    if (left[0] <= right[0]) result.push(left.shift());\n    else result.push(right.shift());\n  }\n  return [...result, ...left, ...right];\n}' 
  },
  { 
    id: '2', 
    filename: 'CoreProcessor.java', 
    language: 'java', 
    content: 'import java.util.stream.Stream;\n\npublic class CoreProcessor {\n    public static void main(String[] args) {\n        Stream<String> stream = Stream.of(args);\n        stream.forEach(System.out::println);\n    }\n}' 
  },
  { 
    id: '3', 
    filename: 'MainController.c', 
    language: 'c', 
    content: '#include <stdio.h>\n\nint main() {\n    printf("Initializing Main Controller...\\n");\n    return 0;\n}' 
  }
];

type LogType = 'info' | 'success' | 'error' | 'hint' | 'warn';

interface LogEntry {
  type: LogType;
  text: string;
}

const CONSOLE_STREAM: LogEntry[] = [
  { type: 'info', text: '[KOGNIT] Session initialized — environment loaded' },
  { type: 'info', text: '[KOGNIT] Connecting to Socratic reasoning core...' },
  { type: 'success', text: '[COMPILE] ✓ 0 errors, 0 warnings' },
  { type: 'info', text: '[TELEMETRY] Listening for file changes' }
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const RUNNABLE_LANGUAGES = new Set([
  "javascript", "javascript (react)",
  "typescript", "typescript (react)",
  "python", "java", "c", "c++", "c#",
  "go", "rust", "ruby", "php", "lua",
  "perl", "r", "bash", "shell",
  "haskell", "scala", "swift",
])

/* ------------------------------------------------------------------ */
/*  Language → Monaco language ID mapping                               */
/* ------------------------------------------------------------------ */

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
/*  Character state machine — reacts to console events                 */
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
/*  Page                                                               */
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
  const monaco = useMonaco()

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

  // 1. Fetch files on load
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

  // Setup Monaco Custom Theme
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('kognit-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: '', foreground: 'e5e5e5' }, // Fix missing text color!
          { token: 'comment', foreground: '556b2f', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'f472b6' },
          { token: 'string', foreground: '34d399' },
          { token: 'number', foreground: '7dd3fc' },
          { token: 'type', foreground: 'c084fc' },
        ],
        colors: {
          'editor.background': '#0d0d0d', // Opaque so it isn't completely transparent
          'editor.foreground': '#e5e5e5', // Make sure default text has color
          'editor.lineHighlightBackground': '#ffffff0a',
          'editorLineNumber.foreground': '#525252',
          'editorIndentGuide.background': '#262626',
          'editorCursor.foreground': '#34d399',
          'editor.selectionBackground': '#34d39930',
        }
      });
    }
  }, [monaco]);

  const activeFile = files.find(f => f.id === activeFileId)

  // 2. Handle Editor Change with Debounced Save
  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || !activeFile) return;
    
    // Update local state immediately
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: value } : f));
    setSaveStatus('unsaved');
    
    // Debounce save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await fetch(`${API_BASE}/files/${activeFileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: value
          })
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Save failed:', err);
        setSaveStatus('unsaved');
      }
    }, 1000);
  };

  // 3. Handle File Creation
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
      setFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
    } catch (err) {
      console.error('Create failed:', err);
      addLog('error', `[KOGNIT] Failed to create file: ${newFilename}`);
    }
  };

  // 4. Handle Code Execution
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

  // Check if active language supports execution
  const canRun = activeFile ? RUNNABLE_LANGUAGES.has(activeFile.language.toLowerCase()) : false


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

        {/* Soft Auth Buttons & Theme Box directly on the dashboard */}
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

          {/* Antigravity Setup style Theme Picker Box in Top Right Corner */}
          <DashboardThemeBox />
        </div>
      </nav>

      {/* Main grid: explorer + editor + character */}
      <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-[240px_1fr_320px]">
        
        {/* ---- LEFT: File Explorer & Telemetry ---- */}
        <div className="flex flex-col gap-4">
          
          <GlassPanel label="explorer" className="flex-1 min-h-[400px]">
            <div className="pt-8 pb-4 px-4 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">KOGNIT_ENGINE</span>
                <button 
                  onClick={() => setIsFilenameModalOpen(true)}
                  className="font-mono text-[10px] uppercase text-emerald-400/80 hover:text-emerald-400 transition-colors font-bold tracking-widest"
                >
                  + New
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {isLoading ? (
                  <span className="font-mono text-[11px] text-muted-foreground/40 animate-pulse">
                    Loading files...
                  </span>
                ) : files.length === 0 ? (
                  <span className="font-mono text-[11px] text-muted-foreground/30">
                    No files yet — click + New
                  </span>
                ) : (
                  files.map(file => (
                    <button
                      key={file.id}
                      onClick={() => setActiveFileId(file.id)}
                      className={`group flex items-center gap-2 px-2 py-1.5 rounded transition-all text-left font-mono text-[11px] ${
                        activeFileId === file.id 
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]' 
                          : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${activeFileId === file.id ? 'bg-primary shadow-[0_0_8px_#34d399]' : 'bg-blue-500'}`} />
                      <span className="flex-1 truncate">{file.filename}</span>
                    </button>
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
          <GlassPanel label={`editor — ${activeFile?.filename || 'none'}`} className="flex-1 overflow-hidden min-h-[500px] flex flex-col">
            {/* Top bar: run button + save status */}
            <div className="absolute right-4 top-3 z-20 flex items-center gap-3">
              {/* Run Button */}
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
            <div className="absolute top-16 bottom-4 left-4 right-4 z-10">
              {activeFile ? (
                <Editor
                  key={activeFileId}
                  height="100%"
                  language={toMonacoLanguage(activeFile.language)}
                  theme="kognit-dark"
                  defaultValue={activeFile.content || ""}
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
                    <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                      Initializing Monaco core...
                    </div>
                  }
                />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground/30">
                  {isLoading ? 'Loading...' : 'Create a file to start coding'}
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Console logger */}
          <GlassPanel label="console.output" accent="pink" className="h-[200px] shrink-0">
            <div
              ref={consoleRef}
              className="no-scrollbar h-full overflow-y-auto pt-7 pb-3 px-4"
            >
              {consoleLines.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 py-[3px]"
                >
                  <span
                    className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${getLogDotColor(entry.type)}`}
                  />
                  <span
                    className={`font-mono text-[12px] leading-relaxed ${getLogTextColor(entry.type)}`}
                  >
                    {entry.text}
                  </span>
                </motion.div>
              ))}
              {consoleLines.length === 0 && (
                <span className="font-mono text-[11px] text-muted-foreground/30">
                  Awaiting output...
                </span>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* ---- RIGHT: Character sidekick panel ---- */}
        <div className="flex flex-col gap-4">
          <GlassPanel label="socratic.copilot" className="flex flex-col">
            <div className="relative flex h-[360px] items-center justify-center pt-6">
              {/* Character reaction aura flash */}
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

              {/* Animated character wrapper */}
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

            {/* Character state indicator */}
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getLogDotColor(type: string) {
  switch (type) {
    case 'success': return 'bg-emerald-400'
    case 'error': return 'bg-pink-400'
    case 'warn': return 'bg-amber-400'
    case 'hint': return 'bg-sky-400'
    default: return 'bg-muted-foreground/40'
  }
}

function getLogTextColor(type: string) {
  switch (type) {
    case 'success': return 'text-emerald-300/80'
    case 'error': return 'text-pink-300/80'
    case 'warn': return 'text-amber-300/70'
    case 'hint': return 'text-sky-300/80'
    default: return 'text-muted-foreground/70'
  }
}
