import {forwardRef} from 'react'
import type {AnalysisSummary} from '@/lib/analyzer/types'
import {GRADE_META} from '@/lib/checkMeta'
import {BrandGlyph} from '../Logo'

function headline(summary: AnalysisSummary): {title: string; sub: string} {
  if (summary.grade === 'F') {
    return {
      title: 'This PDF wasn’t really redacted.',
      sub: `We pulled ${summary.leakCount} hidden ${
        summary.leakCount === 1 ? 'passage' : 'passages'
      } straight out from under the black boxes.`,
    }
  }
  if (summary.grade === 'D') {
    return {
      title: 'These redactions leak.',
      sub: 'The text was removed — but the box sizes still give away what they hide.',
    }
  }
  if (summary.grade === 'C') {
    return {
      title: 'The metadata is still talking.',
      sub: 'The body looks covered, but the document properties weren’t cleaned.',
    }
  }
  if (summary.grade === 'B') {
    return {
      title: 'Almost airtight.',
      sub: 'Nothing recoverable — but a structural detail could still hint at content.',
    }
  }
  return {
    title: 'This one holds up.',
    sub: 'We couldn’t recover anything. That’s what a real redaction looks like.',
  }
}

const Stat = ({value, label}: {value: string; label: string}) => (
  <div className="flex flex-col">
    <span className="font-display text-3xl font-bold leading-none">
      {value}
    </span>
    <span className="mt-1 text-xs uppercase tracking-wide text-brand-cream/55">
      {label}
    </span>
  </div>
)

/**
 * The screenshot-friendly "Wrapped" card. It is rendered from AnalysisSummary
 * ONLY — counts and labels, never recovered text or filenames — so it is always
 * safe to share publicly.
 */
export const ShareCard = forwardRef<HTMLDivElement, {summary: AnalysisSummary}>(
  function ShareCard({summary}, ref) {
    const {title, sub} = headline(summary)
    const meta = GRADE_META[summary.grade]

    return (
      <div
        ref={ref}
        className="relative flex aspect-square w-full max-w-[460px] flex-col justify-between overflow-hidden bg-brand-ink p-8 text-brand-cream"
      >
        {/* brand glow */}
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-vermillion/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-brand-blue/40 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandGlyph className="h-6 w-6 text-brand-vermillion" />
            <span className="text-sm font-bold tracking-tight">unredact</span>
          </div>
          <span className="text-xs font-medium text-brand-cream/60">
            redaction check
          </span>
        </div>

        <div className="relative">
          <div className="flex items-end gap-4">
            <span
              className="font-display text-[5.5rem] font-bold leading-none"
              style={{color: gradeColor(summary.grade)}}
            >
              {summary.grade}
            </span>
            <span className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-cream/70">
              {meta.label}
            </span>
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold leading-tight">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-cream/75">
            {sub}
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3 border-t border-brand-cream/15 pt-5">
          <Stat value={String(summary.pagesAnalyzed)} label="pages scanned" />
          <Stat value={String(summary.leakCount)} label="recoverable" />
          <Stat
            value={summary.metadataLeak ? 'Yes' : 'No'}
            label="metadata leak"
          />
        </div>

        <p className="relative text-center text-xs font-medium text-brand-cream/50">
          Check your own at unredact.phaselab.co
        </p>
      </div>
    )
  }
)

function gradeColor(grade: AnalysisSummary['grade']): string {
  switch (grade) {
    case 'F':
      return '#FF392E'
    case 'D':
      return '#F36E0A'
    case 'C':
      return '#F79605'
    case 'B':
      return '#A3CB38'
    default:
      return '#3BB273'
  }
}
