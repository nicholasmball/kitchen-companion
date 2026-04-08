'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Ingredient } from '@/types'

interface RecipeCookingViewProps {
  ingredients: Ingredient[] | null
  instructions: string | null
  variant: 'page' | 'sheet'
  showServings?: boolean
  servings?: number
  onServingsChange?: (servings: number) => void
  scaleAmount?: (amount: string) => string
  highlightedStepIndex?: number
  recipeId?: string | null
  // Controlled state (optional — when provided, component uses these instead of internal state)
  checkedIngredients?: Set<number>
  onToggleIngredient?: (index: number) => void
  completedSteps?: Set<number>
  onToggleStep?: (index: number) => void
}

export function RecipeCookingView({
  ingredients: rawIngredients,
  instructions,
  variant,
  showServings = false,
  servings,
  onServingsChange,
  scaleAmount,
  highlightedStepIndex,
  recipeId,
  checkedIngredients: controlledCheckedIngredients,
  onToggleIngredient: controlledToggleIngredient,
  completedSteps: controlledCompletedSteps,
  onToggleStep: controlledToggleStep,
}: RecipeCookingViewProps) {
  // Internal state (used when no controlled props provided)
  const [internalCheckedIngredients, setInternalCheckedIngredients] = useState<Set<number>>(new Set())
  const [internalCompletedSteps, setInternalCompletedSteps] = useState<Set<number>>(new Set())
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false)
  const highlightRef = useRef<HTMLDivElement>(null)

  // Use controlled state if provided, otherwise internal
  const checkedIngredients = controlledCheckedIngredients ?? internalCheckedIngredients
  const completedSteps = controlledCompletedSteps ?? internalCompletedSteps

  const ingredients = rawIngredients || []
  const steps = instructions
    ? instructions.split('\n').filter(line => line.trim())
    : []

  const checkedCount = checkedIngredients.size
  const totalIngredients = ingredients.length

  // Find the first uncompleted step for active highlight (when no explicit highlight)
  const activeStepIndex = highlightedStepIndex ?? steps.findIndex((_, i) => !completedSteps.has(i))

  const toggleIngredient = useCallback((index: number) => {
    if (controlledToggleIngredient) {
      controlledToggleIngredient(index)
    } else {
      setInternalCheckedIngredients(prev => {
        const next = new Set(prev)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        return next
      })
    }
  }, [controlledToggleIngredient])

  const toggleStep = useCallback((index: number) => {
    if (controlledToggleStep) {
      controlledToggleStep(index)
    } else {
      setInternalCompletedSteps(prev => {
        const next = new Set(prev)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        return next
      })
    }
  }, [controlledToggleStep])

  const toggleIngredientsPanel = useCallback(() => {
    setIngredientsExpanded(prev => !prev)
  }, [])

  // Auto-scroll to highlighted step
  useEffect(() => {
    if (highlightedStepIndex != null && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [highlightedStepIndex])

  const defaultScaleAmount = (amount: string) => amount

  const effectiveScaleAmount = scaleAmount || defaultScaleAmount

  const heightClass = variant === 'page'
    ? 'h-[calc(100vh-14rem)]'
    : 'h-[calc(75vh-4rem)]'

  return (
    <>
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
            {showServings && servings && onServingsChange && (
              <ServingsAdjuster servings={servings} onServingsChange={onServingsChange} />
            )}
            <IngredientList
              ingredients={ingredients}
              checkedIngredients={checkedIngredients}
              onToggleIngredient={toggleIngredient}
              scaleAmount={effectiveScaleAmount}
            />
            {recipeId && (
              <Link href={`/recipes/${recipeId}`} className="text-sm text-primary hover:underline font-medium mt-2 inline-flex items-center gap-1">
                View full recipe &rsaquo;
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Desktop: Split layout */}
      <div className={cn("hidden md:flex gap-0", heightClass)}>
        {/* Left: Ingredients */}
        <div className="w-[35%] min-w-[280px] border-r border-border bg-card/50 overflow-y-auto flex-shrink-0 p-4 rounded-l-xl">
          <h2 className="text-lg font-bold mb-3">Ingredients</h2>

          {showServings && servings && onServingsChange && (
            <ServingsAdjuster servings={servings} onServingsChange={onServingsChange} />
          )}

          <p className="text-sm text-muted-foreground mb-2">
            {checkedCount === totalIngredients
              ? 'All ingredients used!'
              : `${checkedCount} of ${totalIngredients} ingredients used`
            }
          </p>

          <IngredientList
            ingredients={ingredients}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={toggleIngredient}
            scaleAmount={effectiveScaleAmount}
          />

          {recipeId && (
            <Link href={`/recipes/${recipeId}`} className="text-sm text-primary hover:underline font-medium mt-3 inline-flex items-center gap-1">
              View full recipe &rsaquo;
            </Link>
          )}
        </div>

        {/* Right: Instructions */}
        <div className="flex-1 overflow-y-auto p-4 scroll-smooth rounded-r-xl">
          <h2 className="text-lg font-bold mb-3">Instructions</h2>

          <StepProgress
            completedCount={completedSteps.size}
            totalSteps={steps.length}
          />

          <StepList
            steps={steps}
            completedSteps={completedSteps}
            onToggleStep={toggleStep}
            activeStepIndex={activeStepIndex}
            highlightRef={highlightRef}
            highlightedStepIndex={highlightedStepIndex}
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
          onToggleStep={toggleStep}
          activeStepIndex={activeStepIndex}
          highlightRef={highlightRef}
          highlightedStepIndex={highlightedStepIndex}
        />
      </div>
    </>
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
  ingredients: Ingredient[]
  checkedIngredients: Set<number>
  onToggleIngredient: (index: number) => void
  scaleAmount: (amount: string) => string
}) {
  if (ingredients.length === 0) return null

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
            <div className={cn(
              "shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
              isChecked
                ? "bg-[#40916C] border-[#40916C]"
                : "border-muted-foreground/40"
            )}>
              {isChecked && <CheckIcon className="h-3 w-3 text-white" />}
            </div>
            <span className={cn(
              "font-semibold min-w-[4rem] text-base flex-shrink-0 transition-all duration-200",
              isChecked && "opacity-45"
            )}>
              {scaleAmount(ing.amount)} {ing.unit !== 'none' ? ing.unit : ''}
            </span>
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
  highlightRef,
  highlightedStepIndex,
}: {
  steps: string[]
  completedSteps: Set<number>
  onToggleStep: (index: number) => void
  activeStepIndex: number
  highlightRef: React.RefObject<HTMLDivElement | null>
  highlightedStepIndex?: number
}) {
  return (
    <div className="space-y-1">
      {steps.map((line, i) => {
        const isCompleted = completedSteps.has(i)
        const isActive = i === activeStepIndex
        const isHighlighted = highlightedStepIndex != null && i === highlightedStepIndex
        return (
          <div
            key={i}
            ref={isHighlighted ? highlightRef : undefined}
            role="checkbox"
            aria-checked={isCompleted}
            aria-label={`Step ${i + 1}: ${line.trim()}`}
            aria-current={isHighlighted ? 'step' : undefined}
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
              (isActive || isHighlighted) && !isCompleted && "bg-primary/5 border-l-[3px] border-l-primary ml-[-3px]"
            )}
          >
            <div className={cn(
              "shrink-0 mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
              isCompleted
                ? "bg-primary border-primary"
                : "border-muted-foreground/40"
            )}>
              {isCompleted && <CheckIcon className="h-3.5 w-3.5 text-primary-foreground" />}
            </div>
            <div>
              <div className={cn(
                "text-xs font-bold mb-0.5",
                (isActive || isHighlighted) && !isCompleted ? "text-primary" : "text-muted-foreground"
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
