"use client"

import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import { useCallback, useMemo, useState } from "react"

import { useRouter } from "next/navigation"

type Variant = "login" | "signup"

/**
 * Shared authentication form component used by both /login and /signup pages.
 *
 * Features:
 * - Variant-driven field rendering (login = email + password, signup = all)
 * - High-contrast text, clear labels, and dark field inputs for optimal user visibility
 * - 3-tier password complexity bar with pulsing green fills
 * - Monospaced HUD-style headers and labels
 * - Callbacks for password field focus/blur to control character eye-covering
 * - Automatic router redirection to /dashboard upon submission
 */
export function AuthForm({
  variant,
  onPasswordFocus,
  onPasswordBlur,
}: {
  variant: Variant
  onPasswordFocus: () => void
  onPasswordBlur: () => void
}) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const isSignup = variant === "signup"

  // Password strength calculation
  const strength = useMemo(() => {
    if (password.length === 0) return 0
    let score = 0
    if (password.length >= 6) score++
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password))
      score++
    if (
      password.length >= 12 &&
      /[^A-Za-z0-9]/.test(password) &&
      /[A-Z]/.test(password)
    )
      score++
    return score
  }, [password])

  const strengthLabel = ["", "weak", "medium", "strong"][strength]
  const strengthColor = [
    "oklch(1 0 0 / 8%)",
    "oklch(0.7 0.15 30)",
    "oklch(0.78 0.12 90)",
    "oklch(0.78 0.09 165)",
  ][strength]

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      console.log(
        `[AUTH:${variant.toUpperCase()}] user=${isSignup ? username : email}`,
      )
      router.push("/dashboard")
    },
    [variant, isSignup, username, email, router],
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Header */}
      <div className="mb-2">
        <h1 className="font-mono text-xl font-bold uppercase tracking-[0.25em] text-white drop-shadow-md">
          {isSignup ? "[ INITIALIZE_ACCOUNT ]" : "[ ACCESS_CORE ]"}
        </h1>
        <p className="mt-2 font-mono text-[11.5px] font-medium uppercase tracking-[0.2em] text-slate-200">
          {isSignup
            ? "Register a new coaching terminal"
            : "Resume your coaching session"}
        </p>
      </div>

      {/* Username (signup only) */}
      {isSignup && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="auth-username"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100"
          >
            callsign
          </label>
          <input
            id="auth-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_handle"
            className="neon-input px-4 py-3 font-mono text-sm text-white placeholder:text-slate-400 bg-slate-900/90 border-slate-700/80 focus:border-emerald-400 focus:bg-slate-950"
          />
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="auth-email"
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100"
        >
          terminal_id
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className="neon-input px-4 py-3 font-mono text-sm text-white placeholder:text-slate-400 bg-slate-900/90 border-slate-700/80 focus:border-emerald-400 focus:bg-slate-950"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="auth-password"
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100"
        >
          access_key
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={onPasswordFocus}
          onBlur={onPasswordBlur}
          placeholder="••••••••••••"
          className="neon-input px-4 py-3 font-mono text-sm text-white placeholder:text-slate-400 bg-slate-900/90 border-slate-700/80 focus:border-emerald-400 focus:bg-slate-950"
        />

        {/* Password strength bar (signup only) */}
        {isSignup && password.length > 0 && (
          <div className="mt-1 flex flex-col gap-1">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((tier) => (
                <div key={tier} className="strength-bar flex-1">
                  <motion.div
                    className="strength-bar-fill"
                    initial={{ width: "0%" }}
                    animate={{
                      width: strength >= tier ? "100%" : "0%",
                      background: strengthColor,
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {strengthLabel && (
                <motion.span
                  key={strengthLabel}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: strengthColor }}
                >
                  {strengthLabel}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Confirm password (signup only) */}
      {isSignup && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="auth-confirm"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100"
          >
            confirm_key
          </label>
          <input
            id="auth-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={onPasswordFocus}
            onBlur={onPasswordBlur}
            placeholder="••••••••••••"
            className="neon-input px-4 py-3 font-mono text-sm text-white placeholder:text-slate-400 bg-slate-900/90 border-slate-700/80 focus:border-emerald-400 focus:bg-slate-950"
          />
        </div>
      )}

      {/* Submit */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="group relative mt-2 overflow-hidden rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.24em] text-emerald-300 transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-500/35 hover:text-white hover:shadow-[0_0_30px_var(--emerald-glow)]"
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-xl border border-emerald-400/0 group-hover:border-emerald-400/60 group-hover:animate-pulse"
          aria-hidden="true"
        />
        {isSignup ? "[ INITIALIZE ]" : "[ ACCESS ]"}
      </motion.button>

      {/* Toggle link */}
      <p className="mt-2 text-center font-mono text-xs font-medium text-slate-200">
        {isSignup ? (
          <>
            Already initialized?{" "}
            <Link
              href="/login"
              className="text-emerald-300 font-semibold underline underline-offset-4 transition-colors hover:text-white"
            >
              Access Core
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-emerald-300 font-semibold underline underline-offset-4 transition-colors hover:text-white"
            >
              Initialize one
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
