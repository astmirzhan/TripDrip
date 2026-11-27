import { cn } from '../../lib/cn'

export type Variant = 'primary' | 'secondary'

// UI/Button (Figma 32:564 / 32:566): 4px ink border, 12px radius, 6px ink drop shadow, Jersey 10 30px.
export const buttonClass = (variant: Variant = 'primary', className?: string) =>
  cn(
    'relative inline-flex max-w-full shrink-0 items-center justify-center rounded-[12px] border-4 border-ink px-[24px] pt-[10px] pb-[12px] sm:px-[36px]',
    'text-center font-display text-[30px] leading-none text-ink sm:whitespace-nowrap shadow-button transition-[transform,box-shadow] duration-75',
    'enabled:active:translate-y-[4px] enabled:active:shadow-button-pressed disabled:opacity-60',
    variant === 'primary' ? 'bg-yellow' : 'bg-white',
    className,
  )

// UI/Chip (Figma 32:570 default, 32:572 selected): 3px ink border, 10px radius, padding 8/16.
export const chipClass = (selected = false, cyr = false, className?: string) =>
  cn(
    'inline-flex shrink-0 items-center rounded-[10px] border-3 border-ink px-[16px] py-[8px] whitespace-nowrap',
    cyr ? 'font-cyr text-[14px] leading-[1.2] uppercase' : 'label',
    selected ? 'bg-ink text-yellow' : 'bg-white text-ink',
    className,
  )
