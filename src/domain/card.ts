/**
 * Slim, app-owned card model. Everything downstream (search, decks, formats)
 * depends on this type, never on raw Scryfall JSON, so the data source can
 * change without touching the rest of the app.
 */

export type Color = 'W' | 'U' | 'B' | 'R' | 'G'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus'
export type Legality = 'legal' | 'not_legal' | 'banned' | 'restricted'

export interface CardImages {
  small: string
  normal: string
  large: string
}

export interface CardFace {
  name: string
  manaCost: string
  typeLine: string
  oracleText: string
  colors: Color[]
  power?: string
  toughness?: string
  loyalty?: string
  images?: CardImages
}

export interface Card {
  id: string
  oracleId: string
  name: string
  set: string
  setName: string
  collectorNumber: string
  releasedAt: string
  layout: string
  manaCost: string
  cmc: number
  colors: Color[]
  colorIdentity: Color[]
  typeLine: string
  oracleText: string
  power?: string
  toughness?: string
  loyalty?: string
  rarity: Rarity
  keywords: string[]
  legalities: Record<string, Legality>
  /** Front-face images (or the single face for normal cards). */
  images?: CardImages
  /** Present only for multi-face cards (transform, MDFC, split, adventure...). */
  faces?: CardFace[]
  prices: { usd: number | null; usdFoil: number | null }
  tcgplayerId?: number
  scryfallUri: string
  tcgplayerUri?: string
}

/* ---- Raw Scryfall shapes (only the fields we read) ---- */

interface ScryfallImageUris {
  small: string
  normal: string
  large: string
}

interface ScryfallFace {
  name: string
  mana_cost?: string
  type_line?: string
  oracle_text?: string
  colors?: string[]
  power?: string
  toughness?: string
  loyalty?: string
  image_uris?: ScryfallImageUris
}

export interface ScryfallCard {
  id: string
  oracle_id?: string
  name: string
  set: string
  set_name: string
  collector_number: string
  released_at: string
  layout: string
  mana_cost?: string
  cmc?: number
  colors?: string[]
  color_identity: string[]
  type_line?: string
  oracle_text?: string
  power?: string
  toughness?: string
  loyalty?: string
  rarity: string
  keywords?: string[]
  legalities: Record<string, string>
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallFace[]
  prices?: { usd?: string | null; usd_foil?: string | null }
  tcgplayer_id?: number
  scryfall_uri: string
  purchase_uris?: { tcgplayer?: string }
}

const COLOR_ORDER: Color[] = ['W', 'U', 'B', 'R', 'G']

function toColors(raw: string[] | undefined): Color[] {
  const set = new Set(raw ?? [])
  return COLOR_ORDER.filter((c) => set.has(c))
}

function toImages(raw?: ScryfallImageUris): CardImages | undefined {
  return raw ? { small: raw.small, normal: raw.normal, large: raw.large } : undefined
}

function toPrice(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

function normalizeFace(f: ScryfallFace): CardFace {
  return {
    name: f.name,
    manaCost: f.mana_cost ?? '',
    typeLine: f.type_line ?? '',
    oracleText: f.oracle_text ?? '',
    colors: toColors(f.colors),
    power: f.power,
    toughness: f.toughness,
    loyalty: f.loyalty,
    images: toImages(f.image_uris),
  }
}

export function normalizeCard(raw: ScryfallCard): Card {
  const faces = raw.card_faces?.map(normalizeFace)
  const front = faces?.[0]

  // Multi-face cards keep some fields only on faces; fall back to them.
  const colors = raw.colors ?? faces?.flatMap((f) => f.colors) ?? []
  const oracleText = raw.oracle_text ?? faces?.map((f) => f.oracleText).join('\n//\n') ?? ''

  return {
    id: raw.id,
    oracleId: raw.oracle_id ?? raw.id,
    name: raw.name,
    set: raw.set,
    setName: raw.set_name,
    collectorNumber: raw.collector_number,
    releasedAt: raw.released_at,
    layout: raw.layout,
    manaCost: raw.mana_cost ?? front?.manaCost ?? '',
    cmc: raw.cmc ?? 0,
    colors: toColors(colors),
    colorIdentity: toColors(raw.color_identity),
    typeLine: raw.type_line ?? front?.typeLine ?? '',
    oracleText,
    power: raw.power ?? front?.power,
    toughness: raw.toughness ?? front?.toughness,
    loyalty: raw.loyalty ?? front?.loyalty,
    rarity: raw.rarity as Rarity,
    keywords: raw.keywords ?? [],
    legalities: raw.legalities as Record<string, Legality>,
    images: toImages(raw.image_uris) ?? front?.images,
    faces: faces && faces.length > 1 ? faces : undefined,
    prices: { usd: toPrice(raw.prices?.usd), usdFoil: toPrice(raw.prices?.usd_foil) },
    tcgplayerId: raw.tcgplayer_id,
    scryfallUri: raw.scryfall_uri,
    tcgplayerUri: raw.purchase_uris?.tcgplayer,
  }
}

/* ---- Small helpers used across the domain ---- */

export const isBasicLand = (c: Pick<Card, 'typeLine'>) => /\bBasic\b.*\bLand\b/.test(c.typeLine)
export const isLand = (c: Pick<Card, 'typeLine'>) => /\bLand\b/.test(c.typeLine)
