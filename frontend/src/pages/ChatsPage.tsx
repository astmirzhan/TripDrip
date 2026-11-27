import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { errorMessage } from '../api/client'
import {
  useBlock,
  useChats,
  useConfirmQonaq,
  useMessages,
  useNetworkRequests,
  useReport,
  useRespondNetwork,
  useReviewQonaq,
  useSendMessage,
} from '../api/hooks'
import type { ChatSummary, NetworkRequestRow } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AppScreen } from '../components/Layout'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Chip, Tag } from '../components/ui/Chip'
import { Icon } from '../components/ui/Icon'
import { Eyebrow, Notice, Panel } from '../components/ui/Panel'
import { chipClass } from '../components/ui/styles'
import { VerifyGate } from '../components/VerifyGate'
import { avatarFor } from '../lib/avatar'
import { cn } from '../lib/cn'
import { useI18n, type T, type TKey } from '../i18n'
import { dateText } from '../lib/labels'

type Filter = 'all' | 'qonaq' | 'networking'
const READ_KEY = 'tripdrip.chats.read'

const readMarks = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function markRead(chatId: string, at: string) {
  const marks = readMarks()
  marks[chatId] = at
  localStorage.setItem(READ_KEY, JSON.stringify(marks))
}

function other(chat: ChatSummary, myId: string) {
  const first = chat.user1_id === myId
  return {
    id: first ? chat.user2_id : chat.user1_id,
    firstName: first ? chat.user2_first_name : chat.user1_first_name,
    lastName: first ? chat.user2_last_name : chat.user1_last_name,
  }
}

function timeLabel(value: string, locale: string) {
  const d = new Date(value)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
  const days = (now.getTime() - d.getTime()) / 86_400_000
  if (days < 6) return d.toLocaleDateString(locale, { weekday: 'short' })
  return dateText(locale, d)
}

const contextLabel = (chat: ChatSummary, t: T) => (chat.context_type === 'qonaq' ? 'ҚОНАҚ' : t('chat.hello').toUpperCase())

function ChatRow({ chat, myId, active, unread }: { chat: ChatSummary; myId: string; active: boolean; unread: boolean }) {
  const o = other(chat, myId)
  const { t, locale } = useI18n()
  return (
    <Link
      to={`/chats/${chat.id}`}
      className={cn(
        'flex w-full items-center gap-[12px] rounded-[12px] border-ink p-[12px] text-left',
        active ? 'border-4 bg-cream shadow-card' : 'border-3 bg-white',
      )}
    >
      <Avatar variant={avatarFor(o.id)} size={56} />
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <div className="flex items-center justify-between gap-[8px]">
          <span className="truncate font-display text-[30px] leading-none text-ink">{o.firstName}</span>
          <span className="shrink-0 font-body text-[14px] text-ink-soft">{timeLabel(chat.last_message_at, locale)}</span>
        </div>
        <span className={cn('text-[12px] font-bold tracking-[0.6px] text-leaf', chat.context_type === 'qonaq' ? 'font-cyr' : 'font-body')}>
          {contextLabel(chat, t)}
        </span>
        <span className="truncate font-body text-[15px] text-ink-soft">{chat.last_message || t('chat.sayHello')}</span>
      </div>
      {unread && <span className="size-[14px] shrink-0 rounded-[3px] border-3 border-ink bg-yellow" aria-label={t('chat.newMessages')} />}
    </Link>
  )
}

function RequestRow({ req, myId }: { req: NetworkRequestRow; myId: string }) {
  const navigate = useNavigate()
  const respond = useRespondNetwork()
  const incoming = req.receiver_id === myId
  const name = incoming ? req.sender_first_name : req.receiver_first_name
  const personId = incoming ? req.sender_id : req.receiver_id
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-mist p-[12px]">
      <div className="flex items-center gap-[10px]">
        <Avatar variant={avatarFor(personId)} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[24px] leading-none text-ink">{name}</p>
          <p className="font-body text-[14px] text-ink-soft">{incoming ? t('chat.wantsHello') : t('chat.waiting')}</p>
        </div>
      </div>
      {req.intro_message && <p className="font-body text-[15px] text-ink">“{req.intro_message}”</p>}
      {incoming && (
        <div className="flex flex-wrap gap-[8px]">
          <Chip
            selected
            disabled={respond.isPending}
            onClick={() =>
              respond.mutate(
                { requestId: req.id, decision: 'accepted' },
                { onSuccess: (res) => res.chat && navigate(`/chats/${res.chat.id}`) },
              )
            }
          >
            {t('chat.accept')}
          </Chip>
          <Chip disabled={respond.isPending} onClick={() => respond.mutate({ requestId: req.id, decision: 'declined' })}>
            {t('chat.decline')}
          </Chip>
        </div>
      )}
      {respond.error && <Notice>{errorMessage(respond.error)}</Notice>}
    </div>
  )
}

