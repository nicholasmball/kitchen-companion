import { describe, it, expect } from 'vitest'
import {
  isPaused,
  getPauseOffsetSeconds,
  getCurrentPauseElapsedSeconds,
  buildResumePayload,
  buildPushBackPayload,
  applyPauseAndPadding,
  findOverrunEvents,
  computeOverrunDeltaMinutes,
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

  it('does NOT include current pause window — pause = freeze', () => {
    const plan = makePlan({ paused_at: '2026-04-30T17:00:00Z', total_pause_seconds: 60 })
    expect(getPauseOffsetSeconds(plan)).toBe(60)
  })

  it('returns the same value regardless of how long the plan has been paused', () => {
    const plan = makePlan({ paused_at: '2026-04-30T17:00:00Z', total_pause_seconds: 0 })
    expect(getPauseOffsetSeconds(plan)).toBe(0)
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
  it('clears paused_at only — does not accumulate elapsed pause', () => {
    expect(buildResumePayload()).toEqual({ paused_at: null })
  })

  it('returns the same payload regardless of how long the plan was paused', () => {
    expect(buildResumePayload()).toEqual({ paused_at: null })
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

  it('shifts every event forward by total_pause_seconds (historical pauses)', () => {
    const out = applyPauseAndPadding(baseEvents, makePlan({ total_pause_seconds: 600 }))
    expect(out[0].time.toISOString()).toBe('2026-04-30T17:10:00.000Z')
    expect(out[1].time.toISOString()).toBe('2026-04-30T17:40:00.000Z')
    expect(out[2].time.toISOString()).toBe('2026-04-30T18:10:00.000Z')
  })

  it('shifts non-serve events earlier by padding_minutes', () => {
    const out = applyPauseAndPadding(baseEvents, makePlan({ padding_minutes: 10 }))
    expect(out[0].time.toISOString()).toBe('2026-04-30T16:50:00.000Z')
    expect(out[1].time.toISOString()).toBe('2026-04-30T17:20:00.000Z')
    expect(out[2].time.toISOString()).toBe('2026-04-30T18:00:00.000Z')
  })

  it('combines pause and padding correctly', () => {
    const out = applyPauseAndPadding(
      baseEvents,
      makePlan({ total_pause_seconds: 300, padding_minutes: 10 })
    )
    expect(out[0].time.toISOString()).toBe('2026-04-30T16:55:00.000Z')
    expect(out[1].time.toISOString()).toBe('2026-04-30T17:25:00.000Z')
    expect(out[2].time.toISOString()).toBe('2026-04-30T18:05:00.000Z')
  })

  it('does NOT include the current pause window — pause = freeze the displayed timeline', () => {
    const out = applyPauseAndPadding(
      baseEvents,
      makePlan({ paused_at: '2026-04-30T17:00:00Z', total_pause_seconds: 60 })
    )
    // total_pause_seconds = 60 only; no current-window contribution
    expect(out[1].time.toISOString()).toBe('2026-04-30T17:31:00.000Z')
  })

  it('preserves original event metadata', () => {
    const out = applyPauseAndPadding(baseEvents, makePlan({ total_pause_seconds: 60 }))
    expect(out[0].id).toBe(baseEvents[0].id)
    expect(out[0].type).toBe('prep_start')
    expect(out[0].description).toBe('test')
  })
})

// ─── findOverrunEvents / computeOverrunDeltaMinutes ───────────────────────

describe('findOverrunEvents', () => {
  const events = [
    makeEvent('2026-04-30T16:00:00Z', 'prep_start'),
    makeEvent('2026-04-30T17:00:00Z', 'cook_start'),
    makeEvent('2026-04-30T18:00:00Z', 'cook_end'),
    makeEvent('2026-04-30T18:00:00Z', 'serve'),
  ]

  it('returns empty when not paused', () => {
    expect(findOverrunEvents(events, null)).toEqual([])
  })

  it('returns events that fired during the pause window', () => {
    const out = findOverrunEvents(
      events,
      '2026-04-30T15:45:00Z',
      new Date('2026-04-30T17:30:00Z')
    )
    // prep at 16:00, cook_start at 17:00 are both within [15:45, 17:30]
    expect(out.map((e) => e.type)).toEqual(['prep_start', 'cook_start'])
  })

  it('excludes events scheduled before pause started', () => {
    const out = findOverrunEvents(
      events,
      '2026-04-30T16:30:00Z',
      new Date('2026-04-30T17:30:00Z')
    )
    // 16:00 is before pause; 17:00 is within
    expect(out.map((e) => e.type)).toEqual(['cook_start'])
  })

  it('excludes events scheduled after resume', () => {
    const out = findOverrunEvents(
      events,
      '2026-04-30T15:45:00Z',
      new Date('2026-04-30T16:30:00Z')
    )
    // Only prep at 16:00 falls within [15:45, 16:30]
    expect(out.map((e) => e.type)).toEqual(['prep_start'])
  })

  it('always excludes the serve event', () => {
    const out = findOverrunEvents(
      events,
      '2026-04-30T15:45:00Z',
      new Date('2026-04-30T19:00:00Z')
    )
    expect(out.find((e) => e.type === 'serve')).toBeUndefined()
  })

  it('returns empty when no events fall within the pause window', () => {
    const out = findOverrunEvents(
      events,
      '2026-04-30T15:00:00Z',
      new Date('2026-04-30T15:30:00Z')
    )
    expect(out).toEqual([])
  })
})

describe('computeOverrunDeltaMinutes', () => {
  it('returns 0 for an empty overrun list', () => {
    expect(computeOverrunDeltaMinutes([])).toBe(0)
  })

  it('returns rounded-up minutes between latest overrun and resume time', () => {
    const events = [
      makeEvent('2026-04-30T16:00:00Z', 'prep_start'),
      makeEvent('2026-04-30T17:00:00Z', 'cook_start'),
    ]
    const resume = new Date('2026-04-30T17:30:00Z')
    expect(computeOverrunDeltaMinutes(events, resume)).toBe(30)
  })

  it('uses the LATEST overrun event, not the earliest', () => {
    const events = [
      makeEvent('2026-04-30T16:00:00Z', 'prep_start'),
      makeEvent('2026-04-30T17:00:00Z', 'cook_start'),
    ]
    const resume = new Date('2026-04-30T17:05:00Z')
    expect(computeOverrunDeltaMinutes(events, resume)).toBe(5)
  })

  it('rounds up sub-minute deltas to 1 minute', () => {
    const events = [makeEvent('2026-04-30T17:00:00Z', 'cook_start')]
    const resume = new Date('2026-04-30T17:00:30Z')
    expect(computeOverrunDeltaMinutes(events, resume)).toBe(1)
  })

  it('returns 0 if resume time is somehow earlier than latest overrun (clock skew)', () => {
    const events = [makeEvent('2026-04-30T17:00:00Z', 'cook_start')]
    const resume = new Date('2026-04-30T16:00:00Z')
    expect(computeOverrunDeltaMinutes(events, resume)).toBe(0)
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
