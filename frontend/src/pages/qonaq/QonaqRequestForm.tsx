import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { useCreateQonaqRequest, useMyQonaqRequests } from '../../api/hooks'
import type { HelpRequest, HelpType } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { RequestCard } from '../../components/RequestCard'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Input, Select, TextArea } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { Eyebrow, Notice, Panel } from '../../components/ui/Panel'
import { avatarFor } from '../../lib/avatar'
import { CITIES, HELP_TYPES } from '../../lib/data'
import { useI18n } from '../../i18n'
import { cityLabel, countryLabel } from '../../lib/places'
import { dateText, helpLabel, hobbyLabel } from '../../lib/labels'

const MAX_CHARS = 300
const MAX_OPEN = 3
type When = 'now' | 'today' | 'date'

const isOpen = (r: HelpRequest) => r.status === 'open' || r.status === 'has_responses' || r.status === 'matched'

function neededAt(when: When, date: string): string {
  if (when === 'date' && date) return new Date(date).toISOString()
  const d = new Date()
  if (when === 'today') d.setHours(Math.max(d.getHours() + 2, 18), 0, 0, 0)
  return d.toISOString()
}

// 08 Қонақ request (Figma 161:4099).
export function QonaqRequestForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const targetId = params.get('target') ?? undefined
  const targetName = params.get('name')
  const create = useCreateQonaqRequest()
  const mine = useMyQonaqRequests()
  const { t, lang, locale } = useI18n()

  const [type, setType] = useState<HelpType>('directions')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState(user?.city ? user.city.charAt(0).toUpperCase() + user.city.slice(1) : 'Almaty')
  const [area, setArea] = useState('')
  const [people, setPeople] = useState(1)
  const [when, setWhen] = useState<When>('now')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')

  const openCount = (mine.data ?? []).filter(isOpen).length
  const limitReached = openCount >= MAX_OPEN

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await create.mutateAsync({
        help_type: type,
        description: description.trim(),
        city,
        district: area.trim() || undefined,
        people_count: people,
        needed_at: neededAt(when, date),
        target_local_id: targetId,
      })
      navigate('/home')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const whenText = when === 'now' ? t('when.now') : when === 'today' ? t('when.today') : date ? dateText(locale, date) : t('qf.pickDate')
  const tripEnd = user?.trip_end_date ? t('qf.until', { date: dateText(locale, user.trip_end_date) }) : ''
  const cityName = cityLabel(city, lang)

  return (
    <div className="flex flex-col gap-[40px] lg:flex-row">
      <Panel className="min-w-0 flex-1 p-[22px] lg:max-w-[820px]">
        <form onSubmit={submit} className="flex flex-col gap-[14px]">
          <div className="flex flex-col gap-[2px]">
            <h1 className="font-display text-[48px] leading-none text-ink">{targetName ? t('qf.askName', { name: targetName }) : t('home.askLocal')}</h1>
            <p className="font-body text-[16px] text-ink-soft">
              {t('qf.intro')}
            </p>
          </div>
          <div className="flex flex-col gap-[8px]">
            <Eyebrow>{t('qf.need')}</Eyebrow>
            <div className="flex flex-wrap gap-[8px]">
              {HELP_TYPES.filter((h) => h.value !== 'host_stay').map((h) => (
                <Chip key={h.value} selected={type === h.value} onClick={() => setType(h.value)}>
                  {helpLabel(t, h.value)}
                </Chip>
              ))}
              <span className="label flex items-center gap-[6px] rounded-[10px] border-3 border-ink bg-locked p-[8px] text-ink-soft">
                <Icon name="lock" size={16} />
                {t('qf.stayLocked')}
              </span>
            </div>
          </div>
          <TextArea
            label={t('qf.describe')}
            placeholder={t('qf.describePh')}
            rows={2}
            maxLength={MAX_CHARS}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="flex justify-between gap-[12px] font-body text-[16px] text-ink-soft">
            <p>{t('qf.translated')}</p>
            <p className="shrink-0">
              {description.length}/{MAX_CHARS}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
            <Select label={t('qf.city')} value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {cityLabel(c, lang)}
                </option>
              ))}
            </Select>
            <Input label={t('qf.area')} placeholder={t('qf.areaPh')} value={area} onChange={(e) => setArea(e.target.value)} maxLength={120} />
            <Select label={t('qf.people')} value={people} onChange={(e) => setPeople(Number(e.target.value))}>
              <option value={1}>{t('qf.justMe')}</option>
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {t('qf.nPeople', { n })}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-[8px]">
            <Eyebrow>{t('qf.when')}</Eyebrow>
            <Chip selected={when === 'now'} onClick={() => setWhen('now')}>
              {t('qf.now')}
            </Chip>
            <Chip selected={when === 'today'} onClick={() => setWhen('today')}>
              {t('qf.today')}
            </Chip>
            <Chip selected={when === 'date'} onClick={() => setWhen('date')}>
              {t('qf.pickDate')}
            </Chip>
            {when === 'date' && (
              <input
                type="datetime-local"
                aria-label={t('qf.dateTime')}
                className="rounded-[10px] border-3 border-ink bg-mist px-[12px] py-[6px] font-body text-[16px] text-ink"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            )}
          </div>
          {error && <Notice>{error}</Notice>}
          <div className="flex flex-wrap items-center gap-[16px]">
            <Button type="submit" loading={create.isPending} disabled={limitReached}>
              {t('qf.send')}
            </Button>
            <p className="font-body text-[16px] text-ink-soft">
              {t('qf.openCount', { n: openCount, max: MAX_OPEN })}
            </p>
          </div>
        </form>
      </Panel>

      <Panel tone="cream" className="h-fit w-full gap-[12px] p-[18px] lg:w-[500px]">
        <Eyebrow>{t('qf.howSee')}</Eyebrow>
        <RequestCard
          name={user ? `${user.first_name} ${user.last_name}` : ''}
          avatar={avatarFor(user?.id ?? '')}
          subtitle={t('qf.subtitle', { country: countryLabel(user?.country_code ?? '', lang), city: cityName }) + tripEnd}
          type={helpLabel(t, type)}
          body={description || t('qf.bodyPh')}
          meta={[cityName, area && t('qf.near', { area }), whenText, people === 1 ? t('qf.onePerson') : t('qf.nPeople', { n: people })].filter(Boolean).join(' · ')}
          tags={(user?.hobbies ?? []).slice(0, 3).map((h) => hobbyLabel(t, h))}
        />
        <div className="flex items-center gap-[10px] rounded-[10px] border-3 border-ink bg-white p-[12px]">
          <Icon name="lock" size={20} />
          <p className="flex-1 font-body text-[16px] text-ink">
            {t('qf.free')}
          </p>
        </div>
      </Panel>
    </div>
  )
}
