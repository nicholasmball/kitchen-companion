import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreatePlanWizard } from '../create-plan-wizard'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockCreateMealPlan = vi.fn()
const mockAddMealItem = vi.fn()
const mockSetAsActive = vi.fn()

vi.mock('@/hooks/use-meal-plan', () => ({
  useMealPlans: () => ({
    createMealPlan: mockCreateMealPlan,
    addMealItem: mockAddMealItem,
    setAsActive: mockSetAsActive,
  }),
}))

const mockRecipes = [
  {
    id: 'r1',
    title: 'Roast Chicken',
    description: 'A classic roast',
    instructions: 'Season and roast.',
    ingredients: [{ amount: '1', unit: 'whole', item: 'chicken', notes: '' }],
    servings: 4,
    is_favourite: false,
    cook_time_minutes: 90,
    prep_time_minutes: 15,
    rest_time_minutes: 10,
    total_time_minutes: 115,
    difficulty: 'medium',
    cuisine: 'British',
    course: 'main',
    tags: [],
    source_name: null,
    source_url: null,
    image_url: null,
    user_id: 'u1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'r2',
    title: 'Roast Potatoes',
    description: null,
    instructions: 'Parboil and roast.',
    ingredients: [{ amount: '1', unit: 'kg', item: 'potatoes', notes: '' }],
    servings: 4,
    is_favourite: true,
    cook_time_minutes: 45,
    prep_time_minutes: 10,
    rest_time_minutes: 0,
    total_time_minutes: 55,
    difficulty: 'easy',
    cuisine: 'British',
    course: 'side',
    tags: [],
    source_name: null,
    source_url: null,
    image_url: null,
    user_id: 'u1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

vi.mock('@/hooks/use-recipes', () => ({
  useRecipes: () => ({
    recipes: mockRecipes,
    loading: false,
  }),
}))

describe('CreatePlanWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Step 1 — Name & Time', () => {
    it('renders step 1 with name input and serve time', () => {
      render(<CreatePlanWizard />)

      expect(screen.getByLabelText('What are you making?')).toBeDefined()
      expect(screen.getByLabelText('Serve date')).toBeDefined()
      expect(screen.getByLabelText('Serve time')).toBeDefined()
    })

    it('disables Next button when name is empty', () => {
      render(<CreatePlanWizard />)

      const nextBtn = screen.getByText('Next: Add Dishes →')
      expect(nextBtn.hasAttribute('disabled')).toBe(true)
    })

    it('enables Next button when name is entered', () => {
      render(<CreatePlanWizard />)

      fireEvent.change(screen.getByLabelText('What are you making?'), { target: { value: 'Sunday Roast' } })

      const nextBtn = screen.getByText('Next: Add Dishes →')
      expect(nextBtn.hasAttribute('disabled')).toBe(false)
    })

    it('navigates to step 2 when clicking Next', () => {
      render(<CreatePlanWizard />)

      fireEvent.change(screen.getByLabelText('What are you making?'), { target: { value: 'Test' } })
      fireEvent.click(screen.getByText('Next: Add Dishes →'))

      expect(screen.getByPlaceholderText('Search your recipes...')).toBeDefined()
    })
  })

  describe('Step 2 — Add Dishes', () => {
    function goToStep2() {
      render(<CreatePlanWizard />)
      fireEvent.change(screen.getByLabelText('What are you making?'), { target: { value: 'Test Plan' } })
      fireEvent.click(screen.getByText('Next: Add Dishes →'))
    }

    it('shows recipe cards', () => {
      goToStep2()

      expect(screen.getByText('Roast Chicken')).toBeDefined()
      expect(screen.getByText('Roast Potatoes')).toBeDefined()
    })

    it('adds a recipe when clicking its card', () => {
      goToStep2()

      fireEvent.click(screen.getByLabelText('Add Roast Chicken to plan'))

      expect(screen.getByText('Your Dishes (1)')).toBeDefined()
    })

    it('removes a recipe when clicking its card again', () => {
      goToStep2()

      fireEvent.click(screen.getByLabelText('Add Roast Chicken to plan'))
      expect(screen.getByText('Your Dishes (1)')).toBeDefined()

      fireEvent.click(screen.getByLabelText('Remove Roast Chicken from plan'))
      expect(screen.queryByText('Your Dishes')).toBeNull()
    })

    it('filters recipes by search', () => {
      goToStep2()

      fireEvent.change(screen.getByPlaceholderText('Search your recipes...'), { target: { value: 'Potato' } })

      expect(screen.getByText('Roast Potatoes')).toBeDefined()
      expect(screen.queryByText('Roast Chicken')).toBeNull()
    })

    it('adds a custom item', () => {
      goToStep2()

      fireEvent.change(screen.getByLabelText('Custom item name'), { target: { value: 'Frozen Peas' } })
      fireEvent.change(screen.getByLabelText('Cook time in minutes'), { target: { value: '5' } })
      fireEvent.click(screen.getByText('Add'))

      expect(screen.getByText('Your Dishes (1)')).toBeDefined()
      expect(screen.getByText('Frozen Peas')).toBeDefined()
    })

    it('disables Next when no items added', () => {
      goToStep2()

      expect(screen.getByText('Add at least one dish')).toBeDefined()
      expect(screen.getByText('Next: Review →').hasAttribute('disabled')).toBe(true)
    })

    it('enables Next when items are added', () => {
      goToStep2()

      fireEvent.click(screen.getByLabelText('Add Roast Chicken to plan'))

      expect(screen.getByText('Next: Review →').hasAttribute('disabled')).toBe(false)
    })

    it('navigates back to step 1', () => {
      goToStep2()

      fireEvent.click(screen.getByText('← Back'))

      expect(screen.getByLabelText('What are you making?')).toBeDefined()
    })
  })

  describe('Step 3 — Review', () => {
    function goToStep3() {
      render(<CreatePlanWizard />)
      fireEvent.change(screen.getByLabelText('What are you making?'), { target: { value: 'Sunday Roast' } })
      fireEvent.click(screen.getByText('Next: Add Dishes →'))
      fireEvent.click(screen.getByLabelText('Add Roast Chicken to plan'))
      fireEvent.click(screen.getByLabelText('Add Roast Potatoes to plan'))
      fireEvent.click(screen.getByText('Next: Review →'))
    }

    it('shows review with items and timeline', () => {
      goToStep3()

      expect(screen.getByText(/Sunday Roast/)).toBeDefined()
      expect(screen.getByText('Roast Chicken')).toBeDefined()
      expect(screen.getByText('Roast Potatoes')).toBeDefined()
      expect(screen.getByText('Timeline Preview')).toBeDefined()
    })

    it('shows Create Plan button', () => {
      goToStep3()

      expect(screen.getByText(/Create Plan/)).toBeDefined()
    })

    it('can remove items from review', () => {
      goToStep3()

      fireEvent.click(screen.getByLabelText('Remove Roast Potatoes'))

      expect(screen.queryByText('Roast Potatoes')).toBeNull()
      expect(screen.getByText('Roast Chicken')).toBeDefined()
    })

    it('can go back to add more dishes', () => {
      goToStep3()

      fireEvent.click(screen.getByText('+ Add more dishes'))

      expect(screen.getByPlaceholderText('Search your recipes...')).toBeDefined()
    })

    it('creates plan on submit', async () => {
      mockCreateMealPlan.mockResolvedValue({ id: 'plan-123' })
      mockAddMealItem.mockResolvedValue({})
      mockSetAsActive.mockResolvedValue(undefined)

      goToStep3()

      fireEvent.click(screen.getByText(/Create Plan/))

      // Wait for all async operations to complete
      await vi.waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/planner/plan-123')
      })

      expect(mockCreateMealPlan).toHaveBeenCalledTimes(1)
      expect(mockCreateMealPlan).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Sunday Roast', is_active: true })
      )
      expect(mockAddMealItem).toHaveBeenCalledTimes(2)
      expect(mockSetAsActive).toHaveBeenCalledWith('plan-123')
    })
  })

  describe('Navigation', () => {
    it('shows step indicator with correct active state', () => {
      render(<CreatePlanWizard />)

      expect(screen.getByLabelText('Step 1').getAttribute('aria-current')).toBe('step')
    })

    it('cancel navigates back to planner', () => {
      render(<CreatePlanWizard />)

      fireEvent.click(screen.getByText('Cancel'))

      expect(mockPush).toHaveBeenCalledWith('/planner')
    })

    it('X button navigates back to planner', () => {
      render(<CreatePlanWizard />)

      fireEvent.click(screen.getByLabelText('Cancel and return to planner'))

      expect(mockPush).toHaveBeenCalledWith('/planner')
    })
  })
})
