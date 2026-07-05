"use client"

import { motion, AnimatePresence } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Editor, { useMonaco } from "@monaco-editor/react"
import { GlassPanel } from "@/components/glass-panel"
import { StudentCharacter, type Expression } from "@/components/student-character"

/* ------------------------------------------------------------------ */
/*  Mock data — initial files, console log stream, Socratic hints     */
/* ------------------------------------------------------------------ */

interface CodeFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

const INITIAL_FILES: CodeFile[] = [
  { 
    id: '1', 
    name: 'mergeSort.js', 
    language: 'javascript', 
    content: 'function mergeSort(arr) {\n  if (arr.length <= 1) return arr;\n  const mid = Math.floor(arr.length / 2);\n  const left = mergeSort(arr.slice(0, mid));\n  const right = mergeSort(arr.slice(mid));\n  return merge(left, right);\n}\n\nfunction merge(left, right) {\n  const result = [];\n  while (left.length && right.length) {\n    if (left[0] <= right[0]) result.push(left.shift());\n    else result.push(right.shift());\n  }\n  return [...result, ...left, ...right];\n}' 
  },
  { 
    id: '2', 
    name: 'CoreProcessor.java', 
    language: 'java', 
    content: 'import java.util.stream.Stream;\n\npublic class CoreProcessor {\n    public static void main(String[] args) {\n        Stream<String> stream = Stream.of(args);\n        stream.forEach(System.out::println);\n    }\n}' 
  },
  { 
    id: '3', 
    name: 'MainController.c', 
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

const TELEMETRY = [
  { label: 'Files', value: '3' },
  { label: 'Errors', value: '0' },
  { label: 'Warnings', value: '0' },
  { label: 'Session', value: '00:14:32' },
]

/* ------------------------------------------------------------------ */
/*  Character state machine — reacts to console events                 */
/* ------------------------------------------------------------------ */

type CharacterState = 'idle' | 'nod' | 'think' | 'gesture'

function useCharacterReaction() {
  const [state, setState] = useState<CharacterState>('idle')
  const timeoutRef = useRef<number>(0)

  const trigger = useCallback((s: CharacterState) => {
    clearTimeout(timeoutRef.current)
    setState(s)
    timeoutRef.current = window.setTimeout(() => setState('idle'), 2200)
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
  const [files, setFiles] = useState<CodeFile[]>(INITIAL_FILES)
  const [activeFileId, setActiveFileId] = useState<string>(INITIAL_FILES[0].id)
  
  const [consoleLines, setConsoleLines] = useState<typeof CONSOLE_STREAM>([])
  const consoleRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<number>(0)
  const monaco = useMonaco()

  // Setup Monaco Custom Theme
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('kognit-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '556b2f', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'f472b6' }, // pink-400
          { token: 'string', foreground: '34d399' }, // emerald-400
        ],
        colors: {
          'editor.background': '#0a0a0a00', // transparent to let glass show
          'editor.lineHighlightBackground': '#ffffff0a',
          'editorLineNumber.foreground': '#525252',
          'editorIndentGuide.background': '#262626',
        }
      });
    }
  }, [monaco]);

  // Stream console logs one by one
  useEffect(() => {
    let idx = 0
    intervalRef.current = window.setInterval(() => {
      if (idx >= CONSOLE_STREAM.length) {
        clearInterval(intervalRef.current)
        return
      }
      const entry = CONSOLE_STREAM[idx]
      setConsoleLines((prev) => [...prev, entry])

      // Trigger character reactions based on log type
      if (entry.type === 'success') trigger('nod')
      else if (entry.type === 'error') trigger('think')
      else if (entry.type === 'hint') trigger('gesture')

      idx++
    }, 2800)

    return () => clearInterval(intervalRef.current)
  }, [trigger])

  // Auto-scroll console
  useEffect(() => {
    consoleRef.current?.scrollTo({
      top: consoleRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [consoleLines])

  const activeFile = files.find(f => f.id === activeFileId)

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || !activeFile) return;
    setFiles(files.map(f => f.id === activeFileId ? { ...f, content: value } : f));
  };

  const handleNewFile = () => {
    const newId = Date.now().toString()
    const newFile: CodeFile = {
      id: newId,
      name: 'untitled.ts',
      language: 'typescript',
      content: '// Start coding here...\n'
    }
    setFiles([...files, newFile])
    setActiveFileId(newId)
  }

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6">
      {/* Top navigation bar */}
      <nav className="mx-auto mb-6 flex max-w-[1400px] items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm uppercase tracking-[0.3em] text-primary/80 transition-colors hover:text-primary"
        >
          KOGNIT
        </Link>
        <div className="flex items-center gap-6">
          {[
            { href: '/dashboard', label: 'Terminal', active: true },
            { href: '/skills', label: 'Skills' },
            { href: '/arena', label: 'Arena' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
                link.active
                  ? 'text-primary'
                  : 'text-muted-foreground/50 hover:text-muted-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
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
                  onClick={handleNewFile}
                  className="font-mono text-[10px] uppercase text-emerald-400/80 hover:text-emerald-400 transition-colors"
                >
                  + New
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {files.map(file => (
                  <button
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all text-left font-mono text-[11px] ${
                      activeFileId === file.id 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-sm ${
                      file.language === 'javascript' ? 'bg-yellow-400/50' :
                      file.language === 'java' ? 'bg-orange-500/50' :
                      file.language === 'c' ? 'bg-blue-400/50' : 'bg-emerald-400/50'
                    }`} />
                    {file.name}
                  </button>
                ))}
              </div>
            </div>
          </GlassPanel>

          {/* Telemetry bar */}
          <GlassPanel label="telemetry.live" className="px-5 py-4">
            <div className="flex flex-col gap-3 pt-5">
              {TELEMETRY.map((t) => (
                <div key={t.label} className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                    {t.label}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {t.value}
                  </span>
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <motion.span
                  className="h-2 w-2 rounded-full bg-emerald-400"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="font-mono text-[10px] text-emerald-400/70">
                  RE retention: 94%
                </span>
              </div>
            </div>
          </GlassPanel>

        </div>

        {/* ---- MIDDLE: Code Editor + Console ---- */}
        <div className="flex flex-col gap-4">
          
          {/* Code editor */}
          <GlassPanel label={`editor — ${activeFile?.name || 'none'}`} className="flex-1 overflow-hidden min-h-[500px] flex flex-col">
            <div className="flex-1 pt-8 pb-4">
              {activeFile && (
                <Editor
                  height="100%"
                  language={activeFile.language}
                  theme="kognit-dark"
                  value={activeFile.content}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    lineHeight: 1.6,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    formatOnPaste: true,
                    overviewRulerBorder: false,
                    renderLineHighlight: "all",
                  }}
                  loading={
                    <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                      Initializing Monaco core...
                    </div>
                  }
                />
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
