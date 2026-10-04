import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { createDeckStore } from '../../storage/decks'
import { DeckProvider } from './DeckProvider'
import { useDeck } from './deckContext'

class MemoryStorage {
  data = new Map<string, string>()
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => void this.data.set(k, v)
  removeItem = (k: string) => void this.data.delete(k)
}

function setup(mem = new MemoryStorage()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DeckProvider store={createDeckStore(mem)}>{children}</DeckProvider>
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
})
