import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'
import { buildCardDb } from './data/loadCards'
import type { Card } from './domain/card'
import grn from '../public/data/sets/grn.json'

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
