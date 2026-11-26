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
import { CITIES, HELP_TYPES, countryName, shortDate } from '../../lib/data'

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
  const typeInfo = HELP_TYPES.find((h) => h.value === type)!

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

  const whenText = when === 'now' ? 'now' : when === 'today' ? 'today' : date ? shortDate(date) : 'pick a date'
  const tripEnd = user?.trip_end_date ? ` until ${shortDate(user.trip_end_date)}` : ''

  return (
    <div className="flex flex-col gap-[40px] lg:flex-row">
      <Panel className="min-w-0 flex-1 p-[22px] lg:max-w-[820px]">
        <form onSubmit={submit} className="flex flex-col gap-[14px]">
          <div className="flex flex-col gap-[2px]">
            <h1 className="font-display text-[48px] leading-none text-ink">{targetName ? `ask ${targetName}` : 'ask a local'}</h1>
            <p className="font-body text-[16px] text-ink-soft">
              <span className="font-cyr">Қонақ</span> means guest. Phone and exact address stay hidden until you pick a host.
            </p>
          </div>
          <div className="flex flex-col gap-[8px]">
            <Eyebrow>WHAT DO YOU NEED?</Eyebrow>
            <div className="flex flex-wrap gap-[8px]">
              {HELP_TYPES.filter((h) => h.value !== 'host_stay').map((h) => (
                <Chip key={h.value} selected={type === h.value} onClick={() => setType(h.value)}>
                  {h.en}
                </Chip>
              ))}
              <span className="label flex items-center gap-[6px] rounded-[10px] border-3 border-ink bg-locked p-[8px] text-ink-soft">
                <Icon name="lock" size={16} />
                STAY OVERNIGHT · AFTER REVIEWS
              </span>
            </div>
          </div>
          <TextArea
            label="DESCRIBE YOUR SITUATION"
            placeholder="I need to get to Big Almaty Lake. Which bus goes there and where do I buy a ticket?"
            rows={2}
            maxLength={MAX_CHARS}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="flex justify-between gap-[12px] font-body text-[16px] text-ink-soft">
            <p>Locals get it auto-translated to Russian and Kazakh.</p>
            <p className="shrink-0">
              {description.length}/{MAX_CHARS}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
            <Select label="CITY" value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Input label="AREA" placeholder="Sayakhat station" value={area} onChange={(e) => setArea(e.target.value)} maxLength={120} />
            <Select label="PEOPLE" value={people} onChange={(e) => setPeople(Number(e.target.value))}>
              <option value={1}>just me</option>
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} people
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-[8px]">
            <Eyebrow>WHEN</Eyebrow>
            <Chip selected={when === 'now'} onClick={() => setWhen('now')}>
              NOW
            </Chip>
            <Chip selected={when === 'today'} onClick={() => setWhen('today')}>
              TODAY
            </Chip>
            <Chip selected={when === 'date'} onClick={() => setWhen('date')}>
              PICK A DATE
            </Chip>
            {when === 'date' && (
              <input
                type="datetime-local"
                aria-label="Date and time"
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
              send request
            </Button>
            <p className="font-body text-[16px] text-ink-soft">
              {openCount} of {MAX_OPEN} open requests
            </p>
          </div>
        </form>
      </Panel>

      <Panel tone="cream" className="h-fit w-full gap-[12px] p-[18px] lg:w-[500px]">
        <Eyebrow>HOW LOCALS SEE IT</Eyebrow>
        <RequestCard
          name={user ? `${user.first_name} ${user.last_name}` : ''}
          avatar={avatarFor(user?.id ?? '')}
          subtitle={`${countryName(user?.country_code ?? '')} · in ${city}${tripEnd}`}
          type={typeInfo.en}
          body={description || 'Your request text shows up here.'}
          meta={[city, area && `near ${area}`, whenText, `${people} ${people === 1 ? 'person' : 'people'}`].filter(Boolean).join(' · ')}
          tags={(user?.hobbies ?? []).slice(0, 3).map((h) => h.toUpperCase())}
        />
        <div className="flex items-center gap-[10px] rounded-[10px] border-3 border-ink bg-white p-[12px]">
          <Icon name="lock" size={20} />
          <p className="flex-1 font-body text-[16px] text-ink">
            <span className="font-cyr">Қонақ</span> help is always free. Someone asks for money? Report from the chat.
          </p>
        </div>
      </Panel>
    </div>
  )
}
