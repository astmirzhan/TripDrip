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
import { shortDate } from '../lib/data'

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

function timeLabel(value: string) {
  const d = new Date(value)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const days = (now.getTime() - d.getTime()) / 86_400_000
  if (days < 6) return d.toLocaleDateString('en', { weekday: 'short' })
  return shortDate(d)
}

const contextLabel = (chat: ChatSummary) => (chat.context_type === 'qonaq' ? 'ҚОНАҚ' : 'HELLO')

function ChatRow({ chat, myId, active, unread }: { chat: ChatSummary; myId: string; active: boolean; unread: boolean }) {
  const o = other(chat, myId)
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
          <span className="shrink-0 font-body text-[14px] text-ink-soft">{timeLabel(chat.last_message_at)}</span>
        </div>
        <span className={cn('text-[12px] font-bold tracking-[0.6px] text-leaf', chat.context_type === 'qonaq' ? 'font-cyr' : 'font-body')}>
          {contextLabel(chat)}
        </span>
        <span className="truncate font-body text-[15px] text-ink-soft">{chat.last_message || 'Say hello 👋'}</span>
      </div>
      {unread && <span className="size-[14px] shrink-0 rounded-[3px] border-3 border-ink bg-yellow" aria-label="New messages" />}
    </Link>
  )
}

function RequestRow({ req, myId }: { req: NetworkRequestRow; myId: string }) {
  const navigate = useNavigate()
  const respond = useRespondNetwork()
  const incoming = req.receiver_id === myId
  const name = incoming ? req.sender_first_name : req.receiver_first_name
  const personId = incoming ? req.sender_id : req.receiver_id

  return (
    <div className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-mist p-[12px]">
      <div className="flex items-center gap-[10px]">
        <Avatar variant={avatarFor(personId)} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[24px] leading-none text-ink">{name}</p>
          <p className="font-body text-[14px] text-ink-soft">{incoming ? 'wants to say hello' : 'waiting for an answer'}</p>
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
            ACCEPT
          </Chip>
          <Chip disabled={respond.isPending} onClick={() => respond.mutate({ requestId: req.id, decision: 'declined' })}>
            DECLINE
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

  return (
    <Panel className="h-fit w-full gap-[12px] p-[20px] lg:w-[430px] lg:shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-[8px]">
        <h1 className="font-display text-[44px] leading-none text-ink">chats</h1>
        <div className="flex gap-[6px]">
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            ALL
          </Chip>
          <Chip cyr selected={filter === 'qonaq'} onClick={() => setFilter('qonaq')}>
            ҚОНАҚ
          </Chip>
          <Chip selected={filter === 'networking'} onClick={() => setFilter('networking')}>
            HELLO
          </Chip>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          <Eyebrow>REQUESTS · {pending.length}</Eyebrow>
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
          No chats yet. They open when a local accepts your <span className="font-cyr">Қонақ</span> request or someone accepts your hello.
        </p>
      )}
      <p className="font-body text-[15px] text-ink-soft">Chats open after both people agree. Phone numbers stay hidden.</p>
    </Panel>
  )
}

function QonaqActions({ requestId }: { requestId: string }) {
  const confirm = useConfirmQonaq()
  const review = useReviewQonaq()
  const [rating, setRating] = useState(0)

  return (
    <div className="flex flex-col gap-[8px] rounded-[10px] border-3 border-ink bg-mint p-[10px]">
      {!confirm.isSuccess ? (
        <div className="flex flex-wrap items-center justify-between gap-[8px]">
          <p className="font-body text-[15px] text-ink">Met up already? Both of you confirm, and the local gets +30 coins.</p>
          <Button variant="secondary" className="px-[20px] text-[24px]" loading={confirm.isPending} onClick={() => confirm.mutate(requestId)}>
            mark done
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-[8px]">
          <p className="font-body text-[15px] text-ink">{review.isSuccess ? 'Thanks for the review!' : 'Confirmed. Rate the meeting:'}</p>
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
          <p className="font-body text-[15px] text-ink-soft">since {shortDate(chat.created_at)}</p>
        </div>
        <Tag selected cyr={chat.context_type === 'qonaq'}>
          {chat.context_type === 'qonaq' ? 'ҚОНАҚ' : 'HELLO'}
        </Tag>
      </div>

      {chat.context_type === 'qonaq' && chat.help_request_id && <QonaqActions requestId={chat.help_request_id} />}

      <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto pr-[4px]">
        {messages.isPending && <p className="font-body text-[16px] text-ink-soft">Loading…</p>}
        {messages.isSuccess && list.length === 0 && (
          <p className="m-auto text-center font-body text-[18px] text-ink-soft">No messages yet. Say hello to {o.firstName}!</p>
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
                  <p className="font-body text-[12px] font-bold text-danger">⚠ Looks like a price or ad. Қонақ help is free.</p>
                )}
                <p className={cn('font-body text-[12px] text-ink-soft', mine ? 'text-right' : 'text-left')}>{timeLabel(m.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      <div className="flex items-center gap-[10px] rounded-[10px] border-3 border-ink bg-cream p-[10px]">
        <Icon name="lock" size={20} />
        <p className="flex-1 font-body text-[15px] text-ink">
          <span className="font-cyr">Қонақ</span> help is always free. Asked for money? Tap REPORT and we hide the chat.
        </p>
      </div>

      <form onSubmit={onSend} className="flex items-end gap-[12px]">
        <label className="sr-only" htmlFor="message">
          Message
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
          placeholder="Message…"
          className="min-w-0 flex-1 resize-none rounded-[10px] border-3 border-ink bg-mist px-[14px] py-[12px] font-body text-[17px] leading-[1.35] text-ink placeholder:text-ink-soft sm:px-[16px] sm:text-[20px] focus:outline-none focus-visible:outline-3 focus-visible:outline-link-blue"
        />
        <Button type="submit" className="px-[18px]! sm:px-[36px]!" loading={send.isPending} disabled={!text.trim()}>
          send
        </Button>
      </form>
      {send.error && <Notice>{errorMessage(send.error)}</Notice>}

      {reporting && (
        <div className="flex flex-wrap gap-[6px]">
          {['ASKED FOR MONEY', 'SPAM', 'RUDE'].map((reason) => (
            <Chip
              key={reason}
              disabled={report.isPending}
              onClick={() => report.mutate({ target_user_id: o.id, reason: reason.toLowerCase() }, { onSuccess: () => setReporting(false) })}
            >
              {reason}
            </Chip>
          ))}
        </div>
      )}
      {report.isSuccess && <Notice tone="ok">Thanks, a moderator will look at it.</Notice>}
      <div className="flex gap-[16px]">
        <button type="button" className="label text-danger" onClick={() => setReporting((v) => !v)}>
          REPORT
        </button>
        <button
          type="button"
          className="label text-danger"
          disabled={block.isPending}
          onClick={() => block.mutate(o.id, { onSuccess: () => navigate('/chats') })}
        >
          BLOCK
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
          <p className="font-display text-[36px] leading-none text-ink">{chatId && chats.isSuccess ? 'chat not found' : 'pick a chat'}</p>
          <p className="font-body text-[16px] text-ink-soft">Your conversations with locals and guests show up here.</p>
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
