/**
 * Shared data model for the redaction analyzer.
 *
 * Privacy contract: `Finding` objects can carry recovered text and image proof.
 * These are LOCAL-ONLY — they live in memory in the browser and are rendered to
 * the user, but they are never serialized to anything that leaves the device.
 * The only object that may ever inform a server (for an OG image) or a shared
 * screenshot is `AnalysisSummary`, which by construction holds counts only.
 */

/** Axis-aligned bounding box in viewport space (scale = 1): [x0, y0, x1, y1]. */
export type BBox = [x0: number, y0: number, x1: number, y1: number]

export type CheckId =
  | 'superficial-mark'
  | 'word-size'
  | 'removable-annotation'
  | 'metadata-leak'
  | 'outline-leak'
  | 'ocr-layer-leak'

export type Severity = 'leak' | 'warning' | 'info'

export type CoverKind =
  | 'path-fill'
  | 'redact-annot'
  | 'square-annot'
  | 'highlight-annot'
  | 'image-cover'
  | 'ocr-layer'
  | 'none'

/** The character class of the font around a redaction, used for width estimates. */
export type FontClass = 'serif' | 'sans' | 'mono'

/** Local-only recovered text from under a superficial mark. */
export interface RecoveredText {
  text: string
  runCount: number
}

/**
 * Everything the word-size widget needs to estimate length and score guesses.
 * Width is measured in PDF points (1/72 inch). `sampleText` + `sampleWidthPt`
 * are a calibration sample taken from real text in the same font near the box,
 * so the main-thread measurer can match the document's true metrics.
 */
export interface WidthAnalysis {
  boxWidthPt: number
  fontFamily: string
  fontClass: FontClass
  fontSizePt: number
  /** Average advance width per character of nearby text, in points. */
  avgGlyphWidthPt: number
  charCountRange: [min: number, max: number]
  isLikelyNumeric: boolean
  calibration: {sampleText: string; sampleWidthPt: number} | null
}

export interface MetaField {
  field: string
  value: string
}

export interface Finding {
  id: string
  check: CheckId
  /** 1-indexed page number (0 for document-level findings like metadata). */
  page: number
  bbox: BBox | null
  severity: Severity
  /** 0..1 detector confidence. */
  confidence: number
  coverKind: CoverKind
  title: string
  detail: string
  /** Local-only: text recovered from under a mark (checks 1 & 5). */
  recovered?: RecoveredText
  /** Word-size analysis payload (check 2). */
  width?: WidthAnalysis
  /** Metadata / outline leak payload (checks 4). */
  metaField?: MetaField
}

export type RedactionGrade = 'A' | 'B' | 'C' | 'D' | 'F'

/**
 * The ONLY object that is safe to put on a shareable card or an OG image.
 * Contains counts and labels only — no text, filenames, or recovered content.
 */
export interface AnalysisSummary {
  totalPages: number
  pagesAnalyzed: number
  totalFindings: number
  leakCount: number
  warningCount: number
  infoCount: number
  metadataLeak: boolean
  recoveredCharacters: number
  checksTriggered: CheckId[]
  worstCheck: CheckId | null
  grade: RedactionGrade
  truncated: boolean
}

export interface AnalysisResult {
  findings: Finding[]
  summary: AnalysisSummary
  /**
   * Distinct word-like tokens seen elsewhere in the document, used only to seed
   * candidate guesses for the word-size widget. Local-only; never serialized.
   */
  docTokens: string[]
}

export interface AnalysisProgress {
  phase: 'loading' | 'analyzing' | 'done'
  page: number
  totalPages: number
  findingsSoFar: number
}

/** Page dimensions in viewport space (scale = 1), for overlay positioning. */
export interface PageDimensions {
  page: number
  width: number
  height: number
}

export class AnalyzerError extends Error {
  code:
    | 'not-pdf'
    | 'too-large'
    | 'too-many-pages'
    | 'encrypted'
    | 'corrupt'
    | 'timeout'
    | 'aborted'
    | 'unknown'
  constructor(code: AnalyzerError['code'], message: string) {
    super(message)
    this.name = 'AnalyzerError'
    this.code = code
  }
}
