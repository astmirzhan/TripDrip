import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useUpdateProfile } from '../api/hooks'
import type { LanguageSkill, TripPurpose, User, Vibe } from '../api/types'
import baiterek from '../assets/figma/baiterek.svg'
import natureArt from '../assets/figma/vibe-nature.svg'
import yurt from '../assets/figma/yurt.svg'
import { useAuth } from '../auth/AuthContext'
import { AccountSettings } from '../components/AccountSettings'
import { SceneScreen } from '../components/Layout'
import { StepChips } from '../components/StepChips'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Input } from '../components/ui/Field'
import { CheckBadge } from '../components/ui/Icon'
import { Notice, Panel } from '../components/ui/Panel'
import { cn } from '../lib/cn'
import { HOBBIES, LANGUAGES, LEVELS, PURPOSES, levelLabel } from '../lib/data'

function VibeCard({ selected, onClick, title, hint, art }: { selected: boolean; onClick: () => void; title: string; hint: string; art: 'nature' | 'metropolis' }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[12px] border-ink text-left',
        selected ? 'border-4 bg-mint' : 'border-3 bg-white',
      )}
    >
      <div className="relative h-[86px] w-full overflow-hidden bg-sky-blue">
        {art === 'nature' ? (
          <img src={natureArt} alt="" className="absolute top-0 left-0 h-[86px] w-[300px] max-w-none" />
        ) : (
          <>
            <img src={baiterek} alt="" className="absolute top-[6px] left-[86px] h-[80.64px] w-[24.96px]" />
            <img src={yurt} alt="" className="absolute top-[52px] left-[20px] h-[33.6px] w-[50.4px]" />
            <div className="absolute top-[84px] left-0 h-[4px] w-full bg-ink" />
          </>
        )}
      </div>
      <div className="flex flex-col gap-[2px] px-[14px] py-[10px]">
        <span className="font-body text-[18px] font-bold text-ink">{title}</span>
        <span className="font-body text-[16px] text-ink-soft">{hint}</span>
      </div>
      {selected && <CheckBadge size={16} className="absolute top-[6px] left-[6px]" />}
    </button>
  )
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

function initialHobbies(user: User | null) {
  return (user?.hobbies ?? []).map((h) => h.toUpperCase())
}

