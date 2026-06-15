import {describe, it, expect} from 'vitest'
import {existsSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {analyzeBuffer} from './helpers/analyzeNode'

const realDir = fileURLToPath(
  new URL('../examples/real-world', import.meta.url)
)

interface RealEntry {
  file: string
  kind: 'failure' | 'control'
  title: string
  case: string
  expect: {
    grade: string
    checks: string[]
    minLeaks: number
    leakOnPages: number[]
  }
}

const manifest: {files: RealEntry[]} = JSON.parse(
  readFileSync(`${realDir}/manifest.json`, 'utf8')
)

// These famous real-world PDFs are fetched on demand (npm run examples:real) and
// never committed. Each case runs only when its file is present locally, and is
// skipped otherwise so the suite stays green without the (sensitive) documents.
describe('real-world redaction failures (run after `npm run examples:real`)', () => {
  for (const entry of manifest.files) {
    const path = `${realDir}/${entry.file}`
    const run = existsSync(path) ? it : it.skip

    run(`${entry.file} — ${entry.title}`, async () => {
      const data = new Uint8Array(readFileSync(path))
      const {findings, summary} = await analyzeBuffer(data)

      expect(summary.grade).toBe(entry.expect.grade)

      if (entry.kind === 'control') {
        // A properly-redacted real document must not trip any check.
        expect(summary.checksTriggered).toEqual([])
        expect(summary.leakCount).toBe(0)
        return
      }

      for (const check of entry.expect.checks) {
        expect(summary.checksTriggered).toContain(check)
      }
      expect(summary.leakCount).toBeGreaterThanOrEqual(entry.expect.minLeaks)
      for (const page of entry.expect.leakOnPages) {
        expect(
          findings.some(
            (f) => f.check === 'superficial-mark' && f.page === page
          )
        ).toBe(true)
      }
    })
  }
})
