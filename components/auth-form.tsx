"use client"

import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import { useCallback, useMemo, useState } from "react"

type Variant = "login" | "signup"

/**
 * Shared authentication form component used by both /login and /signup pages.
 *
 * Features:
 * - Variant-driven field rendering (login = email + password, signup = all)
 * - Neon-morph input focus animations (transparent → glowing emerald border)
 * - 3-tier password complexity bar with pulsing green fills
 * - Monospaced HUD-style headers and labels
 * - Callbacks for password field focus/blur to control character eye-covering
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
      // Form submission placeholder — connect to your auth backend
      console.log(
        `[${variant.toUpperCase()}]`,
        isSignup ? { username, email, password } : { email, password },
      )
    },
    [variant, isSignup, username, email, password],
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Header */}
      <div className="mb-2">
        <h1 className="font-mono text-lg uppercase tracking-[0.3em] text-foreground">
          {isSignup ? "[ INITIALIZE_ACCOUNT ]" : "[ ACCESS_CORE ]"}
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/70">
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
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80"
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
            className="neon-input px-4 py-3 font-mono text-sm placeholder:text-foreground/40"
          />
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
          <label
            htmlFor="auth-email"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80"
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
            className="neon-input px-4 py-3 font-mono text-sm placeholder:text-foreground/40"
          />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
          <label
            htmlFor="auth-password"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80"
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
            className="neon-input px-4 py-3 font-mono text-sm placeholder:text-foreground/40"
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
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80"
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
            className="neon-input px-4 py-3 font-mono text-sm placeholder:text-foreground/40"
          />
        </div>
      )}

      {/* Submit */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="group relative mt-2 overflow-hidden rounded-xl border border-primary/40 bg-primary/10 px-8 py-4 font-mono text-sm uppercase tracking-[0.24em] text-primary transition-all duration-300 hover:border-primary hover:bg-primary/20 hover:shadow-[0_0_30px_var(--emerald-glow)]"
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-xl border border-primary/0 group-hover:border-primary/60 group-hover:animate-pulse"
          aria-hidden="true"
        />
        {isSignup ? "[ INITIALIZE ]" : "[ ACCESS ]"}
      </motion.button>

      {/* Toggle link */}
      <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground/60">
        {isSignup ? (
          <>
            Already initialized?{" "}
            <Link
              href="/login"
              className="text-primary/80 underline underline-offset-4 transition-colors hover:text-primary"
            >
              Access Core
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-primary/80 underline underline-offset-4 transition-colors hover:text-primary"
            >
              Initialize one
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
