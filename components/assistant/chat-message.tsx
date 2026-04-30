'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { toast as sonnerToast } from 'sonner'
import { toastSuccess, toastError } from '@/lib/toast'
import { containsRecipe, parseRecipeFromContent } from '@/lib/recipe-parser'
import { Button } from '@/components/ui/button'
import { useRecipes } from '@/hooks/use-recipes'
import { useMealPlans } from '@/hooks/use-meal-plan'
import { AddToPlanDialog } from '@/components/planner/add-to-plan-dialog'
import type { ChatMessage } from '@/hooks/use-chat'

interface ChatMessageProps {
  message: ChatMessage
  isStreaming?: boolean
}

export function ChatMessageBubble({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const router = useRouter()
  const { createRecipe } = useRecipes()
  const { mealPlans, activePlan, addMealItem } = useMealPlans()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [addingToPlan, setAddingToPlan] = useState(false)
  const [addedToPlan, setAddedToPlan] = useState(false)
  const [planPickerOpen, setPlanPickerOpen] = useState(false)

  const showSaveButton = !isUser && !isStreaming && containsRecipe(message.content)
  const showAddToPlanButton = showSaveButton

  const handleSaveRecipe = async () => {
    setSaving(true)
    try {
      const parsed = parseRecipeFromContent(message.content)
      const result = await createRecipe({
        title: parsed.title,
        description: parsed.description || null,
        ingredients: parsed.ingredients,
        instructions: parsed.instructions || null,
        prep_time_minutes: parsed.prep_time_minutes,
        cook_time_minutes: parsed.cook_time_minutes,
        servings: parsed.servings || 4,
      })
      if (result) {
        setSaved(true)
        toastSuccess('Recipe saved!', 'Opening editor to refine details...')
        // Navigate to edit page so user can refine the recipe
        router.push(`/recipes/${result.id}/edit`)
      }
    } catch (err) {
      console.error('Failed to save recipe:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddToActivePlan = async () => {
    if (!activePlan) return
    setAddingToPlan(true)
    try {
      const parsed = parseRecipeFromContent(message.content)
      const item = await addMealItem(activePlan.id, {
        name: parsed.title,
        cook_time_minutes: parsed.cook_time_minutes || 30,
        prep_time_minutes: parsed.prep_time_minutes || 0,
        rest_time_minutes: 0,
        cooking_method: 'oven',
        instructions: parsed.instructions || null,
        notes: 'From chef chat',
        recipe_id: null,
        ingredients: parsed.ingredients?.length ? parsed.ingredients : null,
        recipe_snapshot_at: null,
      })
      if (item) {
        setAddedToPlan(true)
        sonnerToast(`Added to "${activePlan.name}"`, {
          action: {
            label: 'View plan',
            onClick: () => router.push(`/planner/${activePlan.id}`),
          },
        })
      } else {
        toastError("Couldn't add to plan", 'Try again?')
      }
    } catch (err) {
      console.error('Failed to add to plan:', err)
      toastError("Couldn't add to plan", 'Try again?')
    } finally {
      setAddingToPlan(false)
    }
  }

  const handleAddToPlanClick = () => {
    if (activePlan) {
      handleAddToActivePlan()
    } else {
      setPlanPickerOpen(true)
    }
  }

  const parsedForPicker = showAddToPlanButton ? parseRecipeFromContent(message.content) : null

  const truncate = (s: string, max = 22) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)
  const addToPlanLabel = activePlan
    ? `Add to "${truncate(activePlan.name)}"`
    : 'Add to plan…'
  const addToPlanAriaLabel = activePlan
    ? `Add this recipe to your active plan "${activePlan.name}"`
    : 'Add this recipe to a meal plan'

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 shadow-[0_2px_8px_rgba(139,90,43,0.08)]',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-secondary rounded-bl-md'
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-secondary shadow-warm shrink-0">
              <Image
                src="/images/branding/mascot.png"
                alt="Chef"
                width={24}
                height={24}
                className="object-cover object-top"
              />
            </div>
            <span className="text-xs font-medium text-primary">Cat&apos;s Kitchen</span>
          </div>
        )}
        <div className={cn(
          'text-sm whitespace-pre-wrap',
          isStreaming && !message.content && 'animate-pulse'
        )}>
          {message.content || (isStreaming ? 'Thinking...' : '')}
          {isStreaming && message.content && (
            <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
          )}
        </div>

        {/* Action buttons row — Save to Recipes + Add to plan */}
        {(showSaveButton && !saved) || (showAddToPlanButton && !addedToPlan) ? (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            {showSaveButton && !saved && (
              <Button
                size="default"
                variant="default"
                className="shadow-warm"
                onClick={handleSaveRecipe}
                disabled={saving}
              >
                <BookmarkIcon className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save to Recipes'}
              </Button>
            )}
            {showAddToPlanButton && !addedToPlan && (
              <Button
                size="default"
                variant="default"
                className="shadow-warm max-w-full"
                onClick={handleAddToPlanClick}
                disabled={addingToPlan}
                aria-label={addToPlanAriaLabel}
                title={activePlan?.name}
              >
                <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">{addingToPlan ? 'Adding…' : addToPlanLabel}</span>
              </Button>
            )}
          </div>
        ) : null}
        {saved && (
          <p className="text-xs text-[#6B8E5E] mt-2 flex items-center gap-1">
            <CheckIcon className="h-3 w-3" />
            Saved! Opening editor...
          </p>
        )}
        {addedToPlan && (
          <p className="text-xs text-[#6B8E5E] mt-2 flex items-center gap-1">
            <CheckIcon className="h-3 w-3" />
            Added to plan!
          </p>
        )}

        {/* Plan picker (opens when no active plan) */}
        {parsedForPicker && (
          <AddToPlanDialog
            open={planPickerOpen}
            onOpenChange={setPlanPickerOpen}
            recipe={{
              title: parsedForPicker.title,
              cook_time_minutes: parsedForPicker.cook_time_minutes ?? null,
              prep_time_minutes: parsedForPicker.prep_time_minutes ?? null,
              rest_time_minutes: null,
              instructions: parsedForPicker.instructions || null,
              ingredients: parsedForPicker.ingredients?.length ? parsedForPicker.ingredients : null,
              notes: 'From chef chat',
              forceCreateMode: mealPlans.length === 0,
            }}
            onSuccess={(planId) => {
              setAddedToPlan(true)
              const planName = mealPlans.find((p) => p.id === planId)?.name || 'plan'
              sonnerToast(`Added to "${planName}"`, {
                action: {
                  label: 'View plan',
                  onClick: () => router.push(`/planner/${planId}`),
                },
              })
            }}
          />
        )}

        <div className={cn(
          'text-[10px] mt-1',
          isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

function ChefIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3-5.108 8.25 8.25 0 0 1 3.362.72Z" />
    </svg>
  )
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}
