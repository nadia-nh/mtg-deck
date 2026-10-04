import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import type { SetManifest } from '../src/data/manifest'
import manifestJson from '../public/data/manifest.json'

const manifest: SetManifest = manifestJson

// Set symbols are self-hosted; a set without its SVG would show no icon in the UI.
test.each(manifest.sets.map((s) => [s.code, s] as const))(
  'set %s has a self-hosted SVG icon',
  (code, set) => {
    expect(set.icon).toBe(`sets/${code}.svg`)
    expect(readFileSync(`public/data/${set.icon}`, 'utf8')).toMatch(/<svg[\s>]/)
  },
)
