import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { useQonaqFeed, useRespondQonaq, useUpdateProfile, useWallet } from '../../api/hooks'
import { useAuth } from '../../auth/AuthContext'
import { RequestCard } from '../../components/RequestCard'
import { Avatar } from '../../components/ui/Avatar'
import { avatarFor } from '../../lib/avatar'
import { buttonClass } from '../../components/ui/styles'
import { Chip } from '../../components/ui/Chip'
import { Icon } from '../../components/ui/Icon'
import { Notice, Panel } from '../../components/ui/Panel'
import { cn } from '../../lib/cn'
import { helpType, ruDate, whenLabel } from '../../lib/data'

const COUNTRY_RU: Record<string, string> = {
  US: 'США',
  GB: 'Великобритания',
  FR: 'Франция',
  DE: 'Германия',
  JP: 'Япония',
  KR: 'Южная Корея',
  CN: 'Китай',
  IT: 'Италия',
  ES: 'Испания',
  TR: 'Турция',
  IN: 'Индия',
}

function Stat({ value, label, dark }: { value: string | number; label: string; dark?: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col items-center gap-[2px] rounded-[10px] border-3 border-ink p-[10px]', dark ? 'bg-ink' : 'bg-mist')}>
      <span className={cn('font-display text-[36px] leading-none', dark ? 'text-yellow' : 'text-ink')}>{value}</span>
      <span className={cn('font-cyr text-[13px] tracking-[0.52px]', dark ? 'text-white' : 'text-ink-soft')}>{label}</span>
    </div>
  )
}

// 09 Лента Қонақ for locals (Figma 161:4766). Russian copy in Tiny5.
export function QonaqFeed() {
  const { user } = useAuth()
  const feed = useQonaqFeed(user?.city)
  const respond = useRespondQonaq()
  const updateProfile = useUpdateProfile()
  const wallet = useWallet()
  const [accepted, setAccepted] = useState<string[]>([])
  const [declined, setDeclined] = useState<string[]>([])
  const [error, setError] = useState('')

  async function answer(requestId: string, decision: 'accepted' | 'declined') {
    setError('')
    try {
      await respond.mutateAsync({ requestId, decision })
      if (decision === 'accepted') setAccepted((list) => [...list, requestId])
      else setDeclined((list) => [...list, requestId])
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const items = (feed.data ?? []).filter((r) => !declined.includes(r.id))

  return (
    <div className="flex flex-col gap-[20px] lg:flex-row">
      <Panel className="min-w-0 flex-1 gap-[12px] p-[20px] lg:max-w-[900px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <h1 className="font-cyr text-[38px] leading-none text-ink">гости рядом</h1>
          <div className="flex flex-wrap gap-[8px]">
            <Chip
              cyr
              selected={!!user?.ready_for_networking}
              disabled={updateProfile.isPending}
              onClick={() => updateProfile.mutate({ ready_for_networking: !user?.ready_for_networking })}
            >
              {user?.ready_for_networking ? '✓ ' : ''}ГОТОВ К НЕТВОРКИНГУ
            </Chip>
            <Chip
              cyr
              selected={!!user?.can_host_guests}
              disabled={updateProfile.isPending}
              onClick={() => updateProfile.mutate({ can_host_guests: !user?.can_host_guests })}
            >
              {user?.can_host_guests ? '✓ ' : ''}МОГУ ПРИНЯТЬ В ГОСТИ
            </Chip>
          </div>
        </div>
        {error && <Notice>{error}</Notice>}
        {feed.error && <Notice>{errorMessage(feed.error)}</Notice>}
        {feed.isSuccess && items.length === 0 && <p className="font-cyr text-[18px] text-ink-soft">Пока нет запросов в вашем городе.</p>}
        {items.map((r) => {
          const type = helpType(r.help_type)
          const meta = [r.city, r.district, whenLabel(r.needed_at, 'ru'), `${r.people_count} чел.`].filter(Boolean).join(' · ')
          const isAccepted = accepted.includes(r.id)
          return (
            <RequestCard
              key={r.id}
              cyr
              name={`${r.tourist_first_name} ${r.tourist_last_name}`}
              avatar={avatarFor(r.tourist_id)}
              subtitle={`${COUNTRY_RU[r.tourist_country_code] ?? r.tourist_country_code} · до ${ruDate(r.expires_at)}`}
              type={type.ru}
              body={r.description}
              meta={meta}
            >
              {isAccepted ? (
                <div className="flex items-center gap-[10px] rounded-[10px] border-3 border-ink bg-mint p-[10px]">
                  <Icon name="check" size={20} />
                  <p className="flex-1 font-cyr text-[15px] text-ink">Вы откликнулись. Ждём, когда турист выберет хоста.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-[12px] pt-[4px]">
                  <button
                    type="button"
                    className={buttonClass('primary', 'font-cyr text-[26px]')}
                    disabled={respond.isPending}
                    onClick={() => answer(r.id, 'accepted')}
                  >
                    принять
                  </button>
                  <button
                    type="button"
                    className={buttonClass('secondary', 'font-cyr text-[26px]')}
                    disabled={respond.isPending}
                    onClick={() => answer(r.id, 'declined')}
                  >
                    отказ
                  </button>
                </div>
              )}
            </RequestCard>
          )
        })}
      </Panel>

      <Panel className="h-fit w-full gap-[12px] p-[20px] lg:w-[440px]">
        <div className="flex items-center gap-[12px]">
          <Avatar variant={avatarFor(user?.id ?? '')} size={64} />
          <div className="flex flex-col gap-[2px] font-cyr">
            <p className="text-[32px] leading-none text-ink">{user?.first_name}</p>
            <p className="text-[15px] text-ink-soft">{user?.city} · местный</p>
          </div>
        </div>
        <div className="flex gap-[8px]">
          <Stat value={user && user.rating_count > 0 ? Number(user.rating_avg).toFixed(1) : '—'} label="РЕЙТИНГ" />
          <Stat value={user?.qonaq_completed_count ?? 0} label="РАЗ ПОМОГ" />
          <Stat value={wallet.data?.balance ?? 0} label="МОНЕТ" dark />
        </div>
        <p className="font-cyr text-[15px] text-ink">+30 монет за помощь, которую подтвердили оба. До 3 раз в день.</p>
        <div className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-cream p-[14px] font-cyr">
          <p className="text-[13px] tracking-[0.52px] text-leaf">КАК ПРОХОДИТ ВСТРЕЧА</p>
          <p className="text-[15px] text-ink">1. Вы принимаете запрос</p>
          <p className="text-[15px] text-ink">2. Турист выбирает хоста, открывается чат</p>
          <p className="text-[15px] text-ink">3. Встреча в людном месте</p>
          <p className="text-[15px] text-ink">4. Оба ставите оценку</p>
        </div>
      </Panel>
    </div>
  )
}
