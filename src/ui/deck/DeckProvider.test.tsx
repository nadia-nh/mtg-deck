import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { CardsContext, type CardsState } from '../../data/cardsContext'
import { buildCardDb } from '../../data/loadCards'
import type { Card } from '../../domain/card'
import { createDeck } from '../../domain/deck'
import { createDeckStore } from '../../storage/decks'
import grn from '../../../public/data/sets/grn.json'
import { DeckProvider } from './DeckProvider'
import { useDeck } from './deckContext'

class MemoryStorage {
  data = new Map<string, string>()
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => void this.data.set(k, v)
  removeItem = (k: string) => void this.data.delete(k)
}

const withCards: CardsState = {
  status: 'ready',
  db: buildCardDb({ fetchedAt: '', sets: [] }, grn as Card[]),
}

function setup(mem = new MemoryStorage(), cards: CardsState = { status: 'loading' }) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CardsContext.Provider value={cards}>
      <DeckProvider store={createDeckStore(mem)} newDeckName={() => 'Untitled deck'}>
        {children}
      </DeckProvider>
    </CardsContext.Provider>
  )
  return { mem, ...renderHook(() => useDeck(), { wrapper }) }
}

describe('DeckProvider', () => {
  test('starts with one empty Pioneer deck', () => {
    const { result } = setup()
    expect(result.current.decks).toHaveLength(1)
    expect(result.current.active).toMatchObject({
      name: 'Untitled deck',
      formatId: 'pioneer',
      main: {},
    })
  })

  test('edits persist and survive a reload', () => {
    const { result, mem } = setup()
    act(() => result.current.addCard('main', 'Lava Coil', 3))
    act(() => result.current.moveCard('main', 'side', 'Lava Coil'))
    act(() => result.current.rename('Boros Aggro'))
    expect(result.current.active).toMatchObject({
      name: 'Boros Aggro',
      main: { 'Lava Coil': 2 },
      side: { 'Lava Coil': 1 },
    })

    const reloaded = setup(mem).result
    expect(reloaded.current.active.name).toBe('Boros Aggro')
    expect(reloaded.current.active.side).toEqual({ 'Lava Coil': 1 })
  })

  test('create switches to the new deck; delete falls back; last delete recreates', () => {
    const { result } = setup()
    const firstId = result.current.active.id
    act(() => void result.current.create('Second'))
    expect(result.current.active.name).toBe('Second')
    expect(result.current.decks).toHaveLength(2)

    act(() => result.current.deleteDeck(result.current.active.id))
    expect(result.current.active.id).toBe(firstId)

    act(() => result.current.deleteDeck(firstId))
    expect(result.current.decks).toHaveLength(1)
    expect(result.current.active.id).not.toBe(firstId)
  })

  test('duplicate selects the copy; select switches back', () => {
    const { result } = setup()
    const originalId = result.current.active.id
    act(() => result.current.addCard('main', 'Mountain', 20))
    act(() => result.current.duplicate(originalId))
    expect(result.current.active.name).toBe('Untitled deck (copy)')
    expect(result.current.active.main).toEqual({ Mountain: 20 })
    act(() => result.current.select(originalId))
    expect(result.current.active.id).toBe(originalId)
  })

  test('blank rename falls back to the default name', () => {
    const { result } = setup()
    act(() => result.current.rename('   '))
    expect(result.current.active.name).toBe('Untitled deck')
  })

  test('create can start a deck with cards (used by import)', () => {
    const { result } = setup()
    act(
      () =>
        void result.current.create('Imported', 'modern', {
          main: { 'Lava Coil': 4 },
          side: { Mountain: 1 },
        }),
    )
    expect(result.current.active).toMatchObject({
      name: 'Imported',
      formatId: 'modern',
      main: { 'Lava Coil': 4 },
      side: { Mountain: 1 },
    })
  })

  describe('copy limits', () => {
    const limited = () => setup(new MemoryStorage(), withCards).result

    test('adding stops at 4 copies across main and sideboard', () => {
      const result = limited()
      act(() => result.current.addCard('main', 'Lava Coil', 3))
      act(() => result.current.addCard('side', 'Lava Coil', 3))
      expect(result.current.active.main).toEqual({ 'Lava Coil': 3 })
      expect(result.current.active.side).toEqual({ 'Lava Coil': 1 })
      expect(result.current.copyAllowance('Lava Coil')).toEqual({
        limit: 4,
        left: 0,
        formatName: 'Pioneer',
      })

      act(() => result.current.addCard('main', 'Lava Coil'))
      expect(result.current.active.main).toEqual({ 'Lava Coil': 3 })
    })

    test('setCount is clamped to the limit; moving and removing still work', () => {
      const result = limited()
      act(() => result.current.setCount('main', 'Lava Coil', 9))
      expect(result.current.active.main).toEqual({ 'Lava Coil': 4 })
      act(() => result.current.moveCard('main', 'side', 'Lava Coil'))
      act(() => result.current.removeCard('main', 'Lava Coil'))
      expect(result.current.copyAllowance('Lava Coil').left).toBe(1)
    })

    test('basic lands are unlimited', () => {
      const result = limited()
      act(() => result.current.addCard('main', 'Mountain', 30))
      expect(result.current.active.main).toEqual({ Mountain: 30 })
      expect(result.current.copyAllowance('Mountain').left).toBe(Infinity)
    })

    test('import is not clamped, so validation can report the problem', () => {
      const result = limited()
      act(() => result.current.replaceCards({ 'Lava Coil': 6 }, {}))
      expect(result.current.active.main).toEqual({ 'Lava Coil': 6 })
      expect(result.current.copyAllowance('Lava Coil').left).toBe(0)
    })
  })

  describe('undo', () => {
    test('card add, remove and move each undo, newest first, with a message', () => {
      const { result } = setup()
      act(() => result.current.addCard('main', 'Lava Coil', 3))
      expect(result.current.lastChange?.message).toBe('Added 3 × Lava Coil')
      act(() => result.current.moveCard('main', 'side', 'Lava Coil'))
      expect(result.current.lastChange?.message).toBe('Moved Lava Coil to sideboard')
      act(() => result.current.removeCard('side', 'Lava Coil'))
      expect(result.current.lastChange?.message).toBe('Removed Lava Coil from sideboard')

      act(() => result.current.undo())
      expect(result.current.active.side).toEqual({ 'Lava Coil': 1 })
      expect(result.current.lastChange).toBeNull()
      act(() => result.current.undo())
      expect(result.current.active.main).toEqual({ 'Lava Coil': 3 })
      act(() => result.current.undo())
      expect(result.current.active.main).toEqual({})
      act(() => result.current.undo()) // empty history: no-op
      expect(result.current.active.main).toEqual({})
    })

    test('undoing a card change keeps a later rename', () => {
      const { result } = setup()
      act(() => result.current.addCard('main', 'Lava Coil'))
      act(() => result.current.rename('Burn'))
      act(() => result.current.undo())
      expect(result.current.active).toMatchObject({ name: 'Burn', main: {} })
    })

    test('no-op edits are not recorded', () => {
      const { result } = setup(new MemoryStorage(), withCards)
      act(() => result.current.removeCard('main', 'Lava Coil'))
      expect(result.current.lastChange).toBeNull()
      act(() => result.current.addCard('main', 'Lava Coil', 4))
      act(() => result.current.dismissChange())
      act(() => result.current.addCard('main', 'Lava Coil')) // at the limit
      expect(result.current.lastChange).toBeNull()
    })

    test('import into this deck restores the previous cards', () => {
      const { result } = setup()
      act(() => result.current.addCard('main', 'Mountain', 20))
      act(() => result.current.replaceCards({ 'Lava Coil': 4 }, { Plains: 1 }))
      expect(result.current.lastChange?.message).toBe('Imported 5 cards')
      act(() => result.current.undo())
      expect(result.current.active).toMatchObject({ main: { Mountain: 20 }, side: {} })
    })

    test('import as a new deck is removed again, and the old deck reselected', () => {
      const { result } = setup()
      const firstId = result.current.active.id
      act(
        () => void result.current.create('Burn', 'pioneer', { main: { 'Lava Coil': 4 }, side: {} }),
      )
      expect(result.current.lastChange?.message).toBe('Imported Burn')
      act(() => result.current.undo())
      expect(result.current.decks.map((d) => d.name)).toEqual(['Untitled deck'])
      expect(result.current.active.id).toBe(firstId)
    })

    test('a blank new deck is not undoable', () => {
      const { result } = setup()
      act(() => void result.current.create('Second'))
      expect(result.current.lastChange).toBeNull()
    })

    test('deleting a deck can be undone, even the last one', () => {
      const { result, mem } = setup()
      act(() => result.current.rename('Boros'))
      act(() => result.current.addCard('main', 'Lava Coil', 2))
      const id = result.current.active.id
      act(() => result.current.deleteDeck(id))
      expect(result.current.lastChange?.message).toBe('Deleted Boros')
      expect(result.current.active.name).toBe('Untitled deck') // auto-created blank

      act(() => result.current.undo())
      expect(result.current.decks.map((d) => d.name)).toEqual(['Boros'])
      expect(result.current.active).toMatchObject({ id, main: { 'Lava Coil': 2 } })
      // Persisted, not just in memory.
      expect(setup(mem).result.current.active.name).toBe('Boros')
    })
  })

  describe('deck names', () => {
    const BOROS = {
      'Boros Challenger': 4,
      'Legion Warboss': 4,
      'Skyknight Legionnaire': 4,
      'Lava Coil': 4,
    }
    const addAll = (result: { current: ReturnType<typeof useDeck> }) => {
      for (const [name, n] of Object.entries(BOROS)) {
        act(() => result.current.addCard('main', name, n))
      }
    }

    test('a new deck is auto-named and takes a descriptive name once it has cards', () => {
      const { result } = setup(new MemoryStorage(), withCards)
      expect(result.current.active).toMatchObject({ name: 'Untitled deck', nameEdited: false })
      act(() => result.current.addCard('main', 'Lava Coil', 4))
      expect(result.current.active.name).toBe('Untitled deck') // not enough cards yet
      addAll(result)
      expect(result.current.active).toMatchObject({ name: 'Boros Aggro', nameEdited: false })
    })

    test('a name the user types is never changed by the app', () => {
      const { result } = setup(new MemoryStorage(), withCards)
      act(() => result.current.rename('Sunday Night'))
      addAll(result)
      expect(result.current.active).toMatchObject({ name: 'Sunday Night', nameEdited: true })
    })

    test('clearing the name hands naming back to the app', () => {
      const { result } = setup(new MemoryStorage(), withCards)
      act(() => result.current.rename('Sunday Night'))
      addAll(result)
      act(() => result.current.rename('   '))
      expect(result.current.active).toMatchObject({ name: 'Boros Aggro', nameEdited: false })
    })

    test('decks saved before auto-naming keep their names', () => {
      const mem = new MemoryStorage()
      const store = createDeckStore(mem)
      const old = store.save({ ...createDeck('My Boros', 'pioneer'), main: {} })
      store.setActiveId(old.id)
      const { result } = setup(mem, withCards)
      addAll(result)
      expect(result.current.active.name).toBe('My Boros')
    })

    test('an imported list keeps its name; an unnamed one is auto-named', () => {
      const { result } = setup(new MemoryStorage(), withCards)
      act(() => void result.current.create('Burn', 'pioneer', { main: BOROS, side: {} }))
      expect(result.current.active).toMatchObject({ name: 'Burn', nameEdited: true })
      act(() => void result.current.create(undefined, 'pioneer', { main: BOROS, side: {} }))
      expect(result.current.active).toMatchObject({ name: 'Boros Aggro', nameEdited: false })
    })
  })
})
