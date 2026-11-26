import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useActiveRoute, useCheckin, useGenerateRoute, useWallet } from '../api/hooks'
import type { Route, RouteStop, Vibe } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AppScreen } from '../components/Layout'
import { avatarFor } from '../lib/avatar'
import { Button, ButtonLink } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { CoinBalance } from '../components/ui/Coin'
import { LevelNode } from '../components/ui/LevelNode'
import { Eyebrow, Notice, Panel } from '../components/ui/Panel'
import { VerifyGate } from '../components/VerifyGate'
import { CITIES, CITY_CENTER, titleCase } from '../lib/data'
import { RouteBoard } from './route/RouteBoard'
import { stopState } from './route/stops'

const DEMO_CHECKIN = import.meta.env.VITE_DEMO_CHECKIN === 'true'

function currentPosition(stop: RouteStop): Promise<{ lat: number; lng: number }> {
  if (DEMO_CHECKIN) return Promise.resolve({ lat: stop.lat, lng: stop.lng })
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This device has no location access.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('Allow location access to check in at the stop.')),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  })
}

function CoinRules({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-[12px] rounded-[12px] border-3 border-ink bg-cream p-[14px]">
      <CoinBalance value={balance} />
      <div className="flex flex-col gap-[2px] font-body text-[18px] font-bold text-ink">
        <p>50 coins = 10% off</p>
        <p>100 coins = 20% off</p>
      </div>
    </div>
  )
}

function NewRoutePanel({ balance }: { balance: number }) {
  const { user } = useAuth()
  const generate = useGenerateRoute()
  const [city, setCity] = useState(titleCase(user?.city ?? 'Almaty'))
  const [vibe, setVibe] = useState<Vibe>(user?.vibe_preference ?? 'both')

  function start() {
    const center = CITY_CENTER[city.toLowerCase()] ?? CITY_CENTER.almaty
    generate.mutate({
      city,
      origin_lat: center.lat,
      origin_lng: center.lng,
      dest_lat: center.lat + 0.02,
      dest_lng: center.lng + 0.02,
      vibe_preference: vibe,
    })
  }

  return (
    <Panel className="h-fit w-full gap-[14px] p-[24px] lg:w-[440px]">
      <Eyebrow>NEW ROUTE</Eyebrow>
      <h1 className="font-display text-[44px] leading-none text-ink">where to today?</h1>
      <p className="font-body text-[20px] text-ink-soft">3–5 stops picked for you, away from the crowds. Coins at every stop.</p>
      <div className="flex flex-wrap gap-[8px]">
        {CITIES.slice(0, 6).map((c) => (
          <Chip key={c} selected={city === c} onClick={() => setCity(c)}>
            {c.toUpperCase()}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-[8px]">
        {(['nature', 'megapolis', 'both'] as const).map((v) => (
          <Chip key={v} selected={vibe === v} onClick={() => setVibe(v)}>
            {v === 'megapolis' ? 'METROPOLIS' : v.toUpperCase()}
          </Chip>
        ))}
      </div>
      {generate.error && <Notice>{errorMessage(generate.error)}</Notice>}
      <Button className="self-start" onClick={start} loading={generate.isPending}>
        get route
      </Button>
      <CoinRules balance={balance} />
      <p className="font-body text-[16px] text-ink-soft">Coins are loyalty points: no buying, no cash-out.</p>
    </Panel>
  )
}

function StopPanel({ route, balance }: { route: Route; balance: number }) {
  const navigate = useNavigate()
  const checkin = useCheckin()
  const [error, setError] = useState('')
  const index = route.stops.findIndex((s) => !s.is_visited)
  const stop = route.stops[index]
  if (!stop) return null

  async function collect() {
    setError('')
    try {
      const pos = await currentPosition(stop)
      const result = await checkin.mutateAsync({ routeId: route.id, pointId: stop.point_id, ...pos })
      if (result.route_completed) {
        navigate('/route/complete', {
          state: {
            bonus: result.route_bonus,
            from: route.stops[0].name,
            to: route.stops[route.stops.length - 1].name,
            stops: route.stops.length,
          },
        })
      }
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Panel className="h-fit w-full gap-[14px] p-[24px] lg:w-[440px]">
      <Eyebrow>STOP OF THE DAY</Eyebrow>
      <p className="label self-start rounded-[8px] border-3 border-ink bg-ink p-[6px] text-yellow">
        +{stop.reward_coins} COINS · {route.city.toUpperCase()} ROUTE
      </p>
      <h1 className="font-display text-[44px] leading-none text-ink">
        Stop {index + 1} · {stop.name}
      </h1>
      <p className="font-body text-[20px] text-ink-soft">
        {stop.description ?? `Get within ${stop.radius_meters} m, then collect the coins.`}
      </p>
      {error && <Notice>{error}</Notice>}
      <Button className="self-start" onClick={collect} loading={checkin.isPending}>
        collect +{stop.reward_coins}
      </Button>
      <CoinRules balance={balance} />
      <ButtonLink to="/route/complete" variant="secondary" className="self-start">
        open wallet
      </ButtonLink>
      <p className="font-body text-[16px] text-ink-soft">Coins are loyalty points: no buying, no cash-out.</p>
    </Panel>
  )
}

function MobileStops({ stops }: { stops: RouteStop[] }) {
  return (
    <div className="flex gap-[14px] overflow-x-auto pb-[10px] lg:hidden">
      {stops.map((s, i) => (
        <div key={s.point_id} className="flex w-[96px] shrink-0 flex-col items-center gap-[6px] text-center">
          <LevelNode state={stopState(stops, i)} number={i + 1} />
          <span className="label text-[11px] text-ink">{s.name}</span>
        </div>
      ))}
    </div>
  )
}

function RouteScreen() {
  const { user } = useAuth()
  const route = useActiveRoute()
  const wallet = useWallet()
  const balance = wallet.data?.balance ?? 0
  const r = route.data
  const stops = r?.stops ?? []

  return (
    <div className="flex flex-col gap-[24px] lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1 lg:max-w-[840px]">
        {route.error && <Notice>{errorMessage(route.error)}</Notice>}
        {r && <MobileStops stops={stops} />}
        {/* The board uses Figma frame coordinates, which start 40px left of the content column. */}
        <div className="hidden lg:-mt-[16px] lg:-ml-[40px] lg:block">
          <RouteBoard stops={stops} player={avatarFor(user?.id ?? '')} />
        </div>
      </div>
      {r ? <StopPanel route={r} balance={balance} /> : route.isSuccess && <NewRoutePanel balance={balance} />}
    </div>
  )
}

// 11 Route & coins (Figma 162:5906).
export function RoutePage() {
  return (
    <AppScreen>
      <VerifyGate>
        <RouteScreen />
      </VerifyGate>
    </AppScreen>
  )
}
