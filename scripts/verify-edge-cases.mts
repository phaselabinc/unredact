// Validates the two high-severity review fixes: (1) multiple rectangles drawn
// in ONE content-stream path are split into separate covers; (2) text bboxes on
// a /Rotate 90 page line up with covers so leaks are still detected.
// Run: npx --yes tsx scripts/verify-edge-cases.mts
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import {extractPage} from '../src/lib/analyzer/extract'
import {checkPage} from '../src/lib/analyzer/checks'

function buildPdf(contentStream: string, rotate = 0): Uint8Array {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Rotate ${rotate} /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Uint8Array(Buffer.from(pdf, 'latin1'))
}

async function analyze(data: Uint8Array, rotate = 0) {
  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    verbosity: 0,
  }).promise
  const page = await doc.getPage(1)
  const extract = await extractPage(page, 1, pdfjs as never)
  const findings = checkPage(extract)
  return {extract, findings}
}

let pass = true

// --- Test 1: two rectangles, one path, one fill ---------------------------
// "SECRETONE word SECRETTWO" with black boxes over the two SECRET words.
const c1 = `BT /F1 13 Tf 72 700 Td (SECRETONE plain SECRETTWO) Tj ET
0 0 0 rg
72 697 62 15 re 215 697 62 15 re f
`
const r1 = await analyze(buildPdf(c1))
const pathCovers = r1.extract.covers.filter((c) => c.kind === 'path-fill')
const leaks1 = r1.findings.filter((f) => f.severity === 'leak')
console.log('Test 1 — two boxes in one path:')
console.log(
  '  path-fill covers:',
  pathCovers.length,
  '(expect 2, not 1 merged)'
)
console.log(
  '  leak findings:',
  leaks1.length,
  leaks1.map((f) => f.recovered?.text)
)
const t1ok = pathCovers.length === 2 && leaks1.length === 2
pass = pass && t1ok
console.log('  ->', t1ok ? 'PASS' : 'FAIL')

// --- Test 2: rotated page (/Rotate 90) ------------------------------------
const c2 = `BT /F1 13 Tf 72 700 Td (The password is hunter2 here) Tj ET
0 0 0 rg
166 697 44 15 re f
`
const r2 = await analyze(buildPdf(c2, 90), 90)
const leaks2 = r2.findings.filter((f) => f.severity === 'leak')
console.log('Test 2 — /Rotate 90 page:')
console.log('  covers:', r2.extract.covers.length, 'leaks:', leaks2.length)
console.log(
  '  recovered:',
  leaks2.map((f) => f.recovered?.text)
)
const t2ok = leaks2.length >= 1
pass = pass && t2ok
console.log('  ->', t2ok ? 'PASS' : 'FAIL')

console.log('\nEDGE CASES:', pass ? 'PASS ✅' : 'FAIL ❌')
process.exit(pass ? 0 : 1)
