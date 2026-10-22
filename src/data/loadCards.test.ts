import { describe, expect, test, vi } from 'vitest'
import type { Card } from '../domain/card'
import { buildCardDb, findByName, loadCards, type CardDb } from './loadCards'
import type { SetManifest } from './manifest'

const card = (over: Partial<Card>): Card =>
  ({
    id: 'x',
    name: 'X',
    set: 'grn',
    releasedAt: '2018-10-05',
    collectorNumber: '1',
    ...over,
  }) as Card

const manifest: SetManifest = {
  fetchedAt: '2026-10-03T00:00:00Z',
  sets: [
    {
      code: 'rna',
      name: 'RNA',
      releasedAt: '2019-01-25',
      cardCount: 1,
      iconSvgUri: '',
      file: 'sets/rna.json',
      icon: 'sets/rna.svg',
    },
    {
      code: 'grn',
      name: 'GRN',
      releasedAt: '2018-10-05',
      cardCount: 2,
      iconSvgUri: '',
      file: 'sets/grn.json',
      icon: 'sets/grn.svg',
    },
  ],
}

describe('buildCardDb', () => {
  test('indexes by id and groups printings by name, newest first', () => {
    const db = buildCardDb(manifest, [
      card({ id: '1', name: 'Gate', releasedAt: '2018-10-05' }),
      card({ id: '2', name: 'Gate', releasedAt: '2019-01-25', set: 'rna' }),
      card({ id: '3', name: 'Other' }),
    ])
    expect(db.byId.get('3')?.name).toBe('Other')
    expect(db.byName.get('Gate')?.map((c) => c.id)).toEqual(['2', '1'])
    expect(findByName(db, 'gate')?.id).toBe('2')
    expect(findByName(db, 'missing')).toBeUndefined()
  })
})

describe('loadCards', () => {
  test('loads manifest then every set file and merges them', async () => {
    const files: Record<string, unknown> = {
      '/d/manifest.json': manifest,
      '/d/sets/grn.json': [card({ id: 'g1' }), card({ id: 'g2' })],
      '/d/sets/rna.json': [card({ id: 'r1', set: 'rna' })],
    }
    const fetchFn = vi.fn(async (url: string) => ({
      ok: url in files,
      status: url in files ? 200 : 404,
      json: async () => files[url],
    }))
    const db = await loadCards(undefined, '/d/', fetchFn)
    expect(db.cards).toHaveLength(3)
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  test('surfaces HTTP failures', async () => {
    const fetchFn = async () => ({ ok: false, status: 500, json: async () => null })
    await expect(loadCards(undefined, '/d/', fetchFn)).rejects.toThrow(/manifest\.json.*500/)
  })
})

describe('loadCards with background sets', () => {
  const withBackground: SetManifest = {
    ...manifest,
    sets: [manifest.sets[0], { ...manifest.sets[1], background: true }],
  }
  const files: Record<string, unknown> = {
    '/d/manifest.json': withBackground,
    '/d/sets/grn.json': [card({ id: 'g1' }), card({ id: 'g2' })],
    '/d/sets/rna.json': [card({ id: 'r1', set: 'rna' })],
  }
  const fetchFn = async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => files[url],
  })

  test('hands over the initial sets first, then resolves with everything', async () => {
    const partials: CardDb[] = []
    const db = await loadCards((p) => partials.push(p), '/d/', fetchFn)
    expect(partials).toHaveLength(1)
    expect(partials[0].cards.map((c) => c.id)).toEqual(['r1'])
    expect(partials[0].manifest.sets.map((s) => s.code)).toEqual(['rna'])
    expect(db.cards.map((c) => c.id).sort()).toEqual(['g1', 'g2', 'r1'])
    expect(db.manifest.sets).toHaveLength(2)
  })

  test('the initial database is not delayed by a slow background set', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => (release = r))
    const slow = async (url: string) => {
      if (url.endsWith('grn.json')) await gate
      return fetchFn(url)
    }
    let partial: CardDb | undefined
    const done = loadCards((p) => (partial = p), '/d/', slow)
    await vi.waitFor(() => expect(partial?.cards).toHaveLength(1))
    release()
    expect((await done).cards).toHaveLength(3)
  })

  test('without background sets there is no partial step', async () => {
    const onPartial = vi.fn()
    const plain = async (url: string) =>
      url.endsWith('manifest.json')
        ? { ok: true, status: 200, json: async () => manifest }
        : fetchFn(url)
    expect((await loadCards(onPartial, '/d/', plain)).cards).toHaveLength(3)
    expect(onPartial).not.toHaveBeenCalled()
  })
})

describe('with the real GRN + RNA snapshot', () => {
  test('cards in both sets resolve to the newest printing', async () => {
    const grn = (await import('../../public/data/sets/grn.json')).default as Card[]
    const rna = (await import('../../public/data/sets/rna.json')).default as Card[]
    const db = buildCardDb(manifest, [...grn, ...rna])
    expect(db.cards).toHaveLength(grn.length + rna.length)
    expect(findByName(db, 'Mountain')?.set).toBe('rna')
    expect(findByName(db, 'Gateway Plaza')?.set).toBe('rna')
    expect(findByName(db, 'Lava Coil')?.set).toBe('grn')
    expect(db.byName.get('Mountain')?.map((c) => c.set)).toEqual(['rna', 'grn'])
  })
})

describe('comparePrintings', () => {
  test('regular printing beats a same-set alternate art, regardless of input order', () => {
    const alt = card({
      id: 'alt',
      name: 'Teferi',
      collectorNumber: '221★',
      releasedAt: '2019-05-03',
    })
    const reg = card({
      id: 'reg',
      name: 'Teferi',
      collectorNumber: '221',
      releasedAt: '2019-05-03',
    })
    const older = card({
      id: 'old',
      name: 'Teferi',
      collectorNumber: '1',
      releasedAt: '2018-01-01',
    })
    for (const order of [
      [alt, reg, older],
      [older, alt, reg],
    ]) {
      const db = buildCardDb(manifest, order)
      expect(db.byName.get('Teferi')?.map((c) => c.id)).toEqual(['reg', 'alt', 'old'])
    }
  })
})
