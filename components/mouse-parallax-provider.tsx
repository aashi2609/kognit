"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

interface MouseCoords {
  /** Normalized X: -1 (left edge) → 1 (right edge) */
  nx: number
  /** Normalized Y: -1 (top edge) → 1 (bottom edge) */
  ny: number
  /** Raw client X */
  cx: number
  /** Raw client Y */
  cy: number
}

const DEFAULT: MouseCoords = { nx: 0, ny: 0, cx: 0, cy: 0 }

const MouseCtx = createContext<MouseCoords>(DEFAULT)

/**
 * Provides normalized mouse coordinates to the entire app tree.
 * Consumed by the parallax background layers, R3F lighting blobs,
 * and the auth-page character eye-tracking system.
 */
export function MouseParallaxProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<MouseCoords>(DEFAULT)
  const raf = useRef<number>(0)
  const latest = useRef<MouseCoords>(DEFAULT)

  const handleMove = useCallback((e: MouseEvent) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1
    const ny = (e.clientY / window.innerHeight) * 2 - 1
    latest.current = { nx, ny, cx: e.clientX, cy: e.clientY }
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMove, { passive: true })

    // Update state at ~30 fps to avoid excessive re-renders
    const tick = () => {
      setCoords(latest.current)
      raf.current = requestAnimationFrame(tick)
    }
    // Use a slower interval to batch updates
    const id = setInterval(() => {
      setCoords(latest.current)
    }, 33)

    return () => {
      window.removeEventListener("mousemove", handleMove)
      cancelAnimationFrame(raf.current)
      clearInterval(id)
    }
  }, [handleMove])

  return <MouseCtx.Provider value={coords}>{children}</MouseCtx.Provider>
}

/** Hook to read normalized mouse coordinates anywhere in the tree. */
export function useMouseParallax() {
  return useContext(MouseCtx)
}
