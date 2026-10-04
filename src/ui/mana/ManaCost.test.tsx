import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ManaCost, RulesText } from './ManaCost'

test('ManaCost renders one symbol per pip with a combined label', () => {
  const { container } = render(<ManaCost cost="{1}{R}{W}" />)
  expect(screen.getByRole('img', { name: '1 generic, red, white' })).toBeInTheDocument()
  expect(container.querySelectorAll('i.ms')).toHaveLength(3)
  expect(container.querySelector('i.ms-rw, i.ms-r')).not.toBeNull()
})

test('ManaCost renders nothing for lands', () => {
  const { container } = render(<ManaCost cost="" />)
  expect(container).toBeEmptyDOMElement()
})

test('RulesText labels each inline symbol', () => {
  const { container } = render(
    <p>
      <RulesText text="{T}: Add {U} or {R}." />
    </p>,
  )
  expect(screen.getByRole('img', { name: 'tap' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'blue' })).toBeInTheDocument()
  expect(container.textContent).toBe(': Add  or .')
})
