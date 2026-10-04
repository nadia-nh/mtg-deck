import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import type { Card } from '../src/domain/card'
import { tokenize } from '../src/ui/mana/symbols'
import manifest from '../public/data/manifest.json'

// Every symbol in the shipped card data must map to a class the Mana font defines.
test('Mana font covers every symbol in the card data', () => {
  const css = readFileSync('node_modules/mana-font/css/mana.css', 'utf8')
  const defined = new Set([...css.matchAll(/\.(ms-[a-z0-9-]+)/g)].map((m) => m[1]))
  const missing = new Set<string>()
  for (const set of manifest.sets) {
    const cards: Card[] = JSON.parse(readFileSync(`public/data/${set.file}`, 'utf8'))
    for (const c of cards) {
      for (const t of tokenize(`${c.manaCost} ${c.oracleText}`)) {
        if (t.kind === 'symbol' && (!t.className || !defined.has(t.className))) missing.add(t.raw)
      }
    }
  }
  expect([...missing]).toEqual([])
})
