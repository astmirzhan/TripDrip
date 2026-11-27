import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useBlocks, useDeleteAccount, useUnblock } from '../api/hooks'
import { useAuth } from '../auth/AuthContext'
import { avatarFor } from '../lib/avatar'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
import { Chip } from './ui/Chip'
import { Eyebrow, Notice, Panel } from './ui/Panel'
import { useI18n } from '../i18n'

function BlockedPeople() {
  const blocks = useBlocks()
  const unblock = useUnblock()
  const { t, locale } = useI18n()
  const list = blocks.data ?? []

  return (
    <div className="flex flex-col gap-[10px]">
      <Eyebrow>{t('account.blocked')}</Eyebrow>
      <p className="font-body text-[15px] text-ink-soft">{t('account.blockedHint')}</p>
      {list.map((b) => (
        <div key={b.blocked_id} className="flex items-center gap-[12px] rounded-[12px] border-3 border-ink bg-mist p-[10px]">
          <Avatar variant={avatarFor(b.blocked_id)} size={44} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-display text-[24px] leading-none text-ink">
              {b.first_name} {b.last_name}
            </span>
            <span className="font-body text-[14px] text-ink-soft">{t('account.blockedOn', { date: new Date(b.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}</span>
          </div>
          <Chip disabled={unblock.isPending} onClick={() => unblock.mutate(b.blocked_id)}>
            {t('account.unblock')}
          </Chip>
        </div>
      ))}
      {blocks.isSuccess && list.length === 0 && <p className="font-body text-[15px] text-ink">{t('account.nobody')}</p>}
      {(blocks.error || unblock.error) && <Notice>{errorMessage(blocks.error ?? unblock.error)}</Notice>}
    </div>
  )
}

function DeleteAccount() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const remove = useDeleteAccount()
  const [confirming, setConfirming] = useState(false)
  const { t } = useI18n()

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
      <p className="label text-danger">{t('account.delete')}</p>
      <p className="font-body text-[15px] text-ink">
        {t('account.deleteText')}
      </p>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-[12px]">
          <Button className="bg-danger! text-white!" loading={remove.isPending} onClick={onDelete}>
            {t('account.deleteConfirm')}
          </Button>
          <Button variant="secondary" disabled={remove.isPending} onClick={() => setConfirming(false)}>
            {t('account.keep')}
          </Button>
        </div>
      ) : (
        <button type="button" className="label self-start text-danger underline" onClick={() => setConfirming(true)}>
          {t('account.deleteLink')}
        </button>
      )}
      {remove.error && <Notice>{errorMessage(remove.error)}</Notice>}
    </div>
  )
}

/** Privacy and account section under the profile form. */
export function AccountSettings() {
  const { user } = useAuth()
  const { t } = useI18n()
  return (
    <Panel className="w-full max-w-[1120px] gap-[16px] p-[20px] sm:p-[26px]">
      <h2 className="font-display text-[36px] leading-none text-ink">{t('account.title')}</h2>
      {user?.is_verified && <BlockedPeople />}
      <DeleteAccount />
    </Panel>
  )
}
