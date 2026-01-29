'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRecipes } from '@/hooks/use-recipes'
import { useMealPlans } from '@/hooks/use-meal-plan'
import { AddToPlanDialog } from '@/components/planner/add-to-plan-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Recipe } from '@/types'

export default function RecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { getRecipe, deleteRecipe, toggleFavourite } = useRecipes({ initialFetch: false })
  const { createMealPlan, addMealItem, setAsActive } = useMealPlans({ initialFetch: false })

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [servings, setServings] = useState(4)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [startCookingOpen, setStartCookingOpen] = useState(false)
  const [startingCooking, setStartingCooking] = useState(false)
  const [addToPlanOpen, setAddToPlanOpen] = useState(false)
  const [cookingMode, setCookingMode] = useState(false)
  const [serveTime, setServeTime] = useState(() => {
    // Default to 1 hour from now, rounded to nearest 15 minutes
    const now = new Date()
    now.setHours(now.getHours() + 1)
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
    return now.toISOString().slice(0, 16)
  })

  useEffect(() => {
    async function fetchRecipe() {
      const data = await getRecipe(id)
      if (data) {
        setRecipe(data)
        setServings(data.servings)
      } else {
        setError('Recipe not found')
      }
      setLoading(false)
    }
    fetchRecipe()
  }, [id, getRecipe])

  // Keep screen awake in cooking mode using Wake Lock API
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null

    async function requestWakeLock() {
      if (cookingMode && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen')
        } catch (err) {
          console.log('Wake Lock not available:', err)
        }
      }
    }

    requestWakeLock()

    return () => {
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [cookingMode])

  const handleDelete = async () => {
    setDeleting(true)
    const success = await deleteRecipe(id)
    if (success) {
      router.push('/recipes')
    } else {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleToggleFavourite = useCallback(async () => {
    if (!recipe) return
    await toggleFavourite(id)
    setRecipe({ ...recipe, is_favourite: !recipe.is_favourite })
  }, [id, recipe, toggleFavourite])

  const scaleAmount = useCallback((amount: string) => {
    if (!recipe || !amount) return amount
    const num = parseFloat(amount)
    if (isNaN(num)) return amount
    const scaled = (num * servings) / recipe.servings
    // Format nicely
    if (scaled === Math.floor(scaled)) return scaled.toString()
    return scaled.toFixed(1).replace(/\.0$/, '')
  }, [recipe, servings])

  const handleStartCooking = async () => {
    if (!recipe) return
    setStartingCooking(true)

    try {
      // Create a meal plan from this recipe
      const plan = await createMealPlan({
        name: recipe.title,
        description: `Cooking ${recipe.title}`,
        serve_time: new Date(serveTime).toISOString(),
      })

      if (!plan) {
        setStartingCooking(false)
        return
      }

      // Add the recipe as a meal item
      await addMealItem(plan.id, {
        name: recipe.title,
        cook_time_minutes: recipe.cook_time_minutes || 30,
        prep_time_minutes: recipe.prep_time_minutes || 0,
        rest_time_minutes: recipe.rest_time_minutes || 0,
        cooking_method: 'oven',
        instructions: recipe.instructions || null,
        notes: null,
      })

      // Set as active
      await setAsActive(plan.id)

      // Navigate to the planner
      router.push(`/planner/${plan.id}`)
    } catch (err) {
      console.error('Failed to start cooking:', err)
      setStartingCooking(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error || 'Recipe not found'}</p>
        <Link href="/recipes">
          <Button>Back to Recipes</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className={cn(
      "max-w-3xl mx-auto space-y-6",
      cookingMode && "text-lg"
    )}>
      {/* Cooking Mode Banner */}
      {cookingMode && (
        <div className="bg-primary text-primary-foreground p-4 rounded-2xl flex items-center justify-between sticky top-16 z-10 shadow-warm-lg">
          <div className="flex items-center gap-2">
            <ChefHatIcon className="h-5 w-5" />
            <span className="font-medium">Cooking Mode</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCookingMode(false)}
          >
            Exit
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={cn(
              "font-bold",
              cookingMode ? "text-4xl" : "text-3xl"
            )}>
              {recipe.title}
            </h1>
            {recipe.description && !cookingMode && (
              <p className="text-muted-foreground mt-2">{recipe.description}</p>
            )}
          </div>
          {!cookingMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavourite}
              className="shrink-0"
            >
              <HeartIcon
                className={`h-6 w-6 ${recipe.is_favourite ? 'fill-[#C4897A] text-[#C4897A]' : ''}`}
              />
            </Button>
          )}
        </div>

        {/* Meta badges - hidden in cooking mode */}
        {!cookingMode && (
          <div className="flex flex-wrap gap-2">
            {recipe.total_time_minutes && (
              <Badge variant="secondary">
                <ClockIcon className="h-3 w-3 mr-1" />
                {recipe.total_time_minutes} min total
              </Badge>
            )}
            {recipe.prep_time_minutes && (
              <Badge variant="outline">{recipe.prep_time_minutes} min prep</Badge>
            )}
            {recipe.cook_time_minutes && (
              <Badge variant="outline">{recipe.cook_time_minutes} min cook</Badge>
            )}
            {recipe.rest_time_minutes && (
              <Badge variant="outline">{recipe.rest_time_minutes} min rest</Badge>
            )}
            {recipe.difficulty && (
              <Badge variant="secondary" className="capitalize">{recipe.difficulty}</Badge>
            )}
            {recipe.cuisine && <Badge variant="outline">{recipe.cuisine}</Badge>}
            {recipe.course && <Badge variant="outline" className="capitalize">{recipe.course}</Badge>}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {!cookingMode ? (
            <>
              <Button onClick={() => setCookingMode(true)}>
                <ChefHatIcon className="h-4 w-4 mr-2" />
                Cooking Mode
              </Button>
              <Button variant="outline" onClick={() => setStartCookingOpen(true)}>
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Timer
              </Button>
              <Button variant="outline" onClick={() => setAddToPlanOpen(true)}>
                <CalendarPlusIcon className="h-4 w-4 mr-2" />
                Add to Plan
              </Button>
              <Link href={`/recipes/${id}/edit`}>
                <Button variant="outline">
                  <EditIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setStartCookingOpen(true)}>
              <PlayIcon className="h-4 w-4 mr-2" />
              Start Timer
            </Button>
          )}
        </div>
      </div>

      {/* Servings adjuster */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Servings</span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setServings(Math.max(1, servings - 1))}
                disabled={servings <= 1}
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{servings}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setServings(servings + 1)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={cookingMode ? "text-2xl" : ""}>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className={cn("space-y-2", cookingMode && "space-y-3")}>
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className={cn(
                  "flex gap-2",
                  cookingMode && "text-xl py-1 border-b border-muted last:border-0"
                )}>
                  <span className={cn("font-medium", cookingMode ? "min-w-[5rem]" : "min-w-[4rem]")}>
                    {scaleAmount(ing.amount)} {ing.unit !== 'none' ? ing.unit : ''}
                  </span>
                  <span>
                    {ing.item}
                    {ing.notes && !cookingMode && (
                      <span className="text-muted-foreground"> ({ing.notes})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {recipe.instructions && (
        <Card>
          <CardHeader>
            <CardTitle className={cookingMode ? "text-2xl" : ""}>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "max-w-none",
              cookingMode ? "text-xl leading-relaxed space-y-4" : "prose prose-sm"
            )}>
              {recipe.instructions.split('\n').map((line, i) => (
                <p key={i} className={cn(
                  line.trim() ? '' : 'h-4',
                  cookingMode && line.trim() && "py-2 border-b border-muted last:border-0"
                )}>
                  {line}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Source */}
      {(recipe.source_name || recipe.source_url) && (
        <p className="text-sm text-muted-foreground">
          Source:{' '}
          {recipe.source_url ? (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {recipe.source_name || recipe.source_url}
            </a>
          ) : (
            recipe.source_name
          )}
        </p>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{recipe.title}&rdquo;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Plan Dialog */}
      {recipe && (
        <AddToPlanDialog
          open={addToPlanOpen}
          onOpenChange={setAddToPlanOpen}
          recipe={recipe}
          onSuccess={(planId) => {
            // Optionally navigate to the plan
            router.push(`/planner/${planId}`)
          }}
        />
      )}

      {/* Start Cooking Dialog */}
      <Dialog open={startCookingOpen} onOpenChange={setStartCookingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Cooking</DialogTitle>
            <DialogDescription>
              When do you want to serve this meal? We&apos;ll create a cooking timeline with notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serveTime">Serve Time</Label>
              <Input
                id="serveTime"
                type="datetime-local"
                value={serveTime}
                onChange={(e) => setServeTime(e.target.value)}
              />
            </div>
            {recipe.cook_time_minutes && (
              <p className="text-sm text-muted-foreground">
                This recipe takes {recipe.prep_time_minutes ? `${recipe.prep_time_minutes} min prep + ` : ''}
                {recipe.cook_time_minutes} min to cook
                {recipe.rest_time_minutes ? ` + ${recipe.rest_time_minutes} min rest` : ''}.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartCookingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartCooking} disabled={startingCooking}>
              {startingCooking ? 'Creating Plan...' : 'Let\'s Cook!'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  )
}

function CalendarPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
    </svg>
  )
}

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3-5.108 8.25 8.25 0 0 1 3.362.72Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  )
}
