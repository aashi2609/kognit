"use client"

import { usePathname } from "next/navigation"
import { CodedCityWindowBg } from "@/components/coded-city-window-bg"
import { useDashboardBg } from "@/components/dashboard-bg-provider"

/**
 * Persistent background layer that renders the custom coded office window city view or chosen solid theme color.
 * On /dashboard, defaults to solid black with support for theme customization box.
 */
export function CyberClassroomBg() {
  const pathname = usePathname()
  const isDashboard = pathname === "/dashboard"
  const isAuth = pathname === "/login" || pathname === "/signup"
  const { bgType, customColor } = useDashboardBg()

  if (isDashboard) {
    if (bgType === "solid-black") {
      return (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-[#000000] transition-colors duration-500"
          aria-hidden="true"
        />
      )
    }
    if (bgType === "obsidian-slate") {
      return (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-[#090d16] transition-colors duration-500"
          aria-hidden="true"
        />
      )
    }
    if (bgType === "midnight-blue") {
      return (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-[#070e1b] transition-colors duration-500"
          aria-hidden="true"
        />
      )
    }
    if (bgType === "cyber-emerald") {
      return (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-[#03140e] transition-colors duration-500"
          aria-hidden="true"
        />
      )
    }
    if (bgType === "custom") {
      return (
        <div
          className="pointer-events-none fixed inset-0 z-0 transition-colors duration-500"
          style={{ backgroundColor: customColor }}
          aria-hidden="true"
        />
      )
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <CodedCityWindowBg
        lit={true}
        blurred={true}
        showReflections={true}
        parallax={!isAuth}
      />
      {/* Soft vignette overlay on auth pages */}
      {isAuth && (
        <div
          className="absolute inset-0 transition-opacity duration-700 pointer-events-none z-1"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.38) 0%, rgba(3, 7, 18, 0.62) 85%)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
          }}
        />
      )}
    </div>
  )
}

