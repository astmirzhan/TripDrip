import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { SceneBackground, type Sprite } from './scene/Scene'
import { TopNav } from './TopNav'

/** Screen with the top nav (Home, Phrasebook, Қонақ, Map, Route). Content area matches the 1360px Figma grid. */
export function AppScreen({ children, sprites, className }: { children: ReactNode; sprites?: Sprite[]; className?: string }) {
  return (
    <div className="min-h-screen px-[16px] pt-[16px] pb-[40px] lg:px-[40px] lg:pt-[20px]">
      <SceneBackground sprites={sprites} />
      <div className="mx-auto max-w-[1360px]">
        <TopNav />
        <main className={cn('mt-[24px] lg:mt-[24px]', className)}>{children}</main>
      </div>
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
