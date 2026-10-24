import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'
import { buildCardDb } from './data/loadCards'
import type { Card } from './domain/card'
import { grn } from './testing/sets'

const manifest = {
  fetchedAt: '2026-10-03T00:00:00Z',
  sets: [
    {
      code: 'grn',
      name: 'Guilds of Ravnica',
      releasedAt: '2018-10-05',
      cardCount: 2,
      iconSvgUri: '',
      file: '',
      icon: '',
    },
  ],
}

test('shows the loaded cards and data status', async () => {
  const db = buildCardDb(manifest, (grn as Card[]).slice(0, 2))
  render(<App load={() => Promise.resolve(db)} />)
  expect(screen.getByRole('heading', { name: /mtg deck builder/i })).toBeInTheDocument()
  expect(await screen.findByText(/Loaded 2 cards from 1 set/)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '2 cards' })).toBeInTheDocument()
})

test('shows an error when data fails to load', async () => {
  render(<App load={() => Promise.reject(new Error('boom'))} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('boom')
})

test('shows a card-shaped skeleton while the data loads, then the cards', async () => {
  const db = buildCardDb(manifest, (grn as Card[]).slice(0, 2))
  let finish: (db: ReturnType<typeof buildCardDb>) => void = () => {}
  render(<App load={() => new Promise((resolve) => (finish = resolve))} />)
  const status = screen.getByRole('status')
  expect(status).toHaveTextContent('Loading cards…')
  expect(status).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByTestId('skeleton-grid').children.length).toBeGreaterThan(0)

  finish(db)
  expect(await screen.findByRole('heading', { name: '2 cards' })).toBeInTheDocument()
  expect(screen.queryByTestId('skeleton-grid')).toBeNull()
})

test('shows the initial sets while older ones load, then all of them', async () => {
  const all = (grn as Card[]).slice(0, 3)
  const initial = buildCardDb(manifest, all.slice(0, 2))
  let finish: () => void = () => {}
  render(
    <App
      load={(onPartial) => {
        onPartial?.(initial)
        return new Promise((resolve) => (finish = () => resolve(buildCardDb(manifest, all))))
      }}
    />,
  )
  expect(await screen.findByRole('heading', { name: '2 cards' })).toBeInTheDocument()
  expect(screen.getByTestId('results-note')).toHaveTextContent('Loading older sets…')
  expect(screen.getByTestId('data-status')).toHaveTextContent('Loading older sets…')

  finish()
  expect(await screen.findByRole('heading', { name: '3 cards' })).toBeInTheDocument()
  expect(screen.getByTestId('results-note')).toBeEmptyDOMElement()
  expect(screen.getByTestId('data-status')).not.toHaveTextContent('Loading')
})

test('if only the older sets fail, the initial ones stay usable', async () => {
  const initial = buildCardDb(manifest, (grn as Card[]).slice(0, 2))
  render(
    <App
      load={(onPartial) => {
        onPartial?.(initial)
        return Promise.reject(new Error('offline'))
      }}
    />,
  )
  expect(await screen.findByRole('heading', { name: '2 cards' })).toBeInTheDocument()
  expect(await screen.findByText(/Older sets couldn’t load \(Error: offline\)/)).toBeInTheDocument()
  expect(screen.queryByRole('alert')).toBeNull()
})
