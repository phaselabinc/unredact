import type {Cover, PageExtract, TextMark, TextRun} from './extract'
import type {BBox, CheckId, CoverKind, Finding, WidthAnalysis} from './types'
import {
  LABEL_RUN_COVERAGE,
  MAX_WORD_SIZE_CHARS,
  MIN_COVERAGE,
} from './constants'
import {
  coverage,
  height,
  intersection,
  sameLine,
  union,
  width,
} from './geometry'

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
          'This black box is an annotation sitting on top of the page, not part of it. Anyone can drag it off, or just copy the text straight out from underneath.',
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

  // Require words on BOTH sides — a genuine inline gap where a single word was
  // dropped out of running text. Boxes with text on only one side are usually
  // not word redactions at all: a mark at a line's start is a classification
  // portion marking (paragraph to its right, nothing to its left), and one at a
  // line's end is a whole field like an email "From:" value (label to its left,
  // nothing to its right). Neither is a guessable word, so both are excluded.
  // The far-side slack is font-relative (~1 em), NOT the box's own width —
  // otherwise a wide box would treat text a whole box-width away as "adjacent".
  const gap = Math.max(6, ref.fontSizePt * 0.5)
  const slack = Math.max(4, ref.fontSizePt)
  const hasLeft = lineRuns.some(
    (r) => r.bbox[2] <= box[0] + gap && r.bbox[2] >= box[0] - slack
  )
  const hasRight = lineRuns.some(
    (r) => r.bbox[0] >= box[2] - gap && r.bbox[0] <= box[2] + slack
  )
  if (!hasLeft || !hasRight) return null

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

  // A width-based length estimate is only a meaningful hint for a short token.
  // Once even the low end of the estimate is longer than any plausible single
  // word, the box is a redacted phrase or field (e.g. a full "Last, First
  // <email>" line), where width narrows nothing — so don't flag it at all.
  if (minChars > MAX_WORD_SIZE_CHARS) return null

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

/**
 * Some redaction tools stamp the exemption reason in light text ON TOP of each
 * applied redaction box. That text is the opposite of hidden — it was painted
 * after the box, in a colour chosen to read against it — so reporting it as a
 * leak is wrong. A run is the visible label when the light marks drawn over
 * this cover tile most of the run's extent inside the box. Text hidden UNDER
 * the box keeps its own (earlier, darker) marks and is never excused; the
 * marks here were pre-filtered to light fills painted after this cover.
 */
function isVisibleLabelRun(
  run: TextRun,
  coverBox: BBox,
  labelMarks: TextMark[]
): boolean {
  const clip = intersection(run.bbox, coverBox)
  if (!clip) return false
  const ivs: Array<[number, number]> = []
  for (const m of labelMarks) {
    if (!sameLine(m.bbox, run.bbox)) continue
    const s = Math.max(m.bbox[0], clip[0])
    const e = Math.min(m.bbox[2], clip[2])
    if (e > s) ivs.push([s, e])
  }
  if (ivs.length === 0) return false
  ivs.sort((a, b) => a[0] - b[0])
  let covered = 0
  let curEnd = -Infinity
  for (const [s, e] of ivs) {
    const start = Math.max(s, curEnd)
    if (e > start) covered += e - start
    curEnd = Math.max(curEnd, e)
  }
  return covered / width(clip) >= LABEL_RUN_COVERAGE
}

/**
 * A poorly-redacted paragraph is almost never one big rectangle — redaction
 * tools draw one black box PER LINE, so the per-cover loop above emits one leak
 * finding per line. Left as-is, a single hidden paragraph becomes a dozen cards
 * and its recovered text is split across all of them, so a reader can't read the
 * passage back in one piece (this is exactly what the Manafort filing does).
 *
 * Merge leak findings that stack into one text block: same check, columns that
 * overlap horizontally, and a vertical gap no larger than about a line. The
 * merged finding spans the whole block (so the "show in document" overlay frames
 * the passage) and carries the recovered text joined top-to-bottom, left-to-
 * right. Non-leak findings (word-size length hints, un-applied marks) are each
 * their own thing and pass through untouched.
 */
