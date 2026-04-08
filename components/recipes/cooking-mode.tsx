'use client'

import { Button } from '@/components/ui/button'
import { RecipeCookingView } from '@/components/shared/recipe-cooking-view'
import type { Recipe } from '@/types'

interface CookingModeProps {
  recipe: Recipe
  servings: number
  onServingsChange: (servings: number) => void
  onExit: () => void
  onStartTimer: () => void
  scaleAmount: (amount: string) => string
}

export function CookingMode({
  recipe,
  servings,
  onServingsChange,
  onExit,
  onStartTimer,
  scaleAmount,
}: CookingModeProps) {
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

      {/* Shared cooking view */}
      <RecipeCookingView
        ingredients={recipe.ingredients}
        instructions={recipe.instructions}
        variant="page"
        showServings
        servings={servings}
        onServingsChange={onServingsChange}
        scaleAmount={scaleAmount}
      />
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
