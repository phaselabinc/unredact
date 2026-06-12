'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {FiAlertCircle, FiLoader, FiLock} from 'react-icons/fi'
import {PdfAnalyzer} from '@/lib/analyzer/client'
import {
  AnalyzerError,
  type AnalysisProgress,
  type AnalysisResult,
} from '@/lib/analyzer/types'
import {UploadDropzone} from './upload/UploadDropzone'
import {ResultsView} from './results/ResultsView'

type Status = 'idle' | 'analyzing' | 'results' | 'error'

export function TryIt() {
  const analyzerRef = useRef<PdfAnalyzer | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    void analyzerRef.current?.destroy()
    analyzerRef.current = null
    setStatus('idle')
    setResult(null)
    setError(null)
    setProgress(null)
  }, [])

  // Tear down any in-flight analysis and the pdf.js worker if this unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      void analyzerRef.current?.destroy()
      analyzerRef.current = null
    }
  }, [])

  const handleSampleError = useCallback(() => {
    setError('We couldn’t load the sample. Try one of your own PDFs instead.')
    setStatus('error')
  }, [])

  const handleFile = useCallback(async (file: File) => {
    await analyzerRef.current?.destroy()
    const analyzer = new PdfAnalyzer()
    analyzerRef.current = analyzer
    const ac = new AbortController()
    abortRef.current = ac

    setStatus('analyzing')
    setProgress(null)
    setError(null)
    setResult(null)

    try {
      const res = await analyzer.analyze(file, {
        onProgress: setProgress,
        signal: ac.signal,
      })
      setResult(res)
      setStatus('results')
    } catch (err) {
      if (err instanceof AnalyzerError && err.code === 'aborted') {
        setStatus('idle')
        return
      }
      await analyzer.destroy()
      analyzerRef.current = null
      setError(
        err instanceof AnalyzerError
          ? err.message
          : 'Something went wrong reading that PDF.'
      )
      setStatus('error')
    }
  }, [])

  const renderPage = useCallback(
    (page: number, opts?: {revealAnnotations?: boolean}) =>
      analyzerRef.current
        ? analyzerRef.current.renderPage(page, opts)
        : Promise.reject(new Error('No document')),
    []
  )

  if (status === 'results' && result) {
    return (
      <ResultsView result={result} onReset={reset} onRenderPage={renderPage} />
    )
  }

  if (status === 'analyzing') {
    const pct =
      progress && progress.totalPages > 0
        ? Math.round((progress.page / progress.totalPages) * 100)
        : 0
    return (
      <div className="flex flex-col items-center rounded-3xl border border-brand-almond bg-white p-10 text-center shadow-sm">
        <FiLoader className="h-10 w-10 animate-spin text-brand-vermillion" />
        <h3 className="mt-4 text-lg font-semibold">
          {progress?.phase === 'loading' || !progress
            ? 'Opening your PDF…'
            : `Scanning page ${progress.page} of ${progress.totalPages}`}
        </h3>
        <div className="mt-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-brand-almond">
          <div
            className="h-full rounded-full bg-brand-vermillion transition-all duration-300"
            style={{width: `${Math.max(8, pct)}%`}}
          />
        </div>
        <p className="mt-3 text-sm text-brand-ink/60">
          {progress && progress.findingsSoFar > 0
            ? `${progress.findingsSoFar} thing${
                progress.findingsSoFar === 1 ? '' : 's'
              } found so far…`
            : 'Looking for text under marks, telltale box widths, and leaky metadata…'}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-blue">
          <FiLock className="h-3 w-3" /> Running entirely on your device
        </p>
        <button
          type="button"
          onClick={reset}
          className="btn btn-ghost btn-sm mt-4 rounded-xl normal-case text-brand-ink/60"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-brand-vermillion/30 bg-brand-vermillion/5 p-10 text-center">
        <FiAlertCircle className="h-10 w-10 text-brand-vermillion" />
        <h3 className="mt-4 text-lg font-semibold">
          We couldn’t scan that file
        </h3>
        <p className="mt-1 max-w-md text-sm text-brand-ink/70">{error}</p>
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary btn-sm mt-5 rounded-xl normal-case"
        >
          Try another PDF
        </button>
      </div>
    )
  }

  return <UploadDropzone onFile={handleFile} onError={handleSampleError} />
}
