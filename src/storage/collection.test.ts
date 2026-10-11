import { describe, expect, test } from 'vitest'
import { COLLECTION_KEY, createCollectionStore } from './collection'

class MemoryStorage {
  data = new Map<string, string>()
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => void this.data.set(k, v)
}

describe('collection store', () => {
  test('starts empty and survives a reload', () => {
    const mem = new MemoryStorage()
    const store = createCollectionStore(mem)
    expect(store.get()).toEqual({})
    store.save({ 'Lava Coil': 3 })
    expect(createCollectionStore(mem).get()).toEqual({ 'Lava Coil': 3 })
    expect(JSON.parse(mem.data.get(COLLECTION_KEY)!)).toEqual({
      version: 1,
      owned: { 'Lava Coil': 3 },
    })
  })

  test('backs up corrupt or invalid data instead of losing it', () => {
    for (const bad of ['{not json', JSON.stringify({ version: 1, owned: { X: -1 } })]) {
      const mem = new MemoryStorage()
      mem.setItem(COLLECTION_KEY, bad)
      expect(createCollectionStore(mem).get()).toEqual({})
      const backup = [...mem.data.keys()].find((k) => k.startsWith(`${COLLECTION_KEY}:corrupt-`))
      expect(backup && mem.data.get(backup)).toBe(bad)
    }
  })

  test('blocked storage keeps working in memory and reports the failed write', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    const store = createCollectionStore(throwing)
    store.save({ 'Lava Coil': 1 })
    expect(store.get()).toEqual({ 'Lava Coil': 1 })
    expect(store.lastWriteOk).toBe(false)
    expect(createCollectionStore(null).get()).toEqual({})
  })
})
