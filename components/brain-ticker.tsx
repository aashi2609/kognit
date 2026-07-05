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
  "I can't think straight...",
  "They're watching me...",
  "Why is this so hard?",
  "Should I ask to clarify?",
]

/**
 * A frantic looping ticker of panic-thoughts floating inside the
 * "mental workspace" brain bubble.
 *
 * UPGRADED: Bolder font weight, stronger text shadows for legibility,
 * more desperate thoughts added to the rotation.
 */
export function BrainTicker() {
  const items = useMemo(
    () =>
      THOUGHTS.map((t, i) => ({
        text: t,
        top: `${(i * 61) % 88}%`,
        left: `${(i * 47) % 78}%`,
        dur: 2.8 + (i % 4) * 0.6,
        delay: (i % 8) * 0.3,
        size: i % 3 === 0 ? "text-[11px] font-bold" : "text-[10px] font-semibold",
      })),
    [],
  )

  return (
    <div className="absolute inset-0 overflow-hidden">
      {items.map((it, i) => (
        <motion.span
          key={i}
          className={`absolute whitespace-nowrap font-mono ${it.size} text-accent/80`}
          style={{
            top: it.top,
            left: it.left,
            textShadow:
              "0 0 6px oklch(0.78 0.07 350 / 60%), 0 1px 3px oklch(0 0 0 / 50%)",
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0, 0.95, 0.95, 0],
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
