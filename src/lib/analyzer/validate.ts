import {MAX_FILE_BYTES, PDF_MAGIC} from './constants'
import {AnalyzerError} from './types'

/**
 * Validate a user-selected file BEFORE we read it fully into memory or hand it
 * to pdf.js. We never trust `file.type` or the extension — only the magic bytes
 * decide whether this is a PDF. Size is checked first so an oversized file is
 * rejected without reading its contents.
 */
export async function validatePdfFile(file: File): Promise<ArrayBuffer> {
  if (file.size === 0) {
    throw new AnalyzerError('corrupt', 'That file is empty.')
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (MAX_FILE_BYTES / (1024 * 1024)).toFixed(0)
    throw new AnalyzerError(
      'too-large',
      `That file is larger than the ${mb} MB limit for this in-browser tool.`
    )
  }

  // Read just the first few bytes to confirm the %PDF- signature.
  const head = new Uint8Array(
    await file.slice(0, PDF_MAGIC.length).arrayBuffer()
  )
  const isPdf = PDF_MAGIC.every((byte, i) => head[i] === byte)
  if (!isPdf) {
    throw new AnalyzerError(
      'not-pdf',
      "That doesn't look like a PDF. This tool only reads PDF files."
    )
  }

  return file.arrayBuffer()
}
