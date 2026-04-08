import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineView } from '../timeline-view'
import type { TimelineEvent } from '@/types'

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    mealItemId: 'item-1',
    mealItemName: 'Roast Potatoes',
    type: 'prep_start',
    time: new Date(Date.now() + 60 * 60 * 1000),
    description: 'Start prepping Roast Potatoes',
    ingredients: [
      { amount: '1', unit: 'kg', item: 'potatoes', notes: '' },
      { amount: '3', unit: 'tbsp', item: 'goose fat', notes: '' },
    ],
    instructions: 'Peel the potatoes.\nParboil for 8 minutes.\nRoast at 220°C for 45 minutes.',
    recipeId: 'recipe-1',
    ...overrides,
  }
}

const serveTime = new Date(Date.now() + 2 * 60 * 60 * 1000)

describe('Timeline Clickable Events', () => {
  let mockOnEventClick: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnEventClick = vi.fn()
  })

  it('renders clickable events with role="button" when they have instructions', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} onEventClick={mockOnEventClick} />)

    const button = screen.getByRole('button', { name: /View recipe details for Start prepping Roast Potatoes/i })
    expect(button).toBeDefined()
  })

  it('does not render role="button" for events without instructions', () => {
    const events = [makeEvent({ instructions: null, ingredients: null, id: 'no-recipe' })]
    render(<TimelineView events={events} serveTime={serveTime} onEventClick={mockOnEventClick} />)

    expect(screen.queryByRole('button', { name: /View recipe details/i })).toBeNull()
  })

  it('does not render role="button" for serve events', () => {
    const events = [makeEvent({
      id: 'serve',
      type: 'serve',
      description: 'Serve!',
      mealItemId: 'all',
      mealItemName: 'All items',
      instructions: 'Some instructions',
    })]
    render(<TimelineView events={events} serveTime={serveTime} onEventClick={mockOnEventClick} />)

    expect(screen.queryByRole('button', { name: /View recipe details/i })).toBeNull()
  })

  it('calls onEventClick when clicking a clickable event', () => {
    const event = makeEvent()
    render(<TimelineView events={[event]} serveTime={serveTime} onEventClick={mockOnEventClick} />)

    fireEvent.click(screen.getByRole('button', { name: /View recipe details/i }))

    expect(mockOnEventClick).toHaveBeenCalledTimes(1)
    expect(mockOnEventClick).toHaveBeenCalledWith(event)
  })

  it('calls onEventClick on keyboard Enter', () => {
    const event = makeEvent()
    render(<TimelineView events={[event]} serveTime={serveTime} onEventClick={mockOnEventClick} />)

    fireEvent.keyDown(screen.getByRole('button', { name: /View recipe details/i }), { key: 'Enter' })

    expect(mockOnEventClick).toHaveBeenCalledTimes(1)
  })

  it('calls onEventClick on keyboard Space', () => {
    const event = makeEvent()
    render(<TimelineView events={[event]} serveTime={serveTime} onEventClick={mockOnEventClick} />)

    fireEvent.keyDown(screen.getByRole('button', { name: /View recipe details/i }), { key: ' ' })

    expect(mockOnEventClick).toHaveBeenCalledTimes(1)
  })

  it('renders chevron icon on clickable events only', () => {
    const clickableEvent = makeEvent()
    const nonClickableEvent = makeEvent({ id: 'no-recipe', instructions: null, ingredients: null })
    render(<TimelineView events={[clickableEvent, nonClickableEvent]} serveTime={serveTime} onEventClick={mockOnEventClick} />)

    const buttons = screen.getAllByRole('button', { name: /View recipe details/i })
    expect(buttons).toHaveLength(1)
  })

  it('does not make events clickable when onEventClick is not provided', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    expect(screen.queryByRole('button', { name: /View recipe details/i })).toBeNull()
  })
})
