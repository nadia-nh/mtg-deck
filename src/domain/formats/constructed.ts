import { isBasicLand, type Card } from '../card'
import { copiesByName, zoneTotal } from '../deck'
import type { FormatRules, Issue } from './types'

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

/**
 * How many copies of this card a deck may contain, overriding the format's
 * default. Basic lands and cards like Persistent Petitioners are unlimited;
 * Seven Dwarves allows "up to seven".
 */
export function copyLimitOverride(card: Card): number | undefined {
  if (isBasicLand(card)) return Infinity
  const text = card.oracleText
  if (/A deck can have any number of cards named/i.test(text)) return Infinity
  const upTo = text.match(/A deck can have up to (\w+) cards named/i)
  if (upTo) return NUMBER_WORDS[upTo[1].toLowerCase()] ?? Number(upTo[1])
  return undefined
}

export interface ConstructedOptions {
  id: string
  name: string
  description: string
  /** Key into Card.legalities (e.g. "pioneer"). Omit to skip legality checks. */
  legalityKey?: string
  minMainDeck?: number
  maxSideboard?: number
  maxCopies?: number
}

/** 60-card constructed rules shared by Standard, Pioneer, Modern, etc. */
export function constructedFormat(opts: ConstructedOptions): FormatRules {
  const minMainDeck = opts.minMainDeck ?? 60
  const maxSideboard = opts.maxSideboard ?? 15
  const maxCopies = opts.maxCopies ?? 4

  return {
    id: opts.id,
    name: opts.name,
    description: opts.description,
    minMainDeck,
    maxSideboard,

    validate(deck, resolve) {
      const issues: Issue[] = []

      const main = zoneTotal(deck, 'main')
      if (main < minMainDeck) {
        issues.push({
          severity: 'error',
          code: 'main-too-small',
          message: `Main deck has ${main} cards; needs at least ${minMainDeck}.`,
        })
      }
      const side = zoneTotal(deck, 'side')
      if (side > maxSideboard) {
        issues.push({
          severity: 'error',
          code: 'side-too-large',
          message: `Sideboard has ${side} cards; maximum is ${maxSideboard}.`,
        })
      }

      for (const [name, copies] of copiesByName(deck)) {
        const card = resolve(name)
        if (!card) {
          issues.push({
            severity: 'warning',
            code: 'unknown-card',
            message: `“${name}” isn’t in the loaded card data, so it can’t be checked.`,
            cardName: name,
          })
          continue
        }

        const limit = copyLimitOverride(card) ?? maxCopies
        if (copies > limit) {
          issues.push({
            severity: 'error',
            code: 'too-many-copies',
            message: `${copies} copies of ${name}; maximum is ${limit}.`,
            cardName: name,
          })
        }

        if (opts.legalityKey) {
          const status = card.legalities[opts.legalityKey] ?? 'not_legal'
          if (status === 'banned') {
            issues.push({
              severity: 'error',
              code: 'banned',
              message: `${name} is banned in ${opts.name}.`,
              cardName: name,
            })
          } else if (status === 'not_legal') {
            issues.push({
              severity: 'error',
              code: 'not-legal',
              message: `${name} is not legal in ${opts.name}.`,
              cardName: name,
            })
          } else if (status === 'restricted' && copies > 1) {
            issues.push({
              severity: 'error',
              code: 'restricted',
              message: `${name} is restricted in ${opts.name}; only 1 copy allowed.`,
              cardName: name,
            })
          }
        }
      }

      return issues
    },
  }
}
