'use client'

import { Button } from '@/components/ui/button'

interface PlanControlsBarProps {
  onPause: () => void
  onPushBack: () => void
  pausing?: boolean
}

/**
 * The Pause + Push-back bar shown directly under the planner page header
 * for a running plan with a serve time set. Both buttons are 56 px tall to
 * meet the "messy hands" tap-target principle.
 */
export function PlanControlsBar({ onPause, onPushBack, pausing }: PlanControlsBarProps) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        onClick={onPause}
        disabled={pausing}
        aria-label="Pause the meal plan"
        className="flex-1 min-h-[56px] bg-[#C99846] hover:bg-[#B5853C] text-white text-base font-extrabold shadow-md"
      >
        <PauseIcon className="w-5 h-5 mr-2" />
        {pausing ? 'Pausing…' : 'Pause plan'}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onPushBack}
        aria-label="Push back the serve time"
        className="flex-1 min-h-[56px] text-base font-bold"
      >
        <ClockIcon className="w-5 h-5 mr-2" />
        Push back
      </Button>
    </div>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  )
}
