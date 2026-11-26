import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ButtonLink } from './ui/Button'
import { Icon } from './ui/Icon'
import { Panel } from './ui/Panel'

/** Қонақ, map and routes need a verified account (backend RequireVerified). */
export function VerifyGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.is_verified) return children
  return (
    <Panel className="mx-auto max-w-[640px] items-center gap-[14px] p-[28px] text-center">
      <Icon name="lock" size={32} />
      <h1 className="font-display text-[44px] leading-none text-ink">verify first</h1>
      <p className="font-body text-[20px] text-ink-soft">
        Only verified people can use <span className="font-cyr">Қонақ</span>, the map and routes. The phrasebook works without it.
      </p>
      <div className="flex flex-wrap justify-center gap-[16px]">
        <ButtonLink to="/verify">verify</ButtonLink>
        <ButtonLink to="/phrasebook" variant="secondary">
          open phrasebook
        </ButtonLink>
      </div>
    </Panel>
  )
}
