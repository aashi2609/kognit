"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float } from "@react-three/drei"
import * as THREE from "three"
import { motion } from "motion/react"
import { useMouseParallax } from "@/components/mouse-parallax-provider"

/* ------------------------------------------------------------------ */
/*  R3F animated gradient blobs (emerald-teal & cosmic pink-magenta)  */
/* ------------------------------------------------------------------ */

function GradientBlob({
  color,
  position,
  floatRange,
  speed,
}: {
  color: string
  position: [number, number, number]
  floatRange: number
  speed: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    elapsed.current += delta * speed
    const t = elapsed.current
    // Subtle scaling oscillation
    const s = 1 + Math.sin(t) * 0.12
    meshRef.current.scale.set(s, s * 0.95, s)
    // Gentle position drift
    meshRef.current.position.x = position[0] + Math.sin(t * 0.7) * floatRange
    meshRef.current.position.y =
      position[1] + Math.cos(t * 0.5) * floatRange * 0.6
  })

  return (
    <Float speed={speed * 0.5} floatIntensity={0.3} rotationIntensity={0.1}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[2.8, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Float>
  )
}

function LightScene() {
  return (
    <>
      <ambientLight intensity={0.08} color="#1a1a2e" />
      <GradientBlob
        color="#34d399"
        position={[-3, 1.5, -4]}
        floatRange={1.2}
        speed={0.35}
      />
      <GradientBlob
        color="#e879a8"
        position={[3, -1, -3]}
        floatRange={1.0}
        speed={0.28}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Parallax SVG cityscape layers                                      */
/* ------------------------------------------------------------------ */

/** Neon cityscape silhouette visible through "windows" */
function CityscapeSilhouette({ depth }: { depth: number }) {
  const mouse = useMouseParallax()
  const tx = mouse.nx * depth * 12
  const ty = mouse.ny * depth * 6

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ transform: `translate(${tx}px, ${ty}px)` }}
    >
      {/* Horizon glow */}
      <div
        className="absolute inset-x-0 bottom-[28%] h-[40%]"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 100%, oklch(0.45 0.1 300 / 30%), oklch(0.3 0.08 265 / 15%) 50%, transparent 80%)",
        }}
      />
      {/* Building silhouettes */}
      <svg
        viewBox="0 0 1200 300"
        className="absolute inset-x-0 bottom-[18%] h-[35%] w-full opacity-60"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="bldg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.18 0.025 275)" />
            <stop offset="100%" stopColor="oklch(0.1 0.015 280)" />
          </linearGradient>
        </defs>
        {/* Skyline array */}
        {[
          { x: 30, w: 50, h: 180 },
          { x: 90, w: 35, h: 130 },
          { x: 140, w: 70, h: 240 },
          { x: 220, w: 40, h: 160 },
          { x: 280, w: 55, h: 200 },
          { x: 350, w: 30, h: 110 },
          { x: 400, w: 80, h: 270 },
          { x: 500, w: 45, h: 190 },
          { x: 560, w: 60, h: 220 },
          { x: 640, w: 35, h: 140 },
          { x: 700, w: 75, h: 260 },
          { x: 790, w: 40, h: 170 },
          { x: 850, w: 55, h: 210 },
          { x: 920, w: 30, h: 120 },
          { x: 970, w: 65, h: 250 },
          { x: 1050, w: 50, h: 180 },
          { x: 1120, w: 40, h: 150 },
        ].map((b, i) => (
          <g key={i}>
            <rect
              x={b.x}
              y={300 - b.h}
              width={b.w}
              height={b.h}
              fill="url(#bldg1)"
            />
            {/* Window lights */}
            {Array.from({ length: Math.floor(b.h / 20) }).map((_, j) =>
              Array.from({ length: Math.floor(b.w / 14) }).map((_, k) => {
                const lit = (i + j + k) % 3 !== 0
                const hue =
                  (i + k) % 5 === 0
                    ? "oklch(0.85 0.1 90 / 80%)"
                    : (i + j) % 7 === 0
                      ? "oklch(0.8 0.09 350 / 60%)"
                      : (i + k) % 4 === 0
                        ? "oklch(0.82 0.1 165 / 55%)"
                        : "oklch(0.6 0.03 90 / 20%)"
                return lit ? (
                  <rect
                    key={`${j}-${k}`}
                    x={b.x + 5 + k * 14}
                    y={300 - b.h + 8 + j * 20}
                    width={6}
                    height={3}
                    rx={0.5}
                    fill={hue}
                  />
                ) : null
              }),
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Studio interior foreground elements (desk silhouettes, plant outlines) */
function StudioForeground({ depth }: { depth: number }) {
  const mouse = useMouseParallax()
  const tx = mouse.nx * depth * 18
  const ty = mouse.ny * depth * 8

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ transform: `translate(${tx}px, ${ty}px)` }}
    >
      {/* Floor reflection */}
      <div
        className="absolute inset-x-0 bottom-0 h-[20%]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, oklch(0.5 0.05 60 / 15%), transparent 70%)",
        }}
      />
      {/* Side workstation silhouettes */}
      <div className="absolute bottom-[4%] left-[3%] h-[18%] w-[12%] opacity-30">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {/* Monitor */}
          <rect
            x="20"
            y="10"
            width="60"
            height="42"
            rx="3"
            fill="oklch(0.12 0.01 265)"
            stroke="oklch(1 0 0 / 8%)"
            strokeWidth="1"
          />
          <rect
            x="24"
            y="14"
            width="52"
            height="34"
            rx="1"
            fill="oklch(0.18 0.04 165 / 30%)"
          />
          {/* Stand */}
          <rect x="44" y="52" width="12" height="8" fill="oklch(0.15 0.01 265)" />
          {/* Desk */}
          <rect
            x="8"
            y="60"
            width="84"
            height="6"
            rx="2"
            fill="oklch(0.25 0.04 55)"
          />
          {/* Chair */}
          <ellipse cx="50" cy="90" rx="18" ry="6" fill="oklch(0.16 0.01 265)" />
          <rect
            x="38"
            y="66"
            width="24"
            height="20"
            rx="8"
            fill="oklch(0.2 0.02 265)"
          />
        </svg>
      </div>
      <div
        className="absolute bottom-[4%] right-[3%] h-[18%] w-[12%] opacity-30"
        style={{ transform: "scaleX(-1)" }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <rect
            x="20"
            y="10"
            width="60"
            height="42"
            rx="3"
            fill="oklch(0.12 0.01 265)"
            stroke="oklch(1 0 0 / 8%)"
            strokeWidth="1"
          />
          <rect
            x="24"
            y="14"
            width="52"
            height="34"
            rx="1"
            fill="oklch(0.18 0.04 350 / 30%)"
          />
          <rect x="44" y="52" width="12" height="8" fill="oklch(0.15 0.01 265)" />
          <rect
            x="8"
            y="60"
            width="84"
            height="6"
            rx="2"
            fill="oklch(0.25 0.04 55)"
          />
          <ellipse cx="50" cy="90" rx="18" ry="6" fill="oklch(0.16 0.01 265)" />
          <rect
            x="38"
            y="66"
            width="24"
            height="20"
            rx="8"
            fill="oklch(0.2 0.02 265)"
          />
        </svg>
      </div>

      {/* Potted plant silhouettes */}
      <svg
        viewBox="0 0 60 120"
        className="absolute bottom-[2%] left-[16%] h-[14%] w-[5%] opacity-25"
      >
        <path
          d="M30 120 C10 90 8 50 22 20"
          fill="none"
          stroke="oklch(0.5 0.11 150)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M30 120 C30 80 30 50 30 10"
          fill="none"
          stroke="oklch(0.55 0.12 150)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M30 120 C50 90 52 50 38 20"
          fill="none"
          stroke="oklch(0.48 0.1 150)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect
          x="14"
          y="105"
          width="32"
          height="15"
          rx="3"
          fill="oklch(0.45 0.08 40)"
        />
      </svg>
      <svg
        viewBox="0 0 60 120"
        className="absolute bottom-[2%] right-[16%] h-[16%] w-[5%] opacity-25"
        style={{ transform: "scaleX(-1)" }}
      >
        <path
          d="M30 120 C10 90 8 50 22 20"
          fill="none"
          stroke="oklch(0.5 0.11 150)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M30 120 C30 80 30 50 30 10"
          fill="none"
          stroke="oklch(0.55 0.12 150)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M30 120 C50 90 52 50 38 20"
          fill="none"
          stroke="oklch(0.48 0.1 150)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect
          x="14"
          y="105"
          width="32"
          height="15"
          rx="3"
          fill="oklch(0.45 0.08 40)"
        />
      </svg>
    </div>
  )
}

/** Window-frame overlay with frosted glass panes showing the cityscape */
function WindowFrames({ depth }: { depth: number }) {
  const mouse = useMouseParallax()
  const tx = mouse.nx * depth * 14
  const ty = mouse.ny * depth * 5

  return (
    <div
      className="pointer-events-none absolute inset-x-[6%] top-[5%] bottom-[35%]"
      style={{ transform: `translate(${tx}px, ${ty}px)` }}
    >
      <div className="flex h-full gap-[3px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="relative flex-1 overflow-hidden rounded-sm"
            style={{
              boxShadow:
                "inset 0 0 0 1.5px oklch(1 0 0 / 6%), 0 0 20px oklch(0.3 0.05 265 / 15%)",
              background:
                "linear-gradient(180deg, oklch(0.12 0.02 265 / 40%) 0%, oklch(0.08 0.015 275 / 50%) 100%)",
            }}
          >
            {/* Mullion */}
            <div className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 bg-white/[0.06]" />
            {/* Cross bar */}
            <div className="absolute inset-x-0 top-[45%] h-[1.5px] bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Ceiling LED strips                                                 */
/* ------------------------------------------------------------------ */
function CeilingStrips() {
  return (
    <div className="pointer-events-none absolute inset-x-[5%] top-[3%] flex justify-around">
      {Array.from({ length: 11 }).map((_, i) => {
        const green = i % 2 === 0
        return (
          <motion.div
            key={i}
            className="h-[2px] w-[6%] rounded-full blur-[1px]"
            style={{
              background: green
                ? "linear-gradient(to right, transparent, oklch(0.82 0.11 165 / 70%), transparent)"
                : "linear-gradient(to right, transparent, oklch(0.8 0.09 350 / 70%), transparent)",
            }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main exported component                                            */
/* ------------------------------------------------------------------ */

/**
 * Persistent cyber-classroom environment rendered in the root layout.
 * Stays continuous and unbroken across all route transitions.
 *
 * Layers (back → front):
 *  1. Deep obsidian base
 *  2. R3F Canvas — animated emerald + pink gradient blobs
 *  3. Neon cityscape silhouette (parallax depth 1)
 *  4. Window frames (parallax depth 0.7)
 *  5. Ceiling LED strips
 *  6. Studio foreground (parallax depth 0.4)
 *  7. Ambient vignette overlay
 */
export function CyberClassroomBg() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      style={{ background: "oklch(0.03 0.002 300)" }}
    >
      {/* R3F fluid lighting blobs */}
      <div className="absolute inset-0">
        <Canvas
          gl={{ antialias: false, alpha: true }}
          camera={{ position: [0, 0, 8], fov: 50 }}
          style={{ background: "transparent" }}
          dpr={[1, 1.5]}
        >
          <LightScene />
        </Canvas>
      </div>

      {/* Parallax layer stack */}
      <CityscapeSilhouette depth={1} />
      <WindowFrames depth={0.7} />
      <CeilingStrips />
      <StudioForeground depth={0.4} />

      {/* Ambient vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 40%, transparent 30%, oklch(0.02 0 0 / 70%) 100%)",
        }}
      />

      {/* Subtle floor fog */}
      <div
        className="absolute inset-x-0 bottom-0 h-[30%]"
        style={{
          background:
            "linear-gradient(to top, oklch(0.03 0.002 300 / 90%), transparent)",
        }}
      />
    </div>
  )
}
