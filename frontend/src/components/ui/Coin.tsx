import { cn } from '../../lib/cn'

// UI/Coin (Figma 32:575 collected, 32:584 empty): 8x8 pixel coin with a 2px ink drop shadow.
const BODY = [
  { x: 2, y: 0, w: 4, h: 1 },
  { x: 1, y: 1, w: 6, h: 1 },
  { x: 0, y: 2, w: 8, h: 4 },
  { x: 1, y: 6, w: 6, h: 1 },
  { x: 2, y: 7, w: 4, h: 1 },
]

export function Coin({ size = 32, empty = false, className }: { size?: number; empty?: boolean; className?: string }) {
  const fill = empty ? 'var(--color-mist)' : 'var(--color-yellow)'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden
      className={cn('shrink-0 drop-shadow-[2px_2px_0_#2e1b5b]', className)}
    >
      {BODY.map((r) => (
        <rect key={`${r.x}-${r.y}`} {...r} width={r.w} height={r.h} fill={fill} />
      ))}
      {!empty && (
        <>
          <rect x={3} y={2} width={1} height={4} fill="var(--color-white)" />
          <rect x={4} y={2} width={1} height={4} fill="var(--color-yellow-dark)" />
        </>
      )}
    </svg>
  )
}

/** Coins pill from the top nav (Figma I160:2804;157:26). */
export function CoinBalance({ value, className }: { value: number | string; className?: string }) {
  return (
    <div className={cn('flex shrink-0 items-center gap-[8px] rounded-[10px] bg-ink py-[6px] pr-[14px] pl-[10px]', className)}>
      <Coin size={24} />
      <span className="font-display text-[30px] leading-none text-yellow">{value}</span>
    </div>
  )
}
