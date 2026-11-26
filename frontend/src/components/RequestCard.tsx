import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import type { AvatarVariant } from '../lib/avatar'
import { Avatar } from './ui/Avatar'
import { Tag } from './ui/Chip'
import { CheckBadge } from './ui/Icon'

interface RequestCardProps {
  name: string
  avatar: AvatarVariant
  subtitle: string
  type: string
  body: string
  meta: string
  tags?: string[]
  /** Russian copy for locals uses Tiny5 (Figma note on TD/Request card). */
  cyr?: boolean
  children?: ReactNode
}

// TD/Request card (Figma 161:4063).
export function RequestCard({ name, avatar, subtitle, type, body, meta, tags = [], cyr = false, children }: RequestCardProps) {
  const text = cyr ? 'font-cyr' : 'font-body'
  return (
    <article className="flex w-full flex-col gap-[10px] rounded-[12px] border-3 border-ink bg-white p-[16px] shadow-card">
      <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[8px]">
        <Avatar variant={avatar} size={52} />
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <div className="flex items-center gap-[6px]">
            <p className="truncate font-display text-[30px] leading-none text-ink">{name}</p>
            <CheckBadge size={14} thin />
          </div>
          <p className={cn(text, 'text-[16px] text-ink-soft')}>{subtitle}</p>
        </div>
        <Tag selected cyr={cyr}>
          {type}
        </Tag>
      </div>
      <p className={cn(text, 'text-[20px] break-words text-ink')}>{body}</p>
      <p className={cn(text, 'text-[16px] text-ink-soft')}>{meta}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-[6px]">
          {tags.map((t) => (
            <Tag key={t} cyr={cyr}>
              {t}
            </Tag>
          ))}
        </div>
      )}
      {children}
    </article>
  )
}
