import type { Deck } from '../domain/deck'

/**
 * Deck persistence in the browser's localStorage.
 *
 * - Data is wrapped in `{ version, decks }` so the shape can be migrated later.
 * - Every read/write is guarded: private browsing, blocked storage, or quota
 *   errors degrade to in-memory behavior instead of crashing the app.
 * - Corrupt JSON is backed up under a separate key rather than silently lost.
 */

export const STORAGE_KEY = 'mtg-deck-builder:decks'
export const ACTIVE_KEY = 'mtg-deck-builder:active-deck'
const VERSION = 1

interface StoredV1 {
  version: 1
  decks: Deck[]
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): KV | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const isCounts = (v: unknown): v is Record<string, number> =>
  typeof v === 'object' &&
  v !== null &&
  Object.values(v).every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)

export function isDeck(v: unknown): v is Deck {
  if (typeof v !== 'object' || v === null) return false
  const d = v as Record<string, unknown>
  return (
    typeof d.id === 'string' &&
    typeof d.name === 'string' &&
    typeof d.formatId === 'string' &&
    typeof d.createdAt === 'string' &&
    typeof d.updatedAt === 'string' &&
    isCounts(d.main) &&
    isCounts(d.side)
  )
}

export interface DeckStore {
  /** Most recently updated first. */
  list(): Deck[]
  get(id: string): Deck | undefined
  /** Inserts or replaces by id, stamping updatedAt. Returns the saved deck. */
  save(deck: Deck, now?: Date): Deck
  remove(id: string): void
  duplicate(id: string, opts?: { newId?: string; now?: Date }): Deck | undefined
  getActiveId(): string | null
  setActiveId(id: string | null): void
  /** False if the last write failed (e.g. storage full or blocked). */
  readonly lastWriteOk: boolean
}

export function createDeckStore(storage: KV | null = defaultStorage()): DeckStore {
  let memory: Deck[] = load()
  let lastWriteOk = true
  let activeMemory: string | null = safeGet(ACTIVE_KEY)

  function safeGet(key: string): string | null {
    try {
      return storage?.getItem(key) ?? null
    } catch {
      return null
    }
  }

  function safeSet(key: string, value: string | null): boolean {
    if (!storage) return false
    try {
      if (value == null) storage.removeItem(key)
      else storage.setItem(key, value)
      return true
    } catch {
      return false
    }
  }

  function load(): Deck[] {
    const raw = safeGet(STORAGE_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as Partial<StoredV1>
      if (parsed.version !== VERSION || !Array.isArray(parsed.decks)) throw new Error('bad shape')
      return parsed.decks.filter(isDeck)
    } catch {
      safeSet(`${STORAGE_KEY}:corrupt-${Date.now()}`, raw)
      return []
    }
  }

  function persist() {
    const data: StoredV1 = { version: VERSION, decks: memory }
    lastWriteOk = safeSet(STORAGE_KEY, JSON.stringify(data))
  }

  const store: DeckStore = {
    list: () => [...memory].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

    get: (id) => memory.find((d) => d.id === id),

    save(deck, now = new Date()) {
      const saved = { ...deck, updatedAt: now.toISOString() }
      const i = memory.findIndex((d) => d.id === deck.id)
      memory = i >= 0 ? memory.map((d, j) => (j === i ? saved : d)) : [...memory, saved]
      persist()
      return saved
    },

    remove(id) {
      memory = memory.filter((d) => d.id !== id)
      persist()
      if (activeMemory === id) store.setActiveId(null)
    },

    duplicate(id, opts = {}) {
      const src = store.get(id)
      if (!src) return undefined
      const now = (opts.now ?? new Date()).toISOString()
      const copy: Deck = {
        ...src,
        id: opts.newId ?? crypto.randomUUID(),
        name: `${src.name} (copy)`,
        main: { ...src.main },
        side: { ...src.side },
        createdAt: now,
        updatedAt: now,
      }
      return store.save(copy, opts.now)
    },

    getActiveId: () => activeMemory,

    setActiveId(id) {
      activeMemory = id
      safeSet(ACTIVE_KEY, id)
    },

    get lastWriteOk() {
      return lastWriteOk
    },
  }
  return store
}
