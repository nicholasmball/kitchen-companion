'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PUSHBACK_QUICK_PICKS_MIN,
  isValidPushBackTarget,
  previewPushedServeTime,
} from '@/lib/plan-pause'

interface PushBackMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentServeTime: string
  /** Called with the chosen pushback. */
  onApply: (
    selection: { addMinutes: number } | { newServeTime: string }
  ) => Promise<void> | void
}

/**
 * Push-back picker. Shows quick-pick options (each labelled with the
 * resulting serve time so cooks pick by destination) plus a custom-time
 * input. Used from both the planner page and inside the paused banner.
 */
export function PushBackMenu({
  open,
  onOpenChange,
  currentServeTime,
  onApply,
}: PushBackMenuProps) {
  const [mode, setMode] = useState<'quick' | 'custom'>('quick')
  const [customValue, setCustomValue] = useState(() => toDatetimeLocalValue(currentServeTime))
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (open) {
      setMode('quick')
      setCustomValue(toDatetimeLocalValue(currentServeTime))
    }
  }, [open, currentServeTime])

  const handleQuickPick = async (addMinutes: number) => {
    setApplying(true)
    try {
      await onApply({ addMinutes })
      onOpenChange(false)
    } finally {
      setApplying(false)
    }
  }

  const handleCustom = async () => {
    const iso = new Date(customValue).toISOString()
    if (!isValidPushBackTarget(iso)) return
    setApplying(true)
    try {
      await onApply({ newServeTime: iso })
      onOpenChange(false)
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !applying && onOpenChange(v)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Push serve time…</DialogTitle>
          <DialogDescription>
            Currently set for {formatServeTime(currentServeTime)}.
          </DialogDescription>
        </DialogHeader>

        {mode === 'quick' ? (
          <div className="flex flex-col gap-1.5">
            {PUSHBACK_QUICK_PICKS_MIN.map((mins) => {
              const newTime = previewPushedServeTime(currentServeTime, mins)
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleQuickPick(mins)}
                  disabled={applying}
                  className="flex items-center justify-between w-full min-h-[48px] px-3 py-2 rounded-md border border-border bg-background hover:bg-muted transition-colors text-left disabled:opacity-50"
                >
                  <span className="font-bold text-sm">+{mins} min</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    → {formatServeTime(newTime.toISOString())}
                  </span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setMode('custom')}
              disabled={applying}
              className="w-full min-h-[48px] px-3 py-2 rounded-md text-sm font-bold text-primary hover:bg-primary/5 mt-1 transition-colors disabled:opacity-50"
            >
              Pick a new time…
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label htmlFor="custom-serve-time" className="block text-sm font-bold text-foreground">
              New serve time
            </label>
            <Input
              id="custom-serve-time"
              type="datetime-local"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              min={toDatetimeLocalValue(new Date().toISOString())}
            />
            <button
              type="button"
              onClick={() => setMode('quick')}
              disabled={applying}
              className="text-xs text-muted-foreground hover:underline"
            >
              ← Back to quick picks
            </button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          {mode === 'custom' && (
            <Button
              onClick={handleCustom}
              disabled={applying || !isValidPushBackTarget(safeIso(customValue))}
            >
              {applying ? 'Saving…' : 'Push to this time'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────

function toDatetimeLocalValue(isoString: string): string {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return ''
  // datetime-local needs YYYY-MM-DDTHH:MM in local time, not UTC.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function safeIso(localValue: string): string {
  try {
    return new Date(localValue).toISOString()
  } catch {
    return ''
  }
}

function formatServeTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
