import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useActiveRoute, useConfirmQonaq, useMyQonaqRequests, useQonaqFeed, useQonaqResponses, useSelectHost, useWallet } from '../api/hooks'
import type { HelpRequest } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AppScreen } from '../components/Layout'
import { ButtonLink } from '../components/ui/Button'
import { Chip, Tag } from '../components/ui/Chip'
import { Coin } from '../components/ui/Coin'
import { Eyebrow, Notice, Panel } from '../components/ui/Panel'
import { Sign } from '../components/ui/Sign'
import { helpType, whenLabel } from '../lib/data'
import { useI18n } from '../i18n'

const MAX_OPEN = 3
const isOpen = (r: HelpRequest) => r.status === 'open' || r.status === 'has_responses' || r.status === 'matched'

function Responders({ request }: { request: HelpRequest }) {
  const navigate = useNavigate()
  const responses = useQonaqResponses(request.id)
  const select = useSelectHost()
  const accepted = (responses.data ?? []).filter((r) => r.decision === 'accepted')
  if (responses.isPending) return null
  return (
    <div className="flex flex-col gap-[6px] pl-[12px]">
      {accepted.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-[8px] rounded-[10px] border-3 border-ink bg-white px-[12px] py-[6px]">
          <span className="font-body text-[16px] text-ink">
            {r.first_name} · {r.qonaq_completed_count}× helped
          </span>
          <Chip selected onClick={() =>
              select.mutate({ requestId: request.id, localId: r.local_id }, { onSuccess: (res) => navigate(`/chats/${res.chat.id}`) })
            } disabled={select.isPending}>
            PICK
          </Chip>
        </div>
      ))}
      {select.error && <Notice>{errorMessage(select.error)}</Notice>}
    </div>
  )
}

