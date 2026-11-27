import { useCallback, useState, type FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { useConfirmVisit, useCreateOffer, usePartnerPoints, usePartnerProfile, usePartnerStats, useRedeemPromo } from '../api/hooks'
import type { PartnerLocation } from '../api/types'
import { AppScreen } from '../components/Layout'
import { QrScanner } from '../components/QrScanner'
import { canScanQr } from '../lib/qr'
import { Button } from '../components/ui/Button'
import { Chip, Tag } from '../components/ui/Chip'
import { Input } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { Eyebrow, Notice, Panel } from '../components/ui/Panel'
import { useI18n } from '../i18n'
import { cityLabel, countryLabel } from '../lib/places'

const GUEST_PREFIX = 'tripdrip:guest:'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Accepts the guest card QR ("tripdrip:guest:<id>") or a pasted user id. */
const guestIdFrom = (raw: string) => {
  const value = raw.trim().replace(GUEST_PREFIX, '')
  return UUID.test(value) ? value : null
}

function BranchPicker({ locations, value, onChange }: { locations: PartnerLocation[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <p className="label text-ink">BRANCH</p>
      <div className="flex flex-wrap gap-[6px]">
        {locations.map((l) => (
          <Chip key={l.id} selected={value === l.id} onClick={() => onChange(l.id)}>
            {l.branch_name.replace(/^\S+\s/, '').toUpperCase() || l.branch_name.toUpperCase()}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function RedeemPanel({ locations, partnerId }: { locations: PartnerLocation[]; partnerId: string }) {
  const [branch, setBranch] = useState(locations[0]?.id ?? '')
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState<'promo' | 'guest' | null>(null)
  const [guest, setGuest] = useState('')
  const redeem = useRedeemPromo()
  const visit = useConfirmVisit()
  const points = usePartnerPoints(partnerId)
  const { t } = useI18n()

  const onScan = useCallback(
    (value: string) => {
      if (scanning === 'guest') setGuest(value)
      else setCode(value.toUpperCase())
      setScanning(null)
    },
    [scanning],
  )

  function submitRedeem(e: FormEvent) {
    e.preventDefault()
    redeem.mutate({ code: code.trim().toUpperCase(), location_id: branch })
  }

  function submitVisit(e: FormEvent) {
    e.preventDefault()
    const userId = guestIdFrom(guest)
    const pointId = points.data?.[branch]
    if (!userId || !pointId) return
    visit.mutate({ user_id: userId, location_id: branch, point_id: pointId })
  }

  const guestId = guestIdFrom(guest)

  return (
    <Panel className="h-fit w-full gap-[12px] p-[20px] lg:w-[430px] lg:shrink-0">
      <Eyebrow>{t('pt.counter')}</Eyebrow>
      <h1 className="font-display text-[44px] leading-none text-ink">{t('pt.redeemTitle')}</h1>

      {scanning ? (
        <QrScanner onResult={onScan} onClose={() => setScanning(null)} />
      ) : (
        <form onSubmit={submitRedeem} className="flex flex-col gap-[12px]">
          <Input
            label={t('pt.codeFromGuest')}
            placeholder="TD-XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            required
          />
          <BranchPicker locations={locations} value={branch} onChange={setBranch} />
          <div className="flex flex-wrap gap-[12px]">
            <Button type="submit" loading={redeem.isPending} disabled={!code.trim() || !branch}>
              {t('pt.redeem')}
            </Button>
            {canScanQr && (
              <Button type="button" variant="secondary" onClick={() => setScanning('promo')}>
                {t('pt.scanQr')}
              </Button>
            )}
          </div>
        </form>
      )}

      {redeem.isSuccess && (
        <div className="flex items-center gap-[10px] rounded-[10px] border-3 border-ink bg-mint p-[12px]">
          <Icon name="check" />
          <div className="flex flex-col gap-[2px]">
            <p className="font-body text-[18px] font-bold text-ink">{t('pt.valid')}</p>
            <p className="font-body text-[15px] text-ink-soft">{t('pt.oneUse', { code: redeem.data.code })}</p>
          </div>
        </div>
      )}
      {redeem.error && <Notice>{errorMessage(redeem.error)}</Notice>}

      <form onSubmit={submitVisit} className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-cream p-[14px]">
        <Eyebrow>{t('pt.noCode')}</Eyebrow>
        <p className="font-body text-[15px] text-ink">{t('pt.noCodeText')}</p>
        <Input
          label={t('pt.guestCard')}
          placeholder={t('pt.guestCardPh')}
          value={guest}
          onChange={(e) => setGuest(e.target.value)}
        />
        <div className="flex flex-wrap gap-[12px]">
          <Button type="submit" variant="secondary" loading={visit.isPending} disabled={!guestId || !points.data?.[branch]}>
            {t('pt.confirmVisit')}
          </Button>
          {canScanQr && (
            <Button type="button" variant="secondary" onClick={() => setScanning('guest')}>
              {t('pt.scanCard')}
            </Button>
          )}
        </div>
        {guest && !guestId && <p className="font-body text-[14px] text-danger">{t('pt.notCard')}</p>}
        {visit.isSuccess && <Notice tone="ok">{t('pt.visitOk', { n: visit.data.coins_awarded })}</Notice>}
        {visit.error && <Notice>{errorMessage(visit.error)}</Notice>}
      </form>
    </Panel>
  )
}

function StatsPanel({ brand }: { brand: string }) {
  const stats = usePartnerStats()
  const { t, lang } = useI18n()
  const s = stats.data
  const total = (s?.by_country ?? []).reduce((sum, c) => sum + c.redeemed_count, 0)

  return (
    <Panel className="h-fit min-w-0 flex-1 gap-[12px] p-[20px]">
      <Eyebrow>{t('pt.allTime', { brand })}</Eyebrow>
      <h2 className="font-display text-[40px] leading-none text-ink">{t('pt.guestsFromRoutes')}</h2>
      <div className="flex gap-[8px]">
        {[
          [s?.total_visits ?? 0, t('pt.visits'), false],
          [s?.total_redeemed ?? 0, t('pt.codesUsed'), false],
          [(s?.total_visits ?? 0) * 20, t('pt.coinsGiven'), true],
        ].map(([value, label, dark]) => (
          <div
            key={String(label)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-[2px] rounded-[10px] border-3 border-ink p-[10px] ${dark ? 'bg-ink' : 'bg-mist'}`}
          >
            <span className={`font-display text-[36px] leading-none ${dark ? 'text-yellow' : 'text-ink'}`}>{value}</span>
            <span className={`font-body text-[11px] font-bold tracking-[0.66px] ${dark ? 'text-white' : 'text-ink-soft'} uppercase`}>{label}</span>
          </div>
        ))}
      </div>

      <p className="label text-ink">{t('pt.byCountry')}</p>
      {(s?.by_country ?? []).slice(0, 6).map((c) => {
        const pct = total ? Math.round((c.redeemed_count / total) * 100) : 0
        return (
          <div key={c.country_code} className="flex items-center gap-[10px]">
            <span className="w-[120px] shrink-0 truncate font-body text-[15px] text-ink">{countryLabel(c.country_code, lang)}</span>
            <div className="h-[18px] min-w-0 flex-1 rounded-[4px] border-3 border-ink bg-white p-[1px]">
              <div className="h-full bg-leaf" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-[40px] shrink-0 text-right font-body text-[15px] font-bold text-ink">{pct}%</span>
          </div>
        )
      })}
      {stats.isSuccess && !total && <p className="font-body text-[15px] text-ink-soft">{t('pt.noCodes')}</p>}

      {(s?.by_location ?? []).length > 0 && (
        <>
          <p className="label text-ink">{t('pt.byBranch')}</p>
          {(s?.by_location ?? []).map((l) => (
            <div key={l.location_id} className="flex justify-between gap-[8px] font-body text-[15px] text-ink">
              <span className="truncate">{l.branch_name}</span>
              <span className="font-bold">{l.redeemed_count}</span>
            </div>
          ))}
        </>
      )}
      {stats.error && <Notice>{errorMessage(stats.error)}</Notice>}
      <p className="font-body text-[15px] text-ink-soft">{t('pt.boosted')}</p>
    </Panel>
  )
}

function OffersPanel({ offers, locations }: { offers: import('../api/types').PartnerOffer[]; locations: PartnerLocation[] }) {
  const create = useCreateOffer()
  const [open, setOpen] = useState(false)
  const { t, lang } = useI18n()
  const [form, setForm] = useState({ title: '', discount: 10, cost: 50, limit: 100 })

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate(
      { title: form.title.trim(), discount_percent: form.discount, coin_cost: form.cost, total_limit: form.limit },
      { onSuccess: () => setOpen(false) },
    )
  }

  return (
    <Panel className="h-fit w-full gap-[12px] p-[20px] lg:w-[430px] lg:shrink-0">
      <Eyebrow>{t('pt.activeOffers')}</Eyebrow>
      {offers.map((o) => (
        <div key={o.id} className="flex flex-col gap-[4px] rounded-[12px] border-3 border-ink bg-white p-[12px] shadow-card">
          <div className="flex items-center justify-between gap-[8px]">
            <span className="min-w-0 truncate font-display text-[26px] leading-none text-ink">{o.title}</span>
            <Tag selected>
              {t('pt.left', { n: o.remaining_limit, total: o.total_limit })}
            </Tag>
          </div>
          <span className="font-body text-[15px] text-ink-soft">
            {t('pt.offerMeta', { p: o.discount_percent, n: o.coin_cost })}
          </span>
        </div>
      ))}
      {offers.length === 0 && <p className="font-body text-[15px] text-ink-soft">{t('pt.noOffers')}</p>}

      {open ? (
        <form onSubmit={submit} className="flex flex-col gap-[10px] rounded-[12px] border-3 border-ink bg-mist p-[12px]">
          <Input label={t('pt.title')} placeholder={t('pt.titlePh')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-3 gap-[8px]">
            <Input label={t('pt.off')} type="number" min={5} max={50} value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
            <Input label={t('pt.coins')} type="number" min={10} value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            <Input label={t('pt.limit')} type="number" min={1} value={form.limit} onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })} />
          </div>
          {create.error && <Notice>{errorMessage(create.error)}</Notice>}
          <div className="flex gap-[12px]">
            <Button type="submit" loading={create.isPending}>
              {t('pt.save')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t('pt.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
          {t('pt.newOffer')}
        </Button>
      )}

      <p className="label text-ink">{t('pt.branches')}</p>
      {locations.map((l) => (
        <div key={l.id} className="flex items-center gap-[8px] rounded-[10px] border-3 border-ink bg-mist p-[10px]">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-body text-[16px] font-bold text-ink">{l.branch_name}</span>
            <span className="truncate font-body text-[14px] text-ink-soft">
              {cityLabel(l.city, lang)} · {l.address}
            </span>
          </div>
          <Tag selected={l.is_active}>{l.is_active ? t('pt.open') : t('pt.closed')}</Tag>
        </div>
      ))}
    </Panel>
  )
}

// 14 Partner cabinet (Figma 184:8294).
export function PartnerPage() {
  const profile = usePartnerProfile()
  const p = profile.data
  const { t } = useI18n()

  return (
    <AppScreen>
      {profile.isPending && <Panel className="p-[24px] font-body text-[18px] text-ink-soft">{t('chat.loading')}</Panel>}
      {profile.error && <Notice>{errorMessage(profile.error)}</Notice>}
      {p && !p.partner.is_approved && (
        <Panel className="mx-auto max-w-[640px] items-center gap-[12px] p-[28px] text-center">
          <Icon name="lock" size={32} />
          <h1 className="font-display text-[44px] leading-none text-ink">{t('pt.waiting')}</h1>
          <p className="font-body text-[18px] text-ink-soft">
            {t('pt.reviewed', { brand: p.partner.brand_name })}
          </p>
        </Panel>
      )}
      {p && p.partner.is_approved && (
        <div className="flex flex-col gap-[30px] lg:flex-row lg:items-start">
          <RedeemPanel locations={p.locations} partnerId={p.partner.id} />
          <StatsPanel brand={p.partner.brand_name} />
          <OffersPanel offers={p.offers} locations={p.locations} />
        </div>
      )}
    </AppScreen>
  )
}
