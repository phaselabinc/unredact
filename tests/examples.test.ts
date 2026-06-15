import {describe, it, expect} from 'vitest'
import {existsSync, readFileSync} from 'node:fs'
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

describe('phaselaw-style exports with exemption reasons displayed', () => {
  // This export applies its redactions (the text is removed) and then prints
  // the exemption reason in white on top of each black box. That overlay text
  // is visible by design and must not be read as a failed redaction.
  // The file lives in examples/real-world/ (gitignored, not committed), so
  // this runs only when present locally; the committed synthetic fixture
  // 10-exemption-overlay.pdf covers the same behavior in CI.
  const pipPath = `${examplesDir}/real-world/Elsa Dubios PIP DRAFT.pdf`
  const run = existsSync(pipPath) ? it : it.skip
  run(
    'does not flag the visible reason text painted over the boxes',
    async () => {
      const data = new Uint8Array(readFileSync(pipPath))
      const {summary} = await analyzeBuffer(data)
      expect(summary.leakCount).toBe(0)
      expect(summary.warningCount).toBe(0)
      expect(summary.checksTriggered).not.toContain('superficial-mark')
      // The body is properly redacted and document-level metadata/outline
      // checks are disabled, so the Title and bookmarks no longer count: clean A.
      expect(summary.grade).toBe('A')
    }
  )
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
