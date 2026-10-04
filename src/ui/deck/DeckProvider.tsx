import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useCards } from '../../data/cardsContext'
import { findByName } from '../../data/loadCards'
import * as D from '../../domain/deck'
import { DEFAULT_FORMAT_ID, getFormat } from '../../domain/formats/registry'
import { copiesLeft } from '../../domain/formats/types'
import { createDeckStore, type DeckStore } from '../../storage/decks'
import { DeckContext, type CopyAllowance, type DeckActions } from './deckContext'

const DEFAULT_NAME = 'Untitled deck'

/** Ensures there is always at least one deck and a valid active id. */
function initialize(store: DeckStore): string {
  let decks = store.list()
  if (decks.length === 0) {
    store.save(D.createDeck(DEFAULT_NAME, DEFAULT_FORMAT_ID))
    decks = store.list()
  }
  const saved = store.getActiveId()
  const id = saved && store.get(saved) ? saved : decks[0].id
  store.setActiveId(id)
  return id
}

export function DeckProvider({
  children,
  store: storeProp,
}: {
  children: ReactNode
  store?: DeckStore
}) {
  const [store] = useState(() => storeProp ?? createDeckStore())
  const [activeId, setActiveId] = useState(() => initialize(store))
  const [decks, setDecks] = useState(() => store.list())
  const [storageOk, setStorageOk] = useState(true)
  const cards = useCards()

  const allowance = useCallback(
    (deck: D.Deck, name: string): CopyAllowance => {
      const card = cards.status === 'ready' ? findByName(cards.db, name) : undefined
      const format = getFormat(deck.formatId)
      if (!card) return { limit: Infinity, left: Infinity, formatName: format.name }
      return {
        limit: format.copyLimit(card),
        left: copiesLeft(deck, format, card),
        formatName: format.name,
      }
    },
    [cards],
  )

  const refresh = useCallback(() => {
    setDecks(store.list())
    setStorageOk(store.lastWriteOk)
  }, [store])

  const activate = useCallback(
    (id: string) => {
      store.setActiveId(id)
      setActiveId(id)
    },
    [store],
  )

  const active = decks.find((d) => d.id === activeId) ?? decks[0]

  /** Apply a pure edit to the active deck and persist it. */
  const edit = useCallback(
    (fn: (deck: D.Deck) => D.Deck) => {
      const current = store.get(activeId)
      if (!current) return
      const next = fn(current)
      if (next !== current) {
        store.save(next)
        refresh()
      }
    },
    [store, activeId, refresh],
  )

  const value = useMemo<DeckActions>(
    () => ({
      decks,
      active,
      storageOk,
      select: activate,
      create(name = DEFAULT_NAME, formatId = active?.formatId ?? DEFAULT_FORMAT_ID, cards) {
        const blank = D.createDeck(name, formatId)
        const deck = store.save(
          cards ? { ...blank, main: { ...cards.main }, side: { ...cards.side } } : blank,
        )
        refresh()
        activate(deck.id)
        return deck
      },
      deleteDeck(id) {
        store.remove(id)
        const remaining = store.list()
        if (remaining.length === 0) store.save(D.createDeck(DEFAULT_NAME, DEFAULT_FORMAT_ID))
        if (id === activeId) activate(store.list()[0].id)
        refresh()
      },
      duplicate(id) {
        const copy = store.duplicate(id)
        refresh()
        if (copy) activate(copy.id)
      },
      rename: (name) => edit((d) => ({ ...d, name: name.trim() || DEFAULT_NAME })),
      setFormat: (formatId) => edit((d) => ({ ...d, formatId })),
      copyAllowance: (name) => allowance(active, name),
      addCard: (zone, name, n = 1) =>
        edit((d) => {
          const fits = Math.min(n, allowance(d, name).left)
          return fits > 0 ? D.addCard(d, zone, name, fits) : d
        }),
      removeCard: (zone, name, n) => edit((d) => D.removeCard(d, zone, name, n)),
      setCount: (zone, name, qty) =>
        edit((d) => {
          const max = (d[zone][name] ?? 0) + allowance(d, name).left
          return D.setCount(d, zone, name, Math.min(qty, max))
        }),
      moveCard: (from, to, name, n) => edit((d) => D.moveCard(d, from, to, name, n)),
      replaceCards: (main, side) => edit((d) => ({ ...d, main: { ...main }, side: { ...side } })),
    }),
    [decks, active, storageOk, activate, store, refresh, activeId, edit, allowance],
  )

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
}
