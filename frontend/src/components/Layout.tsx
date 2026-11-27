import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'
import { useOnline } from '../lib/online'
import { SceneBackground, type Sprite } from './scene/Scene'
import { TopNav } from './TopNav'

/** Screen with the top nav (Home, Phrasebook, Қонақ, Map, Route). Content area matches the 1360px Figma grid. */
export function AppScreen({ children, sprites, className }: { children: ReactNode; sprites?: Sprite[]; className?: string }) {
  const online = useOnline()
  return (
    <div className="min-h-screen px-[16px] pt-[16px] pb-[40px] lg:px-[40px] lg:pt-[20px]">
      <SceneBackground sprites={sprites} />
      <div className="mx-auto max-w-[1360px]">
        <TopNav />
        {!online && <OfflineBanner />}
        <main className={cn('mt-[24px] lg:mt-[24px]', className)}>{children}</main>
      </div>
    </div>
  )
}

/** Offline banner (Figma 16): what still works without signal. */
function OfflineBanner() {
  return (
    <div role="status" className="mt-[16px] flex flex-wrap items-center gap-[10px] rounded-[14px] border-4 border-ink bg-ink px-[18px] py-[12px]">
      <span className="size-[14px] shrink-0 rounded-[3px] border-2 border-white bg-danger" />
      <span className="font-body text-[16px] font-bold tracking-[0.96px] text-yellow">NO SIGNAL · OFFLINE MODE</span>
      <span className="min-w-0 flex-1 font-body text-[16px] text-white">
        Phrasebook, <Link to="/assistant" className="underline">SOS assistant</Link> and your codes work. <span className="font-cyr">Қонақ</span>, map and routes come back online.
      </span>
    </div>
  )
}

/** Full-scene screen without nav (Start, Sign up, Verify, Profile, Show to a local, Route complete). */
export function SceneScreen({ children, sprites, className }: { children: ReactNode; sprites?: Sprite[]; className?: string }) {
  return (
    <div className={cn('flex min-h-screen items-center justify-center px-[16px] py-[32px] lg:py-[48px]', className)}>
      <SceneBackground sprites={sprites} />
      {children}
    </div>
  )
}
