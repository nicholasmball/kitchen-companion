import { describe, it, expect } from 'vitest'
import {
  isPaused,
  getPauseOffsetSeconds,
  getCurrentPauseElapsedSeconds,
  buildResumePayload,
  buildPushBackPayload,
  applyPauseAndPadding,
  previewPushedServeTime,
  formatElapsed,
  isValidPushBackTarget,
  type PausableMealPlan,
} from './plan-pause'
import type { TimelineEvent } from '@/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────

function makePlan(overrides: Partial<PausableMealPlan> = {}): PausableMealPlan {
  return {
    serve_time: '2026-04-30T18:00:00Z',
    paused_at: null,
    total_pause_seconds: 0,
    padding_minutes: 0,
    ...overrides,
  }
}

function makeEvent(time: string, type: TimelineEvent['type'] = 'cook_start'): TimelineEvent {
  return {
    id: `e-${time}`,
    mealItemId: 'mi-1',
    mealItemName: 'Test',
    type,
    time: new Date(time),
    description: 'test',
  }
}

// ─── isPaused ─────────────────────────────────────────────────────────────

describe('isPaused', () => {
  it('returns false when paused_at is null', () => {
    expect(isPaused(makePlan())).toBe(false)
  })

  it('returns true when paused_at is set', () => {
    expect(isPaused(makePlan({ paused_at: '2026-04-30T17:00:00Z' }))).toBe(true)
  })
})

// ─── getPauseOffsetSeconds ────────────────────────────────────────────────

describe('getPauseOffsetSeconds', () => {
  it('returns 0 for a fresh, unpaused plan', () => {
    expect(getPauseOffsetSeconds(makePlan())).toBe(0)
  })

  it('returns total_pause_seconds when not currently paused', () => {
    expect(getPauseOffsetSeconds(makePlan({ total_pause_seconds: 600 }))).toBe(600)
  })

  it('adds current elapsed pause when paused', () => {
    const now = new Date('2026-04-30T17:05:00Z')
    const plan = makePlan({ paused_at: '2026-04-30T17:00:00Z', total_pause_seconds: 60 })
    expect(getPauseOffsetSeconds(plan, now)).toBe(60 + 5 * 60)
  })

  it('does not subtract when pause looks negative (clock skew)', () => {
    const now = new Date('2026-04-30T16:59:00Z')
    const plan = makePlan({ paused_at: '2026-04-30T17:00:00Z', total_pause_seconds: 100 })
    expect(getPauseOffsetSeconds(plan, now)).toBe(100)
  })
})

describe('getCurrentPauseElapsedSeconds', () => {
  it('returns 0 when not paused', () => {
    expect(getCurrentPauseElapsedSeconds(makePlan())).toBe(0)
  })

  it('counts elapsed seconds since paused_at', () => {
    const now = new Date('2026-04-30T17:02:30Z')
    const plan = makePlan({ paused_at: '2026-04-30T17:00:00Z' })
    expect(getCurrentPauseElapsedSeconds(plan, now)).toBe(150)
  })
})

// ─── buildResumePayload ───────────────────────────────────────────────────

describe('buildResumePayload', () => {
  it('clears paused_at and accumulates the current pause window', () => {
    const now = new Date('2026-04-30T17:03:00Z')
    const plan = makePlan({ paused_at: '2026-04-30T17:00:00Z', total_pause_seconds: 90 })
    expect(buildResumePayload(plan, now)).toEqual({
      paused_at: null,
      total_pause_seconds: 90 + 180,
    })
  })

  it('handles a no-op resume gracefully (not paused)', () => {
    const plan = makePlan({ total_pause_seconds: 42 })
    expect(buildResumePayload(plan)).toEqual({ paused_at: null, total_pause_seconds: 42 })
  })
})

// ─── buildPushBackPayload ─────────────────────────────────────────────────

describe('buildPushBackPayload', () => {
  it('adds minutes to the current serve time', () => {
    const result = buildPushBackPayload('2026-04-30T18:00:00Z', { addMinutes: 15 })
    expect(result.serve_time).toBe('2026-04-30T18:15:00.000Z')
  })

  it('accepts a custom new serve time', () => {
    const result = buildPushBackPayload('2026-04-30T18:00:00Z', {
      newServeTime: '2026-04-30T19:30:00.000Z',
    })
    expect(result.serve_time).toBe('2026-04-30T19:30:00.000Z')
  })

  it('throws if asked to add minutes when no serve_time is set', () => {
    expect(() => buildPushBackPayload(null, { addMinutes: 5 })).toThrow()
  })
})

// ─── applyPauseAndPadding ─────────────────────────────────────────────────

