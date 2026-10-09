import { useCallback, useMemo, useState } from 'react'
import { findByName, resolveCardName, type CardDb } from './data/loadCards'
import type { Card } from './domain/card'
import { copiesByName } from './domain/deck'
import { CardsProvider } from './data/CardsProvider'
import { useCards } from './data/cardsContext'
import type { DeckStore } from './storage/decks'
import { CardBrowser } from './ui/CardBrowser'
import { CardDetail } from './ui/CardDetail'
import { DeckPanel } from './ui/deck/DeckPanel'
import { DeckProvider } from './ui/deck/DeckProvider'
import { useDeck } from './ui/deck/deckContext'
import { UndoToast } from './ui/deck/UndoToast'
import { Logo } from './ui/Logo'
import { ThemeToggle } from './ui/ThemeToggle'

function DataStatus({ db }: { db: CardDb }) {
  const { cards, manifest } = db
  const n = manifest.sets.length
  return (
    <p className="data-status" data-testid="data-status">
      Loaded {cards.length} cards from {n} {n === 1 ? 'set' : 'sets'} (
      {manifest.sets.map((s) => s.name).join(', ')}). Prices as of{' '}
      {new Date(manifest.fetchedAt).toLocaleDateString()}.
    </p>
  )
}

function Workspace({ db }: { db: CardDb }) {
  const { active, addCard, copyAllowance } = useDeck()
  const [selected, setSelected] = useState<Card | null>(null)
  const resolve = useCallback((name: string) => findByName(db, name), [db])
  const resolveForImport = useCallback((name: string) => resolveCardName(db, name), [db])
  const deckCounts = useMemo(() => copiesByName(active), [active])

  return (
    <>
      <div className="workspace">
        <CardBrowser
          db={db}
          onSelect={setSelected}
          onAdd={(card) => addCard('main', card.name)}
          deckCounts={deckCounts}
          copyAllowance={(card) => copyAllowance(card.name)}
        />
        <DeckPanel resolve={resolve} resolveForImport={resolveForImport} onSelect={setSelected} />
      </div>
      <CardDetail
        card={selected}
        pricesAsOf={db.manifest.fetchedAt}
        onClose={() => setSelected(null)}
        inDeck={
          selected
            ? { main: active.main[selected.name] ?? 0, side: active.side[selected.name] ?? 0 }
            : undefined
        }
        onAdd={(zone) => selected && addCard(zone, selected.name)}
        allowance={selected ? copyAllowance(selected.name) : undefined}
      />
      <UndoToast />
      <footer>
        <DataStatus db={db} />
        <p>
          Card data and images from <a href="https://scryfall.com">Scryfall</a>. Magic: The
          Gathering is © Wizards of the Coast; this is unofficial fan content.
        </p>
      </footer>
    </>
  )
}

function Main() {
  const state = useCards()
  if (state.status === 'loading') return <p>Loading cards…</p>
  if (state.status === 'error') return <p role="alert">Couldn’t load card data: {state.error}</p>
  return <Workspace db={state.db} />
}

export default function App({
  load,
  deckStore,
}: {
  load?: () => Promise<CardDb>
  deckStore?: DeckStore
}) {
  return (
    <CardsProvider load={load}>
      <DeckProvider store={deckStore}>
        <header className="app-header">
          <div className="brand">
            <Logo />
            <h1>MTG Deck Builder</h1>
          </div>
          <ThemeToggle />
        </header>
        <main>
          <Main />
        </main>
      </DeckProvider>
    </CardsProvider>
  )
}
