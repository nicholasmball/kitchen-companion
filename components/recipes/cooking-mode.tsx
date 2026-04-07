'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Recipe } from '@/types'

interface CookingModeProps {
  recipe: Recipe
  servings: number
  onServingsChange: (servings: number) => void
  completedSteps: Set<number>
  onToggleStep: (index: number) => void
  checkedIngredients: Set<number>
  onToggleIngredient: (index: number) => void
  onExit: () => void
  onStartTimer: () => void
  scaleAmount: (amount: string) => string
}

export function CookingMode({
  recipe,
  servings,
  onServingsChange,
  completedSteps,
  onToggleStep,
  checkedIngredients,
  onToggleIngredient,
  onExit,
  onStartTimer,
  scaleAmount,
}: CookingModeProps) {
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false)

  const steps = recipe.instructions
    ? recipe.instructions.split('\n').filter(line => line.trim())
    : []

  const ingredients = recipe.ingredients || []
  const checkedCount = checkedIngredients.size
  const totalIngredients = ingredients.length

  // Find the first uncompleted step for active highlight
  const activeStepIndex = steps.findIndex((_, i) => !completedSteps.has(i))

  const toggleIngredientsPanel = useCallback(() => {
    setIngredientsExpanded(prev => !prev)
  }, [])

  return (
    <div className="text-lg">
      {/* Cooking Mode Banner */}
      <div className="bg-primary text-primary-foreground p-4 rounded-2xl flex items-center justify-between sticky top-16 z-10 shadow-warm-lg">
        <div className="flex items-center gap-2">
          <ChefHatIcon className="h-5 w-5" />
          <span className="font-medium">Cooking Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onStartTimer}
          >
            <PlayIcon className="h-4 w-4 mr-1" />
            Timer
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onExit}
          >
            Exit
          </Button>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-4 px-1">
        {recipe.title}
      </h1>

      {/* Mobile: Collapsible ingredients bar */}
      <div className="md:hidden sticky top-[7.5rem] z-[5]">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={ingredientsExpanded}
          aria-controls="mobile-ingredients-panel"
          onClick={toggleIngredientsPanel}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggleIngredientsPanel()
            }
          }}
          className="bg-card border-b border-border px-4 py-3 flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="font-bold text-base">Ingredients</span>
            <span className="text-sm text-muted-foreground ml-2">
              {checkedCount}/{totalIngredients} used
            </span>
          </div>
          <ChevronIcon className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", ingredientsExpanded && "rotate-180")} />
        </div>

        {ingredientsExpanded && (
          <div
            id="mobile-ingredients-panel"
            role="region"
            aria-label="Ingredients list"
            className="bg-card border-b border-border px-4 pb-4 max-h-[50vh] overflow-y-auto"
          >
            {/* Servings adjuster */}
            <ServingsAdjuster
              servings={servings}
              onServingsChange={onServingsChange}
            />

            {/* Ingredient list */}
            <IngredientList
              ingredients={ingredients}
              checkedIngredients={checkedIngredients}
              onToggleIngredient={onToggleIngredient}
              scaleAmount={scaleAmount}
            />
          </div>
        )}
      </div>

      {/* Desktop: Split layout */}
      <div className="hidden md:flex h-[calc(100vh-14rem)] gap-0">
        {/* Left: Ingredients (sticky) */}
        <div className="w-[35%] min-w-[280px] border-r border-border bg-card/50 overflow-y-auto flex-shrink-0 p-4 rounded-l-xl">
          <h2 className="text-lg font-bold mb-3">Ingredients</h2>

          <ServingsAdjuster
            servings={servings}
            onServingsChange={onServingsChange}
          />

          <p className="text-sm text-muted-foreground mb-2">
            {checkedCount === totalIngredients
              ? 'All ingredients used!'
              : `${checkedCount} of ${totalIngredients} ingredients used`
            }
          </p>

          <IngredientList
            ingredients={ingredients}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={onToggleIngredient}
            scaleAmount={scaleAmount}
          />
        </div>

        {/* Right: Instructions (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 scroll-smooth rounded-r-xl">
          <h2 className="text-lg font-bold mb-3">Instructions</h2>

          <StepProgress
            completedCount={completedSteps.size}
            totalSteps={steps.length}
          />

          <StepList
            steps={steps}
            completedSteps={completedSteps}
            onToggleStep={onToggleStep}
            activeStepIndex={activeStepIndex}
          />
        </div>
      </div>

      {/* Mobile: Instructions below */}
      <div className="md:hidden px-1 mt-4">
        <h2 className="text-lg font-bold mb-3">Instructions</h2>

        <StepProgress
          completedCount={completedSteps.size}
          totalSteps={steps.length}
        />

        <StepList
          steps={steps}
          completedSteps={completedSteps}
          onToggleStep={onToggleStep}
          activeStepIndex={activeStepIndex}
        />
      </div>
    </div>
  )
}

