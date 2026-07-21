"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

export type BgThemeType =
  | "solid-black"
  | "obsidian-slate"
  | "midnight-blue"
  | "cyber-emerald"
  | "classroom"
  | "custom"

interface DashboardBgContextType {
  bgType: BgThemeType
  setBgType: (type: BgThemeType) => void
  customColor: string
  setCustomColor: (color: string) => void
}

const DashboardBgContext = createContext<DashboardBgContextType>({
  bgType: "solid-black",
  setBgType: () => {},
  customColor: "#000000",
  setCustomColor: () => {},
})

export function DashboardBgProvider({ children }: { children: React.ReactNode }) {
  const [bgType, setBgTypeState] = useState<BgThemeType>("solid-black")
  const [customColor, setCustomColorState] = useState<string>("#000000")

  useEffect(() => {
    try {
      const savedType = localStorage.getItem("kognit_dashboard_bg_type") as BgThemeType
      const savedColor = localStorage.getItem("kognit_dashboard_custom_color")
      if (savedType) setBgTypeState(savedType)
      if (savedColor) setCustomColorState(savedColor)
    } catch {
      // fallback
    }
  }, [])

  const setBgType = (type: BgThemeType) => {
    setBgTypeState(type)
    try {
      localStorage.setItem("kognit_dashboard_bg_type", type)
    } catch {}
  }

  const setCustomColor = (color: string) => {
    setCustomColorState(color)
    try {
      localStorage.setItem("kognit_dashboard_custom_color", color)
    } catch {}
  }

  return (
    <DashboardBgContext.Provider
      value={{ bgType, setBgType, customColor, setCustomColor }}
    >
      {children}
    </DashboardBgContext.Provider>
  )
}

export function useDashboardBg() {
  return useContext(DashboardBgContext)
}
