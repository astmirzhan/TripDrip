import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useExchangeOffer, useMyPromoCodes, useOffers, useWallet } from '../api/hooks'
import type { MyPromoCode } from '../api/types'
import { SceneScreen } from '../components/Layout'
import { Button, ButtonLink } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Coin } from '../components/ui/Coin'
import { Eyebrow, Notice, Panel } from '../components/ui/Panel'
import { Sign } from '../components/ui/Sign'
import { shortDate } from '../lib/data'

interface CompleteState {
  bonus: number
  from: string
  to: string
  stops: number
}

const COINS = [
  { left: '22.92%', top: '20.99%' },
  { left: '74.31%', top: '19.75%' },
  { left: '22.92%', top: '54.32%' },
  { left: '74.31%', top: '54.32%' },
]

function PromoBox({ promo }: { promo: MyPromoCode }) {
  return (
    <div className="flex w-full items-center gap-[14px] rounded-[12px] border-3 border-ink bg-mist p-[14px]">
      <QRCodeSVG value={promo.code} size={84} bgColor="#f3f5ff" fgColor="#2e1b5b" level="M" className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <Eyebrow>YOUR CODE</Eyebrow>
        <p className="font-body text-[18px] font-bold text-ink">
          {promo.discount_percent}% off at {promo.brand_name}
        </p>
        <p className="font-body text-[16px] text-ink-soft">
          {promo.code} · one use · until {shortDate(promo.expires_at)}
        </p>
      </div>
    </div>
  )
}

function OfferPicker({ balance }: { balance: number }) {
  const offers = useOffers()
  const exchange = useExchangeOffer()
  const list = (offers.data ?? []).filter((o) => o.remaining_limit > 0).sort((a, b) => a.coin_cost - b.coin_cost).slice(0, 4)
  return (
    <div className="flex w-full flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-mist p-[14px]">
      <Eyebrow>SWAP COINS FOR A CODE</Eyebrow>
      {list.map((o) => (
        <div key={o.id} className="flex items-center justify-between gap-[10px]">
          <p className="min-w-0 flex-1 font-body text-[16px] text-ink">
            <span className="font-bold">
              {o.discount_percent}% off at {o.brand_name}
            </span>{' '}
            · {o.coin_cost} coins
          </p>
          <Chip selected disabled={o.coin_cost > balance || exchange.isPending} onClick={() => exchange.mutate(o.id)}>
            GET
          </Chip>
        </div>
      ))}
      {offers.isSuccess && list.length === 0 && <p className="font-body text-[16px] text-ink-soft">No offers right now.</p>}
      {exchange.error && <Notice>{errorMessage(exchange.error)}</Notice>}
    </div>
  )
}

// 12 Route complete (Figma 162:6627). Without route state it works as the wallet.
export function RouteCompletePage() {
  const state = useLocation().state as CompleteState | null
  const wallet = useWallet()
  const promos = useMyPromoCodes()
  const [shared, setShared] = useState('')
  const balance = wallet.data?.balance ?? 0
  const promo = (promos.data ?? []).find((p) => p.status === 'active')

  async function share() {
    const text = state
      ? `I finished ${state.from} → ${state.to} on TripDrip and got +${state.bonus} coins!`
      : `I have ${balance} coins on TripDrip.`
    try {
      if (navigator.share) {
        await navigator.share({ text })
        setShared('Shared.')
      } else {
        await navigator.clipboard.writeText(text)
        setShared('Copied.')
      }
    } catch {
      // The person closed the share sheet.
    }
  }

  return (
    <SceneScreen
      sprites={[
        { kind: 'baiterek', x: 1160 },
        { kind: 'yurt', x: 90 },
        { kind: 'yurt', x: 280, width: 100.8 },
      ]}
    >
      {COINS.map((pos) => (
        <div key={pos.left + pos.top} className="pointer-events-none fixed hidden lg:block" style={pos}>
          <Coin size={36} />
        </div>
      ))}
      <Panel className="w-full max-w-[560px] items-center gap-[14px] p-[20px] sm:p-[28px]">
        <h1 className="text-center font-display text-[48px] leading-none text-ink sm:text-[64px]">
          {state ? 'route complete!' : 'your coins'}
        </h1>
        {state && (
          <Eyebrow className="text-center">
            {state.from} → {state.to} · {state.stops} STOPS
          </Eyebrow>
        )}
        <Sign value={state ? `+${state.bonus}` : balance} caption={state ? 'BONUS COINS' : 'COINS'} scale={1.6} />
        {promo ? <PromoBox promo={promo} /> : <OfferPicker balance={balance} />}
        {shared && <Notice tone="ok">{shared}</Notice>}
        <div className="flex flex-wrap justify-center gap-[16px]">
          <Button variant="secondary" onClick={share}>
            share card
          </Button>
          <ButtonLink to="/route">{state ? 'next route' : 'back to route'}</ButtonLink>
        </div>
      </Panel>
    </SceneScreen>
  )
}
