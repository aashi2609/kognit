"use client"

import { motion } from "motion/react"

export type Expression = "happy" | "focus" | "panic" | "shock"

/**
 * A fully-realized stylized vector student character with:
 * - Techwear hoodie with geometric fabric folds, zipper teeth, hood detail
 * - Full articulated arms with elbow joints and forearm segments
 * - Distinct 4-finger + thumb silhouette hands (not circles)
 * - Expressive face system (happy, focus, panic, shock)
 *
 * Props:
 * - `expression` — drives eyes, brows, mouth, body language
 * - `juggle` — animates arms in independent elliptical cascade paths
 * - `eyeTarget` — {x,y} normalized coords for pupil/head tracking
 * - `coverEyes` — arms raise to cover eyes ("no peeking" gesture)
 */
export function StudentCharacter({
  expression = "happy",
  juggle = false,
  eyeTarget,
  coverEyes = false,
  className,
}: {
  expression?: Expression
  juggle?: boolean
  eyeTarget?: { x: number; y: number }
  coverEyes?: boolean
  className?: string
}) {
  // Compute pupil offsets from eye target
  const pupilDx = eyeTarget ? Math.max(-4, Math.min(4, eyeTarget.x * 5)) : 0
  const pupilDy = eyeTarget ? Math.max(-3, Math.min(3, eyeTarget.y * 3)) : 0
  const headTilt = eyeTarget ? eyeTarget.x * 3 : 0

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
        <linearGradient id="hoodieDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.45 0.1 350)" />
          <stop offset="100%" stopColor="oklch(0.32 0.08 350)" />
        </linearGradient>
        <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.32 0.03 60)" />
          <stop offset="100%" stopColor="oklch(0.2 0.02 60)" />
        </linearGradient>
        <radialGradient id="charGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="oklch(0.8 0.09 165 / 22%)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.05 60)" />
          <stop offset="100%" stopColor="oklch(0.76 0.05 60)" />
        </linearGradient>
      </defs>

      {/* Ambient floor glow */}
      <ellipse cx="120" cy="286" rx="72" ry="12" fill="oklch(0 0 0 / 45%)" />
      <rect x="20" y="40" width="200" height="240" fill="url(#charGlow)" />

      {/* ---- BODY / TECHWEAR HOODIE ---- */}
      <g>
        {/* Main torso */}
        <path
          d="M74 168 Q120 150 166 168 L176 268 Q120 284 64 268 Z"
          fill="url(#hoodie)"
          stroke="oklch(0.3 0.06 350)"
          strokeWidth="1.5"
        />
        {/* Geometric fabric fold lines (techwear detailing) */}
        <path
          d="M88 180 L80 230"
          fill="none"
          stroke="oklch(0.38 0.08 350)"
          strokeWidth="1.2"
          opacity="0.5"
        />
        <path
          d="M152 180 L160 230"
          fill="none"
          stroke="oklch(0.38 0.08 350)"
          strokeWidth="1.2"
          opacity="0.5"
        />
        <path
          d="M96 200 Q120 210 144 200"
          fill="none"
          stroke="oklch(0.38 0.08 350)"
          strokeWidth="1"
          opacity="0.4"
        />
        {/* Chevron seam detail */}
        <path
          d="M104 188 L120 198 L136 188"
          fill="none"
          stroke="oklch(0.48 0.06 350)"
          strokeWidth="1.5"
          opacity="0.35"
        />
        <path
          d="M108 210 L120 218 L132 210"
          fill="none"
          stroke="oklch(0.48 0.06 350)"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Hood */}
        <path
          d="M82 160 Q120 142 158 160 Q120 168 82 160 Z"
          fill="oklch(0.48 0.1 350)"
        />
        {/* Hood inner shadow */}
        <path
          d="M90 158 Q120 148 150 158 Q120 164 90 158 Z"
          fill="oklch(0.3 0.06 350)"
          opacity="0.5"
        />
        {/* Drawstring loops */}
        <path
          d="M108 168 Q106 172 108 176 L107 206"
          stroke="oklch(0.9 0.02 90)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="107" cy="208" r="2" fill="oklch(0.85 0.02 90)" />
        <path
          d="M132 168 Q134 172 132 176 L133 204"
          stroke="oklch(0.9 0.02 90)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="133" cy="206" r="2" fill="oklch(0.85 0.02 90)" />

        {/* Zipper with teeth */}
        <rect x="118" y="170" width="4" height="74" rx="2" fill="oklch(0.78 0.09 165)" />
        {/* Individual zipper teeth */}
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={`zip-${i}`}>
            <rect
              x="116"
              y={174 + i * 6}
              width="3"
              height="2"
              rx="0.5"
              fill="oklch(0.65 0.07 165)"
            />
            <rect
              x="121"
              y={174 + i * 6}
              width="3"
              height="2"
              rx="0.5"
              fill="oklch(0.65 0.07 165)"
            />
          </g>
        ))}
        {/* Zipper pull tab */}
        <rect x="117" y="170" width="6" height="5" rx="1" fill="oklch(0.7 0.08 165)" />

        {/* Kangaroo pocket */}
        <path
          d="M94 224 Q120 234 146 224 L142 250 Q120 256 98 250 Z"
          fill="oklch(0.36 0.09 350)"
          stroke="oklch(0.3 0.06 350)"
          strokeWidth="1"
        />
        {/* Pocket seam */}
        <path
          d="M96 226 Q120 235 144 226"
          fill="none"
          stroke="oklch(0.28 0.05 350)"
          strokeWidth="1.5"
        />
      </g>

      {/* ---- LEFT ARM ---- */}
      <motion.g
        style={{ originX: "80px", originY: "180px" }}
        animate={
          coverEyes
            ? { rotate: -65, x: 30, y: -60 }
            : expression === "shock"
              ? { rotate: -30, x: 15, y: -40 }
              : juggle
                ? { rotate: [0, -8, 0, 8, 0] }
                : {}
        }
        transition={
          coverEyes
            ? { type: "spring", stiffness: 120, damping: 14 }
            : expression === "shock"
              ? { type: "spring", stiffness: 100, damping: 12 }
              : juggle
                ? { duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0 }
                : {}
        }
      >
        {/* Shoulder joint */}
        <circle cx="78" cy="174" r="10" fill="url(#hoodie)" />
        {/* Upper arm */}
        <path
          d="M78 176 Q62 196 60 210"
          fill="none"
          stroke="url(#hoodie)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Elbow joint */}
        <circle cx="60" cy="210" r="7" fill="url(#hoodieDark)" />
        {/* Forearm */}
        <path
          d="M60 210 Q56 222 58 234"
          fill="none"
          stroke="url(#hoodieDark)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Hand — articulated fingers */}
        <g>
          {/* Palm */}
          <path
            d="M50 230 Q58 226 66 230 Q68 240 58 244 Q48 240 50 230 Z"
            fill="url(#skinGrad)"
          />
          {/* Thumb */}
          <path
            d="M50 232 Q44 230 42 236 Q44 240 48 238"
            fill="url(#skinGrad)"
            stroke="oklch(0.7 0.04 60)"
            strokeWidth="0.8"
          />
          {/* Index finger */}
          <path
            d="M53 244 Q52 252 54 256"
            fill="none"
            stroke="url(#skinGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Middle finger */}
          <path
            d="M58 244 Q57 254 58 258"
            fill="none"
            stroke="url(#skinGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Ring finger */}
          <path
            d="M63 244 Q63 252 62 255"
            fill="none"
            stroke="url(#skinGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Pinky */}
          <path
            d="M67 242 Q68 248 66 251"
            fill="none"
            stroke="url(#skinGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </motion.g>

      {/* ---- RIGHT ARM ---- */}
      <motion.g
        style={{ originX: "160px", originY: "180px" }}
        animate={
          coverEyes
            ? { rotate: 65, x: -30, y: -60 }
            : expression === "shock"
              ? { rotate: 30, x: -15, y: -40 }
              : juggle
                ? { rotate: [0, 8, 0, -8, 0] }
                : {}
        }
        transition={
          coverEyes
            ? { type: "spring", stiffness: 120, damping: 14 }
            : expression === "shock"
              ? { type: "spring", stiffness: 100, damping: 12 }
              : juggle
                ? {
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.6,
                  }
                : {}
        }
      >
        {/* Shoulder joint */}
        <circle cx="162" cy="174" r="10" fill="url(#hoodie)" />
        {/* Upper arm */}
        <path
          d="M162 176 Q178 196 180 210"
          fill="none"
          stroke="url(#hoodie)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Elbow joint */}
        <circle cx="180" cy="210" r="7" fill="url(#hoodieDark)" />
        {/* Forearm */}
        <path
          d="M180 210 Q184 222 182 234"
          fill="none"
          stroke="url(#hoodieDark)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Hand — articulated fingers */}
        <g>
          {/* Palm */}
          <path
            d="M174 230 Q182 226 190 230 Q192 240 182 244 Q172 240 174 230 Z"
            fill="url(#skinGrad)"
          />
          {/* Thumb */}
          <path
            d="M190 232 Q196 230 198 236 Q196 240 192 238"
            fill="url(#skinGrad)"
            stroke="oklch(0.7 0.04 60)"
            strokeWidth="0.8"
          />
          {/* Index */}
          <path
            d="M177 244 Q176 252 178 256"
            fill="none"
            stroke="url(#skinGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Middle */}
          <path
            d="M182 244 Q181 254 182 258"
            fill="none"
            stroke="url(#skinGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Ring */}
          <path
            d="M187 244 Q187 252 186 255"
            fill="none"
            stroke="url(#skinGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Pinky */}
          <path
            d="M191 242 Q192 248 190 251"
            fill="none"
            stroke="url(#skinGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </motion.g>

      {/* ---- HEAD ---- */}
      <motion.g
        animate={
          eyeTarget
            ? { rotate: headTilt }
            : expression === "shock"
              ? { y: [0, -2, 1, -1, 0] }
              : {}
        }
        transition={
          eyeTarget
            ? { type: "spring", stiffness: 80, damping: 20 }
            : { duration: 0.3, repeat: Infinity }
        }
        style={{ originX: "120px", originY: "120px" }}
      >
        {/* Neck */}
        <rect
          x="110"
          y="148"
          width="20"
          height="20"
          rx="8"
          fill="oklch(0.74 0.05 60)"
        />
        {/* Face */}
        <circle cx="120" cy="118" r="42" fill="oklch(0.8 0.05 60)" />
        {/* Face contour shadow */}
        <path
          d="M82 130 Q120 150 158 130"
          fill="none"
          stroke="oklch(0.7 0.04 60)"
          strokeWidth="1"
          opacity="0.3"
        />
        {/* Ears */}
        <ellipse cx="79" cy="120" rx="7" ry="9" fill="oklch(0.78 0.05 60)" />
        <ellipse
          cx="79"
          cy="120"
          rx="4"
          ry="5"
          fill="oklch(0.72 0.04 60)"
          opacity="0.5"
        />
        <ellipse cx="161" cy="120" rx="7" ry="9" fill="oklch(0.78 0.05 60)" />
        <ellipse
          cx="161"
          cy="120"
          rx="4"
          ry="5"
          fill="oklch(0.72 0.04 60)"
          opacity="0.5"
        />

        {/* Hair */}
        <path
          d="M80 116 Q78 68 120 64 Q162 68 160 116 Q150 90 120 90 Q90 90 80 116 Z"
          fill="url(#hair)"
        />
        {/* Hair highlights */}
        <path
          d="M118 90 Q100 94 90 110"
          fill="none"
          stroke="oklch(0.38 0.03 60)"
          strokeWidth="2"
          opacity="0.4"
        />
        <path
          d="M122 88 Q140 92 150 106"
          fill="none"
          stroke="oklch(0.38 0.03 60)"
          strokeWidth="1.5"
          opacity="0.3"
        />
        {/* Fringe detail */}
        <path
          d="M94 96 Q108 86 120 90 Q132 86 146 96"
          fill="none"
          stroke="oklch(0.26 0.025 60)"
          strokeWidth="3"
          opacity="0.4"
        />

        {/* Eyebrows */}
        <Brows expression={expression} />
        {/* Eyes */}
        <Eyes
          expression={expression}
          pupilDx={pupilDx}
          pupilDy={pupilDy}
          coverEyes={coverEyes}
        />
        {/* Nose */}
        <path
          d="M120 118 Q116 128 122 130"
          fill="none"
          stroke="oklch(0.6 0.05 60)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Mouth */}
        <Mouth expression={expression} />

        {/* Panic sweat */}
        {(expression === "panic" || expression === "shock") && (
          <>
            <motion.path
              d="M156 104 q4 8 0 14 q-4 -6 0 -14 Z"
              fill="oklch(0.7 0.12 220)"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: [0, 1, 1, 0], y: [-4, 6, 14, 20] }}
              transition={{ duration: 1.0, repeat: Infinity, ease: "easeIn" }}
            />
            <motion.path
              d="M86 100 q4 8 0 14 q-4 -6 0 -14 Z"
              fill="oklch(0.7 0.12 220)"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: [0, 1, 1, 0], y: [-4, 6, 14, 20] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeIn",
                delay: 0.3,
              }}
            />
            <motion.path
              d="M168 90 q3 6 0 10 q-3 -5 0 -10 Z"
              fill="oklch(0.7 0.12 220)"
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: [0, 0.8, 0.8, 0], y: [-2, 4, 10, 16] }}
              transition={{
                duration: 1.3,
                repeat: Infinity,
                ease: "easeIn",
                delay: 0.7,
              }}
            />
          </>
        )}

        {/* Shock expression: stress lines near temples */}
        {expression === "shock" && (
          <>
            <motion.g
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <line
                x1="72"
                y1="100"
                x2="66"
                y2="96"
                stroke="oklch(0.8 0.07 350)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="72"
                y1="106"
                x2="64"
                y2="106"
                stroke="oklch(0.8 0.07 350)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="168"
                y1="100"
                x2="174"
                y2="96"
                stroke="oklch(0.8 0.07 350)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="168"
                y1="106"
                x2="176"
                y2="106"
                stroke="oklch(0.8 0.07 350)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </motion.g>
          </>
        )}
      </motion.g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function Eyes({
  expression,
  pupilDx = 0,
  pupilDy = 0,
  coverEyes = false,
}: {
  expression: Expression
  pupilDx?: number
  pupilDy?: number
  coverEyes?: boolean
}) {
  // When covering eyes, render squinting slits
  if (coverEyes) {
    return (
      <g>
        <path
          d="M96 116 L112 116"
          stroke="oklch(0.2 0.02 60)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M128 116 L144 116"
          stroke="oklch(0.2 0.02 60)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    )
  }

  if (expression === "panic") {
    return (
      <g>
        {/* Wide-open panic eyes */}
        <circle cx="104" cy="116" r="12" fill="white" />
        <circle cx="136" cy="116" r="12" fill="white" />
        {/* Dilated pupils darting around */}
        <motion.circle
          cx={104}
          cy={117}
          r="5"
          fill="oklch(0.2 0.02 60)"
          animate={{ x: [-3, 3, -2, 4, -3], y: [-2, 2, -1, 1, -2] }}
          transition={{ duration: 0.4, repeat: Infinity }}
        />
        <motion.circle
          cx={136}
          cy={117}
          r="5"
          fill="oklch(0.2 0.02 60)"
          animate={{ x: [3, -3, 2, -4, 3], y: [2, -2, 1, -1, 2] }}
          transition={{ duration: 0.4, repeat: Infinity }}
        />
        {/* Tiny highlight */}
        <circle cx="106" cy="114" r="1.5" fill="white" opacity="0.8" />
        <circle cx="138" cy="114" r="1.5" fill="white" opacity="0.8" />
      </g>
    )
  }

  if (expression === "shock") {
    return (
      <g>
        {/* Even wider shock eyes */}
        <circle cx="104" cy="116" r="13" fill="white" />
        <circle cx="136" cy="116" r="13" fill="white" />
        {/* Very dilated pupils */}
        <motion.circle
          cx={104}
          cy={117}
          r="6"
          fill="oklch(0.15 0.02 60)"
          animate={{ r: [6, 7, 6], x: [-1, 1, -1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <motion.circle
          cx={136}
          cy={117}
          r="6"
          fill="oklch(0.15 0.02 60)"
          animate={{ r: [6, 7, 6], x: [1, -1, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        {/* Iris ring */}
        <circle
          cx="104"
          cy="117"
          r="9"
          fill="none"
          stroke="oklch(0.55 0.08 165)"
          strokeWidth="1"
          opacity="0.4"
        />
        <circle
          cx="136"
          cy="117"
          r="9"
          fill="none"
          stroke="oklch(0.55 0.08 165)"
          strokeWidth="1"
          opacity="0.4"
        />
        <circle cx="107" cy="113" r="2" fill="white" opacity="0.9" />
        <circle cx="139" cy="113" r="2" fill="white" opacity="0.9" />
      </g>
    )
  }

  // Happy or focus — supports eyeTarget tracking
  const r = expression === "focus" ? 5.5 : 6.5
  return (
    <g>
      <circle cx="104" cy="116" r="8" fill="white" />
      <circle cx="136" cy="116" r="8" fill="white" />
      <circle cx={105 + pupilDx} cy={117 + pupilDy} r={r} fill="oklch(0.2 0.02 60)" />
      <circle cx={137 + pupilDx} cy={117 + pupilDy} r={r} fill="oklch(0.2 0.02 60)" />
      <circle cx={107 + pupilDx * 0.5} cy={114 + pupilDy * 0.3} r="1.6" fill="white" />
      <circle cx={139 + pupilDx * 0.5} cy={114 + pupilDy * 0.3} r="1.6" fill="white" />
    </g>
  )
}

function Brows({ expression }: { expression: Expression }) {
  const stroke = "oklch(0.22 0.02 60)"
  if (expression === "panic" || expression === "shock") {
    const lift = expression === "shock" ? -4 : 0
    return (
      <g stroke={stroke} strokeWidth="3.5" strokeLinecap="round">
        <path d={`M94 ${100 + lift} L114 ${96 + lift}`} fill="none" />
        <path d={`M126 ${96 + lift} L146 ${100 + lift}`} fill="none" />
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
  if (expression === "shock") {
    return (
      <motion.ellipse
        cx="120"
        cy="142"
        rx="7"
        ry="9"
        fill="oklch(0.35 0.06 20)"
        animate={{ ry: [9, 12, 9], cy: [142, 140, 142] }}
        transition={{ duration: 0.7, repeat: Infinity }}
      />
    )
  }
  if (expression === "focus") {
    return (
      <path
        d="M110 140 L130 140"
        stroke="oklch(0.35 0.06 20)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    )
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
