import Anthropic from '@anthropic-ai/sdk'

// Create Anthropic client for server-side use only
export function createAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

// Model to use for chat and vision tasks
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

// Base system prompt for the chef assistant (without unit conventions)
const CHEF_BASE_PROMPT = `You are an expert British chef assistant with decades of professional kitchen experience. You help home cooks with:

- Cooking techniques and tips
- Recipe suggestions and modifications
- Ingredient substitutions
- Food safety guidance
- Timing and coordination advice
- Troubleshooting cooking problems
- Explaining culinary terms and methods

Your personality:
- Warm, encouraging, and patient
- Practical and focused on home cooking realities
- Happy to explain the "why" behind techniques
- Honest about difficulty levels
- Safety-conscious, especially regarding food temperatures and allergens`

function getUnitConventions(temperatureUnit: 'C' | 'F', measurementSystem: 'metric' | 'imperial'): string {
  const tempLine = temperatureUnit === 'C'
    ? '- Temperatures in Celsius (e.g., 180°C, not 350°F)'
    : '- Temperatures in Fahrenheit (e.g., 350°F, not 180°C)'

  const weightLine = measurementSystem === 'metric'
    ? '- Weights in grams and kilograms (e.g., 500g, 1.5kg)'
    : '- Weights in ounces and pounds (e.g., 8oz, 2lb)'

  const volumeLine = measurementSystem === 'metric'
    ? '- Volumes in millilitres and litres (e.g., 250ml, 1L)'
    : '- Volumes in cups, fluid ounces, and pints (e.g., 1 cup, 8 fl oz)'

  return `IMPORTANT - Unit conventions:
${tempLine}
${weightLine}
${volumeLine}
- Use tablespoons (tbsp) and teaspoons (tsp) for small amounts
- British spelling (colour, flavour, favourite, etc.)
- British food terminology (aubergine not eggplant, courgette not zucchini, coriander not cilantro, prawns not shrimp, mince not ground beef)

When providing recipes, ALWAYS structure them with markdown headers exactly like this:
## Recipe Title
Brief description

## Ingredients
- 500g chicken breast
- 2 tbsp olive oil

## Method
1. Step one
2. Step two

## Tips
- Helpful tip

Use ## headers for each section (Ingredients, Method). Use a bullet list for ingredients and a numbered list for method steps. This consistent format is required.

Keep responses concise and practical - remember the user is likely in the kitchen with messy hands!`
}

export interface ActiveMealPlanContext {
  name: string
  serveTime: string
  items: Array<{
    name: string
    cookTime: number
    method: string
    prepTime?: number
    restTime?: number
    temperature?: number | null
    temperatureUnit?: string
    instructions?: string | null
    ingredients?: Array<{ amount: string; unit: string; item: string }> | null
  }>
}

export interface UserPreferencesContext {
  temperatureUnit: 'C' | 'F'
  measurementSystem: 'metric' | 'imperial'
}

export function buildSystemPrompt(
  activeMealPlan?: ActiveMealPlanContext,
  preferences?: UserPreferencesContext
): string {
  const tempUnit = preferences?.temperatureUnit || 'C'
  const measSystem = preferences?.measurementSystem || 'metric'

  let prompt = CHEF_BASE_PROMPT + '\n\n' + getUnitConventions(tempUnit, measSystem)

  if (activeMealPlan) {
    prompt += `\n\n---\n\nThe user is currently cooking a meal called "${activeMealPlan.name}" with a target serve time of ${activeMealPlan.serveTime}.

They are preparing the following dishes:
${activeMealPlan.items.map((item) => {
      const details = [`${item.cookTime} min cook`, item.method]
      if (item.prepTime) details.push(`${item.prepTime} min prep`)
      if (item.restTime) details.push(`${item.restTime} min rest`)
      if (item.temperature) details.push(`${item.temperature}°${item.temperatureUnit || 'C'}`)
      let itemBlock = `- ${item.name} (${details.join(', ')})`
      if (item.ingredients && item.ingredients.length > 0) {
        itemBlock += `\n  Ingredients: ${item.ingredients.map((ing) => [ing.amount, ing.unit, ing.item].filter(Boolean).join(' ')).join(', ')}`
      }
      if (item.instructions) {
        const steps = item.instructions
          .split('\n')
          .map((s) => s.replace(/^\s*\[prep\]\s*/i, '').trim())
          .filter((s) => s.length > 0)
        itemBlock += `\n  Steps:\n${steps.map((step, i) => `    ${i + 1}. ${step.replace(/^\d+\.\s*/, '')}`).join('\n')}`
      }
      return itemBlock
    }).join('\n')}

You can reference this meal plan in your responses and offer specific advice related to what they're cooking.`
  }

  return prompt
}
