import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateTimeline,
  getNextEvent,
  getMissedEvents,
  getStartTime,
  getTimeUntil,
  formatTimeUntil,
  getEventColor,
  getEventIcon,
} from './timing-calculator'
import type { MealItem } from '@/types'

// Helper to create a MealItem with defaults
function makeMealItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: 'item-1',
    meal_plan_id: 'plan-1',
    name: 'Chicken',
    cook_time_minutes: 30,
    prep_time_minutes: 10,
    rest_time_minutes: 5,
    temperature: 180,
    temperature_unit: 'C',
    cooking_method: 'oven',
    instructions: null,
    notes: null,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('calculateTimeline', () => {
  const serveTime = new Date('2024-01-01T18:00:00Z')

  it('creates correct events for a single item with prep, cook, and rest', () => {
    const items = [makeMealItem()]
    const events = calculateTimeline(items, serveTime)

    // Should have: prep_start, cook_start, cook_end, rest_start, serve = 5 events
    expect(events).toHaveLength(5)

    const types = events.map((e) => e.type)
    expect(types).toContain('prep_start')
    expect(types).toContain('cook_start')
    expect(types).toContain('cook_end')
    expect(types).toContain('rest_start')
    expect(types).toContain('serve')
  })

  it('calculates times backwards from serve time correctly', () => {
    const items = [makeMealItem({ cook_time_minutes: 60, prep_time_minutes: 15, rest_time_minutes: 10 })]
    const events = calculateTimeline(items, serveTime)

    // serve = 18:00
    // rest_start = cook_end = 18:00 - 10min = 17:50
    // cook_start = 17:50 - 60min = 16:50
    // prep_start = 16:50 - 15min = 16:35
    const prep = events.find((e) => e.type === 'prep_start')!
    const cookStart = events.find((e) => e.type === 'cook_start')!
    const cookEnd = events.find((e) => e.type === 'cook_end')!
    const serve = events.find((e) => e.type === 'serve')!

    expect(prep.time).toEqual(new Date('2024-01-01T16:35:00Z'))
    expect(cookStart.time).toEqual(new Date('2024-01-01T16:50:00Z'))
    expect(cookEnd.time).toEqual(new Date('2024-01-01T17:50:00Z'))
    expect(serve.time).toEqual(serveTime)
  })

  it('omits prep event when prep_time_minutes is 0', () => {
    const items = [makeMealItem({ prep_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)

    expect(events.find((e) => e.type === 'prep_start')).toBeUndefined()
  })

  it('omits rest event when rest_time_minutes is 0', () => {
    const items = [makeMealItem({ rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)

    expect(events.find((e) => e.type === 'rest_start')).toBeUndefined()
  })

  it('handles cook-only item (no prep, no rest)', () => {
    const items = [makeMealItem({ prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)

    // cook_start, cook_end, serve = 3 events
    expect(events).toHaveLength(3)
    expect(events.map((e) => e.type)).toEqual(['cook_start', 'cook_end', 'serve'])
  })

  it('handles multiple items with correct interleaving', () => {
    const items = [
      makeMealItem({ id: 'chicken', name: 'Chicken', cook_time_minutes: 60, prep_time_minutes: 0, rest_time_minutes: 0 }),
      makeMealItem({ id: 'potatoes', name: 'Potatoes', cook_time_minutes: 30, prep_time_minutes: 0, rest_time_minutes: 0 }),
    ]
    const events = calculateTimeline(items, serveTime)

    // Chicken cook_start, Potatoes cook_start, Chicken cook_end, Potatoes cook_end, serve = 5
    expect(events).toHaveLength(5)

    // Chicken starts first (60min before serve = 17:00)
    // Potatoes starts later (30min before serve = 17:30)
    const chickenStart = events.find((e) => e.mealItemId === 'chicken' && e.type === 'cook_start')!
    const potatoStart = events.find((e) => e.mealItemId === 'potatoes' && e.type === 'cook_start')!
    expect(chickenStart.time < potatoStart.time).toBe(true)
  })

  it('sorts events chronologically', () => {
    const items = [
      makeMealItem({ id: 'a', cook_time_minutes: 10, prep_time_minutes: 5, rest_time_minutes: 0 }),
      makeMealItem({ id: 'b', cook_time_minutes: 60, prep_time_minutes: 0, rest_time_minutes: 0 }),
    ]
    const events = calculateTimeline(items, serveTime)

    for (let i = 1; i < events.length; i++) {
      expect(events[i].time.getTime()).toBeGreaterThanOrEqual(events[i - 1].time.getTime())
    }
  })

  it('always includes a single serve event at the end', () => {
    const items = [makeMealItem(), makeMealItem({ id: 'item-2', name: 'Potatoes' })]
    const events = calculateTimeline(items, serveTime)

    const serveEvents = events.filter((e) => e.type === 'serve')
    expect(serveEvents).toHaveLength(1)
    expect(serveEvents[0].time).toEqual(serveTime)
    expect(serveEvents[0].mealItemName).toBe('All items')
  })

  it('generates correct cooking method verb for oven', () => {
    const items = [makeMealItem({ cooking_method: 'oven', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('Put in oven')
  })

  it('generates correct cooking method verb for hob', () => {
    const items = [makeMealItem({ cooking_method: 'hob', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('Put on hob')
  })

  it('generates correct cooking method verb for grill', () => {
    const items = [makeMealItem({ cooking_method: 'grill', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('Put under grill')
  })

  it('generates correct cooking method verb for microwave', () => {
    const items = [makeMealItem({ cooking_method: 'microwave', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('Put in microwave')
  })

  it('generates correct cooking method verb for air_fryer', () => {
    const items = [makeMealItem({ cooking_method: 'air_fryer', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('Put in air fryer')
  })

  it('generates correct cooking method verb for slow_cooker', () => {
    const items = [makeMealItem({ cooking_method: 'slow_cooker', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('Put in slow cooker')
  })

  it('generates correct cooking method verb for bbq', () => {
    const items = [makeMealItem({ cooking_method: 'bbq', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('Put on BBQ')
  })

  it('falls back to "Start cooking" for "other" method', () => {
    const items = [makeMealItem({ cooking_method: 'other', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('Start cooking')
  })

  it('includes temperature in cook_start description', () => {
    const items = [makeMealItem({ temperature: 200, temperature_unit: 'C', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('200°C')
  })

  it('includes temperature with Fahrenheit unit', () => {
    const items = [makeMealItem({ temperature: 400, temperature_unit: 'F', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).toContain('400°F')
  })

  it('omits temperature from description when null', () => {
    const items = [makeMealItem({ temperature: null, prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.description).not.toContain('°')
  })

  it('stores temperature and method metadata on cook_start events', () => {
    const items = [makeMealItem({ temperature: 180, cooking_method: 'oven', prep_time_minutes: 0, rest_time_minutes: 0 })]
    const events = calculateTimeline(items, serveTime)
    const cookStart = events.find((e) => e.type === 'cook_start')!
    expect(cookStart.temperature).toBe(180)
    expect(cookStart.cookingMethod).toBe('oven')
  })

  it('includes rest description with duration', () => {
    const items = [makeMealItem({ rest_time_minutes: 15 })]
    const events = calculateTimeline(items, serveTime)
    const rest = events.find((e) => e.type === 'rest_start')!
    expect(rest.description).toContain('15 minutes')
  })

  it('handles empty items array', () => {
    const events = calculateTimeline([], serveTime)
    // Should just have the serve event
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('serve')
  })
})

describe('getNextEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the next future event', () => {
    vi.setSystemTime(new Date('2024-01-01T17:00:00Z'))
    const events = [
      { id: '1', mealItemId: 'a', mealItemName: 'A', type: 'cook_start' as const, time: new Date('2024-01-01T16:00:00Z'), description: '' },
      { id: '2', mealItemId: 'b', mealItemName: 'B', type: 'cook_end' as const, time: new Date('2024-01-01T17:30:00Z'), description: '' },
      { id: '3', mealItemId: 'c', mealItemName: 'C', type: 'serve' as const, time: new Date('2024-01-01T18:00:00Z'), description: '' },
    ]
    expect(getNextEvent(events)?.id).toBe('2')
  })

  it('returns null when all events are in the past', () => {
    vi.setSystemTime(new Date('2024-01-01T19:00:00Z'))
    const events = [
      { id: '1', mealItemId: 'a', mealItemName: 'A', type: 'serve' as const, time: new Date('2024-01-01T18:00:00Z'), description: '' },
    ]
    expect(getNextEvent(events)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(getNextEvent([])).toBeNull()
  })
})

describe('getMissedEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns events between lastChecked and now', () => {
    vi.setSystemTime(new Date('2024-01-01T17:30:00Z'))
    const lastChecked = new Date('2024-01-01T17:00:00Z')
    const events = [
      { id: '1', mealItemId: 'a', mealItemName: 'A', type: 'cook_start' as const, time: new Date('2024-01-01T16:00:00Z'), description: '' },
      { id: '2', mealItemId: 'b', mealItemName: 'B', type: 'cook_end' as const, time: new Date('2024-01-01T17:15:00Z'), description: '' },
      { id: '3', mealItemId: 'c', mealItemName: 'C', type: 'serve' as const, time: new Date('2024-01-01T18:00:00Z'), description: '' },
    ]
    const missed = getMissedEvents(events, lastChecked)
    expect(missed).toHaveLength(1)
    expect(missed[0].id).toBe('2')
  })

  it('returns empty array when no events were missed', () => {
    vi.setSystemTime(new Date('2024-01-01T17:00:00Z'))
    const lastChecked = new Date('2024-01-01T17:00:00Z')
    const events = [
      { id: '1', mealItemId: 'a', mealItemName: 'A', type: 'serve' as const, time: new Date('2024-01-01T18:00:00Z'), description: '' },
    ]
    expect(getMissedEvents(events, lastChecked)).toHaveLength(0)
  })
})

describe('getStartTime', () => {
  it('returns the first event time', () => {
    const events = [
      { id: '1', mealItemId: 'a', mealItemName: 'A', type: 'prep_start' as const, time: new Date('2024-01-01T16:00:00Z'), description: '' },
      { id: '2', mealItemId: 'b', mealItemName: 'B', type: 'serve' as const, time: new Date('2024-01-01T18:00:00Z'), description: '' },
    ]
    expect(getStartTime(events)).toEqual(new Date('2024-01-01T16:00:00Z'))
  })

  it('returns null for empty array', () => {
    expect(getStartTime([])).toBeNull()
  })
})

describe('getTimeUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calculates future time correctly', () => {
    vi.setSystemTime(new Date('2024-01-01T17:00:00Z'))
    const result = getTimeUntil(new Date('2024-01-01T18:30:45Z'))

    expect(result.hours).toBe(1)
    expect(result.minutes).toBe(30)
    expect(result.seconds).toBe(45)
    expect(result.totalSeconds).toBe(5445)
    expect(result.isPast).toBe(false)
  })

  it('calculates past time correctly', () => {
    vi.setSystemTime(new Date('2024-01-01T18:00:00Z'))
    const result = getTimeUntil(new Date('2024-01-01T17:30:00Z'))

    expect(result.hours).toBe(0)
    expect(result.minutes).toBe(30)
    expect(result.isPast).toBe(true)
  })

  it('returns zero for exact now', () => {
    const now = new Date('2024-01-01T17:00:00Z')
    vi.setSystemTime(now)
    const result = getTimeUntil(now)

    expect(result.totalSeconds).toBe(0)
    expect(result.isPast).toBe(false)
  })
})

describe('formatTimeUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats future time with hours and minutes', () => {
    vi.setSystemTime(new Date('2024-01-01T16:00:00Z'))
    expect(formatTimeUntil(new Date('2024-01-01T18:30:00Z'))).toBe('in 2h 30m')
  })

  it('formats future time with minutes only', () => {
    vi.setSystemTime(new Date('2024-01-01T17:45:00Z'))
    expect(formatTimeUntil(new Date('2024-01-01T18:00:00Z'))).toBe('in 15m')
  })

  it('formats past time with hours and minutes', () => {
    vi.setSystemTime(new Date('2024-01-01T19:30:00Z'))
    expect(formatTimeUntil(new Date('2024-01-01T18:00:00Z'))).toBe('1h 30m ago')
  })

  it('formats past time with minutes only', () => {
    vi.setSystemTime(new Date('2024-01-01T18:10:00Z'))
    expect(formatTimeUntil(new Date('2024-01-01T18:00:00Z'))).toBe('10m ago')
  })

  it('returns "now" when time is exactly now', () => {
    const now = new Date('2024-01-01T18:00:00Z')
    vi.setSystemTime(now)
    expect(formatTimeUntil(now)).toBe('now')
  })

  it('returns "now" for very recent past (under 1 minute)', () => {
    vi.setSystemTime(new Date('2024-01-01T18:00:30Z'))
    expect(formatTimeUntil(new Date('2024-01-01T18:00:00Z'))).toBe('now')
  })
})

describe('getEventColor', () => {
  it('returns teal classes for prep_start', () => {
    expect(getEventColor('prep_start')).toContain('3D8B8B')
  })

  it('returns orange classes for cook_start', () => {
    expect(getEventColor('cook_start')).toContain('D97B4A')
  })

  it('returns amber classes for cook_end', () => {
    expect(getEventColor('cook_end')).toContain('C9A962')
  })

  it('returns rose classes for rest_start', () => {
    expect(getEventColor('rest_start')).toContain('C4897A')
  })

  it('returns green classes for serve', () => {
    expect(getEventColor('serve')).toContain('7A9B76')
  })
})

describe('getEventIcon', () => {
  it('returns knife for prep_start', () => {
    expect(getEventIcon('prep_start')).toBe('knife')
  })

  it('returns flame for cook_start', () => {
    expect(getEventIcon('cook_start')).toBe('flame')
  })

  it('returns timer for cook_end', () => {
    expect(getEventIcon('cook_end')).toBe('timer')
  })

  it('returns pause for rest_start', () => {
    expect(getEventIcon('rest_start')).toBe('pause')
  })

  it('returns utensils for serve', () => {
    expect(getEventIcon('serve')).toBe('utensils')
  })
})
