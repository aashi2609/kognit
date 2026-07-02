"use client"

import { motion } from "motion/react"

/**
 * A detailed, colorful vector-art open-plan coworking / engineering lab used as
 * the hero backdrop. Floor-to-ceiling windows reveal a colorful city skyline,
 * flanked by workstations (desks, office chairs, monitors) and potted plants.
 * Everything renders fully colored beneath a dim "lights off" overlay that
 * lifts when `lit` becomes true.
 */
export function OfficeScene({ lit = false }: { lit?: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* ================= BACK WALL ================= */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.17 0.012 265) 0%, oklch(0.12 0.008 265) 58%, oklch(0.08 0.006 265) 100%)",
        }}
      />

      {/* ceiling truss / structural beams */}
      <div className="absolute inset-x-0 top-0 h-[10%] flex justify-between opacity-70">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="h-full w-[2px] bg-[oklch(0.22_0.01_265)]" />
        ))}
      </div>

      {/* ================= FLOOR-TO-CEILING WINDOW WALL ================= */}
      <div className="absolute inset-x-[8%] top-[10%] bottom-[40%] flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="relative flex-1 overflow-hidden rounded-sm"
            style={{
              boxShadow:
                "inset 0 0 0 2px oklch(1 0 0 / 8%), 0 0 30px oklch(0.3 0.05 265 / 22%)",
              background:
                "linear-gradient(180deg, oklch(0.22 0.045 265) 0%, oklch(0.14 0.03 275) 62%, oklch(0.1 0.02 280) 100%)",
            }}
          >
            {/* horizon glow */}
            <div
              className="absolute inset-x-0 bottom-0 h-2/3"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 130%, oklch(0.55 0.1 300 / 40%), oklch(0.4 0.08 265 / 20%) 45%, transparent 75%)",
              }}
            />
            {/* skyline buildings for this pane */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-[2px] px-1">
              {SKYLINE[i].map((b, j) => (
                <div
                  key={j}
                  className="relative"
                  style={{
                    width: `${b.w}%`,
                    height: `${b.h}%`,
                    background:
                      "linear-gradient(180deg, oklch(0.18 0.025 275), oklch(0.1 0.015 280))",
                    boxShadow: "0 0 0 1px oklch(0 0 0 / 35%)",
                  }}
                >
                  <div className="absolute inset-[2px] grid grid-cols-2 gap-[2px]">
                    {Array.from({ length: b.lights }).map((_, k) => (
                      <span
                        key={k}
                        className="h-[2px] w-full rounded-[1px]"
                        style={{
                          backgroundColor:
                            (j + k) % 4 === 0
                              ? "oklch(0.85 0.1 90 / 85%)"
                              : (j + k) % 5 === 0
                                ? "oklch(0.8 0.09 350 / 65%)"
                                : (j + k) % 7 === 0
                                  ? "oklch(0.82 0.1 165 / 60%)"
                                  : "oklch(0.6 0.03 90 / 22%)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* mullion */}
            <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/8" />
          </div>
        ))}
      </div>

      {/* ambient backlight strips along the ceiling — alternating pink / green */}
      <div className="absolute inset-x-[6%] top-[7%] flex justify-around">
        {Array.from({ length: 9 }).map((_, i) => {
          const green = i % 2 === 0
          return (
            <motion.div
              key={i}
              className="h-[3px] w-[8%] rounded-full blur-[1px]"
              style={{
                background: green
                  ? "linear-gradient(to right, transparent, oklch(0.82 0.11 165 / 85%), transparent)"
                  : "linear-gradient(to right, transparent, oklch(0.8 0.09 350 / 85%), transparent)",
              }}
              animate={{ opacity: lit ? [0.55, 0.95, 0.55] : [0.2, 0.45, 0.2] }}
              transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.25 }}
            />
          )
        })}
      </div>

      {/* ================= POTTED PLANTS ================= */}
      <Plant className="absolute left-[3%] bottom-[6%] h-[30%] w-[10%]" />
      <Plant className="absolute right-[3%] bottom-[6%] h-[34%] w-[11%]" mirrored />

      {/* ================= WORKSTATIONS ROW ================= */}
      {/* left workstation */}
      <Workstation className="absolute left-[14%] bottom-[8%] h-[26%] w-[20%]" lit={lit} accent="emerald" />
      {/* right workstation */}
      <Workstation className="absolute right-[14%] bottom-[8%] h-[26%] w-[20%]" lit={lit} accent="pink" mirrored />

      {/* ================= CENTER HERO DESK ================= */}
      <div className="absolute inset-x-0 bottom-0 h-[30%]">
        <div
          className="absolute left-1/2 top-[26%] h-[14%] w-[44%] -translate-x-1/2 rounded-[6px]"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.55 0.07 60) 0%, oklch(0.42 0.06 55) 55%, oklch(0.32 0.05 50) 100%)",
            boxShadow: "0 10px 30px oklch(0 0 0 / 45%), inset 0 1px 0 oklch(0.75 0.08 70 / 60%)",
          }}
        >
          <div
            className="absolute inset-0 rounded-[6px] opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0 22px, oklch(0.25 0.03 45 / 40%) 22px 23px)",
            }}
          />
        </div>
        <div
          className="absolute left-1/2 top-[40%] h-[60%] w-[36%] -translate-x-1/2 rounded-b-[4px]"
          style={{
            background: "linear-gradient(180deg, oklch(0.3 0.04 50), oklch(0.18 0.025 45))",
            boxShadow: "inset 0 2px 8px oklch(0 0 0 / 40%)",
          }}
        />
      </div>

      {/* floor reflection glow */}
      <div
        className="absolute inset-x-0 bottom-0 h-[16%]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, oklch(0.5 0.05 60 / 20%), transparent 70%)",
        }}
      />

      {/* ================= DIM "LIGHTS OFF" OVERLAY ================= */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: lit ? 0.3 : 0.74 }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(72% 62% at 50% 42%, oklch(0.02 0 0 / 52%), oklch(0.01 0 0 / 93%) 100%)",
        }}
      />

      {/* warm ambient lift when the lights come on */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: lit ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(90% 80% at 50% 30%, oklch(0.6 0.05 80 / 15%), transparent 70%)",
        }}
      />

      {/* cool city light spill even when dark */}
      <div
        className="absolute inset-x-[10%] top-[14%] h-[36%] blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 60%, oklch(0.45 0.07 300 / 26%), transparent 70%)",
        }}
      />
    </div>
  )
}

