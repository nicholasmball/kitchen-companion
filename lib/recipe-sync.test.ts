import { describe, it, expect } from 'vitest'
import {
  isStale,
  computeDiff,
  detectLocalTweaks,
  buildRefreshPayload,
  buildPushPayload,
  formatSnapshotDate,
  fieldLabel,
} from './recipe-sync'
import type { MealItem, Recipe } from '@/types'

// ─── Test fixtures ─────────────────────────────────────────────────────────

function makeMealItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: 'mi-1',
    meal_plan_id: 'mp-1',
    name: 'Yorkshire puddings',
    cook_time_minutes: 25,
    prep_time_minutes: 10,
    rest_time_minutes: 0,
    temperature: 220,
    temperature_unit: 'C',
    cooking_method: 'oven',
    instructions: 'Whisk the batter\nBake until risen',
    notes: null,
    sort_order: 0,
    created_at: '2026-04-20T10:00:00Z',
    recipe_id: 'r-1',
    ingredients: [
      { amount: '140', unit: 'g', item: 'flour', notes: '' },
      { amount: '4', unit: '', item: 'eggs', notes: '' },
    ],
    recipe_snapshot_at: '2026-04-20T10:00:00Z',
    ...overrides,
  }
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    user_id: 'u-1',
    title: 'Yorkshire puddings',
    description: null,
    ingredients: [
      { amount: '140', unit: 'g', item: 'flour', notes: '' },
      { amount: '4', unit: '', item: 'eggs', notes: '' },
    ],
    instructions: 'Whisk the batter\nBake until risen',
    prep_time_minutes: 10,
    cook_time_minutes: 25,
    rest_time_minutes: null,
    total_time_minutes: 35,
    servings: 4,
    difficulty: null,
    cuisine: null,
    course: null,
    source_url: null,
    source_name: null,
    image_url: null,
    tags: [],
    is_favourite: false,
    created_at: '2026-04-20T10:00:00Z',
    updated_at: '2026-04-20T10:00:00Z',
    ...overrides,
  }
}

// ─── isStale ───────────────────────────────────────────────────────────────

describe('isStale', () => {
  it('returns false when snapshotAt is missing', () => {
    expect(isStale(null, '2026-04-21T00:00:00Z')).toBe(false)
    expect(isStale(undefined, '2026-04-21T00:00:00Z')).toBe(false)
  })

  it('returns false when recipeUpdatedAt is missing', () => {
    expect(isStale('2026-04-20T00:00:00Z', null)).toBe(false)
  })

  it('returns false when timestamps are equal', () => {
    expect(isStale('2026-04-20T10:00:00Z', '2026-04-20T10:00:00Z')).toBe(false)
  })

  it('returns false when snapshot is newer than recipe', () => {
    expect(isStale('2026-04-21T10:00:00Z', '2026-04-20T10:00:00Z')).toBe(false)
  })

  it('returns true when snapshot is older than recipe', () => {
    expect(isStale('2026-04-20T10:00:00Z', '2026-04-21T10:00:00Z')).toBe(true)
  })
})

// ─── computeDiff ───────────────────────────────────────────────────────────

describe('computeDiff', () => {
  it('returns no changes when meal item matches recipe', () => {
    const diff = computeDiff(makeMealItem(), makeRecipe())
    expect(diff.hasChanges).toBe(false)
    expect(diff.scalars).toEqual([])
    expect(diff.instructions.every((e) => e.kind === 'unchanged')).toBe(true)
    expect(diff.ingredients.every((e) => e.kind === 'unchanged')).toBe(true)
  })

  it('detects added instruction items', () => {
    const recipe = makeRecipe({
      instructions: 'Whisk the batter\nBake until risen\n[action] Boil the kettle',
    })
    const diff = computeDiff(makeMealItem(), recipe)
    expect(diff.hasChanges).toBe(true)
    expect(diff.instructions.find((e) => e.kind === 'added')?.item.text).toBe('Boil the kettle')
  })

  it('detects removed instruction items', () => {
    const item = makeMealItem({
      instructions: 'Whisk the batter\nBake until risen\nServe immediately',
    })
    const diff = computeDiff(item, makeRecipe())
    expect(diff.hasChanges).toBe(true)
    expect(diff.instructions.find((e) => e.kind === 'removed')?.item.text).toBe('Serve immediately')
  })

  it('detects modified instruction items', () => {
    const recipe = makeRecipe({
      instructions: 'Whisk the batter\nBake for 30 min until risen',
    })
    const diff = computeDiff(makeMealItem(), recipe)
    expect(diff.hasChanges).toBe(true)
    const mod = diff.instructions.find((e) => e.kind === 'modified')
    expect(mod).toBeDefined()
    if (mod?.kind === 'modified') {
      expect(mod.before.text).toBe('Bake until risen')
      expect(mod.after.text).toBe('Bake for 30 min until risen')
    }
  })

  it('detects added/removed/modified ingredients', () => {
    const recipe = makeRecipe({
      ingredients: [
        { amount: '150', unit: 'g', item: 'flour', notes: '' }, // modified
        { amount: '4', unit: '', item: 'eggs', notes: '' }, // unchanged
        { amount: 'pinch', unit: '', item: 'salt', notes: '' }, // added
      ],
    })
    const diff = computeDiff(makeMealItem(), recipe)
    expect(diff.hasChanges).toBe(true)
    const kinds = diff.ingredients.map((e) => e.kind)
    expect(kinds).toContain('modified')
    expect(kinds).toContain('added')
  })

  it('detects scalar changes (cook time, prep time, rest time)', () => {
    const recipe = makeRecipe({ cook_time_minutes: 30, prep_time_minutes: 15 })
    const diff = computeDiff(makeMealItem(), recipe)
    expect(diff.hasChanges).toBe(true)
    expect(diff.scalars.find((s) => s.field === 'cook_time_minutes')?.after).toBe(30)
    expect(diff.scalars.find((s) => s.field === 'prep_time_minutes')?.after).toBe(15)
  })

  it('treats null/undefined/0 in time fields equivalently to avoid noise', () => {
    const item = makeMealItem({ rest_time_minutes: 0 })
    const recipe = makeRecipe({ rest_time_minutes: null })
    const diff = computeDiff(item, recipe)
    // 0 vs null should NOT count as a scalar change
    expect(diff.scalars.find((s) => s.field === 'rest_time_minutes')).toBeUndefined()
  })
})

