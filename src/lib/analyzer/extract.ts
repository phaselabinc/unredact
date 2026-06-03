import type {PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist'
import type {BBox, CoverKind, FontClass} from './types'
import {
  MAX_COVERS_PER_PAGE,
  MAX_OPS_PER_PAGE,
  MAX_TEXT_ITEMS_PER_PAGE,
  MIN_COVER_AREA,
} from './constants'
import {cmykToRgb, grayToRgb, isDark, type RGB} from './color'
import {area, normalize} from './geometry'

type Pdfjs = typeof import('pdfjs-dist')

export interface TextRun {
  str: string
  bbox: BBox
  fontFamily: string
  fontClass: FontClass
  fontSizePt: number
  isWhitespace: boolean
  /** Text direction from pdf.js bidi pass: 'ltr' | 'rtl' | 'ttb'. */
  dir: string
}

export interface Cover {
  bbox: BBox
  kind: CoverKind
  rgb: RGB | null
  subtype?: string
}

export interface PageExtract {
  page: number
  width: number
  height: number
  runs: TextRun[]
  covers: Cover[]
  hasLargeImage: boolean
}

function classifyFont(family: string): FontClass {
  const f = family.toLowerCase()
  if (/(mono|courier|consol|menlo|typewriter)/.test(f)) return 'mono'
  if (/(serif|times|georgia|roman|garamond|minion|cambria)/.test(f)) {
    return f.includes('sans') ? 'sans' : 'serif'
  }
  return 'sans'
}

/**
 * Split one `constructPath` op into the bounding box of each disjoint subpath.
 * pdf.js merges every rectangle/line drawn before a fill into a single op whose
 * `minMax` spans them all; using that merged box would either span the gaps
 * between several redaction boxes (garbled recovery) or exceed the full-page
 * filter (missed redactions). Returns boxes in path space (pre-CTM).
 */
function parseSubpaths(
  pathOps: number[],
  coords: ArrayLike<number>,
  OPS: Pdfjs['OPS']
): BBox[] {
  const counts: Record<number, number> = {
    [OPS.moveTo]: 2,
    [OPS.lineTo]: 2,
    [OPS.curveTo]: 6,
    [OPS.curveTo2]: 4,
    [OPS.curveTo3]: 4,
    [OPS.closePath]: 0,
    [OPS.rectangle]: 4,
  }
  const subs: BBox[] = []
  let cur: BBox | null = null
  const flush = () => {
    if (cur) subs.push(cur)
    cur = null
  }
  const extend = (x: number, y: number) => {
    if (!cur) cur = [x, y, x, y]
    else
      cur = [
        Math.min(cur[0], x),
        Math.min(cur[1], y),
        Math.max(cur[2], x),
        Math.max(cur[3], y),
      ]
  }
  let ci = 0
  const limit = Math.min(pathOps.length, 20000)
  for (let k = 0; k < limit; k++) {
    const op = pathOps[k] as number
    const n = counts[op] ?? 0
    if (op === OPS.rectangle) {
      flush()
      const x = coords[ci] ?? 0
      const y = coords[ci + 1] ?? 0
      const w = coords[ci + 2] ?? 0
      const h = coords[ci + 3] ?? 0
      subs.push(normalize([x, y, x + w, y + h]))
    } else if (op === OPS.moveTo) {
      flush()
      extend(coords[ci] ?? 0, coords[ci + 1] ?? 0)
    } else if (n > 0) {
      for (let p = 0; p + 1 < n; p += 2) {
        extend(coords[ci + p] ?? 0, coords[ci + p + 1] ?? 0)
      }
    }
    ci += n
  }
  flush()
  return subs
}

/** Extract positioned text runs in viewport space (scale = 1, y-down). */
async function extractText(
  page: PDFPageProxy,
  pdfjs: Pdfjs
): Promise<TextRun[]> {
  const vp = page.getViewport({scale: 1})
  const tc = await page.getTextContent({disableNormalization: true})
  const styles = tc.styles as Record<
    string,
    {ascent?: number; descent?: number; fontFamily?: string}
  >
  const runs: TextRun[] = []

  for (const item of tc.items) {
    if (!('str' in item)) continue // skip marked-content markers
    if (runs.length >= MAX_TEXT_ITEMS_PER_PAGE) break

    const tm = item.transform as number[]
    // Advance scale (text x-axis) and font size (text y-axis) in user space.
    const advScale = Math.hypot(tm[0] ?? 0, tm[1] ?? 0) || 1
    const fontSizePt = Math.hypot(tm[2] ?? 0, tm[3] ?? 0) || advScale
    const style = styles[item.fontName] ?? {}
    const ascent = clamp(style.ascent ?? 0.75, 0.45, 1.1)
    const descent = style.descent ?? -0.25 // negative

    // Build the glyph-row quad in TEXT space (advance along +x, up along +y)
    // and map every corner through viewport∘textMatrix, so the box stays correct
    // under page rotation/skew rather than assuming the advance is horizontal.
    const m = pdfjs.Util.transform(vp.transform, tm)
    const adv = item.width / advScale // advance in text-space units
    const corners: Array<[number, number]> = [
      [0, ascent],
      [adv, ascent],
      [0, descent],
      [adv, descent],
    ].map((p) => pdfjs.Util.applyTransform(p, m) as [number, number])
    const xs = corners.map((c) => c[0])
    const ys = corners.map((c) => c[1])
    const bbox = normalize([
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys),
    ])

    const family = style.fontFamily ?? 'sans-serif'
    runs.push({
      str: item.str,
      bbox,
      fontFamily: family,
      fontClass: classifyFont(family),
      fontSizePt,
      isWhitespace: item.str.trim().length === 0,
      dir: typeof item.dir === 'string' ? item.dir : 'ltr',
    })
  }
  return runs
}

