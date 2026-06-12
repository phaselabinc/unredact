# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately via
[GitHub's private vulnerability reporting](https://github.com/phaselabinc/unredact/security/advisories/new)
rather than opening a public issue. We'll respond as quickly as we can.

## What counts

The product promise is that a user's document never leaves their browser, so
beyond the usual web vulnerabilities we especially want to hear about:

- any way the page can transmit file contents, recovered text, or filenames to
  any origin (including ours);
- CSP bypasses (`src/middleware.ts` pins `connect-src 'self'`);
- ways a hostile PDF can escape the analyzer's resource caps and hang or crash
  the tab (`src/lib/analyzer/constants.ts`);
- pdf.js hardening gaps in `src/lib/analyzer/pdf-loader.ts`.

False negatives in redaction detection (a leak we fail to find) are welcome as
regular issues with a sample PDF, as long as the sample contains no real
sensitive data.

## Supported versions

Only the latest deployment at [unredact.phaselab.co](https://unredact.phaselab.co)
and the current `main` branch are supported.
