'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useRecipes } from '@/hooks/use-recipes'
import type { ChatMessage } from '@/hooks/use-chat'

interface ChatMessageProps {
  message: ChatMessage
  isStreaming?: boolean
}

// Heuristic to detect if a message contains a recipe
function containsRecipe(content: string): boolean {
  const lowerContent = content.toLowerCase()
  // Check for common recipe indicators
  const hasIngredients = lowerContent.includes('ingredient') || lowerContent.includes('you will need') || lowerContent.includes('you\'ll need')
  const hasInstructions = lowerContent.includes('instruction') || lowerContent.includes('method') || lowerContent.includes('steps') || lowerContent.includes('directions')
  const hasRecipeStructure = (lowerContent.includes('serves') || lowerContent.includes('servings')) ||
                              (lowerContent.includes('prep') && lowerContent.includes('cook'))

  return hasIngredients && (hasInstructions || hasRecipeStructure)
}

// Try to extract recipe title from the message
function extractRecipeTitle(content: string): string {
  // Look for common patterns like "# Recipe Name" or "**Recipe Name**" or "Recipe for X"
  const headerMatch = content.match(/^#+\s*(.+?)(?:\n|$)/m)
  if (headerMatch) return headerMatch[1].trim()

  const boldMatch = content.match(/\*\*(.+?)\*\*/)
  if (boldMatch && boldMatch[1].length < 60) return boldMatch[1].trim()

  const recipeForMatch = content.match(/recipe for (.+?)(?:\n|\.)/i)
  if (recipeForMatch) return recipeForMatch[1].trim()

  return 'Recipe from Chef'
}

interface ParsedIngredient {
  amount: string
  unit: string
  item: string
  notes: string
}

interface ParsedRecipe {
  title: string
  description: string
  ingredients: ParsedIngredient[]
  instructions: string
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  servings: number | null
}

// Parse a recipe from chat message content
function parseRecipeFromContent(content: string): ParsedRecipe {
  const title = extractRecipeTitle(content)

  // Extract ingredients section
  const ingredientsMatch = content.match(/#{1,3}\s*ingredients:?\s*\n([\s\S]*?)(?=#{1,3}\s*(?:method|instructions|directions|steps)|$)/i)
  const ingredientsSection = ingredientsMatch ? ingredientsMatch[1] : ''

  // Parse individual ingredients
  const ingredientLines = ingredientsSection.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
  const ingredients: ParsedIngredient[] = ingredientLines.map(line => {
    // Remove leading - or number
    const cleaned = line.replace(/^[\s-]*/, '').replace(/^\d+\.\s*/, '').trim()

    // Try to parse amount and unit
    // Pattern: "800g chicken" or "2 tbsp oil" or "1 large onion"
    const amountMatch = cleaned.match(/^([\d½¼¾⅓⅔\/\s]+)\s*(g|kg|ml|l|tsp|tbsp|cup|cups|oz|lb|cloves?|pieces?|tin|tins|large|medium|small|cm)?\s*(.*)$/i)

    if (amountMatch) {
      const amount = amountMatch[1].trim()
      const unit = amountMatch[2] || ''
      const rest = amountMatch[3] || ''

      // Check for notes in parentheses
      const notesMatch = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
      if (notesMatch) {
        return {
          amount,
          unit: unit.toLowerCase(),
          item: notesMatch[1].trim(),
          notes: notesMatch[2].trim()
        }
      }

      // Check for notes after comma
      const commaMatch = rest.match(/^([^,]+),\s*(.+)$/)
      if (commaMatch) {
        return {
          amount,
          unit: unit.toLowerCase(),
          item: commaMatch[1].trim(),
          notes: commaMatch[2].trim()
        }
      }

      return {
        amount,
        unit: unit.toLowerCase(),
        item: rest.trim(),
        notes: ''
      }
    }

    // Fallback: just put the whole thing as the item
    return {
      amount: '',
      unit: '',
      item: cleaned,
      notes: ''
    }
  }).filter(ing => ing.item)

  // Extract instructions/method section
  const methodMatch = content.match(/#{1,3}\s*(?:method|instructions|directions|steps):?\s*\n([\s\S]*?)(?=#{1,3}\s*(?:tips|notes|variations)|$)/i)
  let instructions = methodMatch ? methodMatch[1].trim() : ''

  // If no method section found, try to get everything after ingredients
  if (!instructions && ingredientsMatch) {
    const afterIngredients = content.substring(content.indexOf(ingredientsMatch[0]) + ingredientsMatch[0].length)
    // Remove any remaining headers and clean up
    instructions = afterIngredients.replace(/#{1,3}\s*(?:method|instructions|directions|steps):?\s*/gi, '').trim()
  }

  // Clean up instructions - remove markdown formatting for cleaner display
  instructions = instructions
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .trim()

  // Try to extract times
  const prepMatch = content.match(/prep(?:aration)?(?:\s*time)?:?\s*(\d+)\s*(?:min|minutes)/i)
  const cookMatch = content.match(/cook(?:ing)?(?:\s*time)?:?\s*(\d+)\s*(?:min|minutes)/i)
  const servingsMatch = content.match(/serves:?\s*(\d+)|(\d+)\s*servings/i)

  // Extract description (text before ingredients section)
  let description = ''
  const beforeIngredients = content.split(/#{1,3}\s*ingredients/i)[0]
  if (beforeIngredients) {
    // Get the first paragraph after any title
    const descLines = beforeIngredients.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    if (descLines.length > 0) {
      description = descLines[0].trim()
    }
  }

  return {
    title,
    description,
    ingredients,
    instructions,
    prep_time_minutes: prepMatch ? parseInt(prepMatch[1]) : null,
    cook_time_minutes: cookMatch ? parseInt(cookMatch[1]) : null,
    servings: servingsMatch ? parseInt(servingsMatch[1] || servingsMatch[2]) : null
  }
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
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <ChefIcon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">Chef</span>
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
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
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
