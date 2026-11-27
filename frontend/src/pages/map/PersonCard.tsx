import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { useBlock, useReport, useSendNetworkRequest } from '../../api/hooks'
import type { MapPerson } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Avatar } from '../../components/ui/Avatar'
import { avatarFor } from '../../lib/avatar'
import { Button } from '../../components/ui/Button'
import { Chip, Tag } from '../../components/ui/Chip'
import { CheckBadge } from '../../components/ui/Icon'
import { Eyebrow, Notice, Panel } from '../../components/ui/Panel'
import { titleCase } from '../../lib/data'
import { useI18n, type TKey } from '../../i18n'
import { cityLabel, countryLabel } from '../../lib/places'
import { hobbyLabel, languageName } from '../../lib/labels'

const REPORT_REASONS = ['asked for money', 'spam', 'rude']

function Stat({ value, label }: { value: string | number; label: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-[10px] border-3 border-ink bg-mist p-[8px] text-center">
      <span className="font-display text-[30px] leading-none text-ink">{value}</span>
      <span className="font-body text-[11px] font-bold tracking-[0.66px] text-ink-soft">{label}</span>
    </div>
  )
}

// 10b Map · person card (Figma 165:7298).
export function PersonCard({ person, cityCount, onBack }: { person: MapPerson; cityCount: number; onBack: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const sayHi = useSendNetworkRequest()
  const report = useReport()
  const block = useBlock()
  const [reporting, setReporting] = useState(false)
  const { t, lang } = useI18n()
  const isLocal = person.role === 'local'
  const canAskForHelp = user?.role === 'tourist' && isLocal

  const error = sayHi.error ?? report.error ?? block.error
  const done = sayHi.isSuccess ? t('map.sent') : report.isSuccess ? t('report.thanks') : ''

  return (
    <Panel className="h-fit w-full gap-[12px] p-[18px]">
      <div className="flex items-center justify-between">
        <Chip onClick={onBack}>
          ← {cityLabel(person.city, lang).toUpperCase()} · {cityCount}
        </Chip>
        <Eyebrow>{isLocal ? t('person.local') : t('person.guest')}</Eyebrow>
      </div>
      <div className="flex items-center gap-[14px]">
        <Avatar variant={avatarFor(person.user_id)} size={80} />
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <div className="flex items-center gap-[8px]">
            <p className="truncate font-display text-[34px] leading-none text-ink">
              {person.first_name} {person.last_name}
            </p>
            <CheckBadge size={16} thin />
          </div>
          <p className="font-body text-[16px] text-ink-soft">
            {titleCase(cityLabel(person.city, lang))} · {isLocal ? t('person.verifiedLocal') : t('person.verifiedGuest', { country: countryLabel(person.country_code, lang) })}
          </p>
        </div>
      </div>
      <div className="flex gap-[8px]">
        <Stat value={person.rating_count > 0 ? Number(person.rating_avg).toFixed(1) : t('person.new')} label={t('person.rating')} />
        <Stat
          value={person.qonaq_completed_count}
          label={t('person.helped')}
        />
        <Stat value={person.country_code} label={t('person.country')} />
      </div>
      {person.expectations && (
        <div className="flex flex-col gap-[4px] rounded-[10px] border-3 border-ink bg-cream p-[12px]">
          <Eyebrow>{t('person.lookingFor')}</Eyebrow>
          <p className="font-body text-[16px] text-ink">{person.expectations}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-[6px]">
        {person.languages.map((l) => (
          <Tag key={l.code} selected>
            {languageName(t, l.code)}
          </Tag>
        ))}
        {person.hobbies.map((h) => (
          <Tag key={h}>{hobbyLabel(t, h)}</Tag>
        ))}
      </div>
      {error && <Notice>{errorMessage(error)}</Notice>}
      {done && <Notice tone="ok">{done}</Notice>}
      <div className="flex flex-wrap gap-[12px]">
        <Button onClick={() => sayHi.mutate({ receiver_id: person.user_id })} loading={sayHi.isPending} disabled={sayHi.isSuccess}>
          {t('person.sayHi')}
        </Button>
        {canAskForHelp && (
          <Button
            variant="secondary"
            onClick={() => navigate(`/qonaq?target=${person.user_id}&name=${encodeURIComponent(person.first_name)}`)}
          >
            {t('person.askHelp')}
          </Button>
        )}
      </div>
      {reporting && (
        <div className="flex flex-wrap gap-[6px]">
          {REPORT_REASONS.map((reason) => (
            <Chip
              key={reason}
              disabled={report.isPending}
              onClick={() => report.mutate({ target_user_id: person.user_id, reason }, { onSuccess: () => setReporting(false) })}
            >
              {t(`report.${reason}` as TKey)}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex items-center gap-[16px]">
        <button type="button" className="label text-danger" onClick={() => setReporting((v) => !v)}>
          {t('report.report')}
        </button>
        <button type="button" className="label text-danger" disabled={block.isPending} onClick={() => block.mutate(person.user_id, { onSuccess: onBack })}>
          {t('report.block')}
        </button>
        <p className="flex-1 text-right font-body text-[16px] text-ink-soft">{t('person.chatAfter')}</p>
      </div>
    </Panel>
  )
}
