import type { MealPlan, TimelineEvent } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────

/** Subset of MealPlan needed for pause + padding calculations. */
export interface PausableMealPlan {
  serve_time: string | null
  paused_at: string | null
  total_pause_seconds: number
  padding_minutes: number
}

// ─── Pause-state computation ──────────────────────────────────────────────

/** True if the plan is currently paused. */
export function isPaused(plan: PausableMealPlan): boolean {
  return plan.paused_at !== null
}

/**
 * Number of seconds currently being held aside by pause activity.
 * = total_pause_seconds + (now - paused_at if paused else 0)
 *
 * This is what gets added to every event time to push them forward.
 */
export function getPauseOffsetSeconds(plan: PausableMealPlan, now: Date = new Date()): number {
  let offset = plan.total_pause_seconds
  if (plan.paused_at) {
    const pausedAtMs = new Date(plan.paused_at).getTime()
    const elapsed = Math.floor((now.getTime() - pausedAtMs) / 1000)
    if (elapsed > 0) offset += elapsed
  }
  return offset
}

/** Elapsed seconds in the current pause cycle (0 if not paused). */
export function getCurrentPauseElapsedSeconds(
  plan: PausableMealPlan,
  now: Date = new Date()
): number {
  if (!plan.paused_at) return 0
  const elapsed = Math.floor((now.getTime() - new Date(plan.paused_at).getTime()) / 1000)
  return Math.max(0, elapsed)
}

// ─── Resume payload ───────────────────────────────────────────────────────

/**
 * Build the meal_plan update payload for a Resume action — clears paused_at
 * and accumulates the elapsed pause into total_pause_seconds.
 */
export function buildResumePayload(
  plan: PausableMealPlan,
  now: Date = new Date()
): { paused_at: null; total_pause_seconds: number } {
  return {
    paused_at: null,
    total_pause_seconds: plan.total_pause_seconds + getCurrentPauseElapsedSeconds(plan, now),
  }
}

// ─── Push-back payload ────────────────────────────────────────────────────

/**
 * Build the meal_plan update payload to push the serve time forward.
 * Pass either a positive minute delta OR a target ISO datetime; not both.
 */
export function buildPushBackPayload(
  currentServeTime: string | null,
  options: { addMinutes: number } | { newServeTime: string }
): { serve_time: string } {
  let nextMs: number
  if ('addMinutes' in options) {
    if (!currentServeTime) {
      throw new Error('Cannot push back a plan with no serve time set')
    }
    nextMs = new Date(currentServeTime).getTime() + options.addMinutes * 60 * 1000
  } else {
    nextMs = new Date(options.newServeTime).getTime()
  }
  return { serve_time: new Date(nextMs).toISOString() }
}

// ─── Timeline adjustment ──────────────────────────────────────────────────

/**
 * Apply pause + padding offsets to a timeline.
 *
 * Pause shifts every event forward by the accumulated pause duration so the
 * timer effectively stopped during pause windows. Padding shifts every event
 * earlier so cooking begins with a buffer before the strictly-required start.
 *
 * The two compose: effective = original + pauseOffset - paddingOffset.
 *
 * The serve event is excluded from padding so the cook still serves at the
 * configured serve_time; padding only earlies cooking events. (Pause does
 * shift the serve event — if the cook pauses for 10 min, dinner is 10 min
 * later.)
 */
export function applyPauseAndPadding(
  events: TimelineEvent[],
  plan: PausableMealPlan,
  now: Date = new Date()
): TimelineEvent[] {
  const pauseOffsetMs = getPauseOffsetSeconds(plan, now) * 1000
  const paddingMs = (plan.padding_minutes || 0) * 60 * 1000
  if (pauseOffsetMs === 0 && paddingMs === 0) return events
  return events.map((e) => {
    const base = e.time.getTime()
    const isServe = e.type === 'serve'
    const pad = isServe ? 0 : paddingMs
    return { ...e, time: new Date(base + pauseOffsetMs - pad) }
  })
}

// ─── Push-back quick-pick options ─────────────────────────────────────────

export const PUSHBACK_QUICK_PICKS_MIN = [5, 10, 15, 30] as const

export function previewPushedServeTime(
  currentServeTime: string,
  addMinutes: number
): Date {
  return new Date(new Date(currentServeTime).getTime() + addMinutes * 60 * 1000)
}

// ─── Friendly elapsed formatting ──────────────────────────────────────────

/**
 * Format seconds as M:SS (no hours unless > 60 min).
 * Used by the paused banner's elapsed timer.
 */
export function formatElapsed(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/**
 * Push-back guard: refuse to push the serve time to a moment in the past.
 * Used by the picker UI to keep "Pick new time…" valid.
 */
export function isValidPushBackTarget(
  newServeTime: string,
  now: Date = new Date()
): boolean {
  const target = new Date(newServeTime).getTime()
  return Number.isFinite(target) && target > now.getTime()
}

// Re-export the MealPlan type for convenience.
export type { MealPlan }
