import {FiArrowDown, FiShield} from 'react-icons/fi'

/**
 * A word with a *failed* redaction over it — a hastily-drawn black bar that's
 * translucent and skewed, so the word reads right through it. The real text
 * stays selectable (it's an h1), and on hover the bar slides + fades, like a
 * redaction giving up its secret the moment you look. The whole product, in one
 * word.
 */
function FailedRedaction({children}: {children: string}) {
  return (
    <span className="group relative inline-block whitespace-nowrap">
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden="true"
        className="absolute -inset-x-2 inset-y-[0.12em] z-20 -rotate-[1.5deg] rounded-[3px] bg-brand-ink/75 shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-all duration-500 ease-out group-hover:translate-x-[0.5em] group-hover:rotate-[0.5deg] group-hover:bg-brand-ink/20"
      />
    </span>
  )
}

export function Hero() {
  return (
    <section
      id="top"
      className="bg-paper relative overflow-hidden border-b border-brand-almond/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Is your <FailedRedaction>redaction</FailedRedaction>{' '}
            <span className="text-gradient-brand">actually safe?</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-ink/70">
            Most “redacted” PDFs still carry the very text they’re meant to
            hide. Drop one in and we’ll try to read what’s under the black boxes
            — entirely in your browser. Your file never leaves your device.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#try-it"
              className="btn btn-primary btn-lg w-full rounded-xl normal-case shadow-md sm:w-auto"
            >
              Check your PDF
            </a>
            <a
              href="#how-redactions-fail"
              className="btn btn-outline btn-lg w-full rounded-xl border-brand-ink/15 normal-case hover:border-brand-ink hover:bg-brand-ink hover:text-brand-cream sm:w-auto"
            >
              See how redactions fail <FiArrowDown className="h-4 w-4" />
            </a>
          </div>

          <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-brand-ink/50">
            <FiShield className="h-4 w-4 text-brand-blue" /> No upload · no
            account · no storage · open about how it works
          </p>
        </div>
      </div>
    </section>
  )
}