// ---- Sub-components ----

function ServingsAdjuster({
  servings,
  onServingsChange,
}: {
  servings: number
  onServingsChange: (n: number) => void
}) {
  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2 mb-3">
      <span className="font-semibold text-sm">Servings</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onServingsChange(Math.max(1, servings - 1))}
          disabled={servings <= 1}
          className="h-8 w-8 rounded-lg border-2 border-border bg-background flex items-center justify-center font-bold text-sm disabled:opacity-40"
          aria-label="Decrease servings"
        >
          &minus;
        </button>
        <span className="w-6 text-center font-bold text-sm">{servings}</span>
        <button
          onClick={() => onServingsChange(servings + 1)}
          className="h-8 w-8 rounded-lg border-2 border-border bg-background flex items-center justify-center font-bold text-sm"
          aria-label="Increase servings"
        >
          +
        </button>
      </div>
    </div>
  )
}

function IngredientList({
  ingredients,
  checkedIngredients,
  onToggleIngredient,
  scaleAmount,
}: {
  ingredients: Recipe['ingredients']
  checkedIngredients: Set<number>
  onToggleIngredient: (index: number) => void
  scaleAmount: (amount: string) => string
}) {
  if (!ingredients || ingredients.length === 0) return null

  return (
    <div className="space-y-0">
      {ingredients.map((ing, i) => {
        const isChecked = checkedIngredients.has(i)
        return (
          <div
            key={i}
            role="checkbox"
            aria-checked={isChecked}
            aria-label={`${scaleAmount(ing.amount)} ${ing.unit !== 'none' ? ing.unit : ''} ${ing.item}`.trim()}
            tabIndex={0}
            onClick={() => onToggleIngredient(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggleIngredient(i)
              }
            }}
            className={cn(
              "flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-all duration-200 border-b border-border last:border-0",
              "hover:bg-muted/30 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isChecked && "bg-muted/20"
            )}
          >
            {/* Checkbox */}
            <div className={cn(
              "shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
              isChecked
                ? "bg-[#40916C] border-[#40916C]"
                : "border-muted-foreground/40"
            )}>
              {isChecked && <CheckIcon className="h-3 w-3 text-white" />}
            </div>

            {/* Amount */}
            <span className={cn(
              "font-semibold min-w-[4rem] text-base flex-shrink-0 transition-all duration-200",
              isChecked && "opacity-45"
            )}>
              {scaleAmount(ing.amount)} {ing.unit !== 'none' ? ing.unit : ''}
            </span>

            {/* Item name */}
            <span className={cn(
              "text-base transition-all duration-200",
              isChecked && "line-through opacity-45"
            )}>
              {ing.item}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StepProgress({
  completedCount,
  totalSteps,
}: {
  completedCount: number
  totalSteps: number
}) {
  if (totalSteps === 0) return null

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className={cn(
          completedCount === totalSteps
            ? "text-primary font-medium"
            : "text-muted-foreground"
        )}>
          {completedCount === totalSteps
            ? "All steps done!"
            : `${completedCount} of ${totalSteps} steps done`
          }
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(completedCount / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  )
}

function StepList({
  steps,
  completedSteps,
  onToggleStep,
  activeStepIndex,
}: {
  steps: string[]
  completedSteps: Set<number>
  onToggleStep: (index: number) => void
  activeStepIndex: number
}) {
  return (
    <div className="space-y-1">
      {steps.map((line, i) => {
        const isCompleted = completedSteps.has(i)
        const isActive = i === activeStepIndex
        return (
          <div
            key={i}
            role="checkbox"
            aria-checked={isCompleted}
            aria-label={`Step ${i + 1}: ${line.trim()}`}
            tabIndex={0}
            onClick={() => onToggleStep(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggleStep(i)
              }
            }}
            className={cn(
              "flex items-start gap-3 py-3 px-3 rounded-xl cursor-pointer transition-all duration-200 border-b border-muted last:border-0",
              "active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isCompleted && "bg-muted/30",
              isActive && !isCompleted && "bg-primary/5 border-l-[3px] border-l-primary ml-[-3px]"
            )}
          >
            {/* Checkbox indicator */}
            <div className={cn(
              "shrink-0 mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
              isCompleted
                ? "bg-primary border-primary"
                : "border-muted-foreground/40"
            )}>
              {isCompleted && <CheckIcon className="h-3.5 w-3.5 text-primary-foreground" />}
            </div>
            {/* Step content */}
            <div>
              <div className={cn(
                "text-xs font-bold mb-0.5",
                isActive && !isCompleted ? "text-primary" : "text-muted-foreground"
              )}>
                Step {i + 1}
              </div>
              <span className={cn(
                "text-xl leading-relaxed transition-all duration-200",
                isCompleted && "opacity-50 line-through"
              )}>
                {line}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Icons ----

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3-5.108 8.25 8.25 0 0 1 3.362.72Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}