/**
 * Walk the page operator list, tracking the graphics-state CTM (initialized to
 * the viewport transform so all path geometry comes out in viewport space) and
 * the current fill color, and collect every dark filled region or dark image
 * stencil — the candidate "redaction covers".
 */
async function extractCovers(
  page: PDFPageProxy,
  pdfjs: Pdfjs
): Promise<{covers: Cover[]; hasLargeImage: boolean}> {
  const {OPS, Util} = pdfjs
  const vp = page.getViewport({scale: 1})
  const pageArea = vp.width * vp.height
  const {fnArray, argsArray} = await page.getOperatorList()

  type State = {ctm: number[]; fill: RGB | null}
  let state: State = {ctm: vp.transform.slice(), fill: [0, 0, 0]}
  const stack: State[] = []
  // Viewport-space bbox of each pending subpath, awaiting a fill op.
  let pending: BBox[] = []
  const covers: Cover[] = []
  let hasLargeImage = false

  const limit = Math.min(fnArray.length, MAX_OPS_PER_PAGE)
  const pushFill = () => {
    if (state.fill && isDark(state.fill)) {
      for (const bbox of pending) {
        if (covers.length >= MAX_COVERS_PER_PAGE) break
        covers.push({bbox, kind: 'path-fill', rgb: state.fill})
      }
    }
    pending = []
  }

  for (let i = 0; i < limit; i++) {
    const fn = fnArray[i]
    const args = argsArray[i] as unknown[]
    switch (fn) {
      case OPS.save:
        stack.push({ctm: state.ctm.slice(), fill: state.fill})
        break
      case OPS.restore: {
        const prev = stack.pop()
        if (prev) state = prev
        break
      }
      case OPS.transform:
        state.ctm = Util.transform(state.ctm, args as number[])
        break
      case OPS.setFillRGBColor: {
        // Normalized by pdf.js to 0..255 RGB.
        const a = args as number[]
        state.fill = [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0]
        break
      }
      case OPS.setFillGray:
        // Defensive: pdf.js normally rewrites gray/CMYK fills to setFillRGBColor
        // (0..255) before the op list reaches us, so these branches are rarely
        // hit — kept so a future raw-stream walk wouldn't silently misread color.
        state.fill = grayToRgb((args as number[])[0] ?? 0)
        break
      case OPS.setFillCMYKColor: {
        const a = args as number[]
        state.fill = cmykToRgb(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 0)
        break
      }
      case OPS.setFillColorN:
        state.fill = null // pattern/ICC — unknown, never auto-flag
        break
      case OPS.constructPath: {
        const pathOps = (args as unknown[])[0] as number[] | undefined
        const coords = (args as unknown[])[1] as ArrayLike<number> | undefined
        const minMax = (args as unknown[])[2] as number[] | undefined
        let subs: BBox[] = []
        if (Array.isArray(pathOps) && coords) {
          subs = parseSubpaths(pathOps, coords, OPS)
        }
        // Fall back to the merged bbox if we couldn't reconstruct subpaths.
        if (
          subs.length === 0 &&
          minMax &&
          Number.isFinite(minMax[0]) &&
          Number.isFinite(minMax[2])
        ) {
          subs = [normalize(minMax as BBox)]
        }
        for (const s of subs) {
          if (pending.length >= MAX_COVERS_PER_PAGE) break
          pending.push(
            normalize(Util.getAxialAlignedBoundingBox(s, state.ctm) as BBox)
          )
        }
        break
      }
      case OPS.fill:
      case OPS.eoFill:
      case OPS.fillStroke:
      case OPS.eoFillStroke:
      case OPS.closeFillStroke:
        pushFill()
        break
      case OPS.stroke:
      case OPS.closeStroke:
        // Painted but not filled — discard the path without flagging it.
        pending = []
        break
      case OPS.paintImageMaskXObject: {
        // A stencil mask is painted in the current fill color — a dark one over
        // text is a scanned-style redaction stamp. (Grouped masks each carry
        // their own transform and are skipped to avoid mislocating them.)
        const bbox = normalize(
          Util.getAxialAlignedBoundingBox([0, 0, 1, 1], state.ctm) as BBox
        )
        if (
          state.fill &&
          isDark(state.fill) &&
          covers.length < MAX_COVERS_PER_PAGE
        ) {
          covers.push({bbox, kind: 'image-cover', rgb: state.fill})
        }
        break
      }
      case OPS.paintImageXObject:
      case OPS.paintInlineImageXObject: {
        const bbox = normalize(
          Util.getAxialAlignedBoundingBox([0, 0, 1, 1], state.ctm) as BBox
        )
        if (area(bbox) > 0.25 * pageArea) hasLargeImage = true
        break
      }
      default:
        break
    }
  }

  // Drop hairlines and full-page backgrounds (a redaction is neither).
  const filtered = covers.filter((c) => {
    const a = area(c.bbox)
    return a >= MIN_COVER_AREA && a <= 0.6 * pageArea
  })
  return {covers: filtered, hasLargeImage}
}

