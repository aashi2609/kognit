"use client"

import { motion } from "motion/react"
import Link from "next/link"
import { useRef, useState } from "react"
import { SiteFooter } from "@/components/site-footer"
import {
  BracketReassemble,
  CountdownRing,
  AudioWave,
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
 * Content revealed in the Main Arena / Differentiator section.
 * Features a minimal obsidian ambient layout with an elegant corner pendant lamp casting a soft volumetric light beam down the section.
 */
export function OutroContent() {
  return (
    <section className="relative overflow-hidden bg-[#030712] border-t border-white/10 min-h-screen flex flex-col justify-between py-4 sm:py-6">
      {/* Minimal, professional ambient background system */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Soft top ambient spotlight */}
        <div
          className="absolute -top-[250px] left-1/2 h-[550px] w-[850px] -translate-x-1/2 rounded-full blur-[130px] opacity-70"
          style={{
            background:
              "radial-gradient(circle, oklch(0.78 0.09 165 / 14%) 0%, oklch(0.78 0.07 350 / 6%) 55%, transparent 75%)",
          }}
        />

        {/* Minimal precision micro-grid with radial mask */}
        <div className="absolute inset-0 tactical-grid opacity-[0.07] radial-fade" />

        {/* Top hairline border gradient accent */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 via-pink-400/20 to-transparent" />
      </div>

      {/* Sleek Corner Pendant Lamp (matching user image) */}
      <CornerPendantLamp />

      <div className="relative z-10 mx-auto max-w-6xl w-full px-5 sm:px-8 my-auto flex flex-col justify-center gap-5 sm:gap-6">
        {/* Headline */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-mono uppercase tracking-[0.3em] text-emerald-300 backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>[ MISSION BRIEFING // THE DIFFERENTIATOR ]</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mt-4 max-w-3xl text-balance font-sans text-3xl font-light leading-tight tracking-tight text-white sm:text-5xl"
          >
            Generators give you code. <span className="font-semibold text-emerald-300">Kognit</span> gives you the understanding that survives the interview.
          </motion.h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <DiagnosticCard key={p.protocol} pillar={p} index={i} />
          ))}
        </div>

        {/* Authentication buttons section */}
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.h3
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-balance text-2xl font-light tracking-tight text-white sm:text-3xl"
          >
            Ready to rebuild how you learn to code?
          </motion.h3>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {/* Primary CTA — INITIALIZE ACCOUNT */}
            <Link
              href="/signup"
              className="liquid-droplet-btn px-8 py-3.5 sm:px-9 sm:py-4 flex items-center justify-center gap-3 font-sans text-sm sm:text-base font-semibold tracking-wide text-white outline-none"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
              <span>Initialize Account</span>
            </Link>

            {/* Secondary CTA — ACCESS CORE */}
            <Link
              href="/login"
              className="liquid-droplet-btn px-8 py-3.5 sm:px-9 sm:py-4 flex items-center justify-center gap-3 font-sans text-sm sm:text-base font-semibold tracking-wide text-white outline-none"
            >
              <span className="h-2 w-2 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              <span>Access Core</span>
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </section>
  )
}

/**
 * Sleek corner pendant lamp casting a soft volumetric white light beam down the corner.
 * Exactly matches the user's reference image with top mounting node, capsule shade, cord, and pull bead.
 */
function CornerPendantLamp() {
  const [lit, setLit] = useState(true)

  return (
    <div className="absolute right-[5%] sm:right-[8%] top-0 z-20 flex flex-col items-center pointer-events-auto">
      {/* Ceiling attachment node dot */}
      <div className="h-3 w-3 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.95)] border border-white/80 z-20" />

      {/* Upper Hanging Cord */}
      <div className="w-[1.5px] h-[60px] bg-gradient-to-b from-white via-white/80 to-white/40 z-20" />

      {/* Lamp Fixture Shade (Matching user image: rounded trapezoid capsule) */}
      <div className="relative z-20 flex flex-col items-center">
        <motion.div
          onClick={() => setLit(!lit)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="cursor-pointer relative h-9 w-28 rounded-t-xl bg-gradient-to-b from-white via-slate-100 to-slate-200/90 shadow-[0_0_22px_rgba(255,255,255,0.65)] flex items-end justify-center"
        >
          {/* Inner rim glow */}
          <div
            className={`h-2 w-24 rounded-full transition-all duration-300 ${
              lit
                ? "bg-white shadow-[0_0_28px_8px_rgba(255,255,255,0.95)]"
                : "bg-slate-400/40 shadow-none"
            }`}
          />
        </motion.div>

        {/* Cord continuation & Pull bead (extended longer while stopping cleanly above cards) */}
        <div className="relative flex flex-col items-center z-20">
          <div className="w-[1.5px] h-[165px] bg-gradient-to-b from-white/70 via-white/40 to-white/20" />
          <motion.button
            type="button"
            onClick={() => setLit(!lit)}
            whileHover={{ scale: 1.25 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle corner lamp"
            className="cursor-pointer h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,1)] border border-white focus:outline-none"
          />
        </div>

        {/* Volumetric Light Beam Cone (casting downward down the corner) */}
        {lit && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.8 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute top-9 left-1/2 -translate-x-1/2 w-[380px] h-[750px] z-10 origin-top"
            style={{
              clipPath: "polygon(26% 0, 74% 0, 100% 100%, 0 100%)",
              background:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.48) 0%, rgba(255, 255, 255, 0.20) 35%, rgba(255, 255, 255, 0.04) 75%, transparent 100%)",
              filter: "blur(6px)",
            }}
          />
        )}
      </div>
    </div>
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
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-900/80 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
    >
      {/* micro-interaction engine */}
      <div className="mb-4 sm:mb-5 rounded-xl border border-white/10 bg-black/40 px-3 py-1">
        {pillar.kind === "brackets" && <BracketReassemble hovered={hovered} />}
        {pillar.kind === "ring" && <CountdownRing hovered={hovered} />}
        {pillar.kind === "wave" && <AudioWave pointerX={pointerX} />}
      </div>

      <span className="font-mono text-[10.5px] font-semibold tracking-[0.2em] text-emerald-400/80 uppercase">
        {pillar.protocol}
      </span>
      <h3 className="mt-3 font-mono text-base font-bold uppercase tracking-[0.18em] text-white">
        {pillar.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        {pillar.body}
      </p>

      <span className="pointer-events-none absolute right-4 top-4 h-2 w-2 rounded-full bg-emerald-400/40 transition-colors group-hover:bg-emerald-400 group-hover:shadow-[0_0_8px_#34d399]" />
    </motion.div>
  )
}
