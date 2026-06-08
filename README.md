# unredact

**Is your redaction actually safe?** A fun, public, fully client-side tool that
finds failed PDF redactions — black boxes you can still read underneath, words
you can guess from their size, removable marks, and leaky metadata. An
experiment by [phaselaw](https://phase.law).

> **The whole point:** your document never leaves your browser. There is no
> upload, no server that sees your file, and no storage. Analysis runs entirely
> on your device with [pdf.js](https://mozilla.github.io/pdf.js/) +
> WebAssembly.

## What it checks

| Check | What it finds |
| --- | --- |
| **Superficial mark** | A black box drawn over text that was never removed — still selectable and copy-pasteable. We recover the text. |
| **Word-size leak** | A "clean" box whose width still reveals roughly how many characters it hides. Includes an interactive, clearly-speculative guesser. |
| **Removable annotation** | Black boxes that are draggable/deletable PDF annotations rather than flattened content (incl. un-applied `Redact` annotations). |
| **Metadata leak** | Title / Author / Subject still naming sensitive content in the document properties. |
| **OCR-layer leak** | An invisible, searchable text layer under a scanned page that a mark didn't actually remove. |

The two mandated checks (superficial marks, word-size) plus three additions were
chosen from research into real-world redaction failures; see the design notes in
the PR.

## Architecture

- **Next.js (App Router) + TypeScript**, Tailwind + DaisyUI on the phaselaw
  `pl_light` theme. Deployed to Vercel.
- **`src/lib/analyzer/`** — the engine. pdf.js parses in its worker; the
  orchestrator (`client.ts`) runs light geometry/overlap analysis on the main
  thread, page by page, behind hard caps and an overall wall-clock deadline.
  - `extract.ts` — text runs, dark filled-path covers (operator-list walk with a
    graphics-state CTM stack), annotation covers, metadata/outline.
  - `checks.ts` — the five checks; recovers text by clipping line-runs to the
    box and snapping to word boundaries.
  - `width.ts` — main-thread, calibration-based width estimates for the
    word-size guesser (framed as speculative).
- **Share** — a "Wrapped"-style card rendered to PNG client-side
  (`html-to-image`) plus X / LinkedIn / Facebook intents. The card and the
  public OG image are built from **counts only** — never recovered text,
  filenames, or document content.

## Security & privacy model

This app is public and unauthenticated, so it is designed to never receive a
user's file in the first place.

- **No exfiltration path.** Strict per-request CSP (see `src/middleware.ts`) with
  `connect-src 'self'` — the page physically cannot send file data to a third
  party, even if a dependency were compromised. Nonce + `strict-dynamic` for
  scripts (no `'unsafe-inline'`/`'unsafe-eval'`).
- **Hardened pdf.js** (`pdf-loader.ts`): `isEvalSupported: false`
  (CVE-2024-4367), `enableXfa: false`, scripting left disabled, fonts not
  installed into the page, standard fonts & CMaps served same-origin, and a
  capped `maxImageSize` against decompression bombs.
- **Input validation** (`validate.ts`): magic-byte `%PDF-` check (never trusts
  the extension/MIME), a 30 MB size cap checked before reading, and a page cap.
- **DoS resistance** (`constants.ts` + `client.ts`): per-page and per-document
  caps (ops, text items, covers, findings), per-page timeouts, and a 30s overall
  deadline that destroys the document and tears down the worker.
- **No content logging / no storage.** Nothing is written to
  `localStorage`/`IndexedDB`; buffers are released after use.
- **Supply chain** (`.npmrc`): `ignore-scripts`, `min-release-age`, exact-pinned
  `pdfjs-dist`, committed lockfile.
- **Headers** (`next.config.mjs`): `X-Content-Type-Options`, `X-Frame-Options:
  DENY`, `Referrer-Policy`, a locked-down `Permissions-Policy`, COOP/CORP, HSTS.

## Develop

```bash
npm install        # respects .npmrc (ignore-scripts, min-release-age)
npm run dev        # copies pdf.js assets, then next dev → http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build (also copies pdf.js assets to /public)
npm run typecheck  # tsc --noEmit
npm run format     # prettier --write + eslint --fix
npm run examples   # regenerate the example PDFs + manifest in examples/
node scripts/make-sample-pdf.mjs            # regenerate the in-app demo "leaky" PDF
```

## Tests

Two layers, both driven by the documents in [`examples/`](./examples):

```bash
npm test           # Vitest: runs the real analyzer over every example PDF and
                   #   asserts the expected checks/grade/recovered text — plus a
                   #   clean-control fixture that must produce zero findings.
npm run test:e2e   # Playwright: uploads example PDFs through the real UI and
                   #   asserts the alerts render and the strict CSP isn't tripped.
```

The Vitest suite runs the actual `extract` → `checks` → `grade` modules against
each fixture via pdf.js's Node build, so it tests the shipping detection logic
(not a reimplementation). The Playwright suite uses your local Google Chrome
(`channel: 'chrome'`); in CI without Chrome, run `npx playwright install
chromium` and drop the `channel` in `playwright.config.ts`.

### Real-world documents

`npm run examples:real` downloads a private set of **famous, publicly-documented
redaction failures** and runs them through the shipping analyzer. The current
corpus and a results table live in
[`examples/real-world/`](./examples/real-world/README.md):

| Document | Year | Our grade |
| --- | --- | --- |
| TSA Screening Management SOP | 2009 | **F** (superficial ×25 + metadata + bookmark + word-size) |
| Manafort response (*US v. Manafort*) | 2019 | **F** (superficial ×32, incl. the p.5 polling-data passage) |
| USVI v. JPMorgan, Exhibit 1 (DoJ Epstein release) | 2022 | **F** (superficial ×71, incl. p.41, + metadata) |
| EU–AstraZeneca contract *(true-negative control)* | 2021 | **A** (correctly clean) |

These PDFs are **never committed**: they contain the very content their failed
redactions exposed, and storing improperly-disclosed third-party data in the
repo would be exactly the mistake this tool exists to catch. They are fetched
into `examples/real-world/` (gitignored) and verified by SHA-256; only the
PII-free [`manifest.json`](./examples/real-world/manifest.json) (source URL +
hash + expected counts) is tracked. `tests/real-examples.test.ts` asserts on each
when present and skips it when absent. Note the main Dec-2025 EFTA Epstein
release (Datasets 01–07) was *correctly* redacted per the PDF Association; the
genuine failures are in older court exhibits like the JPMorgan one.

The pdf.js worker, standard fonts, and CMaps are copied out of `node_modules`
into `/public` at build time by `scripts/copy-pdfjs.mjs` (kept out of git).

## Limitations

A clean result means we didn't find the failures we check for — **not** that a
document is provably safe. The word-size guesser is deliberately speculative
(width alone can't identify a word). For real matters, redact with tools built
for it.
