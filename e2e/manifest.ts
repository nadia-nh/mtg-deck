import { readFileSync } from 'node:fs'
import type { SetManifest } from '../src/data/manifest'

/** The committed data manifest, so tests follow whatever sets are configured. */
export const manifest: SetManifest = JSON.parse(
  readFileSync(new URL('../public/data/manifest.json', import.meta.url), 'utf8'),
)
export const totalCards = manifest.sets.reduce((n, s) => n + s.cardCount, 0)
