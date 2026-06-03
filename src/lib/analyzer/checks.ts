import type {Cover, PageExtract, TextRun, DocMetaLeak} from './extract'
import type {BBox, CheckId, CoverKind, Finding, WidthAnalysis} from './types'
import {MIN_COVERAGE} from './constants'
import {height, intersection, sameLine, width} from './geometry'

/**
 * pdf.js merges adjacent glyphs into long line-runs, so a redaction box usually
 * sits over only PART of a run. We map each word's character range to an
 * approximate x-extent within the run (proportional to the run's width) and keep
 * only words whose extent substantially overlaps the box — so we report the
 * words that were hidden without grabbing neighbours just outside the box.
 */
function clipRunToBox(run: TextRun, box: BBox): string {
  const str = run.str
  const len = str.length
  const rx0 = run.bbox[0]
  const rw = width(run.bbox)
  if (len === 0) return ''
  if (rw <= 0) return str.trim()
  const xOf = (charIdx: number) => rx0 + (charIdx / len) * rw
  const kept: string[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(str)) !== null) {
    const a = m.index
    const b = a + m[0].length
    const wx0 = xOf(a)
    const wx1 = xOf(b)
    const overlap = Math.min(wx1, box[2]) - Math.max(wx0, box[0])
    if (overlap > 0 && overlap / Math.max(1, wx1 - wx0) >= 0.4) kept.push(m[0])
  }
  return kept.join(' ').replace(/^[\s.,;:'"()–—-]+|[\s.,;:'"()–—-]+$/g, '')
}

/**
 * Recover the text under a cover from all runs it overlaps, in reading order.
 * Returns '' for right-to-left / vertical runs: pdf.js returns those in display
 * order, so our left-to-right index mapping would present a scrambled string —
 * better to flag the leak without claiming verbatim content.
 */
function recoverUnder(runs: TextRun[], box: BBox): string {
  if (runs.some((r) => r.dir !== 'ltr')) return ''
  return [...runs]
    .sort((a, b) => a.bbox[0] - b.bbox[0])
    .map((r) => clipRunToBox(r, box))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function leakCheckId(kind: CoverKind, hasLargeImage: boolean): CheckId {
  if (
    kind === 'redact-annot' ||
    kind === 'square-annot' ||
    kind === 'highlight-annot'
  ) {
    return 'removable-annotation'
  }
  if (kind === 'image-cover' || hasLargeImage) return 'ocr-layer-leak'
  return 'superficial-mark'
}

function describeLeak(
  check: CheckId,
  kind: CoverKind
): {title: string; detail: string} {
  switch (check) {
    case 'removable-annotation':
      return {
        title: 'Removable redaction mark',
        detail:
          'This black box is an annotation sitting on top of the page, not part of it. Anyone can drag it off — or just copy the text straight out from underneath.',
      }
    case 'ocr-layer-leak':
      return {
        title: 'Hidden text layer under a scan',
        detail:
          'The page looks like a scanned image, but it carries an invisible, searchable text layer underneath the mark. The words behind the box are still readable.',
      }
    default:
      return {
        title: 'Text is still under the box',
        detail:
          'A black box was drawn over this text, but the text itself was never removed. It stays selectable, searchable, and copy-pasteable.',
      }
  }
}

/** Build the word-size analysis payload for a "clean" inline redaction box. */
function analyzeWordSize(cover: Cover, runs: TextRun[]): WidthAnalysis | null {
  const box = cover.bbox
  const boxWidthPt = width(box)
  if (boxWidthPt <= 1) return null

  // Neighbours: non-whitespace runs sharing the box's text line.
  const lineRuns = runs.filter(
    (r) => !r.isWhitespace && sameLine(r.bbox, box) && r.str.trim().length > 0
  )
  if (lineRuns.length === 0) return null

  // Representative font from the nearest neighbour.
  const ref = [...lineRuns].sort(
    (a, b) => distToBox(a.bbox, box) - distToBox(b.bbox, box)
  )[0]
  if (!ref) return null

  // The box must be a plausible inline word slot, not a tall logo block or a
  // thin rule that merely crosses a text line.
  if (
    height(box) < ref.fontSizePt * 0.5 ||
    height(box) > ref.fontSizePt * 2.2
  ) {
    return null
  }

  // Require a word immediately adjacent (a genuine inline gap). The far-side
  // slack is font-relative (~1 em), NOT the box's own width — otherwise a wide
  // box would treat text a whole box-width away as "adjacent".
  const gap = Math.max(6, ref.fontSizePt * 0.5)
  const slack = Math.max(4, ref.fontSizePt)
  const hasLeft = lineRuns.some(
    (r) => r.bbox[2] <= box[0] + gap && r.bbox[2] >= box[0] - slack
  )
  const hasRight = lineRuns.some(
    (r) => r.bbox[0] >= box[2] - gap && r.bbox[0] <= box[2] + slack
  )
  if (!hasLeft && !hasRight) return null

  // Calibrate average glyph width from same-font line text.
  const sameFont = lineRuns.filter(
    (r) =>
      r.fontClass === ref.fontClass &&
      Math.abs(r.fontSizePt - ref.fontSizePt) < 1.5
  )
  let totalW = 0
  let totalChars = 0
  let sampleText = ''
  let sampleWidthPt = 0
  for (const r of sameFont) {
    const chars = r.str.replace(/\s/g, '').length
    if (chars === 0) continue
    totalW += width(r.bbox)
    totalChars += chars
    if (r.str.trim().length > sampleText.length) {
      sampleText = r.str.trim()
      sampleWidthPt = width(r.bbox)
    }
  }
  if (totalChars < 2 || totalW <= 0) return null
  const avgGlyphWidthPt = totalW / totalChars

  const minChars = Math.max(1, Math.floor((boxWidthPt / avgGlyphWidthPt) * 0.8))
  const maxChars = Math.max(
    minChars,
    Math.ceil((boxWidthPt / avgGlyphWidthPt) * 1.25)
  )

  // Likely-numeric if the neighbours are dominated by digits/currency.
  const neighbourText = lineRuns.map((r) => r.str).join('')
  const isLikelyNumeric =
    /[\d$£€%]/.test(neighbourText) &&
    (neighbourText.match(/\d/g)?.length ?? 0) >=
      neighbourText.replace(/\s/g, '').length * 0.3

  return {
    boxWidthPt,
    fontFamily: ref.fontFamily,
    fontClass: ref.fontClass,
    fontSizePt: ref.fontSizePt,
    avgGlyphWidthPt,
    charCountRange: [minChars, maxChars],
    isLikelyNumeric,
    calibration:
      sampleText.length > 0 && sampleWidthPt > 0
        ? {sampleText, sampleWidthPt}
        : null,
  }
}

function distToBox(a: BBox, b: BBox): number {
  const ax = (a[0] + a[2]) / 2
  const bx = (b[0] + b[2]) / 2
  return Math.abs(ax - bx)
}

/** Run the per-page covers/text checks (1, 2, 3, 5). */
export function checkPage(extract: PageExtract, deadline?: number): Finding[] {
  const findings: Finding[] = []
  let idx = 0
  let i = 0

  for (const cover of extract.covers) {
    // Bail out if the overall analysis deadline has passed (a crafted page with
    // thousands of covers could otherwise spin this O(covers×runs) loop).
    if (deadline && (i++ & 31) === 0 && Date.now() > deadline) break

    const coverW = width(cover.bbox)
    // Runs that share the cover's line and overlap it horizontally.
    const overlapping = extract.runs.filter((r) => {
      if (r.isWhitespace) return false
      if (!sameLine(r.bbox, cover.bbox)) return false
      return intersection(r.bbox, cover.bbox) !== null
    })
    // Fraction of the cover's WIDTH that sits on top of text, via merged
    // x-intervals. Width-based (not area-based) so a cover taller than the text
    // line still scores correctly instead of being diluted by its own height.
    const ivs = overlapping
      .map((r): [number, number] => [
        Math.max(r.bbox[0], cover.bbox[0]),
        Math.min(r.bbox[2], cover.bbox[2]),
      ])
      .filter((iv) => iv[1] > iv[0])
      .sort((a, b) => a[0] - b[0])
    let coveredW = 0
    let curEnd = -Infinity
    for (const [s, e] of ivs) {
      const start = Math.max(s, curEnd)
      if (e > start) coveredW += e - start
      curEnd = Math.max(curEnd, e)
    }
    const coverOverText = coverW > 0 ? Math.min(1, coveredW / coverW) : 0

    if (coverOverText >= MIN_COVERAGE && overlapping.length > 0) {
      // A mark with real text under it — a recoverable leak.
      const check = leakCheckId(cover.kind, extract.hasLargeImage)
      const recovered = recoverUnder(overlapping, cover.bbox)
      const {title, detail} = describeLeak(check, cover.kind)
      findings.push({
        id: `${check}-${extract.page}-${idx++}`,
        check,
        page: extract.page,
        bbox: cover.bbox,
        severity: 'leak',
        confidence: cover.kind === 'redact-annot' ? 0.98 : 0.8,
        coverKind: cover.kind,
        title,
        detail,
        recovered: recovered
          ? {text: recovered, runCount: overlapping.length}
          : undefined,
      })
      continue
    }

    // No recoverable text. Is it an inline word redaction (length leak)?
    const widthInfo = analyzeWordSize(cover, extract.runs)
    if (widthInfo) {
      findings.push({
        id: `word-size-${extract.page}-${idx++}`,
        check: 'word-size',
        page: extract.page,
        bbox: cover.bbox,
        severity: 'warning',
        confidence: 0.6,
        coverKind: cover.kind,
        title: 'This redaction leaks its length',
        detail:
          'The text under this box was removed, but the box width still reveals roughly how many characters were hidden — which narrows down what it could say.',
        width: widthInfo,
      })
      continue
    }

    // A removable annotation with no text found under it is still worth noting.
    if (cover.kind === 'redact-annot') {
      findings.push({
        id: `removable-annotation-${extract.page}-${idx++}`,
        check: 'removable-annotation',
        page: extract.page,
        bbox: cover.bbox,
        severity: 'warning',
        confidence: 0.9,
        coverKind: cover.kind,
        title: 'Un-applied redaction annotation',
        detail:
          'This page contains a redaction annotation that was never "applied". In most PDF tools the mark can simply be deleted, and any content it was meant to cover comes back.',
      })
    }
  }

  return findings
}

/** Document-level metadata and outline leaks (check 4). */
export function checkDocument(
  metadata: DocMetaLeak[],
  outlineTitles: string[]
): Finding[] {
  const findings: Finding[] = []

  metadata.forEach((leak, i) => {
    findings.push({
      id: `metadata-leak-${i}`,
      check: 'metadata-leak',
      page: 0,
      bbox: null,
      severity: 'info',
      confidence: 0.95,
      coverKind: 'none',
      title: `Metadata still names the ${leak.field.toLowerCase()}`,
      detail:
        'Even with the body redacted, the document properties still carry this field. It travels with the file and shows up in any PDF reader’s "Document Properties".',
      metaField: {field: leak.field, value: leak.value},
    })
  })

  if (outlineTitles.length > 0) {
    findings.push({
      id: 'outline-leak-0',
      check: 'outline-leak',
      page: 0,
      bbox: null,
      severity: 'info',
      confidence: 0.5,
      coverKind: 'none',
      title: 'Bookmarks may reveal redacted content',
      detail:
        'The document’s bookmarks/outline panel still lists section titles. If any of these describe content that was redacted in the body, the title gives it away.',
      metaField: {
        field: 'Bookmarks',
        value: outlineTitles.slice(0, 12).join(' · ').slice(0, 400),
      },
    })
  }

  return findings
}
