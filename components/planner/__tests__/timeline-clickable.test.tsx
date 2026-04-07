import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineView } from '../timeline-view'
import type { TimelineEvent } from '@/types'

// Mock the Sheet component to avoid portal issues in tests
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="sheet-title">{children}</h3>
  ),
}))

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    mealItemId: 'item-1',
    mealItemName: 'Roast Potatoes',
    type: 'prep_start',
    time: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
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

const serveTime = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now

describe('Timeline Clickable Events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders clickable events with role="button" when they have instructions', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    const button = screen.getByRole('button', { name: /View recipe details for Start prepping Roast Potatoes/i })
    expect(button).toBeDefined()
  })

  it('does not render role="button" for events without instructions', () => {
    const events = [makeEvent({ instructions: null, ingredients: null, id: 'no-recipe' })]
    render(<TimelineView events={events} serveTime={serveTime} />)

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
    render(<TimelineView events={events} serveTime={serveTime} />)

    expect(screen.queryByRole('button', { name: /View recipe details/i })).toBeNull()
  })

  it('opens sheet when clicking a clickable event', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    const button = screen.getByRole('button', { name: /View recipe details/i })
    fireEvent.click(button)

    expect(screen.getByTestId('sheet')).toBeDefined()
    expect(screen.getByTestId('sheet-title')).toBeDefined()
  })

  it('opens sheet on keyboard Enter', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    const button = screen.getByRole('button', { name: /View recipe details/i })
    fireEvent.keyDown(button, { key: 'Enter' })

    expect(screen.getByTestId('sheet')).toBeDefined()
  })

  it('opens sheet on keyboard Space', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    const button = screen.getByRole('button', { name: /View recipe details/i })
    fireEvent.keyDown(button, { key: ' ' })

    expect(screen.getByTestId('sheet')).toBeDefined()
  })

  it('shows meal item name in the sheet', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    fireEvent.click(screen.getByRole('button', { name: /View recipe details/i }))

    expect(screen.getByText('Roast Potatoes')).toBeDefined()
  })

  it('shows event type badge in the sheet', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    fireEvent.click(screen.getByRole('button', { name: /View recipe details/i }))

    expect(screen.getByText('Prep')).toBeDefined()
  })

  it('shows ingredients in the sheet', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    fireEvent.click(screen.getByRole('button', { name: /View recipe details/i }))

    expect(screen.getAllByLabelText('1 kg potatoes')[0]).toBeDefined()
    expect(screen.getAllByLabelText('3 tbsp goose fat')[0]).toBeDefined()
  })

  it('shows instructions in the sheet', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    fireEvent.click(screen.getByRole('button', { name: /View recipe details/i }))

    // Both mobile and desktop render, so use getAllByText
    expect(screen.getAllByText('Peel the potatoes.').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Parboil for 8 minutes.').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Roast at 220°C for 45 minutes.').length).toBeGreaterThanOrEqual(1)
  })

  it('highlights the first step for prep_start events', () => {
    const events = [makeEvent({ type: 'prep_start' })]
    render(<TimelineView events={events} serveTime={serveTime} />)

    fireEvent.click(screen.getByRole('button', { name: /View recipe details/i }))

    // The first step should have aria-current="step" (both mobile + desktop render it)
    const highlightedSteps = screen.getAllByText('Peel the potatoes.')
    const highlighted = highlightedSteps.find(el => el.closest('[aria-current="step"]'))
    expect(highlighted).toBeDefined()
  })

  it('highlights a cooking step for cook_start events', () => {
    const events = [makeEvent({ type: 'cook_start', description: 'Put in oven: Roast Potatoes' })]
    render(<TimelineView events={events} serveTime={serveTime} />)

    fireEvent.click(screen.getByRole('button', { name: /View recipe details/i }))

    // Should highlight step 3 which contains "Roast" (a cook keyword)
    const roastSteps = screen.getAllByText('Roast at 220°C for 45 minutes.')
    const highlighted = roastSteps.find(el => el.closest('[aria-current="step"]'))
    expect(highlighted).toBeDefined()
  })

  it('toggles ingredient checkboxes in the sheet', () => {
    const events = [makeEvent()]
    render(<TimelineView events={events} serveTime={serveTime} />)

    fireEvent.click(screen.getByRole('button', { name: /View recipe details/i }))

    const checkbox = screen.getAllByLabelText('1 kg potatoes')[0]
    expect(checkbox.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(checkbox)
    expect(checkbox.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(checkbox)
    expect(checkbox.getAttribute('aria-checked')).toBe('false')
  })

  it('renders chevron icon on clickable events', () => {
    const clickableEvent = makeEvent()
    const nonClickableEvent = makeEvent({ id: 'no-recipe', instructions: null, ingredients: null })
    render(<TimelineView events={[clickableEvent, nonClickableEvent]} serveTime={serveTime} />)

    // Clickable event has a button role, non-clickable doesn't
    const buttons = screen.getAllByRole('button', { name: /View recipe details/i })
    expect(buttons).toHaveLength(1)
  })
})
