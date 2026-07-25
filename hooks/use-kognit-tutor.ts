import { useCallback, useEffect, useRef, useState } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const WS_BASE = API_BASE.replace(/^http/, 'ws')

export type AiState = 'idle' | 'listening' | 'thinking' | 'speaking'

export function useKognitTutor() {
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
  const analyserRef = useRef<AnalyserNode | null>(null)
  const vadFrameRef = useRef<number>(0)

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Generate a stable session ID
  useEffect(() => {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }, [])

  // ── Audio queue: guarantees playback never overlaps ──────────────────
  // tts_chunk events (streaming) and audio_out events (fallback) both push
  // into this queue; a single drain loop plays them one at a time.
  const audioQueueRef = useRef<Array<{ b64: string; format: string }>>([])
  const isAudioPlayingRef = useRef(false)
  // Timestamp when the current AI turn's first audio started playing.
  // Used to enforce the 400ms barge-in guard.
  const aiSpeechStartRef = useRef<number>(0)

  const drainAudioQueue = useCallback(() => {
    if (isAudioPlayingRef.current) return
    const next = audioQueueRef.current.shift()
    if (!next) return
    _playAudioNow(next.b64, next.format)
  }, [])

  const drainRef = useRef(drainAudioQueue)
  drainRef.current = drainAudioQueue

  const enqueueAudio = useCallback((b64: string, format: string) => {
    audioQueueRef.current.push({ b64, format })
    drainRef.current()
  }, [])

  // Stop all playback immediately (used by barge-in)
  const stopPlayback = useCallback(() => {
    audioQueueRef.current = []
    isAudioPlayingRef.current = false
    currentAudioRef.current?.pause()
    currentAudioRef.current = null
  }, [])

  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // Connect WebSocket
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    try {
      const ws = new WebSocket(`${WS_BASE}/ws/${sessionIdRef.current}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[KOGNIT] WS connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'ai_state') {
            if (data.state === 'idle' && isAudioPlayingRef.current) {
              // Ignore premature idle from backend while audio is actively playing
            } else {
              setAiState(data.state as AiState)
            }
          }

          if (data.type === 'ai_response') {
            setAiText(data.text)
          }

          if (data.type === 'user_transcript') {
            setUserTranscript(data.text)
          }

          if (data.type === 'audio_out' && data.audio) {
            enqueueAudio(data.audio, data.format || 'mp3')
          }

          if (data.type === 'tts_chunk' && data.audio) {
            enqueueAudio(data.audio, data.format || 'mp3')
          }
        } catch (e) {
          console.warn('[KOGNIT] WS parse error:', e)
        }
      }

      ws.onclose = () => {
        wsRef.current = null
        console.log('[KOGNIT] WS disconnected, reconnecting in 3s...')
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(connectWs, 3000)
        }
      }

      ws.onerror = (err) => {
        console.warn('[KOGNIT] WS connection attempting reconnect...')
      }
    } catch (e) {
      console.warn('[KOGNIT] WS init exception:', e)
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(connectWs, 3000)
      }
    }
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    connectWs()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
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

  // Send custom event over WebSocket
  const sendCustomEvent = useCallback((event: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event))
    }
  }, [])

  // Fallback Web Speech API speaker
  const speakTextFallback = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.warn('[KOGNIT] Web Speech API fallback error:', e)
    }
  }, [])

  // Internal: play one audio item and advance the queue when it finishes.
  // Never call directly — use enqueueAudio() so playback is serialised.
  const _playAudioNow = useCallback((b64: string, format: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }

      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: `audio/${format}` })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudioRef.current = audio

      const advance = () => {
        isAudioPlayingRef.current = false
        currentAudioRef.current = null
        URL.revokeObjectURL(url)
        setAiState('idle')
        drainRef.current()
      }

      audio.onplay = () => {
        isAudioPlayingRef.current = true
        if (aiSpeechStartRef.current === 0) {
          aiSpeechStartRef.current = Date.now()
        }
        setAiState('speaking')
      }
      audio.onended = advance
      audio.onerror = advance

      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn('[KOGNIT] Autoplay blocked, waiting for user gesture...', e)
          isAudioPlayingRef.current = false
          setAiState('idle')
          const unlock = () => {
            audio.play()
              .then(() => { isAudioPlayingRef.current = true; setAiState('speaking') })
              .catch(advance)
            window.removeEventListener('click', unlock)
            window.removeEventListener('keydown', unlock)
          }
          window.addEventListener('click', unlock, { once: true })
          window.addEventListener('keydown', unlock, { once: true })
        })
      }
    } catch (e) {
      console.error('[KOGNIT] Audio decode error:', e)
      isAudioPlayingRef.current = false
      currentAudioRef.current = null
      drainRef.current()
    }
  }, [])

  // Helper: Get supported audio recording MIME type for cross-browser support
  const getSupportedMimeType = useCallback(() => {
    if (typeof MediaRecorder === 'undefined') return ''
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t
    }
    return ''
  }, [])

  // Start microphone with adaptive recording + VAD
  const startMic = useCallback(async () => {
    try {
      // 1. Request microphone permission
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
      setAiState('listening')

      // 2. Continuous Recording Setup
      const mimeType = getSupportedMimeType()
      let chunks: Blob[] = []
      let recorder: MediaRecorder | null = null

      const createRecorder = () => {
        chunks = []
        try {
          recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        } catch {
          recorder = new MediaRecorder(stream)
        }
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data)
        }
        recorder.onstop = () => {
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
            sendAudioChunk(blob)
          }
        }
        recorder.start()
        mediaRecorderRef.current = recorder
      }

      // Start recording immediately when mic is enabled
      createRecorder()

      // 3. Adaptive VAD threshold checking
      const SILENCE_THRESHOLD = 0.003
      const SILENCE_DURATION = 1200
      const BARGE_IN_GUARD_MS = 400  // ignore VAD for 400ms after AI starts speaking
      const dataArray = new Float32Array(analyser.fftSize)
      let speakingDetected = false

      const checkVAD = () => {
        if (!analyserRef.current) return
        analyserRef.current.getFloatTimeDomainData(dataArray)

        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / dataArray.length)

        if (rms > SILENCE_THRESHOLD) {
          // ── Barge-in detection ──────────────────────────────────────
          // If AI is currently speaking and enough time has passed since
          // it started (guard prevents the AI's own voice triggering this),
          // send a barge_in signal and stop local playback immediately.
          const aiSpeechAge = aiSpeechStartRef.current
            ? Date.now() - aiSpeechStartRef.current
            : 0
          if (
            isAudioPlayingRef.current &&
            aiSpeechAge > BARGE_IN_GUARD_MS
          ) {
            console.log('[KOGNIT] Barge-in detected — student spoke during AI response')
            stopPlayback()
            aiSpeechStartRef.current = 0
            setAiState('listening')
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'barge_in' }))
            }
          }
          // ── Normal VAD for end-of-utterance detection ───────────────
          speakingDetected = true
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)

          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && speakingDetected) {
              speakingDetected = false
              mediaRecorderRef.current.stop()
              createRecorder()
            }
          }, SILENCE_DURATION)
        }

        vadFrameRef.current = requestAnimationFrame(checkVAD)
      }

      vadFrameRef.current = requestAnimationFrame(checkVAD)
    } catch (e) {
      console.error('[KOGNIT] Microphone permission / initialization error:', e)
      setIsMicActive(false)
      setAiState('idle')
    }
  }, [getSupportedMimeType])

  // Stop microphone & flush recorded speech
  const stopMic = useCallback(() => {
    if (vadFrameRef.current) cancelAnimationFrame(vadFrameRef.current)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)

    // Flush current recording on mic stop
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        console.warn('[KOGNIT] Error stopping media recorder:', e)
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close().catch(() => {})
        } catch (e) {
          // AudioContext already closed
        }
      }
      audioContextRef.current = null
    }

    analyserRef.current = null
    mediaRecorderRef.current = null
    // Clear any queued audio so stale chunks don't play after mic stops
    audioQueueRef.current = []
    isAudioPlayingRef.current = false
    aiSpeechStartRef.current = 0
    currentAudioRef.current = null
    setIsMicActive(false)
    setAiState('idle')
  }, [])

  // Send recorded audio chunk to backend via WebSocket
  const sendAudioChunk = useCallback(async (blob: Blob) => {
    if (!blob || blob.size < 200) return
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    
    try {
      setAiState('thinking')
      const buffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const b64 = btoa(binary)

      const format = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'

      wsRef.current.send(JSON.stringify({
        type: 'audio_in',
        audio: b64,
        format,
      }))
    } catch (e) {
      console.error('[KOGNIT] Error encoding/sending audio chunk:', e)
    }
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
    sendCustomEvent,
    startMic,
    stopMic,
  }
}
