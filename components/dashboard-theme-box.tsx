"use client"

import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { useDashboardBg, type BgThemeType } from "@/components/dashboard-bg-provider"

const PRESETS: {
  id: BgThemeType
  name: string
  colorHex: string
  isClassroom?: boolean
}[] = [
  { id: "solid-black", name: "Solid Black", colorHex: "#000000" },
  { id: "obsidian-slate", name: "Obsidian Slate", colorHex: "#090d16" },
  { id: "midnight-blue", name: "Midnight Blue", colorHex: "#070e1b" },
  { id: "cyber-emerald", name: "Cyber Emerald", colorHex: "#03140e" },
  { id: "classroom", name: "Classroom View", colorHex: "#1e293b", isClassroom: true },
]

export function DashboardThemeBox() {
  const { bgType, setBgType, customColor, setCustomColor } = useDashboardBg()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Determine current active preview color
  const activePreset = PRESETS.find((p) => p.id === bgType)
  const previewColor =
    bgType === "custom"
      ? customColor
      : activePreset
      ? activePreset.colorHex
      : "#000000"

  return (
    <div ref={boxRef} className="relative z-50">
      {/* Trigger Button (Sleek Glass Box in Top Right) */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/80 px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-200 backdrop-blur-md shadow-md transition-all duration-300 hover:border-emerald-400/60 hover:bg-slate-900/90 hover:text-white hover:shadow-[0_0_18px_rgba(52,211,153,0.3)]"
      >
        <span
          className="h-3.5 w-3.5 rounded-full border border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-transform group-hover:scale-110"
          style={{
            backgroundColor: previewColor,
            backgroundImage:
              bgType === "classroom"
                ? "linear-gradient(135deg, #0284c7 0%, #0f172a 100%)"
                : undefined,
          }}
        />
        <span>[ 🎨 BG COLOR ]</span>
        <span className="text-[10px] opacity-60 group-hover:opacity-100">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Popover Setup Box (Antigravity IDE Setup Style) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-white/20 bg-slate-950/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                [ DASHBOARD BG SETUP ]
              </span>
              <span className="font-mono text-[10px] text-slate-400 uppercase">
                {bgType}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-mono text-[11px] font-medium text-slate-300">
                Select Background Theme:
              </p>

              {/* Preset Swatches */}
              <div className="grid grid-cols-1 gap-1.5">
                {PRESETS.map((preset) => {
                  const isSelected = bgType === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setBgType(preset.id)
                      }}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-left font-mono text-xs transition-all ${
                        isSelected
                          ? "border border-emerald-400/60 bg-emerald-500/15 font-semibold text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                          : "border border-white/5 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-4 rounded-full border border-white/30 shadow-sm"
                          style={{
                            backgroundColor: preset.colorHex,
                            backgroundImage: preset.isClassroom
                              ? "linear-gradient(135deg, #0284c7 0%, #0f172a 100%)"
                              : undefined,
                          }}
                        />
                        <span>{preset.name}</span>
                      </div>
                      {isSelected && (
                        <span className="text-xs text-emerald-400">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Custom Color Swatch Picker */}
              <div className="mt-2 border-t border-white/10 pt-2.5">
                <div
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 transition-all ${
                    bgType === "custom"
                      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
                      : "border-white/5 bg-white/5 text-slate-300"
                  }`}
                >
                  <label
                    htmlFor="custom-color-picker"
                    className="flex cursor-pointer items-center gap-2.5 font-mono text-xs"
                  >
                    <input
                      id="custom-color-picker"
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value)
                        setBgType("custom")
                      }}
                      className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <span>Custom Hex Color</span>
                  </label>
                  <span className="font-mono text-xs text-slate-400 uppercase">
                    {customColor}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
