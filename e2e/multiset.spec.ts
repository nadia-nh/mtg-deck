import { expect, test } from '@playwright/test'
import { manifest } from './manifest'

test.skip(manifest.sets.length < 2, 'needs at least two sets')

test('set filter limits results to one set', async ({ page }) => {
  await page.goto('/')
  const set = manifest.sets[0]
  await page.getByRole('combobox', { name: /^Set/ }).selectOption(set.code)
  await expect(page).toHaveURL(new RegExp(`s=${set.code}`))
  await expect(page.locator('#results-heading')).toHaveText(`${set.cardCount} cards`)
  const sets = await page
    .locator('.card-tile')
    .evaluateAll((els) => [...new Set(els.map((el) => (el as HTMLElement).dataset.set))])
  expect(sets).toEqual([set.code])
})

test('a deck mixing GRN and RNA cards validates in Pioneer', async ({ page }) => {
  await page.goto('/')
  const panel = page.locator('.deck-panel')
  await panel.getByText('Import / export').click()
  await panel.getByRole('textbox', { name: /Paste a decklist/ }).fill(
    [
      '4 Hydroid Krasis', // RNA
      '4 Growth Spiral', // RNA
      '4 Incubation // Incongruity', // RNA split card
      '4 Breeding Pool', // RNA
      '4 Simic Guildgate', // RNA
      '4 Pelt Collector', // GRN
      '4 Kraul Harpooner', // GRN
      '4 Thought Collapse', // RNA
      '4 Quench', // RNA
      '4 Gateway Plaza', // in both sets
      '10 Forest',
      '10 Island',
    ].join('\n'),
  )
  await panel.getByRole('button', { name: 'Replace this deck' }).click()
  await expect(panel.locator('.import-result')).not.toContainText('Not found')
  await expect(page.getByTestId('deck-counts')).toHaveText('60 main · 0 side')
  await expect(page.getByTestId('validity')).toHaveText('✓ Valid for Pioneer')
})
