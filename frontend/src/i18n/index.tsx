import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en, type Dict } from './en'
import { kk } from './kk'
import { ru } from './ru'

import type { Lang } from './langs'

export type { Lang } from './langs'
export type TKey = keyof Dict

const DICTS: Record<Lang, Dict> = { en, ru, kk }
const STORAGE_KEY = 'tripdrip.lang'

function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'ru' || saved === 'kk') return saved
  const browser = navigator.language.toLowerCase()
  if (browser.startsWith('kk')) return 'kk'
  if (browser.startsWith('ru')) return 'ru'
  return 'en'
}

type Vars = Record<string, string | number>
export type T = (key: TKey, vars?: Vars) => string

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: T
  /** BCP 47 locale for dates and numbers. */
  locale: string
}

const I18nContext = createContext<I18n | null>(null)

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLangState(next)
  }, [])

  const value = useMemo<I18n>(() => {
    const dict = DICTS[lang]
    return {
      lang,
      setLang,
      locale: lang === 'kk' ? 'kk-KZ' : lang === 'ru' ? 'ru-RU' : 'en-GB',
      t: (key, vars) => fill(dict[key] ?? en[key] ?? key, vars),
    }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
