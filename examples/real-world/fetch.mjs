// Downloads the real-world documents listed in manifest.json into this directory
// (examples/real-world/, which is gitignored for *.pdf) and verifies each by
// SHA-256. These PDFs are deliberately NOT committed — see the note in
// manifest.json.
//
// Run: npm run examples:real
import {
  existsSync,
  readFileSync,
  writeFileSync,
  createReadStream,
} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(here, 'manifest.json'), 'utf8'))

function sha256(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(path)
      .on('data', (d) => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

let ok = true
for (const entry of manifest.files) {
  const dest = join(here, entry.file)
  if (existsSync(dest) && (await sha256(dest)) === entry.sha256) {
    console.log(`✓ ${entry.file} already present (sha256 ok)`)
    continue
  }
  const tag = entry.kind === 'control' ? ' [control]' : ''
  console.log(`↓ ${entry.file}${tag}\n  from ${entry.source}`)
  try {
    const res = await fetch(entry.source, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
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
    if (entry.canonical) {
      console.error(`    The canonical copy may be gated; tried a mirror.`)
    }
  }
}

console.log(
  ok
    ? '\nDone. Run `npm test` to include the real-world cases.'
    : '\nSome files failed — the real-world tests will skip those until they are present.'
)
process.exit(ok ? 0 : 1)
