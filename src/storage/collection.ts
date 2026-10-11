import type { Owned } from '../domain/collection'

/**
 * The owned-cards collection in localStorage, guarded like the deck store: blocked or full
 * storage degrades to memory, and corrupt data is backed up rather than silently lost.
 */

export const COLLECTION_KEY = 'mtg-deck-builder:collection'
const VERSION = 1

interface StoredV1 {
  version: 1
  owned: Record<string, number>
}

type KV = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): KV | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const isOwned = (v: unknown): v is Record<string, number> =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.values(v).every((n) => typeof n === 'number' && Number.isInteger(n) && n > 0)

export interface CollectionStore {
  get(): Owned
  save(owned: Owned): void
  /** False if the last write failed (e.g. storage full or blocked). */
  readonly lastWriteOk: boolean
}

export function createCollectionStore(storage: KV | null = defaultStorage()): CollectionStore {
  let lastWriteOk = true

  const safeSet = (key: string, value: string) => {
    try {
      storage?.setItem(key, value)
      return storage != null
    } catch {
      return false
    }
  }

  function load(): Owned {
    let raw: string | null = null
    try {
      raw = storage?.getItem(COLLECTION_KEY) ?? null
    } catch {
      return {}
    }
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw) as Partial<StoredV1>
      if (parsed.version !== VERSION || !isOwned(parsed.owned)) throw new Error('bad shape')
      return parsed.owned
    } catch {
      safeSet(`${COLLECTION_KEY}:corrupt-${Date.now()}`, raw)
      return {}
    }
  }

  let memory = load()

  return {
    get: () => memory,
    save(owned) {
      memory = owned
      const data: StoredV1 = { version: VERSION, owned: { ...owned } }
      lastWriteOk = safeSet(COLLECTION_KEY, JSON.stringify(data))
    },
    get lastWriteOk() {
      return lastWriteOk
    },
  }
}
