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
