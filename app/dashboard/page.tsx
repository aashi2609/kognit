"use client"

import { motion, AnimatePresence } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Editor from "@monaco-editor/react"
import { 
  Folder, FolderOpen, FileText, Plus, Search, Edit3, Trash2, Copy, 
  ChevronRight, ChevronDown, RefreshCw, Check, X, FilePlus, FolderPlus
} from "lucide-react"
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
  folder_path?: string;
}

type LogType = 'info' | 'success' | 'error' | 'hint' | 'warn' | 'infra';

interface LogEntry {
  type: LogType;
  text: string;
}

/* ------------------------------------------------------------------ */
/*  Constants & Config                                                 */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const WS_BASE = API_BASE.replace(/^http/, 'ws')

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
    c:    { label: 'C',  color: '#a0a0a0' },
    cpp:  { label: 'C+', color: '#f34b7d' },
    cs:   { label: 'C#', color: '#178600' },
    go:   { label: 'GO', color: '#00add8' },
    rs:   { label: 'RS', color: '#dea584' },
    rb:   { label: 'RB', color: '#701516' },
    php:  { label: 'PH', color: '#4f5d95' },
    lua:  { label: 'LU', color: '#000080' },
    sh:   { label: 'SH', color: '#89e051' },
    bash: { label: 'SH', color: '#89e051' },
    sql:  { label: 'SQ', color: '#e38c00' },
    json: { label: '{}', color: '#fbc02d' },
    html: { label: '<>', color: '#e34c26' },
    css:  { label: 'CS', color: '#563d7c' },
    md:   { label: 'MD', color: '#38bdf8' },
  }
  const { label, color } = map[ext] ?? { label: 'FILE', color: '#34d399' }
  return (
    <span
      className="inline-flex items-center justify-center font-mono text-[9px] font-extrabold shrink-0 px-1 py-0.5 rounded shadow-[0_0_8px_rgba(0,0,0,0.5)] select-none"
      style={{
        color,
        backgroundColor: `${color}20`,
        border: `1px solid ${color}40`,
        minWidth: '22px',
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Item Modal Component (File & Folder)                       */
/* ------------------------------------------------------------------ */

function CreateItemModal({ 
  isOpen, 
  initialMode = 'file',
  targetFolder = '',
  onClose, 
  onSubmitFile,
  onSubmitFolder,
}: { 
  isOpen: boolean; 
  initialMode?: 'file' | 'folder';
  targetFolder?: string;
  onClose: () => void; 
  onSubmitFile: (filename: string) => void;
  onSubmitFolder: (foldername: string) => void;
}) {
  const [mode, setMode] = useState<'file' | 'folder'>('file')
  const [name, setName] = useState("")

  useEffect(() => {
    if (isOpen) {
      setName(targetFolder ? `${targetFolder}/` : "")
      setMode(initialMode)
    }
  }, [isOpen, initialMode, targetFolder])

  if (!isOpen) return null

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let trimmed = name.trim()
    if (!trimmed) return
    if (mode === 'file') {
      if (targetFolder && !trimmed.startsWith(`${targetFolder}/`)) {
        trimmed = `${targetFolder}/${trimmed}`
      }
      onSubmitFile(trimmed)
    } else {
      onSubmitFolder(trimmed)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form 
        onSubmit={handleFormSubmit}
        className="w-[340px] rounded-xl border border-white/15 bg-neutral-950 p-4 shadow-2xl"
      >
        {/* Toggle file vs folder */}
        <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all ${
              mode === 'file'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>New File</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('folder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all ${
              mode === 'folder'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>

        <h3 className="mb-2.5 font-mono text-[11px] uppercase tracking-widest text-slate-300 font-bold">
          {mode === 'file' ? 'Enter Filename' : 'Enter Folder Name'}
        </h3>
        
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={mode === 'file' ? 'e.g. main.py, utils.ts' : 'e.g. components, utils'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (name.trim()) {
                if (mode === 'file') onSubmitFile(name.trim())
                else onSubmitFolder(name.trim())
                onClose()
              }
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
          className="w-full rounded bg-black/60 px-3 py-2 font-mono text-xs text-foreground outline-none border border-white/10 focus:border-emerald-500/50"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button 
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 font-mono text-xs text-muted-foreground hover:bg-white/5"
          >
            CANCEL
          </button>
          <button 
            type="submit"
            className="rounded bg-emerald-500/20 px-3.5 py-1.5 font-mono text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
          >
            CREATE
          </button>
        </div>
      </form>
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
/*  Kognit AI Tutor Hook — WebSocket + VAD + Audio                     */
/* ------------------------------------------------------------------ */

type AiState = 'idle' | 'listening' | 'thinking' | 'speaking'

function useKognitTutor() {
  const [aiState, setAiState] = useState<AiState>('idle')
  const [aiText, setAiText] = useState('')
  const [userTranscript, setUserTranscript] = useState('')
  const [isMicActive, setIsMicActive] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string>('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioQueueRef = useRef<HTMLAudioElement[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const vadFrameRef = useRef<number>(0)

  // Generate a stable session ID
  useEffect(() => {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }, [])

  // Connect WebSocket
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_BASE}/ws/${sessionIdRef.current}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[KOGNIT] WS connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'ai_state') {
          setAiState(data.state as AiState)
        }

        if (data.type === 'ai_response') {
          setAiText(data.text)
        }

        if (data.type === 'user_transcript') {
          setUserTranscript(data.text)
        }

        if (data.type === 'audio_out' && data.audio) {
          playAudioBase64(data.audio, data.format || 'mp3')
        }
      } catch (e) {
        console.error('[KOGNIT] WS parse error:', e)
      }
    }

    ws.onclose = () => {
      console.log('[KOGNIT] WS disconnected, reconnecting in 3s...')
      setTimeout(connectWs, 3000)
    }

    ws.onerror = (err) => {
      console.error('[KOGNIT] WS error:', err)
    }
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    connectWs()
    return () => {
      wsRef.current?.close()
    }
  }, [connectWs])

  // Send code updates over WebSocket
  const sendCodeUpdate = useCallback((code: string, language: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'code_update',
        code,
        language,
      }))
    }
  }, [])

  // Play base64-encoded audio
  const playAudioBase64 = useCallback((b64: string, format: string) => {
    try {
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: `audio/${format}` })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play().catch(e => console.error('[KOGNIT] Audio play error:', e))
    } catch (e) {
      console.error('[KOGNIT] Audio decode error:', e)
    }
  }, [])

  // Start microphone with VAD (Voice Activity Detection)
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser

      setIsMicActive(true)

      // VAD loop — detect speech via volume threshold
      let isRecording = false
      let recorder: MediaRecorder | null = null
      let chunks: Blob[] = []

      const SILENCE_THRESHOLD = 0.015
      const SILENCE_DURATION = 1500 // ms of silence before ending
      const MIN_RECORDING_MS = 500

      const dataArray = new Float32Array(analyser.fftSize)
      let recordingStartTime = 0

      const checkVAD = () => {
        if (!analyserRef.current) return
        analyserRef.current.getFloatTimeDomainData(dataArray)

        // Compute RMS volume
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / dataArray.length)

        if (rms > SILENCE_THRESHOLD && !isRecording) {
          // Speech detected — start recording
          isRecording = true
          chunks = []
          recordingStartTime = Date.now()
          recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data)
          }
          recorder.onstop = () => {
            if (chunks.length > 0 && Date.now() - recordingStartTime > MIN_RECORDING_MS) {
              const blob = new Blob(chunks, { type: 'audio/webm' })
              sendAudioChunk(blob)
            }
            isRecording = false
          }
          recorder.start()
          mediaRecorderRef.current = recorder

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        }

        if (rms > SILENCE_THRESHOLD && isRecording) {
          // Still speaking — reset silence timer
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = setTimeout(() => {
            // Silence detected — stop recording
            if (recorder && recorder.state === 'recording') {
              recorder.stop()
            }
          }, SILENCE_DURATION)
        }

        vadFrameRef.current = requestAnimationFrame(checkVAD)
      }

      vadFrameRef.current = requestAnimationFrame(checkVAD)
    } catch (e) {
      console.error('[KOGNIT] Microphone error:', e)
    }
  }, [])

  // Stop microphone
  const stopMic = useCallback(() => {
    if (vadFrameRef.current) cancelAnimationFrame(vadFrameRef.current)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    audioContextRef.current?.close()
    analyserRef.current = null
    setIsMicActive(false)
  }, [])

  // Send recorded audio chunk to backend
  const sendAudioChunk = useCallback(async (blob: Blob) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    
    const buffer = await blob.arrayBuffer()
    const b64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    wsRef.current.send(JSON.stringify({
      type: 'audio_in',
      audio: b64,
      format: 'webm',
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic()
    }
  }, [stopMic])

  return {
    aiState,
    aiText,
    userTranscript,
    isMicActive,
    sendCodeUpdate,
    startMic,
    stopMic,
  }
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { state: charState, expression, trigger } = useCharacterReaction()
  const { aiState, aiText, userTranscript, isMicActive, sendCodeUpdate, startMic, stopMic } = useKognitTutor()
  
  // File state
  const [files, setFiles] = useState<CodeFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createModalMode, setCreateModalMode] = useState<'file' | 'folder'>('file')
  const [targetFolderForModal, setTargetFolderForModal] = useState<string>('')

  // Folders state
  const [folders, setFolders] = useState<string[]>([])
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  
  // Workspace UI state
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  // Inline rename state ("rewrite file name")
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingFilename, setEditingFilename] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)

  // Inline create state (Antigravity IDE style)
  const [inlineCreateState, setInlineCreateState] = useState<{
    isOpen: boolean
    type: 'file' | 'folder'
    folderContext?: string
  }>({
    isOpen: false,
    type: 'file',
  })
  const [inlineCreateName, setInlineCreateName] = useState("")
  const inlineInputRef = useRef<HTMLInputElement>(null)
  
  // Editor / Run state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isRunning, setIsRunning] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [consoleLines, setConsoleLines] = useState<LogEntry[]>([
    { type: 'info', text: '[KOGNIT] Session initialized - environment loaded' },
    { type: 'info', text: '[KOGNIT] Connecting to Socratic reasoning core...' }
  ])
  const consoleRef = useRef<HTMLDivElement>(null)
  
  const [prompts, setPrompts] = useState<string[]>([])
  const [inputValues, setInputValues] = useState<string[]>([])
  const [isInputPanelOpen, setIsInputPanelOpen] = useState(false)

  const activeFile = files.find(f => f.id === activeFileId)

  // Send code updates to the AI tutor (debounced separately from extraction)
  useEffect(() => {
    if (!activeFile?.content || !activeFile?.language) return
    const timer = setTimeout(() => {
      sendCodeUpdate(activeFile.content, activeFile.language)
    }, 5000) // 5s debounce for code monitoring to save Gemini rate limits
    return () => clearTimeout(timer)
  }, [activeFile?.content, activeFile?.language, sendCodeUpdate])

  // Log AI responses to the console
  useEffect(() => {
    if (aiText) {
      setConsoleLines(prev => [...prev, { type: 'hint', text: `[KOGNIT AI] ${aiText}` }])
    }
  }, [aiText])

  // Log user transcript to the console
  useEffect(() => {
    if (userTranscript) {
      setConsoleLines(prev => [...prev, { type: 'info', text: `[YOU] ${userTranscript}` }])
    }
  }, [userTranscript])
  // Debounced input extraction
  useEffect(() => {
    if (!activeFile?.content) {
      setPrompts([])
      setInputValues([])
      return
    }
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/extract-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: activeFile.language, content: activeFile.content })
      })
      .then(res => res.json())
      .then(data => {
        const extracted = data.prompts || []
        setPrompts(extracted)
        setInputValues(prev => {
          const newVals = [...prev]
          while (newVals.length < extracted.length) newVals.push('')
          return newVals.slice(0, extracted.length)
        })
        if (extracted.length > 0 && !isInputPanelOpen) {
          setIsInputPanelOpen(true)
        }
      })
      .catch(err => console.error("Extraction failed:", err))
    }, 800)
    return () => clearTimeout(timer)
  }, [activeFile?.content, activeFile?.language])

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

  // Refresh file list handler
  const handleRefreshFiles = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/files`)
      const data = await res.json()
      setFiles(data)
      addLog('info', '[KOGNIT] Workspace refreshed')
    } catch (err) {
      addLog('error', '[KOGNIT] Failed to refresh workspace')
    } finally {
      setIsLoading(false)
    }
  }, [addLog])

  // Start inline file rename ("rewrite file name")
  const handleStartRename = (file: CodeFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingFileId(file.id)
    setEditingFilename(file.filename)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  // Save inline file rename
  const handleSaveRename = async (fileId: string) => {
    const trimmed = editingFilename.trim()
    if (!trimmed) {
      setEditingFileId(null)
      return
    }
    const current = files.find(f => f.id === fileId)
    if (current && current.filename === trimmed) {
      setEditingFileId(null)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/files/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: trimmed })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      
      setFiles(prev => prev.map(f => f.id === fileId ? {
        ...f,
        filename: data.filename || trimmed,
        language: data.language || f.language
      } : f))
      addLog('info', `[KOGNIT] Renamed file to: ${data.filename || trimmed}`)
    } catch (err) {
      console.error('Rename failed:', err)
      addLog('error', `[KOGNIT] Failed to rename file: ${trimmed}`)
    } finally {
      setEditingFileId(null)
    }
  }

  // Duplicate file handler
  const handleDuplicateFile = async (file: CodeFile, e: React.MouseEvent) => {
    e.stopPropagation()
    const parts = file.filename.split('.')
    let dupName = ""
    if (parts.length > 1) {
      const ext = parts.pop()
      dupName = `${parts.join('.')}_copy.${ext}`
    } else {
      dupName = `${file.filename}_copy`
    }

    try {
      let fullContent = file.content ?? ""
      if (!contentLoadedRef.current.has(file.id)) {
        const fetchRes = await fetch(`${API_BASE}/files/${file.id}`)
        if (fetchRes.ok) {
          const detail = await fetchRes.json()
          fullContent = detail.content ?? ""
        }
      }

      const res = await fetch(`${API_BASE}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: dupName,
          folder_path: "/"
        })
      })
      if (!res.ok) throw new Error(await res.text())
      const newFile = await res.json()

      if (fullContent) {
        await fetch(`${API_BASE}/files/${newFile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: fullContent })
        })
        newFile.content = fullContent
      }

      contentLoadedRef.current.add(newFile.id)
      setFiles(prev => [...prev, newFile])
      setActiveFileId(newFile.id)
      addLog('success', `[KOGNIT] Duplicated file: ${dupName}`)
    } catch (err) {
      console.error('Duplicate failed:', err)
      addLog('error', `[KOGNIT] Failed to duplicate file`)
    }
  }

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
      addLog('success', `[KOGNIT] Created new file: ${newFilename}`);
    } catch (err) {
      console.error('Create failed:', err);
      addLog('error', `[KOGNIT] Failed to create file: ${newFilename}`);
    }
  };

  // Create Folder Handler
  const handleCreateFolder = (foldername: string) => {
    const cleanName = foldername.trim().replace(/^\/+|\/+$/g, '')
    if (!cleanName) return
    if (!folders.includes(cleanName)) {
      setFolders(prev => [...prev, cleanName])
      addLog('success', `[KOGNIT] Created folder: ${cleanName}`)
    }
  }

  // Delete Folder Handler (Cascade deletes all files inside this folder)
  const handleDeleteFolder = async (foldername: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const folderFiles = files.filter(f => 
      f.filename.startsWith(`${foldername}/`) || f.folder_path === `/${foldername}` || f.folder_path === foldername
    )

    try {
      if (folderFiles.length > 0) {
        await Promise.all(
          folderFiles.map(file => fetch(`${API_BASE}/files/${file.id}`, { method: 'DELETE' }))
        )
        folderFiles.forEach(file => contentLoadedRef.current.delete(file.id))
        const folderFileIds = new Set(folderFiles.map(f => f.id))
        setFiles(prev => {
          const remaining = prev.filter(f => !folderFileIds.has(f.id))
          if (folderFileIds.has(activeFileId)) {
            setActiveFileId(remaining.length > 0 ? remaining[0].id : '')
          }
          return remaining
        })
      }
      setFolders(prev => prev.filter(f => f !== foldername))
      addLog('warn', `[KOGNIT] Deleted folder '${foldername}' and ${folderFiles.length} file(s) inside it`)
    } catch (err) {
      console.error('Delete folder failed:', err)
      addLog('error', `[KOGNIT] Failed to delete folder '${foldername}'`)
    }
  }

  // Toggle Folder Collapse Handler
  const toggleFolderCollapse = (foldername: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCollapsedFolders(prev => ({
      ...prev,
      [foldername]: !prev[foldername]
    }))
  }

  // Antigravity style inline creation triggers
  const startInlineCreate = (type: 'file' | 'folder', folderContext?: string) => {
    setInlineCreateState({ isOpen: true, type, folderContext })
    setInlineCreateName('')
    if (folderContext) {
      setCollapsedFolders(prev => ({ ...prev, [folderContext]: false }))
    }
    setTimeout(() => inlineInputRef.current?.focus(), 50)
  }

  const handleInlineCreateSubmit = async () => {
    const trimmed = inlineCreateName.trim()
    if (!trimmed) {
      setInlineCreateState({ isOpen: false, type: 'file' })
      return
    }

    if (inlineCreateState.type === 'folder') {
      handleCreateFolder(trimmed)
    } else {
      let finalFilename = trimmed
      if (inlineCreateState.folderContext && !trimmed.startsWith(`${inlineCreateState.folderContext}/`)) {
        finalFilename = `${inlineCreateState.folderContext}/${trimmed}`
      }
      await handleCreateFile(finalFilename)
    }

    setInlineCreateName('')
    setInlineCreateState({ isOpen: false, type: 'file' })
  }

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
          content: activeFile.content,
          filename: activeFile.filename,
          stdin: inputValues.join('\n')
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || `Server returned ${res.status}`)
      }

      const { run, compile, error_type } = data
      let producedOutput = false

      if (error_type === 'infra') {
        addLog('infra', `[SERVICE] Infrastructure Error: Piston API unavailable`)
        producedOutput = true
      }

      if (compile?.stderr) {
        addLog('warn', `[COMPILE] ${compile.stderr}`)
        producedOutput = true
      }

      const stderrStr = run?.stderr || '';
      const isAwaitingInput = stderrStr.includes('EOFError') || stderrStr.includes('NoSuchElementException') || stderrStr.includes('Scanner');
      if (isAwaitingInput) {
        addLog('warn', `[RUN] Program expected more input — check your Input panel`)
        producedOutput = true
      }

      if (run?.stdout) {
        const lines = run.stdout.split('\n').filter(Boolean)
        lines.forEach((line: string) => addLog('info', `> ${line}`))
        trigger('nod')
        producedOutput = true
      }

      if (stderrStr && !isAwaitingInput) {
        const lines = stderrStr.split('\n').filter(Boolean)
        lines.forEach((line: string) => addLog('error', `! ${line}`))
        trigger('gesture')
        producedOutput = true
      }

      if (run?.code !== 0 && run?.code !== undefined && error_type !== 'infra') {
        if (!isAwaitingInput) addLog('error', `[RUN] ✗ Process exited with code ${run.code}`)
        trigger('gesture')
      } else if (!producedOutput) {
        addLog('success', '[RUN] ✓ Program executed successfully but produced no output')
        trigger('nod')
      } else if (error_type !== 'infra') {
        addLog('success', '[RUN] ✓ Execution completed')
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        addLog('infra', `[SERVICE] ✗ Execution timed out (took >15s)`)
      } else {
        addLog('infra', `[SERVICE] ✗ Execution failed: ${err.message || err}`)
      }
      trigger('gesture')
    } finally {
      setIsRunning(false)
    }
  }

  const canRun = activeFile ? RUNNABLE_LANGUAGES.has(activeFile.language.toLowerCase()) : false
  const contentReady = activeFileId ? contentLoadedRef.current.has(activeFileId) : false

  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6">
      {/* Create Item Modal (File & Folder) */}
      <CreateItemModal
        isOpen={isCreateModalOpen}
        initialMode={createModalMode}
        targetFolder={targetFolderForModal}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmitFile={handleCreateFile}
        onSubmitFolder={handleCreateFolder}
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
          
          <GlassPanel className="flex-1 min-h-[440px]">
            <div className="p-3 pt-4 flex flex-col gap-3">
              {/* Explorer Header */}
              <div className="flex flex-col gap-2 pb-2.5 border-b border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-slate-200 font-bold whitespace-nowrap">
                      KOGNIT_WORKSPACE
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">
                      ({files.length})
                    </span>
                  </div>

                  {/* Antigravity IDE style New File & New Folder action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setShowSearch(!showSearch)}
                      className={`p-1 transition-colors ${
                        showSearch || searchQuery ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Toggle Search Filter"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleRefreshFiles}
                      className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Refresh Files"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    
                    {/* New File Button */}
                    <button
                      onClick={() => startInlineCreate('file')}
                      className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="New File"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                    </button>

                    {/* New Folder Button */}
                    <button
                      onClick={() => startInlineCreate('folder')}
                      className="p-1 text-amber-400 hover:text-amber-300 transition-colors"
                      title="New Folder"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Search Input Bar */}
                <AnimatePresence>
                  {(showSearch || searchQuery) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative mt-1">
                        <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Filter files..."
                          className="w-full pl-7 pr-7 py-1 rounded bg-black/60 border border-white/10 font-mono text-[11px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-white/20 transition-colors"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-2 text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Workspace File & Folder Item List */}
              <div className="flex flex-col gap-1">
                {/* Antigravity Style Inline Root Creation Row */}
                <AnimatePresence>
                  {inlineCreateState.isOpen && !inlineCreateState.folderContext && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded font-mono text-[11px] ${
                        inlineCreateState.type === 'folder'
                          ? 'bg-amber-500/10 border border-amber-500/40'
                          : 'bg-emerald-500/10 border border-emerald-500/40'
                      }`}
                    >
                      {inlineCreateState.type === 'folder' ? (
                        <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <input
                        ref={inlineInputRef}
                        type="text"
                        value={inlineCreateName}
                        onChange={(e) => setInlineCreateName(e.target.value)}
                        placeholder={inlineCreateState.type === 'folder' ? 'folder_name...' : 'filename.ext...'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleInlineCreateSubmit();
                          } else if (e.key === 'Escape') {
                            setInlineCreateState({ isOpen: false, type: 'file' });
                          }
                        }}
                        className="w-full bg-black/80 font-mono text-[11px] text-slate-100 outline-none px-1.5 py-0.5 rounded border border-white/10"
                      />
                      <button
                        onClick={handleInlineCreateSubmit}
                        className={`p-1 shrink-0 ${inlineCreateState.type === 'folder' ? 'text-amber-400 hover:text-amber-200' : 'text-emerald-400 hover:text-emerald-200'}`}
                        title="Create"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setInlineCreateState({ isOpen: false, type: 'file' })}
                        className="p-1 text-slate-400 hover:text-white shrink-0"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Render Custom Folders */}
                {folders.map(foldername => {
                  const isCollapsed = collapsedFolders[foldername]
                  const folderFiles = filteredFiles.filter(f => 
                    f.filename.startsWith(`${foldername}/`) || f.folder_path === `/${foldername}` || f.folder_path === foldername
                  )

                  return (
                    <div key={foldername} className="flex flex-col gap-1">
                      <div 
                        onClick={(e) => toggleFolderCollapse(foldername, e)}
                        className="group flex items-center justify-between px-2 py-1.5 rounded text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer font-mono text-[11px] select-none"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          {isCollapsed ? (
                            <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                          ) : (
                            <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-200 truncate">{foldername}</span>
                          <span className="text-[10px] text-slate-500">({folderFiles.length})</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startInlineCreate('file', foldername)
                            }}
                            title={`New File in ${foldername}`}
                            className="hidden group-hover:flex p-1 text-slate-400 hover:text-emerald-300"
                          >
                            <FilePlus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteFolder(foldername, e)}
                            title={`Delete folder and all files inside`}
                            className="hidden group-hover:flex p-1 text-slate-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Indented folder files */}
                      {!isCollapsed && (
                        <div className="flex flex-col gap-1 pl-3 border-l border-white/5 ml-2">
                          {/* Inline creation inside folder */}
                          <AnimatePresence>
                            {inlineCreateState.isOpen && inlineCreateState.type === 'file' && inlineCreateState.folderContext === foldername && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="flex items-center gap-2 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/40 font-mono text-[11px]"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <input
                                  ref={inlineInputRef}
                                  type="text"
                                  value={inlineCreateName}
                                  onChange={(e) => setInlineCreateName(e.target.value)}
                                  placeholder="filename.ext..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleInlineCreateSubmit();
                                    } else if (e.key === 'Escape') {
                                      setInlineCreateState({ isOpen: false, type: 'file' });
                                    }
                                  }}
                                  className="w-full bg-black/80 font-mono text-[11px] text-emerald-200 outline-none px-1.5 py-0.5 rounded border border-emerald-500/30"
                                />
                                <button
                                  onClick={handleInlineCreateSubmit}
                                  className="p-1 text-emerald-400 hover:text-emerald-200 shrink-0"
                                  title="Create file in folder"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setInlineCreateState({ isOpen: false, type: 'file' })}
                                  className="p-1 text-slate-400 hover:text-white shrink-0"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {folderFiles.length === 0 ? (
                            <span className="font-mono text-[10px] text-slate-500/70 italic px-2 py-0.5">Empty folder</span>
                          ) : (
                            folderFiles.map(file => {
                              const isActive = activeFileId === file.id
                              const isEditing = editingFileId === file.id
                              const displayName = file.filename.startsWith(`${foldername}/`) 
                                ? file.filename.slice(foldername.length + 1)
                                : file.filename

                              return (
                                <div
                                  key={file.id}
                                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all font-mono text-[11px] cursor-pointer select-none ${
                                    isActive
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-[0_0_12px_rgba(52,211,153,0.12)]'
                                      : 'text-slate-300/80 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                                  }`}
                                  onClick={() => {
                                    if (!isEditing) setActiveFileId(file.id)
                                  }}
                                  onDoubleClick={(e) => handleStartRename(file, e)}
                                  title="Double click to rewrite filename"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                                    <FileIcon filename={file.filename} />
                                    
                                    {isEditing ? (
                                      <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          ref={editInputRef}
                                          type="text"
                                          value={editingFilename}
                                          onChange={(e) => setEditingFilename(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleSaveRename(file.id);
                                            } else if (e.key === 'Escape') {
                                              setEditingFileId(null);
                                            }
                                          }}
                                          className="w-full bg-black/90 font-mono text-[11px] text-emerald-200 outline-none px-1.5 py-0.5 rounded border border-emerald-400/50"
                                        />
                                        <button
                                          onClick={() => handleSaveRename(file.id)}
                                          className="p-1 text-emerald-400 hover:text-emerald-200 shrink-0"
                                          title="Save filename"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setEditingFileId(null)}
                                          className="p-1 text-slate-400 hover:text-white shrink-0"
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="truncate tracking-wide">{displayName}</span>
                                    )}
                                  </div>

                                  {!isEditing && (
                                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                                      <button
                                        onClick={(e) => handleStartRename(file, e)}
                                        title="Rewrite filename"
                                        className="hidden group-hover:flex transition-all duration-150 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/20 p-1 rounded font-mono shrink-0"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => handleDuplicateFile(file, e)}
                                        title="Duplicate file"
                                        className="hidden group-hover:flex transition-all duration-150 text-slate-400 hover:text-sky-300 hover:bg-sky-500/20 p-1 rounded font-mono shrink-0"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => handleDeleteFile(file.id, e)}
                                        title={`Delete ${file.filename}`}
                                        className="hidden group-hover:flex transition-all duration-150 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/20 p-1 rounded font-mono shrink-0"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>

                                      {isActive && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0 ml-1.5" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Render Root Files (Files not inside any folder) */}
                {(() => {
                  const rootFiles = filteredFiles.filter(f => 
                    !folders.some(folder => 
                      f.filename.startsWith(`${folder}/`) || f.folder_path === `/${folder}` || f.folder_path === folder
                    )
                  )

                  if (isLoading) {
                    return (
                      <span className="font-mono text-[11px] text-muted-foreground/40 animate-pulse px-2 py-1">
                        Loading workspace files...
                      </span>
                    )
                  }

                  if (rootFiles.length === 0 && folders.length === 0) {
                    return (
                      <span className="font-mono text-[11px] text-muted-foreground/40 px-2 py-1 italic">
                        {searchQuery ? "No files matching filter" : "No files found — click + New File or + Folder"}
                      </span>
                    )
                  }

                  return rootFiles.map(file => {
                    const isActive = activeFileId === file.id
                    const isEditing = editingFileId === file.id

                    return (
                      <div
                        key={file.id}
                        className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all font-mono text-[11px] cursor-pointer select-none ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-[0_0_12px_rgba(52,211,153,0.12)]'
                            : 'text-slate-300/80 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                        }`}
                        onClick={() => {
                          if (!isEditing) setActiveFileId(file.id)
                        }}
                        onDoubleClick={(e) => handleStartRename(file, e)}
                        title="Double click to rewrite filename"
                      >
                        {/* File icon + name OR inline input */}
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                          <FileIcon filename={file.filename} />
                          
                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingFilename}
                                onChange={(e) => setEditingFilename(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveRename(file.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingFileId(null);
                                  }
                                }}
                                className="w-full bg-black/90 font-mono text-[11px] text-emerald-200 outline-none px-1.5 py-0.5 rounded border border-emerald-400/50"
                              />
                              <button
                                onClick={() => handleSaveRename(file.id)}
                                className="p-1 text-emerald-400 hover:text-emerald-200 shrink-0"
                                title="Save filename"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingFileId(null)}
                                className="p-1 text-slate-400 hover:text-white shrink-0"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="truncate tracking-wide">{file.filename}</span>
                          )}
                        </div>
                        
                        {/* Quick Action buttons on hover & Active Light Dot at far right */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0 ml-auto">
                            {/* Rewrite / Rename button */}
                            <button
                              onClick={(e) => handleStartRename(file, e)}
                              title="Rewrite filename"
                              className="hidden group-hover:flex transition-all duration-150 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/20 p-1 rounded font-mono shrink-0"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>

                            {/* Duplicate button */}
                            <button
                              onClick={(e) => handleDuplicateFile(file, e)}
                              title="Duplicate file"
                              className="hidden group-hover:flex transition-all duration-150 text-slate-400 hover:text-sky-300 hover:bg-sky-500/20 p-1 rounded font-mono shrink-0"
                            >
                              <Copy className="w-3 h-3" />
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={(e) => handleDeleteFile(file.id, e)}
                              title={`Delete ${file.filename}`}
                              className="hidden group-hover:flex transition-all duration-150 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/20 p-1 rounded font-mono shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Active Light Dot at the absolute far right */}
                            {isActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0 ml-1.5" />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
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

          {/* Bottom Row: Console + Input */}
          <div className="flex gap-4 shrink-0" style={{ height: '220px' }}>
            {/* Console logger */}
            <div className="relative flex-1 rounded-2xl border border-pink-400/10 bg-neutral-950/40 backdrop-blur-3xl hover:border-pink-400/20 transition-colors duration-300 overflow-hidden">
              <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 40% at 80% 30%, oklch(0.78 0.07 350 / 5%), transparent 70%)' }} aria-hidden="true" />
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
                      className={`font-mono text-[13px] leading-relaxed tracking-tight ${getLogTextColor(entry.type)}`}
                      style={{
                        textShadow: entry.type === 'error' ? '0 0 12px rgba(244,114,182,0.3)' : 
                                    entry.type === 'success' ? '0 0 12px rgba(52,211,153,0.2)' : 'none'
                      }}
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

            {/* Input panel */}
            {prompts.length > 0 && (
              <div 
                className={`relative rounded-2xl border border-sky-400/10 bg-neutral-950/40 backdrop-blur-3xl hover:border-sky-400/20 transition-all duration-300 flex flex-col overflow-hidden ${isInputPanelOpen ? 'w-64' : 'w-10 cursor-pointer'}`}
                onClick={() => !isInputPanelOpen && setIsInputPanelOpen(true)}
              >
                <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 40% at 20% 30%, oklch(0.7 0.15 250 / 5%), transparent 70%)' }} aria-hidden="true" />
                
                {/* Header / Toggle */}
                <div 
                  className="absolute left-0 right-0 top-0 h-10 z-10 flex items-center justify-between px-3 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setIsInputPanelOpen(!isInputPanelOpen); }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full bg-sky-400/60 transition-transform ${isInputPanelOpen ? 'scale-100' : 'scale-75'}`} />
                    {isInputPanelOpen && <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/50">Program Input</span>}
                  </div>
                  {isInputPanelOpen && (
                    <svg className="w-3 h-3 text-muted-foreground/50 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" transform="rotate(180 12 12)" />
                    </svg>
                  )}
                  {!isInputPanelOpen && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-3 h-3 text-sky-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Content */}
                {isInputPanelOpen && (
                  <div className="flex flex-col flex-1 px-3 pb-3 pt-10 relative z-20 overflow-y-auto no-scrollbar">
                    <p className="font-mono text-[10px] text-muted-foreground/40 mb-3 leading-tight">
                      Fill in the expected inputs for your program.
                    </p>
                    <div className="flex flex-col gap-3 flex-1">
                      {prompts.map((prompt, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <label className="font-mono text-[10px] text-sky-400/80 line-clamp-1" title={prompt}>{prompt}</label>
                          <input
                            type="text"
                            value={inputValues[i] || ''}
                            onChange={(e) => {
                              const newVals = [...inputValues];
                              newVals[i] = e.target.value;
                              setInputValues(newVals);
                            }}
                            className="w-full bg-black/20 border border-white/5 rounded-lg p-2 font-mono text-[12px] text-slate-300 focus:outline-none focus:border-sky-400/30"
                            placeholder="Type input..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRunCode()
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRunCode(); }}
                      disabled={isRunning}
                      className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-sky-400/10 py-2 text-[11px] font-medium uppercase tracking-wider text-sky-400 hover:bg-sky-400/20 disabled:opacity-50 transition-colors shrink-0"
                    >
                      {isRunning ? 'Running...' : 'Run Program'}
                    </button>
                  </div>
                )}
              </div>
            )}
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
                      aiState === 'speaking'
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : aiState === 'thinking'
                          ? 'bg-pink-400 shadow-[0_0_8px_#f472b6]'
                          : aiState === 'listening'
                            ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
                            : charState !== 'idle'
                              ? 'bg-amber-400'
                              : 'bg-primary/40'
                    }`}
                    animate={{ scale: aiState !== 'idle' ? [1, 1.4, 1] : charState !== 'idle' ? [1, 1.4, 1] : 1 }}
                    transition={{ duration: 0.6, repeat: aiState !== 'idle' || charState !== 'idle' ? Infinity : 0 }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {aiState === 'speaking' && '🔊 speaking...'}
                    {aiState === 'thinking' && '🧠 analyzing...'}
                    {aiState === 'listening' && '🎙️ listening...'}
                    {aiState === 'idle' && charState === 'idle' && 'observing'}
                    {aiState === 'idle' && charState === 'nod' && 'milestone cleared ✓'}
                    {aiState === 'idle' && charState === 'think' && 'analyzing issue...'}
                    {aiState === 'idle' && charState === 'gesture' && 'delivering hint →'}
                  </span>
                </div>
                
                {/* Microphone toggle */}
                <button
                  onClick={() => isMicActive ? stopMic() : startMic()}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest transition-all ${
                    isMicActive
                      ? 'bg-sky-400/20 text-sky-300 border border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                      : 'text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-white/5 border border-transparent'
                  }`}
                  title={isMicActive ? 'Microphone active — click to mute' : 'Click to enable voice conversation'}
                >
                  {isMicActive ? (
                    <motion.svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </motion.svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  )}
                  {isMicActive ? 'live' : 'mic'}
                </button>
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
    case 'infra': return 'text-fuchsia-400 font-semibold'
    case 'warn': return 'text-amber-300'
    case 'hint': return 'text-sky-300'
    default: return 'text-slate-300'
  }
}
