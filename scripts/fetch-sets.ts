/**
 * Snapshot card data from Scryfall into public/data.
 *
 *   npm run fetch-data
 *
 * To add a set: put its code in sets.config.json and rerun.
 * Output:
 *   public/data/manifest.json      – list of sets + fetch time
 *   public/data/sets/<code>.json   – normalized Card[] for that set
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeCard, type Card } from '../src/domain/card'
import type { SetManifest } from '../src/data/manifest'
import { createClient } from './scryfall'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'data')

/** Behind a corporate/sandbox proxy, route fetch through it. No-op otherwise. */
async function enableProxyIfConfigured() {
  if (process.env.HTTPS_PROXY || process.env.https_proxy) {
    const { EnvHttpProxyAgent, setGlobalDispatcher } = await import('undici')
    setGlobalDispatcher(new EnvHttpProxyAgent())
  }
}

async function main() {
  await enableProxyIfConfigured()
  const codes: string[] = JSON.parse(await readFile(join(root, 'sets.config.json'), 'utf8'))
  const client = createClient(fetch)
  await mkdir(join(outDir, 'sets'), { recursive: true })

  const manifest: SetManifest = { fetchedAt: new Date().toISOString(), sets: [] }

  for (const code of codes) {
    const set = await client.getSet(code)
    const raw = await client.getSetCards(code)
    const cards: Card[] = raw.map(normalizeCard)

    if (cards.length !== set.card_count) {
      console.warn(
        `⚠ ${code}: fetched ${cards.length} cards but Scryfall reports ${set.card_count}`,
      )
    }

    await writeFile(join(outDir, 'sets', `${code}.json`), JSON.stringify(cards))
    manifest.sets.push({
      code: set.code,
      name: set.name,
      releasedAt: set.released_at,
      cardCount: cards.length,
      iconSvgUri: set.icon_svg_uri,
      file: `sets/${code}.json`,
    })
    console.log(`✓ ${set.name} (${code}): ${cards.length} cards`)
  }

  manifest.sets.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Wrote ${join('public', 'data', 'manifest.json')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
