import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/** Main white card: 4px ink border, 18px radius, 8px solid ink shadow. */
export function Panel({ className, tone = 'white', ...rest }: HTMLAttributes<HTMLElement> & { tone?: 'white' | 'cream' }) {
  return (
    <section
      className={cn(
        'relative flex flex-col rounded-[18px] border-4 border-ink shadow-panel',
        tone === 'cream' ? 'bg-cream' : 'bg-white',
        className,
      )}
      {...rest}
    />
  )
}

/** Small green section heading used across screens. */
export function Eyebrow({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('label text-leaf', className)} {...rest} />
}

/** Inline error/notice box. */
export function Notice({ tone = 'error', className, ...rest }: HTMLAttributes<HTMLParagraphElement> & { tone?: 'error' | 'ok' }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-[10px] border-3 border-ink px-[12px] py-[8px] font-body text-[16px]',
        tone === 'error' ? 'bg-danger-soft text-danger' : 'bg-mint text-ink',
        className,
      )}
      {...rest}
    />
  )
}
