import type {PDFDocumentProxy, PDFDocumentLoadingTask} from 'pdfjs-dist'
import {
  ANALYSIS_DEADLINE_MS,
  MAX_FINDINGS,
  MAX_PAGES,
  MAX_PAGES_ANALYZED,
} from './constants'
import {checkPage} from './checks'
import {extractPage, type TextRun} from './extract'
import {summarize} from './grade'
import {classifyLoadError, getPdfjs, openDocument} from './pdf-loader'
import {validatePdfFile} from './validate'
import {
  AnalyzerError,
  type AnalysisProgress,
  type AnalysisResult,
  type Finding,
} from './types'

export interface AnalyzeOptions {
  onProgress?: (p: AnalysisProgress) => void
  signal?: AbortSignal
}

/** Reject a promise if it doesn't settle within `ms`. */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new AnalyzerError('timeout', `Timed out: ${label}`)),
      ms
    )
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

/** Yield to the event loop so the UI stays responsive and progress paints. */
function yieldToUi(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0))
}

/** Collect distinct word-like tokens (3–20 letters) for candidate guessing. */
function collectTokens(runs: TextRun[], into: Set<string>): void {
  if (into.size >= 2000) return
  for (const run of runs) {
    if (run.isWhitespace) continue
    for (const token of run.str.split(/[^A-Za-z'-]+/)) {
      if (token.length < 3 || token.length > 20) continue
      into.add(token)
      if (into.size >= 2000) return
    }
  }
}

/**
 * Owns a single open PDF for the lifetime of one analysis + result view. The
 * document is parsed in pdf.js's worker; this orchestrator runs the (light)
 * geometry/overlap analysis on the main thread, page by page, bounded by hard
 * caps and an overall wall-clock deadline. On overrun or abort it destroys the
 * document, which terminates the underlying worker.
 */
export class PdfAnalyzer {
  private loadingTask: PDFDocumentLoadingTask | null = null
  private doc: PDFDocumentProxy | null = null

  async analyze(
    file: File,
    opts: AnalyzeOptions = {}
  ): Promise<AnalysisResult> {
    const {onProgress, signal} = opts
    const throwIfAborted = () => {
      if (signal?.aborted)
        throw new AnalyzerError('aborted', 'Analysis cancelled.')
    }

    throwIfAborted()
    const buffer = await validatePdfFile(file)
    throwIfAborted()

    onProgress?.({phase: 'loading', page: 0, totalPages: 0, findingsSoFar: 0})

    try {
      this.loadingTask = await openDocument(new Uint8Array(buffer))
      this.doc = await withTimeout(
        this.loadingTask.promise,
        ANALYSIS_DEADLINE_MS,
        'opening document'
      )
    } catch (err) {
      await this.destroy()
      if (err instanceof AnalyzerError) throw err
      throw classifyLoadError(err)
    }

    const doc = this.doc
    const totalPages = doc.numPages

    if (totalPages > MAX_PAGES) {
      await this.destroy()
      throw new AnalyzerError(
        'too-many-pages',
        `This PDF has ${totalPages} pages, more than this in-browser tool will scan (${MAX_PAGES}).`
      )
    }

    const findings: Finding[] = []
    const docTokens = new Set<string>()
    const pagesToScan = Math.min(totalPages, MAX_PAGES_ANALYZED)
    const deadline = Date.now() + ANALYSIS_DEADLINE_MS
    let pagesAnalyzed = 0
    let truncated = totalPages > MAX_PAGES_ANALYZED

    for (let pageNum = 1; pageNum <= pagesToScan; pageNum++) {
      throwIfAborted()
      if (Date.now() > deadline) {
        truncated = true
        break
      }
      onProgress?.({
        phase: 'analyzing',
        page: pageNum,
        totalPages: pagesToScan,
        findingsSoFar: findings.length,
      })

      try {
        const pdfjs = await getPdfjs()
        const remaining = Math.max(1000, deadline - Date.now())
        const page = await withTimeout(
          doc.getPage(pageNum),
          remaining,
          `loading page ${pageNum}`
        )
        const extract = await withTimeout(
          extractPage(page, pageNum, pdfjs),
          Math.max(1000, deadline - Date.now()),
          `reading page ${pageNum}`
        )
        findings.push(...checkPage(extract, deadline))
        collectTokens(extract.runs, docTokens)
        // Release page resources promptly.
        page.cleanup()
      } catch (err) {
        if (err instanceof AnalyzerError && err.code === 'aborted') throw err
        // A single bad page shouldn't abort the whole scan.
      }

      pagesAnalyzed = pageNum
      if (findings.length >= MAX_FINDINGS) {
        truncated = true
        break
      }
      await yieldToUi()
    }

    onProgress?.({
      phase: 'done',
      page: pagesAnalyzed,
      totalPages: pagesToScan,
      findingsSoFar: findings.length,
    })

    const capped = findings.slice(0, MAX_FINDINGS)
    return {
      findings: capped,
      summary: summarize(capped, totalPages, pagesAnalyzed, truncated),
      docTokens: [...docTokens],
    }
  }

  /**
   * Render the original page, including its annotation marks. Recovered text
   * is shown separately in the results view, never by altering this preview.
   */
  async renderPage(
    pageNum: number,
    opts: {scale?: number} = {}
  ): Promise<{dataUrl: string; pageWidth: number; pageHeight: number}> {
    if (!this.doc) throw new AnalyzerError('unknown', 'No document open.')
    const pdfjs = await getPdfjs()
    const page = await this.doc.getPage(pageNum)
    // Clamp the scale so the rendered canvas never exceeds ~2600px on a side.
    // The render viewport and the canvas now share one scale, so the bbox
    // overlay (positioned as a % of pageWidth/Height) always lines up.
    const MAX_PX = 2600
    const base = page.getViewport({scale: 1})
    const scale = Math.min(
      opts.scale ?? 1.6,
      MAX_PX / base.width,
      MAX_PX / base.height
    )
    const viewport = page.getViewport({scale})
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new AnalyzerError('unknown', 'Canvas unavailable.')

    await page.render({
      canvasContext: ctx,
      viewport,
      annotationMode: pdfjs.AnnotationMode.ENABLE,
    }).promise
    const dataUrl = canvas.toDataURL('image/png')
    page.cleanup()
    // Report dimensions in scale-1 (viewport) space so callers can position
    // overlays from finding bboxes as simple percentages.
    return {
      dataUrl,
      pageWidth: viewport.width / scale,
      pageHeight: viewport.height / scale,
    }
  }

  async destroy(): Promise<void> {
    try {
      await this.loadingTask?.destroy()
    } catch {
      // ignore
    }
    this.loadingTask = null
    this.doc = null
  }
}
