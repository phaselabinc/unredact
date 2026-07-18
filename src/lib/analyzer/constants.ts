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

/**
 * Text painted at or above this luma (0..255) is bright enough to read against
 * any cover we accept as "dark" (see DARK_LUMA_MAX), so when it is drawn AFTER
 * the cover it is a visible overlay label (an exemption code stamped on an
 * applied redaction), not hidden content.
 */
export const LIGHT_TEXT_LUMA_MIN = 120

/**
 * Fraction of a run's extent inside a cover that must be tiled by visible
 * overlay-label text for the run to be dismissed as the label itself.
 */
export const LABEL_RUN_COVERAGE = 0.7

/** Fraction of a glyph box that must be covered to count as redacted. */
export const MIN_COVERAGE = 0.6

/**
 * Longest length (low-end estimate, in characters) for which a box-width "how
 * many characters?" hint is still meaningful. A single hidden word is short;
 * once even the minimum estimate exceeds this, the box is a redacted phrase or
 * whole field, where width narrows nothing — so the word-size check bails.
 */
export const MAX_WORD_SIZE_CHARS = 15

/** Minimum cover area (viewport units²) to bother with — ignores hairlines. */
export const MIN_COVER_AREA = 12

/**
 * Minimum thickness (pt) of a drawn path-fill in BOTH dimensions for it to count
 * as a redaction box. A real "black box" hides a block of text, so it has real
 * extent both ways; thin rules do not. Without this, long-but-thin fills slip
 * past the area filter and get mis-flagged as covered text: vertical change bars
 * (tiny width) and title/header underlines (tiny height) hide nothing.
 */
export const MIN_COVER_THICKNESS_PT = 3

/** Magic bytes every PDF must start with: "%PDF-". */
export const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]
