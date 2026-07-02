"use client"

import { motion } from "motion/react"

export type Expression = "happy" | "focus" | "panic"

/**
 * A fully-realized stylized vector student character with facial features,
 * expressive eyes and colorful clothing. Arms can be posed for juggling.
 *
 * `expression` drives eyes/brows/mouth. `juggle` animates the hands.
 */
export function StudentCharacter({
  expression = "happy",
  juggle = false,
  className,
}: {
  expression?: Expression
  juggle?: boolean
  className?: string
}) {
  const armLoop = juggle
    ? {
      // hands rise and fall in an alternating juggling rhythm
      y: [0, -10, 0, 6, 0],
    }
    : {}

  return (
    <svg
      viewBox="0 0 240 300"
      className={className}
      role="img"
      aria-label="Kognit student character"
    >
      <defs>
        <linearGradient id="hoodie" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.55 0.12 350)" />
          <stop offset="100%" stopColor="oklch(0.42 0.1 350)" />
        </linearGradient>
        <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.32 0.03 60)" />
          <stop offset="100%" stopColor="oklch(0.2 0.02 60)" />
        </linearGradient>
        <radialGradient id="charGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="oklch(0.8 0.09 165 / 22%)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* ambient floor glow */}
      <ellipse cx="120" cy="286" rx="72" ry="12" fill="oklch(0 0 0 / 45%)" />
      <rect x="20" y="40" width="200" height="240" fill="url(#charGlow)" />

      {/* ---- BODY / HOODIE ---- */}
      <g>
        {/* torso */}
        <path
          d="M74 168 Q120 150 166 168 L176 268 Q120 284 64 268 Z"
          fill="url(#hoodie)"
          stroke="oklch(0.3 0.06 350)"
          strokeWidth="2"
        />
        {/* hood collar */}
        <path
          d="M96 162 Q120 190 144 162 Q120 176 96 162 Z"
          fill="oklch(0.3 0.06 350)"
        />
        {/* drawstrings */}
        <path d="M112 172 L110 208" stroke="oklch(0.9 0.02 90)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M128 172 L130 206" stroke="oklch(0.9 0.02 90)" strokeWidth="2.5" strokeLinecap="round" />
        {/* pocket */}
        <path d="M96 218 Q120 230 144 218 L140 244 Q120 250 100 244 Z" fill="oklch(0.36 0.09 350)" />
        {/* emerald zip accent */}
        <rect x="118" y="172" width="4" height="70" rx="2" fill="oklch(0.78 0.09 165)" />
      </g>

      {/* ---- LEFT ARM ---- */}
      <motion.g
        style={{ originX: "80px", originY: "180px" }}
        animate={armLoop}
        transition={
          juggle
            ? { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0 }
            : {}
        }
      >
        <path
          d="M78 176 Q54 196 58 230"
          fill="none"
          stroke="url(#hoodie)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* hand */}
        <circle cx="58" cy="234" r="11" fill="oklch(0.78 0.05 60)" />
      </motion.g>

      {/* ---- RIGHT ARM ---- */}
      <motion.g
        style={{ originX: "160px", originY: "180px" }}
        animate={armLoop}
        transition={
          juggle
            ? { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.55 }
            : {}
        }
      >
        <path
          d="M162 176 Q186 196 182 230"
          fill="none"
          stroke="url(#hoodie)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <circle cx="182" cy="234" r="11" fill="oklch(0.78 0.05 60)" />
      </motion.g>

      {/* ---- HEAD ---- */}
      <g>
        {/* neck */}
        <rect x="110" y="148" width="20" height="20" rx="8" fill="oklch(0.74 0.05 60)" />
        {/* face */}
        <circle cx="120" cy="118" r="42" fill="oklch(0.8 0.05 60)" />
        {/* ears */}
        <circle cx="80" cy="120" r="8" fill="oklch(0.78 0.05 60)" />
        <circle cx="160" cy="120" r="8" fill="oklch(0.78 0.05 60)" />
        {/* hair */}
        <path
          d="M80 116 Q78 70 120 66 Q162 70 160 116 Q150 92 120 92 Q90 92 80 116 Z"
          fill="url(#hair)"
        />
        <path d="M118 92 Q100 96 90 112" fill="none" stroke="oklch(0.16 0.02 60)" strokeWidth="2" opacity="0.5" />

        {/* eyebrows */}
        <Brows expression={expression} />
        {/* eyes */}
        <Eyes expression={expression} />
        {/* nose */}
        <path d="M120 118 Q116 128 122 130" fill="none" stroke="oklch(0.6 0.05 60)" strokeWidth="2" strokeLinecap="round" />
        {/* mouth */}
        <Mouth expression={expression} />

        {/* panic sweat */}
        {expression === "panic" && (
          <>
            <motion.path
              d="M156 104 q4 8 0 14 q-4 -6 0 -14 Z"
              fill="oklch(0.7 0.12 220)"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: [0, 1, 1, 0], y: [-4, 6, 14, 20] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeIn" }}
            />
            <motion.path
              d="M86 100 q4 8 0 14 q-4 -6 0 -14 Z"
              fill="oklch(0.7 0.12 220)"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: [0, 1, 1, 0], y: [-4, 6, 14, 20] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeIn", delay: 0.5 }}
            />
          </>
        )}
      </g>
    </svg>
  )
}

