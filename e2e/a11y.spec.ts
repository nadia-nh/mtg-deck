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
    await page.goto('/')
    const { violations } = await scan(page).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
})
