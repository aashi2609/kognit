"use client"

import { motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { PanelFrame } from "@/components/panel-frame"

const CODE = `function twoSum(nums, target) {
  const seen = new Map()
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]
    if (seen.has(need)) {
      return [seen.get(need), i]
    }
    seen.set(nums[i], i)
  }
  return []
}`

/**
 * ACT 3 — code types itself out instantly, then a textured diagonal warning
 * screen drops over the workspace before auto-advancing to the interview.
 */
export function ActCloneConsole({ onComplete }: { onComplete: () => void }) {
  const [typed, setTyped] = useState(0)
  const [warn, setWarn] = useState(false)
  const skippedRef = useRef(false)

  const skip = useCallback(() => {
    if (skippedRef.current) return
    skippedRef.current = true
    onComplete()
  }, [onComplete])

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i += 3
      setTyped(i)
      if (i >= CODE.length) clearInterval(interval)
    }, 12)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const t1 = window.setTimeout(() => setWarn(true), 1500)
    const t2 = window.setTimeout(skip, 4200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [skip])

  // Skip on any click or key press
  useEffect(() => {
    const onClick = () => skip()
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      skip()
    }
    window.addEventListener("click", onClick)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("click", onClick)
      window.removeEventListener("keydown", onKey)
    }
  }, [skip])

  const lines = CODE.slice(0, typed).split("\n")
  const done = typed >= CODE.length

  return (
    <div className="w-full max-w-2xl">
      <SectionTag index="01" title="The Automatic Clone" accent="neutral" />
      <PanelFrame label="clone.snapshot.ts" accent="neutral" className="relative">
        <div className="relative">
          <pre className="min-h-[300px] overflow-x-auto px-6 py-6 font-mono text-[13px] leading-relaxed">
            <code>
              {lines.map((line, i) => (
                <div key={i} className="flex gap-4">
                  <span className="w-6 select-none text-right tabular-nums text-white/15">
                    {i + 1}
                  </span>
                  <span className="text-foreground/80">{line}</span>
                </div>
              ))}
              {!done && (
                <span className="ml-10 inline-block h-4 w-2 animate-pulse bg-primary/70 align-middle" />
              )}
            </code>
          </pre>

          {/* Textured diagonal warning screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: warn ? 1 : 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-neutral-950/70 backdrop-blur-[3px]"
          >
            {/* diagonal hazard stripes */}
            <div
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, oklch(0.7 0.02 90) 0 14px, transparent 14px 34px)",
              }}
            />
            <div className="absolute inset-0 fractured-grid opacity-40" />
            <motion.div
              initial={{ scale: 0.94, y: 8 }}
              animate={{ scale: warn ? 1 : 0.94, y: warn ? 0 : 8 }}
              transition={{ duration: 0.5 }}
              className="relative mx-6 max-w-md border border-destructive/40 bg-neutral-900/80 px-5 py-4"
            >
              <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em]">
                <span className="text-destructive">[ critical disconnect ]</span>
                <br />
                <span className="mt-2 block text-foreground">
                  code is executing, but the student has zero logical retention
                </span>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </PanelFrame>
    </div>
  )
}

export function SectionTag({
  index,
  title,
  accent = "emerald",
}: {
  index: string
  title: string
  accent?: "emerald" | "pink" | "neutral"
}) {
  const dot =
    accent === "pink"
      ? "bg-accent"
      : accent === "neutral"
        ? "bg-muted-foreground"
        : "bg-primary"
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground/60">
        {index}
      </span>
      <span className={`h-1 w-1 rounded-full ${dot}`} />
      <h3 className="font-mono text-sm uppercase tracking-[0.24em] text-foreground/90">
        {title}
      </h3>
    </div>
  )
}