function Eyes({ expression }: { expression: Expression }) {
  if (expression === "panic") {
    return (
      <g>
        <circle cx="104" cy="116" r="11" fill="white" />
        <circle cx="136" cy="116" r="11" fill="white" />
        <motion.circle
          cx="104"
          cy="117"
          r="4"
          fill="oklch(0.2 0.02 60)"
          animate={{ x: [-2, 2, -2], y: [-1, 1, -1] }}
          transition={{ duration: 0.35, repeat: Infinity }}
        />
        <motion.circle
          cx="136"
          cy="117"
          r="4"
          fill="oklch(0.2 0.02 60)"
          animate={{ x: [2, -2, 2], y: [1, -1, 1] }}
          transition={{ duration: 0.35, repeat: Infinity }}
        />
      </g>
    )
  }
  const r = expression === "focus" ? 5.5 : 6.5
  return (
    <g>
      <circle cx="104" cy="116" r="8" fill="white" />
      <circle cx="136" cy="116" r="8" fill="white" />
      <circle cx="105" cy="117" r={r} fill="oklch(0.2 0.02 60)" />
      <circle cx="137" cy="117" r={r} fill="oklch(0.2 0.02 60)" />
      <circle cx="107" cy="114" r="1.6" fill="white" />
      <circle cx="139" cy="114" r="1.6" fill="white" />
    </g>
  )
}

function Brows({ expression }: { expression: Expression }) {
  const stroke = "oklch(0.22 0.02 60)"
  if (expression === "panic") {
    return (
      <g stroke={stroke} strokeWidth="3.5" strokeLinecap="round">
        <path d="M94 100 L114 96" fill="none" />
        <path d="M126 96 L146 100" fill="none" />
      </g>
    )
  }
  if (expression === "focus") {
    return (
      <g stroke={stroke} strokeWidth="3.5" strokeLinecap="round">
        <path d="M94 102 L114 101" fill="none" />
        <path d="M126 101 L146 102" fill="none" />
      </g>
    )
  }
  return (
    <g stroke={stroke} strokeWidth="3.5" strokeLinecap="round">
      <path d="M95 100 Q104 96 114 100" fill="none" />
      <path d="M126 100 Q136 96 145 100" fill="none" />
    </g>
  )
}

function Mouth({ expression }: { expression: Expression }) {
  if (expression === "panic") {
    return (
      <motion.ellipse
        cx="120"
        cy="140"
        rx="9"
        ry="11"
        fill="oklch(0.35 0.06 20)"
        animate={{ ry: [11, 8, 11] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    )
  }
  if (expression === "focus") {
    return <path d="M110 140 L130 140" stroke="oklch(0.35 0.06 20)" strokeWidth="3" strokeLinecap="round" fill="none" />
  }
  return (
    <path
      d="M106 138 Q120 152 134 138"
      fill="none"
      stroke="oklch(0.35 0.06 20)"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  )
}
