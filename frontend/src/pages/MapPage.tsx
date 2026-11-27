import { useMemo, useState } from 'react'
import { errorMessage } from '../api/client'
import { useMapEntities, useSendNetworkRequest, useUpdatePresence } from '../api/hooks'
import type { MapPerson } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AppScreen } from '../components/Layout'
import { Avatar } from '../components/ui/Avatar'
import { avatarFor } from '../lib/avatar'
import { Button } from '../components/ui/Button'
import { Chip, Tag } from '../components/ui/Chip'
import { Notice, Panel } from '../components/ui/Panel'
import { Switch } from '../components/ui/Toggle'
import { VerifyGate } from '../components/VerifyGate'
import { cn } from '../lib/cn'
import { KazakhstanMap } from './map/KazakhstanMap'
import { PersonCard } from './map/PersonCard'
import { useI18n, type Lang, type T } from '../i18n'
import { cityLabel, countryLabel } from '../lib/places'
import { hobbyLabel } from '../lib/labels'

type Layer = 'guests' | 'locals' | 'hosts' | 'partners'
const LAYERS: Layer[] = ['guests', 'locals', 'hosts', 'partners']
const HOBBY_FILTERS = ['HIKING', 'FOOTBALL', 'PHOTOGRAPHY', 'LOCAL FOOD']
const LANGUAGE_FILTERS = ['EN', 'FR', 'DE', 'RU']
const VISIBLE_KEY = 'tripdrip.map.visible'
const PAGE = 3

function matchesLayer(p: MapPerson, layers: Layer[]) {
  if (layers.includes('guests') && p.role === 'tourist') return true
  if (layers.includes('locals') && p.role === 'local') return true
  if (layers.includes('hosts') && p.role === 'local' && p.can_host_guests) return true
  return false
}

function personLine(p: MapPerson, t: T, lang: Lang) {
  if (p.role === 'local') {
    return [
      t('map.local'),
      p.can_host_guests && t('map.canHost'),
      p.rating_count > 0 ? t('map.rated', { r: Number(p.rating_avg).toFixed(1) }) : t('map.new'),
      p.qonaq_completed_count > 0 && t('map.helped', { n: p.qonaq_completed_count }),
    ]
      .filter(Boolean)
      .join(' · ')
  }
  return t('map.guest', { country: countryLabel(p.country_code, lang) })
}

