"use client"

import { useMouseParallax } from "@/components/mouse-parallax-provider"

interface CodedCityWindowBgProps {
  lit?: boolean
  blurred?: boolean
  showReflections?: boolean
  parallax?: boolean
}

// Lowered, subtle background tree line with only oak and poplar types (no pine)
const TREES = [
  { x: -20, h: 130, r: 55, type: "oak", group: 0 },
  { x: 80, h: 115, r: 32, type: "poplar", group: 1 },
  { x: 170, h: 140, r: 36, type: "poplar", group: 2 },
  { x: 260, h: 110, r: 50, type: "oak", group: 0 },
  { x: 350, h: 125, r: 48, type: "oak", group: 1 },
  { x: 440, h: 145, r: 40, type: "poplar", group: 2 },
  { x: 530, h: 120, r: 55, type: "oak", group: 0 },
  { x: 620, h: 110, r: 32, type: "poplar", group: 1 },
  { x: 710, h: 142, r: 36, type: "poplar", group: 2 },
  { x: 800, h: 115, r: 50, type: "oak", group: 0 },
  { x: 890, h: 130, r: 48, type: "oak", group: 1 },
  { x: 980, h: 148, r: 40, type: "poplar", group: 2 },
  { x: 1070, h: 120, r: 55, type: "oak", group: 0 },
  { x: 1160, h: 115, r: 32, type: "poplar", group: 1 },
  { x: 1240, h: 145, r: 36, type: "poplar", group: 2 },
]

