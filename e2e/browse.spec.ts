import { expect, test, type Page } from '@playwright/test'

const count = async (page: Page) => {
  const text = await page.locator('#results-heading').textContent()
  return Number(text?.match(/\d+/)?.[0])
}

test('filters by guild and restores the full list', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#results-heading')).toHaveText('273 cards')

  await page.getByRole('combobox', { name: /^Guild/ }).selectOption('izzet')
  await expect(page).toHaveURL(/g=izzet/)
  const n = await count(page)
  expect(n).toBeGreaterThan(10)
  expect(n).toBeLessThan(273)

  const identities = await page
    .locator('.card-tile')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.identity))
  expect(identities).toHaveLength(n)
  expect(new Set(identities)).toEqual(new Set(['UR']))
  await expect(page.getByRole('img', { name: 'Niv-Mizzet, Parun' })).toBeVisible()

  // Back button undoes the filter.
  await page.goBack()
  await expect(page.locator('#results-heading')).toHaveText('273 cards')
})

test('URL params are applied on load (shareable searches)', async ({ page }) => {
  await page.goto('/?c=B&r=mythic&sort=name')
  await expect(page.getByRole('button', { name: 'Black' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Mythic')).toBeChecked()
  const names = await page
    .locator('.card-tile img')
    .evaluateAll((els) => els.map((el) => el.getAttribute('alt')!))
  expect(names.length).toBeGreaterThan(0)
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  expect(names).toContain('Doom Whisperer')
})

test('text search narrows results', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox').fill('trophy')
  await expect(page.locator('#results-heading')).toHaveText('1 card')
  await expect(page.getByRole('img', { name: "Assassin's Trophy" })).toBeVisible()
})
