import type { CSSProperties } from 'react'
import kzMap from '../../assets/map/kz-pixel-map.svg'
import { cn } from '../../lib/cn'
import { MAP_HEIGHT, MAP_WIDTH, project } from './kzProjection'

type Side = 'right' | 'left' | 'top' | 'bottom'

interface City {
  key: string
  name: string
  lat: number
  lng: number
  side?: Side
  /** Capital and the three largest cities get a bigger label. */
  major?: boolean
  capital?: boolean
}

// Real coordinates; keys match the backend city names (lower case).
const CITIES: City[] = [
  { key: 'astana', name: 'Astana', lat: 51.169, lng: 71.449, major: true, capital: true },
  { key: 'almaty', name: 'Almaty', lat: 43.238, lng: 76.889, major: true, side: 'bottom' },
  { key: 'shymkent', name: 'Shymkent', lat: 42.342, lng: 69.59, major: true, side: 'bottom' },
  { key: 'karaganda', name: 'Karaganda', lat: 49.805, lng: 73.109 },
  { key: 'aktobe', name: 'Aktobe', lat: 50.284, lng: 57.167 },
  { key: 'taraz', name: 'Taraz', lat: 42.9, lng: 71.367, side: 'top' },
  { key: 'pavlodar', name: 'Pavlodar', lat: 52.287, lng: 76.967 },
  { key: 'oskemen', name: 'Oskemen', lat: 49.948, lng: 82.628 },
  { key: 'semey', name: 'Semey', lat: 50.411, lng: 80.227, side: 'left' },
  { key: 'atyrau', name: 'Atyrau', lat: 47.094, lng: 51.924 },
  { key: 'kostanay', name: 'Kostanay', lat: 53.214, lng: 63.624 },
  { key: 'kyzylorda', name: 'Kyzylorda', lat: 44.853, lng: 65.509 },
  { key: 'oral', name: 'Oral', lat: 51.227, lng: 51.367 },
  { key: 'petropavl', name: 'Petropavl', lat: 54.873, lng: 69.143 },
  { key: 'aktau', name: 'Aktau', lat: 43.653, lng: 51.198 },
  { key: 'turkestan', name: 'Turkestan', lat: 43.297, lng: 68.252, side: 'left' },
  { key: 'taldykorgan', name: 'Taldykorgan', lat: 45.017, lng: 78.373 },
  { key: 'kokshetau', name: 'Kokshetau', lat: 53.283, lng: 69.396, side: 'top' },
  { key: 'burabay', name: 'Burabay', lat: 53.084, lng: 70.289, side: 'bottom' },
  { key: 'zhezkazgan', name: 'Zhezkazgan', lat: 47.804, lng: 67.714 },
  { key: 'konaev', name: 'Konaev', lat: 43.867, lng: 77.063, side: 'top' },
  { key: 'baikonur', name: 'Baikonur', lat: 45.617, lng: 63.317, side: 'left' },
  { key: 'kolsay', name: 'Kolsay', lat: 42.988, lng: 78.325 },
  { key: 'charyn', name: 'Charyn', lat: 43.352, lng: 79.079 },
]

const WATER_LABELS = [
  { text: 'Caspian Sea', lat: 44.6, lng: 49.6 },
  { text: 'Aral Sea', lat: 46.6, lng: 60.2 },
  { text: 'L. Balkhash', lat: 47.05, lng: 74.4 },
  { text: 'Irtysh', lat: 51.6, lng: 79.4 },
  { text: 'Ural', lat: 49.2, lng: 52.1 },
  { text: 'Ishim', lat: 51.85, lng: 66.3 },
  { text: 'Syr Darya', lat: 44.3, lng: 63.4 },
  { text: 'Ili', lat: 44.55, lng: 76.2 },
]

const COUNTRY_LABELS = [
  { text: 'RUSSIA', lat: 55.75, lng: 62 },
  { text: 'CHINA', lat: 45.3, lng: 86.6 },
  { text: 'UZBEKISTAN', lat: 41.6, lng: 61 },
  { text: 'KYRGYZSTAN', lat: 41.3, lng: 75.4 },
  { text: 'TURKMENISTAN', lat: 40.8, lng: 55.6 },
]

const at = (lat: number, lng: number): CSSProperties => {
  const { x, y } = project(lat, lng)
  return { left: `${(x / MAP_WIDTH) * 100}%`, top: `${(y / MAP_HEIGHT) * 100}%` }
}

const LABEL_POS: Record<Side, string> = {
  right: 'left-full top-1/2 ml-[5px] -translate-y-1/2',
  left: 'right-full top-1/2 mr-[5px] -translate-y-1/2',
  top: 'bottom-full left-1/2 mb-[4px] -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-[4px] -translate-x-1/2',
}

