"use client"

import { motion } from "motion/react"
import { CodedCityWindowBg } from "@/components/coded-city-window-bg"

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
      {/* Custom coded office window city view background with reflective floor and static position */}
      <CodedCityWindowBg lit={lit} showReflections={true} parallax={false} />

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
      <Plant className="absolute left-[3%] bottom-[6%] h-[32%] w-[12%]" type="monstera" />
      <Plant className="absolute right-[3%] bottom-[6%] h-[35%] w-[12%]" type="monstera" mirrored />

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
        animate={{ opacity: lit ? 0.08 : 0.6 }}
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

/* A highly detailed vector indoor plant: Monstera Deliciosa or Bird of Paradise. */
function Plant({
  className,
  type,
  mirrored = false,
}: {
  className?: string
  type: "monstera" | "paradise"
  mirrored?: boolean
}) {
  return (
    <div className={className} style={{ transform: mirrored ? "scaleX(-1)" : undefined }}>
      <svg viewBox="0 0 120 160" className="w-full h-full" overflow="visible">
        <defs>
          {/* Ceramic pot gradients */}
          <linearGradient id="pot-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="15%" stopColor="#ffffff" />
            <stop offset="75%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="pot-rim-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="20%" stopColor="#f1f5f9" />
            <stop offset="80%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* Monstera leaf gradients */}
          <linearGradient id="monstera-leaf-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e5c2d" />
            <stop offset="50%" stopColor="#144d24" />
            <stop offset="100%" stopColor="#0d3b1a" />
          </linearGradient>

          {/* Paradise leaf gradients */}
          <linearGradient id="paradise-leaf-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c7c46" />
            <stop offset="60%" stopColor="#115c31" />
            <stop offset="100%" stopColor="#0a3d1e" />
          </linearGradient>
        </defs>

        {/* Soils */}
        <ellipse cx="60" cy="122" rx="20" ry="4" fill="#2d1c13" />

        {/* 1. PLANT STEMS AND LEAVES */}
        {type === "monstera" ? (
          <g>
            {/* Stems (organic curves originating from pot) */}
            <path d="M 60 125 Q 40 100 35 110" fill="none" stroke="#223d1d" strokeWidth="2.5" />
            <path d="M 60 125 Q 42 85 25 80" fill="none" stroke="#223d1d" strokeWidth="2.5" />
            <path d="M 60 125 Q 48 65 38 50" fill="none" stroke="#223d1d" strokeWidth="2.5" />
            <path d="M 60 125 Q 60 70 60 30" fill="none" stroke="#223d1d" strokeWidth="3" />
            <path d="M 60 125 Q 72 65 82 50" fill="none" stroke="#223d1d" strokeWidth="2.5" />
            <path d="M 60 125 Q 78 85 95 80" fill="none" stroke="#223d1d" strokeWidth="2.5" />
            <path d="M 60 125 Q 80 100 85 110" fill="none" stroke="#223d1d" strokeWidth="2.5" />

            {/* Leaves (with Monstera split leaf lobes) */}
            {/* L1: Bottom Left */}
            <g transform="translate(35, 110) rotate(-65) scale(0.4)">
              <path
                d="M 0 0 C -6 -10, -14 -12, -18 -18 C -16 -20, -10 -18, -7 -16 C -14 -22, -26 -26, -30 -34 C -25 -36, -16 -30, -11 -26 C -20 -34, -32 -40, -35 -52 C -29 -52, -18 -44, -13 -38 C -20 -50, -28 -64, -22 -76 C -15 -72, -11 -60, -9 -50 C -11 -66, -14 -82, 0 -95 C 14 -82, 11 -66, 9 -50 C 11 -60, 15 -72, 22 -76 C 28 -64, 20 -50, 13 -38 C 18 -44, 29 -52, 35 -52 C 32 -40, 20 -34, 11 -26 C 16 -30, 25 -36, 30 -34 C 26 -26, 14 -22, 7 -16 C 10 -18, 16 -20, 18 -18 C 14 -12, 6 -10, 0 0 Z"
                fill="url(#monstera-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -50 0 -95" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
            </g>
            {/* L2: Mid Left */}
            <g transform="translate(25, 80) rotate(-45) scale(0.48)">
              <path
                d="M 0 0 C -6 -10, -14 -12, -18 -18 C -16 -20, -10 -18, -7 -16 C -14 -22, -26 -26, -30 -34 C -25 -36, -16 -30, -11 -26 C -20 -34, -32 -40, -35 -52 C -29 -52, -18 -44, -13 -38 C -20 -50, -28 -64, -22 -76 C -15 -72, -11 -60, -9 -50 C -11 -66, -14 -82, 0 -95 C 14 -82, 11 -66, 9 -50 C 11 -60, 15 -72, 22 -76 C 28 -64, 20 -50, 13 -38 C 18 -44, 29 -52, 35 -52 C 32 -40, 20 -34, 11 -26 C 16 -30, 25 -36, 30 -34 C 26 -26, 14 -22, 7 -16 C 10 -18, 16 -20, 18 -18 C 14 -12, 6 -10, 0 0 Z"
                fill="url(#monstera-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -50 0 -95" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
            </g>
            {/* L3: Upper Left */}
            <g transform="translate(38, 50) rotate(-22) scale(0.55)">
              <path
                d="M 0 0 C -6 -10, -14 -12, -18 -18 C -16 -20, -10 -18, -7 -16 C -14 -22, -26 -26, -30 -34 C -25 -36, -16 -30, -11 -26 C -20 -34, -32 -40, -35 -52 C -29 -52, -18 -44, -13 -38 C -20 -50, -28 -64, -22 -76 C -15 -72, -11 -60, -9 -50 C -11 -66, -14 -82, 0 -95 C 14 -82, 11 -66, 9 -50 C 11 -60, 15 -72, 22 -76 C 28 -64, 20 -50, 13 -38 C 18 -44, 29 -52, 35 -52 C 32 -40, 20 -34, 11 -26 C 16 -30, 25 -36, 30 -34 C 26 -26, 14 -22, 7 -16 C 10 -18, 16 -20, 18 -18 C 14 -12, 6 -10, 0 0 Z"
                fill="url(#monstera-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -50 0 -95" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
            </g>
            {/* L4: Top Center */}
            <g transform="translate(60, 30) rotate(0) scale(0.62)">
              <path
                d="M 0 0 C -6 -10, -14 -12, -18 -18 C -16 -20, -10 -18, -7 -16 C -14 -22, -26 -26, -30 -34 C -25 -36, -16 -30, -11 -26 C -20 -34, -32 -40, -35 -52 C -29 -52, -18 -44, -13 -38 C -20 -50, -28 -64, -22 -76 C -15 -72, -11 -60, -9 -50 C -11 -66, -14 -82, 0 -95 C 14 -82, 11 -66, 9 -50 C 11 -60, 15 -72, 22 -76 C 28 -64, 20 -50, 13 -38 C 18 -44, 29 -52, 35 -52 C 32 -40, 20 -34, 11 -26 C 16 -30, 25 -36, 30 -34 C 26 -26, 14 -22, 7 -16 C 10 -18, 16 -20, 18 -18 C 14 -12, 6 -10, 0 0 Z"
                fill="url(#monstera-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -50 0 -95" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
            </g>
            {/* L5: Upper Right */}
            <g transform="translate(82, 50) rotate(22) scale(0.55)">
              <path
                d="M 0 0 C -6 -10, -14 -12, -18 -18 C -16 -20, -10 -18, -7 -16 C -14 -22, -26 -26, -30 -34 C -25 -36, -16 -30, -11 -26 C -20 -34, -32 -40, -35 -52 C -29 -52, -18 -44, -13 -38 C -20 -50, -28 -64, -22 -76 C -15 -72, -11 -60, -9 -50 C -11 -66, -14 -82, 0 -95 C 14 -82, 11 -66, 9 -50 C 11 -60, 15 -72, 22 -76 C 28 -64, 20 -50, 13 -38 C 18 -44, 29 -52, 35 -52 C 32 -40, 20 -34, 11 -26 C 16 -30, 25 -36, 30 -34 C 26 -26, 14 -22, 7 -16 C 10 -18, 16 -20, 18 -18 C 14 -12, 6 -10, 0 0 Z"
                fill="url(#monstera-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -50 0 -95" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
            </g>
            {/* L6: Mid Right */}
            <g transform="translate(95, 80) rotate(45) scale(0.48)">
              <path
                d="M 0 0 C -6 -10, -14 -12, -18 -18 C -16 -20, -10 -18, -7 -16 C -14 -22, -26 -26, -30 -34 C -25 -36, -16 -30, -11 -26 C -20 -34, -32 -40, -35 -52 C -29 -52, -18 -44, -13 -38 C -20 -50, -28 -64, -22 -76 C -15 -72, -11 -60, -9 -50 C -11 -66, -14 -82, 0 -95 C 14 -82, 11 -66, 9 -50 C 11 -60, 15 -72, 22 -76 C 28 -64, 20 -50, 13 -38 C 18 -44, 29 -52, 35 -52 C 32 -40, 20 -34, 11 -26 C 16 -30, 25 -36, 30 -34 C 26 -26, 14 -22, 7 -16 C 10 -18, 16 -20, 18 -18 C 14 -12, 6 -10, 0 0 Z"
                fill="url(#monstera-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -50 0 -95" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
            </g>
            {/* L7: Bottom Right */}
            <g transform="translate(85, 110) rotate(65) scale(0.4)">
              <path
                d="M 0 0 C -6 -10, -14 -12, -18 -18 C -16 -20, -10 -18, -7 -16 C -14 -22, -26 -26, -30 -34 C -25 -36, -16 -30, -11 -26 C -20 -34, -32 -40, -35 -52 C -29 -52, -18 -44, -13 -38 C -20 -50, -28 -64, -22 -76 C -15 -72, -11 -60, -9 -50 C -11 -66, -14 -82, 0 -95 C 14 -82, 11 -66, 9 -50 C 11 -60, 15 -72, 22 -76 C 28 -64, 20 -50, 13 -38 C 18 -44, 29 -52, 35 -52 C 32 -40, 20 -34, 11 -26 C 16 -30, 25 -36, 30 -34 C 26 -26, 14 -22, 7 -16 C 10 -18, 16 -20, 18 -18 C 14 -12, 6 -10, 0 0 Z"
                fill="url(#monstera-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -50 0 -95" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
            </g>
          </g>
        ) : (
          <g>
            {/* Stems */}
            <path d="M 60 125 Q 35 110 30 110" fill="none" stroke="#2b4c1c" strokeWidth="2.5" />
            <path d="M 60 125 Q 25 85 20 85" fill="none" stroke="#2b4c1c" strokeWidth="2.5" />
            <path d="M 60 125 Q 32 60 35 60" fill="none" stroke="#2b4c1c" strokeWidth="2.5" />
            <path d="M 60 125 Q 46 40 48 40" fill="none" stroke="#2b4c1c" strokeWidth="3" />
            <path d="M 60 125 Q 74 40 72 40" fill="none" stroke="#2b4c1c" strokeWidth="3" />
            <path d="M 60 125 Q 88 60 85 60" fill="none" stroke="#2b4c1c" strokeWidth="2.5" />
            <path d="M 60 125 Q 95 85 100 85" fill="none" stroke="#2b4c1c" strokeWidth="2.5" />
            <path d="M 60 125 Q 85 110 90 110" fill="none" stroke="#2b4c1c" strokeWidth="2.5" />

            {/* Bird of Paradise pointed vertical banana-like leaves */}
            {/* L1: Bottom Left */}
            <g transform="translate(30, 110) rotate(-75) scale(0.42)">
              <path
                d="M 0 0 C -3 -15, -12 -45, -10 -75 C -8 -105, -3 -125, 0 -135 C 3 -125, 8 -105, 10 -75 C 12 -45, 3 -15, 0 0 Z"
                fill="url(#paradise-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -70 0 -135" fill="none" stroke="#8ae36b" strokeWidth="1.5" opacity="0.5" />
            </g>
            {/* L2: Mid Left */}
            <g transform="translate(20, 85) rotate(-55) scale(0.55)">
              <path
                d="M 0 0 C -3 -15, -12 -45, -10 -75 C -8 -105, -3 -125, 0 -135 C 3 -125, 8 -105, 10 -75 C 12 -45, 3 -15, 0 0 Z"
                fill="url(#paradise-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -70 0 -135" fill="none" stroke="#8ae36b" strokeWidth="1.5" opacity="0.5" />
            </g>
            {/* L3: Upper Left */}
            <g transform="translate(35, 60) rotate(-35) scale(0.68)">
              <path
                d="M 0 0 C -3 -15, -12 -45, -10 -75 C -8 -105, -3 -125, 0 -135 C 3 -125, 8 -105, 10 -75 C 12 -45, 3 -15, 0 0 Z"
                fill="url(#paradise-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -70 0 -135" fill="none" stroke="#8ae36b" strokeWidth="1.5" opacity="0.5" />
            </g>
            {/* L4: Center Left */}
            <g transform="translate(48, 40) rotate(-12) scale(0.8)">
              <path
                d="M 0 0 C -3 -15, -12 -45, -10 -75 C -8 -105, -3 -125, 0 -135 C 3 -125, 8 -105, 10 -75 C 12 -45, 3 -15, 0 0 Z"
                fill="url(#paradise-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -70 0 -135" fill="none" stroke="#8ae36b" strokeWidth="1.5" opacity="0.5" />
            </g>
            {/* L5: Center Right */}
            <g transform="translate(72, 40) rotate(12) scale(0.8)">
              <path
                d="M 0 0 C -3 -15, -12 -45, -10 -75 C -8 -105, -3 -125, 0 -135 C 3 -125, 8 -105, 10 -75 C 12 -45, 3 -15, 0 0 Z"
                fill="url(#paradise-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -70 0 -135" fill="none" stroke="#8ae36b" strokeWidth="1.5" opacity="0.5" />
            </g>
            {/* L6: Upper Right */}
            <g transform="translate(85, 60) rotate(35) scale(0.68)">
              <path
                d="M 0 0 C -3 -15, -12 -45, -10 -75 C -8 -105, -3 -125, 0 -135 C 3 -125, 8 -105, 10 -75 C 12 -45, 3 -15, 0 0 Z"
                fill="url(#paradise-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -70 0 -135" fill="none" stroke="#8ae36b" strokeWidth="1.5" opacity="0.5" />
            </g>
            {/* L7: Mid Right */}
            <g transform="translate(100, 85) rotate(55) scale(0.55)">
              <path
                d="M 0 0 C -3 -15, -12 -45, -10 -75 C -8 -105, -3 -125, 0 -135 C 3 -125, 8 -105, 10 -75 C 12 -45, 3 -15, 0 0 Z"
                fill="url(#paradise-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -70 0 -135" fill="none" stroke="#8ae36b" strokeWidth="1.5" opacity="0.5" />
            </g>
            {/* L8: Bottom Right */}
            <g transform="translate(90, 110) rotate(75) scale(0.42)">
              <path
                d="M 0 0 C -3 -15, -12 -45, -10 -75 C -8 -105, -3 -125, 0 -135 C 3 -125, 8 -105, 10 -75 C 12 -45, 3 -15, 0 0 Z"
                fill="url(#paradise-leaf-grad)"
              />
              <path d="M 0 0 Q 0 -70 0 -135" fill="none" stroke="#8ae36b" strokeWidth="1.5" opacity="0.5" />
            </g>
          </g>
        )}

        {/* 2. MODERN CERAMIC POT */}
        {/* Pot Base */}
        <path
          d="M 42 125 C 42 122, 78 122, 78 125 L 75 155 C 75 159, 45 159, 45 155 Z"
          fill="url(#pot-grad)"
          stroke="#94a3b8"
          strokeWidth="1.2"
        />
        {/* Pot Rim Highlight/Border */}
        <ellipse cx="60" cy="125" rx="18" ry="2.5" fill="url(#pot-rim-grad)" stroke="#94a3b8" strokeWidth="1" />
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
