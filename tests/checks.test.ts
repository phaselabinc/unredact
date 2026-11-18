import {describe, it, expect} from 'vitest'
import {checkPage} from '@/lib/analyzer/checks'
import type {PageExtract} from '@/lib/analyzer/extract'
import type {BBox} from '@/lib/analyzer/types'

function pageWithCoveredText(texts: string[]): PageExtract {
  const boxes: BBox[] = texts.map((_, i) => [
    72,
    100 + i * 28,
    272,
    114 + i * 28,
  ])
  return {
    page: 1,
    width: 612,
    height: 792,
    hasLargeImage: false,
    lightMarks: [],
    runs: texts.map((str, i) => ({
      str,
      bbox: boxes[i]!,
      fontFamily: 'Helvetica',
      fontClass: 'sans',
      fontSizePt: 12,
      isWhitespace: false,
      dir: 'ltr',
    })),
    covers: boxes.map((bbox) => ({
      bbox,
      kind: 'path-fill',
      rgb: [0, 0, 0],
      opIndex: 1,
    })),
  }
}

describe('recovered redaction labels', () => {
  it('ignores a label regardless of case and surrounding whitespace', () => {
    expect(checkPage(pageWithCoveredText(['  ReDaCtEd  ']))).toEqual([])
  })

  it('keeps a nearby leak whose text includes the word redacted', () => {
    const findings = checkPage(
      pageWithCoveredText(['REDACTED', 'redacted budget'])
    )
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      severity: 'leak',
      recovered: {text: 'redacted budget'},
    })
  })
})
