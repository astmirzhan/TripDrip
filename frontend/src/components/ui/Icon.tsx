import camera from '../../assets/figma/icon-camera.svg'
import check from '../../assets/figma/icon-check.svg'
import flag from '../../assets/figma/icon-flag.svg'
import lock from '../../assets/figma/icon-lock.svg'
import people from '../../assets/figma/icon-people.svg'
import { cn } from '../../lib/cn'

const ICONS = { camera, check, flag, lock, people } as const
export type IconName = keyof typeof ICONS

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return <img src={ICONS[name]} alt="" width={size} height={size} className={cn('shrink-0', className)} />
}

/** Yellow check badge used for "verified", "learned" and checkbox states. */
export function CheckBadge({ size = 14, thin = false, className }: { size?: number; thin?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-start bg-yellow border-ink',
        thin ? 'rounded-[5px] border-2 p-px' : 'rounded-[6px] border-3 p-[2px]',
        className,
      )}
    >
      <Icon name="check" size={size} />
    </span>
  )
}
