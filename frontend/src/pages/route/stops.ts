import type { RouteStop } from '../../api/types'
import type { LevelState } from '../../components/ui/LevelNode'

/** The Figma road has 10 stop slots. */
export const SLOT_COUNT = 10

/** Spread n real stops across the 10 designed slots, always ending on the goal slot. */
export function slotsFor(n: number): number[] {
  if (n <= 1) return [SLOT_COUNT - 1]
  return Array.from({ length: n }, (_, i) => Math.round((i * (SLOT_COUNT - 1)) / (n - 1)))
}

export function stopState(stops: RouteStop[], index: number): LevelState {
  const current = stops.findIndex((s) => !s.is_visited)
  if (stops[index].is_visited) return 'done'
  if (index === current) return 'current'
  if (index === stops.length - 1) return 'photo'
  return 'locked'
}
