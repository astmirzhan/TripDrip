import type { RouteStop } from '../../api/types'
import baiterek from '../../assets/figma/baiterek.svg'
import roadCenter from '../../assets/figma/road-center.svg'
import roadOutline from '../../assets/figma/road-outline.svg'
import road from '../../assets/figma/road.svg'
import { Avatar } from '../../components/ui/Avatar'
import { Coin } from '../../components/ui/Coin'
import { Icon } from '../../components/ui/Icon'
import { LevelNode, type LevelState } from '../../components/ui/LevelNode'
import { slotsFor, stopState } from './stops'
import { cn } from '../../lib/cn'
import type { AvatarVariant } from '../../lib/avatar'

// Board = Figma frame 162:5906 from y = 100, so every value below is (x, y − 100) in frame pixels.
const W = 840
const H = 620
const SLOTS = [
  [208, 480], [388, 508], [568, 472], [668, 374], [508, 304],
  [308, 314], [168, 224], [298, 124], [508, 74], [738, 44],
] as const
// Road coins and their position along the path, measured in slots (coin 0 sits between slot 0 and 1).
const ROAD_COINS = [
  [314, 513, 0.5], [501, 516, 1.5], [657, 443, 2.5], [625, 350, 3.5], [425, 328, 4.5],
  [235, 294, 5.5], [229, 190, 6.5], [415, 113, 7.5], [654, 74, 8.5],
] as const

const px = (v: number, of: number) => `${(v / of) * 100}%`

function stopLabel(stops: RouteStop[], index: number, state: LevelState) {
  const s = stops[index]
  if (index === stops.length - 1 && state !== 'done') return { text: `GOAL · ${s.name}`, hot: true }
  if (state === 'current') return { text: `${s.name} · +${s.reward_coins}`, hot: true }
  if (s.point_type === 'partner') return { text: `${s.name} · PARTNER`, hot: false }
  return { text: s.name, hot: false }
}

export function RouteBoard({ stops, player }: { stops: RouteStop[]; player: AvatarVariant }) {
  const slots = slotsFor(stops.length)
  const currentIndex = stops.findIndex((s) => !s.is_visited)
  const progress = stops.length === 0 ? -1 : currentIndex === -1 ? SLOTS.length : slots[currentIndex]

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <img src={roadOutline} alt="" className="absolute max-w-none" style={{ left: px(100 - 26, W), top: px(76 - 26, H), width: px(722, W), height: px(516, H) }} />
      <img src={road} alt="" className="absolute max-w-none" style={{ left: px(100 - 21, W), top: px(76 - 21, H), width: px(712, W), height: px(506, H) }} />
      <img src={roadCenter} alt="" className="absolute max-w-none" style={{ left: px(100 - 2, W), top: px(76 - 2, H), width: px(674, W), height: px(468, H) }} />
      <img src={baiterek} alt="" className="absolute" style={{ left: px(760, W), top: px(230, H), width: px(43.68, W), height: px(141.12, H) }} />

      {ROAD_COINS.map(([x, y, at]) => (
        <div key={at} className="absolute" style={{ left: px(x, W), top: px(y, H), width: px(28, W) }}>
          <Coin size={28} empty={at > progress} className="h-auto w-full" />
        </div>
      ))}

      <div className="label absolute flex items-center gap-[6px] rounded-[8px] border-3 border-ink bg-white px-[10px] py-[6px] text-ink" style={{ left: px(40, W), top: px(466, H) }}>
        <Icon name="flag" size={24} />
        START
      </div>

      {stops.map((stop, i) => {
        const [x, y] = SLOTS[slots[i]]
        const state = stopState(stops, i)
        const label = stopLabel(stops, i, state)
        const showLabel = i === 0 || state === 'current' || i === stops.length - 1 || stop.point_type === 'partner'
        return (
          <div key={stop.point_id}>
            <div className="absolute" style={{ left: px(x, W), top: px(y, H), width: px(72, W) }}>
              <LevelNode state={state} number={i + 1} className="!h-auto !w-full aspect-square" />
            </div>
            {showLabel && (
              <p
                className={cn(
                  'label absolute max-w-[280px] -translate-x-1/2 truncate rounded-[8px] border-3 border-ink p-[6px] whitespace-nowrap text-ink uppercase',
                  label.hot ? 'bg-yellow' : 'bg-white',
                )}
                style={{ left: px(x + 36, W), top: px(y + 80, H) }}
              >
                {label.text}
              </p>
            )}
          </div>
        )
      })}

      {currentIndex >= 0 && (
        <div className="absolute" style={{ left: px(SLOTS[slots[currentIndex]][0] - 4, W), top: px(SLOTS[slots[currentIndex]][1] - 86, H) }}>
          <Avatar variant={player} size={72} />
        </div>
      )}
    </div>
  )
}
