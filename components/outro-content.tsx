"use client"

import { motion } from "motion/react"
import { useRef, useState } from "react"
import { SiteFooter } from "@/components/site-footer"
import {
  BracketReassemble,
  CountdownRing,
  AudioWave,
  BinaryMatrix,
} from "@/components/hud-widgets"

type Kind = "brackets" | "ring" | "wave"

const PILLARS: {
  protocol: string
  title: string
  body: string
  kind: Kind
}[] = [
  {
    protocol: "[ PROTOCOL // 01_COGNITION ]",
    title: "Reconstruct, don't copy",
    body: "Kognit refuses to hand you finished logic. It surfaces the gap in your reasoning and walks you back to first principles.",
    kind: "brackets",
  },
  {
    protocol: "[ PROTOCOL // 02_RECALL ]",
    title: "Pressure-tested recall",
    body: "Every concept is rehearsed the way an interview interrogates it — out loud, under a clock, with a critical probe on the line.",
    kind: "ring",
  },
  {
    protocol: "[ PROTOCOL // 03_DIALOGUE ]",
    title: "Socratic by design",
    body: "A living mentor core asks the next right question instead of writing the next line, so the understanding stays yours.",
    kind: "wave",
  },
]

/**
 * Content revealed after the resolution unlocks the Main Arena. A kinetic
 * tactical diagnostic HUD with live micro-interaction engines per card and a
 * dual authentication payoff.
 */
export function OutroContent() {
  return (
    <section className="relative border-t border-white/5 bg-background">
      <div className="pointer-events-none absolute inset-0 tactical-grid opacity-[0.12]" />
      <div className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8">
        {/* headline over a dim running binary matrix */}
        <div className="relative">
          <BinaryMatrix />
          <div className="relative">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-mono text-[11px] uppercase tracking-[0.4em] text-primary/70"
            >
              [ MISSION BRIEFING // THE DIFFERENTIATOR ]
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="mt-4 max-w-3xl text-balance text-3xl font-light leading-tight tracking-tight text-foreground sm:text-5xl"
            >
              Generators give you code. Kognit gives you the understanding that
              survives the interview.
            </motion.h2>
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <DiagnosticCard key={p.protocol} pillar={p} index={i} />
          ))}
        </div>

        {/* authentication payoff */}
        <div className="mt-20 flex flex-col items-center gap-8 text-center">
          <motion.h3
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-balance text-3xl font-light tracking-tight text-foreground sm:text-4xl"
          >
            Ready to rebuild how you learn to code?
          </motion.h3>

          <div className="flex w-full max-w-md flex-col items-stretch gap-4 sm:flex-row sm:justify-center">
            {/* Primary — emerald glass fill with border-pulse trace on hover */}
            <button
              type="button"
              className="group relative overflow-hidden rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-8 py-4 font-mono text-sm uppercase tracking-[0.2em] text-emerald-200 transition-all duration-300 hover:bg-emerald-500/25 hover:shadow-[0_0_30px_var(--emerald-glow)]"
            >
              <span
                className="pointer-events-none absolute inset-0 rounded-lg border border-emerald-300/0 group-hover:border-emerald-300/80 group-hover:animate-pulse"
                aria-hidden="true"
              />
              [ CREATE AN ACCOUNT ]
            </button>

            {/* Secondary — ghost, turns soft pink with neon glow on hover */}
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-transparent px-8 py-4 font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300 hover:border-pink-300/50 hover:text-pink-200 hover:shadow-[0_0_26px_var(--pink-glow)]"
              style={{ ["--pink-hover" as string]: "oklch(0.82 0.09 350)" }}
            >
              [ ACCESS ACCOUNT / LOGIN ]
            </button>
          </div>
        </div>
      </div>
      <SiteFooter />
    </section>
  )
}

function DiagnosticCard({
  pillar,
  index,
}: {
  pillar: (typeof PILLARS)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [pointerX, setPointerX] = useState(-1)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setPointerX(-1)
      }}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect()
        if (!rect) return
        setPointerX((e.clientX - rect.left) / rect.width)
      }}
      className="group relative overflow-hidden rounded-xl border border-white/5 bg-neutral-950/40 p-8 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/30"
    >
      {/* micro-interaction engine */}
      <div className="mb-6 rounded-lg border border-white/5 bg-black/30 px-3">
        {pillar.kind === "brackets" && <BracketReassemble hovered={hovered} />}
        {pillar.kind === "ring" && <CountdownRing hovered={hovered} />}
        {pillar.kind === "wave" && <AudioWave pointerX={pointerX} />}
      </div>

      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/60">
        {pillar.protocol}
      </span>
      <h3 className="mt-3 font-mono text-sm uppercase tracking-[0.18em] text-foreground">
        {pillar.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {pillar.body}
      </p>

      <span className="pointer-events-none absolute right-3 top-3 h-2 w-2 rounded-full bg-primary/30 transition-colors group-hover:bg-primary/70" />
    </motion.div>
  )
}
