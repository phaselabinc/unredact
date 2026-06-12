'use client'

import {useEffect, useMemo, useState} from 'react'
import {FiSearch} from 'react-icons/fi'
import type {WidthAnalysis} from '@/lib/analyzer/types'
import {cn} from '@/lib/cn'
import {rankCandidates, scoreGuess, type Candidate} from '@/lib/width'

const VERDICT_LABEL: Record<string, string> = {
  'too-short': 'Too short for the box',
  'too-long': 'Too long for the box',
  plausible: 'Could fit',
  strong: 'Fits the box very well',
}

const VERDICT_COLOR: Record<string, string> = {
  'too-short': 'text-brand-blue',
  'too-long': 'text-brand-vermillion',
  plausible: 'text-brand-carrot',
  strong: 'text-emerald-600',
}

export function WordSizeGuess({
  width,
  docTokens,
}: {
  width: WidthAnalysis
  docTokens: string[]
}) {
  const [guess, setGuess] = useState('')
  const [showCandidates, setShowCandidates] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [loading, setLoading] = useState(false)

  const score = useMemo(
    () => (guess.trim() ? scoreGuess(guess, width) : null),
    [guess, width]
  )

  useEffect(() => {
    if (!showCandidates || candidates || width.isLikelyNumeric) return
    let active = true
    setLoading(true)
    rankCandidates(width, docTokens)
      .then((c) => active && setCandidates(c))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [showCandidates, candidates, width, docTokens])

  const [minC, maxC] = width.charCountRange

  return (
    <div className="mt-3 rounded-xl border border-brand-almond bg-brand-cream/60 p-4">
      <p className="text-sm text-brand-ink/80">
        The box is{' '}
        <span className="font-semibold">{width.boxWidthPt.toFixed(0)} pt</span>{' '}
        wide in roughly{' '}
        <span className="font-semibold">
          {width.fontSizePt.toFixed(0)}pt {width.fontClass}
        </span>{' '}
        type, which fits about{' '}
        <span className="font-semibold text-brand-vermillion">
          {minC}–{maxC} characters
        </span>
        .
      </p>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-brand-ink/60">
          Type a guess and we’ll tell you if it’s the right size
        </label>
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink/40" />
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value.slice(0, 60))}
            placeholder="e.g. a name or a word…"
            className="input input-bordered w-full rounded-xl border-brand-almond bg-white pl-9 text-sm focus:border-brand-vermillion focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {score && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn('font-semibold', VERDICT_COLOR[score.verdict])}
              >
                {VERDICT_LABEL[score.verdict]}
              </span>
              <span className="text-brand-ink/50">
                {Math.round(score.confidence * 100)}% size match
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-almond">
              <div
                className="h-full rounded-full bg-brand-vermillion transition-all"
                style={{width: `${Math.round(score.confidence * 100)}%`}}
              />
            </div>
          </div>
        )}
      </div>

      {width.isLikelyNumeric ? (
        <p className="mt-3 text-xs text-brand-ink/50">
          This redaction looks numeric. Digits are nearly the same width, so the
          box reveals little beyond its length.
        </p>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowCandidates((v) => !v)}
            className="text-xs font-medium text-brand-blue underline underline-offset-2 hover:text-brand-vermillion"
          >
            {showCandidates ? 'Hide' : 'Show'} words that would fit
            (speculative)
          </button>
          {showCandidates && (
            <div className="mt-2">
              {loading && (
                <p className="text-xs text-brand-ink/50">
                  Measuring candidates…
                </p>
              )}
              {candidates && candidates.length === 0 && (
                <p className="text-xs text-brand-ink/50">
                  No common words or names match this width closely.
                </p>
              )}
              {candidates && candidates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {candidates.map((c) => (
                    <button
                      key={`${c.source}-${c.word}`}
                      type="button"
                      onClick={() => setGuess(c.word)}
                      title={`${Math.round(c.confidence * 100)}% size match`}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs transition-colors',
                        c.source === 'document'
                          ? 'border-brand-blue/40 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20'
                          : 'border-brand-almond bg-white text-brand-ink/70 hover:border-brand-vermillion'
                      )}
                    >
                      {c.word}
                      {c.source === 'document' && (
                        <span className="ml-1 opacity-60">· in doc</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[0.7rem] leading-relaxed text-brand-ink/40">
                These are words whose rendered width is <em>consistent with</em>{' '}
                the box, not what it necessarily says. Width alone can’t
                identify a word.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