export function CodedCityWindowBg({
  lit = true,
  blurred = false,
  showReflections = true,
  parallax = true,
}: CodedCityWindowBgProps) {
  const mouse = useMouseParallax()

  // Generate parallax translation offsets (zeroed out if parallax is disabled)
  const cloudX = parallax ? mouse.nx * 20 : 0
  const cloudY = parallax ? mouse.ny * 8 : 0

  const farX = parallax ? mouse.nx * 8 : 0
  const farY = parallax ? mouse.ny * 3 : 0

  const midX = parallax ? mouse.nx * 14 : 0
  const midY = parallax ? mouse.ny * 6 : 0

  const foreX = parallax ? mouse.nx * 24 : 0
  const foreY = parallax ? mouse.ny * 10 : 0

  const greeneryX = parallax ? mouse.nx * 28 : 0
  const greeneryY = parallax ? mouse.ny * 12 : 0

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 select-none overflow-hidden transition-all duration-1000 ${
        blurred ? "blur-[6px] scale-[1.03]" : ""
      }`}
      aria-hidden="true"
    >
      <style>{`
        @keyframes slow-float {
          0% { transform: translate(-5%, -2%); }
          50% { transform: translate(5%, 2%); }
          100% { transform: translate(-5%, -2%); }
        }
        @keyframes sun-shimmer {
          0%, 100% { opacity: 0.28; }
          50% { opacity: 0.38; }
        }
      `}</style>

      {/* 1. SKY GRADIENT (Daytime office window vibe when lit, deep night when unlit) */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: lit
            ? "linear-gradient(to bottom, #3b82f6 0%, #60a5fa 35%, #93c5fd 60%, #bae6fd 80%, #f0f9ff 100%)"
            : "linear-gradient(to bottom, #030712 0%, #070e1b 35%, #0f172a 60%, #0b1120 80%, #020617 100%)",
        }}
      />

      {/* 2. FLOATING CLOUDS (Parallax Depth 1.2) */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${cloudX}px, ${cloudY}px)`,
          animation: "slow-float 32s infinite ease-in-out",
        }}
      >
        <svg
          viewBox="0 0 1200 800"
          className="absolute inset-0 h-full w-full opacity-[0.62]"
          preserveAspectRatio="none"
        >
          {/* Cloud 1 */}
          <path
            d="M 120 220 C 140 180, 200 180, 220 210 C 240 190, 290 190, 310 220 C 330 200, 380 210, 390 240 C 400 270, 380 290, 350 290 L 120 290 Z"
            fill="#ffffff"
          />
          {/* Cloud 2 */}
          <path
            d="M 550 160 C 570 120, 630 120, 650 150 C 670 135, 720 135, 740 165 C 765 150, 810 165, 820 195 C 825 220, 805 240, 770 240 L 550 240 Z"
            fill="#ffffff"
            opacity="0.8"
          />
          {/* Cloud 3 */}
          <path
            d="M 850 280 C 865 250, 910 250, 925 270 C 940 255, 980 260, 990 285 C 1005 275, 1040 285, 1045 310 C 1045 330, 1025 340, 995 340 L 850 340 Z"
            fill="#ffffff"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* 3. CITY SKYLINE - FAR LAYER (Parallax Depth 1.0) */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${farX}px, ${farY}px)` }}
      >
        <svg
          viewBox="0 0 1200 800"
          className="absolute inset-x-0 bottom-[14%] h-[68%] w-full"
          preserveAspectRatio="none"
        >
          {/* Far Building 1 */}
          <rect x="50" y="240" width="130" height="560" fill="#2563eb" opacity="0.12" />
          {/* Far Building 2 */}
          <rect x="250" y="320" width="110" height="480" fill="#1d4ed8" opacity="0.14" />
          {/* Far Building 3 (Pointy tower) */}
          <polygon points="460,400 500,260 540,400" fill="#1e40af" opacity="0.1" />
          <rect x="460" y="400" width="80" height="400" fill="#1e40af" opacity="0.1" />
          {/* Far Building 4 */}
          <rect x="680" y="290" width="140" height="510" fill="#2563eb" opacity="0.13" />
          {/* Far Building 5 */}
          <rect x="920" y="350" width="100" height="450" fill="#1d4ed8" opacity="0.15" />
        </svg>
      </div>

      {/* 4. CITY SKYLINE - MID LAYER (Parallax Depth 0.8) */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${midX}px, ${midY}px)` }}
      >
        <svg
          viewBox="0 0 1200 800"
          className="absolute inset-x-0 bottom-[14%] h-[68%] w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="mid-bldg-grad-1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#3730a3" />
            </linearGradient>
            <linearGradient id="mid-bldg-grad-2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
          </defs>

          {/* Mid Building 1 */}
          <rect x="140" y="280" width="150" height="520" fill="url(#mid-bldg-grad-1)" opacity="0.3" />
          {Array.from({ length: 4 }).map((_, col) => (
            <line
              key={`m1-col-${col}`}
              x1={160 + col * 32}
              y1="300"
              x2={160 + col * 32}
              y2="800"
              stroke="#818cf8"
              strokeWidth="1.5"
              strokeDasharray="3,12"
              opacity="0.32"
            />
          ))}

          {/* Mid Building 2 */}
          <rect x="360" y="380" width="130" height="420" fill="url(#mid-bldg-grad-2)" opacity="0.35" />

          {/* Mid Building 3 */}
          <rect x="580" y="230" width="160" height="570" fill="url(#mid-bldg-grad-1)" opacity="0.28" />
          {Array.from({ length: 5 }).map((_, col) => (
            <line
              key={`m3-col-${col}`}
              x1={600 + col * 28}
              y1="250"
              x2={600 + col * 28}
              y2="800"
              stroke="#818cf8"
              strokeWidth="1.5"
              strokeDasharray="4,10"
              opacity="0.3"
            />
          ))}

          {/* Mid Building 4 */}
          <rect x="800" y="310" width="140" height="490" fill="url(#mid-bldg-grad-2)" opacity="0.32" />
        </svg>
      </div>

      {/* 5. CITY SKYLINE - FOREGROUND LAYER (Parallax Depth 0.6) */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${foreX}px, ${foreY}px)` }}
      >
        <svg
          viewBox="0 0 1200 800"
          className="absolute inset-x-0 bottom-[14%] h-[68%] w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="fore-glass-1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="fore-glass-2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="fore-glass-3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* Foreground Tower 1 (Left skyscraper) */}
          <g>
            <rect x="80" y="160" width="160" height="640" fill="url(#fore-glass-1)" />
            {/* Window vertical lines */}
            {Array.from({ length: 6 }).map((_, col) => (
              <line
                key={`f1-col-${col}`}
                x1={102 + col * 23}
                y1="180"
                x2={102 + col * 23}
                y2="800"
                stroke="#dbeafe"
                strokeWidth="2.5"
                strokeDasharray="6,8"
                opacity="0.55"
              />
            ))}
            {/* Building left border highlight */}
            <line x1="80" y1="160" x2="80" y2="800" stroke="#eff6ff" strokeWidth="2.5" opacity="0.6" />
            {/* Building right shadow border */}
            <line x1="240" y1="160" x2="240" y2="800" stroke="#1d4ed8" strokeWidth="2.5" opacity="0.4" />
          </g>

          {/* Foreground Building 2 (Mid-Left wide glass building) */}
          <g>
            <rect x="290" y="350" width="200" height="450" fill="url(#fore-glass-2)" />
            {/* Grid Pattern windows */}
            {Array.from({ length: 7 }).map((_, col) => (
              <line
                key={`f2-col-${col}`}
                x1={315 + col * 25}
                y1="365"
                x2={315 + col * 25}
                y2="800"
                stroke="#eff6ff"
                strokeWidth="1.5"
                strokeDasharray="2,5"
                opacity="0.45"
              />
            ))}
            {/* Horizontal window dividers */}
            {Array.from({ length: 15 }).map((_, row) => (
              <line
                key={`f2-row-${row}`}
                x1="290"
                y1={380 + row * 28}
                x2="490"
                y2={380 + row * 28}
                stroke="#1d4ed8"
                strokeWidth="1.5"
                opacity="0.25"
              />
            ))}
            <line x1="290" y1="350" x2="290" y2="800" stroke="#eff6ff" strokeWidth="2" opacity="0.6" />
          </g>

          {/* Foreground Tower 3 (Center-Right skyscraper) */}
          <g>
            <rect x="540" y="110" width="150" height="690" fill="url(#fore-glass-3)" />
            {/* Window vertical lines */}
            {Array.from({ length: 5 }).map((_, col) => (
              <line
                key={`f3-col-${col}`}
                x1={565 + col * 27}
                y1="130"
                x2={565 + col * 27}
                y2="800"
                stroke="#f0f9ff"
                strokeWidth="2.5"
                strokeDasharray="8,6"
                opacity="0.6"
              />
            ))}
            <line x1="540" y1="110" x2="540" y2="800" stroke="#eff6ff" strokeWidth="3" opacity="0.75" />
            <line x1="690" y1="110" x2="690" y2="800" stroke="#0369a1" strokeWidth="2" opacity="0.45" />
          </g>

          {/* Foreground Building 4 (Far Right skyscraper) */}
          <g>
            <rect x="830" y="220" width="180" height="580" fill="url(#fore-glass-2)" />
            {/* Mesh windows */}
            {Array.from({ length: 6 }).map((_, col) => (
              <line
                key={`f4-col-${col}`}
                x1={855 + col * 28}
                y1="240"
                x2={855 + col * 28}
                y2="800"
                stroke="#eff6ff"
                strokeWidth="2"
                strokeDasharray="4,6"
                opacity="0.5"
              />
            ))}
            <line x1="830" y1="220" x2="830" y2="800" stroke="#eff6ff" strokeWidth="2.5" opacity="0.7" />
          </g>
        </svg>
      </div>

      {/* 6. DIAGONAL SUNLIGHT RAYS & SHIMMER */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen transition-all duration-1000"
        style={{
          opacity: lit ? 0.35 : 0,
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.12) 42%, transparent 75%)",
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 52%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen transition-all duration-1000"
        style={{
          opacity: lit ? 1 : 0,
          background: "repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0px, rgba(255, 255, 255, 0.16) 50px, transparent 50px, transparent 100px)",
          filter: "blur(24px)",
          animation: "sun-shimmer 8s infinite ease-in-out",
        }}
      />

      {/* 7. LAYERED REAL TREES (Lower height, Oak & Poplar only - sitting behind the Balcony Parapet Ledge) */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${greeneryX}px, ${greeneryY}px)` }}
      >
        <svg
          viewBox="0 0 1200 800"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          {TREES.map((tree, i) => {
            const { x, h: baseH, r, type, group } = tree
            const h = baseH + 45
            const yBase = 720 // Extend trunks below the balcony ledge (which sits at y=688)
            const yTop = yBase - h

            // Leaf color palettes for organic depth variation (warm olive/lime vibe)
            const shadowColors = ["#455825", "#4e652a", "#566e30"]
            const baseColors = ["#658237", "#6f8f3c", "#7da145"]
            const lightColors = ["#8db54e", "#9bc656", "#a2cf5a"]
            const highlightColors = ["#b2c762", "#bad067", "#bed66f"]
            const sunColors = ["#d2eb80", "#d8f085", "#e4fc92"]

            const shadow = shadowColors[group]
            const base = baseColors[group]
            const light = lightColors[group]
            const highlight = highlightColors[group]
            const sun = sunColors[group]

            return (
              <g key={`tree-${i}`}>
                {/* Slender or spreading trunk depending on tree type */}
                {type === "oak" ? (
                  // Spreading tree trunk (Oak)
                  <path
                    d={`M ${x - 9} ${yBase} 
                        C ${x - 7} ${yBase - h * 0.35}, ${x - 14} ${yTop + h * 0.45}, ${x - 17} ${yTop + h * 0.4}
                        L ${x - 13} ${yTop + h * 0.36}
                        C ${x - 8} ${yTop + h * 0.4}, ${x - 3} ${yTop + h * 0.42}, ${x} ${yTop + h * 0.28}
                        L ${x + 3} ${yTop + h * 0.28}
                        C ${x + 5} ${yTop + h * 0.42}, ${x + 10} ${yTop + h * 0.4}, ${x + 15} ${yTop + h * 0.36}
                        L ${x + 18} ${yTop + h * 0.4}
                        C ${x + 13} ${yTop + h * 0.45}, ${x + 7} ${yBase - h * 0.35}, ${x + 9} ${yBase} Z`}
                    fill="#1e140f"
                  />
                ) : (
                  // Tall slender Poplar trunk
                  <path
                    d={`M ${x - 4} ${yBase} L ${x - 1} ${yTop + h * 0.12} L ${x + 1} ${yTop + h * 0.12} L ${x + 4} ${yBase} Z`}
                    fill="#221812"
                  />
                )}

                {/* Layered Foliage depending on tree type */}
                {type === "oak" ? (
                  <>
                    {/* Left Clump */}
                    <circle cx={x - r * 0.55} cy={yTop + h * 0.2} r={r * 0.44} fill={shadow} />
                    <circle cx={x - r * 0.55} cy={yTop + h * 0.18} r={r * 0.39} fill={base} />
                    <circle cx={x - r * 0.55} cy={yTop + h * 0.16} r={r * 0.34} fill={light} />
                    <circle cx={x - r * 0.55} cy={yTop + h * 0.14} r={r * 0.29} fill={highlight} />
                    <circle cx={x - r * 0.55} cy={yTop + h * 0.12} r={r * 0.23} fill={sun} />

                    {/* Right Clump */}
                    <circle cx={x + r * 0.55} cy={yTop + h * 0.2} r={r * 0.44} fill={shadow} />
                    <circle cx={x + r * 0.55} cy={yTop + h * 0.18} r={r * 0.39} fill={base} />
                    <circle cx={x + r * 0.55} cy={yTop + h * 0.16} r={r * 0.34} fill={light} />
                    <circle cx={x + r * 0.55} cy={yTop + h * 0.14} r={r * 0.29} fill={highlight} />
                    <circle cx={x + r * 0.55} cy={yTop + h * 0.12} r={r * 0.23} fill={sun} />

                    {/* Mid Left Clump */}
                    <circle cx={x - r * 0.28} cy={yTop + h * 0.08} r={r * 0.48} fill={shadow} />
                    <circle cx={x - r * 0.28} cy={yTop + h * 0.05} r={r * 0.43} fill={base} />
                    <circle cx={x - r * 0.28} cy={yTop + h * 0.02} r={r * 0.38} fill={light} />
                    <circle cx={x - r * 0.3} cy={yTop} r={r * 0.33} fill={highlight} />
                    <circle cx={x - r * 0.32} cy={yTop - h * 0.04} r={r * 0.27} fill={sun} />

                    {/* Mid Right Clump */}
                    <circle cx={x + r * 0.28} cy={yTop + h * 0.08} r={r * 0.48} fill={shadow} />
                    <circle cx={x + r * 0.28} cy={yTop + h * 0.05} r={r * 0.43} fill={base} />
                    <circle cx={x + r * 0.28} cy={yTop + h * 0.02} r={r * 0.38} fill={light} />
                    <circle cx={x + r * 0.3} cy={yTop} r={r * 0.33} fill={highlight} />
                    <circle cx={x + r * 0.32} cy={yTop - h * 0.04} r={r * 0.27} fill={sun} />

                    {/* Top Center Clump */}
                    <circle cx={x} cy={yTop - h * 0.04} r={r * 0.52} fill={shadow} />
                    <circle cx={x} cy={yTop - h * 0.07} r={r * 0.47} fill={base} />
                    <circle cx={x} cy={yTop - h * 0.1} r={r * 0.42} fill={light} />
                    <circle cx={x} cy={yTop - h * 0.13} r={r * 0.37} fill={highlight} />
                    <circle cx={x - r * 0.03} cy={yTop - h * 0.17} r={r * 0.3} fill={sun} />
                  </>
                ) : (
                  <>
                    {/* Bottom-mid clump */}
                    <ellipse cx={x} cy={yTop + h * 0.32} rx={r * 0.8} ry={r * 0.9} fill={shadow} />
                    <ellipse cx={x} cy={yTop + h * 0.3} rx={r * 0.75} ry={r * 0.85} fill={base} />
                    <ellipse cx={x} cy={yTop + h * 0.28} rx={r * 0.7} ry={r * 0.8} fill={light} />
                    <ellipse cx={x - r * 0.02} cy={yTop + h * 0.26} rx={r * 0.62} ry={r * 0.72} fill={highlight} />
                    <ellipse cx={x - r * 0.04} cy={yTop + h * 0.24} rx={r * 0.5} ry={r * 0.6} fill={sun} />

                    {/* Mid-top clump */}
                    <ellipse cx={x} cy={yTop + h * 0.14} rx={r * 0.9} ry={r * 1.0} fill={shadow} />
                    <ellipse cx={x} cy={yTop + h * 0.12} rx={r * 0.85} ry={r * 0.95} fill={base} />
                    <ellipse cx={x} cy={yTop + h * 0.1} rx={r * 0.8} ry={r * 0.9} fill={light} />
                    <ellipse cx={x - r * 0.03} cy={yTop + h * 0.08} rx={r * 0.7} ry={r * 0.8} fill={highlight} />
                    <ellipse cx={x - r * 0.05} cy={yTop + h * 0.06} rx={r * 0.58} ry={r * 0.68} fill={sun} />

                    {/* Top-most clump */}
                    <ellipse cx={x} cy={yTop - h * 0.04} rx={r * 0.7} ry={r * 0.85} fill={shadow} />
                    <ellipse cx={x} cy={yTop - h * 0.06} rx={r * 0.65} ry={r * 0.8} fill={base} />
                    <ellipse cx={x} cy={yTop - h * 0.08} rx={r * 0.6} ry={r * 0.75} fill={light} />
                    <ellipse cx={x - r * 0.02} cy={yTop - h * 0.1} rx={r * 0.52} ry={r * 0.67} fill={highlight} />
                    <ellipse cx={x - r * 0.04} cy={yTop - h * 0.12} rx={r * 0.4} ry={r * 0.55} fill={sun} />
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* 8. BALCONY LEDGE / TERRACE OUTSIDE (Terracotta Parapet Wall covering the tree trunk bases) */}
      <div className="absolute inset-x-0 bottom-[14%] h-[5%] w-full pointer-events-none">
        <div
          className="h-full w-full shadow-lg"
          style={{
            background: "linear-gradient(to bottom, #ea9a73 0%, #d35400 100%)",
            borderBottom: "1.5px solid rgba(255, 255, 255, 0.15)",
          }}
        />
      </div>

      {/* 9. WINDOW FRAME Pillars & Horizontal Bars */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Top transom frame */}
        <div className="w-full h-8 bg-gradient-to-b from-[#2a2b30] to-[#1c1d22] border-b border-[#3b3c42] shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]" />

        <div className="flex-1 relative flex">
          {/* Vertical Pillar 1 (25%) */}
          <div
            className="absolute top-0 bottom-0 w-[5px] bg-gradient-to-r from-[#2c2d33] via-[#3a3b42] to-[#1a1b20]"
            style={{
              left: "25%",
              boxShadow: "-1px 0 3px rgba(0,0,0,0.4), 1px 0 3px rgba(0,0,0,0.4)",
            }}
          />

          {/* Vertical Pillar 2 (50% - Central Double Pillar) */}
          <div
            className="absolute top-0 bottom-0 w-[12px] bg-gradient-to-r from-[#222328] via-[#3d3f47] via-[#2c2d33] to-[#1e1f24]"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              boxShadow: "-2px 0 6px rgba(0,0,0,0.55), 2px 0 6px rgba(0,0,0,0.55)",
            }}
          />

          {/* Vertical Pillar 3 (75%) */}
          <div
            className="absolute top-0 bottom-0 w-[5px] bg-gradient-to-r from-[#2c2d33] via-[#3a3b42] to-[#1a1b20]"
            style={{
              left: "75%",
              boxShadow: "-1px 0 3px rgba(0,0,0,0.4), 1px 0 3px rgba(0,0,0,0.4)",
            }}
          />

          {/* Middle horizontal bar transom (fits at 48% height) */}
          <div className="absolute top-[48%] inset-x-0 h-4 bg-gradient-to-b from-[#2a2b30] to-[#1a1b20] border-t border-b border-[#3a3c42]" />
        </div>

        {/* Bottom sill / transom frame */}
        <div className="w-full h-10 bg-gradient-to-b from-[#1c1d22] to-[#0a0a0d] border-t border-[#313238] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
      </div>

      {/* 10. GLOSSY INDOOR FLOOR & PILLAR REFLECTIONS */}
      {showReflections && (
        <div className="absolute bottom-0 inset-x-0 h-[14%] w-full bg-[#050608]/92 border-t border-white/[0.04]">
          {/* Reflection of Sky/Bushes (soft cyan glow) */}
          <div
            className="absolute inset-x-0 top-0 h-full opacity-60"
            style={{
              background: "linear-gradient(to bottom, rgba(96, 165, 250, 0.16) 0%, transparent 80%)",
            }}
          />
          {/* Vertical Pillar Reflections */}
          <div
            className="absolute top-0 bottom-0 w-[30px] opacity-40 blur-[4px]"
            style={{
              left: "25%",
              transform: "translateX(-50%)",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, transparent 90%)",
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-[60px] opacity-45 blur-[5px]"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.14) 0%, transparent 90%)",
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-[30px] opacity-40 blur-[4px]"
            style={{
              left: "75%",
              transform: "translateX(-50%)",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, transparent 90%)",
            }}
          />

          {/* Perspective grid lines */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.06]" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="0" y2="120" stroke="#ffffff" strokeWidth="1" />
            <line x1="150" y1="0" x2="-200" y2="120" stroke="#ffffff" strokeWidth="1" />
            <line x1="300" y1="0" x2="50" y2="120" stroke="#ffffff" strokeWidth="1" />
            <line x1="450" y1="0" x2="300" y2="120" stroke="#ffffff" strokeWidth="1" />
            <line x1="600" y1="0" x2="600" y2="120" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="750" y1="0" x2="900" y2="120" stroke="#ffffff" strokeWidth="1" />
            <line x1="900" y1="0" x2="1150" y2="120" stroke="#ffffff" strokeWidth="1" />
            <line x1="1050" y1="0" x2="1400" y2="120" stroke="#ffffff" strokeWidth="1" />
            <line x1="1200" y1="0" x2="1200" y2="120" stroke="#ffffff" strokeWidth="1" />

            {/* Horizontal lines */}
            <line x1="0" y1="20" x2="1200" y2="20" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="0" y1="50" x2="1200" y2="50" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="0" y1="90" x2="1200" y2="90" stroke="#ffffff" strokeWidth="0.8" />
          </svg>
        </div>
      )}
    </div>
  )
}
