import type { Ingredient, MealItem, Recipe } from '@/types'
import { parseInstructionItems, type InstructionItem } from './instruction-items'

// ─── Types ────────────────────────────────────────────────────────────────

/** A subset of MealItem containing only the fields we sync against a recipe. */
export interface SnapshotFields {
  ingredients: Ingredient[] | null
  instructions: string | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  rest_time_minutes: number | null
  temperature: number | null
  temperature_unit: 'C' | 'F'
}

/** The MealItem fields a refresh from recipe will overwrite. */
export const SNAPSHOT_FIELD_KEYS = [
  'ingredients',
  'instructions',
  'prep_time_minutes',
  'cook_time_minutes',
  'rest_time_minutes',
  'temperature',
  'temperature_unit',
] as const

export type SnapshotFieldKey = (typeof SNAPSHOT_FIELD_KEYS)[number]

/** Diff for a single instruction item — preserved order, identified by index. */
export type InstructionDiffEntry =
  | { kind: 'unchanged'; index: number; item: InstructionItem }
  | { kind: 'added'; index: number; item: InstructionItem }
  | { kind: 'removed'; index: number; item: InstructionItem }
  | { kind: 'modified'; index: number; before: InstructionItem; after: InstructionItem }

export interface IngredientDiffEntry {
  kind: 'unchanged' | 'added' | 'removed' | 'modified'
  before?: Ingredient
  after?: Ingredient
}

export interface ScalarDiffEntry {
  field: SnapshotFieldKey
  before: unknown
  after: unknown
}

export interface SyncDiff {
  hasChanges: boolean
  instructions: InstructionDiffEntry[]
  ingredients: IngredientDiffEntry[]
  scalars: ScalarDiffEntry[]
}

/** A field where the meal item locally diverges from BOTH the recipe AND (assumed) the snapshot. */
export interface LocalTweak {
  field: SnapshotFieldKey
  mealItemValue: unknown
  recipeValue: unknown
}

// Treat null / undefined / 0 as equivalent for time-minutes fields. Avoids
// noise from backfilled rows where the recipe has `null` and the meal item
// has `0` (or vice versa) for the same logical "no rest time" meaning.
function normTime(v: unknown): number | null {
  if (v === undefined || v === null || v === 0) return null
  return v as number
}

// ─── Stale detection ──────────────────────────────────────────────────────

/**
 * True if a meal item's snapshot is older than the source recipe's last update.
 * Returns false if either input is null/undefined (can't compare → not stale).
 */
export function isStale(
  snapshotAt: string | null | undefined,
  recipeUpdatedAt: string | null | undefined
): boolean {
  if (!snapshotAt || !recipeUpdatedAt) return false
  return new Date(snapshotAt).getTime() < new Date(recipeUpdatedAt).getTime()
}

// ─── Diff computation ─────────────────────────────────────────────────────

function instructionItemsEqual(a: InstructionItem, b: InstructionItem): boolean {
  return a.text.trim() === b.text.trim() && a.type === b.type
}

function ingredientsEqual(a: Ingredient, b: Ingredient): boolean {
  return (
    (a.amount || '').trim() === (b.amount || '').trim() &&
    (a.unit || '').trim() === (b.unit || '').trim() &&
    (a.item || '').trim() === (b.item || '').trim() &&
    (a.notes || '').trim() === (b.notes || '').trim()
  )
}

function diffInstructions(
  fromText: string | null,
  toText: string | null
): InstructionDiffEntry[] {
  const from = parseInstructionItems(fromText)
  const to = parseInstructionItems(toText)
  const result: InstructionDiffEntry[] = []
  const max = Math.max(from.length, to.length)
  for (let i = 0; i < max; i++) {
    const a = from[i]
    const b = to[i]
    if (!a && b) {
      result.push({ kind: 'added', index: i, item: b })
    } else if (a && !b) {
      result.push({ kind: 'removed', index: i, item: a })
    } else if (a && b) {
      if (instructionItemsEqual(a, b)) {
        result.push({ kind: 'unchanged', index: i, item: a })
      } else {
        result.push({ kind: 'modified', index: i, before: a, after: b })
      }
    }
  }
  return result
}

function diffIngredients(
  from: Ingredient[] | null,
  to: Ingredient[] | null
): IngredientDiffEntry[] {
  const a = from || []
  const b = to || []
  const result: IngredientDiffEntry[] = []
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    const x = a[i]
    const y = b[i]
    if (!x && y) result.push({ kind: 'added', after: y })
    else if (x && !y) result.push({ kind: 'removed', before: x })
    else if (x && y) {
      if (ingredientsEqual(x, y)) result.push({ kind: 'unchanged', before: x, after: y })
      else result.push({ kind: 'modified', before: x, after: y })
    }
  }
  return result
}

/**
 * Compute the diff a refresh from recipe would apply to the meal item.
 * "before" = current meal item state, "after" = recipe state.
 */