describe('applyPauseAndPadding', () => {
  const baseEvents = [
    makeEvent('2026-04-30T17:00:00Z', 'prep_start'),
    makeEvent('2026-04-30T17:30:00Z', 'cook_start'),
    makeEvent('2026-04-30T18:00:00Z', 'serve'),
  ]

  it('returns the input untouched when no pause and no padding', () => {
    const out = applyPauseAndPadding(baseEvents, makePlan())
    expect(out).toEqual(baseEvents)
  })

  it('shifts every event forward by total_pause_seconds', () => {
    const out = applyPauseAndPadding(baseEvents, makePlan({ total_pause_seconds: 600 }))
    expect(out[0].time.toISOString()).toBe('2026-04-30T17:10:00.000Z')
    expect(out[1].time.toISOString()).toBe('2026-04-30T17:40:00.000Z')
    expect(out[2].time.toISOString()).toBe('2026-04-30T18:10:00.000Z')
  })

  it('shifts non-serve events earlier by padding_minutes', () => {
    const out = applyPauseAndPadding(baseEvents, makePlan({ padding_minutes: 10 }))
    expect(out[0].time.toISOString()).toBe('2026-04-30T16:50:00.000Z')
    expect(out[1].time.toISOString()).toBe('2026-04-30T17:20:00.000Z')
    // Serve unchanged by padding
    expect(out[2].time.toISOString()).toBe('2026-04-30T18:00:00.000Z')
  })

  it('combines pause and padding correctly', () => {
    const out = applyPauseAndPadding(
      baseEvents,
      makePlan({ total_pause_seconds: 300, padding_minutes: 10 })
    )
    expect(out[0].time.toISOString()).toBe('2026-04-30T16:55:00.000Z') // +5 -10
    expect(out[1].time.toISOString()).toBe('2026-04-30T17:25:00.000Z') // +5 -10
    expect(out[2].time.toISOString()).toBe('2026-04-30T18:05:00.000Z') // +5 only
  })

  it('factors in current pause window when paused', () => {
    const now = new Date('2026-04-30T17:02:00Z')
    const out = applyPauseAndPadding(
      baseEvents,
      makePlan({ paused_at: '2026-04-30T17:00:00Z', total_pause_seconds: 60 }),
      now
    )
    // pauseOffset = 60 + 120 = 180s = 3min
    expect(out[1].time.toISOString()).toBe('2026-04-30T17:33:00.000Z')
  })

  it('preserves original event metadata', () => {
    const out = applyPauseAndPadding(baseEvents, makePlan({ total_pause_seconds: 60 }))
    expect(out[0].id).toBe(baseEvents[0].id)
    expect(out[0].type).toBe('prep_start')
    expect(out[0].description).toBe('test')
  })
})

// ─── Push-back helpers ────────────────────────────────────────────────────

describe('previewPushedServeTime', () => {
  it('returns a Date offset by N minutes', () => {
    const out = previewPushedServeTime('2026-04-30T18:00:00Z', 15)
    expect(out.toISOString()).toBe('2026-04-30T18:15:00.000Z')
  })
})

describe('isValidPushBackTarget', () => {
  it('returns true for a future time', () => {
    const now = new Date('2026-04-30T17:00:00Z')
    expect(isValidPushBackTarget('2026-04-30T18:00:00Z', now)).toBe(true)
  })

  it('returns false for a past time', () => {
    const now = new Date('2026-04-30T18:00:00Z')
    expect(isValidPushBackTarget('2026-04-30T17:00:00Z', now)).toBe(false)
  })

  it('returns false for invalid input', () => {
    expect(isValidPushBackTarget('not-a-date')).toBe(false)
  })
})

// ─── formatElapsed ────────────────────────────────────────────────────────

describe('formatElapsed', () => {
  it('formats sub-minute as 0:SS', () => {
    expect(formatElapsed(7)).toBe('0:07')
    expect(formatElapsed(45)).toBe('0:45')
  })

  it('formats minutes as M:SS', () => {
    expect(formatElapsed(60)).toBe('1:00')
    expect(formatElapsed(605)).toBe('10:05')
  })

  it('formats hours as H:MM:SS', () => {
    expect(formatElapsed(3600)).toBe('1:00:00')
    expect(formatElapsed(3725)).toBe('1:02:05')
  })

  it('handles 0', () => {
    expect(formatElapsed(0)).toBe('0:00')
  })

  it('coerces negative and NaN to 0:00', () => {
    expect(formatElapsed(-5)).toBe('0:00')
    expect(formatElapsed(NaN)).toBe('0:00')
  })
})
