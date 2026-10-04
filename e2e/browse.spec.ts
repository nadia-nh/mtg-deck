import { expect, test, type Page } from '@playwright/test'
import { totalCards, totalUniqueNames } from './manifest'

const count = async (page: Page) => {
  const text = await page.locator('#results-heading').textContent()
  return Number(text?.match(/\d+/)?.[0])
}

test('filters by guild and restores the full list', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#results-heading')).toHaveText(`${totalUniqueNames} cards`)

  await page.getByRole('button', { name: 'Izzet (Blue-Red)' }).click()
  await expect(page.getByRole('button', { name: 'Izzet (Blue-Red)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page).toHaveURL(/g=izzet/)
  const n = await count(page)
  expect(n).toBeGreaterThan(10)
  expect(n).toBeLessThan(totalUniqueNames)

  const identities = await page
    .locator('.card-tile')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.identity))
  expect(identities).toHaveLength(n)
  expect(new Set(identities)).toEqual(new Set(['UR']))
  await expect(page.getByRole('img', { name: 'Niv-Mizzet, Parun' })).toBeVisible()

  // Back button undoes the filter.
  await page.goBack()
  await expect(page.locator('#results-heading')).toHaveText(`${totalUniqueNames} cards`)
})

test('URL params are applied on load (shareable searches)', async ({ page }) => {
  await page.goto('/?c=B&r=mythic&sort=name')
  await expect(page.getByRole('button', { name: 'Black', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByLabel('Mythic', { exact: true })).toBeChecked()
  const names = await page
    .locator('.card-tile img')
    .evaluateAll((els) => els.map((el) => el.getAttribute('alt')!))
  expect(names.length).toBeGreaterThan(0)
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  expect(names).toContain('Doom Whisperer')
})

test('active filter chips: remove one, then clear all', async ({ page }) => {
  await page.goto('/?g=izzet&r=rare&cmin=2&cmax=3')
  const chips = page.getByRole('list', { name: 'Active filters' })
  await expect(chips.getByRole('button')).toHaveText(['Izzet', 'Rare', 'MV 2–3'])
  const narrowed = await count(page)

  await chips.getByRole('button', { name: 'Remove filter: Rare' }).click()
  await expect(page).not.toHaveURL(/r=rare/)
  await expect(page).toHaveURL(/g=izzet/)
  await expect(page.getByLabel('Rare', { exact: true })).not.toBeChecked()
  await expect.poll(() => count(page)).toBeGreaterThan(narrowed)
  // Focus moves to the next chip so keyboard users keep their place.
  await expect(chips.getByRole('button', { name: 'Remove filter: MV 2–3' })).toBeFocused()

  // Back restores the removed chip.
  await page.goBack()
  await expect(chips.getByRole('button')).toHaveText(['Izzet', 'Rare', 'MV 2–3'])

  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(chips).toBeHidden()
  await expect(page.locator('#results-heading')).toHaveText(`${totalUniqueNames} cards`)
  await expect(page.locator('#results-heading')).toBeFocused()
  await expect(page).toHaveURL(/\/$/)
})

test('sort lives in the results toolbar and survives "Clear all"', async ({ page }) => {
  await page.goto('/?r=mythic')
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('name')
  await expect(page).toHaveURL(/sort=name/)
  const names = await page
    .locator('.card-tile img')
    .evaluateAll((els) => els.map((el) => el.getAttribute('alt')!))
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))

  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page).toHaveURL(/\?sort=name$/)
  await expect(page.getByRole('combobox', { name: 'Sort by' })).toHaveValue('name')
})

test('density toggle switches to small tiles and is remembered', async ({ page }) => {
  await page.goto('/?r=mythic')
  const grid = page.getByRole('list', { name: 'Cards' })
  const view = page.getByRole('group', { name: 'View' })
  await expect(view.getByLabel('Large cards')).toBeChecked()
  const largeWidth = (await grid.locator('.card-tile').first().boundingBox())!.width

  await view.getByLabel('Small cards').check()
  await expect(grid).toHaveAttribute('data-density', 'small')
  const smallWidth = (await grid.locator('.card-tile').first().boundingBox())!.width
  expect(smallWidth).toBeLessThan(largeWidth * 0.8)

  await page.reload()
  await expect(page.getByRole('group', { name: 'View' }).getByLabel('Small cards')).toBeChecked()
  await expect(grid).toHaveAttribute('data-density', 'small')
})

test('list view: one row per card, sortable headers, add and open details', async ({ page }) => {
  await page.goto('/?g=izzet&r=rare')
  const n = await count(page)
  await page.getByRole('group', { name: 'View' }).getByLabel('List').check()
  const table = page.getByRole('table', { name: 'Cards', exact: true })
  await expect(table.getByRole('row')).toHaveCount(n + 1) // + header row

  // Clicking a header sorts by that column, through the same URL state as the dropdown.
  await table.getByRole('button', { name: 'Price' }).click()
  await expect(page).toHaveURL(/sort=price/)
  await expect(table.getByRole('columnheader', { name: /Price/ })).toHaveAttribute(
    'aria-sort',
    'descending',
  )
  await expect(page.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price')
  const prices = await table
    .locator('tbody .row-price')
    .evaluateAll((els) => els.map((el) => Number(el.textContent!.replace(/[^\d.]/g, '') || -1)))
  expect(prices).toEqual([...prices].sort((a, b) => b - a))

  await table.getByRole('button', { name: 'Name' }).click()
  const names = await table.locator('tbody th').allTextContents()
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))

  await table.getByRole('button', { name: 'Add Niv-Mizzet, Parun to deck' }).click()
  await expect(page.getByTestId('deck-counts')).toHaveText('1 main · 0 side')
  await expect(table.getByLabel('1 in deck')).toBeVisible()

  await table.getByRole('button', { name: 'Niv-Mizzet, Parun', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Niv-Mizzet, Parun' })).toBeVisible()

  // The choice is remembered.
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByRole('table', { name: 'Cards', exact: true })).toBeVisible()
})

test('text search narrows results', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox').fill('trophy')
  await expect(page.locator('#results-heading')).toHaveText('1 card')
  await expect(page.getByRole('img', { name: "Assassin's Trophy" })).toBeVisible()
})

test('one tile per card by default; "Show all printings" shows every printing', async ({
  page,
}) => {
  await page.goto('/?q=mountain&t=Land')
  const tiles = page.locator('.card-tile')
  const one = await tiles.count()
  await page.getByLabel('Show all printings').check()
  await expect(page).toHaveURL(/p=all/)
  await expect.poll(() => tiles.count()).toBeGreaterThan(one)

  await page.goto('/')
  await page.getByLabel('Show all printings').check()
  await expect(page.locator('#results-heading')).toHaveText(`${totalCards} cards`)
})
