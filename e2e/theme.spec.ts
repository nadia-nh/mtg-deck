import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const bg = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test('theme toggle forces light/dark, persists, and returns to system', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const theme = page.getByRole('group', { name: 'Theme' })
  const lightBg = await bg(page)

  await theme.getByLabel('Dark').check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const darkBg = await bg(page)
  expect(darkBg).not.toBe(lightBg)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(theme.getByLabel('Dark')).toBeChecked()
  expect(await bg(page)).toBe(darkBg)

  // System follows the OS setting again.
  await theme.getByLabel('System').check()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/)
  expect(await bg(page)).toBe(lightBg)
  await page.emulateMedia({ colorScheme: 'dark' })
  expect(await bg(page)).toBe(darkBg)

  // Forcing light wins over a dark OS.
  await theme.getByLabel('Light').check()
  expect(await bg(page)).toBe(lightBg)
})

test.describe('phones', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the theme sits behind one button that opens a popover', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    const button = page.getByRole('button', { name: 'Theme: System' })
    const theme = page.getByRole('group', { name: 'Theme' })
    await expect(theme).toBeHidden()
    // The view switch keeps its words now there's room.
    await expect(page.getByRole('navigation', { name: 'Main view' })).toContainText('Browse')

    await button.click()
    await theme.getByLabel('Dark').check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.app-header')
      .analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
    await page.keyboard.press('Escape')
    await expect(theme).toBeHidden()
    await expect(page.getByRole('button', { name: 'Theme: Dark' })).toBeVisible()
  })

  test('the header fits a 320px screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/')
    await expect(page.getByRole('button', { name: /^Theme:/ })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})
