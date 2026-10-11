import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('switch to the deck view and back; Back returns; filters survive', async ({ page }) => {
  await page.goto('/?q=lava coil')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
  const nav = page.getByRole('navigation', { name: 'Main view' })
  await expect(nav.getByRole('link', { name: 'Browse' })).toHaveAttribute('aria-current', 'page')

  await nav.getByRole('link', { name: 'Deck' }).click()
  await expect(page).toHaveURL(/view=deck/)
  await expect(page).toHaveURL(/q=lava/)
  await expect(nav.getByRole('link', { name: 'Deck' })).toHaveAttribute('aria-current', 'page')
  const deckView = page.locator('.deck-view')
  await expect(deckView.getByRole('heading', { name: 'Main deck (1)' })).toBeVisible()
  await expect(deckView.getByRole('img', { name: 'Lava Coil' })).toBeVisible()
  await expect(page.getByRole('searchbox')).toHaveCount(0) // the browser is gone

  // Back returns to the browser with the same search.
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue('lava coil')
  await expect(page.getByRole('button', { name: 'Add Lava Coil to deck' })).toBeVisible()
  await page.goForward()
  await expect(deckView).toBeVisible()
})

test('deep link opens the deck view; clicking a card opens its details', async ({ page }) => {
  await page.goto('/?q=lava coil')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
  await page.goto('/?view=deck')
  await expect(page.locator('.deck-view').getByRole('heading', { level: 2 })).toBeVisible()
  await page.locator('.deck-view').getByRole('button', { name: 'Lava Coil', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Lava Coil' })).toBeVisible()
})

test('an empty deck view points back to the browser', async ({ page }) => {
  await page.goto('/?view=deck')
  await expect(page.locator('.deck-view')).toContainText('This deck is empty.')
  await page.getByRole('button', { name: 'Browse cards' }).click()
  await expect(page).not.toHaveURL(/view=deck/)
  await expect(page.getByRole('searchbox')).toBeVisible()
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`deck view has no accessibility violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/?q=lava coil')
    await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
    await page.goto('/?view=deck')
    await expect(page.locator('.deck-view img')).toHaveCount(1)
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
}

test.describe('stacked columns', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  const boros = {
    id: 'boros',
    name: 'Boros Aggro',
    formatId: 'pioneer',
    createdAt: '2026-10-04T00:00:00Z',
    updatedAt: '2026-10-04T00:00:00Z',
    main: {
      'Boros Challenger': 4,
      'Legion Warboss': 4,
      'Skyknight Legionnaire': 4,
      'Light of the Legion': 2,
      'Lava Coil': 4,
      'Conclave Tribunal': 4,
      'Sure Strike': 4,
      'Sacred Foundry': 4,
      'Boros Guildgate': 4,
      Mountain: 13,
      Plains: 13,
    },
    side: { 'Justice Strike': 2 },
  }

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((deck) => {
      localStorage.setItem('mtg-deck-builder:decks', JSON.stringify({ version: 1, decks: [deck] }))
      localStorage.setItem('mtg-deck-builder:active-deck', deck.id)
    }, boros)
  })

  test('column counts match the mana curve in Stats; lands get their own column', async ({
    page,
  }) => {
    await page.goto('/?view=deck')
    const columns = page.locator('.deck-view .stack')
    await expect(columns.first()).toBeVisible() // evaluateAll doesn't wait for rendering
    const fromColumns: Record<string, number> = {}
    for (const label of await columns.evaluateAll((els) =>
      els.map((el) => el.getAttribute('aria-label')!),
    )) {
      const m = label.match(/^Main deck \(\d+\): (?:MV ([^,]+)|Lands), (\d+) cards?$/)
      if (m) fromColumns[m[1] ?? 'lands'] = Number(m[2])
    }

    await page.locator('.deck-panel').getByRole('tab', { name: 'Stats' }).click()
    const curveRows = await page
      .locator('.deck-stats table tr')
      .evaluateAll((rows) =>
        rows.map((r) => [
          r.querySelector('th')!.textContent!,
          Number(r.querySelector('td')!.textContent),
        ]),
      )
    for (const [bucket, n] of curveRows) {
      expect(fromColumns[bucket as string] ?? 0, `MV ${bucket}`).toBe(n)
    }
    expect(fromColumns.lands).toBe(34)
    await expect(page.getByRole('region', { name: 'Sideboard (2): MV 2, 2 cards' })).toBeVisible()
  })

  test('−/+ appear on hover and change the count', async ({ page }) => {
    await page.goto('/?view=deck')
    // The label's total changes as cards are added, so match any count.
    const column = page.getByRole('region', { name: /^Main deck \(\d+\): MV 6,/ })
    const card = column
      .locator('.stack-card')
      .filter({ has: page.getByRole('img', { name: 'Light of the Legion' }) })
    const add = card.getByRole('button', { name: 'Add one Light of the Legion' })
    const actions = card.locator('.stack-actions')
    await expect(actions).toHaveCSS('opacity', '0')
    await card.hover({ position: { x: 30, y: 8 } })
    await expect(actions).toHaveCSS('opacity', '1')
    await add.click()
    await expect(page.getByTestId('deck-counts')).toHaveText('61 main · 2 side')
    await expect(column.getByLabel('3 copies')).toBeVisible()
    await card.getByRole('button', { name: 'Remove one Light of the Legion' }).click()
    await expect(page.getByTestId('deck-counts')).toHaveText('60 main · 2 side')
  })

  test('group by type or color, and the choice is remembered', async ({ page }) => {
    await page.goto('/?view=deck')
    const groupBy = page.getByRole('combobox', { name: 'Group by' })
    await expect(groupBy).toHaveValue('mv')
    await expect(page.getByRole('region', { name: 'Main deck (60): MV 2, 12 cards' })).toBeVisible()

    await groupBy.selectOption('type')
    await expect(
      page.getByRole('region', { name: 'Main deck (60): Creatures, 14 cards' }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Main deck (60): Lands, 34 cards' }),
    ).toBeVisible()

    await groupBy.selectOption('color')
    const multi = page.getByRole('region', { name: /^Main deck \(60\): Multicolor,/ })
    await expect(multi.getByRole('img', { name: 'Boros Challenger' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('combobox', { name: 'Group by' })).toHaveValue('color')
    await expect(multi).toBeVisible()
  })

  test('phones get the image grid instead of columns', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/?view=deck')
    await expect(page.locator('.deck-view .stack')).toHaveCount(0)
    await expect(page.getByRole('list', { name: 'Main deck (60)' })).toBeVisible()
  })
})
