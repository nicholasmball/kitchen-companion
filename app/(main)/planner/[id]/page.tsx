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
import { calculateTimeline } from '@/lib/timing-calculator'
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
import type { MealItem, MealPlanInsert, MealItemInsert } from '@/types'

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

  // Step completion state for all meal items (keyed by item ID)
  const [completedPlanSteps, setCompletedPlanSteps] = useState<Map<string, Set<number>>>(new Map())

  const togglePlanStep = useCallback((itemId: string, stepIndex: number) => {
    setCompletedPlanSteps(prev => {
      const next = new Map(prev)
      const itemSteps = new Set(prev.get(itemId) || [])
      if (itemSteps.has(stepIndex)) {
        itemSteps.delete(stepIndex)
      } else {
        itemSteps.add(stepIndex)
      }
      next.set(itemId, itemSteps)
      return next
    })
  }, [])

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
    }
    return result
  }, [editingItem, updateMealItem])

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
                  onEdit={(item) => {
                    setEditingItem(item)
                    setItemFormOpen(true)
                  }}
                  onDelete={(id) => setDeleteItemDialog(id)}
                  completedSteps={completedPlanSteps.get(item.id) || new Set()}
                  onToggleStep={(stepIndex) => togglePlanStep(item.id, stepIndex)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Timeline</h2>
          {serveTime ? (
            <TimelineView events={timeline} serveTime={serveTime} />
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
        open={itemFormOpen}
        onOpenChange={(open) => {
          setItemFormOpen(open)
          if (!open) setEditingItem(null)
        }}
        onSubmit={editingItem ? handleUpdateItem : handleAddItem}
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