/* A single workstation: monitor, desk, and office chair. */
function Workstation({
  className,
  lit,
  accent,
  mirrored = false,
}: {
  className?: string
  lit: boolean
  accent: "emerald" | "pink"
  mirrored?: boolean
}) {
  const glow = accent === "emerald" ? "oklch(0.3 0.07 165 / 70%)" : "oklch(0.3 0.06 350 / 70%)"
  return (
    <div className={className} style={{ transform: mirrored ? "scaleX(-1)" : undefined }}>
      {/* office chair back */}
      <div
        className="absolute bottom-0 left-[8%] h-[64%] w-[30%] rounded-t-[14px]"
        style={{ background: "linear-gradient(180deg, oklch(0.24 0.02 265), oklch(0.16 0.015 265))" }}
      />
      <div className="absolute bottom-0 left-[14%] h-[10%] w-[2px] bg-[oklch(0.2_0.01_265)]" />
      {/* desk top */}
      <div
        className="absolute bottom-[22%] right-0 h-[8%] w-[80%] rounded-[3px]"
        style={{ background: "linear-gradient(180deg, oklch(0.44 0.05 55), oklch(0.3 0.04 50))" }}
      />
      {/* monitor */}
      <div className="absolute bottom-[30%] right-[24%] h-[36%] w-[46%]">
        <div
          className="h-[82%] w-full rounded-[3px]"
          style={{ background: "oklch(0.1 0.006 265)", boxShadow: "inset 0 0 0 2px oklch(1 0 0 / 10%)" }}
        >
          <motion.div
            className="m-[4px] h-[calc(100%-8px)] rounded-[2px]"
            style={{ background: glow }}
            animate={{ opacity: lit ? [0.7, 1, 0.7] : 0.28 }}
            transition={{ duration: 2.6, repeat: Infinity }}
          />
        </div>
        <div className="mx-auto h-[8%] w-[8%] bg-[oklch(0.22_0.02_265)]" />
        <div className="mx-auto h-[6%] w-[36%] rounded bg-[oklch(0.18_0.02_265)]" />
      </div>
    </div>
  )
}

/* A stylized potted plant. */
function Plant({ className, mirrored = false }: { className?: string; mirrored?: boolean }) {
  return (
    <div className={className} style={{ transform: mirrored ? "scaleX(-1)" : undefined }}>
      {/* pot */}
      <div
        className="absolute bottom-0 left-1/2 h-[26%] w-[52%] -translate-x-1/2 rounded-b-[8px] rounded-t-[3px]"
        style={{ background: "linear-gradient(180deg, oklch(0.5 0.09 40), oklch(0.36 0.07 38))" }}
      />
      {/* leaves */}
      <svg viewBox="0 0 100 140" className="absolute inset-x-0 bottom-[22%] mx-auto h-[80%] w-full">
        {[
          "M50 140 C20 110 14 60 40 20",
          "M50 140 C40 100 44 54 50 10",
          "M50 140 C60 100 56 54 50 12",
          "M50 140 C80 110 86 62 62 22",
          "M50 140 C34 108 22 78 30 48",
          "M50 140 C66 108 78 78 70 48",
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={i % 2 === 0 ? "oklch(0.5 0.11 150)" : "oklch(0.58 0.13 150)"}
            strokeWidth="9"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  )
}

/* Per-pane skyline building specs. */
const SKYLINE: { w: number; h: number; lights: number }[][] = [
  [
    { w: 16, h: 60, lights: 6 },
    { w: 12, h: 44, lights: 4 },
    { w: 20, h: 82, lights: 10 },
    { w: 14, h: 54, lights: 6 },
  ],
  [
    { w: 14, h: 50, lights: 4 },
    { w: 22, h: 90, lights: 12 },
    { w: 12, h: 40, lights: 4 },
    { w: 18, h: 70, lights: 8 },
  ],
  [
    { w: 18, h: 74, lights: 8 },
    { w: 12, h: 46, lights: 4 },
    { w: 24, h: 96, lights: 14 },
    { w: 14, h: 58, lights: 6 },
  ],
  [
    { w: 20, h: 66, lights: 8 },
    { w: 12, h: 42, lights: 4 },
    { w: 18, h: 84, lights: 10 },
    { w: 14, h: 52, lights: 6 },
  ],
  [
    { w: 16, h: 56, lights: 6 },
    { w: 22, h: 88, lights: 12 },
    { w: 12, h: 44, lights: 4 },
    { w: 18, h: 68, lights: 8 },
  ],
]