// Pixel "halo" so labels stay readable over any terrain colour.
const HALO = '[text-shadow:1px_0_0_#fff,-1px_0_0_#fff,0_1px_0_#fff,0_-1px_0_#fff]'

export function KazakhstanMap({ counts, selected, onSelect }: { counts: Record<string, number>; selected: string; onSelect: (city: string) => void }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const known = new Set(CITIES.map((c) => c.key))
  const elsewhere = Object.entries(counts)
    .filter(([city]) => !known.has(city))
    .reduce((sum, [, n]) => sum + n, 0)

  return (
    <section className="flex flex-col gap-[10px] rounded-[18px] border-4 border-ink bg-white p-[14px] shadow-panel sm:p-[18px]">
      <div className="label flex flex-wrap items-center justify-between gap-[6px] text-ink">
        <p>KAZAKHSTAN · {total} PEOPLE ONLINE</p>
        <p className="text-[12px] tracking-[0.72px] text-ink-soft">TAP A CITY TO SEE WHO IS THERE</p>
      </div>

      <div className="relative w-full overflow-hidden rounded-[10px] border-3 border-ink" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
        <img src={kzMap} alt="Map of Kazakhstan" className="absolute inset-0 h-full w-full" draggable={false} />

        {COUNTRY_LABELS.map((l) => (
          <span
            key={l.text}
            className="pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2 font-body text-[12px] font-bold tracking-[3px] text-ink-soft/80 sm:block"
            style={at(l.lat, l.lng)}
          >
            {l.text}
          </span>
        ))}

        {WATER_LABELS.map((l) => (
          <span
            key={l.text}
            className="pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2 font-body text-[11px] font-bold whitespace-nowrap text-[#17647d] md:block"
            style={at(l.lat, l.lng)}
          >
            {l.text}
          </span>
        ))}

        {CITIES.map((city) => {
          const count = counts[city.key] ?? 0
          const isSelected = city.key === selected
          const side = city.side ?? 'right'
          return (
            <button
              key={city.key}
              type="button"
              onClick={() => onSelect(city.key)}
              aria-pressed={isSelected}
              aria-label={`${city.name}: ${count} people`}
              className={cn('group absolute -translate-x-1/2 -translate-y-1/2', isSelected || count ? 'z-20' : 'z-10')}
              style={at(city.lat, city.lng)}
            >
              {count > 0 || isSelected ? (
                <span
                  className={cn(
                    'flex items-center justify-center rounded-[6px] border-3 font-display leading-none shadow-[0_3px_0_0_#2e1b5b]',
                    isSelected ? 'border-ink bg-yellow text-ink' : 'border-white bg-ink text-yellow',
                    city.major ? 'size-[22px] text-[16px] sm:size-[30px] sm:text-[22px]' : 'size-[20px] text-[14px] sm:size-[26px] sm:text-[19px]',
                  )}
                >
                  {count}
                </span>
              ) : (
                <span
                  className={cn(
                    'block border-2 border-ink group-hover:bg-yellow',
                    city.capital ? 'size-[12px] bg-yellow' : 'size-[9px] bg-white',
                  )}
                />
              )}
              <span
                className={cn(
                  'pointer-events-none absolute font-body font-bold whitespace-nowrap text-ink uppercase',
                  HALO,
                  LABEL_POS[side],
                  city.major ? 'text-[10px] tracking-[0.4px] sm:text-[13px] sm:tracking-[0.6px]' : 'hidden text-[10px] tracking-[0.4px] sm:block',
                  isSelected && 'block',
                )}
              >
                {city.name}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px]">
        {[
          ['size-[16px] rounded-[4px] border-2 border-white bg-ink outline outline-ink', 'PEOPLE IN CITY'],
          ['size-[16px] rounded-[4px] border-2 border-ink bg-yellow', 'SELECTED'],
          ['size-[10px] border-2 border-ink bg-white', 'CITY'],
          ['size-[12px] border-2 border-ink bg-yellow', 'CAPITAL'],
          ['size-[16px] rounded-[4px] border-2 border-ink bg-sea', 'RIVERS & LAKES'],
        ].map(([swatch, text]) => (
          <span key={text} className="flex items-center gap-[6px]">
            <span className={swatch} />
            <span className="font-body text-[12px] font-bold tracking-[0.72px] text-ink">{text}</span>
          </span>
        ))}
        {elsewhere > 0 && <span className="font-body text-[12px] text-ink-soft">+{elsewhere} in other places</span>}
      </div>
    </section>
  )
}
