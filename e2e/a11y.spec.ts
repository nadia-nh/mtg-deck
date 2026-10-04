import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const scan = (page: Parameters<typeof AxeBuilder>[0]['page']) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])

test('main page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/?g=izzet')
  await page.getByRole('button', { name: 'Add Niv-Mizzet, Parun to deck' }).click()
  const { violations } = await scan(page).analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
})

test('card detail dialog has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/?q=trophy')
  await page.getByRole('button', { name: "Assassin's Trophy", exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const { violations } = await scan(page).include('dialog').analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`list view has no violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/?g=izzet&sort=price')
    await page.getByRole('group', { name: 'View' }).getByLabel('List').check()
    await page.getByRole('button', { name: 'Add Niv-Mizzet, Parun to deck' }).click()
    const { violations } = await scan(page).include('.card-table-wrap').analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
}

test('deck panel tabs have no violations on any tab', async ({ page }) => {
  await page.goto('/?q=lava coil')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
  const panel = page.locator('.deck-panel')
  for (const name of ['Cards', 'Stats', 'Import / export']) {
    await panel.getByRole('tab', { name }).click()
    const { violations } = await scan(page).include('.deck-panel').analyze()
    expect(violations.map((v) => `${name}: ${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  }
})

test('forced dark theme has no violations', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('group', { name: 'Theme' }).getByLabel('Dark').check()
  const { violations } = await scan(page).analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
})

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' })
  test('no contrast violations', async ({ page }) => {
    await page.goto('/?g=izzet&r=rare') // includes filter chips
    const { violations } = await scan(page).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
})
