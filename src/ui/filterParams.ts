import type { Color, Rarity } from '../domain/card'
import {
  CARD_TYPES,
  COLORS,
  GUILDS,
  RARITIES,
  type CardFilter,
  type CardType,
  type Guild,
  type SortKey,
} from '../domain/search'

/**
 * Serializes the browser state to short, readable query params so searches
 * are shareable and work with back/forward, e.g. `?c=UR&cm=exact&r=rare&sort=price`.
 */
export interface BrowseState {
  filter: CardFilter
  sort: SortKey
}

const SORTS: SortKey[] = ['number', 'name', 'cmc', 'price', 'rarity']

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])
const pick = <T extends string>(values: string[], allowed: readonly T[]) =>
  values.filter((v): v is T => (allowed as readonly string[]).includes(v))
const num = (v: string | null) => {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export function stateFromParams(p: URLSearchParams): BrowseState {
  const filter: CardFilter = {}
  const text = p.get('q')
  if (text) filter.text = text

  const colors = pick((p.get('c') ?? '').toUpperCase().split(''), COLORS) as Color[]
  if (colors.length) filter.colors = colors
  if (p.get('cm') === 'exact') filter.colorMode = 'exact'
  if (p.get('cl') === '1') filter.colorless = true
  if (p.get('m') === '1') filter.multicolor = true

  const guild = p.get('g')
  if (guild && guild in GUILDS) filter.guild = guild as Guild

  const types = pick(list(p.get('t')), CARD_TYPES) as CardType[]
  if (types.length) filter.types = types
  const rarities = pick(list(p.get('r')), RARITIES) as Rarity[]
  if (rarities.length) filter.rarities = rarities

  const cmcMin = num(p.get('cmin'))
  const cmcMax = num(p.get('cmax'))
  if (cmcMin != null) filter.cmcMin = cmcMin
  if (cmcMax != null) filter.cmcMax = cmcMax

  const sets = list(p.get('s'))
  if (sets.length) filter.sets = sets

  const sort = pick([p.get('sort') ?? ''], SORTS)[0] ?? 'number'
  return { filter, sort }
}

export function stateToParams({ filter: f, sort }: BrowseState): URLSearchParams {
  const p = new URLSearchParams()
  if (f.text?.trim()) p.set('q', f.text.trim())
  if (f.colors?.length) p.set('c', COLORS.filter((c) => f.colors!.includes(c)).join(''))
  if (f.colorMode === 'exact') p.set('cm', 'exact')
  if (f.colorless) p.set('cl', '1')
  if (f.multicolor) p.set('m', '1')
  if (f.guild) p.set('g', f.guild)
  if (f.types?.length) p.set('t', f.types.join(','))
  if (f.rarities?.length) p.set('r', f.rarities.join(','))
  if (f.cmcMin != null) p.set('cmin', String(f.cmcMin))
  if (f.cmcMax != null) p.set('cmax', String(f.cmcMax))
  if (f.sets?.length) p.set('s', f.sets.join(','))
  if (sort !== 'number') p.set('sort', sort)
  return p
}
