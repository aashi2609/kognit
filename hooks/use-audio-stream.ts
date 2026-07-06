/**
 * Kognit — Audio Stream Hook
 *
 * React hook that initializes the Web Audio API, registers the
 * KognitAudioProcessor worklet, and provides controls for
 * mic recording with raw PCM chunk streaming.
 */

"use client"

import { useCallback, useRef, useState } from "react"

type AudioChunkCallback = (pcm16Bytes: ArrayBuffer) => void

interface UseAudioStreamReturn {
  /** Whether the mic is currently recording */
  isRecording: boolean
  /** Start capturing audio from the microphone */
  startRecording: () => Promise<void>
  /** Stop capturing and clean up resources */
  stopRecording: () => void
  /** Register a callback for each audio chunk (250ms intervals) */
  onChunk: (callback: AudioChunkCallback) => void
  /** Any error that occurred during setup */
  error: string | null
}

/**
 * Downsample Float32 audio from source sample rate to 16kHz
 * and convert to PCM16 (Int16) bytes.
 */
function float32ToPcm16(float32: Float32Array, sourceSampleRate: number): ArrayBuffer {
  const targetRate = 16000
  const ratio = sourceSampleRate / targetRate
  const targetLength = Math.floor(float32.length / ratio)
  const pcm16 = new Int16Array(targetLength)

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = Math.floor(i * ratio)
    // Clamp to [-1, 1] and convert to int16 range
    const sample = Math.max(-1, Math.min(1, float32[srcIndex]))
    pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }

  return pcm16.buffer
}

export function useAudioStream(): UseAudioStreamReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const chunkCallbackRef = useRef<AudioChunkCallback | null>(null)

  const onChunk = useCallback((callback: AudioChunkCallback) => {
    chunkCallbackRef.current = callback
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Request 16kHz (browser may not honor this)
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      mediaStreamRef.current = stream

      // Create AudioContext
      const ctx = new AudioContext({ sampleRate: 48000 })
      audioContextRef.current = ctx

      // Load the worklet processor
      // The compiled JS file must be in /public/audio-worklet.js
      await ctx.audioWorklet.addModule("/audio-worklet.js")

      // Create source from mic stream
      const source = ctx.createMediaStreamSource(stream)
      sourceNodeRef.current = source

      // Create worklet node
      const worklet = new AudioWorkletNode(ctx, "kognit-audio-processor")
      workletNodeRef.current = worklet

      // Listen for audio chunks from the worklet
      worklet.port.onmessage = (event) => {
        if (event.data.type === "audio_chunk" && chunkCallbackRef.current) {
          const float32Data: Float32Array = event.data.data
          const pcm16Buffer = float32ToPcm16(float32Data, ctx.sampleRate)
          chunkCallbackRef.current(pcm16Buffer)
        }
      }

      // Connect: mic → worklet (no output needed, we just capture)
      source.connect(worklet)
      // Don't connect worklet to destination — we don't want playback

      setIsRecording(true)
    } catch (err: any) {
      setError(err.message || "Failed to start audio recording")
      console.error("[KOGNIT] Audio recording error:", err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    // Disconnect worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }

    // Disconnect source
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }

    // Stop all mic tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsRecording(false)
  }, [])

  return {
    isRecording,
    startRecording,
    stopRecording,
    onChunk,
    error,
  }
}
