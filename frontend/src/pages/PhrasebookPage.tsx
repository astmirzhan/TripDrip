import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppScreen } from '../components/Layout'
import { Chip, Tag } from '../components/ui/Chip'
import { chipClass } from '../components/ui/styles'
import { CheckBadge } from '../components/ui/Icon'
import { Panel } from '../components/ui/Panel'
import { PHRASES, TOPICS, phraseStore, speak, type Phrase, type Topic } from '../features/phrasebook/phrases'
import { cn } from '../lib/cn'

type Filter = 'all' | 'favourites' | Topic

// TD/Phrase card (Figma 160:2274).
function PhraseCard({ phrase, learned, onUse }: { phrase: Phrase; learned: boolean; onUse: () => void }) {
  return (
    <article className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-white p-[16px] shadow-card">
      <div className="flex items-center gap-[8px]">
        <p className="label flex-1 text-leaf">{phrase.english}</p>
        {learned && <CheckBadge size={14} />}
      </div>
      <p className="font-cyr text-[26px] leading-tight text-ink">{phrase.kazakh}</p>
      <p className="font-body text-[18px] font-bold text-link-blue">{phrase.transcription}</p>
      <p className="font-cyr text-[15px] text-ink-soft">{phrase.russian}</p>
      <div className="flex flex-wrap gap-[8px] pt-[4px]">
        <Link to={`/phrasebook/${phrase.id}`} onClick={onUse} className={chipClass(true)}>
          SHOW TO A LOCAL
        </Link>
        <Chip
          onClick={() => {
            speak(phrase)
            onUse()
          }}
        >
          LISTEN
        </Chip>
      </div>
    </article>
  )
}

// 06 Phrasebook (Figma 160:2947).
export function PhrasebookPage() {
  const [filter, setFilter] = useState<Filter>('all')
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
        <p className="label text-leaf">TOPICS</p>
        <div className="flex flex-wrap gap-[6px] lg:flex-col lg:items-start">
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            ALL
          </Chip>
          <Chip selected={filter === 'favourites'} onClick={() => setFilter('favourites')}>
            FAVOURITES
          </Chip>
          {TOPICS.map((t) => (
            <Chip key={t.value} selected={filter === t.value} onClick={() => setFilter(t.value)}>
              {t.label}
            </Chip>
          ))}
        </div>
        <a
          href="tel:112"
          className="label mt-[6px] block w-full rounded-[10px] border-3 border-ink bg-danger-soft p-[8px] text-danger"
          onClick={() => setFilter('emergency')}
        >
          EMERGENCY · 112
        </a>
      </Panel>
      <Panel className="min-w-0 flex-1 gap-[10px] px-[20px] py-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <div className="flex flex-col gap-[2px]">
            <h1 className="font-display text-[44px] leading-none text-ink">phrasebook</h1>
            <p className="font-body text-[16px] text-ink-soft">Kazakh + transcription, Russian below. Saved on this device.</p>
          </div>
          <div className="flex flex-wrap items-center gap-[10px]">
            <p className="label text-ink">
              {learned.length}/{PHRASES.length} LEARNED
            </p>
            <div className="h-[18px] w-[160px] overflow-hidden rounded-[4px] border-3 border-ink bg-white" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-leaf" style={{ width: `${progress}%` }} />
            </div>
            <Tag selected>SAVED OFFLINE</Tag>
          </div>
        </div>
        <div className={cn('grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-[repeat(3,340px)]')}>
          {visible.map((p) => (
            <PhraseCard key={p.id} phrase={p} learned={learned.includes(p.id)} onUse={() => markUsed(p.id)} />
          ))}
          {visible.length === 0 && <p className="font-body text-[18px] text-ink-soft">Phrases you use show up here.</p>}
        </div>
      </Panel>
    </AppScreen>
  )
}
