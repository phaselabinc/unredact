// Generates a suite of example PDFs that each exercise one redaction-failure
// mode (plus a correctly-redacted control). Writes the PDFs and a machine-
// readable manifest.json that the test suite asserts against.
//
// Hand-built with no dependencies so the fixtures stay tiny and reviewable.
// Run: node examples/generate.mjs
import {writeFileSync, mkdirSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))

// --- Adobe Helvetica advance widths (per 1000 em) so boxes land on words ----
// prettier-ignore
const HELV = {
  ' ':278,'!':278,'"':355,'#':556,'$':556,'%':889,'&':667,"'":191,'(':333,')':333,
  '*':389,'+':584,',':278,'-':333,'.':278,'/':278,'0':556,'1':556,'2':556,'3':556,
  '4':556,'5':556,'6':556,'7':556,'8':556,'9':556,':':278,';':278,'<':584,'=':584,
  '>':584,'?':556,'@':1015,'A':667,'B':667,'C':722,'D':722,'E':667,'F':611,'G':778,
  'H':722,'I':278,'J':500,'K':667,'L':556,'M':833,'N':722,'O':778,'P':667,'Q':778,
  'R':722,'S':667,'T':611,'U':722,'V':667,'W':944,'X':667,'Y':667,'Z':611,'[':278,
  '\\':278,']':278,'^':469,'_':556,'`':333,'a':556,'b':556,'c':500,'d':556,'e':556,
  'f':278,'g':556,'h':556,'i':222,'j':222,'k':500,'l':222,'m':833,'n':556,'o':556,
  'p':556,'q':556,'r':333,'s':500,'t':278,'u':556,'v':500,'w':722,'x':500,'y':500,
  'z':500,'{':334,'|':260,'}':334,'~':584,
}
const tw = (s, size) =>
  [...s].reduce((a, c) => a + (HELV[c] ?? 556), 0) * (size / 1000)
const esc = (s) => s.replace(/([\\()])/g, '\\$1')

/** Serialize an array of object bodies (obj N = index N-1) into a valid PDF. */
function serialize(objects, {info = null} = {}) {
  let pdf = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${
    info ? ` /Info ${info} 0 R` : ''
  } >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf, 'latin1')
}

const SIZE = 13
const X = 72 // left margin
/** A line of absolutely-positioned text pieces; returns the content + x cursor. */
function textAt(x, y, s) {
  return `BT /F1 ${SIZE} Tf ${x.toFixed(1)} ${y} Td (${esc(s)}) Tj ET\n`
}
function blackBox(x, y, w) {
  return `${x.toFixed(1)} ${(y - 3).toFixed(1)} ${w.toFixed(1)} 15 re`
}

