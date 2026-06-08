'use client'

import {useRef, useState} from 'react'
import {FiUploadCloud, FiFileText, FiLock} from 'react-icons/fi'
import {cn} from '@/lib/cn'

export function UploadDropzone({
  onFile,
  onError,
  disabled,
}: {
  onFile: (file: File) => void
  onError?: () => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)

  const pick = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  const useSample = async () => {
    if (disabled) return
    setLoadingSample(true)
    try {
      const res = await fetch('/samples/leaky-example.pdf')
      if (!res.ok) throw new Error('sample unavailable')
      const blob = await res.blob()
      onFile(new File([blob], 'leaky-example.pdf', {type: 'application/pdf'}))
    } catch {
      onError?.()
    } finally {
      setLoadingSample(false)
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Choose a PDF to scan for failed redactions"
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) pick(e.dataTransfer.files)
        }}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all',
          dragging
            ? 'border-brand-vermillion bg-brand-vermillion/5'
            : 'border-brand-almond bg-white hover:border-brand-vermillion/60 hover:bg-brand-cream/40',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          aria-label="Choose a PDF to scan"
          className="hidden"
          onChange={(e) => pick(e.target.files)}
        />
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-vermillion/10 text-brand-vermillion transition-transform group-hover:scale-105">
          <FiUploadCloud className="h-7 w-7" />
        </span>
        <p className="mt-4 text-lg font-semibold">
          Drop a PDF here, or click to choose one
        </p>
        <p className="mt-1 max-w-sm text-sm text-brand-ink/60">
          We’ll scan it for failed redactions on the spot.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-medium text-brand-blue">
          <FiLock className="h-3 w-3" /> Nothing is uploaded — analysis runs on
          your device
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        <span className="text-brand-ink/50">No PDF handy?</span>
        <button
          type="button"
          onClick={useSample}
          disabled={disabled || loadingSample}
          className="inline-flex items-center gap-1.5 font-medium text-brand-vermillion hover:underline disabled:opacity-50"
        >
          <FiFileText className="h-4 w-4" />
          {loadingSample ? 'Loading…' : 'Try our badly-redacted sample'}
        </button>
      </div>
    </div>
  )
}
