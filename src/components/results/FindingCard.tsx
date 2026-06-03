'use client'

import {useState} from 'react'
import {FiEye, FiEyeOff, FiImage, FiAlertTriangle} from 'react-icons/fi'
import type {Finding} from '@/lib/analyzer/types'
import {CHECK_META} from '@/lib/checkMeta'
import {cn} from '@/lib/cn'
import {WordSizeGuess} from './WordSizeGuess'

type RenderResult = {dataUrl: string; pageWidth: number; pageHeight: number}

const SEVERITY_STYLE = {
  leak: {
    chip: 'bg-brand-vermillion/10 text-brand-vermillion border-brand-vermillion/30',
    bar: 'bg-brand-vermillion',
    label: 'Recoverable',
  },
  warning: {
    chip: 'bg-brand-carrot/10 text-brand-pumpkin border-brand-carrot/40',
    bar: 'bg-brand-carrot',
    label: 'Risky',
  },
  info: {
    chip: 'bg-brand-blue/10 text-brand-blue border-brand-blue/30',
    bar: 'bg-brand-blue',
    label: 'Heads-up',
  },
} as const

export function FindingCard({
  finding,
  docTokens,
  onRenderPage,
}: {
  finding: Finding
  docTokens: string[]
  onRenderPage?: (
    page: number,
    opts?: {revealAnnotations?: boolean}
  ) => Promise<RenderResult>
}) {
  const meta = CHECK_META[finding.check]
  const sev = SEVERITY_STYLE[finding.severity]
  const [revealed, setRevealed] = useState(false)
  const [render, setRender] = useState<RenderResult | null>(null)
  const [rendering, setRendering] = useState(false)
  const [renderError, setRenderError] = useState(false)

  const revealText = finding.recovered?.text ?? finding.metaField?.value ?? null

  // For annotation-based redactions, render with annotations disabled so the
  // cover is removed and the text it was hiding shows in the page image.
  const isAnnotationCover =
    finding.coverKind === 'redact-annot' ||
    finding.coverKind === 'square-annot' ||
    finding.coverKind === 'highlight-annot'

  const handleViewInDoc = async () => {
    if (!onRenderPage || finding.page < 1 || render || rendering) return
    setRendering(true)
    setRenderError(false)
    try {
      setRender(
        await onRenderPage(finding.page, {revealAnnotations: isAnnotationCover})
      )
    } catch {
      setRenderError(true)
    } finally {
      setRendering(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-almond bg-white shadow-sm">
      <div className={cn('h-1 w-full', sev.bar)} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-brand-ink/70">
              <meta.Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold leading-tight">{finding.title}</h3>
              <p className="mt-0.5 text-xs font-medium text-brand-ink/50">
                {meta.short}
                {finding.page > 0 && <> · page {finding.page}</>}
              </p>
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold',
              sev.chip
            )}
          >
            {sev.label}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-brand-ink/80">
          {finding.detail}
        </p>

        {revealText && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-vermillion hover:underline"
            >
              {revealed ? (
                <FiEyeOff className="h-3.5 w-3.5" />
              ) : (
                <FiEye className="h-3.5 w-3.5" />
              )}
              {revealed ? 'Hide' : 'Reveal'}{' '}
              {finding.recovered
                ? 'what was under the box'
                : 'the leaked value'}
            </button>
            <div
              className={cn(
                'select-text rounded-xl border border-brand-almond bg-brand-ink/5 px-3 py-2 font-mono text-sm text-brand-ink',
                !revealed && 'pointer-events-none select-none blur-sm'
              )}
            >
              {revealed ? revealText : '•••••••••••••••••••'}
              {finding.recovered && finding.recovered.text.length === 0 && (
                <span className="text-brand-ink/40">(no readable text)</span>
              )}
            </div>
          </div>
        )}

        {finding.width && (
          <WordSizeGuess width={finding.width} docTokens={docTokens} />
        )}

        {onRenderPage && finding.page > 0 && finding.bbox && (
          <div className="mt-3">
            {!render && (
              <button
                type="button"
                onClick={handleViewInDoc}
                disabled={rendering}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline disabled:opacity-50"
              >
                <FiImage className="h-3.5 w-3.5" />
                {rendering
                  ? 'Rendering page…'
                  : isAnnotationCover
                    ? 'Show the page with the mark removed'
                    : 'Show where it is in the document'}
              </button>
            )}
            {renderError && (
              <p className="inline-flex items-center gap-1 text-xs text-brand-ink/50">
                <FiAlertTriangle className="h-3.5 w-3.5" /> Couldn’t render this
                page.
              </p>
            )}
            {render && finding.bbox && (
              <div className="relative mt-2 overflow-hidden rounded-xl border border-brand-almond">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={render.dataUrl}
                  alt={`Page ${finding.page}`}
                  className="block w-full"
                />
                <span
                  className="pointer-events-none absolute rounded-sm ring-2 ring-brand-vermillion"
                  style={{
                    left: `${(finding.bbox[0] / render.pageWidth) * 100}%`,
                    top: `${(finding.bbox[1] / render.pageHeight) * 100}%`,
                    width: `${((finding.bbox[2] - finding.bbox[0]) / render.pageWidth) * 100}%`,
                    height: `${((finding.bbox[3] - finding.bbox[1]) / render.pageHeight) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
