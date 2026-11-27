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
import { useI18n } from '../../i18n'
import { cityLabel, countryLabel } from '../../lib/places'
import { dateText, helpLabel, whenText } from '../../lib/labels'

function Stat({ value, label, dark }: { value: string | number; label: string; dark?: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col items-center gap-[2px] rounded-[10px] border-3 border-ink p-[10px]', dark ? 'bg-ink' : 'bg-mist')}>
      <span className={cn('font-display text-[36px] leading-none', dark ? 'text-yellow' : 'text-ink')}>{value}</span>
      <span className={cn('font-body text-[13px] font-bold tracking-[0.52px] uppercase', dark ? 'text-white' : 'text-ink-soft')}>{label}</span>
    </div>
  )
}

// 09 Қонақ feed for locals (Figma 161:4766).
export function QonaqFeed() {
  const { user } = useAuth()
  const feed = useQonaqFeed(user?.city)
  const respond = useRespondQonaq()
  const updateProfile = useUpdateProfile()
  const wallet = useWallet()
  const { t, lang, locale } = useI18n()
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
          <h1 className="font-display text-[44px] leading-none text-ink">{t('feed.title')}</h1>
          <div className="flex flex-wrap gap-[8px]">
            <Chip
              cyr
              selected={!!user?.ready_for_networking}
              disabled={updateProfile.isPending}
              onClick={() => updateProfile.mutate({ ready_for_networking: !user?.ready_for_networking })}
            >
              {user?.ready_for_networking ? '✓ ' : ''}
              {t('feed.networking')}
            </Chip>
            <Chip
              cyr
              selected={!!user?.can_host_guests}
              disabled={updateProfile.isPending}
              onClick={() => updateProfile.mutate({ can_host_guests: !user?.can_host_guests })}
            >
              {user?.can_host_guests ? '✓ ' : ''}
              {t('feed.canHost')}
            </Chip>
          </div>
        </div>
        {error && <Notice>{error}</Notice>}
        {feed.error && <Notice>{errorMessage(feed.error)}</Notice>}
        {feed.isSuccess && items.length === 0 && <p className="font-body text-[18px] text-ink-soft">{t('feed.none')}</p>}
        {items.map((r) => {
          const meta = [cityLabel(r.city, lang), r.district, whenText(t, locale, r.needed_at), r.people_count === 1 ? t('qf.onePerson') : t('qf.nPeople', { n: r.people_count })]
            .filter(Boolean)
            .join(' · ')
          const isAccepted = accepted.includes(r.id)
          return (
            <RequestCard
              key={r.id}
              name={`${r.tourist_first_name} ${r.tourist_last_name}`}
              avatar={avatarFor(r.tourist_id)}
              subtitle={t('feed.until', { country: countryLabel(r.tourist_country_code, lang), date: dateText(locale, r.expires_at) })}
              type={helpLabel(t, r.help_type)}
              body={r.description}
              meta={meta}
            >
              {isAccepted ? (
                <div className="flex items-center gap-[10px] rounded-[10px] border-3 border-ink bg-mint p-[10px]">
                  <Icon name="check" size={20} />
                  <p className="flex-1 font-body text-[15px] text-ink">{t('feed.responded')}</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-[12px] pt-[4px]">
                  <button
                    type="button"
                    className={buttonClass('primary')}
                    disabled={respond.isPending}
                    onClick={() => answer(r.id, 'accepted')}
                  >
                    {t('feed.accept')}
                  </button>
                  <button
                    type="button"
                    className={buttonClass('secondary')}
                    disabled={respond.isPending}
                    onClick={() => answer(r.id, 'declined')}
                  >
                    {t('feed.decline')}
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
          <div className="flex flex-col gap-[2px]">
            <p className="font-display text-[32px] leading-none text-ink">{user?.first_name}</p>
            <p className="font-body text-[15px] text-ink-soft">{t('feed.local', { city: cityLabel(user?.city ?? '', lang) })}</p>
          </div>
        </div>
        <div className="flex gap-[8px]">
          <Stat value={user && user.rating_count > 0 ? Number(user.rating_avg).toFixed(1) : '—'} label={t('feed.rating')} />
          <Stat value={user?.qonaq_completed_count ?? 0} label={t('feed.helped')} />
          <Stat value={wallet.data?.balance ?? 0} label={t('feed.coins')} dark />
        </div>
        <p className="font-body text-[15px] text-ink">{t('feed.reward')}</p>
        <div className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-cream p-[14px] font-body">
          <p className="label text-leaf">{t('feed.how')}</p>
          <p className="text-[15px] text-ink">{t('feed.step1')}</p>
          <p className="text-[15px] text-ink">{t('feed.step2')}</p>
          <p className="text-[15px] text-ink">{t('feed.step3')}</p>
          <p className="text-[15px] text-ink">{t('feed.step4')}</p>
        </div>
      </Panel>
    </div>
  )
}
