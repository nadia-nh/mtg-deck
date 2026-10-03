import { expect, test } from '@playwright/test'

test('loads the Guilds of Ravnica snapshot', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('data-status')).toContainText(
    'Loaded 273 cards from 1 set (Guilds of Ravnica)',
  )
})
