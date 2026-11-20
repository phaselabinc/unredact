'use client'

import {useMemo, useState} from 'react'
import {FiRefreshCw, FiShare2, FiCheckCircle} from 'react-icons/fi'
import type {AnalysisResult, Finding} from '@/lib/analyzer/types'
import {GRADE_META} from '@/lib/checkMeta'
import {RedactionGradeBadge} from '../share/RedactionGrade'
import {ReportModal} from '../share/ReportModal'
import {FindingCard} from './FindingCard'

type RenderResult = {dataUrl: string; pageWidth: number; pageHeight: number}

const SEVERITY_ORDER = {leak: 0, warning: 1, info: 2} as const

export function ResultsView({
  result,
  onReset,
  onRenderPage,
}: {
  result: AnalysisResult
  onReset: () => void
  onRenderPage?: (
    page: number,
    opts?: {revealAnnotations?: boolean}
  ) => Promise<RenderResult>
}) {
  const {summary} = result
  const meta = GRADE_META[summary.grade]
  const [reportOpen, setReportOpen] = useState(false)

  const pages = useMemo(() => {
    const groups = new Map<number, Finding[]>()
    const sorted = [...result.findings].sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        a.page - b.page
    )
    for (const finding of sorted) {
      const group = groups.get(finding.page)
      if (group) group.push(finding)
      else groups.set(finding.page, [finding])
    }
    return [...groups.values()].map((group) =>
      group.sort(
        (a, b) =>
          (a.bbox?.[1] ?? Infinity) - (b.bbox?.[1] ?? Infinity) ||
          (a.bbox?.[0] ?? Infinity) - (b.bbox?.[0] ?? Infinity)
      )
    )
  }, [result.findings])

  const clean = summary.totalFindings === 0

  return (
    <div className="animate-fade-in-up">
      {/* Summary header */}
      <div className="rounded-3xl border border-brand-almond bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <RedactionGradeBadge grade={summary.grade} size="lg" />
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-ink/50">
              Redaction grade
            </p>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {meta.label}
            </h2>
            <p className="mt-1 text-brand-ink/70">{meta.blurb}</p>
            <p className="mt-3 text-sm text-brand-ink/60">
              Scanned {summary.pagesAnalyzed} of {summary.totalPages}{' '}
              {summary.totalPages === 1 ? 'page' : 'pages'} ·{' '}
              <span className="font-semibold text-brand-vermillion">
                {summary.leakCount}
              </span>{' '}
              recoverable passages ·{' '}
              <span className="font-semibold text-brand-pumpkin">
                {summary.warningCount}
              </span>{' '}
              risky ·{' '}
              <span className="font-semibold text-brand-blue">
                {summary.infoCount}
              </span>{' '}
              heads-up
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="btn btn-primary rounded-xl normal-case"
          >
            <FiShare2 className="h-4 w-4" /> See your report
          </button>
          <button
            type="button"
            onClick={onReset}
            className="btn btn-ghost rounded-xl normal-case text-brand-ink/70"
          >
            <FiRefreshCw className="h-4 w-4" /> Check another PDF
          </button>
        </div>

        {summary.truncated && (
          <p className="mt-4 rounded-xl bg-brand-cream px-3 py-2 text-xs text-brand-ink/60">
            This is a large document, so we scanned the first{' '}
            {summary.pagesAnalyzed} pages and stopped to keep things fast.
          </p>
        )}
      </div>

      {/* Findings */}
      {clean ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center">
          <FiCheckCircle className="h-12 w-12 text-emerald-500" />
          <h3 className="text-xl font-bold">
            Nothing leaked that we could find
          </h3>
          <p className="max-w-md text-sm text-brand-ink/70">
            We didn’t find selectable text under any marks, telltale box widths,
            or removable annotations. That’s what a real redaction looks like.
            (No tool can promise a document is perfectly safe, but this one
            passed our checks.)
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          <p className="text-sm font-medium text-brand-ink/60">
            Problems on {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </p>
          {pages.map((findings) => (
            <FindingCard
              key={findings[0]!.page}
              findings={findings}
              docTokens={result.docTokens}
              onRenderPage={onRenderPage}
            />
          ))}
        </div>
      )}

      <ReportModal
        summary={summary}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  )
}
