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
import { countryName, languageLabel, titleCase } from '../../lib/data'

const REPORT_REASONS = ['ASKED FOR MONEY', 'SPAM', 'RUDE']

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
  const isLocal = person.role === 'local'
  const canAskForHelp = user?.role === 'tourist' && isLocal

  const error = sayHi.error ?? report.error ?? block.error
  const done = sayHi.isSuccess ? 'Request sent. The chat opens after they accept.' : report.isSuccess ? 'Thanks, a moderator will look at it.' : ''

  return (
    <Panel className="h-fit w-full gap-[12px] p-[18px]">
      <div className="flex items-center justify-between">
        <Chip onClick={onBack}>
          ← {person.city.toUpperCase()} · {cityCount}
        </Chip>
        <Eyebrow>{isLocal ? 'LOCAL' : 'GUEST'}</Eyebrow>
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
            {titleCase(person.city)} · verified {isLocal ? 'local' : `guest from ${countryName(person.country_code)}`}
          </p>
        </div>
      </div>
      <div className="flex gap-[8px]">
        <Stat value={Number(person.rating_avg || 0).toFixed(1)} label="RATING" />
        <Stat
          value={person.qonaq_completed_count}
          label={
            <>
              HELPED VIA <span className="font-cyr">ҚОНАҚ</span>
            </>
          }
        />
        <Stat value={person.country_code} label="COUNTRY" />
      </div>
      {person.expectations && (
        <div className="flex flex-col gap-[4px] rounded-[10px] border-3 border-ink bg-cream p-[12px]">
          <Eyebrow>LOOKING FOR</Eyebrow>
          <p className="font-body text-[16px] text-ink">{person.expectations}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-[6px]">
        {person.languages.map((l) => (
          <Tag key={l.code} selected>
            {languageLabel(l.code)}
          </Tag>
        ))}
        {person.hobbies.map((h) => (
          <Tag key={h}>{h}</Tag>
        ))}
      </div>
      {error && <Notice>{errorMessage(error)}</Notice>}
      {done && <Notice tone="ok">{done}</Notice>}
      <div className="flex flex-wrap gap-[12px]">
        <Button onClick={() => sayHi.mutate({ receiver_id: person.user_id })} loading={sayHi.isPending} disabled={sayHi.isSuccess}>
          say hi
        </Button>
        {canAskForHelp && (
          <Button
            variant="secondary"
            onClick={() => navigate(`/qonaq?target=${person.user_id}&name=${encodeURIComponent(person.first_name)}`)}
          >
            ask for help
          </Button>
        )}
      </div>
      {reporting && (
        <div className="flex flex-wrap gap-[6px]">
          {REPORT_REASONS.map((reason) => (
            <Chip
              key={reason}
              disabled={report.isPending}
              onClick={() => report.mutate({ target_user_id: person.user_id, reason: reason.toLowerCase() }, { onSuccess: () => setReporting(false) })}
            >
              {reason}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex items-center gap-[16px]">
        <button type="button" className="label text-danger" onClick={() => setReporting((v) => !v)}>
          REPORT
        </button>
        <button type="button" className="label text-danger" disabled={block.isPending} onClick={() => block.mutate(person.user_id, { onSuccess: onBack })}>
          BLOCK
        </button>
        <p className="flex-1 text-right font-body text-[16px] text-ink-soft">chat opens after they accept</p>
      </div>
    </Panel>
  )
}
