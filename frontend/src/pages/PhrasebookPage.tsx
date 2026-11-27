import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppScreen } from '../components/Layout'
import { Chip, Tag } from '../components/ui/Chip'
import { chipClass } from '../components/ui/styles'
import { CheckBadge } from '../components/ui/Icon'
import { Panel } from '../components/ui/Panel'
import { PHRASES, TOPICS, phraseStore, speak, type Phrase, type Topic } from '../features/phrasebook/phrases'
import { cn } from '../lib/cn'
import { useI18n, type TKey } from '../i18n'

type Filter = 'all' | 'favourites' | Topic

// TD/Phrase card (Figma 160:2274).
function PhraseCard({ phrase, learned, onUse }: { phrase: Phrase; learned: boolean; onUse: () => void }) {
  const { t, lang } = useI18n()
  // English speakers see the English cue; Russian and Kazakh speakers see the Russian one.
  const cue = lang === 'en' ? phrase.english : phrase.russian
  const below = lang === 'en' ? phrase.russian : phrase.english
  return (
    <article className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-white p-[16px] shadow-card">
      <div className="flex items-center gap-[8px]">
        <p className="label flex-1 text-leaf">{cue}</p>
        {learned && <CheckBadge size={14} />}
      </div>
      <p className="font-cyr text-[26px] leading-tight text-ink">{phrase.kazakh}</p>
      <p className="font-body text-[18px] font-bold text-link-blue">{phrase.transcription}</p>
      <p className="font-cyr text-[15px] text-ink-soft">{below}</p>
      <div className="flex flex-wrap gap-[8px] pt-[4px]">
        <Link to={`/phrasebook/${phrase.id}`} onClick={onUse} className={chipClass(true)}>
          {t('pb.showLocal')}
        </Link>
        <Chip
          onClick={() => {
            speak(phrase, 'kk')
            onUse()
          }}
          aria-label={t('pb.listenKz')}
        >
          ▶ KZ
        </Chip>
        <Chip
          onClick={() => {
            speak(phrase, 'ru')
            onUse()
          }}
          aria-label={t('pb.listenRu')}
        >
          ▶ RU
        </Chip>
      </div>
    </article>
  )
}

// 06 Phrasebook (Figma 160:2947).
export function PhrasebookPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const { t } = useI18n()
  const [learned, setLearned] = useState<string[]>(phraseStore.learned)

  const markUsed = (id: string) =>
    setLearned((list) => {
      if (list.includes(id)) return list
      const next = [...list, id]
      phraseStore.setLearned(next)
      return next
    })

  const visible = PHRASES.filter((p) =>
    filter === 'all' ? true : filter === 'favourites' ? learned.includes(p.id) : p.topic === filter,
  )
  const progress = Math.round((learned.length / PHRASES.length) * 100)

  return (
    <AppScreen className="flex flex-col gap-[20px] lg:flex-row">
      <Panel className="h-fit w-full gap-[6px] p-[16px] lg:w-[230px]">
        <p className="label text-leaf">{t('pb.topics')}</p>
        <div className="flex flex-wrap gap-[6px] lg:flex-col lg:items-start">
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            {t('pb.all')}
          </Chip>
          <Chip selected={filter === 'favourites'} onClick={() => setFilter('favourites')}>
            {t('pb.favourites')}
          </Chip>
          {TOPICS.map((topic) => (
            <Chip key={topic.value} selected={filter === topic.value} onClick={() => setFilter(topic.value)}>
              {t(`pb.topic.${topic.value}` as TKey)}
            </Chip>
          ))}
        </div>
        <a
          href="tel:112"
          className="label mt-[6px] block w-full rounded-[10px] border-3 border-ink bg-danger-soft p-[8px] text-danger"
          onClick={() => setFilter('emergency')}
        >
          {t('pb.emergency')}
        </a>
      </Panel>
      <Panel className="min-w-0 flex-1 gap-[10px] px-[20px] py-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <div className="flex flex-col gap-[2px]">
            <h1 className="font-display text-[44px] leading-none text-ink">{t('pb.title')}</h1>
            <p className="font-body text-[16px] text-ink-soft">{t('pb.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-[10px]">
            <p className="label text-ink">
              {t('pb.learned', { n: learned.length, total: PHRASES.length })}
            </p>
            <div className="h-[18px] w-[160px] overflow-hidden rounded-[4px] border-3 border-ink bg-white" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-leaf" style={{ width: `${progress}%` }} />
            </div>
            <Tag selected>{t('pb.savedOffline')}</Tag>
          </div>
        </div>
        <div className={cn('grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-[repeat(3,340px)]')}>
          {visible.map((p) => (
            <PhraseCard key={p.id} phrase={p} learned={learned.includes(p.id)} onUse={() => markUsed(p.id)} />
          ))}
          {visible.length === 0 && <p className="font-body text-[18px] text-ink-soft">{t('pb.empty')}</p>}
        </div>
      </Panel>
    </AppScreen>
  )
}
