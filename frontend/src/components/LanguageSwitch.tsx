import { LANGS, useI18n } from '../i18n'
import { cn } from '../lib/cn'

/** EN / RU / ҚАЗ switch; the choice is saved on this device. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t('nav.language')} className={cn('flex shrink-0 overflow-hidden rounded-[10px] border-3 border-ink bg-white', className)}>
      {LANGS.map((l, i) => (
        <button
          key={l.value}
          type="button"
          aria-pressed={lang === l.value}
          title={l.label}
          onClick={() => setLang(l.value)}
          className={cn(
            'px-[9px] py-[7px] font-cyr text-[13px] leading-none',
            i > 0 && 'border-l-3 border-ink',
            lang === l.value ? 'bg-ink text-yellow' : 'text-ink',
          )}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}
