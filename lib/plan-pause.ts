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
 * Number of seconds the timeline is shifted forward by historical pause
 * activity. Returns only `total_pause_seconds` — the *current* pause window
 * is intentionally NOT included.
 *
 * Why: pause = freeze. While the cook is paused we want the displayed
 * timeline to stay still, not creep forward as `now` advances. The current
 * pause window only matters at Resume time, when we decide whether the
 * cook fell behind and offer a push-back catch-up. See `findOverrunEvents`.
 *
 * Historic note: previous versions accumulated the current window into the
 * offset, which caused (a) timeline events shifting forward on every
 * re-render during pause, and (b) Resume auto-shifting the schedule even
 * when the cook hadn't actually consumed slack.
 */
export function getPauseOffsetSeconds(plan: PausableMealPlan): number {
  return plan.total_pause_seconds
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
 * Build the meal_plan update payload for a Resume action.
 *
 * Just clears `paused_at`. Pause is now a pure no-op for the schedule —
 * times don't shift on resume. If the cook actually fell behind during the
 * pause (a scheduled event passed), the planner page surfaces a toast with
 * a one-tap push-back. See `findOverrunEvents`.
 */
export function buildResumePayload(): { paused_at: null } {
  return { paused_at: null }
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
  plan: PausableMealPlan
): TimelineEvent[] {
  const pauseOffsetMs = getPauseOffsetSeconds(plan) * 1000
  const paddingMs = (plan.padding_minutes || 0) * 60 * 1000
  if (pauseOffsetMs === 0 && paddingMs === 0) return events
  return events.map((e) => {
    const base = e.time.getTime()
    const isServe = e.type === 'serve'
    const pad = isServe ? 0 : paddingMs
    return { ...e, time: new Date(base + pauseOffsetMs - pad) }
  })
}

// ─── Overrun detection (used by Resume to offer catch-up push-back) ───────

/**
 * Events whose scheduled time passed while the plan was paused. Used to
 * decide whether to show the "you're behind" toast on Resume.
 *
 * Excludes the serve event — falling behind on serve doesn't make sense; we
 * detect overruns based on cooking events.
 */
export function findOverrunEvents(
  events: TimelineEvent[],
  pausedAt: string | null,
  resumeTime: Date = new Date()
): TimelineEvent[] {
  if (!pausedAt) return []
  const pausedAtMs = new Date(pausedAt).getTime()
  const resumeMs = resumeTime.getTime()
  return events.filter((e) => {
    if (e.type === 'serve') return false
    const t = e.time.getTime()
    return t >= pausedAtMs && t <= resumeMs
  })
}

/**
 * How many minutes behind the cook is at resume time, based on overrun
 * events. Defined as `(resumeTime - latestOverrunEvent.time)` rounded up
 * to the nearest minute. Returns 0 if no overruns.
 */
export function computeOverrunDeltaMinutes(
  overrunEvents: TimelineEvent[],
  resumeTime: Date = new Date()
): number {
  if (overrunEvents.length === 0) return 0
  const latest = overrunEvents.reduce((acc, e) =>
    e.time.getTime() > acc.time.getTime() ? e : acc
  )
  const diffMs = resumeTime.getTime() - latest.time.getTime()
  if (diffMs <= 0) return 0
  return Math.max(1, Math.ceil(diffMs / 60000))
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
