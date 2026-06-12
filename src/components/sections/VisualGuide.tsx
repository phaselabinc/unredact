import type {CheckId} from '@/lib/analyzer/types'
import {CHECK_META} from '@/lib/checkMeta'
import {RedactionDemo} from '../guide/RedactionDemo'

const GUIDE_ORDER: CheckId[] = [
  'superficial-mark',
  'word-size',
  'removable-annotation',
  'metadata-leak',
  'ocr-layer-leak',
  'outline-leak',
]

const CASES = [
  {
    when: '2019',
    who: 'A U.S. court filing',
    what: 'Lawyers “blacked out” passages, but the text could be copied straight out of the PDF, exposing sensitive details under the boxes.',
  },
  {
    when: '2021',
    who: 'A government vaccine contract',
    what: 'Redacted figures and clauses were still readable through the document’s structure and annotations.',
  },
  {
    when: 'Over and over',
    who: 'Settlements, FOIA responses, filings',
    what: 'The same mistakes repeat: a rectangle drawn on top of text that was never actually removed.',
  },
]

export function VisualGuide() {
  return (
    <section
      id="how-redactions-fail"
      className="border-b border-brand-almond/60 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            How redactions fail
          </h2>
          <p className="mt-4 text-lg text-brand-ink/70">
            A black box looks final. But a PDF is data, not a photo of paper,
            and the “hidden” text is often still right there. Here’s what we
            look for.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:items-center">
          <RedactionDemo />
          <div>
            <h3 className="font-display text-2xl font-bold">
              The black box that isn’t
            </h3>
            <p className="mt-3 text-brand-ink/70">
              The most common failure by far: someone draws a filled rectangle
              over the words, exports the PDF, and ships it. The rectangle is
              just decoration painted on top. The original characters are still
              in the file, fully selectable and searchable. Try the demo: the
              text was there the whole time.
            </p>
            <p className="mt-3 text-brand-ink/70">
              Proper redaction <em>removes</em> the underlying content instead
              of covering it up.
            </p>
          </div>
        </div>

        {/* Check grid */}
        <div className="mt-16">
          <h3 className="text-center font-display text-2xl font-bold">
            The checks we run
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDE_ORDER.map((id) => {
              const meta = CHECK_META[id]
              return (
                <div
                  key={id}
                  className="rounded-2xl border border-brand-almond bg-brand-cream/40 p-5 transition-shadow hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-vermillion shadow-sm">
                    <meta.Icon className="h-5 w-5" />
                  </span>
                  <h4 className="mt-4 font-semibold">{meta.label}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-ink/65">
                    {meta.blurb}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Real-world cases */}
        <div className="mt-16 rounded-3xl bg-brand-ink p-8 text-brand-cream sm:p-10">
          <h3 className="font-display text-2xl font-bold">
            This keeps happening, even to people who should know better
          </h3>
          <p className="mt-2 max-w-2xl text-brand-cream/70">
            Botched redactions have exposed informants, deal terms, and personal
            data in high-profile documents. New tools, same mistake.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {CASES.map((c) => (
              <div
                key={c.who}
                className="border-l-2 border-brand-vermillion pl-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-vermillion">
                  {c.when}
                </p>
                <p className="mt-1 font-semibold">{c.who}</p>
                <p className="mt-1 text-sm leading-relaxed text-brand-cream/70">
                  {c.what}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
