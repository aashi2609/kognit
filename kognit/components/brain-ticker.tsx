"use client"

import { motion } from "motion/react"
import { useMemo } from "react"

const THOUGHTS = [
  "What was the base case?",
  "Should I use a pointer?",
  "Did the AI use Merge Sort?",
  "What do I say next?",
  "Is this O(n log n)?",
  "Where does recursion stop?",
  "Do I need a hash map?",
  "Why did I write this?",
  "What's the invariant?",
  "Is the array sorted?",
  "Off by one again?",
  "Do I explain the loop?",
  "Stack or queue?",
  "What's the space cost?",
  "How does merge work?",
  "Did I miss an edge case?",
]

/**
 * A frantic looping ticker of panic-thoughts floating inside the
 * "mental workspace" brain bubble.
 */
export function BrainTicker() {
  const items = useMemo(
    () =>
      THOUGHTS.map((t, i) => ({
        text: t,
        top: `${(i * 61) % 88}%`,
        left: `${(i * 47) % 78}%`,
        dur: 3 + (i % 4) * 0.8,
        delay: (i % 6) * 0.35,
        size: i % 3 === 0 ? "text-[11px]" : "text-[10px]",
      })),
    [],
  )

  return (
    <div className="absolute inset-0 overflow-hidden">
      {items.map((it, i) => (
        <motion.span
          key={i}
          className={`absolute whitespace-nowrap font-mono ${it.size} text-accent/70`}
          style={{ top: it.top, left: it.left }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0, 0.9, 0.9, 0],
            scale: [0.8, 1, 1, 0.85],
            y: [6, -10, -18, -28],
          }}
          transition={{
            duration: it.dur,
            repeat: Infinity,
            delay: it.delay,
            ease: "easeInOut",
          }}
        >
          {it.text}
        </motion.span>
      ))}
    </div>
  )
}
