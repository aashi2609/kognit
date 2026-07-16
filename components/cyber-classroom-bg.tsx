"use client"

import { CodedCityWindowBg } from "@/components/coded-city-window-bg"

/**
 * Persistent background layer that renders the custom coded office window city view,
 * blurred out to serve as a readable background behind the main workspace layout.
 */
export function CyberClassroomBg() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <CodedCityWindowBg lit={true} blurred={true} showReflections={true} />
    </div>
  )
}
