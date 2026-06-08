import type {WidthAnalysis} from './analyzer/types'

/**
 * Approximate glyph-width modelling for the interactive word-size guesser.
 *
 * This is intentionally framed to the user as *speculative*. We measure text
 * with the browser's generic serif/sans/mono font and then apply a calibration
 * factor derived from real text in the document (its true advance width vs. our
 * measurement of the same string), so absolute widths line up with the document
 * even though the exact font differs.
 */

const CSS_FAMILY: Record<WidthAnalysis['fontClass'], string> = {
  serif: 'serif',
  sans: 'sans-serif',
  mono: 'monospace',
}

let ctx: CanvasRenderingContext2D | null = null
function measureCtx(): CanvasRenderingContext2D {
  if (!ctx) {
    const canvas = document.createElement('canvas')
    const c = canvas.getContext('2d')
    if (!c) throw new Error('Canvas 2D context unavailable')
    ctx = c
  }
  return ctx
}

/** Raw measured width (px) of `text` in the given generic family at `sizePt`. */
function rawWidth(
  text: string,
  fontClass: WidthAnalysis['fontClass'],
  sizePt: number
): number {
  const c = measureCtx()
  c.font = `${sizePt}px ${CSS_FAMILY[fontClass]}`
  return c.measureText(text).width
}

/** Calibration factor mapping our raw measurement to the document's points. */
function calibrationFactor(w: WidthAnalysis): number {
  if (w.calibration && w.calibration.sampleText.length > 0) {
    const raw = rawWidth(w.calibration.sampleText, w.fontClass, w.fontSizePt)
    if (raw > 0) return w.calibration.sampleWidthPt / raw
  }
  // Fallback: match the document's measured average glyph width.
  const rawAvg = rawWidth('mnino', w.fontClass, w.fontSizePt) / 5
  return rawAvg > 0 ? w.avgGlyphWidthPt / rawAvg : 1
}

/** Estimated rendered width of `text` in the redaction's font, in points. */
export function estimateWidthPt(text: string, w: WidthAnalysis): number {
  return rawWidth(text, w.fontClass, w.fontSizePt) * calibrationFactor(w)
}

export interface GuessScore {
  estWidthPt: number
  boxWidthPt: number
  errorPt: number
  tolerancePt: number
  confidence: number // 0..1
  verdict: 'too-short' | 'too-long' | 'plausible' | 'strong'
}

/**
 * Tolerance band (pt) for "does this width fit the box". Generous on purpose:
 * we estimate width with a generic browser font calibrated from a sample, and
 * redaction boxes carry padding — so the honest precision here is ~10–15%, not
 * a few points.
 */
function tolerance(boxWidthPt: number): number {
  return Math.max(4, boxWidthPt * 0.15)
}

/**
 * Confidence (0..1) that a width fits the box. Forgiving curve: a near-exact
 * fit reads ~100% and it falls off quadratically to 0 at the tolerance edge. A
 * plain linear `1 - err/tol` over a tight band made even the *correct* word read
 * ~60%, which is misleading — the width really did fit.
 */
function confidenceFor(absErr: number, tol: number): number {
  const r = absErr / tol
  return r >= 1 ? 0 : 1 - r * r
}

/** Score how well a user-typed guess matches the redaction box width. */
export function scoreGuess(guess: string, w: WidthAnalysis): GuessScore {
  const text = guess.trimEnd()
  const estWidthPt = estimateWidthPt(text, w)
  const errorPt = estWidthPt - w.boxWidthPt
  const tol = tolerance(w.boxWidthPt)
  const absErr = Math.abs(errorPt)
  const confidence = confidenceFor(absErr, tol)
  let verdict: GuessScore['verdict']
  if (errorPt < -tol) verdict = 'too-short'
  else if (errorPt > tol) verdict = 'too-long'
  else if (absErr < tol * 0.4) verdict = 'strong'
  else verdict = 'plausible'
  return {
    estWidthPt,
    boxWidthPt: w.boxWidthPt,
    errorPt,
    tolerancePt: tol,
    confidence,
    verdict,
  }
}

export interface Candidate {
  word: string
  estWidthPt: number
  confidence: number
  source: 'document' | 'name' | 'word'
}

interface WordList {
  common: string[]
  firstNames: string[]
  lastNames: string[]
}

let wordListPromise: Promise<WordList> | null = null
function loadWordList(): Promise<WordList> {
  if (!wordListPromise) {
    wordListPromise = import('@/data/wordlist.json').then(
      (m) => m.default as WordList
    )
  }
  return wordListPromise
}

/**
 * Rank dictionary words, common names, and words found elsewhere in the document
 * by how closely their rendered width matches the redaction box. Returns a SET
 * of "consistent with" candidates — never a single answer. Numeric redactions
 * return nothing (digits are near-monospace and leak almost no width signal).
 */
export async function rankCandidates(
  w: WidthAnalysis,
  docTokens: string[],
  limit = 24
): Promise<Candidate[]> {
  if (w.isLikelyNumeric) return []
  const list = await loadWordList()
  const tol = tolerance(w.boxWidthPt)
  const [minLen, maxLen] = w.charCountRange
  const seen = new Set<string>()

  const pool: Array<{word: string; source: Candidate['source']}> = []
  const add = (words: string[], source: Candidate['source']) => {
    for (const raw of words) {
      const word = raw.trim()
      const key = word.toLowerCase()
      if (!word || seen.has(key)) continue
      if (word.length < Math.max(1, minLen - 1) || word.length > maxLen + 2)
        continue
      seen.add(key)
      pool.push({word, source})
    }
  }

  add(docTokens, 'document')
  add([...list.firstNames, ...list.lastNames], 'name')
  add(list.common, 'word')

  const scored: Candidate[] = []
  for (const {word, source} of pool) {
    const estWidthPt = estimateWidthPt(word, w)
    const absErr = Math.abs(estWidthPt - w.boxWidthPt)
    if (absErr > tol) continue
    scored.push({
      word,
      estWidthPt,
      confidence: confidenceFor(absErr, tol),
      source,
    })
  }

  const sourceRank: Record<Candidate['source'], number> = {
    document: 0,
    name: 1,
    word: 2,
  }
  scored.sort((a, b) => {
    if (a.source !== b.source)
      return sourceRank[a.source] - sourceRank[b.source]
    return b.confidence - a.confidence
  })
  return scored.slice(0, limit)
}
