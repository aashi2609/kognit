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

  // Send custom event over WebSocket
  const sendCustomEvent = useCallback((event: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event))
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
    sendCustomEvent,
    startMic,
    stopMic,
  }
}
