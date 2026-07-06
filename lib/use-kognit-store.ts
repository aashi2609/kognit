/**
 * Kognit — Zustand Client Store
 *
 * Clean, minimal Zustand store that consumes incoming WebSocket
 * ServerPush messages and updates UI-bound values atomically.
 * No heavy global re-renders — each slice is subscribed independently.
 */

"use client"

import { create } from "zustand"

// ── Types ────────────────────────────────────────────────────────────

interface MasteryEntry {
  skill_tag: string
  easiness_factor: number
  interval_days: number
  repetitions: number
  delta: number
}

interface ExecutionResult {
  exit_code: number
  stdout: string
  stderr: string
  duration_ms: number
  executor: string
}

interface KognitState {
  // ── WebSocket ──────────────────────────────────────────────────
  ws: WebSocket | null
  sessionId: string | null
  isConnected: boolean

  // ── AI State ───────────────────────────────────────────────────
  confusionScore: number
  socraticMessage: string | null
  transcript: string | null
  ttsPlaying: boolean

  // ── Mastery ────────────────────────────────────────────────────
  masteryMap: Record<string, MasteryEntry>

  // ── Execution ──────────────────────────────────────────────────
  executionResult: ExecutionResult | null
  isExecuting: boolean

  // ── Actions ────────────────────────────────────────────────────
  connect: (sessionId: string) => void
  disconnect: () => void
  sendCodeUpdate: (fileName: string, language: string, content: string, cursorLine: number) => void
  sendExecuteCode: (language: string, sourceCode: string, stdin?: string) => void
  sendAudioChunk: (pcm16Buffer: ArrayBuffer) => void
}

// ── Store ─────────────────────────────────────────────────────────────

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"

export const useKognitStore = create<KognitState>((set, get) => ({
  // Initial state
  ws: null,
  sessionId: null,
  isConnected: false,
  confusionScore: 0,
  socraticMessage: null,
  transcript: null,
  ttsPlaying: false,
  masteryMap: {},
  executionResult: null,
  isExecuting: false,

  // ── Connect ────────────────────────────────────────────────────
  connect: (sessionId: string) => {
    const existingWs = get().ws
    if (existingWs) {
      existingWs.close()
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/${sessionId}`)

    ws.onopen = () => {
      set({ isConnected: true, sessionId })
      console.log("[KOGNIT] WebSocket connected:", sessionId)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleServerPush(msg, set)
      } catch {
        console.warn("[KOGNIT] Unparseable WS message:", event.data)
      }
    }

    ws.onclose = () => {
      set({ isConnected: false, ws: null })
      console.log("[KOGNIT] WebSocket disconnected")
    }

    ws.onerror = (err) => {
      console.error("[KOGNIT] WebSocket error:", err)
    }

    set({ ws, sessionId })
  },

  // ── Disconnect ─────────────────────────────────────────────────
  disconnect: () => {
    const ws = get().ws
    if (ws) ws.close()
    set({ ws: null, isConnected: false, sessionId: null })
  },

  // ── Send Code Update ───────────────────────────────────────────
  sendCodeUpdate: (fileName, language, content, cursorLine) => {
    const ws = get().ws
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: "code_update",
      file_name: fileName,
      language,
      content,
      cursor_line: cursorLine,
    }))
  },

  // ── Send Execute Code ──────────────────────────────────────────
  sendExecuteCode: (language, sourceCode, stdin = "") => {
    const ws = get().ws
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    set({ isExecuting: true, executionResult: null })
    ws.send(JSON.stringify({
      type: "execute_code",
      language,
      source_code: sourceCode,
      stdin,
    }))
  },

  // ── Send Audio Chunk ───────────────────────────────────────────
  sendAudioChunk: (pcm16Buffer: ArrayBuffer) => {
    const ws = get().ws
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(pcm16Buffer) // Binary frame
  },
}))

// ── Server Push Handler ──────────────────────────────────────────────

function handleServerPush(
  msg: { type: string; payload: Record<string, any> },
  set: (partial: Partial<KognitState>) => void,
) {
  const { type, payload } = msg

  switch (type) {
    case "confusion_update":
      set({ confusionScore: payload.confusion_score ?? 0 })
      break

    case "socratic_response":
      set({ socraticMessage: payload.response ?? null })
      break

    case "mastery_delta":
      set((prev) => ({
        ...prev,
        masteryMap: {
          ...prev.masteryMap,
          [payload.skill_tag]: payload,
        },
      }))
      break

    case "tts_audio":
      set({ ttsPlaying: true })
      // Auto-reset after playback (simplified)
      setTimeout(() => set({ ttsPlaying: false }), 3000)
      break

    case "execution_result":
      set({ executionResult: payload as ExecutionResult, isExecuting: false })
      break

    case "transcript_update":
      set({ transcript: payload.text ?? null })
      break

    case "error":
      console.error("[KOGNIT] Server error:", payload.message)
      break

    default:
      console.warn("[KOGNIT] Unknown push type:", type)
  }
}
