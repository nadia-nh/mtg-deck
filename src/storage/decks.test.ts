import { describe, expect, test } from 'vitest'
import { addCard, createDeck } from '../domain/deck'
import { ACTIVE_KEY, STORAGE_KEY, createDeckStore, isDeck } from './decks'

class MemoryStorage {
  data = new Map<string, string>()
  failWrites = false
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => {
    if (this.failWrites) throw new DOMException('full', 'QuotaExceededError')
    this.data.set(k, v)
  }
  removeItem = (k: string) => void this.data.delete(k)
}

const t = (s: string) => new Date(`2026-01-0${s}T00:00:00Z`)
const deck = (id: string, name = id) => createDeck(name, 'pioneer', { id, now: t('1') })

describe('deck store', () => {
  test('save/list/get round-trip through storage', () => {
    const mem = new MemoryStorage()
    const store = createDeckStore(mem)
    store.save(addCard(deck('a'), 'main', 'Lava Coil', 4), t('2'))
    store.save(deck('b'), t('3'))

    // A fresh store reading the same storage sees the same data.
    const again = createDeckStore(mem)
    expect(again.list().map((d) => d.id)).toEqual(['b', 'a']) // newest first
    expect(again.get('a')?.main).toEqual({ 'Lava Coil': 4 })
    expect(again.get('a')?.updatedAt).toBe('2026-01-02T00:00:00.000Z')
    expect(JSON.parse(mem.getItem(STORAGE_KEY)!).version).toBe(1)
  })

  test('save replaces an existing deck by id', () => {
    const store = createDeckStore(new MemoryStorage())
    store.save(deck('a', 'First'))
    store.save({ ...deck('a'), name: 'Renamed' })
    expect(store.list()).toHaveLength(1)
    expect(store.get('a')?.name).toBe('Renamed')
  })

  test('remove clears the active id if it pointed at the deck', () => {
    const mem = new MemoryStorage()
    const store = createDeckStore(mem)
    store.save(deck('a'))
    store.setActiveId('a')
    expect(mem.getItem(ACTIVE_KEY)).toBe('a')
    store.remove('a')
    expect(store.list()).toEqual([])
    expect(store.getActiveId()).toBeNull()
    expect(mem.getItem(ACTIVE_KEY)).toBeNull()
  })

  test('duplicate makes an independent copy', () => {
    const store = createDeckStore(new MemoryStorage())
    store.save(addCard(deck('a', 'Boros'), 'main', 'Lava Coil', 2))
    const copy = store.duplicate('a', { newId: 'b', now: t('5') })!
    expect(copy).toMatchObject({ id: 'b', name: 'Boros (copy)', main: { 'Lava Coil': 2 } })
    store.save(addCard(copy, 'main', 'Lava Coil'))
    expect(store.get('a')?.main['Lava Coil']).toBe(2)
    expect(store.duplicate('missing')).toBeUndefined()
  })

  test('corrupt JSON is backed up and the store starts empty', () => {
    const mem = new MemoryStorage()
    mem.setItem(STORAGE_KEY, '{not json')
    const store = createDeckStore(mem)
    expect(store.list()).toEqual([])
    const backup = [...mem.data.keys()].find((k) => k.startsWith(`${STORAGE_KEY}:corrupt-`))
    expect(backup && mem.getItem(backup)).toBe('{not json')
  })

  test('invalid decks inside valid JSON are dropped', () => {
    const mem = new MemoryStorage()
    mem.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        decks: [deck('ok'), { id: 'bad' }, { ...deck('neg'), main: { X: -1 } }],
      }),
    )
    expect(
      createDeckStore(mem)
        .list()
        .map((d) => d.id),
    ).toEqual(['ok'])
  })

  test('write failures are reported but keep in-memory state', () => {
    const mem = new MemoryStorage()
    const store = createDeckStore(mem)
    mem.failWrites = true
    store.save(deck('a'))
    expect(store.lastWriteOk).toBe(false)
    expect(store.get('a')).toBeDefined()
    mem.failWrites = false
    store.save(deck('b'))
    expect(store.lastWriteOk).toBe(true)
  })

  test('works with no storage at all (blocked/private mode)', () => {
    const store = createDeckStore(null)
    store.save(deck('a'))
    expect(store.list()).toHaveLength(1)
    expect(store.lastWriteOk).toBe(false)
  })

  test('isDeck', () => {
    expect(isDeck(deck('a'))).toBe(true)
    expect(isDeck(null)).toBe(false)
    expect(isDeck({ ...deck('a'), main: { X: 'two' } })).toBe(false)
  })
})
