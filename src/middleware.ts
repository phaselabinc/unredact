import {NextRequest, NextResponse} from 'next/server'

/**
 * Per-request Content-Security-Policy with a fresh nonce.
 *
 * The single most important directive here is `connect-src 'self'`: it means the
 * page is not allowed to open a network connection to anywhere except its own
 * origin. Combined with fully client-side analysis, that makes it structurally
 * impossible for the page to upload a user's PDF (or any text recovered from it)
 * to a third party, even if a dependency were compromised.
 *
 * Next.js automatically applies this nonce to the framework's own inline scripts
 * when it sees a nonce in the CSP header, so we avoid `'unsafe-inline'` for
 * scripts entirely.
 */
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())

  const csp = [
    `default-src 'self'`,
    // `strict-dynamic` lets the nonced bootstrap script load the rest; `'self'`
    // is the fallback for browsers that ignore strict-dynamic. `wasm-unsafe-eval`
    // allows pdf.js image decoders to use WebAssembly without enabling eval().
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`,
    // Inline styles are needed for dynamically positioned redaction overlays and
    // Next/DaisyUI runtime styles. `'unsafe-inline'` for styles can in principle
    // be a CSS side channel, but the destinations one would use are all closed:
    // img-src/font-src/connect-src are pinned to 'self' (+ data:/blob:), so
    // injected CSS still cannot reach an external origin.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    // Lock outbound connections to our own origin only — no data can leave.
    `connect-src 'self'`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `manifest-src 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({request: {headers: requestHeaders}})
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  // Run on all routes except Next internals and static assets, which don't need
  // a per-request nonce and benefit from being cacheable.
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|pdf.worker.min.mjs|pdfjs/).*)',
      missing: [
        {type: 'header', key: 'next-router-prefetch'},
        {type: 'header', key: 'purpose', value: 'prefetch'},
      ],
    },
  ],
}
