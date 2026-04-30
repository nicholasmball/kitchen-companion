'use client'

import { useEffect, useState } from 'react'
import { toast as sonnerToast } from 'sonner'

interface BehindToastProps {
  toastId: string | number
  deltaMin: number
  newServeLabel: string
  durationMs: number
  onPushBack: () => void
}

export function BehindToast({
  toastId,
  deltaMin,
  newServeLabel,
  durationMs,
  onPushBack,
}: BehindToastProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const remaining = Math.max(0, 100 - ((Date.now() - start) / durationMs) * 100)
      setProgress(remaining)
      if (remaining === 0) clearInterval(id)
    }, 50)
    return () => clearInterval(id)
  }, [durationMs])

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex items-center gap-2.5 rounded-[0.55rem] bg-[#5C3D1E] px-3.5 py-2.5 text-white shadow-[0_6px_14px_rgba(0,0,0,0.25)]"
      style={{ minWidth: 320, maxWidth: 'calc(100vw - 2rem)' }}
    >
      <span aria-hidden className="text-base leading-none">⚠️</span>
      <div className="flex-1 text-[0.82rem] leading-[1.35]">
        <strong className="font-extrabold">You&apos;re {deltaMin} min behind.</strong>
        <br />
        <small className="opacity-85">
          Push serve to <strong className="font-extrabold">{newServeLabel}</strong>?
        </small>
      </div>
      <button
        type="button"
        onClick={() => {
          onPushBack()
          sonnerToast.dismiss(toastId)
        }}
        className="shrink-0 rounded-[0.4rem] bg-[#D97B4A] px-2.5 py-1.5 text-[0.72rem] font-extrabold text-white transition-colors hover:bg-[#C46A3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#5C3D1E]"
      >
        Push back
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => sonnerToast.dismiss(toastId)}
        className="shrink-0 rounded-[0.3rem] border-0 bg-transparent px-1.5 py-1 text-base leading-none text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        ✕
      </button>
      <div
        aria-hidden
        className="absolute bottom-0 left-0 h-0.5 rounded-b-[0.55rem] bg-[#D97B4A] transition-[width] duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

interface ShowBehindToastOptions {
  deltaMin: number
  newServeLabel: string
  durationMs?: number
  onPushBack: () => void
}

export function showBehindToast({
  deltaMin,
  newServeLabel,
  durationMs = 12000,
  onPushBack,
}: ShowBehindToastOptions) {
  return sonnerToast.custom(
    (id) => (
      <BehindToast
        toastId={id}
        deltaMin={deltaMin}
        newServeLabel={newServeLabel}
        durationMs={durationMs}
        onPushBack={onPushBack}
      />
    ),
    { duration: durationMs }
  )
}
