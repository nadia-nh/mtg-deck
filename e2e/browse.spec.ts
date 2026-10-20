import { expect, test, type Page } from '@playwright/test'
import { totalCards, totalUniqueNames } from './manifest'

const count = async (page: Page) => {
  const text = await page.locator('#results-heading').textContent()
  return Number(text?.match(/\d+/)?.[0])
}

test('filters by guild and restores the full list', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#results-heading')).toHaveText(
    `${totalUniqueNames.toLocaleString('en-US')} cards`,
  )

  await page.getByRole('button', { name: 'Izzet (Blue-Red)' }).click()
  await expect(page.getByRole('button', { name: 'Izzet (Blue-Red)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page).toHaveURL(/g=izzet/)
  const n = await count(page)
  expect(n).toBeGreaterThan(10)
  expect(n).toBeLessThan(totalUniqueNames)

  // The grid is virtualized: only rows near the viewport are in the page, but each tile
  // knows the full result size.
  const identities = await page
    .locator('.card-tile')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.identity))
  expect(identities.length).toBeGreaterThan(0)
  expect(identities.length).toBeLessThanOrEqual(n)
  expect(new Set(identities)).toEqual(new Set(['UR']))
  await expect(page.locator('.card-cell').first()).toHaveAttribute('aria-setsize', String(n))

  // Back button undoes the filter.
  await page.goBack()
  await expect(page.locator('#results-heading')).toHaveText(
    `${totalUniqueNames.toLocaleString('en-US')} cards`,
  )
})

test('URL params are applied on load (shareable searches)', async ({ page }) => {
  // Limited to one set so the expected card is among the first rows rendered.
  await page.goto('/?c=B&r=mythic&sort=name&s=grn')
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
  await expect(page.locator('#results-heading')).toHaveText(
    `${totalUniqueNames.toLocaleString('en-US')} cards`,
  )
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

test('the + on a tile shows on hover or keyboard focus, not while just browsing', async ({
  page,
}) => {
  await page.goto('/?q=lava coil')
  const add = page.getByRole('button', { name: 'Add Lava Coil to deck' })
  const opacity = () => add.evaluate((el) => getComputedStyle(el).opacity)
  await page.mouse.move(0, 0)
  await expect.poll(opacity).toBe('0')
  await page.getByRole('button', { name: 'Lava Coil', exact: true }).hover()
  await expect.poll(opacity).toBe('1')
  await page.mouse.move(0, 0)
  await expect.poll(opacity).toBe('0')
  await add.focus()
  await expect.poll(opacity).toBe('1')
})

test.describe('touch screens', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  test('keep the + visible on tiles', async ({ page }) => {
    await page.goto('/?q=lava coil')
    const add = page.getByRole('button', { name: 'Add Lava Coil to deck' })
    await expect.poll(() => add.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  })
})

test('the Filters toggle counts active filters, also when collapsed', async ({ page }) => {
  await page.goto('/?g=izzet&r=rare')
  const toggle = page.locator('.filters-drawer summary')
  await expect(page.getByTestId('filter-count')).toHaveText('2')
  await expect(toggle).toHaveAccessibleName('Filters 2 active')
  await toggle.click()
  await expect(page.getByRole('searchbox')).toBeHidden()
  await expect(page.getByTestId('filter-count')).toBeVisible()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.getByTestId('filter-count')).toHaveCount(0)
  await expect(toggle).toHaveAccessibleName('Filters')
})

test.describe('filter rail (H2)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('closing the filters folds them into a rail, widens the grid, and is remembered', async ({
    page,
  }) => {
    await page.goto('/?r=mythic')
    const grid = page.getByRole('list', { name: 'Cards' })
    const columns = () =>
      grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    const toggle = page.locator('.filters-drawer summary')
    await expect(page.getByRole('searchbox')).toBeVisible()
    const before = await columns()

    await toggle.click()
    await expect(page.getByRole('searchbox')).toBeHidden()
    expect((await toggle.boundingBox())!.width).toBeLessThan(64)
    await expect.poll(columns).toBeGreaterThan(before)

    await page.reload()
    await expect(page.getByRole('searchbox')).toBeHidden()
    await toggle.click()
    await expect(page.getByRole('searchbox')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('searchbox')).toBeVisible()
  })
})

