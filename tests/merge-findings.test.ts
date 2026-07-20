import {describe, it, expect} from 'vitest'
import {mergeAdjacentLeaks} from '@/lib/analyzer/checks'
import type {BBox, CheckId, Finding, Severity} from '@/lib/analyzer/types'

/**
 * Unit coverage for the block-merge that collapses per-line redaction findings
 * into one readable passage. The real-world Manafort case exercises this end to
 * end, but that PDF is fetched on demand and skipped in CI, so these synthetic
 * findings pin the geometry (double-spacing, columns, paragraph gaps) directly.
 */

let seq = 0
function leak(
  bbox: BBox,
  text: string,
  check: CheckId = 'superficial-mark'
): Finding {
  return {
    id: `f-${seq++}`,
    check,
    page: 1,
    bbox,
    severity: 'leak',
    confidence: 0.8,
    coverKind: 'path-fill',
    title: 'Text is still under the box',
    detail: '',
    recovered: {text, runCount: 1},
  }
}

function other(bbox: BBox, severity: Severity = 'warning'): Finding {
  return {
    id: `w-${seq++}`,
    check: 'word-size',
    page: 1,
    bbox,
    severity,
    confidence: 0.6,
    coverKind: 'path-fill',
    title: 'This redaction leaks its length',
    detail: '',
  }
}

describe('mergeAdjacentLeaks', () => {
  it('merges consecutive double-spaced lines into one passage', () => {
    // 14pt-tall boxes stacked a full box-height apart (double-spaced), same
    // left column — the Manafort shape. Expect a single merged block.
    const merged = mergeAdjacentLeaks([
      leak([72, 265, 540, 279], 'the first line of the hidden'),
      leak([72, 293, 540, 307], 'passage continues onto the second'),
      leak([72, 320, 302, 334], 'and ends here.'),
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.recovered?.text).toBe(
      'the first line of the hidden passage continues onto the second and ends here.'
    )
    // Bbox spans the whole block so the overlay frames the passage.
    expect(merged[0]!.bbox).toEqual([72, 265, 540, 334])
  })

  it('keeps a first-line indent attached to the block', () => {
    const merged = mergeAdjacentLeaks([
      leak([208, 265, 540, 279], 'indented opening'),
      leak([72, 293, 540, 307], 'flush continuation'),
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.recovered?.text).toBe(
      'indented opening flush continuation'
    )
  })

  it('does not merge across a real paragraph break (~2 line gap)', () => {
    const merged = mergeAdjacentLeaks([
      leak([72, 265, 540, 279], 'end of paragraph one'),
      leak([72, 320, 540, 334], 'start of paragraph two'),
    ])
    expect(merged).toHaveLength(2)
  })

  it('does not merge two columns on the same line', () => {
    const merged = mergeAdjacentLeaks([
      leak([72, 265, 250, 279], 'left column'),
      leak([320, 265, 500, 279], 'right column'),
    ])
    expect(merged).toHaveLength(2)
  })

  it('does not merge findings from different checks', () => {
    const merged = mergeAdjacentLeaks([
      leak([72, 265, 540, 279], 'vector fill line', 'superficial-mark'),
      leak([72, 293, 540, 307], 'ocr line', 'ocr-layer-leak'),
    ])
    expect(merged).toHaveLength(2)
  })

  it('leaves non-leak findings untouched and preserves order', () => {
    const input = [
      leak([72, 265, 540, 279], 'hidden line one'),
      leak([72, 293, 540, 307], 'hidden line two'),
      other([72, 400, 200, 414]),
    ]
    const merged = mergeAdjacentLeaks(input)
    expect(merged).toHaveLength(2)
    expect(merged[0]!.severity).toBe('leak')
    expect(merged[0]!.recovered?.text).toBe('hidden line one hidden line two')
    expect(merged[1]!.severity).toBe('warning')
  })

  it('is a no-op for a single finding', () => {
    const input = [leak([72, 265, 540, 279], 'lonely leak')]
    expect(mergeAdjacentLeaks(input)).toEqual(input)
  })
})
