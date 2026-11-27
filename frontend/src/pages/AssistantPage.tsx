import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppScreen } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Chip, Tag } from '../components/ui/Chip'
import { Icon } from '../components/ui/Icon'
import { Eyebrow, Panel } from '../components/ui/Panel'
import { chipClass } from '../components/ui/styles'
import { EMERGENCY, TOPICS, findTopics, type Topic } from '../features/assistant/knowledge'
import { PHRASES, findPhrase } from '../features/phrasebook/phrases'
import { useOnline } from '../lib/online'

interface Turn {
  question: string
  answer: Topic | null
  others: Topic[]
}

function Answer({ topic }: { topic: Topic }) {
  const phrase = topic.phraseId ? findPhrase(topic.phraseId) : undefined
  const say = phrase ? { kazakh: phrase.kazakh, transcription: phrase.transcription, english: phrase.english } : topic.say

  return (
    <div className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-white p-[16px] shadow-card">
      <Eyebrow>{topic.title.toUpperCase()} · DO THIS, IN ORDER</Eyebrow>
      {topic.steps.map((step, i) => (
        <p key={i} className="font-body text-[17px] text-ink">
          {i + 1}. {step}
        </p>
      ))}
      {say && (
        <div className="flex flex-wrap items-center gap-[12px] rounded-[10px] border-3 border-ink bg-cream p-[12px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <p lang="kk" className="font-cyr text-[22px] text-ink">
              {say.kazakh}
            </p>
            <p className="font-body text-[15px] font-bold text-link-blue">
              {say.transcription} · {say.english}
            </p>
          </div>
          {phrase && (
            <Link to={`/phrasebook/${phrase.id}`} className={chipClass(true)}>
              SHOW TO A LOCAL
            </Link>
          )}
        </div>
      )}
      {topic.call && (
        <div className="flex flex-wrap gap-[8px]">
          {topic.call.map((c) => (
            <a key={c.number} href={`tel:${c.number}`} className={chipClass(true)}>
              CALL {c.number} · {c.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// 16 Offline mode (Figma 184:9326): assistant that runs fully on the device.
export function AssistantPage() {
  const online = useOnline()
  const [query, setQuery] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])

  function ask(question: string) {
    const q = question.trim()
    if (!q) return
    const [answer, ...others] = findTopics(q)
    setTurns((t) => [{ question: q, answer: answer ?? null, others }, ...t].slice(0, 5))
    setQuery('')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    ask(query)
  }

  return (
    <AppScreen className="flex flex-col gap-[24px] lg:flex-row lg:items-start">
      <Panel className="min-w-0 flex-1 gap-[12px] p-[20px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <div className="flex flex-col gap-[2px]">
            <Eyebrow>WORKS IN AIRPLANE MODE</Eyebrow>
            <h1 className="font-display text-[44px] leading-none text-ink">ask the assistant</h1>
          </div>
          <Tag selected>ON THIS DEVICE</Tag>
        </div>
        <div className="flex flex-wrap gap-[6px]">
          {TOPICS.filter((t) => t.chip).map((t) => (
            <Chip key={t.id} onClick={() => ask(t.title)}>
              {t.chip}
            </Chip>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex items-end gap-[12px]">
          <label htmlFor="ask" className="sr-only">
            Question
          </label>
          <input
            id="ask"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Money, transport, safety… also in Russian"
            className="min-w-0 flex-1 rounded-[10px] border-3 border-ink bg-mist px-[14px] py-[12px] font-body text-[17px] text-ink placeholder:text-ink-soft focus:outline-none focus-visible:outline-3 focus-visible:outline-link-blue sm:text-[20px]"
          />
          <Button type="submit" className="px-[18px]! sm:px-[36px]!" disabled={!query.trim()}>
            ask
          </Button>
        </form>

        {turns.length === 0 && (
          <p className="font-body text-[16px] text-ink-soft">Pick a topic or type a question. Answers come from a guide saved in the app, no internet needed.</p>
        )}
        {turns.map((turn, i) => (
          <div key={`${turn.question}-${turns.length - i}`} className="flex flex-col gap-[10px]">
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-[12px] border-3 border-ink bg-yellow px-[14px] py-[10px] font-body text-[18px] text-ink shadow-[0_3px_0_0_#2e1b5b]">
                {turn.question}
              </p>
            </div>
            {turn.answer ? (
              <Answer topic={turn.answer} />
            ) : (
              <div className="rounded-[12px] border-3 border-ink bg-white p-[14px] font-body text-[16px] text-ink">
                I don’t have that offline yet. Try a topic above, call 112 in an emergency, or ask a local in <span className="font-cyr">Қонақ</span>{' '}
                when you are online.
              </div>
            )}
            {turn.others.length > 0 && (
              <div className="flex flex-wrap items-center gap-[6px]">
                <span className="font-body text-[14px] text-ink-soft">Also:</span>
                {turn.others.map((o) => (
                  <Chip key={o.id} onClick={() => ask(o.title)}>
                    {o.title.toUpperCase()}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        ))}
        <p className="font-body text-[13px] text-ink-soft">General guidance for travellers. Check official sources when you are online.</p>
      </Panel>

      <div className="flex w-full flex-col gap-[24px] lg:w-[420px] lg:shrink-0">
        <Panel className="gap-[12px] bg-danger-soft! p-[20px]">
          <div className="flex items-center justify-between gap-[10px]">
            <div className="flex flex-col">
              <Eyebrow className="text-danger">EMERGENCY</Eyebrow>
              <span className="font-display text-[72px] leading-none text-danger">112</span>
            </div>
            <a href="tel:112" className={buttonLike}>
              call 112
            </a>
          </div>
          <div className="flex gap-[8px]">
            {EMERGENCY.slice(1).map((e) => (
              <a key={e.number} href={`tel:${e.number}`} className="flex min-w-0 flex-1 flex-col items-center rounded-[10px] border-3 border-ink bg-white p-[8px]">
                <span className="font-display text-[30px] leading-none text-ink">{e.number}</span>
                <span className="font-body text-[11px] font-bold tracking-[0.66px] text-ink-soft">{e.label}</span>
              </a>
            ))}
          </div>
        </Panel>

        <Panel className="gap-[10px] p-[20px]">
          <Eyebrow>SAVED ON THIS DEVICE</Eyebrow>
          {[
            ['Phrasebook', `${PHRASES.length} phrases · Kazakh + Russian`],
            ['Emergency guide', 'passport, injury, mountains, police'],
            ['Travel tips', `${TOPICS.length} topics: money, SIM, taxi, transport`],
            ['Your QR codes', 'promo codes and guest card'],
          ].map(([title, hint]) => (
            <div key={title} className="flex items-center gap-[10px]">
              <span className="flex shrink-0 rounded-[6px] border-3 border-ink bg-yellow p-[2px]">
                <Icon name="check" size={16} />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="font-body text-[17px] font-bold text-ink">{title}</span>
                <span className="font-body text-[14px] text-ink-soft">{hint}</span>
              </div>
            </div>
          ))}
          <p className="font-body text-[14px] text-ink-soft">
            {online ? 'Online now. Open this page once and it keeps working without signal.' : 'Offline. Everything above still works.'}
          </p>
        </Panel>
      </div>
    </AppScreen>
  )
}

const buttonLike =
  'inline-flex items-center justify-center rounded-[12px] border-4 border-ink bg-yellow px-[24px] pt-[10px] pb-[12px] font-display text-[30px] leading-none text-ink shadow-button active:translate-y-[4px] active:shadow-button-pressed'
