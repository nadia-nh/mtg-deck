import type { Card } from './card'
import { groupEntries, type Deck, type Zone } from './deck'

/**
 * Plain-text decklists, compatible with MTG Arena and MTGO/paper lists.
 *
 * Accepted input (mix freely):
 *   Deck                         <- section headers (Deck/Main/Sideboard/Companion...)
 *   4 Boros Challenger (GRN) 156 <- Arena: set code + collector number are optional
 *   4x Lava Coil                 <- "x" after the count is fine
 *   SB: 2 Divine Visitation      <- MTGO-style sideboard prefix
 *   // comments and # comments are ignored
 * Without headers, a blank line after the main deck starts the sideboard.
 */

/** Maps any user-typed name to the app's canonical card name, or undefined. */
export type NameResolver = (name: string) => Card | undefined

export interface ParsedDecklist {
  name?: string
  main: Record<string, number>
  side: Record<string, number>
  /** Names that couldn't be matched to a card, with total copies requested. */
  unknown: { name: string; count: number }[]
  /** Lines that weren't a header, comment, or "N Card Name". */
  invalidLines: { lineNumber: number; text: string }[]
}

const HEADERS: Record<string, Zone | 'ignore'> = {
  deck: 'main',
  main: 'main',
  maindeck: 'main',
  'main deck': 'main',
  mainboard: 'main',
  sideboard: 'side',
  side: 'side',
  sb: 'side',
  // Arena exports a companion separately; in paper it lives in the sideboard.
  companion: 'side',
  commander: 'ignore',
  about: 'ignore',
}

const LINE = /^(SB:\s*)?(\d+)\s*x?\s+(.+?)(?:\s+\(([A-Za-z0-9]{2,6})\)(?:\s+[\w★-]+)?)?\s*$/i

const normalizeName = (s: string) => s.replace(/\s+\/{2,3}\s+/g, ' // ').trim()

export function parseDecklist(text: string, resolve: NameResolver): ParsedDecklist {
  const result: ParsedDecklist = { main: {}, side: {}, unknown: [], invalidLines: [] }
  const unknown = new Map<string, number>()
  let zone: Zone | 'ignore' = 'main'
  let sawHeader = false
  let sawMainCards = false

  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  lines.forEach((raw, i) => {
    const line = raw.trim()

    if (!line) {
      // MTGO convention: blank line separates main from sideboard.
      if (!sawHeader && sawMainCards && zone === 'main') zone = 'side'
      return
    }
    if (line.startsWith('//') || line.startsWith('#')) return

    const header = HEADERS[line.toLowerCase().replace(/:$/, '')]
    if (header) {
      zone = header
      sawHeader = true
      return
    }

    // Arena "About" section: "Name My Deck".
    if (zone === 'ignore') {
      const nameLine = line.match(/^Name\s+(.+)$/i)
      if (nameLine) result.name = nameLine[1].trim()
      return
    }

    const m = line.match(LINE)
    if (!m) {
      result.invalidLines.push({ lineNumber: i + 1, text: line })
      return
    }
    const [, sbPrefix, countStr, rawName] = m
    const count = Number(countStr)
    if (count <= 0) return
    const target: Zone = sbPrefix ? 'side' : zone
    if (target === 'main') sawMainCards = true

    const card = resolve(normalizeName(rawName))
    if (!card) {
      const key = normalizeName(rawName)
      unknown.set(key, (unknown.get(key) ?? 0) + count)
      return
    }
    result[target][card.name] = (result[target][card.name] ?? 0) + count
  })

  result.unknown = [...unknown].map(([name, count]) => ({ name, count }))
  return result
}

export type ExportFormat = 'arena' | 'text'

export function serializeDecklist(
  deck: Deck,
  resolve: (name: string) => Card | undefined,
  format: ExportFormat,
): string {
  const linesFor = (zone: Zone) =>
    groupEntries(deck, zone, resolve).flatMap(({ entries }) =>
      entries.map(({ name, count, card }) =>
        format === 'arena' && card
          ? `${count} ${name} (${card.set.toUpperCase()}) ${card.collectorNumber}`
          : `${count} ${name}`,
      ),
    )

  const main = linesFor('main')
  const side = linesFor('side')
  if (format === 'arena') {
    const parts = ['Deck', ...main]
    if (side.length) parts.push('', 'Sideboard', ...side)
    return parts.join('\n') + '\n'
  }
  const parts = [...main]
  if (side.length) parts.push('', ...side)
  return parts.join('\n') + '\n'
}
