// Generates a deliberately BADLY-redacted sample PDF used by the demo and as a
// fixture for the analyzer sanity check. It contains, on one page:
//   - a black box drawn OVER still-present text ("hunter2")  -> superficial mark
//   - an inline black box with no text under it             -> word-size leak
//   - /Info Title + Author                                  -> metadata leak
//
// Hand-built (no deps) so it stays tiny and reviewable. Helvetica metrics are
// used to position the boxes exactly over their targets.

import {writeFileSync, mkdirSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outPath = join(here, '..', 'public', 'samples', 'leaky-example.pdf')

// Adobe Helvetica advance widths (1000 units/em) for the glyphs we use.
const W = {
  ' ': 278,
  '-': 333,
  '.': 278,
  ':': 278,
  2: 556,
  T: 611,
  N: 722,
  D: 722,
  O: 722,
  a: 556,
  c: 543,
  d: 556,
  e: 556,
  g: 556,
  h: 556,
  i: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  w: 722,
  y: 500,
}
const textWidth = (s, size) =>
  [...s].reduce((sum, ch) => sum + (W[ch] ?? 556), 0) * (size / 1000)

const SIZE = 13
const escape = (s) => s.replace(/([\\()])/g, '\\$1')

// --- Line 1: "The password is hunter2 - keep it secret." -----------------
const x0 = 72
const y1 = 700
const pre = 'The password is '
const secret = 'hunter2'
const post = ' - keep it secret.'
const xSecret = x0 + textWidth(pre, SIZE)
const wSecret = textWidth(secret, SIZE)
const xPost = xSecret + wSecret

// --- Line 2: "Name:  [box]  signed the agreement." ------------------------
const y2 = 660
const nameLabel = 'Name: '
const xLabelEnd = x0 + textWidth(nameLabel, SIZE)
const boxW = 52 // a redacted ~8-char name, no text underneath
const xAfter = xLabelEnd + boxW + 4
const after = 'signed the agreement.'

const content = `BT /F1 ${SIZE} Tf ${x0} ${y1} Td (${escape(pre)}) Tj ET
BT /F1 ${SIZE} Tf ${xSecret.toFixed(1)} ${y1} Td (${escape(secret)}) Tj ET
BT /F1 ${SIZE} Tf ${xPost.toFixed(1)} ${y1} Td (${escape(post)}) Tj ET
BT /F1 ${SIZE} Tf ${x0} ${y2} Td (${escape(nameLabel)}) Tj ET
BT /F1 ${SIZE} Tf ${xAfter.toFixed(1)} ${y2} Td (${escape(after)}) Tj ET
0 0 0 rg
${xSecret.toFixed(1)} ${(y1 - 3).toFixed(1)} ${wSecret.toFixed(1)} 15 re f
${xLabelEnd.toFixed(1)} ${(y2 - 3).toFixed(1)} ${boxW} 15 re f
`

const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Title (Confidential Settlement - DO NOT DISTRIBUTE) /Author (Jane Q. Lawyer) /Subject (Acme v. Doe) >>',
]

let pdf = '%PDF-1.4\n'
const offsets = []
objects.forEach((body, i) => {
  offsets.push(pdf.length)
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
})
const xrefStart = pdf.length
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

mkdirSync(dirname(outPath), {recursive: true})
writeFileSync(outPath, pdf, 'latin1')
console.log(`Wrote ${outPath} (${pdf.length} bytes)`)
console.log(
  `secret "hunter2" at x=${xSecret.toFixed(1)} w=${wSecret.toFixed(1)}; name box at x=${xLabelEnd.toFixed(1)} w=${boxW}`
)
