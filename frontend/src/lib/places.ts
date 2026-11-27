import type { Lang } from '../i18n'

// City names in Russian and Kazakh. Keys are the lower-case English names the backend stores.
const CITY: Record<string, { ru: string; kk: string }> = {
  almaty: { ru: 'Алматы', kk: 'Алматы' },
  astana: { ru: 'Астана', kk: 'Астана' },
  shymkent: { ru: 'Шымкент', kk: 'Шымкент' },
  karaganda: { ru: 'Караганда', kk: 'Қарағанды' },
  aktau: { ru: 'Актау', kk: 'Ақтау' },
  atyrau: { ru: 'Атырау', kk: 'Атырау' },
  turkestan: { ru: 'Туркестан', kk: 'Түркістан' },
  burabay: { ru: 'Бурабай', kk: 'Бурабай' },
  aktobe: { ru: 'Актобе', kk: 'Ақтөбе' },
  pavlodar: { ru: 'Павлодар', kk: 'Павлодар' },
  oskemen: { ru: 'Усть-Каменогорск', kk: 'Өскемен' },
  taraz: { ru: 'Тараз', kk: 'Тараз' },
  semey: { ru: 'Семей', kk: 'Семей' },
  kostanay: { ru: 'Костанай', kk: 'Қостанай' },
  kyzylorda: { ru: 'Кызылорда', kk: 'Қызылорда' },
  oral: { ru: 'Уральск', kk: 'Орал' },
  petropavl: { ru: 'Петропавловск', kk: 'Петропавл' },
  taldykorgan: { ru: 'Талдыкорган', kk: 'Талдықорған' },
  kokshetau: { ru: 'Кокшетау', kk: 'Көкшетау' },
  zhezkazgan: { ru: 'Жезказган', kk: 'Жезқазған' },
  konaev: { ru: 'Конаев', kk: 'Қонаев' },
  baikonur: { ru: 'Байконур', kk: 'Байқоңыр' },
  kolsay: { ru: 'Кольсай', kk: 'Көлсай' },
  charyn: { ru: 'Чарын', kk: 'Шарын' },
}

/** Display name for a backend city name in the current language. */
export function cityLabel(city: string, lang: Lang): string {
  const entry = CITY[city.trim().toLowerCase()]
  if (!entry || lang === 'en') return city
  return entry[lang]
}

// Some browsers ship no Kazakh country names, so the common ones are listed here.
const COUNTRY_KK: Record<string, string> = {
  KZ: 'Қазақстан', RU: 'Ресей', CN: 'Қытай', UZ: 'Өзбекстан', KG: 'Қырғызстан', TM: 'Түрікменстан',
  US: 'АҚШ', GB: 'Ұлыбритания', FR: 'Франция', DE: 'Германия', JP: 'Жапония', KR: 'Оңтүстік Корея',
  IT: 'Италия', ES: 'Испания', TR: 'Түркия', IN: 'Үндістан', NL: 'Нидерланд', PL: 'Польша',
  AE: 'БАӘ', CA: 'Канада', AU: 'Австралия', BR: 'Бразилия',
}

/** Country name from an ISO code in the current language (built into the browser). */
export function countryLabel(code: string, lang: Lang): string {
  if (lang === 'kk' && COUNTRY_KK[code.toUpperCase()]) return COUNTRY_KK[code.toUpperCase()]
  try {
    return new Intl.DisplayNames([lang === 'kk' ? 'kk' : lang], { type: 'region' }).of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}
