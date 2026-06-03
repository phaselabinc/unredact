// Node sanity check for the analyzer's pure logic. Uses pdf.js's legacy build
// (Node-friendly) to parse the sample PDF and runs the REAL extract/check code.
// Run: npx --yes tsx scripts/verify-analyzer.mts
import {readFileSync} from 'node:fs'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  extractPage,
  extractMetadata,
  extractOutlineTitles,
} from '../src/lib/analyzer/extract'
import {checkPage, checkDocument} from '../src/lib/analyzer/checks'

const data = new Uint8Array(readFileSync('public/samples/leaky-example.pdf'))
const doc = await pdfjs.getDocument({
  data,
  isEvalSupported: false,
  verbosity: 0,
}).promise
console.log('pages:', doc.numPages)

const page = await doc.getPage(1)
const extract = await extractPage(page, 1, pdfjs as never)
console.log('text runs:', extract.runs.length)
console.log(
  'sample run strings:',
  extract.runs.map((r) => r.str).filter((s) => s.trim())
)
console.log(
  'covers:',
  extract.covers.map((c) => ({
    kind: c.kind,
    bbox: c.bbox.map((n) => +n.toFixed(1)),
    rgb: c.rgb,
  }))
)

const pageFindings = checkPage(extract)
console.log('\n--- page findings ---')
for (const f of pageFindings) {
  console.log(`[${f.check}/${f.severity}] ${f.title}`)
  if (f.recovered)
    console.log('   recovered:', JSON.stringify(f.recovered.text))
  if (f.width)
    console.log(
      '   width: boxW=%s pt, font=%s %spt, chars=%o, numeric=%s',
      f.width.boxWidthPt.toFixed(1),
      f.width.fontClass,
      f.width.fontSizePt.toFixed(1),
      f.width.charCountRange,
      f.width.isLikelyNumeric
    )
}

const meta = await extractMetadata(doc)
const outline = await extractOutlineTitles(doc)
const docFindings = checkDocument(meta, outline)
console.log('\n--- document findings ---')
for (const f of docFindings) {
  console.log(
    `[${f.check}/${f.severity}] ${f.title} :: ${JSON.stringify(f.metaField)}`
  )
}

const ok =
  pageFindings.some(
    (f) =>
      f.check === 'superficial-mark' && f.recovered?.text.includes('hunter2')
  ) &&
  pageFindings.some((f) => f.check === 'word-size') &&
  docFindings.some((f) => f.check === 'metadata-leak')
console.log(
  '\nVERIFY:',
  ok
    ? 'PASS ✅ (superficial mark + word-size + metadata all detected)'
    : 'FAIL ❌'
)
process.exit(ok ? 0 : 1)
