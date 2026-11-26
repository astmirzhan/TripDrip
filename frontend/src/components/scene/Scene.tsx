import baiterek from '../../assets/figma/baiterek.svg'
import mountains from '../../assets/figma/mountains.svg'
import yurt from '../../assets/figma/yurt.svg'
import { cn } from '../../lib/cn'

// Scene/Steppe (Figma 156:25) rebuilt as one 1440 × 810 SVG. Values are the column tops from the Figma layers.
const CLOUD_BAND_TOPS = [
  479, 460, 462, 449, 451, 453, 461, 459, 441, 459, 474, 465, 478, 477, 503, 495, 495, 506, 512, 508, 507, 490, 478, 473, 475, 456, 457, 443,
  444, 459, 447, 441, 449, 453, 461, 466, 471, 484, 487, 501, 513, 515, 496, 501, 505, 495, 490, 479, 468, 454, 464, 444, 447, 460, 448, 441,
  462, 472, 475, 481,
]
const BUSH_TOPS = [
  613, 607, 594, 591, 589, 592, 598, 599, 605, 609, 619, 623, 626, 625, 612, 607, 607, 599, 599, 592, 599, 588, 603, 600, 612, 614, 624, 618,
  627, 620, 613, 613, 609, 601, 596, 591, 595, 603, 601, 610, 611, 611, 625, 624, 622, 617, 610, 609, 596, 601, 596, 589, 596, 595, 603, 609,
  610, 621, 617, 616, 616, 611, 610, 609, 604, 598, 597, 597, 594, 603, 608, 608, 616, 617, 616, 624, 614, 612, 613, 605, 596, 590, 591, 597,
  596, 606, 603, 611, 609, 621,
]
const SOIL_ROWS = [
  { y: 734, x0: 7 },
  { y: 758, x0: 19 },
  { y: 782, x0: 31 },
  { y: 806, x0: 3 },
]

function Cloud({ x, y, unit }: { x: number; y: number; unit: number }) {
  const rows = [
    { dx: 5, w: 6 },
    { dx: 3, w: 10 },
    { dx: 1, w: 14 },
    { dx: 0, w: 16 },
  ]
  return (
    <g>
      {rows.map((r, i) => (
        <rect key={i} x={x + r.dx * unit} y={y + i * unit} width={r.w * unit} height={unit} fill="#fff" />
      ))}
      <rect x={x} y={y + 4 * unit} width={16 * unit} height={unit} fill="#c9d2f7" />
    </g>
  )
}

/** Full-viewport steppe background shared by every screen. */
export function SceneBackground({ sprites = [], className }: { sprites?: Sprite[]; className?: string }) {
  return (
    <svg
      className={cn('pointer-events-none fixed inset-0 -z-10 h-full w-full', className)}
      viewBox="0 0 1440 810"
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fa4e7" />
          <stop offset="1" stopColor="#e0fab2" />
        </linearGradient>
      </defs>
      {/* Sky extends above the frame so tall viewports never show a seam. */}
      <rect x="-2000" y="-4000" width="5440" height="4810" fill="#8fa4e7" />
      <rect x="-2000" y="0" width="5440" height="810" fill="url(#sky)" />
      <Cloud x={90} y={80} unit={10} />
      <Cloud x={1100} y={120} unit={12} />
      <image href={mountains} x="0" y="0" width="1440" height="810" preserveAspectRatio="none" />
      {CLOUD_BAND_TOPS.map((top, i) => (
        <g key={`c${i}`}>
          <rect x={i * 24} y={top} width="24" height={700 - top} fill="#fff" />
          <rect x={i * 24} y={top} width="24" height="6" fill="#f3f5ff" />
        </g>
      ))}
      {BUSH_TOPS.map((top, i) => (
        <g key={`b${i}`}>
          <rect x={i * 16} y={top} width="16" height={700 - top} fill="#7fbf5e" />
          <rect x={i * 16} y={top} width="16" height="4" fill="#4c8c4a" />
        </g>
      ))}
      {/* Ground continues sideways for wide screens. */}
      <rect x="-2000" y="686" width="5440" height="4" fill="#2e1b5b" />
      <rect x="-2000" y="690" width="5440" height="26" fill="#a6d86a" />
      {Array.from({ length: 45 }, (_, i) => (
        <rect key={`g${i}`} x={i * 32} y="690" width="16" height="26" fill="#7fbf5e" />
      ))}
      <rect x="-2000" y="716" width="5440" height="4" fill="#2e1b5b" />
      <rect x="-2000" y="720" width="5440" height="3000" fill="#2f6b45" />
      {SOIL_ROWS.flatMap((row) =>
        Array.from({ length: 36 }, (_, i) => (
          <rect key={`s${row.y}-${i}`} x={row.x0 + i * 40} y={row.y} width="8" height={row.y === 806 ? 4 : 8} fill="#24543a" />
        )),
      )}
      {sprites.map((sprite, i) => (
        <SpriteImage key={i} {...sprite} />
      ))}
    </svg>
  )
}

export type Sprite = { kind: 'yurt' | 'baiterek'; x: number; width?: number }

function SpriteImage({ kind, x, width }: Sprite) {
  const w = width ?? (kind === 'yurt' ? 144 : 104)
  const h = kind === 'yurt' ? (w * 96) / 144 : (w * 336) / 104
  return <image href={kind === 'yurt' ? yurt : baiterek} x={x} y={686 - h} width={w} height={h} preserveAspectRatio="none" />
}
