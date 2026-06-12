import type {Metadata, Viewport} from 'next'
import {Ubuntu, JetBrains_Mono} from 'next/font/google'
import './globals.css'

/*
 * Render dynamically so the per-request CSP nonce set in middleware is injected
 * into the framework scripts. With `strict-dynamic`, un-nonced scripts are
 * blocked — a statically prerendered page would ship scripts without the nonce
 * and fail to hydrate.
 */
export const dynamic = 'force-dynamic'

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  variable: '--font-ubuntu',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-mono',
})

const SITE_URL = 'https://unredact.phaselab.co'
const TITLE = 'Unredact: is your redaction actually safe?'
const DESCRIPTION =
  'A free, open-source tool from phaselaw that finds failed PDF redactions: black boxes you can still read underneath, words you can guess from their size, and hidden text. It all runs in your browser. Your file never leaves your device.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {default: TITLE, template: '%s · Unredact'},
  description: DESCRIPTION,
  applicationName: 'Unredact',
  keywords: [
    'redaction',
    'PDF redaction',
    'unredact',
    'failed redaction',
    'de-redaction',
    'document security',
    'privacy',
    'phaselaw',
  ],
  authors: [{name: 'phaselaw', url: 'https://phase.law'}],
  creator: 'phaselaw',
  robots: {index: true, follow: true},
  openGraph: {
    type: 'website',
    siteName: 'Unredact',
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    creator: '@phaselaw',
  },
  icons: {icon: '/icon.svg', shortcut: '/favicon.svg'},
}

export const viewport: Viewport = {
  themeColor: '#F9F5EC',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      data-theme="pl_light"
      className={`${ubuntu.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-brand-cream font-sans text-brand-ink antialiased">
        {children}
      </body>
    </html>
  )
}
