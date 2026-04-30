'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMealPlans } from '@/hooks/use-meal-plan'
import { MealItemForm } from '@/components/planner/meal-item-form'
import { MealItemCard } from '@/components/planner/meal-item-card'
import { MealPlanForm } from '@/components/planner/meal-plan-form'
import { TimelineView } from '@/components/planner/timeline-view'
import { TimerDisplay } from '@/components/planner/timer-display'
import { NotificationPrompt } from '@/components/planner/notification-prompt'
import { AddRecipeToPlan } from '@/components/planner/add-recipe-to-plan'
import { PlannerRecipeSheet } from '@/components/planner/planner-recipe-sheet'
import { RefreshFromRecipeDialog } from '@/components/planner/refresh-from-recipe-dialog'
import { PushToRecipeDialog } from '@/components/planner/push-to-recipe-dialog'
import { calculateTimeline } from '@/lib/timing-calculator'
import { createClient } from '@/lib/supabase/client'
import { buildPushPayload, buildRefreshPayload, computeDiff, type SnapshotFieldKey } from '@/lib/recipe-sync'
import { toast as sonnerToast } from 'sonner'
import { getOfferPushOnSave } from '@/lib/sync-preferences'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MealItem, MealPlanInsert, MealItemInsert, Recipe, TimelineEvent, TimelineEventType } from '@/types'

interface MealPlanWithItems {
  id: string
  user_id: string
  name: string
  description: string | null
  serve_time: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  meal_items: MealItem[]
}

