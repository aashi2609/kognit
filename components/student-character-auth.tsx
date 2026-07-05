"use client"

import { motion } from "motion/react"
import { useMouseParallax } from "@/components/mouse-parallax-provider"
import { StudentCharacter } from "@/components/student-character"

/**
 * Auth-page variant of the student character.
 * - Continuously tracks the user's cursor across the entire viewport
 * - Plays a "no peeking" cover-eyes gesture when `coverEyes` is true
 * - Includes subtle idle breathing animation
 */
export function StudentCharacterAuth({
  coverEyes = false,
}: {
  coverEyes?: boolean
}) {
  const mouse = useMouseParallax()

  // Map normalized mouse coords to eye target range
  const eyeTarget = {
    x: mouse.nx,
    y: mouse.ny,
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Ambient glow behind character */}
      <div
        className="pointer-events-none absolute h-[70%] w-[70%] rounded-full blur-[80px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.78 0.09 165 / 15%), transparent 70%)",
        }}
      />

      {/* Breathing idle animation wrapper */}
      <motion.div
        className="relative h-[320px] w-[260px]"
        animate={{
          scaleY: [1, 1.008, 1],
          y: [0, -2, 0],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <StudentCharacter
          expression={coverEyes ? "focus" : "happy"}
          eyeTarget={eyeTarget}
          coverEyes={coverEyes}
          className="h-full w-full"
        />
      </motion.div>

      {/* Floor shadow */}
      <div
        className="absolute bottom-[8%] h-4 w-[60%] rounded-[50%]"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0 0 0 / 40%), transparent 70%)",
        }}
      />
    </div>
  )
}
