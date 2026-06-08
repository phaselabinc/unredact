// Downloads the real-world DoJ court documents listed in real-manifest.json into
// examples/real/ (which is gitignored) and verifies each by SHA-256. These PDFs
// are deliberately NOT committed — see the note in real-manifest.json.
//
// Run: npm run examples:real
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  createReadStream,
} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const realDir = join(here, 'real')
const manifest = JSON.parse(
  readFileSync(join(here, 'real-manifest.json'), 'utf8')
)

function sha256(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(path)
      .on('data', (d) => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

mkdirSync(realDir, {recursive: true})

let ok = true
for (const entry of manifest.files) {
  const dest = join(realDir, entry.file)
  if (existsSync(dest) && (await sha256(dest)) === entry.sha256) {
    console.log(`✓ ${entry.file} already present (sha256 ok)`)
    continue
  }
  console.log(`↓ ${entry.file}\n  from ${entry.source}`)
  try {
    const res = await fetch(entry.source, {
      headers: {'User-Agent': 'unredact-example-fetcher'},
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(dest, buf)
    const got = await sha256(dest)
    if (got !== entry.sha256) {
      ok = false
      console.error(
        `  ✗ sha256 mismatch\n    expected ${entry.sha256}\n    got      ${got}`
      )
    } else {
      console.log(`  ✓ ${buf.length} bytes (sha256 ok)`)
    }
  } catch (err) {
    ok = false
    console.error(`  ✗ failed: ${err.message}`)
    console.error(
      `    The canonical DoJ copy is age-gated; this uses the CourtListener mirror.`
    )
  }
}

console.log(
  ok
    ? '\nDone. Run `npm test` to include the real-world cases.'
    : '\nSome files failed — the real-world tests will be skipped until they are present.'
)
process.exit(ok ? 0 : 1)