const page = (extra, contentsRef = 4, fontRef = 5, xobjRef = null) =>
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]${extra} /Resources << /Font << /F1 ${fontRef} 0 R >>${
    xobjRef ? ` /XObject << /Im0 ${xobjRef} 0 R >>` : ''
  } >> /Contents ${contentsRef} 0 R >>`
const FONT = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
const stream = (s) => `<< /Length ${s.length} >>\nstream\n${s}endstream`

const fixtures = []
const add = (file, title, bytes, expect) => {
  writeFileSync(join(OUT, file), bytes)
  fixtures.push({file, title, ...expect})
}

// 1) Superficial mark: black box over still-present text -----------------
{
  const y = 700
  const pre = 'Patient note: '
  const secret = 'Jordan Hayes'
  const xS = X + tw(pre, SIZE)
  const wS = tw(secret, SIZE)
  let c = textAt(X, y, pre)
  c += textAt(xS, y, secret)
  c += textAt(xS + wS, y, ' was admitted on the 3rd.')
  c += `0 0 0 rg\n${blackBox(xS, y, wS)} f\n`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    page(''),
    stream(c),
    FONT,
  ]
  add(
    '01-superficial-mark.pdf',
    'Black box over selectable text',
    serialize(objs),
    {
      grade: 'F',
      expectChecks: ['superficial-mark'],
      minLeaks: 1,
      recoveredIncludes: ['Jordan', 'Hayes'],
    }
  )
}

// 2) Word-size leak: clean inline box, no text underneath ----------------
{
  const y = 700
  const pre = 'Authorized by '
  const post = ' on the date shown above.'
  const xEnd = X + tw(pre, SIZE)
  const boxW = tw('Patricia', SIZE) // a ~8-char name
  let c = textAt(X, y, pre)
  c += textAt(xEnd + boxW + 4, y, post)
  c += `0 0 0 rg\n${blackBox(xEnd, y, boxW)} f\n`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    page(''),
    stream(c),
    FONT,
  ]
  add(
    '02-word-size-leak.pdf',
    'Box width leaks the hidden length',
    serialize(objs),
    {
      grade: 'B',
      expectChecks: ['word-size'],
      minWarnings: 1,
    }
  )
}

// 3) Multiple boxes in a single content-stream path ----------------------
{
  const y = 700
  const a = 'Northwind'
  const b = 'Globex'
  const pre = 'Vendors '
  const mid = ' and '
  const xA = X + tw(pre, SIZE)
  const wA = tw(a, SIZE)
  const xB = xA + wA + tw(mid, SIZE)
  const wB = tw(b, SIZE)
  let c = textAt(X, y, pre)
  c += textAt(xA, y, a)
  c += textAt(xA + wA, y, mid)
  c += textAt(xB, y, b)
  c += textAt(xB + wB, y, ' were both shortlisted.')
  // Two rectangles, ONE path, ONE fill.
  c += `0 0 0 rg\n${blackBox(xA, y, wA)} ${blackBox(xB, y, wB)} f\n`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    page(''),
    stream(c),
    FONT,
  ]
  add(
    '03-multi-box-one-path.pdf',
    'Two redactions drawn as one path',
    serialize(objs),
    {
      grade: 'F',
      expectChecks: ['superficial-mark'],
      minLeaks: 2,
      recoveredIncludes: ['Northwind', 'Globex'],
    }
  )
}

// 4) Removable Redact annotation over text -------------------------------
{
  const y = 700
  const pre = 'Wire funds to account '
  const secret = '4471902338'
  const xS = X + tw(pre, SIZE)
  const wS = tw(secret, SIZE)
  let c = textAt(X, y, pre)
  c += textAt(xS, y, secret)
  c += textAt(xS + wS, y, ' before noon.')
  const rect = `[${xS.toFixed(1)} ${y - 3} ${(xS + wS).toFixed(1)} ${y + 12}]`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Annots [6 0 R] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    stream(c),
    FONT,
    `<< /Type /Annot /Subtype /Redact /Rect ${rect} /IC [0 0 0] >>`,
  ]
  add(
    '04-removable-redact-annotation.pdf',
    'Un-applied Redact annotation',
    serialize(objs),
    {
      grade: 'F',
      expectChecks: ['removable-annotation'],
      minLeaks: 1,
    }
  )
}

// 5) Removable Square annotation (black) over text -----------------------
{
  const y = 700
  const pre = 'SSN on file: '
  const secret = '987-65-4320'
  const xS = X + tw(pre, SIZE)
  const wS = tw(secret, SIZE)
  let c = textAt(X, y, pre)
  c += textAt(xS, y, secret)
  c += textAt(xS + wS, y, ' (verified).')
  const rect = `[${xS.toFixed(1)} ${y - 3} ${(xS + wS).toFixed(1)} ${y + 12}]`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Annots [6 0 R] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    stream(c),
    FONT,
    `<< /Type /Annot /Subtype /Square /Rect ${rect} /C [0 0 0] /IC [0 0 0] /CA 1 >>`,
  ]
  add(
    '05-removable-square-annotation.pdf',
    'Draggable black square over text',
    serialize(objs),
    {
      grade: 'F',
      expectChecks: ['removable-annotation'],
      minLeaks: 1,
    }
  )
}

// 6) (removed) The metadata-leak fixture was retired when document-level
// metadata/outline checks were disabled. The numbering gap is intentional so
// the remaining fixtures keep their existing filenames.

// 7) Rotated page (/Rotate 90) with a superficial mark -------------------
{
  const y = 700
  const pre = 'Codename: '
  const secret = 'Cardinal'
  const xS = X + tw(pre, SIZE)
  const wS = tw(secret, SIZE)
  let c = textAt(X, y, pre)
  c += textAt(xS, y, secret)
  c += textAt(xS + wS, y, ' (do not circulate).')
  c += `0 0 0 rg\n${blackBox(xS, y, wS)} f\n`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    page(' /Rotate 90'),
    stream(c),
    FONT,
  ]
  add(
    '07-rotated-superficial.pdf',
    'Superficial mark on a rotated page',
    serialize(objs),
    {
      grade: 'F',
      expectChecks: ['superficial-mark'],
      minLeaks: 1,
    }
  )
}

// 8) Hidden OCR-style text layer under a full-page image -----------------
{
  const y = 700
  const pre = 'Scanned record: '
  const secret = 'Marcus Cole'
  const xS = X + tw(pre, SIZE)
  const wS = tw(secret, SIZE)
  // Full-page 1x1 white image (makes the page look like a scan), then text,
  // then a black box over the name.
  let c = 'q 612 0 0 792 0 0 cm /Im0 Do Q\n'
  c += textAt(X, y, pre)
  c += textAt(xS, y, secret)
  c += textAt(xS + wS, y, ' — file 22A.')
  c += `0 0 0 rg\n${blackBox(xS, y, wS)} f\n`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    page('', 4, 5, 6),
    stream(c),
    FONT,
    '<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /BitsPerComponent 8 /ColorSpace /DeviceGray /Length 1 >>\nstream\n\xff\nendstream',
  ]
  add(
    '08-ocr-layer-leak.pdf',
    'Invisible text under a scanned page',
    serialize(objs),
    {
      grade: 'F',
      expectChecks: ['ocr-layer-leak'],
      minLeaks: 1,
    }
  )
}

// 9) Properly redacted control — should produce NO findings --------------
{
  const y = 700
  // Text with the secret simply absent (truly removed), clean metadata.
  let c = textAt(X, y, 'Authorized by             on the date shown above.')
  c += textAt(X, y - 30, 'All sensitive fields were removed before export.')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    page(''),
    stream(c),
    FONT,
    '<< /Producer (Acme PDF 1.0) >>',
  ]
  add(
    '09-clean-control.pdf',
    'Correctly redacted (no leaks)',
    serialize(objs, {info: 6}),
    {
      grade: 'A',
      expectNoFindings: true,
    }
  )
}

// 10) Visible exemption label stamped ON TOP of an applied redaction -----
// Mirrors what redaction tools export when "show exemption reason" is on:
// the text under the box was genuinely removed, the black box was drawn, and
// the reason was painted over the box in white. The label is visible by
// design and must not be reported as text hidden under the mark.
{
  const y = 700
  const label = 'Redacted - personal privacy'
  const labelW = tw(label, SIZE)
  const boxW = labelW / 0.75 // label tiles 75% of the box (over MIN_COVERAGE)
  const labelX = X + (boxW - labelW) / 2
  let c = textAt(X, y + 30, 'Disciplinary review, prepared by HR.')
  c += textAt(X, y - 30, 'Resolution recorded and filed by the clerk.')
  c += `0 0 0 rg\n${blackBox(X, y, boxW)} f\n`
  c += `1 1 1 rg\n${textAt(labelX, y, label)}`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    page(''),
    stream(c),
    FONT,
  ]
  add(
    '10-exemption-overlay.pdf',
    'Visible exemption label over an applied redaction',
    serialize(objs),
    {
      grade: 'A',
      expectNoFindings: true,
    }
  )
}

// 11) White text painted BEFORE the box — hidden, despite the label colour
// Control for the overlay-label exemption: z-order is what separates a label
// from a leak. This text could be copied out from under the box, so it must
// still be flagged even though it is white like an exemption label.
{
  const y = 700
  const pre = 'Approved settlement amount: '
  const secret = '$2,750,000'
  const xS = X + tw(pre, SIZE)
  const wS = tw(secret, SIZE)
  let c = textAt(X, y, pre)
  c += `1 1 1 rg\n${textAt(xS, y, secret)}`
  c += `0 0 0 rg\n${blackBox(xS, y, wS)} f\n`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    page(''),
    stream(c),
    FONT,
  ]
  add(
    '11-white-text-under-box.pdf',
    'White text painted before the box',
    serialize(objs),
    {
      grade: 'F',
      expectChecks: ['superficial-mark'],
      minLeaks: 1,
      recoveredIncludes: ['2,750,000'],
    }
  )
}

// 12) Multiple findings per page, including a repeated drawing operation.
{
  const secret = 'Northwind'
  const w = tw(secret, SIZE)
  const first = `${textAt(X, 700, secret)}0 0 0 rg\n${blackBox(X, 700, w)} f\n`
  let c = first
  c += `${blackBox(X, 700, w)} f\n` // duplicate cover, not another leak
  c += textAt(320, 700, secret)
  c += `${blackBox(320, 700, w)} f\n`
  c += textAt(X, 600, 'Project Cardinal')
  c += textAt(X, 500, 'The code is ')
  const gapX = X + tw('The code is ', SIZE)
  c += textAt(gapX + 50, 500, ' for this project.')
  c += `${blackBox(gapX, 500, 50)} f\n`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 7 0 R] /Count 2 >>',
    page(' /Annots [6 0 R]'),
    stream(c),
    FONT,
    `<< /Type /Annot /Subtype /Square /Rect [72 597 ${(X + tw('Project Cardinal', SIZE)).toFixed(1)} 612] /C [0 0 0] /IC [0 0 0] /CA 1 >>`,
    page('', 8),
    stream(first),
  ]
  add(
    '12-page-findings.pdf',
    'Grouped pages with distinct and duplicate findings',
    serialize(objs),
    {
      grade: 'F',
      expectChecks: ['superficial-mark', 'removable-annotation', 'word-size'],
      minLeaks: 4,
      minWarnings: 1,
      recoveredIncludes: ['Northwind', 'Project Cardinal'],
    }
  )
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(fixtures, null, 2))
console.log(`Wrote ${fixtures.length} example PDFs + manifest.json to ${OUT}`)
for (const f of fixtures) console.log(`  ${f.file} — grade ${f.grade}`)
