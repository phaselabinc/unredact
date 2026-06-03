'use client'

import {useState} from 'react'
import {FiEye, FiEyeOff, FiMousePointer} from 'react-icons/fi'
import {cn} from '@/lib/cn'

/**
 * Interactive demonstration of the "superficial mark" failure: a black box that
 * only *looks* like a redaction. Reveal it the same way anyone with a PDF reader
 * could — by changing the colour behind it or selecting the text.
 */
export function RedactionDemo() {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="rounded-3xl border border-brand-almond bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-ink/60">
          Live demo
        </span>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="btn btn-primary btn-sm rounded-xl normal-case"
        >
          {revealed ? (
            <FiEyeOff className="h-4 w-4" />
          ) : (
            <FiEye className="h-4 w-4" />
          )}
          {revealed ? 'Hide the text again' : 'Reveal what’s under the box'}
        </button>
      </div>

      <div className="rounded-2xl bg-brand-cream/60 p-5 font-mono text-[0.95rem] leading-7 text-brand-ink">
        <p>
          MEMO: The acquisition will be funded by{' '}
          <span
            className={cn(
              'rounded-sm px-1 transition-colors duration-300',
              revealed
                ? 'bg-brand-vermillion/15 text-brand-ink ring-1 ring-brand-vermillion'
                : 'bg-brand-ink text-brand-ink'
            )}
          >
            Meridian Capital Partners
          </span>{' '}
          before the end of Q3.
        </p>
        <p className="mt-3">
          The internal valuation came in at{' '}
          <span
            className={cn(
              'rounded-sm px-1 transition-colors duration-300',
              revealed
                ? 'bg-brand-vermillion/15 text-brand-ink ring-1 ring-brand-vermillion'
                : 'bg-brand-ink text-brand-ink'
            )}
          >
            $412 million
          </span>
          .
        </p>
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm text-brand-ink/60">
        <FiMousePointer className="mt-0.5 h-4 w-4 shrink-0 text-brand-vermillion" />
        <span>
          The text never went anywhere — the box is just a black rectangle drawn
          on top. Changing the colour behind it (or selecting and copying)
          reveals it instantly. <strong>unredact</strong> reads it straight from
          the file.
        </span>
      </p>
    </div>
  )
}
