'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TimelineEventType, Ingredient } from '@/types'

interface TimelineRecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealItemName: string
  eventType: TimelineEventType
  ingredients: Ingredient[] | null
  instructions: string | null
}

const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  prep_start: 'Prep',
  cook_start: 'Cook',
  cook_end: 'Done',
  rest_start: 'Rest',
  serve: 'Serve',
}

function getHighlightedStepIndex(
  steps: string[],
  eventType: TimelineEventType
): number {
  if (steps.length === 0) return -1

  switch (eventType) {
    case 'prep_start':
      return 0
    case 'cook_start': {
      const cookKeywords = /\b(oven|hob|heat|fry|bake|roast|grill|cook|boil|simmer|sear|sauté|saute)\b/i
      const idx = steps.findIndex(s => cookKeywords.test(s))
      return idx >= 0 ? idx : Math.floor(steps.length / 2)
    }
    case 'cook_end':
    case 'rest_start':
      return steps.length - 1
    default:
      return 0
  }
}

export function TimelineRecipeSheet({
  open,
  onOpenChange,
  mealItemName,
  eventType,
  ingredients,
  instructions,
}: TimelineRecipeSheetProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false)
  const highlightRef = useRef<HTMLDivElement>(null)

  const steps = instructions
    ? instructions.split('\n').filter(line => line.trim())
    : []

  const highlightedIndex = getHighlightedStepIndex(steps, eventType)

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setCheckedIngredients(new Set())
      setIngredientsExpanded(false)
    }
  }, [open])

  // Auto-scroll to highlighted step when sheet opens
  useEffect(() => {
    if (open && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [open, highlightedIndex])

  const toggleIngredient = useCallback((index: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const checkedCount = checkedIngredients.size
  const totalIngredients = ingredients?.length || 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] md:h-[75vh] p-0 rounded-t-2xl">
        <SheetHeader className="px-4 py-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{mealItemName}</SheetTitle>
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
              {EVENT_TYPE_LABELS[eventType]}
            </Badge>
          </div>
        </SheetHeader>

        {/* Mobile: Collapsible ingredients */}
        {ingredients && ingredients.length > 0 && (
          <div className="md:hidden border-b border-border">
            <button
              onClick={() => setIngredientsExpanded(prev => !prev)}
              aria-expanded={ingredientsExpanded}
              className="w-full px-4 py-2.5 flex items-center justify-between bg-card/50"
            >
              <div>
                <span className="font-bold text-sm">Ingredients</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {checkedCount}/{totalIngredients} used
                </span>
              </div>
              <ChevronIcon className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", ingredientsExpanded && "rotate-180")} />
            </button>
            {ingredientsExpanded && (
              <div className="px-4 pb-3 max-h-[40vh] overflow-y-auto">
                <IngredientList
                  ingredients={ingredients}
                  checkedIngredients={checkedIngredients}
                  onToggle={toggleIngredient}
                />
              </div>
            )}
          </div>
        )}

        {/* Desktop: Split layout */}
        <div className="hidden md:flex flex-1 overflow-hidden" style={{ height: 'calc(75vh - 4rem)' }}>
          {/* Left: Ingredients */}
          {ingredients && ingredients.length > 0 && (
            <div className="w-[35%] min-w-[220px] border-r border-border bg-card/50 overflow-y-auto p-4">
              <h3 className="text-sm font-bold mb-2">Ingredients</h3>
              <p className="text-xs text-muted-foreground mb-2">
                {checkedCount === totalIngredients
                  ? 'All ingredients used!'
                  : `${checkedCount} of ${totalIngredients} used`
                }
              </p>
              <IngredientList
                ingredients={ingredients}
                checkedIngredients={checkedIngredients}
                onToggle={toggleIngredient}
              />
            </div>
          )}

          {/* Right: Instructions */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-bold mb-2">Instructions</h3>
            <StepList
              steps={steps}
              highlightedIndex={highlightedIndex}
              highlightRef={highlightRef}
            />
          </div>
        </div>

        {/* Mobile: Instructions */}
        <div className="md:hidden flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-bold mb-2">Instructions</h3>
          <StepList
            steps={steps}
            highlightedIndex={highlightedIndex}
            highlightRef={highlightRef}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function IngredientList({
  ingredients,
  checkedIngredients,
  onToggle,
}: {
  ingredients: Ingredient[]
  checkedIngredients: Set<number>
  onToggle: (index: number) => void
}) {
  return (
    <div>
      {ingredients.map((ing, i) => {
        const isChecked = checkedIngredients.has(i)
        return (
          <div
            key={i}
            role="checkbox"
            aria-checked={isChecked}
            aria-label={`${ing.amount} ${ing.unit !== 'none' ? ing.unit : ''} ${ing.item}`.trim()}
            tabIndex={0}
            onClick={() => onToggle(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggle(i)
              }
            }}
            className={cn(
              "flex items-center gap-2 py-1.5 px-1.5 rounded-md cursor-pointer transition-all duration-200 border-b border-border last:border-0",
              "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isChecked && "bg-muted/20"
            )}
          >
            <div className={cn(
              "shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-200",
              isChecked
                ? "bg-[#40916C] border-[#40916C]"
                : "border-muted-foreground/40"
            )}>
              {isChecked && <CheckIcon className="h-2.5 w-2.5 text-white" />}
            </div>
            <span className={cn(
              "font-semibold text-sm min-w-[3.5rem] flex-shrink-0 transition-all duration-200",
              isChecked && "opacity-45"
            )}>
              {ing.amount} {ing.unit !== 'none' ? ing.unit : ''}
            </span>
            <span className={cn(
              "text-sm transition-all duration-200",
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

function StepList({
  steps,
  highlightedIndex,
  highlightRef,
}: {
  steps: string[]
  highlightedIndex: number
  highlightRef: React.RefObject<HTMLDivElement | null>
}) {
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground">No instructions available.</p>
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isHighlighted = i === highlightedIndex
        return (
          <div
            key={i}
            ref={isHighlighted ? highlightRef : undefined}
            aria-current={isHighlighted ? 'step' : undefined}
            className={cn(
              "flex items-start gap-2 py-2 px-2 rounded-lg border-b border-border last:border-0",
              isHighlighted && "bg-primary/5 border-l-[3px] border-l-primary ml-[-3px]"
            )}
          >
            <span className={cn(
              "text-xs font-bold min-w-[1.5rem] pt-0.5",
              isHighlighted ? "text-primary" : "text-muted-foreground"
            )}>
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed">{step}</span>
          </div>
        )
      })}
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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}
