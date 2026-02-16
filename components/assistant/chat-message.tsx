'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { toastSuccess } from '@/lib/toast'
import { containsRecipe, parseRecipeFromContent } from '@/lib/recipe-parser'
import { Button } from '@/components/ui/button'
import { useRecipes } from '@/hooks/use-recipes'
import type { ChatMessage } from '@/hooks/use-chat'

interface ChatMessageProps {
  message: ChatMessage
  isStreaming?: boolean
}

export function ChatMessageBubble({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const router = useRouter()
  const { createRecipe } = useRecipes()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const showSaveButton = !isUser && !isStreaming && containsRecipe(message.content)

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

        {/* Save Recipe Button */}
        {showSaveButton && !saved && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={handleSaveRecipe}
            disabled={saving}
          >
            <BookmarkIcon className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save to Recipes'}
          </Button>
        )}
        {saved && (
          <p className="text-xs text-[#6B8E5E] mt-2 flex items-center gap-1">
            <CheckIcon className="h-3 w-3" />
            Saved! Opening editor...
          </p>
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
