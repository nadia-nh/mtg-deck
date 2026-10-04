import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Tabs } from './Tabs'
import { nextTabIndex } from './tabKeys'

describe('nextTabIndex', () => {
  test.each([
    ['ArrowRight', 0, 1],
    ['ArrowRight', 2, 0], // wraps
    ['ArrowLeft', 0, 2], // wraps
    ['ArrowLeft', 2, 1],
    ['Home', 2, 0],
    ['End', 0, 2],
    ['Enter', 1, undefined],
  ])('%s from %i → %s', (key, from, to) => {
    expect(nextTabIndex(key, from, 3)).toBe(to)
  })
})

describe('Tabs', () => {
  const setup = () =>
    render(
      <Tabs
        label="Deck"
        tabs={[
          { id: 'a', label: 'Cards', content: <p>cards panel</p> },
          { id: 'b', label: 'Stats', content: <p>stats panel</p> },
          { id: 'c', label: 'Import / export', content: <p>io panel</p> },
        ]}
      />,
    )

  test('first tab is selected and its panel is labelled by it', () => {
    setup()
    const tab = screen.getByRole('tab', { name: 'Cards' })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Cards' })).toHaveTextContent('cards panel')
    expect(screen.getByRole('tab', { name: 'Stats' })).toHaveAttribute('tabindex', '-1')
  })

  test('click and arrow keys select tabs and move focus', () => {
    setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Stats' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('stats panel')

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Stats' }), { key: 'ArrowRight' })
    const io = screen.getByRole('tab', { name: 'Import / export' })
    expect(io).toHaveAttribute('aria-selected', 'true')
    expect(io).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('io panel')

    fireEvent.keyDown(io, { key: 'Home' })
    expect(screen.getByRole('tab', { name: 'Cards' })).toHaveFocus()
    expect(screen.getByText('io panel')).not.toBeVisible() // hidden, but kept mounted
  })
})