export default function MealPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const {
    getMealPlan,
    updateMealPlan,
    deleteMealPlan,
    setAsActive,
    deactivatePlan,
    addMealItem,
    updateMealItem,
    deleteMealItem,
  } = useMealPlans({ initialFetch: false })

  const [plan, setPlan] = useState<MealPlanWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Source recipes for items with recipe_id, keyed by recipe id. Used for
  // staleness detection and the refresh-from-recipe diff dialog.
  const [sourceRecipes, setSourceRecipes] = useState<Record<string, Recipe>>({})

  // Refresh-from-recipe dialog state (Phase 1: pull recipe → meal item)
  const [refreshDialogItem, setRefreshDialogItem] = useState<MealItem | null>(null)
  const [refreshDialogRecipe, setRefreshDialogRecipe] = useState<Recipe | null>(null)
  const [refreshDialogLoading, setRefreshDialogLoading] = useState(false)
  const [refreshDialogError, setRefreshDialogError] = useState<string | null>(null)

  // Push-to-recipe dialog state (Phase 2: push meal item → recipe)
  const [pushDialogItem, setPushDialogItem] = useState<MealItem | null>(null)
  const [pushDialogRecipe, setPushDialogRecipe] = useState<Recipe | null>(null)
  const [pushDialogLoading, setPushDialogLoading] = useState(false)
  const [pushDialogError, setPushDialogError] = useState<string | null>(null)

  // Shared recipe sheet state (used by both item card clicks and timeline event clicks)
  const [recipeSheetItem, setRecipeSheetItem] = useState<MealItem | null>(null)
  const [recipeSheetEventType, setRecipeSheetEventType] = useState<TimelineEventType | null>(null)

  // Persistent checkbox state per meal item — kept in sessionStorage so it
  // survives navigating away (e.g. to the chef) and back during a cooking
  // session, but clears when the browser/tab closes.
  const [itemCheckState, setItemCheckState] = useState<Map<string, { checkedIngredients: Set<number>; completedSteps: Set<number> }>>(new Map())
  const [checkStateHydrated, setCheckStateHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`kitchen:planner:checkstate:${id}`)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { checkedIngredients: number[]; completedSteps: number[] }>
        const map = new Map<string, { checkedIngredients: Set<number>; completedSteps: Set<number> }>()
        for (const [key, val] of Object.entries(parsed)) {
          map.set(key, {
            checkedIngredients: new Set(val.checkedIngredients),
            completedSteps: new Set(val.completedSteps),
          })
        }
        setItemCheckState(map)
      }
    } catch {
      // ignore corrupted storage
    }
    setCheckStateHydrated(true)
  }, [id])

  useEffect(() => {
    if (!checkStateHydrated) return
    try {
      const obj: Record<string, { checkedIngredients: number[]; completedSteps: number[] }> = {}
      for (const [key, val] of itemCheckState.entries()) {
        obj[key] = {
          checkedIngredients: Array.from(val.checkedIngredients),
          completedSteps: Array.from(val.completedSteps),
        }
      }
      sessionStorage.setItem(`kitchen:planner:checkstate:${id}`, JSON.stringify(obj))
    } catch {
      // ignore quota / storage errors
    }
  }, [itemCheckState, checkStateHydrated, id])

  const getItemCheckState = useCallback((itemId: string) => {
    return itemCheckState.get(itemId) || { checkedIngredients: new Set<number>(), completedSteps: new Set<number>() }
  }, [itemCheckState])

  const toggleItemIngredient = useCallback((itemId: string, index: number) => {
    setItemCheckState(prev => {
      const next = new Map(prev)
      const state = next.get(itemId) || { checkedIngredients: new Set<number>(), completedSteps: new Set<number>() }
      const ingredients = new Set(state.checkedIngredients)
      if (ingredients.has(index)) ingredients.delete(index)
      else ingredients.add(index)
      next.set(itemId, { ...state, checkedIngredients: ingredients })
      return next
    })
  }, [])

  const toggleItemStep = useCallback((itemId: string, index: number) => {
    setItemCheckState(prev => {
      const next = new Map(prev)
      const state = next.get(itemId) || { checkedIngredients: new Set<number>(), completedSteps: new Set<number>() }
      const steps = new Set(state.completedSteps)
      if (steps.has(index)) steps.delete(index)
      else steps.add(index)
      next.set(itemId, { ...state, completedSteps: steps })
      return next
    })
  }, [])

  const handleViewRecipeFromCard = useCallback((item: MealItem) => {
    setRecipeSheetItem(item)
    setRecipeSheetEventType(null)
  }, [])

  const handleViewRecipeFromTimeline = useCallback((event: TimelineEvent) => {
    if (!plan) return
    const item = plan.meal_items.find(i => i.id === event.mealItemId)
    if (item) {
      setRecipeSheetItem(item)
      setRecipeSheetEventType(event.type)
    }
  }, [plan])

  // Dialog states
  const [editPlanOpen, setEditPlanOpen] = useState(false)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [addRecipeOpen, setAddRecipeOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MealItem | null>(null)
  const [deleteItemDialog, setDeleteItemDialog] = useState<string | null>(null)
  const [deletePlanDialog, setDeletePlanDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch plan
  useEffect(() => {
    async function fetchPlan() {
      const data = await getMealPlan(id)
      if (data) {
        setPlan(data)
      } else {
        setError('Meal plan not found')
      }
      setLoading(false)
    }
    fetchPlan()
  }, [id, getMealPlan])

  // Fetch source recipes for items that came from a recipe — needed for
  // staleness detection on the planner card and the refresh diff dialog.
  useEffect(() => {
    if (!plan) return
    const recipeIds = Array.from(
      new Set(plan.meal_items.map((i) => i.recipe_id).filter((r): r is string => !!r))
    )
    if (recipeIds.length === 0) {
      setSourceRecipes({})
      return
    }
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds)
      if (cancelled) return
      if (error || !data) return
      const next: Record<string, Recipe> = {}
      for (const r of data) next[r.id] = r as Recipe
      setSourceRecipes(next)
    })()
    return () => {
      cancelled = true
    }
  }, [plan])

  // Refresh dialog: open and re-fetch the recipe to ensure freshest data.
  const handleOpenRefreshDialog = useCallback(
    async (item: MealItem) => {
      if (!item.recipe_id) return
      setRefreshDialogItem(item)
      setRefreshDialogRecipe(sourceRecipes[item.recipe_id] || null)
      setRefreshDialogError(null)
      setRefreshDialogLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', item.recipe_id)
          .single()
        if (error || !data) {
          setRefreshDialogError(
            error?.code === 'PGRST116'
              ? 'The source recipe was deleted. Your meal item is unchanged.'
              : "Couldn't load the latest recipe. Try again?"
          )
        } else {
          setRefreshDialogRecipe(data as Recipe)
          setSourceRecipes((prev) => ({ ...prev, [(data as Recipe).id]: data as Recipe }))
        }
      } catch {
        setRefreshDialogError("Couldn't load the latest recipe. Try again?")
      } finally {
        setRefreshDialogLoading(false)
      }
    },
    [sourceRecipes]
  )

  const handleConfirmRefresh = useCallback(async () => {
    if (!refreshDialogItem || !refreshDialogRecipe) return
    const payload = buildRefreshPayload(refreshDialogRecipe)
    const updated = await updateMealItem(refreshDialogItem.id, payload)
    if (!updated) throw new Error('refresh failed')
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            meal_items: prev.meal_items.map((i) => (i.id === updated.id ? updated : i)),
          }
        : null
    )
  }, [refreshDialogItem, refreshDialogRecipe, updateMealItem])

  // Phase 2: open the push-to-recipe dialog (re-fetches recipe to detect conflicts).
  const handleOpenPushDialog = useCallback(
    async (item: MealItem) => {
      if (!item.recipe_id) return
      setPushDialogItem(item)
      setPushDialogRecipe(sourceRecipes[item.recipe_id] || null)
      setPushDialogError(null)
      setPushDialogLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', item.recipe_id)
          .single()
        if (error || !data) {
          setPushDialogError(
            error?.code === 'PGRST116'
              ? "The source recipe was deleted, so there's nothing to update."
              : "Couldn't load the recipe. Try again?"
          )
        } else {
          setPushDialogRecipe(data as Recipe)
          setSourceRecipes((prev) => ({ ...prev, [(data as Recipe).id]: data as Recipe }))
        }
      } catch {
        setPushDialogError("Couldn't load the recipe. Try again?")
      } finally {
        setPushDialogLoading(false)
      }
    },
    [sourceRecipes]
  )

  const handleConfirmPush = useCallback(
    async (fields: SnapshotFieldKey[]) => {
      if (!pushDialogItem || !pushDialogRecipe) return
      if (fields.length === 0) return
      const payload = buildPushPayload(pushDialogItem, fields)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipes')
        .update(payload)
        .eq('id', pushDialogRecipe.id)
        .select()
        .single()
      if (error || !data) throw new Error(error?.message || 'push failed')
      // Update local state so the badge clears (recipe.updated_at is now newer
      // than the meal item snapshot, so we also bump the snapshot to match).
      setSourceRecipes((prev) => ({ ...prev, [(data as Recipe).id]: data as Recipe }))
      const newSnapshotAt = (data as Recipe).updated_at
      const updatedMealItem = await updateMealItem(pushDialogItem.id, {
        recipe_snapshot_at: newSnapshotAt,
      })
      if (updatedMealItem) {
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                meal_items: prev.meal_items.map((i) =>
                  i.id === updatedMealItem.id ? updatedMealItem : i
                ),
              }
            : null
        )
      }
      sonnerToast.success('Recipe updated')
    },
    [pushDialogItem, pushDialogRecipe, updateMealItem]
  )

  // Calculate timeline
  const timeline = useMemo(() => {
    if (!plan?.serve_time || !plan.meal_items.length) return []
    return calculateTimeline(plan.meal_items, new Date(plan.serve_time))
  }, [plan])

  // Sort items by timeline start time (earliest first) when a serve time exists
  const sortedItems = useMemo(() => {
    if (!plan?.meal_items.length) return []
    if (!timeline.length) return plan.meal_items

    // Find each item's earliest event time
    const earliestTimeByItemId = new Map<string, number>()
    for (const event of timeline) {
      if (event.mealItemId === 'all') continue
      const existing = earliestTimeByItemId.get(event.mealItemId)
      const eventMs = event.time.getTime()
      if (existing === undefined || eventMs < existing) {
        earliestTimeByItemId.set(event.mealItemId, eventMs)
      }
    }

    return [...plan.meal_items].sort((a, b) => {
      const aTime = earliestTimeByItemId.get(a.id) ?? Infinity
      const bTime = earliestTimeByItemId.get(b.id) ?? Infinity
      return aTime - bTime
    })
  }, [plan?.meal_items, timeline])

  // Handlers
  const handleUpdatePlan = useCallback(async (data: MealPlanInsert) => {
    const result = await updateMealPlan(id, data)
    if (result) {
      setPlan((prev) => prev ? { ...prev, ...result } : null)
    }
    return result
  }, [id, updateMealPlan])

  const handleAddItem = useCallback(async (data: Omit<MealItemInsert, 'meal_plan_id'>) => {
    const result = await addMealItem(id, data)
    if (result) {
      setPlan((prev) => prev ? {
        ...prev,
        meal_items: [...prev.meal_items, result].sort((a, b) => a.sort_order - b.sort_order)
      } : null)
    }
    return result
  }, [id, addMealItem])

  const handleUpdateItem = useCallback(async (data: Omit<MealItemInsert, 'meal_plan_id'>) => {
    if (!editingItem) return null
    const result = await updateMealItem(editingItem.id, data)
    if (result) {
      setPlan((prev) => prev ? {
        ...prev,
        meal_items: prev.meal_items.map((i) => i.id === editingItem.id ? result : i)
      } : null)

      // Phase 2: if the saved item came from a recipe and now diverges, offer
      // to push the changes back to the recipe. Respects the user's setting.
      if (result.recipe_id && getOfferPushOnSave()) {
        const sourceRecipe = sourceRecipes[result.recipe_id]
        if (sourceRecipe) {
          const diff = computeDiff(result, sourceRecipe)
          if (diff.hasChanges) {
            sonnerToast('Saved to this plan', {
              description: 'Save these changes to the recipe too?',
              action: {
                label: 'Save to recipe',
                onClick: () => handleOpenPushDialog(result),
              },
              duration: 6000,
            })
          }
        }
      }
    }
    return result
  }, [editingItem, updateMealItem, sourceRecipes, handleOpenPushDialog])

  const handleDeleteItem = useCallback(async () => {
    if (!deleteItemDialog) return
    setDeleting(true)
    const success = await deleteMealItem(deleteItemDialog)
    if (success) {
      setPlan((prev) => prev ? {
        ...prev,
        meal_items: prev.meal_items.filter((i) => i.id !== deleteItemDialog)
      } : null)
    }
    setDeleting(false)
    setDeleteItemDialog(null)
  }, [deleteItemDialog, deleteMealItem])

  const handleDeletePlan = useCallback(async () => {
    setDeleting(true)
    const success = await deleteMealPlan(id)
    if (success) {
      router.push('/planner')
    }
    setDeleting(false)
  }, [id, deleteMealPlan, router])

  const handleSetActive = useCallback(async () => {
    const success = await setAsActive(id)
    if (success) {
      setPlan((prev) => prev ? { ...prev, is_active: true } : null)
    }
  }, [id, setAsActive])

  const handleDeactivate = useCallback(async () => {
    const success = await deactivatePlan(id)
    if (success) {
      setPlan((prev) => prev ? { ...prev, is_active: false } : null)
    }
  }, [id, deactivatePlan])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error || 'Meal plan not found'}</p>
        <Link href="/planner">
          <Button>Back to Plans</Button>
        </Link>
      </div>
    )
  }

  const serveTime = plan.serve_time ? new Date(plan.serve_time) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/planner" className="text-muted-foreground hover:text-foreground">
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold">{plan.name}</h1>
              {plan.is_active && <Badge>Active</Badge>}
            </div>
            {plan.description && (
              <p className="text-muted-foreground mt-1 ml-7">{plan.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!plan.is_active ? (
              <Button variant="outline" size="sm" onClick={handleSetActive}>
                Set Active
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleDeactivate}>
                Deactivate
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditPlanOpen(true)}>
              Edit Plan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeletePlanDialog(true)}>
              Delete
            </Button>
          </div>
        </div>

        {serveTime && (
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Serve time</span>
                <span className="font-medium">
                  {serveTime.toLocaleDateString()} at{' '}
                  {serveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notification prompt */}
      {plan.is_active && <NotificationPrompt />}

      {/* Timer display for active plans */}
      {plan.is_active && serveTime && timeline.length > 0 && (
        <TimerDisplay events={timeline} serveTime={serveTime} />
      )}

      {/* Main content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Items list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Items ({sortedItems.length})</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddRecipeOpen(true)}>
                <BookIcon className="h-4 w-4 mr-2" />
                From Recipe
              </Button>
              <Button onClick={() => setItemFormOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {sortedItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No items yet. Add the dishes you&apos;re cooking.
                </p>
                <Button onClick={() => setItemFormOpen(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item) => (
                <MealItemCard
                  key={item.id}
                  item={item}
                  sourceRecipe={item.recipe_id ? sourceRecipes[item.recipe_id] : null}
                  onEdit={(item) => {
                    setEditingItem(item)
                    setItemFormOpen(true)
                  }}
                  onDelete={(id) => setDeleteItemDialog(id)}
                  onViewRecipe={handleViewRecipeFromCard}
                  onRefreshFromRecipe={handleOpenRefreshDialog}
                />
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Timeline</h2>
          {serveTime ? (
            <TimelineView events={timeline} serveTime={serveTime} onEventClick={handleViewRecipeFromTimeline} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Set a serve time to see the cooking timeline.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Plan Dialog */}
      <MealPlanForm
        plan={plan}
        open={editPlanOpen}
        onOpenChange={setEditPlanOpen}
        onSubmit={handleUpdatePlan}
      />

      {/* Add/Edit Item Dialog */}
      <MealItemForm
        item={editingItem || undefined}
        sourceRecipe={editingItem?.recipe_id ? sourceRecipes[editingItem.recipe_id] : null}
        open={itemFormOpen}
        onOpenChange={(open) => {
          setItemFormOpen(open)
          if (!open) setEditingItem(null)
        }}
        onSubmit={editingItem ? handleUpdateItem : handleAddItem}
        onRefreshFromRecipe={(item) => {
          setItemFormOpen(false)
          setEditingItem(null)
          handleOpenRefreshDialog(item)
        }}
      />

      {/* Delete Item Dialog */}
      <Dialog open={!!deleteItemDialog} onOpenChange={() => setDeleteItemDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this item from the meal plan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Dialog */}
      <Dialog open={deletePlanDialog} onOpenChange={setDeletePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Meal Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{plan.name}&rdquo;? This will also delete all items.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePlanDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePlan} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Recipe to Plan Dialog */}
      <AddRecipeToPlan
        open={addRecipeOpen}
        onOpenChange={setAddRecipeOpen}
        onAdd={async (item) => {
          const result = await addMealItem(id, item)
          if (result) {
            setPlan((prev) => prev ? {
              ...prev,
              meal_items: [...prev.meal_items, result].sort((a, b) => a.sort_order - b.sort_order)
            } : null)
          }
        }}
      />

      {/* Refresh-from-recipe diff dialog (Phase 1) */}
      <RefreshFromRecipeDialog
        open={!!refreshDialogItem}
        onOpenChange={(open) => {
          if (!open) {
            setRefreshDialogItem(null)
            setRefreshDialogRecipe(null)
            setRefreshDialogError(null)
          }
        }}
        mealItem={refreshDialogItem}
        recipe={refreshDialogRecipe}
        loadingRecipe={refreshDialogLoading}
        errorRecipe={refreshDialogError}
        onConfirm={handleConfirmRefresh}
      />

      {/* Push-to-recipe diff dialog (Phase 2) */}
      <PushToRecipeDialog
        open={!!pushDialogItem}
        onOpenChange={(open) => {
          if (!open) {
            setPushDialogItem(null)
            setPushDialogRecipe(null)
            setPushDialogError(null)
          }
        }}
        mealItem={pushDialogItem}
        recipe={pushDialogRecipe}
        loadingRecipe={pushDialogLoading}
        errorRecipe={pushDialogError}
        onConfirm={handleConfirmPush}
        onPullFirst={() => {
          if (pushDialogItem) {
            const item = pushDialogItem
            setPushDialogItem(null)
            setPushDialogRecipe(null)
            handleOpenRefreshDialog(item)
          }
        }}
      />

      {/* Unified recipe sheet (opens from both item card clicks and timeline event clicks) */}
      <PlannerRecipeSheet
        open={!!recipeSheetItem}
        onOpenChange={(open) => {
          if (!open) {
            setRecipeSheetItem(null)
            setRecipeSheetEventType(null)
          }
        }}
        mealItem={recipeSheetItem}
        eventType={recipeSheetEventType}
        checkedIngredients={recipeSheetItem ? getItemCheckState(recipeSheetItem.id).checkedIngredients : undefined}
        onToggleIngredient={recipeSheetItem ? (index: number) => toggleItemIngredient(recipeSheetItem.id, index) : undefined}
        completedSteps={recipeSheetItem ? getItemCheckState(recipeSheetItem.id).completedSteps : undefined}
        onToggleStep={recipeSheetItem ? (index: number) => toggleItemStep(recipeSheetItem.id, index) : undefined}
      />
    </div>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}
