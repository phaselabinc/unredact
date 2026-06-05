// Runs the REAL analyzer modules (extract + checks + grade) against a PDF in
// Node, using pdf.js's Node-friendly legacy build. This mirrors what
// PdfAnalyzer.analyze does in the browser, minus the worker/timeout plumbing —
// so the tests exercise the actual detection logic, not a reimplementation.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  extractMetadata,
  extractOutlineTitles,
  extractPage,
} from '@/lib/analyzer/extract'
import {checkDocument, checkPage} from '@/lib/analyzer/checks'
import {summarize} from '@/lib/analyzer/grade'
import type {AnalysisResult, Finding} from '@/lib/analyzer/types'

export async function analyzeBuffer(data: Uint8Array): Promise<AnalysisResult> {
  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    verbosity: 0,
  }).promise
  const numPages = doc.numPages
  const findings: Finding[] = []

  const [meta, outline] = await Promise.all([
    extractMetadata(doc),
    extractOutlineTitles(doc),
  ])
  findings.push(...checkDocument(meta, outline))

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p)
    const extract = await extractPage(page, p, pdfjs as never)
    findings.push(...checkPage(extract))
    page.cleanup()
  }
  await doc.destroy()

  return {
    findings,
    summary: summarize(findings, numPages, numPages, false),
    docTokens: [],
  }
}
