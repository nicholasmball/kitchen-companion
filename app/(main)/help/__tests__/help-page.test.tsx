import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HelpPage from '../page'

describe('Help Page', () => {
  it('renders the page heading', () => {
    render(<HelpPage />)
    expect(screen.getByText('Help & FAQ')).toBeDefined()
  })

  it('renders all four help sections', () => {
    render(<HelpPage />)
    expect(screen.getByText('Meal Timing Planner')).toBeDefined()
    expect(screen.getAllByText('Chef Assistant').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Recipes')).toBeDefined()
    expect(screen.getByText('Account & Settings')).toBeDefined()
  })

  it('renders questions as collapsed by default', () => {
    render(<HelpPage />)
    // Questions should be visible
    expect(screen.getByText('How do I create a meal plan?')).toBeDefined()
    // Answers should not be visible (collapsed)
    expect(screen.queryByText(/Go to the Planner page and tap/)).toBeNull()
  })

  it('expands a question when clicked', () => {
    render(<HelpPage />)
    const question = screen.getByText('How do I create a meal plan?')
    fireEvent.click(question)

    // Answer should now be visible
    expect(screen.getByText(/Go to the Planner page and tap/)).toBeDefined()
  })

  it('collapses a question when clicked again', () => {
    render(<HelpPage />)
    const question = screen.getByText('How do I create a meal plan?')

    // Open
    fireEvent.click(question)
    expect(screen.getByText(/Go to the Planner page and tap/)).toBeDefined()

    // Close
    fireEvent.click(question)
    expect(screen.queryByText(/Go to the Planner page and tap/)).toBeNull()
  })

  it('allows multiple questions to be open simultaneously', () => {
    render(<HelpPage />)

    fireEvent.click(screen.getByText('How do I create a meal plan?'))
    fireEvent.click(screen.getByText('What can the Chef Assistant help with?'))

    // Both answers should be visible
    expect(screen.getByText(/Go to the Planner page and tap/)).toBeDefined()
    expect(screen.getByText(/an AI assistant that can answer cooking questions/)).toBeDefined()
  })

  it('has aria-expanded attributes on question buttons', () => {
    render(<HelpPage />)
    const question = screen.getByText('How do I create a meal plan?')
    const button = question.closest('button')!

    expect(button.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders a link to the Chef Assistant at the bottom', () => {
    render(<HelpPage />)
    const links = screen.getAllByText('Chef Assistant')
    const assistantLink = links.find(el => el.getAttribute('href') === '/assistant')
    expect(assistantLink).toBeDefined()
  })
})
