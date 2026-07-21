"use client"

import { useState } from "react"
import { motion } from "motion/react"
import Link from "next/link"
import { StudentCharacterAuth } from "@/components/student-character-auth"
import { AuthForm } from "@/components/auth-form"

export default function LoginPage() {
  const [coverEyes, setCoverEyes] = useState(false)

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
      {/* Floating glassmorphic console card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
        className="glass-card relative w-full max-w-4xl overflow-hidden p-0 bg-slate-950/70 border border-white/20 shadow-2xl backdrop-blur-xl"
      >
        {/* Inner glow accent */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              "radial-gradient(60% 40% at 30% 50%, oklch(0.78 0.09 165 / 12%), transparent 70%), radial-gradient(50% 40% at 80% 60%, oklch(0.78 0.07 350 / 8%), transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative grid min-h-[520px] grid-cols-1 md:grid-cols-[2fr_3fr]">
          {/* Left Column — Character with eye tracking */}
          <div className="relative hidden border-r border-white/10 md:flex md:items-center md:justify-center bg-black/40">
            <div className="pointer-events-none absolute inset-0 tactical-grid opacity-[0.12]" />
            <StudentCharacterAuth coverEyes={coverEyes} />

            {/* Status indicator */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-300 font-medium">
                {coverEyes ? "no peeking" : "tracking cursor"}
              </span>
            </div>
          </div>

          {/* Right Column — Tactile HUD Form */}
          <div className="flex items-center justify-center p-8 sm:p-10 bg-slate-950/60">
            <div className="w-full max-w-sm">
              <AuthForm
                variant="login"
                onPasswordFocus={() => setCoverEyes(true)}
                onPasswordBlur={() => setCoverEyes(false)}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Back to landing link */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.3em] text-slate-300 transition-colors hover:text-white font-medium"
        >
          ← return to landing
        </Link>
      </div>
    </main>
  )
}
