import type { Card } from '../domain/card'
import type { SetManifest } from './manifest'

export interface CardDb {
  manifest: SetManifest
  /** Every printing from every loaded set. */
  cards: Card[]
  byId: Map<string, Card>
  /**
   * Printings grouped by exact card name, newest release first.
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
    list.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
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

export async function loadCards(
  baseUrl = `${import.meta.env.BASE_URL}data/`,
  fetchFn: FetchJson = (u) => fetch(u),
): Promise<CardDb> {
  const getJson = async <T>(path: string): Promise<T> => {
    const res = await fetchFn(baseUrl + path)
    if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`)
    return (await res.json()) as T
  }

  const manifest = await getJson<SetManifest>('manifest.json')
  const perSet = await Promise.all(manifest.sets.map((s) => getJson<Card[]>(s.file)))
  return buildCardDb(manifest, perSet.flat())
}