/** Cover rectangles contributed by annotations (sticky-note style redactions). */
async function extractAnnotationCovers(
  page: PDFPageProxy,
  pdfjs: Pdfjs
): Promise<Cover[]> {
  const vp = page.getViewport({scale: 1})
  let annots: Array<Record<string, unknown>> = []
  try {
    annots = (await page.getAnnotations({intent: 'display'})) as Array<
      Record<string, unknown>
    >
  } catch {
    return []
  }
  const covers: Cover[] = []

  for (const a of annots) {
    const subtype = String(a.subtype ?? '')
    const rect = a.rect as number[] | undefined
    if (!rect || rect.length < 4) continue
    const vpRect = vp.convertToViewportRectangle(rect) as number[]
    const bbox = normalize([vpRect[0], vpRect[1], vpRect[2], vpRect[3]] as BBox)

    // pdf.js 4.x exposes only `color` (the border/stroke colour) for Square and
    // Highlight annotations — `interiorColor` is not populated — so we judge
    // darkness from that. Redact annotations are flagged regardless of colour.
    const stroke = a.color as Uint8ClampedArray | number[] | null | undefined
    const fill: RGB | null = stroke
      ? [stroke[0] ?? 0, stroke[1] ?? 0, stroke[2] ?? 0]
      : null

    if (subtype === 'Redact') {
      // A live Redact annotation means "apply" was never run: by definition the
      // content underneath is still present.
      covers.push({bbox, kind: 'redact-annot', rgb: fill, subtype})
    } else if (subtype === 'Square' && fill && isDark(fill)) {
      covers.push({bbox, kind: 'square-annot', rgb: fill, subtype})
    } else if (subtype === 'Highlight' && fill && isDark(fill)) {
      covers.push({bbox, kind: 'highlight-annot', rgb: fill, subtype})
    }
  }
  return covers
}

export async function extractPage(
  page: PDFPageProxy,
  pageNumber: number,
  pdfjs: Pdfjs
): Promise<PageExtract> {
  const vp = page.getViewport({scale: 1})
  const [runs, vector, annots] = await Promise.all([
    extractText(page, pdfjs),
    extractCovers(page, pdfjs),
    extractAnnotationCovers(page, pdfjs),
  ])
  return {
    page: pageNumber,
    width: vp.width,
    height: vp.height,
    runs,
    covers: [...vector.covers, ...annots],
    hasLargeImage: vector.hasLargeImage,
  }
}

export interface DocMetaLeak {
  field: string
  value: string
}

/** Conservative metadata fields worth surfacing (skip Producer/Creator noise). */
const META_FIELDS: Array<[key: string, label: string]> = [
  ['Title', 'Title'],
  ['Author', 'Author'],
  ['Subject', 'Subject'],
  ['Keywords', 'Keywords'],
]

export async function extractMetadata(
  doc: PDFDocumentProxy
): Promise<DocMetaLeak[]> {
  const leaks: DocMetaLeak[] = []
  try {
    const {info} = (await doc.getMetadata()) as unknown as {
      info?: Record<string, unknown>
    }
    if (info) {
      for (const [key, label] of META_FIELDS) {
        const value = info[key]
        if (typeof value === 'string' && value.trim().length > 0) {
          leaks.push({field: label, value: value.trim().slice(0, 300)})
        }
      }
    }
  } catch {
    // metadata is optional
  }
  return leaks
}

interface OutlineNode {
  title?: string
  items?: OutlineNode[]
}

export async function extractOutlineTitles(
  doc: PDFDocumentProxy
): Promise<string[]> {
  const titles: string[] = []
  try {
    const outline = (await doc.getOutline()) as OutlineNode[] | null
    const walk = (nodes: OutlineNode[] | undefined, depth: number) => {
      if (!nodes || depth > 6) return
      for (const node of nodes) {
        if (titles.length >= 200) return
        if (node.title && node.title.trim()) titles.push(node.title.trim())
        walk(node.items, depth + 1)
      }
    }
    walk(outline ?? undefined, 0)
  } catch {
    // outline is optional
  }
  return titles
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
