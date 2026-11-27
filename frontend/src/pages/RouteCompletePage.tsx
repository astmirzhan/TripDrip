import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useExchangeOffer, useMyPromoCodes, useOffers, useWallet } from '../api/hooks'
import type { MyPromoCode } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { SceneScreen } from '../components/Layout'
import { Button, ButtonLink } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Coin } from '../components/ui/Coin'
import { Eyebrow, Notice, Panel } from '../components/ui/Panel'
import { Sign } from '../components/ui/Sign'
import { useI18n } from '../i18n'
import { dateText } from '../lib/labels'

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
  const { t, locale } = useI18n()
  return (
    <div className="flex w-full items-center gap-[14px] rounded-[12px] border-3 border-ink bg-mist p-[14px]">
      <QRCodeSVG value={promo.code} size={84} bgColor="#f3f5ff" fgColor="#2e1b5b" level="M" className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <Eyebrow>{t('wallet.yourCode')}</Eyebrow>
        <p className="font-body text-[18px] font-bold text-ink">
          {t('wallet.offAt', { p: promo.discount_percent, brand: promo.brand_name })}
        </p>
        <p className="font-body text-[16px] text-ink-soft">
          {t('wallet.codeMeta', { code: promo.code, date: dateText(locale, promo.expires_at) })}
        </p>
      </div>
    </div>
  )
}

function GuestCard({ userId, name }: { userId: string; name: string }) {
  const [show, setShow] = useState(false)
  const value = `tripdrip:guest:${userId}`
  const { t } = useI18n()
  return (
    <div className="flex w-full flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-cream p-[14px]">
      <div className="flex items-center justify-between gap-[8px]">
        <Eyebrow>{t('wallet.card')}</Eyebrow>
        <Chip selected={show} onClick={() => setShow((v) => !v)}>
          {show ? t('wallet.hide') : t('wallet.showCounter')}
        </Chip>
      </div>
      {show ? (
        <div className="flex items-center gap-[14px]">
          <QRCodeSVG value={value} size={120} bgColor="#fff6d6" fgColor="#2e1b5b" level="M" className="shrink-0" />
          <div className="flex min-w-0 flex-col gap-[4px]">
            <p className="font-display text-[28px] leading-none text-ink">{name}</p>
            <p className="font-body text-[15px] text-ink-soft">{t('wallet.cardScan')}</p>
          </div>
        </div>
      ) : (
        <p className="font-body text-[15px] text-ink-soft">{t('wallet.cardHint')}</p>
      )}
    </div>
  )
}

function OfferPicker({ balance }: { balance: number }) {
  const offers = useOffers()
  const exchange = useExchangeOffer()
  const { t } = useI18n()
  const list = (offers.data ?? []).filter((o) => o.remaining_limit > 0).sort((a, b) => a.coin_cost - b.coin_cost).slice(0, 4)
  return (
    <div className="flex w-full flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-mist p-[14px]">
      <Eyebrow>{t('wallet.swap')}</Eyebrow>
      {list.map((o) => (
        <div key={o.id} className="flex items-center justify-between gap-[10px]">
          <p className="min-w-0 flex-1 font-body text-[16px] text-ink">
            <span className="font-bold">{t('wallet.offAt', { p: o.discount_percent, brand: o.brand_name })}</span> ·{' '}
            {t('wallet.cost', { n: o.coin_cost })}
          </p>
          <Chip selected disabled={o.coin_cost > balance || exchange.isPending} onClick={() => exchange.mutate(o.id)}>
            {t('wallet.get')}
          </Chip>
        </div>
      ))}
      {offers.isSuccess && list.length === 0 && <p className="font-body text-[16px] text-ink-soft">{t('wallet.noOffers')}</p>}
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
  const { user } = useAuth()
  const { t } = useI18n()
  const active = (promos.data ?? []).filter((p) => p.status === 'active')

  async function share() {
    const text = state
      ? t('wallet.shareRoute', { from: state.from, to: state.to, n: state.bonus })
      : t('wallet.shareBalance', { n: balance })
    try {
      if (navigator.share) {
        await navigator.share({ text })
        setShared(t('wallet.shared'))
      } else {
        await navigator.clipboard.writeText(text)
        setShared(t('wallet.copied'))
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
          {state ? t('wallet.complete') : t('wallet.yourCoins')}
        </h1>
        {state && (
          <Eyebrow className="text-center">
            {t('wallet.stops', { from: state.from, to: state.to, n: state.stops })}
          </Eyebrow>
        )}
        <Sign value={state ? `+${state.bonus}` : balance} caption={(state ? t('wallet.bonusCoins') : t('wallet.coins')).toUpperCase()} scale={1.6} />
        {active.map((p) => (
          <PromoBox key={p.id} promo={p} />
        ))}
        <OfferPicker balance={balance} />
        {user && <GuestCard userId={user.id} name={user.first_name} />}
        {shared && <Notice tone="ok">{shared}</Notice>}
        <div className="flex flex-wrap justify-center gap-[16px]">
          <Button variant="secondary" onClick={share}>
            {t('wallet.share')}
          </Button>
          <ButtonLink to="/route">{state ? t('wallet.nextRoute') : t('wallet.backRoute')}</ButtonLink>
        </div>
      </Panel>
    </SceneScreen>
  )
}
