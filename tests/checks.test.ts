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

describe('recovered redaction placeholders', () => {
  it.each([
    '  ReDaCtEd  ',
    '[REDACTED]',
    '[ redacted ]',
    'XX',
    'xxx',
    '  XxX  ',
    'X X X',
    '[XXX]',
    '[ x x x ]',
  ])('ignores the placeholder %j', (text) => {
    expect(checkPage(pageWithCoveredText([text]))).toEqual([])
  })

  it.each(['redacted budget', 'XXX budget', 'Project X', 'XX-123', 'X'])(
    'keeps substantive or ambiguous text %j beside placeholders',
    (text) => {
      const findings = checkPage(
        pageWithCoveredText(['REDACTED', '[XXX]', text])
      )
      expect(findings).toHaveLength(1)
      expect(findings[0]).toMatchObject({
        severity: 'leak',
        recovered: {text},
      })
    }
  )
})