function ChatList({ chats, activeId, myId }: { chats: ChatSummary[]; activeId?: string; myId: string }) {
  const [filter, setFilter] = useState<Filter>('all')
  const requests = useNetworkRequests()
  const marks = readMarks()
  const pending = (requests.data ?? []).filter((r) => r.status === 'pending')
  const visible = chats.filter((c) => filter === 'all' || c.context_type === filter)
  const { t } = useI18n()

  return (
    <Panel className="h-fit w-full gap-[12px] p-[20px] lg:w-[430px] lg:shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-[8px]">
        <h1 className="font-display text-[44px] leading-none text-ink">{t('chat.title')}</h1>
        <div className="flex gap-[6px]">
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            {t('pb.all')}
          </Chip>
          <Chip cyr selected={filter === 'qonaq'} onClick={() => setFilter('qonaq')}>
            ҚОНАҚ
          </Chip>
          <Chip selected={filter === 'networking'} onClick={() => setFilter('networking')}>
            {t('chat.hello')}
          </Chip>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          <Eyebrow>{t('chat.requests', { n: pending.length })}</Eyebrow>
          {pending.map((r) => (
            <RequestRow key={r.id} req={r} myId={myId} />
          ))}
        </div>
      )}

      {visible.map((c) => (
        <ChatRow
          key={c.id}
          chat={c}
          myId={myId}
          active={c.id === activeId}
          unread={c.id !== activeId && !!c.last_message && (!marks[c.id] || marks[c.id] < c.last_message_at)}
        />
      ))}
      {visible.length === 0 && (
        <p className="font-body text-[16px] text-ink-soft">
          {t('chat.none')}
        </p>
      )}
      <p className="font-body text-[15px] text-ink-soft">{t('chat.agree')}</p>
    </Panel>
  )
}

function QonaqActions({ requestId }: { requestId: string }) {
  const confirm = useConfirmQonaq()
  const review = useReviewQonaq()
  const [rating, setRating] = useState(0)
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-[8px] rounded-[10px] border-3 border-ink bg-mint p-[10px]">
      {!confirm.isSuccess ? (
        <div className="flex flex-wrap items-center justify-between gap-[8px]">
          <p className="font-body text-[15px] text-ink">{t('chat.metUp')}</p>
          <Button variant="secondary" className="px-[20px] text-[24px]" loading={confirm.isPending} onClick={() => confirm.mutate(requestId)}>
            {t('status.markDone')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-[8px]">
          <p className="font-body text-[15px] text-ink">{review.isSuccess ? t('chat.reviewThanks') : t('chat.rate')}</p>
          {!review.isSuccess &&
            [1, 2, 3, 4, 5].map((n) => (
              <Chip
                key={n}
                selected={rating >= n}
                disabled={review.isPending}
                onClick={() => {
                  setRating(n)
                  review.mutate({ requestId, rating: n })
                }}
              >
                {n}★
              </Chip>
            ))}
        </div>
      )}
      {(confirm.error || review.error) && <Notice>{errorMessage(confirm.error ?? review.error)}</Notice>}
    </div>
  )
}

