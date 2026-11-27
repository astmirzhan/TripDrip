import { Link, NavLink } from 'react-router-dom'
import { useWallet } from '../api/hooks'
import baiterek from '../assets/figma/baiterek.svg'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { avatarFor } from '../lib/avatar'
import { Avatar } from './ui/Avatar'
import { chipClass } from './ui/styles'
import { CoinBalance } from './ui/Coin'
import { useI18n, type TKey } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'

const LINKS: Array<{ to: string; label: TKey; cyr?: boolean }> = [
  { to: '/home', label: 'nav.home' },
  { to: '/phrasebook', label: 'nav.phrasebook' },
  { to: '/assistant', label: 'nav.sos' },
  { to: '/qonaq', label: 'nav.qonaq', cyr: true },
  { to: '/map', label: 'nav.map' },
  { to: '/route', label: 'nav.route' },
  { to: '/chats', label: 'nav.chats' },
]

const PARTNER_LINKS: Array<{ to: string; label: TKey; cyr?: boolean }> = [
  { to: '/partner', label: 'nav.cabinet' },
  { to: '/phrasebook', label: 'nav.phrasebook' },
]

const ROLE_LABEL = { tourist: 'role.tourist', local: 'role.local', partner: 'role.partner', admin: 'role.admin' } as const satisfies Record<string, TKey>

// TD/Top nav (Figma 157:2): white bar, 4px ink border, 16px radius, 6px ink shadow, 72px tall.
export function TopNav() {
  const { user } = useAuth()
  const { t } = useI18n()
  const isPartner = user?.role === 'partner'
  const wallet = useWallet(!!user?.is_verified && !isPartner)
  const links = isPartner ? PARTNER_LINKS : LINKS

  return (
    <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-[10px] rounded-[16px] border-4 border-ink bg-white py-[10px] pr-[14px] pl-[24px] shadow-[0_6px_0_0_#2e1b5b]">
      <div className="flex min-w-0 flex-wrap items-center gap-[14px]">
        <Link to={isPartner ? '/partner' : '/home'} className="flex items-center gap-[8px]">
          <img src={baiterek} alt="" className="h-[47px] w-[14.56px]" />
          <span className="font-display text-[40px] leading-none text-ink">TripDrip</span>
        </Link>
        <nav aria-label={t('nav.main')} className="order-last flex w-full gap-[14px] overflow-x-auto pb-[2px] lg:order-none lg:w-auto lg:overflow-visible lg:pb-0">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => chipClass(isActive, link.cyr)}>
              {t(link.label)}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-[12px]">
        <LanguageSwitch />
      {user && (
        <>
          {!isPartner && (
            <Link to="/route/complete" aria-label={t('nav.wallet')}>
              <CoinBalance value={wallet.data?.balance ?? 0} />
            </Link>
          )}
          <span className={cn(chipClass(false), 'hidden sm:inline-flex')}>{t(ROLE_LABEL[user.role])}</span>
          <Link to="/profile" aria-label={t('nav.profile')}>
            <Avatar variant={avatarFor(user.id)} size={48} />
          </Link>
        </>
      )}
      </div>
    </header>
  )
}