function MapScreen() {
  const { user } = useAuth()
  const entities = useMapEntities({})
  const presence = useUpdatePresence()
  const sayHi = useSendNetworkRequest()
  const { t, lang } = useI18n()

  const [visible, setVisible] = useState(() => localStorage.getItem(VISIBLE_KEY) === 'true')
  const [layers, setLayers] = useState<Layer[]>(['guests', 'locals'])
  const [hobby, setHobby] = useState<string | null>(null)
  const [language, setLanguage] = useState<string | null>(null)
  const [practise, setPractise] = useState(false)
  const [city, setCity] = useState((user?.city ?? 'almaty').toLowerCase())
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [openPerson, setOpenPerson] = useState<MapPerson | null>(null)
  const [shown, setShown] = useState(PAGE)

  const people = useMemo(
    () =>
      (entities.data?.people ?? []).filter(
        (p) =>
          p.user_id !== user?.id &&
          matchesLayer(p, layers) &&
          (!hobby || p.hobbies.some((h) => h.toUpperCase() === hobby)) &&
          (!language || p.languages.some((l) => l.code.toUpperCase() === language)) &&
          (!practise || (p.role === 'local' && p.ready_for_networking)),
      ),
    [entities.data, user?.id, layers, hobby, language, practise],
  )

  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const p of people) result[p.city.toLowerCase()] = (result[p.city.toLowerCase()] ?? 0) + 1
    if (layers.includes('partners')) {
      for (const p of entities.data?.partners ?? []) result[p.city.toLowerCase()] = (result[p.city.toLowerCase()] ?? 0) + 1
    }
    return result
  }, [people, entities.data, layers])

  const inCity = people.filter((p) => p.city.toLowerCase() === city)
  const partnersInCity = layers.includes('partners') ? (entities.data?.partners ?? []).filter((p) => p.city.toLowerCase() === city) : []
  const selected = inCity.find((p) => p.user_id === highlighted) ?? inCity[0]

  const toggleLayer = (layer: Layer) => setLayers((list) => (list.includes(layer) ? list.filter((l) => l !== layer) : [...list, layer]))

  function toggleVisible(next: boolean) {
    setVisible(next)
    localStorage.setItem(VISIBLE_KEY, String(next))
    presence.mutate({ city: user?.city ?? 'Almaty', district: user?.district, is_visible: next })
  }

  return (
    <div className="flex flex-col gap-[20px] lg:flex-row lg:items-start">
      <Panel className="w-full gap-[6px] p-[18px] lg:w-[230px] lg:shrink-0">
        <Switch checked={visible} onChange={toggleVisible} disabled={presence.isPending}>
          {t('map.showMe')}
        </Switch>
        <p className="label text-ink">{t('map.showOnMap')}</p>
        <div className="flex flex-wrap gap-[6px] lg:flex-col lg:items-start">
          {LAYERS.map((l) => (
            <Chip key={l} selected={layers.includes(l)} onClick={() => toggleLayer(l)}>
              {layers.includes(l) ? `✓ ${t(`map.layer.${l}`)}` : t(`map.layer.${l}`)}
            </Chip>
          ))}
        </div>
        <p className="label text-ink">{t('map.hobby')}</p>
        <div className="flex flex-wrap gap-[6px]">
          <Chip selected={!hobby} onClick={() => setHobby(null)}>
            {t('pb.all')}
          </Chip>
          {HOBBY_FILTERS.map((h) => (
            <Chip key={h} selected={hobby === h} onClick={() => setHobby(hobby === h ? null : h)}>
              {hobbyLabel(t, h)}
            </Chip>
          ))}
        </div>
        <p className="label text-ink">{t('map.language')}</p>
        <div className="flex flex-wrap gap-[6px]">
          <Chip selected={!language} onClick={() => setLanguage(null)}>
            {t('map.any')}
          </Chip>
          {LANGUAGE_FILTERS.map((l) => (
            <Chip key={l} selected={language === l} onClick={() => setLanguage(language === l ? null : l)}>
              {l}
            </Chip>
          ))}
        </div>
        <Chip selected={practise} onClick={() => setPractise((v) => !v)} className="self-start">
          {t('map.practise')}
        </Chip>
        {presence.error && <Notice>{errorMessage(presence.error)}</Notice>}
        <p className="font-body text-[16px] text-ink-soft">{t('map.region')}</p>
      </Panel>

      <div className="min-w-0 flex-1">
        <KazakhstanMap
          counts={counts}
          selected={city}
          onSelect={(c) => {
            setCity(c)
            setOpenPerson(null)
            setHighlighted(null)
            setShown(PAGE)
          }}
        />
        {entities.error && <Notice className="mt-[12px]">{errorMessage(entities.error)}</Notice>}
      </div>

      <div className="w-full lg:w-[360px] lg:shrink-0">
        {openPerson ? (
          <PersonCard person={openPerson} cityCount={inCity.length} onBack={() => setOpenPerson(null)} />
        ) : (
          <Panel className="gap-[10px] p-[18px]">
            <p className="label text-ink">
              {t('map.shown', { city: cityLabel(city, lang).toUpperCase(), n: Math.min(shown, inCity.length), total: inCity.length })}
            </p>
            {inCity.slice(0, shown).map((p) => {
              const isHighlighted = p.user_id === selected?.user_id
              return (
                <button
                  key={p.user_id}
                  type="button"
                  onClick={() => {
                    setHighlighted(p.user_id)
                    setOpenPerson(p)
                  }}
                  className={cn(
                    'flex w-full items-center gap-[14px] rounded-[12px] border-ink p-[12px] text-left',
                    isHighlighted ? 'border-4 bg-cream shadow-card' : 'border-3 bg-white',
                  )}
                >
                  <Avatar variant={avatarFor(p.user_id)} size={64} />
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-[4px]">
                    <span className="truncate font-display text-[32px] leading-none text-ink">{p.first_name}</span>
                    <span className="font-body text-[16px] text-ink-soft">{personLine(p, t, lang)}</span>
                    {p.hobbies[0] && <Tag selected>{hobby && p.hobbies.some((h) => h.toUpperCase() === hobby) ? `✓ ${hobbyLabel(t, hobby)}` : hobbyLabel(t, p.hobbies[0])}</Tag>}
                  </div>
                </button>
              )
            })}
            {inCity.length > shown && (
              <Chip className="self-start" onClick={() => setShown((n) => n + PAGE)}>
                {t('map.more')}
              </Chip>
            )}
            {partnersInCity.map((p) => (
              <div key={p.location_id} className="flex flex-col gap-[2px] rounded-[12px] border-3 border-ink bg-mist p-[12px]">
                <span className="font-display text-[26px] leading-none text-ink">{p.brand_name}</span>
                <span className="font-body text-[16px] text-ink-soft">
                  {p.branch_name} · {t('map.coins', { n: p.reward_coins })}
                </span>
              </div>
            ))}
            {entities.isSuccess && inCity.length === 0 && partnersInCity.length === 0 && (
              <p className="font-body text-[16px] text-ink-soft">{t('map.nobody')}</p>
            )}
            {sayHi.error && <Notice>{errorMessage(sayHi.error)}</Notice>}
            {sayHi.isSuccess && <Notice tone="ok">{t('map.sent')}</Notice>}
            {selected && (
              <Button className="self-start" loading={sayHi.isPending} onClick={() => sayHi.mutate({ receiver_id: selected.user_id })}>
                {t('map.sayHello')}
              </Button>
            )}
            <p className="font-body text-[16px] text-ink-soft">{t('map.tap')}</p>
          </Panel>
        )}
      </div>
    </div>
  )
}

// 10 Map & networking (Figma 161:5447) and 10b person card (Figma 165:7174).
export function MapPage() {
  return (
    <AppScreen>
      <VerifyGate>
        <MapScreen />
      </VerifyGate>
    </AppScreen>
  )
}