test('set picker groups sets by year and shows the chosen set; rarities and types get icons', async ({
  page,
}) => {
  await page.goto('/')
  const picker = page.getByRole('combobox', { name: 'Set' })
  await expect(picker.locator('optgroup[label="2019"] option')).toContainText(['War of the Spark'])
  const years = await picker.locator('optgroup').evaluateAll((gs) => gs.map((g) => g.label))
  expect(years).toEqual([...years].sort().reverse())
  expect(years.length).toBeGreaterThan(1)

  const filters = page.getByRole('search')
  await expect(filters.locator('.set-select .set-icon')).toHaveCount(0)
  await picker.selectOption('war')
  await expect(page).toHaveURL(/s=war/)
  await expect(filters.locator('.set-select .set-icon')).toBeVisible()

  // Gems are decorative: the checkbox names stay plain.
  await expect(filters.locator('.rarity-gem')).toHaveCount(4)
  await expect(filters.getByRole('checkbox', { name: 'Mythic', exact: true })).toBeVisible()

  // Type symbols are decorative too.
  await expect(filters.locator('.type-icon[aria-hidden="true"]')).toHaveCount(7)
  await expect(filters.getByRole('checkbox', { name: 'Creature', exact: true })).toBeVisible()
})

test('list view: one row per card, sortable headers, add and open details', async ({ page }) => {
  await page.goto('/?g=izzet&r=rare&s=grn') // few enough rows that all are rendered
  const n = await count(page)
  await page.getByRole('group', { name: 'View' }).getByLabel('List').check()
  const table = page.getByRole('table', { name: 'Cards', exact: true })
  await expect(table.getByRole('row')).toHaveCount(n + 1) // + header row
  await expect(table).toHaveAttribute('aria-rowcount', String(n + 1))

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
  await expect(page.locator('#results-heading')).toHaveText(
    `${totalCards.toLocaleString('en-US')} cards`,
  )
})

test.describe('virtualized results (C3)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('only rows near the viewport are in the page; the last card is reachable', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('#results-heading')).toHaveText(
      `${totalUniqueNames.toLocaleString('en-US')} cards`,
    )
    const cells = page.locator('.card-cell')
    expect(await cells.count()).toBeLessThan(100)

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect(page.locator(`.card-cell[aria-posinset="${totalUniqueNames}"]`)).toBeVisible()
    expect(await cells.count()).toBeLessThan(100)
  })

  test('tabbing through tiles keeps rendering the next rows', async ({ page }) => {
    await page.goto('/')
    const firstTile = page.locator('.card-cell[aria-posinset="1"] .card-tile')
    await firstTile.focus()
    // Each tile has its image button and its + button; 120 Tabs ≈ 60 tiles, past the first screen.
    for (let i = 0; i < 120; i++) await page.keyboard.press('Tab')
    const pos = await page.evaluate(
      () => document.activeElement?.closest('.card-cell')?.getAttribute('aria-posinset') ?? null,
    )
    expect(Number(pos)).toBeGreaterThan(50)
  })

  test('list view virtualizes too, with the real row count for screen readers', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('group', { name: 'View' }).getByLabel('List').check()
    const table = page.getByRole('table', { name: 'Cards', exact: true })
    await expect(table).toHaveAttribute('aria-rowcount', String(totalUniqueNames + 1))
    expect(await table.locator('tbody tr:not(.spacer)').count()).toBeLessThan(150)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect(table.locator(`tr[aria-rowindex="${totalUniqueNames + 1}"]`)).toBeVisible()
  })
})
