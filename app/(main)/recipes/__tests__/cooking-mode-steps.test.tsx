import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

describe('Cooking Mode Step Checkboxes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function enterCookingMode() {
    render(<RecipeDetailPage />)
    // Wait for recipe to load
    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)
  }

  it('shows checkboxes for non-empty instruction lines in cooking mode', async () => {
    await enterCookingMode()

    // The recipe has 4 non-empty lines (1 blank line is filtered out)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4)
  })

  it('does not show checkboxes outside of cooking mode', async () => {
    render(<RecipeDetailPage />)
    await screen.findByText('Test Recipe')

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('shows progress counter', async () => {
    await enterCookingMode()

    expect(screen.getByText('0 of 4 steps done')).toBeDefined()
  })

  it('toggles step completion on click', async () => {
    await enterCookingMode()

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('false')

    // Click to complete
    fireEvent.click(checkboxes[0])
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('1 of 4 steps done')).toBeDefined()

    // Click again to uncomplete (toggle)
    fireEvent.click(checkboxes[0])
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText('0 of 4 steps done')).toBeDefined()
  })

  it('shows "All steps done!" when all steps are completed', async () => {
    await enterCookingMode()

    const checkboxes = screen.getAllByRole('checkbox')
    for (const checkbox of checkboxes) {
      fireEvent.click(checkbox)
    }

    expect(screen.getByText('All steps done!')).toBeDefined()
  })

  it('supports keyboard activation with Enter', async () => {
    await enterCookingMode()

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.keyDown(checkboxes[0], { key: 'Enter' })

    expect(checkboxes[0].getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('1 of 4 steps done')).toBeDefined()
  })

  it('supports keyboard activation with Space', async () => {
    await enterCookingMode()

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.keyDown(checkboxes[0], { key: ' ' })

    expect(checkboxes[0].getAttribute('aria-checked')).toBe('true')
  })

  it('has correct aria-label on each step', async () => {
    await enterCookingMode()

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].getAttribute('aria-label')).toBe('Step 1: Preheat the oven to 180°C.')
    expect(checkboxes[1].getAttribute('aria-label')).toBe('Step 2: Chop the onions.')
    expect(checkboxes[2].getAttribute('aria-label')).toBe('Step 3: Mix the ingredients together.')
    expect(checkboxes[3].getAttribute('aria-label')).toBe('Step 4: Bake for 30 minutes.')
  })

  it('resets completed steps when exiting cooking mode', async () => {
    await enterCookingMode()

    // Complete a step
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(screen.getByText('1 of 4 steps done')).toBeDefined()

    // Exit cooking mode
    fireEvent.click(screen.getByText('Exit'))

    // Re-enter cooking mode
    const cookingModeBtn = await screen.findByText('Cooking Mode')
    fireEvent.click(cookingModeBtn)

    // Progress should be reset
    expect(screen.getByText('0 of 4 steps done')).toBeDefined()
    const newCheckboxes = screen.getAllByRole('checkbox')
    expect(newCheckboxes[0].getAttribute('aria-checked')).toBe('false')
  })

  it('filters out blank lines from step count', async () => {
    await enterCookingMode()

    // Instructions have 5 lines but only 4 non-empty ones
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4)
    expect(screen.getByText('0 of 4 steps done')).toBeDefined()
  })
})
