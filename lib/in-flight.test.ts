import { describe, it, expect } from 'vitest'
import {
  isItemInFlight,
  findInFlightItems,
  applyCookEndOverrides,
  computeHotHoldGaps,
} from './in-flight'
import type { MealItem, TimelineEvent } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: 'mi-1',
    meal_plan_id: 'mp-1',
    name: 'Potatoes',
    cook_time_minutes: 60,
    prep_time_minutes: 5,
    rest_time_minutes: 0,
    temperature: 200,
    temperature_unit: 'C',
    cooking_method: 'oven',
    instructions: null,
    notes: null,
    sort_order: 0,
    created_at: '2026-04-30T16:00:00Z',
    recipe_id: null,
    ingredients: null,
    recipe_snapshot_at: null,
    cook_end_override: null,
    ...overrides,
  }
}

function makeEvents(itemId: string, name: string, cookStartIso: string, cookEndIso: string): TimelineEvent[] {
  return [
    {
      id: `${itemId}-prep`,
      mealItemId: itemId,
      mealItemName: name,
      type: 'prep_start',
      time: new Date(new Date(cookStartIso).getTime() - 5 * 60 * 1000),
      description: 'prep',
    },
    {
      id: `${itemId}-cook-start`,
      mealItemId: itemId,
      mealItemName: name,
      type: 'cook_start',
      time: new Date(cookStartIso),
      description: 'cook start',
    },
    {
      id: `${itemId}-cook-end`,
      mealItemId: itemId,
      mealItemName: name,
      type: 'cook_end',
      time: new Date(cookEndIso),
      description: 'cook end',
    },
  ]
}

// ─── isItemInFlight ───────────────────────────────────────────────────────

describe('isItemInFlight', () => {
  const now = new Date('2026-04-30T17:30:00Z')

  it('returns true when cook_end_override is in the future', () => {
    const item = makeItem({ cook_end_override: '2026-04-30T18:00:00Z' })
    expect(isItemInFlight(item, null, null, now)).toBe(true)
  })

  it('returns false when cook_end_override is in the past', () => {
    const item = makeItem({ cook_end_override: '2026-04-30T17:00:00Z' })
    expect(isItemInFlight(item, null, null, now)).toBe(false)
  })

  it('returns true when cook_start is in past AND cook_end in future', () => {
    const item = makeItem()
    expect(
      isItemInFlight(
        item,
        new Date('2026-04-30T17:00:00Z'),
        new Date('2026-04-30T18:00:00Z'),
        now
      )
    ).toBe(true)
  })

  it('returns false when cook_start is in the future', () => {
    const item = makeItem()
    expect(
      isItemInFlight(
        item,
        new Date('2026-04-30T18:00:00Z'),
        new Date('2026-04-30T19:00:00Z'),
        now
      )
    ).toBe(false)
  })

  it('returns false when cook_end is also in the past (item is done)', () => {
    const item = makeItem()
    expect(
      isItemInFlight(
        item,
        new Date('2026-04-30T16:00:00Z'),
        new Date('2026-04-30T17:00:00Z'),
        now
      )
    ).toBe(false)
  })

  it('returns false when no signals available', () => {
    expect(isItemInFlight(makeItem(), null, null, now)).toBe(false)
  })
})

// ─── findInFlightItems ────────────────────────────────────────────────────

describe('findInFlightItems', () => {
  const now = new Date('2026-04-30T17:30:00Z')

  it('finds an item whose cook window straddles now', () => {
    const events = makeEvents('mi-1', 'Potatoes', '2026-04-30T17:00:00Z', '2026-04-30T18:00:00Z')
    const inFlight = findInFlightItems(events, now)
    expect(inFlight.has('mi-1')).toBe(true)
    const info = inFlight.get('mi-1')!
    expect(info.scheduledCookEnd.toISOString()).toBe('2026-04-30T18:00:00.000Z')
  })

  it('skips items not yet started', () => {
    const events = makeEvents('mi-1', 'X', '2026-04-30T18:00:00Z', '2026-04-30T19:00:00Z')
    expect(findInFlightItems(events, now).size).toBe(0)
  })

  it('skips items already done', () => {
    const events = makeEvents('mi-1', 'X', '2026-04-30T16:00:00Z', '2026-04-30T17:00:00Z')
    expect(findInFlightItems(events, now).size).toBe(0)
  })

  it('handles mixed plans', () => {
    const events = [
      ...makeEvents('mi-in-flight', 'Potatoes', '2026-04-30T17:00:00Z', '2026-04-30T18:00:00Z'),
      ...makeEvents('mi-not-started', 'Beans', '2026-04-30T18:00:00Z', '2026-04-30T18:30:00Z'),
      ...makeEvents('mi-done', 'Sauce', '2026-04-30T16:00:00Z', '2026-04-30T17:00:00Z'),
    ]
    const inFlight = findInFlightItems(events, now)
    expect([...inFlight.keys()]).toEqual(['mi-in-flight'])
  })
})

