'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  computeDiff,
  detectLocalTweaks,
  fieldLabel,
  type IngredientDiffEntry,
  type InstructionDiffEntry,
  type ScalarDiffEntry,
} from '@/lib/recipe-sync'
import type { MealItem, Recipe } from '@/types'

interface RefreshFromRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealItem: MealItem | null
  recipe: Recipe | null
  loadingRecipe?: boolean
  errorRecipe?: string | null
  onConfirm: () => Promise<void>
}

export function RefreshFromRecipeDialog({
  open,
  onOpenChange,
  mealItem,
  recipe,
  loadingRecipe,
  errorRecipe,
  onConfirm,
}: RefreshFromRecipeDialogProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const diff = useMemo(() => {
    if (!mealItem || !recipe) return null
    return computeDiff(mealItem, recipe)
  }, [mealItem, recipe])

  const tweaks = useMemo(() => {
    if (!mealItem || !recipe) return []
    return detectLocalTweaks(mealItem, recipe)
  }, [mealItem, recipe])

  const handleRefresh = async () => {
    if (!recipe) return
    setRefreshing(true)
    setRefreshError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      setRefreshError("Couldn't save your refresh. Your meal item hasn't changed. Try again?")
    } finally {
      setRefreshing(false)
    }
  }

  const recipeName = recipe?.title || mealItem?.name || 'recipe'

  return (
    <Dialog open={open} onOpenChange={(v) => !refreshing && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Refresh &ldquo;{recipeName}&rdquo;?</DialogTitle>
          <DialogDescription>
            Pull the latest version of the recipe into this meal item.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
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

          {refreshError && (
            <div role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-3">
              {refreshError}
            </div>
          )}

          {!loadingRecipe && !errorRecipe && diff && (
            <>
              {!diff.hasChanges ? (
                <p className="text-sm text-muted-foreground py-4">
                  No changes — this meal item is already in sync with the recipe.
                </p>
              ) : (
                <>
                  {tweaks.length > 0 && (
                    <div
                      role="alert"
                      className="text-sm bg-[#C99846]/10 border-l-4 border-[#C99846] rounded-md px-3 py-2 mb-3"
                    >
                      <strong className="block text-[#8B5A2B] mb-1">
                        Your local changes will be replaced
                      </strong>
                      <ul className="text-foreground space-y-0.5">
                        {tweaks.map((t) => (
                          <li key={t.field}>
                            {fieldLabel(t.field)}:{' '}
                            <strong>{String(t.mealItemValue ?? '—')}</strong>
                            {' → '}
                            <span>{String(t.recipeValue ?? '—')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diff.scalars.length > 0 && (
                    <DiffSection title="Times">
                      {diff.scalars.map((s) => (
                        <ScalarDiffRow key={s.field} entry={s} />
                      ))}
                    </DiffSection>
                  )}

                  {diff.ingredients.some((e) => e.kind !== 'unchanged') && (
                    <DiffSection title="Ingredients">
                      {diff.ingredients
                        .filter((e) => e.kind !== 'unchanged')
                        .map((entry, i) => (
                          <IngredientDiffRow key={i} entry={entry} />
                        ))}
                    </DiffSection>
                  )}

                  {diff.instructions.some((e) => e.kind !== 'unchanged') && (
                    <DiffSection title="Method">
                      {diff.instructions
                        .filter((e) => e.kind !== 'unchanged')
                        .map((entry, i) => (
                          <InstructionDiffRow key={i} entry={entry} />
                        ))}
                    </DiffSection>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={refreshing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={refreshing || loadingRecipe || !diff?.hasChanges}
            className="bg-[#C99846] text-white hover:bg-[#B5853C]"
          >
            {refreshing ? 'Refreshing…' : 'Refresh from recipe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function DiffSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        {title}
      </h4>
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  )
}

function ScalarDiffRow({ entry }: { entry: ScalarDiffEntry }) {
  const before = entry.before ?? '—'
  const after = entry.after ?? '—'
  return (
    <div className="flex items-start gap-2 px-3 py-2 text-sm">
      <DiffMarker kind="modified" />
      <div className="flex-1">
        <span className="font-semibold">{fieldLabel(entry.field)}: </span>
        <span className="line-through text-muted-foreground">{String(before)}</span>
        {' → '}
        <span>{String(after)}</span>
      </div>
    </div>
  )
}

function IngredientDiffRow({ entry }: { entry: IngredientDiffEntry }) {
  const formatIng = (i?: typeof entry.before) =>
    i ? [i.amount, i.unit, i.item].filter(Boolean).join(' ') : '—'

  if (entry.kind === 'added') {
    return (
      <div className="flex items-start gap-2 px-3 py-2 text-sm">
        <DiffMarker kind="added" />
        <span className="flex-1">{formatIng(entry.after)}</span>
      </div>
    )
  }
  if (entry.kind === 'removed') {
    return (
      <div className="flex items-start gap-2 px-3 py-2 text-sm">
        <DiffMarker kind="removed" />
        <span className="flex-1 line-through text-muted-foreground">{formatIng(entry.before)}</span>
      </div>
    )
  }
  if (entry.kind === 'modified') {
    return (
      <div className="flex items-start gap-2 px-3 py-2 text-sm">
        <DiffMarker kind="modified" />
        <div className="flex-1">
          <span className="line-through text-muted-foreground">{formatIng(entry.before)}</span>
          {' → '}
          <span>{formatIng(entry.after)}</span>
        </div>
      </div>
    )
  }
  return null
}

function InstructionDiffRow({ entry }: { entry: InstructionDiffEntry }) {
  if (entry.kind === 'added') {
    return (
      <div className="flex items-start gap-2 px-3 py-2 text-sm">
        <DiffMarker kind="added" />
        <div className="flex-1">
          {entry.item.type === 'action' && <ActionPill />}
          {entry.item.text}
        </div>
      </div>
    )
  }
  if (entry.kind === 'removed') {
    return (
      <div className="flex items-start gap-2 px-3 py-2 text-sm">
        <DiffMarker kind="removed" />
        <div className="flex-1 line-through text-muted-foreground">
          {entry.item.type === 'action' && <ActionPill />}
          {entry.item.text}
        </div>
      </div>
    )
  }
  if (entry.kind === 'modified') {
    return (
      <div className="flex items-start gap-2 px-3 py-2 text-sm">
        <DiffMarker kind="modified" />
        <div className="flex-1 space-y-0.5">
          <div className="line-through text-muted-foreground">
            {entry.before.type === 'action' && <ActionPill />}
            {entry.before.text}
          </div>
          <div>
            {entry.after.type === 'action' && <ActionPill />}
            {entry.after.text}
          </div>
        </div>
      </div>
    )
  }
  return null
}

function DiffMarker({ kind }: { kind: 'added' | 'removed' | 'modified' }) {
  const symbol = kind === 'added' ? '+' : kind === 'removed' ? '−' : '~'
  const color =
    kind === 'added'
      ? 'text-[#40916C]'
      : kind === 'removed'
        ? 'text-destructive'
        : 'text-[#C99846]'
  return (
    <span
      className={cn('font-extrabold w-4 text-center shrink-0 text-base leading-tight', color)}
      aria-label={kind}
    >
      {symbol}
    </span>
  )
}

function ActionPill() {
  return (
    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#40916C] bg-[#40916C]/12 px-1.5 py-0.5 rounded mr-1.5 align-middle">
      Action
    </span>
  )
}
