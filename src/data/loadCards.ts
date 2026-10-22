import type { Card } from '../domain/card'
import { collectorNumberValue } from '../domain/search'
import type { SetManifest } from './manifest'

/** Regular printings have plain numeric collector numbers ("221", not "221★"). */
const isRegularPrinting = (c: Card) => /^\d+$/.test(c.collectorNumber)

/**
 * Order of preference for a card's printings: newest set first; within a set,
 * regular printings before alternate arts, then lowest collector number.
 */
export function comparePrintings(a: Card, b: Card): number {
  return (
    b.releasedAt.localeCompare(a.releasedAt) ||
    Number(isRegularPrinting(b)) - Number(isRegularPrinting(a)) ||
    collectorNumberValue(a.collectorNumber) - collectorNumberValue(b.collectorNumber)
  )
}

export interface CardDb {
  manifest: SetManifest
  /** Every printing from every loaded set. */
  cards: Card[]
  byId: Map<string, Card>
  /**
   * Printings grouped by exact card name, most preferred first (see comparePrintings).
   * Decks are keyed by name, so this resolves a name to a display printing.
   */
  byName: Map<string, Card[]>
}

export function buildCardDb(manifest: SetManifest, cards: Card[]): CardDb {
  const byId = new Map<string, Card>()
  const byName = new Map<string, Card[]>()
  for (const card of cards) {
    byId.set(card.id, card)
    const list = byName.get(card.name)
    if (list) list.push(card)
    else byName.set(card.name, [card])
  }
  for (const list of byName.values()) {
    list.sort(comparePrintings)
  }
  return { manifest, cards, byId, byName }
}

/** Case-insensitive name lookup returning the newest printing. */
export function findByName(db: CardDb, name: string): Card | undefined {
  const exact = db.byName.get(name)
  if (exact) return exact[0]
  const lower = name.trim().toLowerCase()
  for (const [n, list] of db.byName) {
    if (n.toLowerCase() === lower) return list[0]
  }
  return undefined
}

/**
 * Resolves names as people type them in decklists: exact, case-insensitive,
 * or the front face of a double-faced card ("Delver of Secrets").
 */
export function resolveCardName(db: CardDb, name: string): Card | undefined {
  const hit = findByName(db, name)
  if (hit) return hit
  const lower = name.trim().toLowerCase()
  for (const list of db.byName.values()) {
    const front = list[0].faces?.[0]?.name
    if (front && front.toLowerCase() === lower && list[0].layout !== 'split') return list[0]
  }
  return undefined
}

type FetchJson = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

/** Receives the database built from the initial sets, while background sets still load. */
export type OnPartial = (db: CardDb) => void

/**
 * Loads the manifest and every set, and resolves with the complete database. When the
 * manifest marks some sets as `background`, `onPartial` first gets a database of the other
 * sets, so the app can show cards without waiting for the older ones.
 */
export async function loadCards(
  onPartial?: OnPartial,
  baseUrl = `${import.meta.env.BASE_URL}data/`,
  fetchFn: FetchJson = (u) => fetch(u),
): Promise<CardDb> {
  const getJson = async <T>(path: string): Promise<T> => {
    const res = await fetchFn(baseUrl + path)
    if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`)
    return (await res.json()) as T
  }
  const loadSets = async (sets: SetManifest['sets']) =>
    (await Promise.all(sets.map((s) => getJson<Card[]>(s.file)))).flat()

  const manifest = await getJson<SetManifest>('manifest.json')
  const initialSets = manifest.sets.filter((s) => !s.background)
  const backgroundSets = manifest.sets.filter((s) => s.background)
  const initial = await loadSets(initialSets)
  if (backgroundSets.length === 0) return buildCardDb(manifest, initial)

  onPartial?.(buildCardDb({ ...manifest, sets: initialSets }, initial))
  return buildCardDb(manifest, [...initial, ...(await loadSets(backgroundSets))])
}
