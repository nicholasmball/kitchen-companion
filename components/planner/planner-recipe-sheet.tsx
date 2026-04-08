'use client'

import { useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { RecipeCookingView } from '@/components/shared/recipe-cooking-view'
import type { MealItem, TimelineEventType } from '@/types'

interface PlannerRecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealItem: MealItem | null
  eventType?: TimelineEventType | null
}

const METHOD_LABELS: Record<string, string> = {
  oven: 'Oven',
  hob: 'Hob',
  grill: 'Grill',
  microwave: 'Microwave',
  air_fryer: 'Air Fryer',
  slow_cooker: 'Slow Cooker',
  steamer: 'Steamer',
  bbq: 'BBQ',
  other: 'Other',
}

const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  prep_start: 'Prep',
  cook_start: 'Cook',
  cook_end: 'Done',
  rest_start: 'Rest',
  serve: 'Serve',
}

function getHighlightedStepIndex(
  instructions: string | null,
  eventType?: TimelineEventType | null
): number | undefined {
  if (!eventType || !instructions) return undefined

  const steps = instructions.split('\n').filter(line => line.trim())
  if (steps.length === 0) return undefined

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

export function PlannerRecipeSheet({
  open,
  onOpenChange,
  mealItem,
  eventType,
}: PlannerRecipeSheetProps) {
  const highlightedStepIndex = useMemo(
    () => getHighlightedStepIndex(mealItem?.instructions || null, eventType),
    [mealItem?.instructions, eventType]
  )

  if (!mealItem) return null

  const timeBadges: string[] = []
  if (mealItem.prep_time_minutes > 0) timeBadges.push(`${mealItem.prep_time_minutes}m prep`)
  timeBadges.push(`${mealItem.cook_time_minutes}m cook`)
  if (mealItem.rest_time_minutes > 0) timeBadges.push(`${mealItem.rest_time_minutes}m rest`)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-2xl">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg">{mealItem.name}</SheetTitle>
                {eventType && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                    {EVENT_TYPE_LABELS[eventType]}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {METHOD_LABELS[mealItem.cooking_method] || mealItem.cooking_method}
                </Badge>
                {mealItem.temperature && (
                  <Badge variant="outline" className="text-xs">
                    {mealItem.temperature}&deg;{mealItem.temperature_unit}
                  </Badge>
                )}
                {timeBadges.map(badge => (
                  <span key={badge} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-semibold">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </SheetHeader>

        <RecipeCookingView
          ingredients={mealItem.ingredients}
          instructions={mealItem.instructions}
          variant="sheet"
          highlightedStepIndex={highlightedStepIndex}
          recipeId={mealItem.recipe_id}
        />
      </SheetContent>
    </Sheet>
  )
}
