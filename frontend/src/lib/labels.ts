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
