'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  formatElapsed,
  getCurrentPauseElapsedSeconds,
  type PausableMealPlan,
} from '@/lib/plan-pause'

interface PausedBannerProps {
  plan: PausableMealPlan
  onResume: () => void
  onPushBack?: () => void
  resuming?: boolean
}

/**
 * Sticky amber banner shown when the meal plan is paused.
 * Pulses subtly (respects prefers-reduced-motion) and ticks the elapsed
 * counter every second. The visual centrepiece of the pause feature.
 */
export function PausedBanner({ plan, onResume, onPushBack, resuming }: PausedBannerProps) {
  const [elapsed, setElapsed] = useState(() => getCurrentPauseElapsedSeconds(plan))

  useEffect(() => {
    if (!plan.paused_at) return
    setElapsed(getCurrentPauseElapsedSeconds(plan))
    const interval = setInterval(() => {
      setElapsed(getCurrentPauseElapsedSeconds(plan))
    }, 1000)
    return () => clearInterval(interval)
  }, [plan])

  // Tab title prefix so users glancing at a browser tab also see the pause state.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!plan.paused_at) return
    const original = document.title
    document.title = original.startsWith('⏸ Paused — ') ? original : `⏸ Paused — ${original}`
    return () => {
      document.title = original
    }
  }, [plan.paused_at])

  if (!plan.paused_at) return null

  const elapsedLabel = formatElapsed(elapsed)
  const ariaLabel = `Resume the meal plan, currently paused for ${elapsedLabel}`

  return (
    <div
      role="status"
      aria-live="polite"
      className="paused-banner relative overflow-hidden rounded-xl bg-[#C99846] text-white p-4 shadow-warm-lg"
    >
      <PauseBannerStyles />
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-lg font-extrabold"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-extrabold leading-tight">Plan paused</div>
            <div className="text-sm opacity-95 tabular-nums">Paused for {elapsedLabel}</div>
          </div>
        </div>
        <Button
          type="button"
          onClick={onResume}
          disabled={resuming}
          aria-label={ariaLabel}
          className="w-full min-h-[56px] bg-white text-[#8B5A2B] hover:bg-white/90 font-extrabold text-base shadow-md"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          {resuming ? 'Resuming…' : 'Resume plan'}
        </Button>
        <div className="flex items-center gap-2 bg-black/15 rounded-lg px-3 py-2 text-xs leading-snug">
          <span aria-hidden="true">🔥</span>
          <span>Don&apos;t forget the oven is still on!</span>
        </div>
        {onPushBack && (
          <button
            type="button"
            onClick={onPushBack}
            className="text-sm underline underline-offset-2 opacity-90 hover:opacity-100 self-start"
          >
            Going to be longer? Push the serve time back instead.
          </button>
        )}
      </div>
    </div>
  )
}

function PauseBannerStyles() {
  return (
    <style jsx>{`
      .paused-banner::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(
          ellipse at top right,
          rgba(255, 255, 255, 0.18),
          transparent 60%
        );
        animation: paused-pulse 3s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes paused-pulse {
        0%, 100% {
          opacity: 0.5;
        }
        50% {
          opacity: 1;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .paused-banner::before {
          animation: none;
          opacity: 0.7;
        }
      }
    `}</style>
  )
}
