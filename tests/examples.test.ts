import {describe, it, expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {analyzeBuffer} from './helpers/analyzeNode'

const examplesDir = fileURLToPath(new URL('../examples', import.meta.url))

interface ManifestEntry {
  file: string
  title: string
  grade: string
  expectChecks?: string[]
  recoveredIncludes?: string[]
  minLeaks?: number
  minWarnings?: number
  expectNoLeaks?: boolean
  expectNoFindings?: boolean
  metadataLeak?: boolean
}

const manifest: ManifestEntry[] = JSON.parse(
  readFileSync(`${examplesDir}/manifest.json`, 'utf8')
)

describe('example documents are detected correctly', () => {
  for (const fx of manifest) {
    it(`${fx.file} → grade ${fx.grade} (${fx.title})`, async () => {
      const data = new Uint8Array(readFileSync(`${examplesDir}/${fx.file}`))
      const {findings, summary} = await analyzeBuffer(data)

      expect(summary.grade).toBe(fx.grade)

      if (fx.expectNoFindings) {
        expect(findings).toHaveLength(0)
      }
      if (fx.expectChecks) {
        for (const check of fx.expectChecks) {
          expect(summary.checksTriggered).toContain(check)
        }
      }
      if (fx.minLeaks !== undefined) {
        expect(summary.leakCount).toBeGreaterThanOrEqual(fx.minLeaks)
      }
      if (fx.minWarnings !== undefined) {
        expect(summary.warningCount).toBeGreaterThanOrEqual(fx.minWarnings)
      }
      if (fx.expectNoLeaks) {
        expect(summary.leakCount).toBe(0)
      }
      if (fx.metadataLeak) {
        expect(summary.metadataLeak).toBe(true)
      }
      if (fx.recoveredIncludes) {
        const recovered = findings
          .map((f) => f.recovered?.text ?? '')
          .join('  ')
        for (const word of fx.recoveredIncludes) {
          expect(recovered).toContain(word)
        }
      }
    })
  }
})

describe('the clean control never false-positives', () => {
  it('produces zero findings and an A grade', async () => {
    const data = new Uint8Array(
      readFileSync(`${examplesDir}/09-clean-control.pdf`)
    )
    const {findings, summary} = await analyzeBuffer(data)
    expect(findings).toHaveLength(0)
    expect(summary.grade).toBe('A')
    expect(summary.leakCount).toBe(0)
    expect(summary.warningCount).toBe(0)
  })
})
