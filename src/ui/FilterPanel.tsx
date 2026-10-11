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
} from '../domain/search'
import { COLOR_NAMES } from '../domain/describeFilter'
import type { BrowseState } from './filterParams'

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
              className="symbol-toggle"
              aria-pressed={!!f.colors?.includes(c)}
              aria-label={COLOR_NAMES[c]}
              title={COLOR_NAMES[c]}
              onClick={() => setFilter({ colors: toggle(f.colors, c) })}
            >
              <i className={`ms ms-cost ms-${c.toLowerCase()}`} aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            className="symbol-toggle"
            aria-pressed={!!f.colorless}
            aria-label="Colorless"
            title="Colorless"
            onClick={() => setFilter({ colorless: f.colorless ? undefined : true })}
          >
            <i className="ms ms-cost ms-c" aria-hidden="true" />
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

      <fieldset>
        <legend>Guild</legend>
        <div className="guild-toggles">
          {(Object.entries(GUILDS) as [Guild, readonly Color[]][]).map(([g, pair]) => {
            const label = `${capitalize(g)} (${pair.map((c) => COLOR_NAMES[c]).join('-')})`
            return (
              <button
                key={g}
                type="button"
                className="symbol-toggle guild"
                aria-pressed={f.guild === g}
                aria-label={label}
                title={label}
                onClick={() => setFilter({ guild: f.guild === g ? undefined : g })}
              >
                <i className={`ms ms-guild-${g}`} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </fieldset>

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

      <label className="inline-check">
        <input
          type="checkbox"
          checked={!!f.allPrintings}
          onChange={(e) => setFilter({ allPrintings: e.target.checked || undefined })}
        />
        Show all printings
      </label>

      <label className="inline-check">
        <input
          type="checkbox"
          checked={!!f.owned}
          onChange={(e) => setFilter({ owned: e.target.checked || undefined })}
        />
        Owned only
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
