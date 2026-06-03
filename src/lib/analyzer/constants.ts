/**
 * Hard limits and detector thresholds. The limits exist so that a hostile or
 * pathological PDF can never hang the browser tab — every loop in the analyzer
 * is bounded by one of these, and the orchestrator enforces an overall wall
 * clock deadline on top.
 */

/** Reject files larger than this before we ever read them into memory. */
export const MAX_FILE_BYTES = 30 * 1024 * 1024 // 30 MB

/** Refuse to analyze documents with more pages than this. */
export const MAX_PAGES = 300

/** Cap pages we actually walk; beyond this we report a truncated analysis. */
export const MAX_PAGES_ANALYZED = 150

/** Per-page operator-list cap (guards against operator-flood PDFs). */
export const MAX_OPS_PER_PAGE = 600_000

/** Per-page text-item cap. */
export const MAX_TEXT_ITEMS_PER_PAGE = 50_000

/** Per-page cap on candidate cover rectangles we track. */
export const MAX_COVERS_PER_PAGE = 5_000

/** Stop collecting findings past this many (the point is made by then). */
export const MAX_FINDINGS = 500

/** Overall analysis deadline. On overrun we abort and tear pdf.js down. */
export const ANALYSIS_DEADLINE_MS = 30_000

/** Bound pdf.js image decoding (pixels) to defuse decompression bombs. */
export const MAX_IMAGE_PIXELS = 24 * 1024 * 1024 // ~24 MP

/** A fill counts as "dark enough to be a redaction" below this luma (0..255). */
export const DARK_LUMA_MAX = 48

/** Fraction of a glyph box that must be covered to count as redacted. */
export const MIN_COVERAGE = 0.6

/** Minimum cover area (viewport units²) to bother with — ignores hairlines. */
export const MIN_COVER_AREA = 12

/** Magic bytes every PDF must start with: "%PDF-". */
export const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]
