import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

/** Switch/* (Figma 165:7144): 44 × 24 track, 3px border, 6px radius. */
export function Switch({ checked, onChange, children, disabled }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-[10px] text-left disabled:opacity-60"
    >
      <span className={cn('relative h-[24px] w-[44px] shrink-0 rounded-[6px] border-3 border-ink', checked ? 'bg-leaf' : 'bg-lilac')}>
        <span
          className={cn(
            'absolute top-[2px] size-[14px] rounded-[3px] border-2 border-ink bg-white transition-[left] duration-100',
            checked ? 'left-[22px]' : 'left-[2px]',
          )}
        />
      </span>
      <span className="label text-ink">{children}</span>
    </button>
  )
}

/** Yellow check box from the sign-up consent row (Figma 157:1211). */
export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex w-full cursor-pointer items-center gap-[10px]">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={cn(
          'flex size-[28px] shrink-0 items-center justify-center rounded-[6px] border-3 border-ink peer-focus-visible:outline-3 peer-focus-visible:outline-link-blue',
          checked ? 'bg-yellow' : 'bg-white',
        )}
      >
        {checked && <Icon name="check" size={18} />}
      </span>
      <span className="flex-1 font-body text-[16px] text-ink">{children}</span>
    </label>
  )
}
