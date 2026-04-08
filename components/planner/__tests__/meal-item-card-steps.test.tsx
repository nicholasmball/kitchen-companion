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

const mockItemWithIngredients: MealItem = {
  ...mockItem,
  id: 'item-3',
  name: 'Pasta Carbonara',
  recipe_id: 'recipe-abc-123',
  ingredients: [
    { amount: '200', unit: 'g', item: 'spaghetti' },
    { amount: '100', unit: 'g', item: 'pancetta', notes: 'cubed' },
  ],
}

describe('MealItemCard', () => {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const onViewRecipe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders item name and cooking details', () => {
    render(
      <MealItemCard item={mockItem} onEdit={onEdit} onDelete={onDelete} onViewRecipe={onViewRecipe} />
    )

    expect(screen.getByText('Roast Chicken')).toBeDefined()
    expect(screen.getByText('Oven')).toBeDefined()
    expect(screen.getByText('200°C')).toBeDefined()
    expect(screen.getByText(/85 min total/)).toBeDefined()
  })

  it('shows time breakdown', () => {
    render(
      <MealItemCard item={mockItem} onEdit={onEdit} onDelete={onDelete} onViewRecipe={onViewRecipe} />
    )

    expect(screen.getByText('15m prep')).toBeDefined()
    expect(screen.getByText('60m cook')).toBeDefined()
    expect(screen.getByText('10m rest')).toBeDefined()
  })

  it('shows ingredient count when item has ingredients', () => {
    render(
      <MealItemCard item={mockItemWithIngredients} onEdit={onEdit} onDelete={onDelete} onViewRecipe={onViewRecipe} />
    )

    expect(screen.getByText('2 ingredients')).toBeDefined()
  })

  it('calls onViewRecipe when card is clicked', () => {
    render(
      <MealItemCard item={mockItem} onEdit={onEdit} onDelete={onDelete} onViewRecipe={onViewRecipe} />
    )

    fireEvent.click(screen.getByText('Roast Chicken'))

    expect(onViewRecipe).toHaveBeenCalledWith(mockItem)
  })

  it('calls onEdit when edit button is clicked', () => {
    render(
      <MealItemCard item={mockItem} onEdit={onEdit} onDelete={onDelete} onViewRecipe={onViewRecipe} />
    )

    // Edit button is in the card — click it (it stopsPropagation)
    const buttons = screen.getAllByRole('button')
    // First button in the card actions is edit
    fireEvent.click(buttons[0])

    expect(onEdit).toHaveBeenCalledWith(mockItem)
    expect(onViewRecipe).not.toHaveBeenCalled()
  })

  it('calls onDelete when delete button is clicked', () => {
    render(
      <MealItemCard item={mockItem} onEdit={onEdit} onDelete={onDelete} onViewRecipe={onViewRecipe} />
    )

    const buttons = screen.getAllByRole('button')
    // Second button is delete
    fireEvent.click(buttons[1])

    expect(onDelete).toHaveBeenCalledWith('item-1')
    expect(onViewRecipe).not.toHaveBeenCalled()
  })
})
