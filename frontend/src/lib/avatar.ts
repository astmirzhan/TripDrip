export type AvatarVariant = 'moss' | 'dusk' | 'plum' | 'sky' | 'blue'

const ORDER: AvatarVariant[] = ['moss', 'dusk', 'plum', 'sky', 'blue']

/** Stable sprite per user so the same person always gets the same ninja. */
export function avatarFor(seed: string): AvatarVariant {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return ORDER[Math.abs(hash) % ORDER.length]
}
