import blue from '../../assets/figma/avatar-blue.svg'
import dusk from '../../assets/figma/avatar-dusk.svg'
import moss from '../../assets/figma/avatar-moss.svg'
import plum from '../../assets/figma/avatar-plum.svg'
import sky from '../../assets/figma/avatar-sky.svg'
import { cn } from '../../lib/cn'
import type { AvatarVariant } from '../../lib/avatar'

// Avatar/* (Figma 32:686, 32:693, 32:700, 32:707): pixel ninja sprite on a tinted tile, 4px ink border, 18px radius.
const VARIANTS = {
  moss: { sprite: moss, bg: '#e6f4da' },
  dusk: { sprite: dusk, bg: '#e9e4fa' },
  plum: { sprite: plum, bg: '#f0e6ff' },
  sky: { sprite: sky, bg: '#e3ebff' },
  blue: { sprite: blue, bg: '#e3ebff' },
} as const

export function Avatar({ variant = 'moss', size = 48, className }: { variant?: AvatarVariant; size?: number; className?: string }) {
  const v = VARIANTS[variant]
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-[18px] border-4 border-ink', className)}
      style={{ width: size, height: size, background: v.bg }}
      aria-hidden
    >
      <img
        src={v.sprite}
        alt=""
        className="absolute block max-w-none"
        style={{ left: 'calc(12.5% - 3px)', top: 'calc(14.06% - 2.88px)', width: 'calc(75% + 6px)', height: 'calc(75% + 6.01px)' }}
      />
    </div>
  )
}
