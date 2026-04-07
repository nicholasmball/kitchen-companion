'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMealPlans } from '@/hooks/use-meal-plan'
import { useRecipes } from '@/hooks/use-recipes'
import { RecipeImporter } from '@/components/recipes/recipe-importer'
import { calculateTimeline } from '@/lib/timing-calculator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Recipe, MealItem, Ingredient } from '@/types'

interface WizardItem {
  id: string
  name: string
  cook_time_minutes: number
  prep_time_minutes: number
  rest_time_minutes: number
  cooking_method: string
  temperature: number | null
  temperature_unit: 'C' | 'F'
  instructions: string | null
  recipe_id: string | null
  ingredients: Ingredient[] | null
}

function generateId() {
  return `wizard-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function getDefaultServeDate() {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

function getDefaultServeTime() {
  return '18:00'
}

export function CreatePlanWizard() {
  const router = useRouter()
  const { createMealPlan, addMealItem, setAsActive } = useMealPlans({ initialFetch: false })
  const { recipes, loading: recipesLoading } = useRecipes()

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [planName, setPlanName] = useState('')
  const [serveDate, setServeDate] = useState(getDefaultServeDate)
  const [serveTime, setServeTime] = useState(getDefaultServeTime)
  const [items, setItems] = useState<WizardItem[]>([])
  const [creating, setCreating] = useState(false)

  // Step 2: search + custom item + importer
  const [search, setSearch] = useState('')
  const [customName, setCustomName] = useState('')
  const [customCookTime, setCustomCookTime] = useState('')
  const [customMethod, setCustomMethod] = useState('oven')
  const [importerOpen, setImporterOpen] = useState(false)

  // Recipe search filter
  const filteredRecipes = useMemo(() => {
    if (!recipes) return []
    const q = search.toLowerCase()
    if (!q) return recipes
    return recipes.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.cuisine && r.cuisine.toLowerCase().includes(q)) ||
      (r.course && r.course.toLowerCase().includes(q))
    )
  }, [recipes, search])

  // Check if a recipe is already added
  const addedRecipeIds = useMemo(() => new Set(items.filter(i => i.recipe_id).map(i => i.recipe_id!)), [items])

  const toggleRecipe = useCallback((recipe: Recipe) => {
    setItems(prev => {
      const existing = prev.find(i => i.recipe_id === recipe.id)
      if (existing) {
        return prev.filter(i => i.recipe_id !== recipe.id)
      }
      return [...prev, {
        id: generateId(),
        name: recipe.title,
        cook_time_minutes: recipe.cook_time_minutes || 30,
        prep_time_minutes: recipe.prep_time_minutes || 0,
        rest_time_minutes: recipe.rest_time_minutes || 0,
        cooking_method: 'oven',
        temperature: null,
        temperature_unit: 'C',
        instructions: recipe.instructions || null,
        recipe_id: recipe.id,
        ingredients: recipe.ingredients || null,
      }]
    })
  }, [])

  const addCustomItem = useCallback(() => {
    const name = customName.trim()
    const cookTime = parseInt(customCookTime) || 0
    if (!name || cookTime <= 0) return

    setItems(prev => [...prev, {
      id: generateId(),
      name,
      cook_time_minutes: cookTime,
      prep_time_minutes: 0,
      rest_time_minutes: 0,
      cooking_method: customMethod,
      temperature: null,
      temperature_unit: 'C',
      instructions: null,
      recipe_id: null,
      ingredients: null,
    }])
    setCustomName('')
    setCustomCookTime('')
    setCustomMethod('oven')
  }, [customName, customCookTime, customMethod])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleImportResult = useCallback((data: { title?: string; instructions?: string; ingredients?: Array<{ amount?: string; unit?: string; item: string; notes?: string }>; cook_time_minutes?: number; prep_time_minutes?: number; rest_time_minutes?: number }) => {
    if (!data.title) return
    setItems(prev => [...prev, {
      id: generateId(),
      name: data.title!,
      cook_time_minutes: data.cook_time_minutes || 30,
      prep_time_minutes: data.prep_time_minutes || 0,
      rest_time_minutes: data.rest_time_minutes || 0,
      cooking_method: 'oven',
      temperature: null,
      temperature_unit: 'C',
      instructions: data.instructions || null,
      recipe_id: null,
      ingredients: data.ingredients?.map(i => ({
        amount: i.amount || '',
        unit: i.unit || 'none',
        item: i.item,
        notes: i.notes || '',
      })) || null,
    }])
    setImporterOpen(false)
  }, [])

  // Timeline preview for Step 3
  const timelinePreview = useMemo(() => {
    if (items.length === 0) return []
    const serveDateTime = new Date(`${serveDate}T${serveTime}:00`)
    const mockItems = items.map(i => ({
      ...i,
      id: i.id,
      meal_plan_id: 'preview',
      notes: null,
      sort_order: 0,
      created_at: '',
    })) as MealItem[]
    return calculateTimeline(mockItems, serveDateTime)
  }, [items, serveDate, serveTime])

  const handleCreate = async () => {
    if (items.length === 0 || !planName.trim()) return
    setCreating(true)

    try {
      const serveDateTime = new Date(`${serveDate}T${serveTime}:00`)
      const plan = await createMealPlan({
        name: planName.trim(),
        description: null,
        serve_time: serveDateTime.toISOString(),
        is_active: true,
      })

      if (!plan) {
        setCreating(false)
        return
      }

      // Add all items
      for (const item of items) {
        await addMealItem(plan.id, {
          name: item.name,
          cook_time_minutes: item.cook_time_minutes,
          prep_time_minutes: item.prep_time_minutes,
          rest_time_minutes: item.rest_time_minutes,
          cooking_method: item.cooking_method,
          temperature: item.temperature,
          temperature_unit: item.temperature_unit,
          instructions: item.instructions,
          notes: null,
          recipe_id: item.recipe_id,
          ingredients: item.ingredients,
        })
      }

      await setAsActive(plan.id)
      router.push(`/planner/${plan.id}`)
    } catch (err) {
      console.error('Failed to create plan:', err)
      setCreating(false)
    }
  }

  const canProceedStep1 = planName.trim().length > 0
  const canProceedStep2 = items.length > 0

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">New Meal Plan</h1>
        <Button variant="ghost" size="icon" onClick={() => router.push('/planner')} aria-label="Cancel and return to planner">
          <XIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-0 mb-1">
        <StepDot num={1} currentStep={step} />
        <div className={cn("w-12 h-0.5", step > 1 ? "bg-[#40916C]" : "bg-border")} />
        <StepDot num={2} currentStep={step} />
        <div className={cn("w-12 h-0.5", step > 2 ? "bg-[#40916C]" : "bg-border")} />
        <StepDot num={3} currentStep={step} />
      </div>
      <div className="flex justify-center gap-14 mb-6">
        <span className={cn("text-xs", step === 1 ? "text-primary font-semibold" : "text-muted-foreground")}>Name & Time</span>
        <span className={cn("text-xs", step === 2 ? "text-primary font-semibold" : "text-muted-foreground")}>Add Dishes</span>
        <span className={cn("text-xs", step === 3 ? "text-primary font-semibold" : "text-muted-foreground")}>Review</span>
      </div>

      {/* Step Content */}
      {step === 1 && (
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label htmlFor="plan-name" className="block font-semibold text-sm mb-1">What are you making?</label>
            <Input
              id="plan-name"
              type="text"
              placeholder="e.g. Sunday Roast, Pasta Night, BBQ"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="text-lg py-3"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">Give your meal plan a name</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="serve-date" className="block font-semibold text-sm mb-1">Serve date</label>
              <Input
                id="serve-date"
                type="date"
                value={serveDate}
                onChange={(e) => setServeDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="serve-time" className="block font-semibold text-sm mb-1">Serve time</label>
              <Input
                id="serve-time"
                type="time"
                value={serveTime}
                onChange={(e) => setServeTime(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">We'll calculate when to start each dish so everything's ready by this time</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search your recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Recipe Grid (scrollable) */}
          {recipesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredRecipes.length > 0 ? (
            <>
              <div className="max-h-[50vh] md:max-h-[400px] overflow-y-auto border border-border rounded-xl p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredRecipes.map(recipe => {
                    const isAdded = addedRecipeIds.has(recipe.id)
                    return (
                      <button
                        key={recipe.id}
                        role="button"
                        aria-pressed={isAdded}
                        aria-label={isAdded ? `Remove ${recipe.title} from plan` : `Add ${recipe.title} to plan`}
                        onClick={() => toggleRecipe(recipe)}
                        className={cn(
                          "relative text-left border-2 rounded-xl overflow-hidden transition-all duration-150",
                          "hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isAdded ? "border-[#40916C]" : "border-border hover:border-primary"
                        )}
                      >
                        {isAdded && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#40916C] flex items-center justify-center z-10">
                            <CheckIcon className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                        <div className="h-20 bg-card flex items-center justify-center text-3xl">
                          {recipe.image_url ? (
                            <img src={recipe.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>🍽️</span>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="font-bold text-sm leading-tight line-clamp-1">{recipe.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {recipe.total_time_minutes ? `${recipe.total_time_minutes}m` : `${recipe.cook_time_minutes || 30}m`}
                            {recipe.cuisine && ` · ${recipe.cuisine}`}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              {filteredRecipes.length > 6 && (
                <p className="text-center text-xs text-muted-foreground -mt-2">Scroll to see all {filteredRecipes.length} recipes</p>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {search ? 'No recipes match your search' : 'No saved recipes yet. Import or add a custom item below!'}
            </div>
          )}

          {/* Import a new recipe */}
          <div className="bg-card rounded-xl p-3">
            <p className="font-bold text-sm mb-1">Import a new recipe</p>
            <p className="text-xs text-muted-foreground mb-2">Don't see what you need? Import a recipe and add it to your plan.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setImporterOpen(true)}
                className="flex-1 flex flex-col items-center gap-1 py-3 border-2 border-border rounded-xl bg-background hover:border-primary transition-all"
              >
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-semibold">From URL</span>
              </button>
              <button
                onClick={() => setImporterOpen(true)}
                className="flex-1 flex flex-col items-center gap-1 py-3 border-2 border-border rounded-xl bg-background hover:border-primary transition-all"
              >
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-semibold">From Image</span>
              </button>
              <button
                onClick={() => setImporterOpen(true)}
                className="flex-1 flex flex-col items-center gap-1 py-3 border-2 border-border rounded-xl bg-background hover:border-primary transition-all"
              >
                <CameraIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-semibold">Take Photo</span>
              </button>
            </div>
          </div>

          <RecipeImporter
            open={importerOpen}
            onOpenChange={setImporterOpen}
            onResult={handleImportResult}
          />

          {/* Custom Item Form */}
          <div className="bg-card rounded-xl p-3">
            <p className="font-bold text-sm mb-2">Or add a custom item</p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Item name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-[2]"
                aria-label="Custom item name"
              />
              <Input
                type="number"
                placeholder="Cook mins"
                value={customCookTime}
                onChange={(e) => setCustomCookTime(e.target.value)}
                className="flex-1"
                min="1"
                aria-label="Cook time in minutes"
              />
              <select
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-2 text-sm"
                aria-label="Cooking method"
              >
                <option value="oven">Oven</option>
                <option value="hob">Hob</option>
                <option value="grill">Grill</option>
                <option value="microwave">Microwave</option>
                <option value="air_fryer">Air Fryer</option>
                <option value="other">Other</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomItem}
                disabled={!customName.trim() || !customCookTime || parseInt(customCookTime) <= 0}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Your Dishes */}
          {items.length > 0 && (
            <div className="bg-card rounded-xl p-3">
              <p className="font-bold text-sm mb-2">Your Dishes ({items.length})</p>
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {item.prep_time_minutes > 0 && `${item.prep_time_minutes}m prep + `}
                      {item.cook_time_minutes}m cook
                    </span>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label={`Remove ${item.name}`}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">
            {planName} — Serving at {serveTime}
          </h2>

          <div className="md:flex md:gap-6">
            {/* Items list */}
            <div className="flex-1 space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div>
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.prep_time_minutes > 0 && `${item.prep_time_minutes}m prep · `}
                      {item.cook_time_minutes}m cook
                      {item.rest_time_minutes > 0 && ` · ${item.rest_time_minutes}m rest`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.cooking_method !== 'other' && (
                      <Badge variant="secondary" className="text-xs capitalize">{item.cooking_method}</Badge>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label={`Remove ${item.name}`}
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                + Add more dishes
              </Button>
            </div>

            {/* Mini Timeline */}
            {timelinePreview.length > 0 && (
              <div className="md:w-64 mt-4 md:mt-0">
                <div className="bg-card rounded-xl p-3">
                  <p className="font-bold text-sm mb-2">Timeline Preview</p>
                  <div className="space-y-1">
                    {timelinePreview.map(event => (
                      <div key={event.id} className="flex items-center gap-2 text-xs">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          event.type === 'prep_start' && "bg-[#3D8B8B]",
                          event.type === 'cook_start' && "bg-primary",
                          event.type === 'cook_end' && "bg-[#C9A962]",
                          event.type === 'rest_start' && "bg-[#C4897A]",
                          event.type === 'serve' && "bg-[#40916C]",
                        )} />
                        <span className="font-semibold min-w-[3.5rem]">
                          {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-muted-foreground truncate">{event.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-border">
        {step === 1 ? (
          <Button variant="ghost" onClick={() => router.push('/planner')}>Cancel</Button>
        ) : (
          <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2)}>
            &larr; Back
          </Button>
        )}

        {step === 1 && (
          <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
            Next: Add Dishes &rarr;
          </Button>
        )}
        {step === 2 && (
          <div className="flex items-center gap-2">
            {!canProceedStep2 && (
              <span className="text-xs text-muted-foreground">Add at least one dish</span>
            )}
            <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
              Next: Review &rarr;
            </Button>
          </div>
        )}
        {step === 3 && (
          <Button onClick={handleCreate} disabled={creating || items.length === 0}>
            {creating ? 'Creating...' : '🍽️ Create Plan'}
          </Button>
        )}
      </div>
    </div>
  )
}

function StepDot({ num, currentStep }: { num: number; currentStep: number }) {
  const isActive = num === currentStep
  const isCompleted = num < currentStep
  return (
    <div
      aria-current={isActive ? 'step' : undefined}
      aria-label={`Step ${num}`}
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2",
        isCompleted && "bg-[#40916C] border-[#40916C] text-white",
        isActive && "bg-primary border-primary text-white",
        !isActive && !isCompleted && "border-border text-muted-foreground bg-background"
      )}
    >
      {isCompleted ? <CheckIcon className="h-4 w-4" /> : num}
    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 0 3Z" />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
  )
}