// 04 Profile (Figma 159:2285).
export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const update = useUpdateProfile()
  const isLocal = user?.role === 'local'

  const [purpose, setPurpose] = useState<TripPurpose | undefined>(user?.trip_purpose ?? 'leisure')
  const [start, setStart] = useState(user?.trip_start_date ?? '')
  const [end, setEnd] = useState(user?.trip_end_date ?? '')
  const [vibes, setVibes] = useState<Array<'nature' | 'metropolis'>>(() => {
    const v = user?.vibe_preference ?? 'both'
    return v === 'both' ? ['nature', 'metropolis'] : v === 'nature' ? ['nature'] : ['metropolis']
  })
  const [hobbies, setHobbies] = useState<string[]>(() => initialHobbies(user))
  const [languages, setLanguages] = useState<LanguageSkill[]>(user?.languages ?? [])
  const [city, setCity] = useState(user?.city ?? '')
  const [expectations, setExpectations] = useState(user?.expectations ?? '')
  const [error, setError] = useState('')

  // Click cycles a language through NATIVE → FLUENT → A FEW WORDS → off.
  function cycleLanguage(code: string) {
    setLanguages((list) => {
      const current = list.find((l) => l.code === code)
      if (!current) return [...list, { code, level: LEVELS[0].code }]
      const next = LEVELS.findIndex((l) => l.code === current.level) + 1
      if (next >= LEVELS.length) return list.filter((l) => l.code !== code)
      return list.map((l) => (l.code === code ? { ...l, level: LEVELS[next].code } : l))
    })
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    const vibe: Vibe = vibes.length === 1 ? (vibes[0] === 'nature' ? 'nature' : 'megapolis') : 'both'
    try {
      await update.mutateAsync({
        ...(isLocal ? {} : { trip_purpose: purpose, trip_start_date: start || undefined, trip_end_date: end || undefined }),
        vibe_preference: vibe,
        hobbies: hobbies.map((h) => h.toLowerCase()),
        languages,
        city: city.trim() || undefined,
        expectations: expectations.trim() || undefined,
      })
      navigate('/home')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <SceneScreen className="flex-col gap-[28px]" sprites={[{ kind: 'baiterek', x: 1300, width: 83.2 }, { kind: 'yurt', x: 30, width: 115.2 }]}>
      <Panel className="w-full max-w-[1120px] p-[20px] sm:p-[26px]">
        <form onSubmit={save} className="flex flex-col gap-[16px]">
          <h1 className="text-center font-display text-[44px] leading-none text-ink sm:text-[52px]">{isLocal ? 'about you' : 'your trip'}</h1>
          {!user?.is_verified && <StepChips step={3} />}
          <div className="flex flex-col gap-[24px] lg:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
              {!isLocal && (
                <>
                  <div className="flex flex-col gap-[8px]">
                    <p className="label text-ink">PURPOSE OF VISIT</p>
                    <div className="flex flex-wrap gap-[8px]">
                      {PURPOSES.map((p) => (
                        <Chip key={p.value} selected={purpose === p.value} onClick={() => setPurpose(p.value)}>
                          {p.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
                    <Input label="ARRIVAL" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                    <Input label="DEPARTURE" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-[8px]">
                <p className="label text-ink">WHAT PULLS YOU MORE?</p>
                <div className="flex flex-col gap-[14px] sm:flex-row">
                  <VibeCard art="nature" title="nature" hint="Charyn, Kolsay, Burabay" selected={vibes.includes('nature')} onClick={() => setVibes((v) => (v.length === 1 && v[0] === 'nature' ? v : toggle(v, 'nature')))} />
                  <VibeCard art="metropolis" title="metropolis" hint="Astana, Almaty, Shymkent" selected={vibes.includes('metropolis')} onClick={() => setVibes((v) => (v.length === 1 && v[0] === 'metropolis' ? v : toggle(v, 'metropolis')))} />
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-[16px] lg:w-[420px]">
              <div className="flex flex-col gap-[8px]">
                <p className="label text-ink">HOBBIES</p>
                <div className="flex flex-wrap gap-[8px]">
                  {HOBBIES.map((h) => (
                    <Chip key={h} selected={hobbies.includes(h)} onClick={() => setHobbies((list) => toggle(list, h))}>
                      {h}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-[8px]">
                <p className="label text-ink">LANGUAGES</p>
                <div className="flex flex-wrap gap-[8px]">
                  {LANGUAGES.map((l) => {
                    const skill = languages.find((s) => s.code === l.code)
                    return (
                      <Chip key={l.code} selected={!!skill} onClick={() => cycleLanguage(l.code)}>
                        {skill ? `${l.label} · ${levelLabel(skill.level)}` : l.label}
                      </Chip>
                    )
                  })}
                </div>
              </div>
              <Input label="CITY NOW" placeholder="Almaty" value={city} onChange={(e) => setCity(e.target.value)} />
              <Input
                label="WHAT YOU HOPE FOR"
                placeholder="Someone to show me the mountains"
                value={expectations}
                maxLength={240}
                onChange={(e) => setExpectations(e.target.value)}
              />
            </div>
          </div>
          {error && <Notice>{error}</Notice>}
          <div className="flex flex-wrap items-center justify-center gap-[16px]">
            <Button type="submit" loading={update.isPending}>
              save &amp; enter
            </Button>
            <button type="button" onClick={() => navigate('/home')} className="font-body text-[18px] font-bold text-leaf">
              skip for now
            </button>
            <button type="button" onClick={logout} className="font-body text-[18px] font-bold text-danger">
              sign out
            </button>
          </div>
        </form>
      </Panel>
      <AccountSettings />
    </SceneScreen>
  )
}
