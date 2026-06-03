/**
 * Static, non-nonce security headers live here. The Content-Security-Policy is
 * set per-request in middleware.ts so it can carry a fresh nonce.
 *
 * Security posture: this app analyzes PDFs entirely in the browser. No document
 * bytes are ever sent anywhere. The headers below lock the page down so that a
 * malicious file (or a future bug) cannot quietly exfiltrate a user's document.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Treat lint/type errors as build failures on CI.
  eslint: {ignoreDuringBuilds: false},
  typescript: {ignoreBuildErrors: false},
  webpack: (config) => {
    /*
     * pdf.js optionally requires the Node-only `canvas` package for server-side
     * rendering. We only ever run it in the browser, so stub it out to keep it
     * out of the client bundle.
     */
    config.resolve.alias = {...config.resolve.alias, canvas: false}
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {key: 'X-Content-Type-Options', value: 'nosniff'},
          {key: 'X-Frame-Options', value: 'DENY'},
          {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=(), payment=(), usb=()',
          },
          {key: 'Cross-Origin-Opener-Policy', value: 'same-origin'},
          {key: 'Cross-Origin-Resource-Policy', value: 'same-origin'},
          {key: 'X-DNS-Prefetch-Control', value: 'off'},
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default nextConfig
