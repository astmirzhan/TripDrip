import type { HelpType, TripPurpose } from '../api/types'
import type { T, TKey } from '../i18n'

// Translated labels for values stored in English by the backend.

export const helpLabel = (t: T, value: HelpType) => t(`help.${value}` as TKey)
export const helpShort = (t: T, value: HelpType) => t(`helpShort.${value}` as TKey)
export const purposeLabel = (t: T, value: TripPurpose) => t(`purpose.${value}` as TKey)

/** Hobby names are free text; known ones are translated, others are shown as they are. */
export function hobbyLabel(t: T, hobby: string) {
  const key = `hobby.${hobby.trim().toLowerCase()}` as TKey
  const text = t(key)
  return text === key ? hobby : text
}

export function languageName(t: T, code: string) {
  const key = `lang.${code.toLowerCase()}` as TKey
  const text = t(key)
  return text === key ? code.toUpperCase() : text
}

export function levelName(t: T, code: string) {
  const key = `level.${code}` as TKey
  const text = t(key)
  return text === key ? code.toUpperCase() : text
}

/** "now" / "today" / "3 Dec" in the current language. */
export function whenText(t: T, locale: string, value: string) {
  const d = new Date(value)
  const now = new Date()
  if ((d.getTime() - now.getTime()) / 60000 < 60) return t('when.now')
  if (d.toDateString() === now.toDateString()) return t('when.today')
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

/** Short date like "3 Dec" in the current language. */
export const dateText = (locale: string, value: string | Date) =>
  new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