export function mergeAdjacentLeaks(findings: Finding[]): Finding[] {
  // Repeated PDF drawing operations can detect the same box twice. Remove
  // those before joining lines so the recovered passage and counts stay unique.
  // Position is part of the key: the same words elsewhere are still a finding.
  const seen = new Map<string, number>()
  const unique: Finding[] = []
  // An annotation's appearance can also be detected as a drawn cover. Prefer
  // the annotation finding: it explains both the recovery and the removable mark.
  const evidenceRank = (f: Finding) =>
    f.coverKind.endsWith('-annot') ? 3 : f.check === 'ocr-layer-leak' ? 2 : 1
  for (const f of findings) {
    if (!f.bbox) {
      unique.push(f)
      continue
    }
    const key = JSON.stringify([
      f.page,
      f.bbox,
      f.severity,
      f.severity === 'leak' ? null : f.check,
      f.recovered?.text,
      f.width,
    ])
    const index = seen.get(key)
    if (index === undefined) {
      seen.set(key, unique.length)
      unique.push(f)
    } else if (evidenceRank(f) > evidenceRank(unique[index]!)) {
      unique[index] = f
    }
  }
  findings = unique
  const order = new Map<Finding, number>()
  findings.forEach((f, i) => order.set(f, i))

  const leaks = findings.filter((f) => f.severity === 'leak' && f.bbox)
  if (leaks.length < 2) return findings

  type Group = {items: Finding[]; bbox: BBox}
  const groups: Group[] = []

  // Two boxes belong to the same block when their columns overlap and the lower
  // one starts within about one line-pitch of the block's current bottom. The
  // horizontal test is against the NARROWER box so a short last line still
  // attaches to a wide block. The vertical gap may be slightly negative (boxes
  // that touch or overlap); the ceiling of ~1.25 line-heights admits the next
  // line of DOUBLE-spaced text (where consecutive line-boxes sit a full box-
  // height apart, as in the Manafort filing) while still excluding a real
  // paragraph break, whose blank line puts the next box ~2 pitches down.
  const continues = (block: BBox, box: BBox): boolean => {
    const overlapX = Math.min(block[2], box[2]) - Math.max(block[0], box[0])
    const minW = Math.min(width(block), width(box))
    if (minW <= 0 || overlapX < minW * 0.35) return false
    const lineH = Math.min(height(block), height(box)) || height(box)
    const gap = box[1] - block[3]
    return gap <= lineH * 1.25
  }

  // Top-to-bottom, then left-to-right — so each group accumulates in reading
  // order and its recovered text reads back in the right sequence.
  const sorted = [...leaks].sort(
    (a, b) => a.bbox![1] - b.bbox![1] || a.bbox![0] - b.bbox![0]
  )
  for (const f of sorted) {
    const box = f.bbox as BBox
    let best: Group | null = null
    for (const g of groups) {
      if (g.items[0]!.check !== f.check || g.items[0]!.page !== f.page) continue
      if (!continues(g.bbox, box)) continue
      // Prefer the closest open group (largest bottom edge above this box).
      if (!best || g.bbox[3] > best.bbox[3]) best = g
    }
    if (best) {
      best.items.push(f)
      best.bbox = union(best.bbox, box)
    } else {
      groups.push({items: [f], bbox: [...box] as BBox})
    }
  }

  const merged: Array<{finding: Finding; order: number}> = []
  for (const g of groups) {
    const rank = Math.min(...g.items.map((it) => order.get(it) ?? 0))
    const first = g.items[0]!
    if (g.items.length === 1) {
      merged.push({finding: first, order: rank})
      continue
    }
    const text = g.items
      .map((it) => it.recovered?.text?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    const runCount = g.items.reduce(
      (n, it) => n + (it.recovered?.runCount ?? 0),
      0
    )
    merged.push({
      finding: {
        ...first,
        bbox: g.bbox,
        confidence: Math.max(...g.items.map((it) => it.confidence)),
        recovered: text ? {text, runCount} : first.recovered,
      },
      order: rank,
    })
  }

  // Re-attach the untouched non-leak findings and restore document order.
  for (const f of findings) {
    if (f.severity === 'leak' && f.bbox) continue
    merged.push({finding: f, order: order.get(f) ?? 0})
  }
  merged.sort((a, b) => a.order - b.order)
  return merged.map((m) => m.finding)
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
    // Light text painted AFTER this cover and sitting mostly on it is a
    // visible overlay label (an exemption reason stamped on the box). Runs it
    // tiles are dropped from both the hidden-text and word-size analyses.
    const labelMarks = extract.lightMarks.filter(
      (m) => m.opIndex > cover.opIndex && coverage(m.bbox, cover.bbox) >= 0.5
    )
    const runs =
      labelMarks.length > 0
        ? extract.runs.filter(
            (r) => !isVisibleLabelRun(r, cover.bbox, labelMarks)
          )
        : extract.runs
    // Runs that share the cover's line and overlap it horizontally.
    const overlapping = runs.filter((r) => {
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
      // A label or repeated-X placeholder is not recovered document content.
      const placeholder = recovered.replace(/^\[\s*(.*?)\s*\]$/, '$1')
      if (/^(?:redacted|x(?:\s*x)+)$/i.test(placeholder)) continue
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
    const widthInfo = analyzeWordSize(cover, runs)
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
          'The text under this box was removed, but the box width still reveals roughly how many characters were hidden, which narrows down what it could say.',
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

  return mergeAdjacentLeaks(findings)
}
