/**
 * Minimal Scryfall client for the build-time data script.
 * Follows Scryfall's API rules: identify with User-Agent + Accept headers
 * and wait ~100 ms between requests. https://scryfall.com/docs/api
 * When Scryfall says "slow down" (429) or is briefly unavailable (5xx), it waits
 * (honoring Retry-After) and retries instead of abandoning a half-written snapshot.
 */
import type { ScryfallCard } from '../src/domain/card'

export const SCRYFALL = 'https://api.scryfall.com'
const HEADERS = { 'User-Agent': 'mtg-deck-builder/0.1', Accept: 'application/json' }

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean
  status: number
  headers?: { get(name: string): string | null }
  json(): Promise<unknown>
  text(): Promise<string>
}>

export interface ScryfallSet {
  code: string
  name: string
  released_at: string
  card_count: number
  icon_svg_uri: string
}

interface ScryfallList<T> {
  data: T[]
  has_more: boolean
  next_page?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const RETRIES = 4

export function createClient(fetchFn: FetchLike, delayMs = 100, retryDelayMs = 2000) {
  /** One request, retried with growing waits on 429 (rate limited) and 5xx. */
  async function request(url: string, headers: Record<string, string>) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchFn(url, { headers })
      const retryable = res.status === 429 || res.status >= 500
      if (res.ok || !retryable || attempt === RETRIES) {
        if (!res.ok) throw new Error(`Scryfall ${res.status} for ${url}`)
        await sleep(delayMs)
        return res
      }
      const after = Number(res.headers?.get('Retry-After'))
      await sleep(after > 0 ? after * 1000 : retryDelayMs * 2 ** attempt)
    }
  }

  async function get<T>(url: string): Promise<T> {
    return (await (await request(url, HEADERS)).json()) as T
  }

  return {
    getSet: (code: string) => get<ScryfallSet>(`${SCRYFALL}/sets/${code}`),

    /** The set symbol SVG markup (from `icon_svg_uri`). */
    async getSetIcon(set: ScryfallSet): Promise<string> {
      const url = set.icon_svg_uri
      const res = await request(url, { ...HEADERS, Accept: 'image/svg+xml' })
      const svg = await res.text()
      if (!/<svg[\s>]/.test(svg)) throw new Error(`Not an SVG: ${url}`)
      return svg
    },

    /** Every printing in a set, following pagination. */
    async getSetCards(code: string): Promise<ScryfallCard[]> {
      const q = encodeURIComponent(`e:${code}`)
      let url: string | undefined =
        `${SCRYFALL}/cards/search?q=${q}&unique=prints&order=set&include_extras=true`
      const cards: ScryfallCard[] = []
      while (url) {
        const page: ScryfallList<ScryfallCard> = await get(url)
        cards.push(...page.data)
        url = page.has_more ? page.next_page : undefined
      }
      return cards
    },
  }
}
