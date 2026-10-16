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

test('waits and retries when Scryfall rate-limits (429) or is briefly down (5xx)', async () => {
  const statuses = [429, 503, 200]
  const fetchFn = vi.fn<FetchLike>(async () => {
    const status = statuses.shift()!
    return {
      ...response({ code: 'war' }, status),
      headers: { get: (h: string) => (h === 'Retry-After' && status === 429 ? '0' : null) },
    }
  })
  await expect(createClient(fetchFn, 0, 1).getSet('war')).resolves.toEqual({ code: 'war' })
  expect(fetchFn).toHaveBeenCalledTimes(3)
})

test('gives up after a few retries, and does not retry other errors', async () => {
  const always429 = vi.fn<FetchLike>(async () => response({}, 429))
  await expect(createClient(always429, 0, 1).getSet('war')).rejects.toThrow(/429/)
  expect(always429).toHaveBeenCalledTimes(5) // first try + 4 retries

  const notFound = vi.fn<FetchLike>(async () => response({}, 404))
  await expect(createClient(notFound, 0, 1).getSet('nope')).rejects.toThrow(/404/)
  expect(notFound).toHaveBeenCalledTimes(1)
})
