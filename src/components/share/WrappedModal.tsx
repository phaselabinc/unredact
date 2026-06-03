'use client'

import {useEffect, useRef} from 'react'
import {FiX} from 'react-icons/fi'
import type {AnalysisSummary} from '@/lib/analyzer/types'
import {ShareCard} from './ShareCard'
import {ShareButtons} from './ShareButtons'

export function WrappedModal({
  summary,
  open,
  onClose,
}: {
  summary: AnalysisSummary
  open: boolean
  onClose: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Move focus into the dialog so keyboard users land inside it.
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      // Restore focus to whatever opened the modal.
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-ink/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Share your redaction grade"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="my-auto w-full max-w-md animate-fade-in-up rounded-3xl bg-white p-5 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your redaction Wrapped</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-circle btn-ghost btn-sm"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl shadow-lg">
          <ShareCard ref={cardRef} summary={summary} />
        </div>

        <div className="mt-4">
          <ShareButtons cardRef={cardRef} summary={summary} />
        </div>
      </div>
    </div>
  )
}
