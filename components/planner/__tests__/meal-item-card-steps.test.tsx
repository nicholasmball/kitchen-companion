import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MealItemCard } from '../meal-item-card'
import type { MealItem } from '@/types'

const mockItem: MealItem = {
  id: 'item-1',
  meal_plan_id: 'plan-1',
  name: 'Roast Chicken',
  cook_time_minutes: 60,
  prep_time_minutes: 15,
  rest_time_minutes: 10,
  cooking_method: 'oven',
  temperature: 200,
  temperature_unit: 'C',
  instructions: 'Preheat the oven to 200°C.\nSeason the chicken.\n\nPlace in the oven.\nRest for 10 minutes.',
  notes: 'Use free-range chicken',
  sort_order: 0,
  created_at: '2024-01-01',
  recipe_id: null,
  ingredients: null,
}

const mockItemNoInstructions: MealItem = {
  ...mockItem,
  id: 'item-2',
  name: 'Side Salad',
  instructions: null,
}

const mockItemWithIngredients: MealItem = {
  ...mockItem,
  id: 'item-3',
  name: 'Pasta Carbonara',
  recipe_id: 'recipe-abc-123',
  ingredients: [
    { amount: '200', unit: 'g', item: 'spaghetti' },
    { amount: '100', unit: 'g', item: 'pancetta', notes: 'cubed' },
    { amount: '2', unit: '', item: 'eggs' },
    { amount: '50', unit: 'g', item: 'parmesan', notes: 'finely grated' },
  ],
}

describe('MealItemCard Step Checkboxes', () => {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const onToggleStep = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows progress bar on card when completedSteps is provided', () => {
    const { container } = render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set([0, 1])}
        onToggleStep={onToggleStep}
      />
    )

    // Progress bar should show 2/4
    expect(screen.getByText('2/4')).toBeDefined()
  })

  it('does not show progress bar when completedSteps is not provided', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    expect(screen.queryByText(/\/4/)).toBeNull()
    // Should show instructions preview instead
    expect(screen.getByText(/Preheat the oven/)).toBeDefined()
  })

  it('shows interactive checkboxes in the dialog when completedSteps and onToggleStep are provided', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set()}
        onToggleStep={onToggleStep}
      />
    )

    // Open the dialog
    fireEvent.click(screen.getByText('Roast Chicken'))

    // 4 non-empty instruction lines = 4 checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4)
  })

  it('filters out blank lines from instruction steps', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set()}
        onToggleStep={onToggleStep}
      />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    // Instructions have 5 lines but 1 is blank, so 4 checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4)
  })

  it('calls onToggleStep when a checkbox is clicked', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set()}
        onToggleStep={onToggleStep}
      />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    expect(onToggleStep).toHaveBeenCalledWith(0)
  })

  it('shows completed state for checked steps', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set([0, 2])}
        onToggleStep={onToggleStep}
      />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('true')
    expect(checkboxes[1].getAttribute('aria-checked')).toBe('false')
    expect(checkboxes[2].getAttribute('aria-checked')).toBe('true')
    expect(checkboxes[3].getAttribute('aria-checked')).toBe('false')
  })

  it('shows progress counter text in dialog', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set([0])}
        onToggleStep={onToggleStep}
      />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    expect(screen.getByText('1 of 4 steps done')).toBeDefined()
  })

  it('shows "All steps done!" when all steps are completed', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set([0, 1, 2, 3])}
        onToggleStep={onToggleStep}
      />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    expect(screen.getByText('All steps done!')).toBeDefined()
  })

  it('has correct aria-labels on checkboxes', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set()}
        onToggleStep={onToggleStep}
      />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0].getAttribute('aria-label')).toBe('Step 1: Preheat the oven to 200°C.')
    expect(checkboxes[1].getAttribute('aria-label')).toBe('Step 2: Season the chicken.')
    expect(checkboxes[2].getAttribute('aria-label')).toBe('Step 3: Place in the oven.')
    expect(checkboxes[3].getAttribute('aria-label')).toBe('Step 4: Rest for 10 minutes.')
  })

  it('supports keyboard activation with Enter and Space', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set()}
        onToggleStep={onToggleStep}
      />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    const checkboxes = screen.getAllByRole('checkbox')

    fireEvent.keyDown(checkboxes[0], { key: 'Enter' })
    expect(onToggleStep).toHaveBeenCalledWith(0)

    fireEvent.keyDown(checkboxes[1], { key: ' ' })
    expect(onToggleStep).toHaveBeenCalledWith(1)
  })

  it('shows static instructions when no completedSteps prop', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    // Should show static text, not checkboxes
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('handles items with no instructions gracefully', () => {
    render(
      <MealItemCard
        item={mockItemNoInstructions}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set()}
        onToggleStep={onToggleStep}
      />
    )

    // No progress bar on card (no steps)
    expect(screen.queryByText(/\/0/)).toBeNull()

    fireEvent.click(screen.getByText('Side Salad'))

    // No checkboxes in dialog
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('shows full progress on card badge when all steps done', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
        completedSteps={new Set([0, 1, 2, 3])}
        onToggleStep={onToggleStep}
      />
    )

    expect(screen.getByText('4/4')).toBeDefined()
  })

  it('shows ingredient count on card when item has ingredients', () => {
    render(
      <MealItemCard
        item={mockItemWithIngredients}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    expect(screen.getByText('4 ingredients')).toBeDefined()
  })

  it('does not show ingredient count when item has no ingredients', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    expect(screen.queryByText(/ingredient/)).toBeNull()
  })

  it('shows ingredients list in dialog when item has ingredients', () => {
    render(
      <MealItemCard
        item={mockItemWithIngredients}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByText('Pasta Carbonara'))

    expect(screen.getByText('Ingredients (4)')).toBeDefined()
    expect(screen.getByText('spaghetti')).toBeDefined()
    expect(screen.getByText('pancetta')).toBeDefined()
    expect(screen.getByText('200 g')).toBeDefined()
  })

  it('shows ingredient notes in dialog', () => {
    render(
      <MealItemCard
        item={mockItemWithIngredients}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByText('Pasta Carbonara'))

    expect(screen.getByText('(cubed)')).toBeDefined()
    expect(screen.getByText('(finely grated)')).toBeDefined()
  })

  it('shows "View full recipe" link when item has a recipe_id', () => {
    render(
      <MealItemCard
        item={mockItemWithIngredients}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByText('Pasta Carbonara'))

    const link = screen.getByText('View full recipe')
    expect(link).toBeDefined()
    expect(link.closest('a')?.getAttribute('href')).toBe('/recipes/recipe-abc-123')
  })

  it('does not show "View full recipe" link when item has no recipe_id', () => {
    render(
      <MealItemCard
        item={mockItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    expect(screen.queryByText('View full recipe')).toBeNull()
  })

  it('shows singular "ingredient" for single ingredient', () => {
    const singleIngredientItem: MealItem = {
      ...mockItem,
      id: 'item-4',
      name: 'Boiled Egg',
      ingredients: [{ amount: '1', unit: '', item: 'egg' }],
    }

    render(
      <MealItemCard
        item={singleIngredientItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    expect(screen.getByText('1 ingredient')).toBeDefined()
  })
})
