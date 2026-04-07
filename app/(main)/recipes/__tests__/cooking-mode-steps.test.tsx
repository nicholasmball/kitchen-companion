import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RecipeDetailPage from '../[id]/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-recipe-id' }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock hooks
const mockRecipe = {
  id: 'test-recipe-id',
  title: 'Test Recipe',
  description: 'A test recipe',
  instructions: 'Preheat the oven to 180°C.\nChop the onions.\n\nMix the ingredients together.\nBake for 30 minutes.',
  ingredients: [
    { amount: '1', unit: 'tbsp', item: 'olive oil', notes: '' },
    { amount: '2', unit: 'none', item: 'onions', notes: 'diced' },
    { amount: '500', unit: 'g', item: 'flour', notes: '' },
  ],
  servings: 4,
  is_favourite: false,
  cook_time_minutes: 30,
  prep_time_minutes: 10,
  rest_time_minutes: 0,
  total_time_minutes: 40,
  difficulty: 'easy',
  cuisine: 'British',
  course: 'main',
  tags: [],
  source_name: null,
  source_url: null,
  image_url: null,
  user_id: 'user-1',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

vi.mock('@/hooks/use-recipes', () => ({
  useRecipes: () => ({
    getRecipe: vi.fn().mockResolvedValue(mockRecipe),
    deleteRecipe: vi.fn(),
    toggleFavourite: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-meal-plan', () => ({
  useMealPlans: () => ({
    createMealPlan: vi.fn(),
    addMealItem: vi.fn(),
    setAsActive: vi.fn(),
  }),
}))

vi.mock('@/components/planner/add-to-plan-dialog', () => ({
  AddToPlanDialog: () => null,
}))

// Note: jsdom does not apply CSS media queries or Tailwind classes.
// Both mobile and desktop views render in the DOM simultaneously.
// We use getAllByLabelText and take the first match to avoid duplicates.

function getStep(label: string) {
  return screen.getAllByLabelText(label)[0]
}

function getIngredient(label: string) {
  return screen.getAllByLabelText(label)[0]
}

describe('Cooking Mode Step Checkboxes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function enterCookingMode() {
    render(<RecipeDetailPage />)
    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)
  }

  it('shows checkboxes for non-empty instruction lines in cooking mode', async () => {
    await enterCookingMode()

    // 4 step checkboxes rendered (duplicated in mobile + desktop = 8)
    expect(screen.getAllByLabelText(/^Step \d+:/).length).toBeGreaterThanOrEqual(4)

    expect(getStep('Step 1: Preheat the oven to 180°C.')).toBeDefined()
    expect(getStep('Step 2: Chop the onions.')).toBeDefined()
    expect(getStep('Step 3: Mix the ingredients together.')).toBeDefined()
    expect(getStep('Step 4: Bake for 30 minutes.')).toBeDefined()
  })

  it('does not show checkboxes outside of cooking mode', async () => {
    render(<RecipeDetailPage />)
    await screen.findByText('Test Recipe')

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('shows progress counter', async () => {
    await enterCookingMode()

    // Both mobile and desktop show this text
    expect(screen.getAllByText('0 of 4 steps done').length).toBeGreaterThanOrEqual(1)
  })

  it('toggles step completion on click', async () => {
    await enterCookingMode()

    const step = getStep('Step 1: Preheat the oven to 180°C.')
    expect(step.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(step)
    expect(step.getAttribute('aria-checked')).toBe('true')
    expect(screen.getAllByText('1 of 4 steps done').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(step)
    expect(step.getAttribute('aria-checked')).toBe('false')
    expect(screen.getAllByText('0 of 4 steps done').length).toBeGreaterThanOrEqual(1)
  })

  it('shows "All steps done!" when all steps are completed', async () => {
    await enterCookingMode()

    // Click all steps (use getAllBy to get both mobile+desktop, click first of each)
    fireEvent.click(getStep('Step 1: Preheat the oven to 180°C.'))
    fireEvent.click(getStep('Step 2: Chop the onions.'))
    fireEvent.click(getStep('Step 3: Mix the ingredients together.'))
    fireEvent.click(getStep('Step 4: Bake for 30 minutes.'))

    expect(screen.getAllByText('All steps done!').length).toBeGreaterThanOrEqual(1)
  })

  it('supports keyboard activation with Enter', async () => {
    await enterCookingMode()

    const step = getStep('Step 1: Preheat the oven to 180°C.')
    fireEvent.keyDown(step, { key: 'Enter' })

    expect(step.getAttribute('aria-checked')).toBe('true')
    expect(screen.getAllByText('1 of 4 steps done').length).toBeGreaterThanOrEqual(1)
  })

  it('supports keyboard activation with Space', async () => {
    await enterCookingMode()

    const step = getStep('Step 1: Preheat the oven to 180°C.')
    fireEvent.keyDown(step, { key: ' ' })

    expect(step.getAttribute('aria-checked')).toBe('true')
  })

  it('has correct aria-label on each step', async () => {
    await enterCookingMode()

    expect(getStep('Step 1: Preheat the oven to 180°C.')).toBeDefined()
    expect(getStep('Step 2: Chop the onions.')).toBeDefined()
    expect(getStep('Step 3: Mix the ingredients together.')).toBeDefined()
    expect(getStep('Step 4: Bake for 30 minutes.')).toBeDefined()
  })

  it('resets completed steps when exiting cooking mode', async () => {
    await enterCookingMode()

    const step = getStep('Step 1: Preheat the oven to 180°C.')
    fireEvent.click(step)
    expect(screen.getAllByText('1 of 4 steps done').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getByText('Exit'))

    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)

    expect(screen.getAllByText('0 of 4 steps done').length).toBeGreaterThanOrEqual(1)
    expect(getStep('Step 1: Preheat the oven to 180°C.').getAttribute('aria-checked')).toBe('false')
  })

  it('filters out blank lines from step count', async () => {
    await enterCookingMode()

    // Instructions have 5 lines but only 4 non-empty ones
    expect(screen.getAllByText('0 of 4 steps done').length).toBeGreaterThanOrEqual(1)
  })
})

describe('Cooking Mode Ingredient Checkboxes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function enterCookingMode() {
    render(<RecipeDetailPage />)
    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)
  }

  it('shows ingredient checkboxes in cooking mode', async () => {
    await enterCookingMode()

    // Desktop ingredients always visible; mobile needs expanding
    // Both render in jsdom, so we can find them
    expect(getIngredient('1 tbsp olive oil')).toBeDefined()
    expect(getIngredient('2 onions')).toBeDefined()
    expect(getIngredient('500 g flour')).toBeDefined()
  })

  it('toggles ingredient checked state on click', async () => {
    await enterCookingMode()

    const ing = getIngredient('1 tbsp olive oil')
    expect(ing.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(ing)
    expect(ing.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(ing)
    expect(ing.getAttribute('aria-checked')).toBe('false')
  })

  it('shows ingredient progress counter', async () => {
    await enterCookingMode()

    expect(screen.getAllByText('0 of 3 ingredients used').length).toBeGreaterThanOrEqual(1)
  })

  it('updates ingredient progress when checking ingredients', async () => {
    await enterCookingMode()

    fireEvent.click(getIngredient('1 tbsp olive oil'))
    expect(screen.getAllByText('1 of 3 ingredients used').length).toBeGreaterThanOrEqual(1)
  })

  it('shows "All ingredients used!" when all are checked', async () => {
    await enterCookingMode()

    fireEvent.click(getIngredient('1 tbsp olive oil'))
    fireEvent.click(getIngredient('2 onions'))
    fireEvent.click(getIngredient('500 g flour'))

    expect(screen.getAllByText('All ingredients used!').length).toBeGreaterThanOrEqual(1)
  })

  it('supports keyboard activation on ingredients', async () => {
    await enterCookingMode()

    const ing = getIngredient('1 tbsp olive oil')
    fireEvent.keyDown(ing, { key: 'Enter' })
    expect(ing.getAttribute('aria-checked')).toBe('true')

    fireEvent.keyDown(ing, { key: ' ' })
    expect(ing.getAttribute('aria-checked')).toBe('false')
  })

  it('resets checked ingredients when exiting cooking mode', async () => {
    await enterCookingMode()

    fireEvent.click(getIngredient('1 tbsp olive oil'))
    expect(getIngredient('1 tbsp olive oil').getAttribute('aria-checked')).toBe('true')

    fireEvent.click(screen.getByText('Exit'))

    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)

    expect(getIngredient('1 tbsp olive oil').getAttribute('aria-checked')).toBe('false')
  })
})

describe('Cooking Mode Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the cooking mode banner with exit button', async () => {
    render(<RecipeDetailPage />)
    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)

    // "Cooking Mode" text in banner
    expect(screen.getByText('Cooking Mode')).toBeDefined()
    expect(screen.getByText('Exit')).toBeDefined()
  })

  it('renders recipe title in cooking mode', async () => {
    render(<RecipeDetailPage />)
    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)

    expect(screen.getByText('Test Recipe')).toBeDefined()
  })

  it('renders timer button in cooking mode', async () => {
    render(<RecipeDetailPage />)
    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)

    expect(screen.getByText('Timer')).toBeDefined()
  })

  it('renders mobile collapsible ingredients toggle', async () => {
    render(<RecipeDetailPage />)
    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)

    expect(screen.getByText(/0\/3 used/)).toBeDefined()
  })

  it('exits cooking mode and returns to normal view', async () => {
    render(<RecipeDetailPage />)
    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)

    fireEvent.click(screen.getByText('Exit'))

    await screen.findByText('Cooking Mode')
    expect(screen.queryByText('0 of 4 steps done')).toBeNull()
  })
})
