import { SceneScreen } from '../components/Layout'
import { ButtonLink } from '../components/ui/Button'
import { Coin } from '../components/ui/Coin'

// 01 Start (Figma 157:45). Coin positions are percentages of the 1440 × 810 frame.
const COINS = [
  { left: '18.06%', top: '29.63%' },
  { left: '75%', top: '24.69%' },
  { left: '29.86%', top: '64.2%' },
  { left: '63.89%', top: '58.02%' },
]

export function StartPage() {
  return (
    <SceneScreen
      sprites={[
        { kind: 'baiterek', x: 1170 },
        { kind: 'yurt', x: 110 },
        { kind: 'yurt', x: 300, width: 108 },
        { kind: 'yurt', x: 960, width: 122.4 },
      ]}
      className="lg:items-start lg:pt-[170px]"
    >
      {COINS.map((pos) => (
        <div key={pos.left} className="pointer-events-none fixed hidden lg:block" style={pos}>
          <Coin size={36} />
        </div>
      ))}
      <div className="flex flex-col items-center gap-[12px] text-center">
        <h1 className="font-display text-[88px] leading-none text-ink [text-shadow:0_6px_0_white] sm:text-[150px]">TripDrip</h1>
        <p className="font-body text-[16px] font-bold tracking-[1.08px] text-ink uppercase sm:text-[18px]">
          Kazakhstan without the language barrier
        </p>
        <p className="font-body text-[18px] text-ink sm:text-[20px]">Offline phrases, help from locals, coins for every route.</p>
        <div className="flex flex-wrap justify-center gap-[16px] pt-[16px]">
          <ButtonLink to="/signup">let’s start</ButtonLink>
          <ButtonLink to="/login" variant="secondary">
            I have an account
          </ButtonLink>
        </div>
      </div>
    </SceneScreen>
  )
}