function RequestRow({ request }: { request: HelpRequest }) {
  const [expanded, setExpanded] = useState(false)
  const responses = useQonaqResponses(request.status === 'has_responses' ? request.id : null)
  const confirm = useConfirmQonaq()
  const accepted = (responses.data ?? []).filter((r) => r.decision === 'accepted').length

  let chip = <Tag>OPEN</Tag>
  if (request.status === 'has_responses') {
    chip = (
      <Chip selected onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        {accepted || ''} ACCEPTED
      </Chip>
    )
  } else if (request.status === 'matched') {
    const confirmed = request.tourist_confirmed_done
    chip = confirmed ? (
      <Tag>WAITING</Tag>
    ) : (
      <Chip selected disabled={confirm.isPending} onClick={() => confirm.mutate(request.id)}>
        MARK DONE
      </Chip>
    )
  } else if (request.status === 'completed') {
    chip = <Tag>DONE</Tag>
  } else if (request.status === 'cancelled' || request.status === 'expired') {
    chip = <Tag>{request.status.toUpperCase()}</Tag>
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center gap-[10px] rounded-[10px] border-3 border-ink bg-mist p-[12px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <p className="truncate font-body text-[18px] font-bold text-ink">{request.description}</p>
          <p className="font-body text-[16px] text-ink-soft">
            {helpType(request.help_type).short} · {whenLabel(request.needed_at)}
          </p>
        </div>
        {chip}
      </div>
      {expanded && <Responders request={request} />}
    </div>
  )
}

function MyRequestsCard() {
  const requests = useMyQonaqRequests()
  const items = requests.data ?? []
  const openCount = items.filter(isOpen).length
  return (
    <Panel className="gap-[10px] p-[22px]">
      <div className="flex items-center justify-between gap-[8px]">
        <p className="label text-leaf">
          MY <span className="font-cyr">ҚОНАҚ</span> REQUESTS
        </p>
        <p className="font-body text-[16px] text-ink-soft">
          {openCount} of {MAX_OPEN} open
        </p>
      </div>
      {items.slice(0, 3).map((r) => (
        <RequestRow key={r.id} request={r} />
      ))}
      {requests.isSuccess && items.length === 0 && <p className="font-body text-[16px] text-ink-soft">No requests yet.</p>}
      {requests.error && <Notice>{errorMessage(requests.error)}</Notice>}
      <ButtonLink to="/qonaq" variant="secondary" className="self-start">
        new request
      </ButtonLink>
    </Panel>
  )
}

function FeedPreviewCard({ city }: { city: string }) {
  const feed = useQonaqFeed(city)
  const items = feed.data ?? []
  return (
    <Panel className="gap-[10px] p-[22px]">
      <div className="flex items-center justify-between gap-[8px]">
        <p className="font-cyr text-[14px] text-leaf">ГОСТИ РЯДОМ</p>
        <p className="font-cyr text-[16px] text-ink-soft">{items.length}</p>
      </div>
      {items.slice(0, 3).map((r) => (
        <div key={r.id} className="flex flex-col gap-[2px] rounded-[10px] border-3 border-ink bg-mist p-[12px]">
          <p className="truncate font-body text-[18px] font-bold text-ink">{r.description}</p>
          <p className="font-cyr text-[16px] text-ink-soft">
            {r.tourist_first_name} · {helpType(r.help_type).ru.toLowerCase()} · {whenLabel(r.needed_at, 'ru')}
          </p>
        </div>
      ))}
      {feed.isSuccess && items.length === 0 && <p className="font-cyr text-[16px] text-ink-soft">Пока нет запросов.</p>}
      <ButtonLink to="/qonaq" variant="secondary" className="self-start">
        open feed
      </ButtonLink>
    </Panel>
  )
}

function RouteCard() {
  const route = useActiveRoute()
  const r = route.data
  const stops = r?.stops ?? []
  const visited = stops.filter((s) => s.is_visited)
  const coins = visited.reduce((sum, s) => sum + s.reward_coins, 0)

  return (
    <Panel className="flex-col gap-[20px] p-[22px] sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
        <Eyebrow>TODAY’S ROUTE</Eyebrow>
        <p className="truncate font-display text-[36px] leading-none text-ink">
          {r && stops.length ? `${stops[0].name} to ${stops[stops.length - 1].name}` : 'Pick a vibe and go'}
        </p>
        <p className="font-body text-[16px] text-ink-soft">
          {r ? `${visited.length} of ${stops.length} stops · ${coins} coins collected` : '3–5 stops near you, coins at each one'}
        </p>
      </div>
      {r && (
        <div className="flex flex-wrap items-center gap-[8px]">
          {stops.map((s) => (
            <Coin key={s.point_id} empty={!s.is_visited} />
          ))}
        </div>
      )}
      <ButtonLink to="/route">{r ? 'continue' : 'get route'}</ButtonLink>
    </Panel>
  )
}

// 05 Home (Figma 160:2288).
export function HomePage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const wallet = useWallet(!!user?.is_verified)
  const isLocal = user?.role === 'local'
  const verified = !!user?.is_verified

  return (
    <AppScreen sprites={[{ kind: 'yurt', x: 1010, width: 115.2 }]} className="lg:mt-[32px]">
      <div className="grid grid-cols-1 gap-[24px] lg:grid-cols-[430px_430px_442px] lg:justify-between lg:gap-x-0 lg:gap-y-[46px]">
        <Panel className="justify-between gap-[24px] p-[24px] lg:h-[300px]">
          <div className="flex flex-col gap-[8px]">
            <Eyebrow>{t('home.worksOffline')}</Eyebrow>
            <h2 className="font-display text-[56px] leading-none text-ink">{t('home.phrasebookTitle')}</h2>
            <p className="font-body text-[20px] text-ink">{t('home.phrasebookText')}</p>
          </div>
          <ButtonLink to="/phrasebook" className="self-start">
            {t('common.openPhrasebook')}
          </ButtonLink>
        </Panel>

        <Panel tone="cream" className="justify-between gap-[24px] p-[24px] lg:h-[300px]">
          <div className="flex flex-col gap-[8px]">
            <Eyebrow>{isLocal ? t('home.guestsNeedHelp') : t('home.localsWhoHelp')}</Eyebrow>
            <h2 className="font-cyr text-[45px] leading-none text-ink">Қонақ</h2>
            <p className="font-body text-[20px] text-ink">
              {isLocal
                ? t('home.localText')
                : t('home.guestText')}
            </p>
          </div>
          <ButtonLink to={verified ? '/qonaq' : '/verify'} className="self-start">
            {!verified ? t('home.verifyFirst') : isLocal ? t('home.openFeed') : t('home.askLocal')}
          </ButtonLink>
        </Panel>

        <div className="flex flex-col gap-[24px] lg:row-span-2">
          {verified ? isLocal ? <FeedPreviewCard city={user.city} /> : <MyRequestsCard /> : null}
          {/* Stands on the grass line of the scene, like the Figma frame (x 1250, bottom 124 of 810). */}
          <div className="pointer-events-none fixed right-[46px] bottom-[max(8.611vw,15.31vh)] hidden lg:block">
            <Sign value={wallet.data?.balance ?? 0} caption="COINS" />
          </div>
        </div>

        {verified && (
          <div className="lg:col-span-2 lg:h-[150px]">
            <RouteCard />
          </div>
        )}
      </div>
    </AppScreen>
  )
}
