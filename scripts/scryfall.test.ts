import { expect, test, vi } from 'vitest'
import { createClient, type FetchLike, type ScryfallSet } from './scryfall'

const response = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
  text: async () => String(body),
})

const war: ScryfallSet = {
  code: 'war',
  name: 'War of the Spark',
  released_at: '2019-05-03',
  card_count: 311,
  icon_svg_uri: 'https://svgs.scryfall.io/sets/war.svg?1',
}

test('getSetCards follows pagination and sends identifying headers', async () => {
  const pages: Record<string, unknown> = {
    first: { data: [{ id: 'a' }, { id: 'b' }], has_more: true, next_page: 'page2' },
    page2: { data: [{ id: 'c' }], has_more: false },
  }
  const fetchFn = vi.fn<FetchLike>(async (url) =>
    response(url === 'page2' ? pages.page2 : pages.first),
  )

  const cards = await createClient(fetchFn, 0).getSetCards('grn')

  expect(cards.map((c) => c.id)).toEqual(['a', 'b', 'c'])
  expect(fetchFn).toHaveBeenCalledTimes(2)
  expect(fetchFn.mock.calls[0][0]).toContain('q=e%3Agrn')
  expect(fetchFn.mock.calls[0][1]?.headers).toMatchObject({
    'User-Agent': expect.any(String),
    Accept: 'application/json',
  })
})

test('throws on HTTP errors', async () => {
  const fetchFn: FetchLike = async () => response({}, 404)
  await expect(createClient(fetchFn, 0).getSet('nope')).rejects.toThrow(/404/)
})

test('getSetIcon downloads the SVG with identifying headers', async () => {
  const svg = '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>'
  const fetchFn = vi.fn<FetchLike>(async () => response(svg))

  await expect(createClient(fetchFn, 0).getSetIcon(war)).resolves.toBe(svg)
  expect(fetchFn.mock.calls[0][0]).toBe(war.icon_svg_uri)
  expect(fetchFn.mock.calls[0][1]?.headers).toMatchObject({
    'User-Agent': expect.any(String),
    Accept: 'image/svg+xml',
  })
})

test('getSetIcon rejects responses that are not SVG', async () => {
  const fetchFn: FetchLike = async () => response('<html>blocked</html>')
  await expect(createClient(fetchFn, 0).getSetIcon(war)).rejects.toThrow(/Not an SVG/)
})
