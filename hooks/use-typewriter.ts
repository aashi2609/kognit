"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Types out `text` character-by-character once the element scrolls into view.
 * Returns the current substring and a ref to attach to the container.
 */
export function useTypewriter(text: string, speed = 22, startDelay = 200) {
  const [output, setOutput] = useState("")
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || started) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    let i = 0
    let interval: ReturnType<typeof setInterval>
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        i += 1
        setOutput(text.slice(0, i))
        if (i >= text.length) clearInterval(interval)
      }, speed)
    }, startDelay)
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [started, text, speed, startDelay])

  const done = output.length >= text.length
  return { output, ref, started, done }
}
