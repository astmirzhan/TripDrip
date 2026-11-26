import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { chipClass } from './styles'

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  selected?: boolean
  /** Use Tiny5 for Cyrillic/Kazakh labels, as in the design. */
  cyr?: boolean
  children: ReactNode
}

export function Chip({ selected = false, cyr = false, className, children, ...rest }: ChipProps) {
  return (
    <button type="button" aria-pressed={selected} className={chipClass(selected, cyr, className)} {...rest}>
      {children}
    </button>
  )
}

/** Non-interactive chip, used for statuses and tags. */
export function Tag({ selected = false, cyr = false, className, children }: { selected?: boolean; cyr?: boolean; className?: string; children: ReactNode }) {
  return <span className={chipClass(selected, cyr, className)}>{children}</span>
}
