'use client'

import {useState, type RefObject} from 'react'
import {
  FiDownload,
  FiShare2,
  FiTwitter,
  FiLinkedin,
  FiFacebook,
  FiCheck,
} from 'react-icons/fi'
import type {AnalysisSummary} from '@/lib/analyzer/types'

const SITE_URL = 'https://unredact.phaselab.co'

function shareText(summary: AnalysisSummary): string {
  if (summary.grade === 'F') {
    return `I ran a "redacted" PDF through unredact and it scored an F — the hidden text was sitting right under the black boxes. Most redactions don't actually remove anything. Check your own:`
  }
  if (summary.grade === 'A') {
    return `I ran my redacted PDF through unredact and it scored an A — properly redacted, nothing recoverable. Check yours:`
  }
  return `I checked a redacted PDF with unredact and it scored a ${summary.grade}. Most "redactions" leak more than people think. Check your own:`
}

export function ShareButtons({
  cardRef,
  summary,
}: {
  cardRef: RefObject<HTMLDivElement>
  summary: AnalysisSummary
}) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const renderPng = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null
    const {toBlob} = await import('html-to-image')
    return toBlob(cardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#16151C',
    })
  }

  const download = async () => {
    setBusy(true)
    try {
      const blob = await renderPng()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-redaction-grade-${summary.grade}.png`
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } finally {
      setBusy(false)
    }
  }

  const nativeShare = async () => {
    setBusy(true)
    try {
      const blob = await renderPng()
      const file = blob
        ? new File([blob], `redaction-grade-${summary.grade}.png`, {
            type: 'image/png',
          })
        : null
      const data: ShareData = {
        title: 'My redaction grade',
        text: shareText(summary),
        url: SITE_URL,
      }
      if (file && navigator.canShare?.({files: [file]})) {
        await navigator.share({...data, files: [file]})
      } else if (navigator.share) {
        await navigator.share(data)
      }
    } catch {
      // user cancelled or unsupported
    } finally {
      setBusy(false)
    }
  }

  const text = encodeURIComponent(shareText(summary))
  const url = encodeURIComponent(SITE_URL)
  const intents = {
    x: `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=unredact`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  }

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="btn btn-primary flex-1 rounded-xl normal-case disabled:opacity-60"
        >
          {done ? (
            <FiCheck className="h-4 w-4" />
          ) : (
            <FiDownload className="h-4 w-4" />
          )}
          {done ? 'Saved!' : 'Download image'}
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            disabled={busy}
            className="btn btn-outline flex-1 rounded-xl border-brand-almond normal-case hover:border-brand-vermillion hover:bg-brand-cream"
          >
            <FiShare2 className="h-4 w-4" /> Share
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-brand-ink/50">Post to</span>
        <a
          href={intents.x}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          className="btn btn-circle btn-sm border-brand-almond bg-white hover:border-brand-ink hover:bg-brand-ink hover:text-brand-cream"
        >
          <FiTwitter className="h-4 w-4" />
        </a>
        <a
          href={intents.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className="btn btn-circle btn-sm border-brand-almond bg-white hover:border-brand-blue hover:bg-brand-blue hover:text-brand-cream"
        >
          <FiLinkedin className="h-4 w-4" />
        </a>
        <a
          href={intents.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className="btn btn-circle btn-sm border-brand-almond bg-white hover:border-brand-blue hover:bg-brand-blue hover:text-brand-cream"
        >
          <FiFacebook className="h-4 w-4" />
        </a>
      </div>

      <p className="text-[0.7rem] leading-relaxed text-brand-ink/45">
        The shareable image shows only your grade and counts — never your file,
        its name, or anything we recovered from it.
      </p>
    </div>
  )
}
