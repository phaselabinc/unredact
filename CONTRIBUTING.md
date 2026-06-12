# Contributing

Thanks for your interest in unredact. Issues and pull requests are welcome,
whether it's a detection gap, a false positive, or a fix.

## Getting started

```bash
npm install        # respects .npmrc (ignore-scripts, min-release-age)
npm run dev        # copies pdf.js assets, then next dev → http://localhost:3000
```

Node 22 or 24 is required (see `.nvmrc` / `engines`).

## Before you open a PR

Run the same checks CI runs:

```bash
npm run check-format   # prettier
npm run lint           # eslint (next/core-web-vitals + prettier)
npm run typecheck      # tsc --noEmit
npm test               # vitest: the real analyzer over every example PDF
npm run test:e2e       # playwright: upload flow in a real browser
```

`npm run format` fixes formatting and lint issues in one go.

The Playwright suite uses your locally-installed Google Chrome. If you don't
have Chrome, run `npx playwright install chromium` once; CI does the same.

## Working on the analyzer

The detection engine lives in `src/lib/analyzer/`. Two rules:

1. **Every behavior change needs a fixture.** The PDFs in `examples/` are
   hand-built by `examples/generate.mjs`, one per failure mode, and
   `tests/examples.test.ts` asserts the expected grade and findings for each.
   If you change detection behavior, add or update a fixture and regenerate
   with `npm run examples` (this rewrites `examples/manifest.json`, so expected
   grades live in `generate.mjs`, not the manifest).
2. **False positives matter as much as misses.** `09-clean-control.pdf` and
   `10-exemption-overlay.pdf` must keep producing zero findings. If your change
   flags them, it's wrong.

`npm run examples:real` additionally fetches a set of famous, publicly
documented redaction failures (never committed, see
`examples/real-world/README.md`) that the test suite verifies against when
present.

## The privacy invariant

This tool's whole premise is that a user's document never leaves their
browser. Anything that breaks that is a bug, not a feature request:

- No network calls that carry file data, recovered text, or filenames. The CSP
  (`src/middleware.ts`) pins `connect-src 'self'` on purpose; don't loosen it.
- Anything shareable (cards, OG images) is built from `AnalysisSummary`, which
  holds counts only. Keep it that way.
- No analytics or storage of document content.

## Conventions

- PR titles follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`fix:`, `feat:`, `chore:`, lowercase).
- Formatting is enforced by Prettier; don't fight it.
- Copy style: plain declarative sentences, no em-dashes.
