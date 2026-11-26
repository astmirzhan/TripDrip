import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { buttonClass, type Variant } from './styles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, className)} disabled={disabled || loading} {...rest}>
      {loading ? '…' : children}
    </button>
  )
}

export function ButtonLink({ variant = 'primary', className, ...rest }: LinkProps & { variant?: Variant }) {
  return <Link className={cn(buttonClass(variant, className), 'active:translate-y-[4px] active:shadow-button-pressed')} {...rest} />
}
