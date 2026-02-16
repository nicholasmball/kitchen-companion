// Recipe parsing utilities for extracting structured recipe data from chat messages

export interface ParsedIngredient {
  amount: string
  unit: string
  item: string
  notes: string
}

export interface ParsedRecipe {
  title: string
  description: string
  ingredients: ParsedIngredient[]
  instructions: string
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  servings: number | null
}

// Heuristic to detect if a message contains a recipe
export function containsRecipe(content: string): boolean {
  const lowerContent = content.toLowerCase()
  const hasIngredients = lowerContent.includes('ingredient') || lowerContent.includes('you will need') || lowerContent.includes('you\'ll need')
  const hasInstructions = lowerContent.includes('instruction') || lowerContent.includes('method') || lowerContent.includes('steps') || lowerContent.includes('directions')
  const hasRecipeStructure = (lowerContent.includes('serves') || lowerContent.includes('servings')) ||
                              (lowerContent.includes('prep') && lowerContent.includes('cook'))

  return hasIngredients && (hasInstructions || hasRecipeStructure)
}

// Try to extract recipe title from the message
export function extractRecipeTitle(content: string): string {
  // Look for common patterns like "# Recipe Name" or "**Recipe Name**" or "Recipe for X"
  const headerMatch = content.match(/^#+\s*(.+?)(?:\n|$)/m)
  if (headerMatch) return headerMatch[1].trim()

  const boldMatch = content.match(/\*\*(.+?)\*\*/)
  if (boldMatch && boldMatch[1].length < 60) return boldMatch[1].trim()

  const recipeForMatch = content.match(/recipe for (.+?)(?:\n|\.)/i)
  if (recipeForMatch) return recipeForMatch[1].trim()

  return 'Recipe from Chef'
}

// Flexible section header pattern that matches:
// ## Ingredients  |  ### Ingredients  |  **Ingredients:**  |  **Ingredients**  |  Ingredients:
const SECTION_HEADER = (names: string) =>
  `(?:#{1,3}\\s*(?:${names}):?\\s*\\n|\\*\\*(?:${names}):?\\*\\*:?\\s*\\n|(?:${names}):\\s*\\n)`

// Parse a recipe from chat message content
export function parseRecipeFromContent(content: string): ParsedRecipe {
  const title = extractRecipeTitle(content)

  const ingredientNames = 'ingredients|what you\'ll need|what you will need|you will need|you\'ll need'
  const methodNames = 'method|instructions|directions|steps|preparation|how to make it'
  const endSectionNames = 'tips|notes|variations|serving|to serve|nutrition'

  // Extract ingredients section - match header then capture until next section
  const ingredientsPattern = new RegExp(
    `${SECTION_HEADER(ingredientNames)}([\\s\\S]*?)(?=${SECTION_HEADER(methodNames)}|${SECTION_HEADER(endSectionNames)}|$)`,
    'i'
  )
  const ingredientsMatch = content.match(ingredientsPattern)
  const ingredientsSection = ingredientsMatch ? ingredientsMatch[ingredientsMatch.length - 1] : ''

  // Parse individual ingredients
  const ingredientLines = ingredientsSection.split('\n').filter(line =>
    line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().match(/^\d+\./)
  )
  const ingredients: ParsedIngredient[] = ingredientLines.map(line => {
    // Remove leading -, *, or number
    const cleaned = line.replace(/^[\s\-*]*/, '').replace(/^\d+\.\s*/, '').trim()

    // Try to parse amount and unit
    // Pattern: "800g chicken" or "2 tbsp oil" or "1 large onion"
    const amountMatch = cleaned.match(/^([\d½¼¾⅓⅔\/.\s]+)\s*(kg|ml|tbsp|tsp|cups?|oz|lb|cloves?|pieces?|tins?|large|medium|small|bunch(?:es)?|handful(?:s)?|pinch(?:es)?|slices?|rashers?|sprigs?|stalks?|heads?|cm|g|l)?\s*(.*)$/i)

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
  const methodPattern = new RegExp(
    `${SECTION_HEADER(methodNames)}([\\s\\S]*?)(?=${SECTION_HEADER(endSectionNames)}|$)`,
    'i'
  )
  const methodMatch = content.match(methodPattern)
  let instructions = methodMatch ? methodMatch[methodMatch.length - 1].trim() : ''

  // If no method section found, try to get everything after ingredients
  if (!instructions && ingredientsMatch) {
    const fullIngMatch = ingredientsMatch[0]
    const afterIngredients = content.substring(content.indexOf(fullIngMatch) + fullIngMatch.length)
    // Remove section headers and clean up
    instructions = afterIngredients
      .replace(new RegExp(SECTION_HEADER(methodNames), 'gi'), '')
      .trim()
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
  if (ingredientsMatch) {
    const beforeIngredients = content.substring(0, content.indexOf(ingredientsMatch[0]))
    if (beforeIngredients) {
      // Get the first paragraph after any title, stripping markdown
      const descLines = beforeIngredients.split('\n').filter(l => {
        const trimmed = l.trim()
        return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('**')
      })
      if (descLines.length > 0) {
        description = descLines[0].replace(/\*\*([^*]+)\*\*/g, '$1').trim()
      }
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
