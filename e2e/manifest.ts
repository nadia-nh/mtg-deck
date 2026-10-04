import { readFileSync } from 'node:fs'
import type { Card } from '../src/domain/card'
import type { SetManifest } from '../src/data/manifest'

const read = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(`../public/data/${path}`, import.meta.url), 'utf8'))

/** The committed data manifest, so tests follow whatever sets are configured. */
export const manifest = read<SetManifest>('manifest.json')

/** Every printing in every set. */
export const totalCards = manifest.sets.reduce((n, s) => n + s.cardCount, 0)

const cardsBySet = new Map(manifest.sets.map((s) => [s.code, read<Card[]>(s.file)]))
const uniqueNames = (cards: Card[]) => new Set(cards.map((c) => c.name)).size

/** What the browser shows by default: one tile per card name. */
export const totalUniqueNames = uniqueNames([...cardsBySet.values()].flat())
export const uniqueNamesInSet = (code: string) => uniqueNames(cardsBySet.get(code) ?? [])
