'use client'

import { useState, useEffect } from 'react'
import { useMealPlans } from '@/hooks/use-meal-plan'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RecipeData {
  title: string
  cook_time_minutes?: number | null
  prep_time_minutes?: number | null
  instructions?: string | null
}

interface AddToPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: RecipeData
  onSuccess?: (planId: string) => void
}

export function AddToPlanDialog({ open, onOpenChange, recipe, onSuccess }: AddToPlanDialogProps) {
  const { mealPlans, loading, fetchMealPlans, createMealPlan, addMealItem } = useMealPlans({ initialFetch: false })
  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [newPlanName, setNewPlanName] = useState('')
  const [serveTime, setServeTime] = useState(() => {
    const now = new Date()
    now.setHours(now.getHours() + 2)
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
    return now.toISOString().slice(0, 16)
  })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (open) {
      fetchMealPlans()
    }
  }, [open, fetchMealPlans])

  const handleAdd = async () => {
    setAdding(true)

    try {
      let planId = selectedPlanId

      // Create new plan if needed
      if (mode === 'create' || !planId) {
        const plan = await createMealPlan({
          name: newPlanName || 'New Meal Plan',
          serve_time: new Date(serveTime).toISOString(),
        })
        if (!plan) {
          setAdding(false)
          return
        }
        planId = plan.id
      }

      // Add recipe as meal item
      await addMealItem(planId, {
        name: recipe.title,
        cook_time_minutes: recipe.cook_time_minutes || 30,
        prep_time_minutes: recipe.prep_time_minutes || 0,
        rest_time_minutes: 0,
        cooking_method: 'oven',
        instructions: recipe.instructions || null,
        notes: null,
      })

      onOpenChange(false)
      onSuccess?.(planId)
    } catch (err) {
      console.error('Failed to add to plan:', err)
    } finally {
      setAdding(false)
    }
  }

  const handleClose = () => {
    setMode('select')
    setSelectedPlanId(null)
    setNewPlanName('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Meal Plan</DialogTitle>
          <DialogDescription>
            Add &ldquo;{recipe.title}&rdquo; to an existing plan or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Existing plans */}
          {mealPlans.length > 0 && mode === 'select' && (
            <div className="space-y-2">
              <Label>Select a plan</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {mealPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-colors ${
                      selectedPlanId === plan.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          {plan.serve_time && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(plan.serve_time).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {plan.is_active && <Badge>Active</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Create new option */}
          {mode === 'select' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMode('create')}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Plan
            </Button>
          )}

          {/* New plan form */}
          {mode === 'create' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="planName">Plan Name</Label>
                <Input
                  id="planName"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="e.g., Sunday Roast"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serveTime">Serve Time</Label>
                <Input
                  id="serveTime"
                  type="datetime-local"
                  value={serveTime}
                  onChange={(e) => setServeTime(e.target.value)}
                />
              </div>
              {mealPlans.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('select')}
                >
                  ← Back to existing plans
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={adding || (mode === 'select' && !selectedPlanId)}
          >
            {adding ? 'Adding...' : 'Add to Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
