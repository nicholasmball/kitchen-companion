import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatMessageBubble } from '../chat-message'
import type { ChatMessage } from '@/hooks/use-chat'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockAddMealItem = vi.fn()
let mockMealPlans: { id: string; name: string }[] = []
let mockActivePlan: { id: string; name: string } | null = null

vi.mock('@/hooks/use-meal-plan', () => ({
  useMealPlans: () => ({
    mealPlans: mockMealPlans,
    activePlan: mockActivePlan,
    addMealItem: mockAddMealItem,
    loading: false,
    error: null,
    fetchMealPlans: vi.fn(),
    fetchActivePlan: vi.fn(),
    getMealPlan: vi.fn(),
    createMealPlan: vi.fn(),
    updateMealPlan: vi.fn(),
    deleteMealPlan: vi.fn(),
    setAsActive: vi.fn(),
    deactivatePlan: vi.fn(),
    updateMealItem: vi.fn(),
    deleteMealItem: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-recipes', () => ({
  useRecipes: () => ({
    recipes: [],
    loading: false,
    error: null,
    fetchRecipes: vi.fn(),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    toggleFavourite: vi.fn(),
    getRecipe: vi.fn(),
  }),
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span data-testid="mock-img">{alt}</span>,
}))

// AddToPlanDialog is rendered always but only opens when prop says so. We mock
// its render to a simple span so we can assert it was given the right props.
vi.mock('@/components/planner/add-to-plan-dialog', () => ({
  AddToPlanDialog: ({ open, recipe }: { open: boolean; recipe: { title: string; forceCreateMode?: boolean } }) =>
    open ? (
      <div data-testid="picker" data-force-create={String(!!recipe.forceCreateMode)}>
        Picker for {recipe.title}
      </div>
    ) : null,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────

function makeRecipeMessage(): ChatMessage {
  return {
    id: 'm-1',
    role: 'assistant',
    content: `## Chicken Stir-fry

## Ingredients
- 400g chicken thigh
- 2 tbsp soy sauce

## Method
1. Heat the wok.
2. Stir-fry until cooked through.`,
    timestamp: new Date(),
  }
}

function makeNonRecipeMessage(): ChatMessage {
  return {
    id: 'm-2',
    role: 'assistant',
    content: 'Looks like a lovely day for cooking!',
    timestamp: new Date(),
  }
}

function makeUserMessage(): ChatMessage {
  return { id: 'm-3', role: 'user', content: 'Hi', timestamp: new Date() }
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('ChatMessageBubble · Add to plan button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMealPlans = []
    mockActivePlan = null
  })

  it('does NOT show buttons on a user message', () => {
    render(<ChatMessageBubble message={makeUserMessage()} />)
    expect(screen.queryByText('Save to Recipes')).not.toBeInTheDocument()
    expect(screen.queryByText(/Add to/)).not.toBeInTheDocument()
  })

  it('does NOT show buttons on a non-recipe assistant message', () => {
    render(<ChatMessageBubble message={makeNonRecipeMessage()} />)
    expect(screen.queryByText('Save to Recipes')).not.toBeInTheDocument()
    expect(screen.queryByText(/Add to/)).not.toBeInTheDocument()
  })

  it('does NOT show buttons while assistant is still streaming', () => {
    render(<ChatMessageBubble message={makeRecipeMessage()} isStreaming />)
    expect(screen.queryByText('Save to Recipes')).not.toBeInTheDocument()
  })

  it('shows BOTH buttons on a completed assistant recipe message', () => {
    render(<ChatMessageBubble message={makeRecipeMessage()} />)
    expect(screen.getByText('Save to Recipes')).toBeInTheDocument()
    expect(screen.getByText('Add to plan…')).toBeInTheDocument()
  })

  it('button label reflects the active plan name (truncated)', () => {
    mockActivePlan = { id: 'p-1', name: 'Sunday Roast' }
    mockMealPlans = [mockActivePlan]
    render(<ChatMessageBubble message={makeRecipeMessage()} />)
    expect(screen.getByText('Add to "Sunday Roast"')).toBeInTheDocument()
  })

  it('truncates very long plan names in the label', () => {
    mockActivePlan = {
      id: 'p-1',
      name: 'A really long Sunday roast plan with everyone over',
    }
    mockMealPlans = [mockActivePlan]
    render(<ChatMessageBubble message={makeRecipeMessage()} />)
    // 22-char truncation + ellipsis + closing quote
    const button = screen.getByRole('button', { name: /Sunday roast plan with/i })
    expect(button.textContent).toMatch(/…/)
  })

  it('one-tap path calls addMealItem with the parsed recipe payload when there is an active plan', async () => {
    mockActivePlan = { id: 'plan-active', name: 'Tonight' }
    mockMealPlans = [mockActivePlan]
    mockAddMealItem.mockResolvedValueOnce({ id: 'mi-new' })
    render(<ChatMessageBubble message={makeRecipeMessage()} />)
    fireEvent.click(screen.getByText('Add to "Tonight"'))
    await waitFor(() => expect(mockAddMealItem).toHaveBeenCalled())
    const [planId, payload] = mockAddMealItem.mock.calls[0]
    expect(planId).toBe('plan-active')
    expect(payload).toMatchObject({
      name: 'Chicken Stir-fry',
      cooking_method: 'oven',
      notes: 'From chef chat',
      recipe_id: null,
      recipe_snapshot_at: null,
    })
    // Ingredients passed through from parsed recipe
    expect(payload.ingredients).toBeTruthy()
    expect(payload.ingredients.length).toBeGreaterThan(0)
  })

  it('opens the picker when there is no active plan', () => {
    mockMealPlans = [{ id: 'p-1', name: 'Sunday Roast' }]
    mockActivePlan = null
    render(<ChatMessageBubble message={makeRecipeMessage()} />)
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Add to plan…'))
    expect(screen.getByTestId('picker')).toBeInTheDocument()
    expect(screen.getByTestId('picker').dataset.forceCreate).toBe('false')
  })

  it('opens the picker in forceCreateMode when there are no plans at all', () => {
    mockMealPlans = []
    mockActivePlan = null
    render(<ChatMessageBubble message={makeRecipeMessage()} />)
    fireEvent.click(screen.getByText('Add to plan…'))
    expect(screen.getByTestId('picker')).toBeInTheDocument()
    expect(screen.getByTestId('picker').dataset.forceCreate).toBe('true')
  })
})
