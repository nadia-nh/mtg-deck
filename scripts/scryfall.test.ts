import { expect, test, vi } from 'vitest'
import { createClient, type FetchLike } from './scryfall'

test('getSetCards follows pagination and sends identifying headers', async () => {
  const pages: Record<string, unknown> = {
    first: { data: [{ id: 'a' }, { id: 'b' }], has_more: true, next_page: 'page2' },
    page2: { data: [{ id: 'c' }], has_more: false },
  }
  const fetchFn = vi.fn<FetchLike>(async (url) => ({
    ok: true,
    status: 200,
    json: async () => (url === 'page2' ? pages.page2 : pages.first),
  }))

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
  const fetchFn: FetchLike = async () => ({ ok: false, status: 404, json: async () => ({}) })
  await expect(createClient(fetchFn, 0).getSet('nope')).rejects.toThrow(/404/)
})
