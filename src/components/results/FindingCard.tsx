'use client'

import {useState} from 'react'
import {FiEye, FiEyeOff, FiImage, FiAlertTriangle} from 'react-icons/fi'
import type {Finding} from '@/lib/analyzer/types'
import {cn} from '@/lib/cn'
import {WordSizeGuess} from './WordSizeGuess'

type RenderResult = {dataUrl: string; pageWidth: number; pageHeight: number}

const SEVERITY_STYLE = {
  leak: {
    chip: 'bg-brand-vermillion/10 text-brand-vermillion border-brand-vermillion/30',
    ring: 'ring-brand-vermillion',
    label: 'Recoverable',
  },
  warning: {
    chip: 'bg-brand-carrot/10 text-brand-pumpkin border-brand-carrot/40',
    ring: 'ring-brand-carrot',
    label: 'Risky',
  },
  info: {
    chip: 'bg-brand-blue/10 text-brand-blue border-brand-blue/30',
    ring: 'ring-brand-blue',
    label: 'Heads-up',
  },
} as const

/** One problem card per page, with all of its findings on a shared preview. */
export function FindingCard({
  findings,
  docTokens,
  onRenderPage,
}: {
  findings: Finding[]
  docTokens: string[]
  onRenderPage?: (page: number) => Promise<RenderResult>
}) {
  const page = findings[0]!.page
  const explanations = new Map<string, {finding: Finding; areas: number[]}>()
  findings.forEach((finding, index) => {
    const key = JSON.stringify([
      finding.check,
      finding.severity,
      finding.title,
      finding.detail,
    ])
    const explanation = explanations.get(key)
    if (explanation) explanation.areas.push(index + 1)
    else explanations.set(key, {finding, areas: [index + 1]})
  })
  const [render, setRender] = useState<RenderResult | null>(null)
  const [rendering, setRendering] = useState(false)
  const [renderError, setRenderError] = useState(false)
  const handleViewInDoc = async () => {
    if (!onRenderPage || page < 1 || render || rendering) return
    setRendering(true)
    setRenderError(false)
    try {
      setRender(await onRenderPage(page))
    } catch {
      setRenderError(true)
    } finally {
      setRendering(false)
    }
  }

  return (
    <section
      aria-label={`Problems on page ${page}`}
      className="overflow-hidden rounded-2xl border border-brand-almond bg-white shadow-sm"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold">Page {page}</h3>
          <span className="text-xs font-medium text-brand-ink/50">
            {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {[...explanations.values()].map(({finding, areas}) => (
            <div key={finding.id}>
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold leading-tight">{finding.title}</h4>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold',
                    SEVERITY_STYLE[finding.severity].chip
                  )}
                >
                  {SEVERITY_STYLE[finding.severity].label}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-brand-ink/50">
                {areas.length === 1 ? 'Area' : 'Areas'} {areas.join(', ')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-brand-ink/80">
                {finding.detail}
              </p>
            </div>
          ))}
        </div>

        {onRenderPage && page > 0 && findings.some((f) => f.bbox) && (
          <div className="mt-3">
            {!render && (
              <button
                type="button"
                onClick={handleViewInDoc}
                disabled={rendering}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline disabled:opacity-50"
              >
                <FiImage className="h-3.5 w-3.5" />
                {rendering ? 'Rendering page…' : 'Show original page'}
              </button>
            )}
            {renderError && (
              <p className="inline-flex items-center gap-1 text-xs text-brand-ink/50">
                <FiAlertTriangle className="h-3.5 w-3.5" /> Couldn’t render this
                page.
              </p>
            )}
            {render && (
              <>
                <p className="mb-2 text-xs text-brand-ink/60">
                  Original page. Numbered outlines show the affected areas.
                </p>
                <div className="relative mt-2 overflow-hidden rounded-xl border border-brand-almond">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={render.dataUrl}
                    alt={`Page ${page}`}
                    className="block w-full"
                  />
                  {findings.map(
                    (finding, index) =>
                      finding.bbox && (
                        <span
                          key={finding.id}
                          aria-label={`Finding ${index + 1}: ${finding.title}`}
                          className={cn(
                            'pointer-events-none absolute rounded-sm ring-2',
                            SEVERITY_STYLE[finding.severity].ring
                          )}
                          style={{
                            left: `${(finding.bbox[0] / render.pageWidth) * 100}%`,
                            top: `${(finding.bbox[1] / render.pageHeight) * 100}%`,
                            width: `${((finding.bbox[2] - finding.bbox[0]) / render.pageWidth) * 100}%`,
                            height: `${((finding.bbox[3] - finding.bbox[1]) / render.pageHeight) * 100}%`,
                          }}
                        >
                          <span className="absolute bottom-full left-0 rounded-t bg-brand-ink px-1 text-[10px] font-bold leading-tight text-white">
                            {index + 1}
                          </span>
                        </span>
                      )
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <ol className="mt-4 divide-y divide-brand-almond border-t border-brand-almond">
          {findings.map((finding, index) => (
            <li key={finding.id} className="py-3 last:pb-0">
              <FindingDetail
                finding={finding}
                number={index + 1}
                docTokens={docTokens}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function FindingDetail({
  finding,
  number,
  docTokens,
}: {
  finding: Finding
  number: number
  docTokens: string[]
}) {
  const [revealed, setRevealed] = useState(false)
  const revealText = finding.recovered?.text

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h5 className="text-sm font-semibold">Area {number}</h5>
        {revealText && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={`${revealed ? 'Hide' : 'Reveal'} text for area ${number}`}
            aria-expanded={revealed}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-vermillion hover:underline"
          >
            {revealed ? (
              <FiEyeOff className="h-3.5 w-3.5" />
            ) : (
              <FiEye className="h-3.5 w-3.5" />
            )}
            {revealed ? 'Hide' : 'Reveal'} text
          </button>
        )}
      </div>
      {revealText ? (
        <div
          className={cn(
            'mt-2 select-text rounded-xl border border-brand-almond bg-brand-ink/5 px-3 py-2 font-mono text-sm text-brand-ink',
            !revealed && 'pointer-events-none select-none blur-sm'
          )}
        >
          {revealed ? revealText : '•••••••••••••••••••'}
        </div>
      ) : (
        <p className="mt-1 text-xs text-brand-ink/60">
          No readable text recovered.
        </p>
      )}
      {finding.width && (
        <WordSizeGuess width={finding.width} docTokens={docTokens} />
      )}
    </>
  )
}
