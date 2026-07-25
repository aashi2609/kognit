"use client"

import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useSignIn, useSignUp } from "@clerk/nextjs"
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
  const [error, setError] = useState("")
  const [pendingVerification, setPendingVerification] = useState(false)
  const [code, setCode] = useState("")
  const [isOAuthLoading, setIsOAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { isLoaded: isSignInLoaded, signIn, setActive: setActiveSignIn } = useSignIn()
  const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp()

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
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError("")

      if (isSignup) {
        if (!isSignUpLoaded) return
        try {
          if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
          }
          await signUp.create({
            emailAddress: email,
            password,
          })
          
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
          setPendingVerification(true)
        } catch (err: any) {
          console.error("SignUp Error:", err)
          if (err.errors?.[0]?.code === "session_exists") {
             router.push("/dashboard")
             return
          }
          setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "An error occurred")
        }
      } else {
        if (!isSignInLoaded) return
        try {
          const result = await signIn.create({
            identifier: email,
            password,
          })

          if (result.status === "complete") {
            await setActiveSignIn({ session: result.createdSessionId })
            router.push("/dashboard")
          }
        } catch (err: any) {
          console.error("SignIn Error:", err)
          setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Invalid credentials")
        }
      }
    },
    [isSignup, email, password, confirmPassword, router, isSignInLoaded, signIn, setActiveSignIn, isSignUpLoaded, signUp],
  )

  const handleOAuth = async (strategy: "oauth_google" | "oauth_github", e: React.MouseEvent) => {
    e.preventDefault()
    setIsOAuthLoading(true)
    setError("")
    try {
      if (isSignup) {
        if (!isSignUpLoaded) return
        await signUp.authenticateWithRedirect({
          strategy,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/dashboard",
        })
      } else {
        if (!isSignInLoaded) return
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/dashboard",
        })
      }
    } catch (err: any) {
      console.error("OAuth Error:", err)
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "An error occurred during OAuth")
      setIsOAuthLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSignUpLoaded) return
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })
      if (completeSignUp.status === 'complete') {
        await setActiveSignUp({ session: completeSignUp.createdSessionId })
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || err.message || "Invalid code")
    }
  }

  if (pendingVerification) {
    return (
      <form onSubmit={handleVerify} className="flex flex-col gap-5">
        <div className="mb-2">
          <h1 className="font-mono text-xl font-bold uppercase tracking-[0.25em] text-white drop-shadow-md">
            [ VERIFY_EMAIL ]
          </h1>
          <p className="mt-2 font-mono text-[11.5px] font-medium uppercase tracking-[0.2em] text-slate-200">
            Enter the code sent to your email
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code"
            className="neon-input px-4 py-3 font-mono text-sm text-white bg-slate-900/90"
          />
        </div>
        {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
        <button type="submit" className="mt-2 border border-emerald-400/50 bg-emerald-500/20 px-8 py-4 font-mono text-sm text-emerald-300">
          [ VERIFY ]
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative">
      {/* Clerk CAPTCHA Element for Bot Protection */}
      <div id="clerk-captcha" className="hidden" />

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
        <div className="relative">
          <input
            id="auth-password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={onPasswordFocus}
            onBlur={onPasswordBlur}
            placeholder="••••••••••••"
            className="w-full neon-input px-4 py-3 font-mono text-sm text-white placeholder:text-slate-400 bg-slate-900/90 border-slate-700/80 focus:border-emerald-400 focus:bg-slate-950 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

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
          <div className="relative">
            <input
              id="auth-confirm"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={onPasswordFocus}
              onBlur={onPasswordBlur}
              placeholder="••••••••••••"
              className="w-full neon-input px-4 py-3 font-mono text-sm text-white placeholder:text-slate-400 bg-slate-900/90 border-slate-700/80 focus:border-emerald-400 focus:bg-slate-950 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* OAuth Buttons */}
      <div className="flex gap-3 mt-1">
        <button
          type="button"
          onClick={(e) => handleOAuth("oauth_google", e)}
          disabled={isOAuthLoading}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 font-mono text-xs font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
        >
          GOOGLE
        </button>
        <button
          type="button"
          onClick={(e) => handleOAuth("oauth_github", e)}
          disabled={isOAuthLoading}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 font-mono text-xs font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
        >
          GITHUB
        </button>
      </div>

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

      {error && (
        <div className="mt-2 text-center p-2 border border-red-500/30 bg-red-500/10 rounded">
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}
    </form>
  )
}