function Conversation({ chat, myId }: { chat: ChatSummary; myId: string }) {
  const navigate = useNavigate()
  const messages = useMessages(chat.id)
  const send = useSendMessage(chat.id)
  const report = useReport()
  const block = useBlock()
  const [text, setText] = useState('')
  const [reporting, setReporting] = useState(false)
  const { t, locale } = useI18n()
  const bottom = useRef<HTMLDivElement>(null)
  const o = other(chat, myId)
  const list = useMemo(() => messages.data ?? [], [messages.data])
  const lastAt = list.length ? list[list.length - 1].created_at : chat.last_message_at

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
    markRead(chat.id, lastAt)
  }, [chat.id, lastAt])

  async function onSend(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    try {
      await send.mutateAsync(body)
      setText('')
    } catch {
      // Error is shown below the composer.
    }
  }

  return (
    <Panel className="min-h-[560px] min-w-0 flex-1 gap-[12px] p-[16px] sm:p-[20px] lg:h-[664px]">
      <div className="flex flex-wrap items-center gap-[12px]">
        <Link to="/chats" className={cn(chipClass(false), 'lg:hidden')}>
          ←
        </Link>
        <Avatar variant={avatarFor(o.id)} size={56} />
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <p className="truncate font-display text-[34px] leading-none text-ink">
            {o.firstName} {o.lastName}
          </p>
          <p className="font-body text-[15px] text-ink-soft">{t('chat.since', { date: dateText(locale, chat.created_at) })}</p>
        </div>
        <Tag selected cyr={chat.context_type === 'qonaq'}>
          {contextLabel(chat, t)}
        </Tag>
      </div>

      {chat.context_type === 'qonaq' && chat.help_request_id && <QonaqActions requestId={chat.help_request_id} />}

      <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto pr-[4px]">
        {messages.isPending && <p className="font-body text-[16px] text-ink-soft">{t('chat.loading')}</p>}
        {messages.isSuccess && list.length === 0 && (
          <p className="m-auto text-center font-body text-[18px] text-ink-soft">{t('chat.empty', { name: o.firstName })}</p>
        )}
        {list.map((m) => {
          const mine = m.sender_id === myId
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'flex max-w-[78%] flex-col gap-[4px] rounded-[12px] border-3 border-ink px-[14px] py-[10px] shadow-[0_3px_0_0_#2e1b5b]',
                  mine ? 'bg-yellow' : 'bg-white',
                )}
              >
                <p className="font-body text-[18px] break-words whitespace-pre-wrap text-ink">{m.body}</p>
                {m.flagged_commercial && (
                  <p className="font-body text-[12px] font-bold text-danger">{t('chat.flagged')}</p>
                )}
                <p className={cn('font-body text-[12px] text-ink-soft', mine ? 'text-right' : 'text-left')}>{timeLabel(m.created_at, locale)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      <div className="flex items-center gap-[10px] rounded-[10px] border-3 border-ink bg-cream p-[10px]">
        <Icon name="lock" size={20} />
        <p className="flex-1 font-body text-[15px] text-ink">
          {t('chat.free')}
        </p>
      </div>

      <form onSubmit={onSend} className="flex items-end gap-[12px]">
        <label className="sr-only" htmlFor="message">
          {t('chat.message')}
        </label>
        <textarea
          id="message"
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void onSend(e)
            }
          }}
          placeholder={t('chat.placeholder')}
          className="min-w-0 flex-1 resize-none rounded-[10px] border-3 border-ink bg-mist px-[14px] py-[12px] font-body text-[17px] leading-[1.35] text-ink placeholder:text-ink-soft sm:px-[16px] sm:text-[20px] focus:outline-none focus-visible:outline-3 focus-visible:outline-link-blue"
        />
        <Button type="submit" className="px-[18px]! sm:px-[36px]!" loading={send.isPending} disabled={!text.trim()}>
          {t('chat.send')}
        </Button>
      </form>
      {send.error && <Notice>{errorMessage(send.error)}</Notice>}

      {reporting && (
        <div className="flex flex-wrap gap-[6px]">
          {['asked for money', 'spam', 'rude'].map((reason) => (
            <Chip
              key={reason}
              disabled={report.isPending}
              onClick={() => report.mutate({ target_user_id: o.id, reason }, { onSuccess: () => setReporting(false) })}
            >
              {t(`report.${reason}` as TKey)}
            </Chip>
          ))}
        </div>
      )}
      {report.isSuccess && <Notice tone="ok">{t('report.thanks')}</Notice>}
      <div className="flex gap-[16px]">
        <button type="button" className="label text-danger" onClick={() => setReporting((v) => !v)}>
          {t('report.report')}
        </button>
        <button
          type="button"
          className="label text-danger"
          disabled={block.isPending}
          onClick={() => block.mutate(o.id, { onSuccess: () => navigate('/chats') })}
        >
          {t('report.block')}
        </button>
      </div>
    </Panel>
  )
}

function ChatsScreen() {
  const { chatId } = useParams()
  const { user } = useAuth()
  const chats = useChats()
  const myId = user?.id ?? ''
  const active = (chats.data ?? []).find((c) => c.id === chatId)
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-[30px] lg:flex-row lg:items-start">
      <div className={cn('w-full lg:w-auto', chatId && 'hidden lg:block')}>
        <ChatList chats={chats.data ?? []} activeId={chatId} myId={myId} />
        {chats.error && <Notice className="mt-[12px]">{errorMessage(chats.error)}</Notice>}
      </div>
      {active ? (
        <Conversation key={active.id} chat={active} myId={myId} />
      ) : (
        <Panel className="hidden min-h-[400px] flex-1 items-center justify-center gap-[10px] p-[20px] text-center lg:flex">
          <p className="font-display text-[36px] leading-none text-ink">{chatId && chats.isSuccess ? t('chat.notFound') : t('chat.pick')}</p>
          <p className="font-body text-[16px] text-ink-soft">{t('chat.showUp')}</p>
        </Panel>
      )}
    </div>
  )
}

// 13 Chats (Figma 184:7778).
export function ChatsPage() {
  return (
    <AppScreen>
      <VerifyGate>
        <ChatsScreen />
      </VerifyGate>
    </AppScreen>
  )
}
