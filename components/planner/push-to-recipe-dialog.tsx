'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  computeDiff,
  fieldLabel,
  isStale,
  SNAPSHOT_FIELD_KEYS,
  type SnapshotFieldKey,
} from '@/lib/recipe-sync'
import type { MealItem, Recipe } from '@/types'

interface PushToRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealItem: MealItem | null
  recipe: Recipe | null
  loadingRecipe?: boolean
  errorRecipe?: string | null
  /** Called with the set of fields the user opted to push. */
  onConfirm: (fields: SnapshotFieldKey[]) => Promise<void>
  /** Called when the user opts to refresh first (resolves the conflict). */
  onPullFirst?: () => void
}

const SCALAR_FIELDS: SnapshotFieldKey[] = [
  'prep_time_minutes',
  'cook_time_minutes',
  'rest_time_minutes',
]

export function PushToRecipeDialog({
  open,
  onOpenChange,
  mealItem,
  recipe,
  loadingRecipe,
  errorRecipe,
  onConfirm,
  onPullFirst,
}: PushToRecipeDialogProps) {
  const [pushing, setPushing] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<SnapshotFieldKey>>(new Set())

  const diff = useMemo(() => {
    if (!mealItem || !recipe) return null
    return computeDiff(mealItem, recipe)
  }, [mealItem, recipe])

  // Conflict: recipe was edited externally since the meal item's snapshot.
  const conflict = useMemo(() => {
    if (!mealItem || !recipe) return false
    return isStale(mealItem.recipe_snapshot_at, recipe.updated_at)
  }, [mealItem, recipe])

  // Default selection: anything that changed EXCEPT scalar time fields, which
  // are usually per-occasion tweaks. Method changes default ON, ingredient
  // changes default ON, time changes default OFF.
  useEffect(() => {
    if (!diff || !open) return
    const next = new Set<SnapshotFieldKey>()
    if (diff.instructions.some((e) => e.kind !== 'unchanged')) {
      next.add('instructions')
    }
    if (diff.ingredients.some((e) => e.kind !== 'unchanged')) {
      next.add('ingredients')
    }
    setSelected(next)
  }, [diff, open])

  const toggle = (field: SnapshotFieldKey) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const handlePush = async () => {
    setPushing(true)
    setPushError(null)
    try {
      await onConfirm(Array.from(selected))
      onOpenChange(false)
    } catch {
      setPushError("Couldn't save to the recipe. Try again?")
    } finally {
      setPushing(false)
    }
  }

  const recipeName = recipe?.title || mealItem?.name || 'recipe'
  const hasChanges = diff?.hasChanges
  const nothingSelected = selected.size === 0

  // ── Conflict path ─────────────────────────────────────────────────────────
  if (conflict && !loadingRecipe && !errorRecipe) {
    return (
      <Dialog open={open} onOpenChange={(v) => !pushing && onOpenChange(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conflict — recipe also edited</DialogTitle>
            <DialogDescription>
              The &ldquo;{recipeName}&rdquo; recipe was edited elsewhere since this meal item was snapshotted.
              Saving your meal-item changes would overwrite those recipe edits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Button
              type="button"
              className="w-full bg-[#C99846] text-white hover:bg-[#B5853C]"
              onClick={() => {
                onOpenChange(false)
                onPullFirst?.()
              }}
              disabled={!onPullFirst}
            >
              Pull recipe into this meal item first
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handlePush}
              disabled={pushing}
            >
              {pushing ? 'Saving…' : 'Replace recipe with my version'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => onOpenChange(false)}
              disabled={pushing}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Normal push dialog ────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !pushing && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Update &ldquo;{recipeName}&rdquo; recipe?</DialogTitle>
          <DialogDescription>
            Tick the changes you&apos;d like saved back to the recipe. Unticked changes
            stay on this meal item only.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2">
          {loadingRecipe && (
            <div className="space-y-2 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          )}

          {errorRecipe && !loadingRecipe && (
            <p className="text-sm text-destructive py-4">{errorRecipe}</p>
          )}

          {pushError && (
            <div role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-2">
              {pushError}
            </div>
          )}

          {!loadingRecipe && !errorRecipe && diff && (
            <>
              {!hasChanges ? (
                <p className="text-sm text-muted-foreground py-4">
                  No changes to push — this meal item already matches the recipe.
                </p>
              ) : (
                <div className="space-y-1">
                  {/* Method changes */}
                  {diff.instructions.some((e) => e.kind !== 'unchanged') && (
                    <PushOption
                      checked={selected.has('instructions')}
                      onToggle={() => toggle('instructions')}
                      label="Method changes"
                      detail={describeInstructionChanges(diff.instructions)}
                    />
                  )}
                  {/* Ingredient changes */}
                  {diff.ingredients.some((e) => e.kind !== 'unchanged') && (
                    <PushOption
                      checked={selected.has('ingredients')}
                      onToggle={() => toggle('ingredients')}
                      label="Ingredient changes"
                      detail={describeIngredientChanges(diff.ingredients)}
                    />
                  )}
                  {/* Scalar (time) changes — default OFF */}
                  {SCALAR_FIELDS.map((field) => {
                    const scalar = diff.scalars.find((s) => s.field === field)
                    if (!scalar) return null
                    return (
                      <PushOption
                        key={field}
                        checked={selected.has(field)}
                        onToggle={() => toggle(field)}
                        label={fieldLabel(field)}
                        detail={`${String(scalar.before ?? '—')} → ${String(scalar.after ?? '—')}`}
                        sideNote="Likely tonight-only — left unticked"
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pushing}>
            Cancel
          </Button>
          <Button
            onClick={handlePush}
            disabled={pushing || loadingRecipe || !hasChanges || nothingSelected}
            className="bg-[#3D8B8B] text-white hover:bg-[#2F6E6E]"
          >
            {pushing ? 'Saving…' : 'Save to recipe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function PushOption({
  checked,
  onToggle,
  label,
  detail,
  sideNote,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  detail: string
  sideNote?: string
}) {
  return (
    <label className="flex items-start gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/30 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 w-4 h-4 accent-[#3D8B8B] cursor-pointer"
      />
      <div className="flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-muted-foreground text-xs mt-0.5">{detail}</div>
        {sideNote && <div className="text-[11px] text-muted-foreground italic mt-0.5">{sideNote}</div>}
      </div>
    </label>
  )
}

function describeInstructionChanges(
  diff: ReturnType<typeof computeDiff>['instructions']
): string {
  let added = 0, removed = 0, modified = 0
  for (const e of diff) {
    if (e.kind === 'added') added++
    else if (e.kind === 'removed') removed++
    else if (e.kind === 'modified') modified++
  }
  return [
    added && `${added} added`,
    removed && `${removed} removed`,
    modified && `${modified} modified`,
  ]
    .filter(Boolean)
    .join(' · ')
}

function describeIngredientChanges(
  diff: ReturnType<typeof computeDiff>['ingredients']
): string {
  let added = 0, removed = 0, modified = 0
  for (const e of diff) {
    if (e.kind === 'added') added++
    else if (e.kind === 'removed') removed++
    else if (e.kind === 'modified') modified++
  }
  return [
    added && `${added} added`,
    removed && `${removed} removed`,
    modified && `${modified} modified`,
  ]
    .filter(Boolean)
    .join(' · ')
}
