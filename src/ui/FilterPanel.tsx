import type { Color, Rarity } from '../domain/card'
import type { SetEntry } from '../data/manifest'
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
import type { BrowseState } from './filterParams'

const COLOR_NAMES: Record<Color, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}

const SORT_LABELS: Record<SortKey, string> = {
  number: 'Collector number',
  name: 'Name',
  cmc: 'Mana value',
  price: 'Price (high → low)',
  rarity: 'Rarity',
}

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const cur = list ?? []
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
  return next.length ? next : undefined
}

interface Props {
  state: BrowseState
  sets: SetEntry[]
  onChange: (next: BrowseState, opts?: { replace?: boolean }) => void
}

export function FilterPanel({ state, sets, onChange }: Props) {
  const f = state.filter
  const setFilter = (patch: Partial<CardFilter>, opts?: { replace?: boolean }) =>
    onChange({ ...state, filter: { ...f, ...patch } }, opts)
  const parseCmc = (v: string) => (v === '' ? undefined : Number(v))

  return (
    <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
      <label className="field">
        <span>Search</span>
        <input
          type="search"
          placeholder="Name, type, or rules text"
          value={f.text ?? ''}
          onChange={(e) => setFilter({ text: e.target.value || undefined }, { replace: true })}
        />
      </label>

      <fieldset>
        <legend>Colors</legend>
        <div className="color-toggles">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`pip pip-${c}`}
              aria-pressed={!!f.colors?.includes(c)}
              aria-label={COLOR_NAMES[c]}
              title={COLOR_NAMES[c]}
              onClick={() => setFilter({ colors: toggle(f.colors, c) })}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            className="pip pip-C"
            aria-pressed={!!f.colorless}
            aria-label="Colorless"
            title="Colorless"
            onClick={() => setFilter({ colorless: f.colorless ? undefined : true })}
          >
            C
          </button>
        </div>
        <div className="row">
          <label>
            <input
              type="checkbox"
              checked={f.colorMode === 'exact'}
              onChange={(e) => setFilter({ colorMode: e.target.checked ? 'exact' : undefined })}
            />
            Exactly these colors
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!f.multicolor}
              onChange={(e) => setFilter({ multicolor: e.target.checked || undefined })}
            />
            Multicolor only
          </label>
        </div>
      </fieldset>

      <label className="field">
        <span>Guild</span>
        <select
          value={f.guild ?? ''}
          onChange={(e) => setFilter({ guild: (e.target.value || undefined) as Guild | undefined })}
        >
          <option value="">Any</option>
          {Object.entries(GUILDS).map(([g, pair]) => (
            <option key={g} value={g}>
              {capitalize(g)} ({pair.join('')})
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Type</legend>
        <div className="checks">
          {CARD_TYPES.map((t) => (
            <label key={t}>
              <input
                type="checkbox"
                checked={!!f.types?.includes(t)}
                onChange={() => setFilter({ types: toggle<CardType>(f.types, t) })}
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Rarity</legend>
        <div className="checks">
          {RARITIES.map((r) => (
            <label key={r}>
              <input
                type="checkbox"
                checked={!!f.rarities?.includes(r)}
                onChange={() => setFilter({ rarities: toggle<Rarity>(f.rarities, r) })}
              />
              {capitalize(r)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Mana value</legend>
        <div className="row">
          <label className="field compact">
            <span>Min</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={f.cmcMin ?? ''}
              onChange={(e) => setFilter({ cmcMin: parseCmc(e.target.value) }, { replace: true })}
            />
          </label>
          <label className="field compact">
            <span>Max</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={f.cmcMax ?? ''}
              onChange={(e) => setFilter({ cmcMax: parseCmc(e.target.value) }, { replace: true })}
            />
          </label>
        </div>
      </fieldset>

      {sets.length > 1 && (
        <label className="field">
          <span>Set</span>
          <select
            value={f.sets?.[0] ?? ''}
            onChange={(e) => setFilter({ sets: e.target.value ? [e.target.value] : undefined })}
          >
            <option value="">All sets</option>
            {sets.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>Sort by</span>
        <select
          value={state.sort}
          onChange={(e) => onChange({ ...state, sort: e.target.value as SortKey })}
        >
          {Object.entries(SORT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="reset"
        onClick={() => onChange({ filter: {}, sort: 'number' })}
      >
        Clear filters
      </button>
    </form>
  )
}
