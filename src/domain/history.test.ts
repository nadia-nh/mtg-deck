import { describe, expect, test } from 'vitest'
import { addCard, createDeck } from './deck'
import {
  addedMessage,
  movedMessage,
  popChange,
  pushChange,
  removedMessage,
  restoreCards,
  type Change,
} from './history'

const change = (id: number): Change => ({
  id,
  message: `change ${id}`,
  before: null,
  after: null,
  activeBefore: null,
})

describe('history stack', () => {
  test('push adds newest last; pop takes the newest', () => {
    const h = pushChange(pushChange([], change(1)), change(2))
    const [top, rest] = popChange(h)
    expect(top?.id).toBe(2)
    expect(rest.map((c) => c.id)).toEqual([1])
    expect(h).toHaveLength(2) // not mutated
  })

  test('pop on an empty stack returns nothing', () => {
    expect(popChange([])).toEqual([undefined, []])
  })

  test('keeps only the most recent changes', () => {
    let h: Change[] = []
    for (let i = 1; i <= 25; i++) h = pushChange(h, change(i), 20)
    expect(h).toHaveLength(20)
    expect(h[0].id).toBe(6)
    expect(h[19].id).toBe(25)
  })
})

describe('restoreCards', () => {
  test('brings back the earlier cards but keeps a later rename and format', () => {
    const before = addCard(createDeck('Boros', 'pioneer', { id: 'd' }), 'main', 'Lava Coil', 2)
    const current = {
      ...addCard(before, 'main', 'Lava Coil', 2),
      name: 'Boros Aggro',
      formatId: 'modern',
    }
    const restored = restoreCards(current, before)
    expect(restored.main).toEqual({ 'Lava Coil': 2 })
    expect(restored.name).toBe('Boros Aggro')
    expect(restored.formatId).toBe('modern')
    expect(restored.main).not.toBe(before.main) // copied, not shared
  })
})

describe('messages', () => {
  test.each([
    [addedMessage('Lava Coil', 1, 'main'), 'Added Lava Coil'],
    [addedMessage('Lava Coil', 4, 'main'), 'Added 4 × Lava Coil'],
    [addedMessage('Lava Coil', 1, 'side'), 'Added Lava Coil to sideboard'],
    [removedMessage('Mountain', 1, 'main'), 'Removed Mountain'],
    [removedMessage('Mountain', 1, 'side'), 'Removed Mountain from sideboard'],
    [movedMessage('Lava Coil', 1, 'side'), 'Moved Lava Coil to sideboard'],
    [movedMessage('Lava Coil', 2, 'main'), 'Moved 2 × Lava Coil to main deck'],
  ])('%s', (actual, expected) => {
    expect(actual).toBe(expected)
  })
})
