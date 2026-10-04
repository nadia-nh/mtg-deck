import { expect, test } from '@playwright/test'
import { manifest, totalCards } from './manifest'

test('loads every set in the data snapshot', async ({ page }) => {
  await page.goto('/')
  const n = manifest.sets.length
  await expect(page.getByTestId('data-status')).toContainText(
    `Loaded ${totalCards} cards from ${n} ${n === 1 ? 'set' : 'sets'}`,
  )
  for (const s of manifest.sets) {
    await expect(page.getByTestId('data-status')).toContainText(s.name)
  }
})
