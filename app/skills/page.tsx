"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Float, Html } from "@react-three/drei"
import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import { useCallback, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { GlassPanel } from "@/components/glass-panel"

/* ------------------------------------------------------------------ */
/*  Skill data                                                         */
/* ------------------------------------------------------------------ */

interface Skill {
  id: string
  label: string
  category: string
  mastery: number // 0–100
  retention: number // 0–100 (decay curve)
  readiness: number // 0–100 (interview readiness)
  practiceCount: number
  lastPracticed: string
  position: [number, number, number]
}

const SKILLS: Skill[] = [
  { id: 'arrays', label: 'Arrays', category: 'Data Structures', mastery: 92, retention: 88, readiness: 95, practiceCount: 47, lastPracticed: '2h ago', position: [-3.5, 2, 0] },
  { id: 'linked-lists', label: 'Linked Lists', category: 'Data Structures', mastery: 78, retention: 65, readiness: 70, practiceCount: 31, lastPracticed: '1d ago', position: [-2, 3.2, -1] },
  { id: 'trees', label: 'Trees', category: 'Data Structures', mastery: 65, retention: 52, readiness: 55, practiceCount: 22, lastPracticed: '3d ago', position: [-0.5, 1.8, 0.5] },
  { id: 'graphs', label: 'Graphs', category: 'Data Structures', mastery: 42, retention: 30, readiness: 35, practiceCount: 14, lastPracticed: '1w ago', position: [1.5, 3, -0.5] },
  { id: 'hash-maps', label: 'Hash Maps', category: 'Data Structures', mastery: 85, retention: 80, readiness: 88, practiceCount: 38, lastPracticed: '6h ago', position: [-4, 0, 0.5] },
  { id: 'sorting', label: 'Sorting', category: 'Algorithms', mastery: 88, retention: 82, readiness: 90, practiceCount: 42, lastPracticed: '4h ago', position: [3, 1.5, 0] },
  { id: 'searching', label: 'Searching', category: 'Algorithms', mastery: 75, retention: 68, readiness: 72, practiceCount: 28, lastPracticed: '2d ago', position: [4, 0, -0.5] },
  { id: 'dp', label: 'Dynamic Prog.', category: 'Algorithms', mastery: 35, retention: 22, readiness: 28, practiceCount: 10, lastPracticed: '2w ago', position: [2, -1.5, 0.5] },
  { id: 'recursion', label: 'Recursion', category: 'Algorithms', mastery: 70, retention: 60, readiness: 65, practiceCount: 25, lastPracticed: '1d ago', position: [0.5, -0.5, 0] },
  { id: 'greedy', label: 'Greedy', category: 'Algorithms', mastery: 55, retention: 42, readiness: 48, practiceCount: 18, lastPracticed: '5d ago', position: [3.5, -2.5, -0.5] },
  { id: 'big-o', label: 'Big-O Analysis', category: 'Time Complexity', mastery: 80, retention: 75, readiness: 82, practiceCount: 35, lastPracticed: '8h ago', position: [-1.5, -2, 0] },
  { id: 'space', label: 'Space Complexity', category: 'Time Complexity', mastery: 60, retention: 48, readiness: 55, practiceCount: 20, lastPracticed: '4d ago', position: [-3, -2.8, 0.5] },
  { id: 'amortized', label: 'Amortized Analysis', category: 'Time Complexity', mastery: 25, retention: 15, readiness: 18, practiceCount: 6, lastPracticed: '3w ago', position: [0, -3.5, -0.5] },
]

const EDGES: [string, string][] = [
  ['arrays', 'sorting'], ['arrays', 'searching'], ['arrays', 'hash-maps'],
  ['linked-lists', 'trees'], ['trees', 'graphs'], ['graphs', 'dp'],
  ['sorting', 'big-o'], ['searching', 'big-o'], ['dp', 'recursion'],
  ['recursion', 'trees'], ['big-o', 'space'], ['big-o', 'amortized'],
  ['greedy', 'dp'], ['hash-maps', 'linked-lists'],
]

/* ------------------------------------------------------------------ */
/*  R3F constellation scene                                            */
/* ------------------------------------------------------------------ */

function ConstellationEdges() {
  const lineRefs = useRef<(THREE.Line | null)[]>([])

  const geometries = useMemo(() => {
    return EDGES.map(([fromId, toId]) => {
      const from = SKILLS.find((s) => s.id === fromId)!
      const to = SKILLS.find((s) => s.id === toId)!
      const pts = [
        new THREE.Vector3(...from.position),
        new THREE.Vector3(...to.position),
      ]
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      return geo
    })
  }, [])

  return (
    <>
      {geometries.map((geo, i) => (
        <line key={i} ref={(el) => { lineRefs.current[i] = el as unknown as THREE.Line | null }}>
          <bufferGeometry attach="geometry" {...geo} />
          <lineBasicMaterial
            attach="material"
            color="#34d399"
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </line>
      ))}
    </>
  )
}

function SkillNode({
  skill,
  onHover,
  onUnhover,
  hovered,
}: {
  skill: Skill
  onHover: () => void
  onUnhover: () => void
  hovered: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const elapsed = useRef(Math.random() * 100)
  const mastered = skill.mastery >= 75

  useFrame((_, delta) => {
    if (!meshRef.current) return
    elapsed.current += delta

    // Mastered nodes pulse gently
    if (mastered) {
      const pulse = 1 + Math.sin(elapsed.current * 1.5) * 0.08
      meshRef.current.scale.setScalar(pulse)
    }
  })

  const baseColor = mastered
    ? '#34d399'
    : skill.mastery >= 50
      ? '#fbbf24'
      : skill.mastery >= 25
        ? '#fb923c'
        : '#64748b'

  const emissiveIntensity = hovered ? 1.2 : mastered ? 0.4 : 0.1

  return (
    <Float
      speed={1.2}
      floatIntensity={0.15}
      rotationIntensity={0.05}
    >
      <mesh
        ref={meshRef}
        position={skill.position}
        onPointerEnter={(e) => { e.stopPropagation(); onHover() }}
        onPointerLeave={onUnhover}
      >
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={skill.mastery >= 25 ? 0.9 : 0.35}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
      {/* Outer glow ring for mastered */}
      {mastered && (
        <mesh position={skill.position}>
          <ringGeometry args={[0.3, 0.36, 32]} />
          <meshBasicMaterial
            color="#34d399"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {/* Label always visible */}
      <Html
        position={[skill.position[0], skill.position[1] - 0.45, skill.position[2]]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <span
          className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.15em]"
          style={{
            color: mastered ? 'oklch(0.82 0.09 165)' : 'oklch(0.55 0.02 300)',
            textShadow: '0 1px 4px oklch(0 0 0 / 80%)',
          }}
        >
          {skill.label}
        </span>
      </Html>
    </Float>
  )
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.15} color="#a0c4ff" />
      <pointLight position={[5, 5, 5]} intensity={0.6} color="#34d399" />
      <pointLight position={[-5, -3, 3]} intensity={0.3} color="#e879a8" />
    </>
  )
}

function CameraAutoRotate() {
  const { camera } = useThree()
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    elapsed.current += delta * 0.08
    camera.position.x = Math.sin(elapsed.current) * 8
    camera.position.z = Math.cos(elapsed.current) * 8
    camera.position.y = 2 + Math.sin(elapsed.current * 0.5) * 0.5
    camera.lookAt(0, 0, 0)
  })

  return null
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SkillsPage() {
  const [hoveredSkill, setHoveredSkill] = useState<Skill | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleGlobalMove = useCallback(
    (e: React.MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY }),
    [],
  )

  // Category summary
  const categories = useMemo(() => {
    const map = new Map<string, { total: number; avg: number }>()
    for (const s of SKILLS) {
      const entry = map.get(s.category) || { total: 0, avg: 0 }
      entry.total++
      entry.avg += s.mastery
      map.set(s.category, entry)
    }
    map.forEach((v) => (v.avg = Math.round(v.avg / v.total)))
    return Array.from(map.entries())
  }, [])

  return (
    <main
      className="relative z-10 min-h-screen px-4 py-6 sm:px-6"
      onMouseMove={handleGlobalMove}
    >
      {/* Nav */}
      <nav className="mx-auto mb-6 flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm uppercase tracking-[0.3em] text-primary/80 transition-colors hover:text-primary"
        >
          KOGNIT
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 p-1.5 backdrop-blur-md shadow-md">
          {[
            { href: '/dashboard', label: 'Terminal' },
            { href: '/skills', label: 'Skills', active: true },
            { href: '/arena', label: 'Arena' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                link.active
                  ? 'border border-emerald-400/70 bg-emerald-500/25 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)]'
                  : 'border border-transparent text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full transition-all ${
                  link.active
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-slate-400/50'
                }`}
              />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Header */}
      <div className="mx-auto mb-6 max-w-7xl">
        <h1 className="font-mono text-lg uppercase tracking-[0.3em] text-foreground">
          [ KNOWLEDGE_MAP ]
        </h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50">
          Retention matrix — interactive constellation view
        </p>
      </div>

      {/* Main content */}
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_280px]">
        {/* 3D Canvas */}
        <GlassPanel label="constellation.3d" className="relative h-[600px]">
          <div className="absolute inset-0 pt-6">
            <Canvas
              camera={{ position: [0, 2, 8], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              style={{ background: 'transparent' }}
              dpr={[1, 1.5]}
            >
              <SceneLighting />
              <CameraAutoRotate />
              <ConstellationEdges />
              {SKILLS.map((skill) => (
                <SkillNode
                  key={skill.id}
                  skill={skill}
                  hovered={hoveredSkill?.id === skill.id}
                  onHover={() => setHoveredSkill(skill)}
                  onUnhover={() => setHoveredSkill(null)}
                />
              ))}
            </Canvas>
          </div>
        </GlassPanel>

        {/* Sidebar: category breakdown */}
        <div className="flex flex-col gap-4">
          {categories.map(([cat, data]) => (
            <GlassPanel key={cat} className="px-5 py-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/80">
                {cat}
              </h3>
              <div className="mt-3 flex items-end justify-between">
                <span className="font-mono text-2xl tabular-nums text-foreground">
                  {data.avg}%
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/50">
                  {data.total} skills
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${data.avg}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{
                    background:
                      data.avg >= 75
                        ? 'oklch(0.78 0.09 165)'
                        : data.avg >= 50
                          ? 'oklch(0.78 0.12 90)'
                          : 'oklch(0.7 0.12 30)',
                  }}
                />
              </div>
            </GlassPanel>
          ))}

          {/* Legend */}
          <GlassPanel className="px-5 py-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
              Legend
            </h3>
            <div className="mt-3 flex flex-col gap-2">
              {[
                { color: 'bg-emerald-400', label: 'Mastered (≥75%)' },
                { color: 'bg-amber-400', label: 'Progressing (50–74%)' },
                { color: 'bg-orange-400', label: 'Developing (25–49%)' },
                { color: 'bg-slate-500', label: 'Untouched (<25%)' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${item.color}`} />
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Floating hover tooltip */}
      <AnimatePresence>
        {hoveredSkill && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="glass-card pointer-events-none fixed z-50 w-72 p-5"
            style={{
              left: Math.min(mousePos.x + 20, window.innerWidth - 310),
              top: Math.min(mousePos.y - 10, window.innerHeight - 300),
            }}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-foreground">
                {hoveredSkill.label}
              </h4>
              <span className="font-mono text-[9px] text-muted-foreground/50">
                {hoveredSkill.category}
              </span>
            </div>

            {/* Mastery bar */}
            <div className="mt-3">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-muted-foreground/60">Mastery</span>
                <span className="text-foreground">{hoveredSkill.mastery}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${hoveredSkill.mastery}%`,
                    background: 'oklch(0.78 0.09 165)',
                  }}
                />
              </div>
            </div>

            {/* Retention decay */}
            <div className="mt-3">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-muted-foreground/60">Retention</span>
                <span className={hoveredSkill.retention < 50 ? 'text-pink-300' : 'text-foreground'}>
                  {hoveredSkill.retention}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${hoveredSkill.retention}%`,
                    background:
                      hoveredSkill.retention >= 70
                        ? 'oklch(0.78 0.09 165)'
                        : hoveredSkill.retention >= 40
                          ? 'oklch(0.78 0.12 90)'
                          : 'oklch(0.7 0.1 350)',
                  }}
                />
              </div>
            </div>

            {/* Interview readiness */}
            <div className="mt-3">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-muted-foreground/60">Interview Ready</span>
                <span className="text-foreground">{hoveredSkill.readiness}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${hoveredSkill.readiness}%`,
                    background: 'oklch(0.7 0.08 220)',
                  }}
                />
              </div>
            </div>

            {/* Meta */}
            <div className="mt-4 flex justify-between border-t border-white/5 pt-3 font-mono text-[10px] text-muted-foreground/50">
              <span>{hoveredSkill.practiceCount} sessions</span>
              <span>Last: {hoveredSkill.lastPracticed}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