// ─── detectLocalTweaks ─────────────────────────────────────────────────────

describe('detectLocalTweaks', () => {
  it('returns no tweaks when meal item matches recipe', () => {
    expect(detectLocalTweaks(makeMealItem(), makeRecipe())).toEqual([])
  })

  it('detects a local cook-time tweak', () => {
    const item = makeMealItem({ cook_time_minutes: 28 })
    const tweaks = detectLocalTweaks(item, makeRecipe())
    expect(tweaks).toHaveLength(1)
    expect(tweaks[0]).toMatchObject({
      field: 'cook_time_minutes',
      mealItemValue: 28,
      recipeValue: 25,
    })
  })

  it('detects multiple tweaks', () => {
    const item = makeMealItem({ cook_time_minutes: 30, rest_time_minutes: 5 })
    const tweaks = detectLocalTweaks(item, makeRecipe())
    expect(tweaks.map((t) => t.field).sort()).toEqual(['cook_time_minutes', 'rest_time_minutes'])
  })
})

// ─── buildRefreshPayload ───────────────────────────────────────────────────

describe('buildRefreshPayload', () => {
  it('copies all snapshot fields from the recipe', () => {
    const recipe = makeRecipe({ cook_time_minutes: 30, prep_time_minutes: 12 })
    const payload = buildRefreshPayload(recipe)
    expect(payload.cook_time_minutes).toBe(30)
    expect(payload.prep_time_minutes).toBe(12)
    expect(payload.ingredients?.length).toBe(2)
    expect(payload.instructions).toBe('Whisk the batter\nBake until risen')
  })

  it('returns null for empty ingredient arrays (not [])', () => {
    const recipe = makeRecipe({ ingredients: [] })
    expect(buildRefreshPayload(recipe).ingredients).toBeNull()
  })

  it('sets recipe_snapshot_at to a fresh ISO timestamp', () => {
    const before = Date.now()
    const payload = buildRefreshPayload(makeRecipe())
    const ts = new Date(payload.recipe_snapshot_at).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(Date.now() + 1)
  })
})

// ─── buildPushPayload ──────────────────────────────────────────────────────

describe('buildPushPayload', () => {
  it('builds payload with only the requested fields', () => {
    const item = makeMealItem({ cook_time_minutes: 35 })
    const payload = buildPushPayload(item, ['cook_time_minutes'])
    expect(payload).toEqual({ cook_time_minutes: 35 })
  })

  it('handles instructions field', () => {
    const item = makeMealItem({ instructions: 'New method' })
    const payload = buildPushPayload(item, ['instructions'])
    expect(payload.instructions).toBe('New method')
  })

  it('handles ingredients field, normalising empty to []', () => {
    const item = makeMealItem({ ingredients: null })
    const payload = buildPushPayload(item, ['ingredients'])
    expect(payload.ingredients).toEqual([])
  })

  it('skips temperature fields (not on Recipe schema)', () => {
    const item = makeMealItem({ temperature: 200 })
    const payload = buildPushPayload(item, ['temperature', 'temperature_unit'])
    expect(payload).toEqual({})
  })

  it('combines multiple fields', () => {
    const item = makeMealItem({ cook_time_minutes: 35, prep_time_minutes: 5 })
    const payload = buildPushPayload(item, ['cook_time_minutes', 'prep_time_minutes'])
    expect(payload).toEqual({ cook_time_minutes: 35, prep_time_minutes: 5 })
  })
})

// ─── formatSnapshotDate ────────────────────────────────────────────────────

describe('formatSnapshotDate', () => {
  const now = new Date('2026-04-30T15:00:00Z')

  it('returns "unknown" for null/undefined', () => {
    expect(formatSnapshotDate(null, now)).toBe('unknown')
    expect(formatSnapshotDate(undefined, now)).toBe('unknown')
  })

  it('returns "today" for same calendar day', () => {
    expect(formatSnapshotDate('2026-04-30T08:00:00Z', now)).toBe('today')
  })

  it('returns "yesterday" for previous day', () => {
    expect(formatSnapshotDate('2026-04-29T08:00:00Z', now)).toBe('yesterday')
  })

  it('returns short date for older dates', () => {
    const formatted = formatSnapshotDate('2026-04-15T08:00:00Z', now)
    expect(formatted).toMatch(/15 Apr/)
  })
})

describe('fieldLabel', () => {
  it('produces friendly labels', () => {
    expect(fieldLabel('cook_time_minutes')).toBe('Cook time')
    expect(fieldLabel('instructions')).toBe('Method')
    expect(fieldLabel('ingredients')).toBe('Ingredients')
  })
})
