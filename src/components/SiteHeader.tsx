'use client'

import {useState} from 'react'
import {FiMenu, FiX} from 'react-icons/fi'
import {Logo} from './Logo'

const DEMO_URL = 'https://www.phase.law/get-started'

const NAV_LINKS = [
  {href: '#how-redactions-fail', label: 'How redactions fail'},
  {href: '#try-it', label: 'Try it yourself'},
  {href: '#privacy', label: 'Privacy'},
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-brand-almond/70 bg-brand-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <a
          href="#top"
          className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-vermillion"
        >
          <Logo />
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-brand-ink/70 transition-colors hover:text-brand-ink"
            >
              {link.label}
            </a>
          ))}
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm rounded-xl border-brand-ink/15 normal-case hover:border-brand-ink hover:bg-brand-ink hover:text-brand-cream"
          >
            Book a demo
          </a>
          <a
            href="#try-it"
            className="btn btn-primary btn-sm rounded-xl normal-case shadow-sm"
          >
            Check a PDF
          </a>
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          className="btn btn-ghost btn-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-brand-almond/70 bg-brand-cream px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-medium text-brand-ink/80 hover:bg-brand-almond/40"
              >
                {link.label}
              </a>
            ))}
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="btn btn-outline btn-sm mt-1 rounded-xl border-brand-ink/15 normal-case"
            >
              Book a demo
            </a>
            <a
              href="#try-it"
              onClick={() => setOpen(false)}
              className="btn btn-primary btn-sm mt-1 rounded-xl normal-case"
            >
              Check a PDF
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
