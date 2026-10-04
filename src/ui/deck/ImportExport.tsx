import { useMemo, useState } from 'react'
import type { ResolveCard } from '../../domain/deck'
import {
  parseDecklist,
  serializeDecklist,
  type ExportFormat,
  type NameResolver,
  type ParsedDecklist,
} from '../../domain/decklist'
import { useDeck } from './deckContext'

const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0)

const fileName = (deckName: string) =>
  `${
    deckName
      .replace(/[^\w\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'deck'
  }.txt`

interface Props {
  /** Used for display/export (exact names). */
  resolve: ResolveCard
  /** Used for import (forgiving: case-insensitive, DFC front faces). */
  resolveForImport: NameResolver
}

export function ImportExport({ resolve, resolveForImport }: Props) {
  const { active, create, replaceCards } = useDeck()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ParsedDecklist | null>(null)
  const [format, setFormat] = useState<ExportFormat>('arena')
  const [copied, setCopied] = useState(false)

  const exported = useMemo(
    () => serializeDecklist(active, resolve, format),
    [active, resolve, format],
  )

  const runImport = (mode: 'replace' | 'new') => {
    const parsed = parseDecklist(input, resolveForImport)
    setResult(parsed)
    const count = total(parsed.main) + total(parsed.side)
    if (count === 0) return
    if (mode === 'replace') replaceCards(parsed.main, parsed.side)
    else create(parsed.name ?? 'Imported deck', active.formatId, parsed)
    setInput('')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exported)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([exported], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName(active.name)
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <details className="import-export">
      <summary>Import / export</summary>

      <section aria-label="Import decklist">
        <label className="field">
          <span>Paste a decklist (Arena or MTGO)</span>
          <textarea
            rows={6}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'Deck\n4 Boros Challenger (GRN) 156\n...\n\nSideboard\n2 Lava Coil'}
          />
        </label>
        <div className="manager-actions">
          <button type="button" disabled={!input.trim()} onClick={() => runImport('replace')}>
            Replace this deck
          </button>
          <button type="button" disabled={!input.trim()} onClick={() => runImport('new')}>
            Import as new deck
          </button>
        </div>
        {result && (
          <div className="import-result" role="status">
            {total(result.main) + total(result.side) > 0 ? (
              <p>
                Imported {total(result.main)} main and {total(result.side)} sideboard cards.
              </p>
            ) : (
              <p>Nothing was imported.</p>
            )}
            {result.unknown.length > 0 && (
              <p>
                Not found (skipped): {result.unknown.map((u) => `${u.count} ${u.name}`).join(', ')}
              </p>
            )}
            {result.invalidLines.length > 0 && (
              <p>
                Couldn’t read line{result.invalidLines.length > 1 ? 's' : ''}{' '}
                {result.invalidLines.map((l) => `${l.lineNumber} (“${l.text}”)`).join(', ')}
              </p>
            )}
          </div>
        )}
      </section>

      <section aria-label="Export decklist">
        <label className="field">
          <span>Export format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
            <option value="arena">MTG Arena</option>
            <option value="text">Plain text / MTGO</option>
          </select>
        </label>
        <textarea
          className="export-text"
          aria-label="Exported decklist"
          rows={6}
          readOnly
          value={exported}
        />
        <div className="manager-actions">
          <button type="button" onClick={copy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button type="button" onClick={download}>
            Download .txt
          </button>
        </div>
      </section>
    </details>
  )
}
