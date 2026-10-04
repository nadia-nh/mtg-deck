import { useCallback, useMemo, useState, type ReactNode } from 'react'
import * as D from '../../domain/deck'
import { DEFAULT_FORMAT_ID } from '../../domain/formats/registry'
import { createDeckStore, type DeckStore } from '../../storage/decks'
import { DeckContext, type DeckActions } from './deckContext'

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
      addCard: (zone, name, n) => edit((d) => D.addCard(d, zone, name, n)),
      removeCard: (zone, name, n) => edit((d) => D.removeCard(d, zone, name, n)),
      setCount: (zone, name, qty) => edit((d) => D.setCount(d, zone, name, qty)),
      moveCard: (from, to, name, n) => edit((d) => D.moveCard(d, from, to, name, n)),
      replaceCards: (main, side) => edit((d) => ({ ...d, main: { ...main }, side: { ...side } })),
    }),
    [decks, active, storageOk, activate, store, refresh, activeId, edit],
  )

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
}