// ─── applyCookEndOverrides ────────────────────────────────────────────────

describe('applyCookEndOverrides', () => {
  const now = new Date('2026-04-30T17:30:00Z')

  it('returns events unchanged when no overrides set', () => {
    const events = makeEvents('mi-1', 'Potatoes', '2026-04-30T17:00:00Z', '2026-04-30T18:00:00Z')
    const out = applyCookEndOverrides(events, [makeItem()], now)
    expect(out).toEqual(events)
  })

  it('overrides cook_end / rest_start at the pinned time', () => {
    const events = makeEvents('mi-1', 'Potatoes', '2026-04-30T17:10:00Z', '2026-04-30T18:10:00Z')
    const item = makeItem({ cook_end_override: '2026-04-30T18:00:00Z' })
    const out = applyCookEndOverrides(events, [item], now)
    const cookEnd = out.find((e) => e.type === 'cook_end')!
    expect(cookEnd.time.toISOString()).toBe('2026-04-30T18:00:00.000Z')
  })

  it('back-derives cook_start and prep_start from the override', () => {
    const events = makeEvents('mi-1', 'Potatoes', '2026-04-30T17:10:00Z', '2026-04-30T18:10:00Z')
    const item = makeItem({ cook_end_override: '2026-04-30T18:00:00Z' })
    const out = applyCookEndOverrides(events, [item], now)
    const cookStart = out.find((e) => e.type === 'cook_start')!
    const prepStart = out.find((e) => e.type === 'prep_start')!
    // cook_time = 60 → cook_start = 18:00 - 60min = 17:00
    expect(cookStart.time.toISOString()).toBe('2026-04-30T17:00:00.000Z')
    // prep_time = 5 → prep_start = 17:00 - 5min = 16:55
    expect(prepStart.time.toISOString()).toBe('2026-04-30T16:55:00.000Z')
  })

  it('ignores overrides whose time is in the past', () => {
    const events = makeEvents('mi-1', 'Potatoes', '2026-04-30T18:00:00Z', '2026-04-30T19:00:00Z')
    const item = makeItem({ cook_end_override: '2026-04-30T17:00:00Z' })
    const out = applyCookEndOverrides(events, [item], now)
    expect(out).toEqual(events)
  })

  it('handles a mixed plan correctly (only override the in-flight item)', () => {
    const events = [
      ...makeEvents('mi-flight', 'Potatoes', '2026-04-30T17:10:00Z', '2026-04-30T18:10:00Z'),
      ...makeEvents('mi-not', 'Beans', '2026-04-30T18:10:00Z', '2026-04-30T18:40:00Z'),
    ]
    const items = [
      makeItem({ id: 'mi-flight', cook_end_override: '2026-04-30T18:00:00Z' }),
      makeItem({ id: 'mi-not', name: 'Beans', cook_time_minutes: 30 }),
    ]
    const out = applyCookEndOverrides(events, items, now)
    const flightEnd = out.find((e) => e.mealItemId === 'mi-flight' && e.type === 'cook_end')!
    const notEnd = out.find((e) => e.mealItemId === 'mi-not' && e.type === 'cook_end')!
    expect(flightEnd.time.toISOString()).toBe('2026-04-30T18:00:00.000Z')
    expect(notEnd.time.toISOString()).toBe('2026-04-30T18:40:00.000Z') // unchanged
  })
})

// ─── computeHotHoldGaps ───────────────────────────────────────────────────

describe('computeHotHoldGaps', () => {
  const serve = new Date('2026-04-30T18:10:00Z')

  it('finds items finishing materially before serve', () => {
    const events = makeEvents('mi-1', 'Potatoes', '2026-04-30T17:00:00Z', '2026-04-30T18:00:00Z')
    const gaps = computeHotHoldGaps(events, serve)
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toMatchObject({ mealItemId: 'mi-1', gapMinutes: 10 })
  })

  it('ignores tiny gaps (< 5 min) — within reasonable tolerance', () => {
    const events = makeEvents('mi-1', 'X', '2026-04-30T17:00:00Z', '2026-04-30T18:08:00Z')
    expect(computeHotHoldGaps(events, serve)).toHaveLength(0)
  })

  it('returns empty when items finish at or after serve', () => {
    const events = makeEvents('mi-1', 'X', '2026-04-30T17:10:00Z', '2026-04-30T18:10:00Z')
    expect(computeHotHoldGaps(events, serve)).toHaveLength(0)
  })

  it('does not double-count the same item', () => {
    const events = [
      ...makeEvents('mi-1', 'Potatoes', '2026-04-30T17:00:00Z', '2026-04-30T18:00:00Z'),
      // Same item also has rest_start at the same time
      {
        id: 'mi-1-rest',
        mealItemId: 'mi-1',
        mealItemName: 'Potatoes',
        type: 'rest_start' as const,
        time: new Date('2026-04-30T18:00:00Z'),
        description: 'rest',
      },
    ]
    expect(computeHotHoldGaps(events, serve)).toHaveLength(1)
  })
})
