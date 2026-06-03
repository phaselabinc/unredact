// Copies the pdf.js worker and supporting asset directories out of node_modules
// into /public so the browser can load them same-origin (no CDN, no third-party
// network fetch — which keeps our `connect-src 'self'` CSP and our "your file
// never leaves the browser" promise intact).
//
// Run as part of `dev`/`build` (see package.json). It is deliberately a project
// script, not an install hook, because .npmrc sets ignore-scripts=true.

import {existsSync, mkdirSync, copyFileSync, cpSync, readdirSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const pkg = join(root, 'node_modules', 'pdfjs-dist')
const publicDir = join(root, 'public')

if (!existsSync(pkg)) {
  console.error('[copy-pdfjs] pdfjs-dist not installed; run npm install first.')
  process.exit(1)
}

function findWorker() {
  const buildDir = join(pkg, 'build')
  const candidates = [
    'pdf.worker.min.mjs',
    'pdf.worker.mjs',
    'pdf.worker.min.js',
    'pdf.worker.js',
  ]
  for (const name of candidates) {
    const p = join(buildDir, name)
    if (existsSync(p)) return {path: p, name}
  }
  const found = readdirSync(buildDir).find((f) => f.startsWith('pdf.worker'))
  if (found) return {path: join(buildDir, found), name: found}
  throw new Error('Could not locate pdf.worker.* in pdfjs-dist/build')
}

const worker = findWorker()
// Always publish under a stable name the app references.
copyFileSync(worker.path, join(publicDir, 'pdf.worker.min.mjs'))
console.log(`[copy-pdfjs] worker: ${worker.name} -> public/pdf.worker.min.mjs`)

const pdfjsPublic = join(publicDir, 'pdfjs')
mkdirSync(pdfjsPublic, {recursive: true})

for (const dir of ['cmaps', 'standard_fonts']) {
  const src = join(pkg, dir)
  if (existsSync(src)) {
    cpSync(src, join(pdfjsPublic, dir), {recursive: true})
    console.log(`[copy-pdfjs] assets: ${dir} -> public/pdfjs/${dir}`)
  } else {
    console.warn(`[copy-pdfjs] missing optional asset dir: ${dir}`)
  }
}

console.log('[copy-pdfjs] done.')
