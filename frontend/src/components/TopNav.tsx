import { Link, NavLink } from 'react-router-dom'
import { useWallet } from '../api/hooks'
import baiterek from '../assets/figma/baiterek.svg'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { avatarFor } from '../lib/avatar'
import { Avatar } from './ui/Avatar'
import { chipClass } from './ui/styles'
import { CoinBalance } from './ui/Coin'

const LINKS = [
  { to: '/home', label: 'HOME' },
  { to: '/phrasebook', label: 'PHRASEBOOK' },
  { to: '/qonaq', label: 'ҚОНАҚ', cyr: true },
  { to: '/map', label: 'MAP' },
  { to: '/route', label: 'ROUTE' },
  { to: '/chats', label: 'CHATS' },
]

const PARTNER_LINKS = [{ to: '/partner', label: 'CABINET' }, { to: '/phrasebook', label: 'PHRASEBOOK' }]

const ROLE_LABEL = { tourist: 'GUEST', local: 'LOCAL', partner: 'PARTNER', admin: 'ADMIN' } as const

// TD/Top nav (Figma 157:2): white bar, 4px ink border, 16px radius, 6px ink shadow, 72px tall.
export function TopNav() {
  const { user } = useAuth()
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
        <nav aria-label="Main" className="order-last flex w-full gap-[14px] overflow-x-auto pb-[2px] lg:order-none lg:w-auto lg:overflow-visible lg:pb-0">
          {links.map((link: { to: string; label: string; cyr?: boolean }) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => chipClass(isActive, link.cyr)}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {user && (
        <div className="flex items-center gap-[12px]">
          {!isPartner && (
            <Link to="/route/complete" aria-label="Wallet">
              <CoinBalance value={wallet.data?.balance ?? 0} />
            </Link>
          )}
          <span className={cn(chipClass(false), 'hidden sm:inline-flex')}>{ROLE_LABEL[user.role]}</span>
          <Link to="/profile" aria-label="Profile">
            <Avatar variant={avatarFor(user.id)} size={48} />
          </Link>
        </div>
      )}
    </header>
  )
}
