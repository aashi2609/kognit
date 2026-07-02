"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ActIntro } from "@/components/act-intro"
import { ActCloneConsole } from "@/components/act-clone-console"
import { ActInterviewFreeze } from "@/components/act-interview-freeze"
import { ActSynapse } from "@/components/act-synapse"
import { ArenaBackdrop } from "@/components/arena-backdrop"
import { OutroContent } from "@/components/outro-content"

type Act = "intro" | "clone" | "interview" | "synapse" | "unlocked"

export default function Page() {
  const [act, setAct] = useState<Act>("intro")
  const outroRef = useRef<HTMLDivElement>(null)
  // becomes true once the resolution simulation succeeds; a scroll gesture
  // after this point triggers the one-time unlock.
  const armedRef = useRef(false)

  const unlocked = act === "unlocked"
  const inArena = act !== "intro"

  const handleUnlock = useCallback(() => {
    setAct((a) => (a === "unlocked" ? a : "unlocked"))
    // the narrative stage slides up and unmounts; land the Arena at the top
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }, [])

  // Global scroll lock for the entire narrative until unlocked. Once the
  // simulation is resolved (armedRef), a scroll gesture triggers the unlock.
  useEffect(() => {
    if (unlocked) return
    const { body } = document
    const prevOverflow = body.style.overflow
    const prevOverscroll = body.style.overscrollBehavior
    body.style.overflow = "hidden"
    body.style.overscrollBehavior = "none"
    window.scrollTo(0, 0)

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (armedRef.current && e.deltaY > 0) handleUnlock()
    }
    const onTouch = (e: Event) => e.preventDefault()
    const keyBlock = (e: KeyboardEvent) => {
      const blocked = [
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
        "Spacebar",
      ]
      if (blocked.includes(e.key)) {
        e.preventDefault()
        if (armedRef.current && (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " || e.key === "Spacebar")) {
          handleUnlock()
        }
      }
    }
    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchmove", onTouch, { passive: false })
    window.addEventListener("keydown", keyBlock)

    return () => {
      body.style.overflow = prevOverflow
      body.style.overscrollBehavior = prevOverscroll
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchmove", onTouch)
      window.removeEventListener("keydown", keyBlock)
    }
  }, [unlocked, handleUnlock])

  return (
    <main className="relative bg-background text-foreground">
      {/* The narrative stage — fixed full viewport, slides up & unmounts on unlock */}
      <AnimatePresence>
        {!unlocked && (
          <motion.div
            key="stage"
            className="fixed inset-0 z-20 h-screen w-full overflow-hidden bg-background"
            initial={false}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.85, ease: [0.7, 0, 0.2, 1] }}
          >
            {/* arena backdrop only for the console acts; the intro has its own room */}
            {inArena && <ArenaBackdrop lit />}
            {inArena && (
              <div className="pointer-events-none absolute inset-0 tactical-grid opacity-[0.15]" />
            )}

            <div className="relative z-10 flex h-full w-full items-center justify-center">
              <AnimatePresence mode="wait">
                {act === "intro" && (
                  <ActShell key="intro" full>
                    <ActIntro onComplete={() => setAct("clone")} />
                  </ActShell>
                )}
                {act === "clone" && (
                  <ActShell key="clone" slide padded>
                    <ActCloneConsole onComplete={() => setAct("interview")} />
                  </ActShell>
                )}
                {act === "interview" && (
                  <ActShell key="interview" slide padded>
                    <ActInterviewFreeze onComplete={() => setAct("synapse")} />
                  </ActShell>
                )}
                {act === "synapse" && (
                  <ActShell key="synapse" slide padded>
                    <ActSynapse
                      onUnlock={handleUnlock}
                      onResolved={() => {
                        armedRef.current = true
                      }}
                    />
                  </ActShell>
                )}
              </AnimatePresence>
            </div>

            {/* Progress rail */}
            {inArena && <ActProgress act={act} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN ARENA — the only surface once unlocked; previous acts unmounted */}
      {unlocked && (
        <motion.div
          ref={outroRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <OutroContent />
        </motion.div>
      )}
    </main>
  )
}

function ActShell({
  children,
  slide = false,
  full = false,
  padded = false,
}: {
  children: React.ReactNode
  slide?: boolean
  full?: boolean
  padded?: boolean
}) {
  return (
    <motion.div
      className={
        full
          ? "h-full w-full"
          : padded
            ? "flex w-full items-center justify-center px-5 sm:px-8"
            : "flex w-full items-center justify-center"
      }
      initial={slide ? { opacity: 0, x: 80 } : { opacity: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={slide ? { opacity: 0, x: -80 } : { opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  )
}

function ActProgress({ act }: { act: Act }) {
  const order: Act[] = ["clone", "interview", "synapse"]
  const current = order.indexOf(act)
  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
      {order.map((a, i) => (
        <span
          key={a}
          className={
            i <= current
              ? "h-1 w-8 rounded-full bg-primary transition-colors"
              : "h-1 w-8 rounded-full bg-white/10 transition-colors"
          }
        />
      ))}
    </div>
  )
}
