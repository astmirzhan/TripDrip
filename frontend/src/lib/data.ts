import type { HelpType, TripPurpose } from '../api/types'

export const COUNTRIES: Array<[code: string, name: string]> = [
  ['KZ', 'Kazakhstan'],
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['FR', 'France'],
  ['DE', 'Germany'],
  ['IT', 'Italy'],
  ['ES', 'Spain'],
  ['NL', 'Netherlands'],
  ['PL', 'Poland'],
  ['TR', 'Türkiye'],
  ['AE', 'United Arab Emirates'],
  ['IN', 'India'],
  ['CN', 'China'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['SG', 'Singapore'],
  ['AU', 'Australia'],
  ['CA', 'Canada'],
  ['BR', 'Brazil'],
  ['RU', 'Russia'],
  ['UZ', 'Uzbekistan'],
  ['KG', 'Kyrgyzstan'],
  ['GE', 'Georgia'],
  ['AZ', 'Azerbaijan'],
]

export const countryName = (code: string) => COUNTRIES.find(([c]) => c === code.toUpperCase())?.[1] ?? code

/** Cities the backend has centroids for (backend/internal/domain/geo.go). */
export const CITIES = [
  'Almaty',
  'Astana',
  'Shymkent',
  'Karaganda',
  'Aktau',
  'Atyrau',
  'Turkestan',
  'Burabay',
  'Aktobe',
  'Pavlodar',
  'Oskemen',
  'Taraz',
  'Semey',
  'Kostanay',
  'Kyzylorda',
  'Oral',
  'Petropavl',
  'Taldykorgan',
  'Kokshetau',
  'Zhezkazgan',
  'Konaev',
  'Baikonur',
  'Kolsay',
  'Charyn',
]

export const CITY_CENTER: Record<string, { lat: number; lng: number }> = {
  almaty: { lat: 43.238949, lng: 76.889709 },
  astana: { lat: 51.169392, lng: 71.449074 },
  shymkent: { lat: 42.3417, lng: 69.5901 },
  karaganda: { lat: 49.8047, lng: 73.1094 },
  aktau: { lat: 43.6532, lng: 51.1975 },
  atyrau: { lat: 47.0945, lng: 51.9238 },
  turkestan: { lat: 43.2973, lng: 68.2517 },
  burabay: { lat: 53.0836, lng: 70.2894 },
  aktobe: { lat: 50.2839, lng: 57.167 },
  pavlodar: { lat: 52.2873, lng: 76.9674 },
  oskemen: { lat: 49.9483, lng: 82.6285 },
  taraz: { lat: 42.9, lng: 71.3667 },
  semey: { lat: 50.4111, lng: 80.2275 },
  kostanay: { lat: 53.2144, lng: 63.6246 },
  kyzylorda: { lat: 44.8528, lng: 65.5092 },
  oral: { lat: 51.2271, lng: 51.3673 },
  petropavl: { lat: 54.8728, lng: 69.143 },
  taldykorgan: { lat: 45.0171, lng: 78.3733 },
  kokshetau: { lat: 53.2833, lng: 69.3964 },
  zhezkazgan: { lat: 47.8043, lng: 67.7139 },
  konaev: { lat: 43.8667, lng: 77.0631 },
  baikonur: { lat: 45.6167, lng: 63.3167 },
  kolsay: { lat: 42.9877, lng: 78.3247 },
  charyn: { lat: 43.3522, lng: 79.0789 },
}

export const HELP_TYPES: Array<{ value: HelpType; en: string; ru: string; short: string }> = [
  { value: 'directions', en: 'SHOW ME THE WAY', ru: 'ДОРОГА', short: 'directions' },
  { value: 'translation_call', en: 'TRANSLATE OR CALL', ru: 'ЗВОНОК', short: 'translate' },
  { value: 'city_tour', en: 'SHOW THE CITY', ru: 'ГОРОД', short: 'city walk' },
  { value: 'dastarkhan', en: 'DASTARKHAN', ru: 'ДАСТАРХАН', short: 'dastarkhan' },
  { value: 'host_stay', en: 'STAY OVERNIGHT', ru: 'НОЧЛЕГ', short: 'stay' },
]

export const helpType = (value: HelpType) => HELP_TYPES.find((h) => h.value === value) ?? HELP_TYPES[0]

export const PURPOSES: Array<{ value: TripPurpose; label: string }> = [
  { value: 'leisure', label: 'HOLIDAY' },
  { value: 'work', label: 'WORK' },
  { value: 'study', label: 'STUDY' },
  { value: 'family', label: 'FAMILY' },
]

export const HOBBIES = ['HIKING', 'PHOTOGRAPHY', 'LOCAL FOOD', 'HORSE RIDING', 'MUSIC', 'FOOTBALL']

export const HOBBY_RU: Record<string, string> = {
  hiking: 'ХАЙКИНГ',
  photography: 'ФОТО',
  'local food': 'ЕДА',
  'horse riding': 'ЛОШАДИ',
  music: 'МУЗЫКА',
  football: 'ФУТБОЛ',
}

export const LANGUAGES = [
  { code: 'en', label: 'ENGLISH' },
  { code: 'ru', label: 'RUSSIAN' },
  { code: 'kk', label: 'KAZAKH' },
  { code: 'fr', label: 'FRENCH' },
  { code: 'de', label: 'GERMAN' },
  { code: 'zh', label: 'CHINESE' },
]

/** Levels shown on chips, stored as CEFR-like codes in profiles.languages. */
export const LEVELS = [
  { code: 'native', label: 'NATIVE' },
  { code: 'C1', label: 'FLUENT' },
  { code: 'A1', label: 'A FEW WORDS' },
]

export const languageLabel = (code: string) => LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase()
export const levelLabel = (code: string) => LEVELS.find((l) => l.code === code)?.label ?? code.toUpperCase()

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

export function shortDate(value: string | Date | undefined | null): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return `${d.getDate()} ${MONTHS_EN[d.getMonth()]}`
}

export function ruDate(value: string | Date | undefined | null): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
}

export function whenLabel(value: string, lang: 'en' | 'ru' = 'en'): string {
  const d = new Date(value)
  const now = new Date()
  const minutes = (d.getTime() - now.getTime()) / 60000
  if (minutes < 60) return lang === 'en' ? 'now' : 'сейчас'
  if (d.toDateString() === now.toDateString()) return lang === 'en' ? 'today' : 'сегодня'
  return lang === 'en' ? shortDate(d) : ruDate(d)
}

export const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())
