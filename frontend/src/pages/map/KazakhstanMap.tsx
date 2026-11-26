import baiterek from '../../assets/figma/baiterek.svg'
import kzMap from '../../assets/figma/kz-map.svg'
import yurt from '../../assets/figma/yurt.svg'
import { cn } from '../../lib/cn'

// City marker positions inside the 600 × 300 pixel map (Figma 167:7729). Taraz and Semey are placed by geography.
const CITY_POS: Record<string, { x: number; y: number; big?: boolean; label?: boolean }> = {
  almaty: { x: 414, y: 227, big: true, label: true },
  astana: { x: 337, y: 70, big: true, label: true },
  shymkent: { x: 303, y: 249, label: true },
  aktau: { x: 51, y: 222, label: true },
  turkestan: { x: 290, y: 218 },
  karaganda: { x: 405, y: 122 },
  burabay: { x: 332, y: 32 },
  atyrau: { x: 69, y: 153 },
  aktobe: { x: 145, y: 89 },
  kyzylorda: { x: 263, y: 198 },
  pavlodar: { x: 427, y: 49 },
  oskemen: { x: 508, y: 96 },
  taraz: { x: 352, y: 236 },
  semey: { x: 470, y: 80 },
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`

export function KazakhstanMap({ counts, selected, onSelect }: { counts: Record<string, number>; selected: string; onSelect: (city: string) => void }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <section className="flex flex-col gap-[10px] rounded-[18px] border-4 border-ink bg-sea p-[16px] shadow-panel sm:p-[20px]">
      <div className="label flex flex-wrap items-center justify-between gap-[6px] text-white">
        <p>KAZAKHSTAN · {total} PEOPLE ONLINE</p>
        <p className="text-[12px] tracking-[0.72px]">TAP A CITY TO SEE WHO IS THERE</p>
      </div>
      <div className="relative aspect-[2/1] w-full">
        <img src={kzMap} alt="Map of Kazakhstan" className="absolute inset-0 h-full w-full" />
        <img src={baiterek} alt="" className="absolute" style={{ left: pct(377, 600), top: pct(52.32, 300), width: pct(13.52, 600), height: pct(43.68, 300) }} />
        <img src={yurt} alt="" className="absolute" style={{ left: pct(240, 600), top: pct(138, 300), width: pct(34.56, 600), height: pct(23.04, 300) }} />
        <img src={yurt} alt="" className="absolute" style={{ left: pct(150, 600), top: pct(156, 300), width: pct(28.8, 600), height: pct(19.2, 300) }} />
        {Object.entries(CITY_POS).map(([city, pos]) => {
          const count = counts[city] ?? 0
          const isSelected = city === selected
          if (!count && !isSelected) return null
          const size = pos.big || isSelected ? 36 : 30
          return (
            <button
              key={city}
              type="button"
              onClick={() => onSelect(city)}
              aria-pressed={isSelected}
              aria-label={`${city}: ${count} people`}
              className="absolute flex flex-col items-center gap-[3px]"
              style={{ left: pct(pos.x, 600), top: pct(pos.y, 300) }}
            >
              <span
                className={cn(
                  'flex items-center justify-center rounded-[7px] border-3 font-display leading-none shadow-[0_3px_0_0_#2e1b5b]',
                  isSelected ? 'border-ink bg-yellow text-ink' : 'border-white bg-ink text-yellow',
                )}
                style={{ width: size, height: size, fontSize: size === 36 ? 26 : 22 }}
              >
                {count}
              </span>
              {(pos.label || isSelected) && (
                <span className="hidden rounded-[5px] border-2 border-ink bg-white px-[5px] py-[2px] font-body text-[10px] font-bold tracking-[0.6px] text-ink uppercase sm:block">
                  {city}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-[14px] pt-[6px]">
        {[
          ['bg-ink border-white', 'PEOPLE IN CITY'],
          ['bg-yellow border-ink', 'SELECTED'],
          ['bg-sand border-ink', 'DESERT'],
          ['bg-lake border-ink', 'LAKE BALKHASH'],
        ].map(([swatch, text]) => (
          <span key={text} className="flex items-center gap-[6px]">
            <span className={cn('size-[16px] rounded-[4px] border-2', swatch)} />
            <span className="font-body text-[12px] font-bold tracking-[0.72px] text-white">{text}</span>
          </span>
        ))}
      </div>
    </section>
  )
}
