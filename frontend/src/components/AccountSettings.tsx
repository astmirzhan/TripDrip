import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useBlocks, useDeleteAccount, useUnblock } from '../api/hooks'
import { useAuth } from '../auth/AuthContext'
import { avatarFor } from '../lib/avatar'
import { shortDate } from '../lib/data'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
import { Chip } from './ui/Chip'
import { Eyebrow, Notice, Panel } from './ui/Panel'

function BlockedPeople() {
  const blocks = useBlocks()
  const unblock = useUnblock()
  const list = blocks.data ?? []

  return (
    <div className="flex flex-col gap-[10px]">
      <Eyebrow>BLOCKED PEOPLE</Eyebrow>
      <p className="font-body text-[15px] text-ink-soft">You don’t see each other on the map, in Қонақ or in chats.</p>
      {list.map((b) => (
        <div key={b.blocked_id} className="flex items-center gap-[12px] rounded-[12px] border-3 border-ink bg-mist p-[10px]">
          <Avatar variant={avatarFor(b.blocked_id)} size={44} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-display text-[24px] leading-none text-ink">
              {b.first_name} {b.last_name}
            </span>
            <span className="font-body text-[14px] text-ink-soft">blocked {shortDate(b.created_at)}</span>
          </div>
          <Chip disabled={unblock.isPending} onClick={() => unblock.mutate(b.blocked_id)}>
            UNBLOCK
          </Chip>
        </div>
      ))}
      {blocks.isSuccess && list.length === 0 && <p className="font-body text-[15px] text-ink">Nobody is blocked.</p>}
      {(blocks.error || unblock.error) && <Notice>{errorMessage(blocks.error ?? unblock.error)}</Notice>}
    </div>
  )
}

function DeleteAccount() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const remove = useDeleteAccount()
  const [confirming, setConfirming] = useState(false)

  async function onDelete() {
    try {
      await remove.mutateAsync()
      logout()
      navigate('/', { replace: true })
    } catch {
      // Error shown below.
    }
  }

  return (
    <div className="flex flex-col gap-[10px] rounded-[12px] border-3 border-ink bg-danger-soft p-[14px]">
      <p className="label text-danger">DELETE ACCOUNT</p>
      <p className="font-body text-[15px] text-ink">
        Removes your profile, documents, map spot and chats access. Coins and promo codes are lost. This cannot be undone.
      </p>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-[12px]">
          <Button className="bg-danger! text-white!" loading={remove.isPending} onClick={onDelete}>
            yes, delete forever
          </Button>
          <Button variant="secondary" disabled={remove.isPending} onClick={() => setConfirming(false)}>
            keep my account
          </Button>
        </div>
      ) : (
        <button type="button" className="label self-start text-danger underline" onClick={() => setConfirming(true)}>
          DELETE MY ACCOUNT
        </button>
      )}
      {remove.error && <Notice>{errorMessage(remove.error)}</Notice>}
    </div>
  )
}

/** Privacy and account section under the profile form. */
export function AccountSettings() {
  const { user } = useAuth()
  return (
    <Panel className="w-full max-w-[1120px] gap-[16px] p-[20px] sm:p-[26px]">
      <h2 className="font-display text-[36px] leading-none text-ink">privacy &amp; account</h2>
      {user?.is_verified && <BlockedPeople />}
      <DeleteAccount />
    </Panel>
  )
}