export function computeDiff(mealItem: MealItem, recipe: Recipe): SyncDiff {
  const instructions = diffInstructions(mealItem.instructions, recipe.instructions)
  const ingredients = diffIngredients(mealItem.ingredients, recipe.ingredients)
  const scalars: ScalarDiffEntry[] = []

  const compare = (field: SnapshotFieldKey, before: unknown, after: unknown) => {
    if (normTime(before) !== normTime(after)) {
      scalars.push({ field, before, after })
    }
  }
  compare('prep_time_minutes', mealItem.prep_time_minutes, recipe.prep_time_minutes)
  compare('cook_time_minutes', mealItem.cook_time_minutes, recipe.cook_time_minutes)
  compare('rest_time_minutes', mealItem.rest_time_minutes, recipe.rest_time_minutes)
  // Recipe doesn't have temperature/unit on the schema today; only diff if recipe has those props
  // (it doesn't in current schema, so these will simply not change).

  const hasChanges =
    scalars.length > 0 ||
    instructions.some((e) => e.kind !== 'unchanged') ||
    ingredients.some((e) => e.kind !== 'unchanged')

  return { hasChanges, instructions, ingredients, scalars }
}

/**
 * True if a diff has any non-unchanged entries (cheap helper for the badge).
 */
export function hasMeaningfulChanges(diff: SyncDiff): boolean {
  return diff.hasChanges
}

// ─── Local-tweak detection ────────────────────────────────────────────────

/**
 * Returns the set of fields where the cook has locally changed the meal item
 * to a value that differs from the source recipe — refreshing would overwrite
 * these. We don't keep a true historical snapshot per field, so we approximate
 * by treating "meal item value differs from recipe value" as a local tweak.
 *
 * This produces a small false-positive rate (a difference that originates
 * from a recipe edit, not a meal-item tweak), but the diff dialog already
 * shows those changes side-by-side so the cook can judge for themselves.
 */
export function detectLocalTweaks(mealItem: MealItem, recipe: Recipe): LocalTweak[] {
  const tweaks: LocalTweak[] = []
  const candidates: Array<{ field: SnapshotFieldKey; a: unknown; b: unknown }> = [
    { field: 'prep_time_minutes', a: mealItem.prep_time_minutes, b: recipe.prep_time_minutes },
    { field: 'cook_time_minutes', a: mealItem.cook_time_minutes, b: recipe.cook_time_minutes },
    { field: 'rest_time_minutes', a: mealItem.rest_time_minutes, b: recipe.rest_time_minutes },
  ]
  for (const { field, a, b } of candidates) {
    if (normTime(a) !== normTime(b)) {
      tweaks.push({ field, mealItemValue: a, recipeValue: b })
    }
  }
  return tweaks
}

// ─── Refresh payload (Plan ← Recipe) ──────────────────────────────────────

/**
 * Build the meal_item update payload to refresh the item from the recipe.
 * Includes all snapshot fields + the new snapshot timestamp.
 */
export function buildRefreshPayload(recipe: Recipe): {
  ingredients: Ingredient[] | null
  instructions: string | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  rest_time_minutes: number | null
  recipe_snapshot_at: string
} {
  return {
    ingredients: recipe.ingredients?.length ? recipe.ingredients : null,
    instructions: recipe.instructions || null,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    rest_time_minutes: recipe.rest_time_minutes,
    recipe_snapshot_at: new Date().toISOString(),
  }
}

// ─── Push payload (Recipe ← Plan) ─────────────────────────────────────────

/**
 * For Phase 2 push: build a recipe update payload from the meal item, scoped
 * to the fields the user explicitly opted in to push.
 */
export function buildPushPayload(
  mealItem: MealItem,
  fields: ReadonlyArray<SnapshotFieldKey>
): Partial<Recipe> {
  const payload: Partial<Recipe> = {}
  for (const field of fields) {
    switch (field) {
      case 'ingredients':
        payload.ingredients = mealItem.ingredients?.length ? mealItem.ingredients : []
        break
      case 'instructions':
        payload.instructions = mealItem.instructions
        break
      case 'prep_time_minutes':
      case 'cook_time_minutes':
      case 'rest_time_minutes':
        payload[field] = mealItem[field]
        break
      // temperature isn't on Recipe today, skip.
      case 'temperature':
      case 'temperature_unit':
        break
    }
  }
  return payload
}

// ─── Friendly date formatting ─────────────────────────────────────────────

/**
 * Format a snapshot timestamp for the orientation line. Today/yesterday/short date.
 */
export function formatSnapshotDate(snapshotAt: string | null | undefined, now: Date = new Date()): string {
  if (!snapshotAt) return 'unknown'
  const d = new Date(snapshotAt)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Field label for UI ───────────────────────────────────────────────────

export function fieldLabel(field: SnapshotFieldKey): string {
  switch (field) {
    case 'prep_time_minutes':
      return 'Prep time'
    case 'cook_time_minutes':
      return 'Cook time'
    case 'rest_time_minutes':
      return 'Rest time'
    case 'temperature':
      return 'Temperature'
    case 'temperature_unit':
      return 'Temperature unit'
    case 'ingredients':
      return 'Ingredients'
    case 'instructions':
      return 'Method'
  }
}
