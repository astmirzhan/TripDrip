import { cn } from '../../lib/cn'
import { Icon } from './Icon'

export type LevelState = 'done' | 'current' | 'locked' | 'photo'

// UI/Level node (Figma 32:620 done, 32:623 current, 32:626 locked, 32:631 photo): 72px tile, 18px radius, 6px shadow.
const TILE: Record<LevelState, string> = {
  done: 'bg-leaf text-white',
  current: 'bg-yellow text-ink',
  locked: 'bg-lilac',
  photo: 'bg-white',
}

export function LevelNode({ state, number, size = 72, className }: { state: LevelState; number?: number; size?: number; className?: string }) {
  const k = size / 72
  return (
    <div
      className={cn('flex items-center justify-center rounded-[18px] border-4 border-ink shadow-[0_6px_0_0_#2e1b5b]', TILE[state], className)}
      style={{ width: size, height: size, borderRadius: 18 * k }}
    >
      {state === 'locked' && <Icon name="lock" size={24 * k} />}
      {state === 'photo' && <Icon name="camera" size={30 * k} />}
      {(state === 'done' || state === 'current') && (
        <span className="font-display leading-[1.05]" style={{ fontSize: 30 * k }}>
          {number}
        </span>
      )}
    </div>
  )
}
