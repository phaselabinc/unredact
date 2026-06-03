import {MAX_IMAGE_PIXELS} from './constants'
import {AnalyzerError} from './types'
import type {PDFDocumentLoadingTask} from 'pdfjs-dist'

/**
 * pdf.js is loaded dynamically and only in the browser. A top-level import would
 * run during server rendering, where DOM globals it relies on don't exist.
 */
type Pdfjs = typeof import('pdfjs-dist')

let pdfjsPromise: Promise<Pdfjs> | null = null

export async function getPdfjs(): Promise<Pdfjs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      // Same-origin worker — never a CDN. Keeps connect-src 'self' intact.
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return pdfjs
    })
  }
  return pdfjsPromise
}

/**
 * Open a document with every dangerous pdf.js feature switched off:
 * - `isEvalSupported: false` removes the Function-constructor path (CVE-2024-4367).
 * - XFA and embedded JavaScript are never executed (scripting left disabled).
 * - Fonts are not installed into the page, standard fonts and CMaps are served
 *   from our own origin, and image decode size is capped against decode bombs.
 */
export async function openDocument(
  data: Uint8Array
): Promise<PDFDocumentLoadingTask> {
  const pdfjs = await getPdfjs()
  return pdfjs.getDocument({
    data,
    isEvalSupported: false,
    enableXfa: false,
    useSystemFonts: false,
    disableFontFace: true,
    disableAutoFetch: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    maxImageSize: MAX_IMAGE_PIXELS,
    verbosity: 0,
  })
}

/** Map a pdf.js load failure onto our own error vocabulary. */
export function classifyLoadError(err: unknown): AnalyzerError {
  const name = (err as {name?: string})?.name ?? ''
  const message = (err as {message?: string})?.message ?? 'Could not read PDF.'
  if (name === 'PasswordException') {
    return new AnalyzerError(
      'encrypted',
      'This PDF is password-protected, so it can’t be analyzed in the browser.'
    )
  }
  if (name === 'InvalidPDFException') {
    return new AnalyzerError('corrupt', 'This PDF appears to be corrupt.')
  }
  return new AnalyzerError('unknown', message)
}
