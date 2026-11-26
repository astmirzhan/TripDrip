import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

// UI/Input (Figma 32:668): label 14 bold, field mist bg, 3px ink border, 10px radius, padding 12/16, text 20/1.35.
const fieldClass =
  'w-full min-w-0 rounded-[10px] border-3 border-ink bg-mist px-[16px] py-[12px] font-body text-[20px] leading-[1.35] text-ink placeholder:text-ink-soft focus:outline-none focus-visible:outline-3 focus-visible:outline-link-blue'

interface WrapProps {
  label: ReactNode
  className?: string
  children: (id: string) => ReactNode
}

function FieldWrap({ label, className, children }: WrapProps) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-[8px]', className)}>
      <label htmlFor={id} className="label text-ink">
        {label}
      </label>
      {children(id)}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; wrapClassName?: string }

export function Input({ label, wrapClassName, className, ...rest }: InputProps) {
  return <FieldWrap label={label} className={wrapClassName}>{(id) => <input id={id} className={cn(fieldClass, className)} {...rest} />}</FieldWrap>
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: ReactNode; wrapClassName?: string }

export function TextArea({ label, wrapClassName, className, ...rest }: TextAreaProps) {
  return (
    <FieldWrap label={label} className={wrapClassName}>
      {(id) => <textarea id={id} className={cn(fieldClass, 'resize-none', className)} {...rest} />}
    </FieldWrap>
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: ReactNode; wrapClassName?: string }

export function Select({ label, wrapClassName, className, children, ...rest }: SelectProps) {
  return (
    <FieldWrap label={label} className={wrapClassName}>
      {(id) => (
        <select id={id} className={cn(fieldClass, 'appearance-none', className)} {...rest}>
          {children}
        </select>
      )}
    </FieldWrap>
  )
}
