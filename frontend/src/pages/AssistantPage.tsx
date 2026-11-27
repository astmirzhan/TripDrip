import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppScreen } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Chip, Tag } from '../components/ui/Chip'
import { Icon } from '../components/ui/Icon'
import { Eyebrow, Panel } from '../components/ui/Panel'
import { chipClass } from '../components/ui/styles'
import { EMERGENCY, TOPICS, findTopics, topicText, type Topic } from '../features/assistant/knowledge'
import { PHRASES, findPhrase } from '../features/phrasebook/phrases'
import { useOnline } from '../lib/online'
import { useI18n, type TKey } from '../i18n'

interface Turn {
  question: string
  answer: Topic | null
  others: Topic[]
}

function Answer({ topic }: { topic: Topic }) {
  const phrase = topic.phraseId ? findPhrase(topic.phraseId) : undefined
  const { t, lang } = useI18n()
  const text = topicText(topic, lang)
  const cue = (english: string) => (lang === 'en' || !phrase ? english : phrase.russian)
  const say = phrase ? { kazakh: phrase.kazakh, transcription: phrase.transcription, english: phrase.english } : topic.say

  return (
    <div className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-white p-[16px] shadow-card">
      <Eyebrow>
        {text.title} · {t('sos.doThis')}
      </Eyebrow>
      {text.steps.map((step, i) => (
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
              {say.transcription} · {cue(say.english)}
            </p>
          </div>
          {phrase && (
            <Link to={`/phrasebook/${phrase.id}`} className={chipClass(true)}>
              {t('pb.showLocal')}
            </Link>
          )}
        </div>
      )}
      {topic.call && (
        <div className="flex flex-wrap gap-[8px]">
          {topic.call.map((c) => (
            <a key={c.number} href={`tel:${c.number}`} className={chipClass(true)}>
              {t('sos.call', { number: c.number, label: t(`sos.n${c.number}` as TKey) })}
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
  const { t, lang } = useI18n()

  function ask(question: string) {
    const q = question.trim()
    if (!q) return
    const [answer, ...others] = findTopics(q)
    setTurns((list) => [{ question: q, answer: answer ?? null, others }, ...list].slice(0, 5))
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
            <Eyebrow>{t('sos.airplane')}</Eyebrow>
            <h1 className="font-display text-[44px] leading-none text-ink">{t('sos.title')}</h1>
          </div>
          <Tag selected>{t('sos.onDevice')}</Tag>
        </div>
        <div className="flex flex-wrap gap-[6px]">
          {TOPICS.filter((topic) => topic.chip).map((topic) => (
            <Chip key={topic.id} onClick={() => ask(topicText(topic, lang).title)}>
              {topicText(topic, lang).chip}
            </Chip>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex items-end gap-[12px]">
          <label htmlFor="ask" className="sr-only">
            {t('sos.question')}
          </label>
          <input
            id="ask"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('sos.placeholder')}
            className="min-w-0 flex-1 rounded-[10px] border-3 border-ink bg-mist px-[14px] py-[12px] font-body text-[17px] text-ink placeholder:text-ink-soft focus:outline-none focus-visible:outline-3 focus-visible:outline-link-blue sm:text-[20px]"
          />
          <Button type="submit" className="px-[18px]! sm:px-[36px]!" disabled={!query.trim()}>
            {t('sos.ask')}
          </Button>
        </form>

        {turns.length === 0 && (
          <p className="font-body text-[16px] text-ink-soft">{t('sos.intro')}</p>
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
                {t('sos.noAnswer')}
              </div>
            )}
            {turn.others.length > 0 && (
              <div className="flex flex-wrap items-center gap-[6px]">
                <span className="font-body text-[14px] text-ink-soft">{t('sos.also')}</span>
                {turn.others.map((o) => (
                  <Chip key={o.id} onClick={() => ask(topicText(o, lang).title)}>
                    {topicText(o, lang).title}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        ))}
        <p className="font-body text-[13px] text-ink-soft">{t('sos.disclaimer')}</p>
      </Panel>

      <div className="flex w-full flex-col gap-[24px] lg:w-[420px] lg:shrink-0">
        <Panel className="gap-[12px] bg-danger-soft! p-[20px]">
          <div className="flex items-center justify-between gap-[10px]">
            <div className="flex flex-col">
              <Eyebrow className="text-danger">{t('sos.emergency')}</Eyebrow>
              <span className="font-display text-[72px] leading-none text-danger">112</span>
            </div>
            <a href="tel:112" className={buttonLike}>
              {t('sos.call112')}
            </a>
          </div>
          <div className="flex gap-[8px]">
            {EMERGENCY.slice(1).map((e) => (
              <a key={e.number} href={`tel:${e.number}`} className="flex min-w-0 flex-1 flex-col items-center rounded-[10px] border-3 border-ink bg-white p-[8px]">
                <span className="font-display text-[30px] leading-none text-ink">{e.number}</span>
                <span className="font-body text-[11px] font-bold tracking-[0.66px] text-ink-soft uppercase">{t(`sos.n${e.number}` as TKey)}</span>
              </a>
            ))}
          </div>
        </Panel>

        <Panel className="gap-[10px] p-[20px]">
          <Eyebrow>{t('sos.saved')}</Eyebrow>
          {[
            [t('sos.savedPhrasebook'), t('sos.savedPhrasebookHint', { n: PHRASES.length })],
            [t('sos.savedGuide'), t('sos.savedGuideHint')],
            [t('sos.savedTips'), t('sos.savedTipsHint', { n: TOPICS.length })],
            [t('sos.savedCodes'), t('sos.savedCodesHint')],
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
            {online ? t('sos.online') : t('sos.offlineNow')}
          </p>
        </Panel>
      </div>
    </AppScreen>
  )
}

const buttonLike =
  'inline-flex items-center justify-center rounded-[12px] border-4 border-ink bg-yellow px-[24px] pt-[10px] pb-[12px] font-display text-[30px] leading-none text-ink shadow-button active:translate-y-[4px] active:shadow-button-pressed'
