import {describe, it, expect} from 'vitest'
import {existsSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {analyzeBuffer} from './helpers/analyzeNode'

const examplesDir = fileURLToPath(new URL('../examples', import.meta.url))
const realDir = `${examplesDir}/real`

interface RealEntry {
  file: string
  title: string
  case: string
  expect: {
    grade: string
    checks: string[]
    minLeaks: number
    metadataLeak: boolean
    leakOnPages: number[]
  }
}

const manifest: {files: RealEntry[]} = JSON.parse(
  readFileSync(`${examplesDir}/real-manifest.json`, 'utf8')
)

// These real DoJ court PDFs are fetched on demand (npm run examples:real) and
// never committed. Each case runs only when its file is present locally, and is
// skipped otherwise so the suite stays green without the (sensitive) documents.
describe('real-world DoJ documents (run after `npm run examples:real`)', () => {
  for (const entry of manifest.files) {
    const path = `${realDir}/${entry.file}`
    const present = existsSync(path)
    const run = present ? it : it.skip

    run(`${entry.file} — ${entry.title}`, async () => {
      const data = new Uint8Array(readFileSync(path))
      const {findings, summary} = await analyzeBuffer(data)

      expect(summary.grade).toBe(entry.expect.grade)
      for (const check of entry.expect.checks) {
        expect(summary.checksTriggered).toContain(check)
      }
      expect(summary.leakCount).toBeGreaterThanOrEqual(entry.expect.minLeaks)
      expect(summary.metadataLeak).toBe(entry.expect.metadataLeak)
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
