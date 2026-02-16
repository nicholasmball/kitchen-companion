import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './anthropic'
import type { ActiveMealPlanContext, UserPreferencesContext } from './anthropic'

describe('buildSystemPrompt', () => {
  it('defaults to Celsius and metric when no preferences provided', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('Celsius')
    expect(prompt).toContain('grams')
    expect(prompt).toContain('millilitres')
  })

  it('uses Fahrenheit when temperatureUnit is F', () => {
    const prefs: UserPreferencesContext = { temperatureUnit: 'F', measurementSystem: 'metric' }
    const prompt = buildSystemPrompt(undefined, prefs)
    expect(prompt).toContain('Fahrenheit')
    expect(prompt).not.toContain('Temperatures in Celsius')
  })

  it('uses imperial measurements when measurementSystem is imperial', () => {
    const prefs: UserPreferencesContext = { temperatureUnit: 'C', measurementSystem: 'imperial' }
    const prompt = buildSystemPrompt(undefined, prefs)
    expect(prompt).toContain('ounces and pounds')
    expect(prompt).toContain('cups, fluid ounces')
  })

  it('uses metric measurements when measurementSystem is metric', () => {
    const prefs: UserPreferencesContext = { temperatureUnit: 'C', measurementSystem: 'metric' }
    const prompt = buildSystemPrompt(undefined, prefs)
    expect(prompt).toContain('grams and kilograms')
  })

  it('includes British terminology reminders', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('aubergine not eggplant')
    expect(prompt).toContain('courgette not zucchini')
    expect(prompt).toContain('British spelling')
  })

  it('includes chef personality traits', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('British chef')
    expect(prompt).toContain('Warm, encouraging')
    expect(prompt).toContain('Safety-conscious')
  })

  it('includes kitchen context reminder', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('messy hands')
  })

  it('appends meal plan context when provided', () => {
    const mealPlan: ActiveMealPlanContext = {
      name: 'Sunday Roast',
      serveTime: '6:00 PM',
      items: [
        { name: 'Chicken', cookTime: 90, method: 'oven' },
        { name: 'Roast Potatoes', cookTime: 45, method: 'oven' },
      ],
    }
    const prompt = buildSystemPrompt(mealPlan)
    expect(prompt).toContain('Sunday Roast')
    expect(prompt).toContain('6:00 PM')
    expect(prompt).toContain('Chicken')
    expect(prompt).toContain('90 min')
    expect(prompt).toContain('Roast Potatoes')
  })

  it('does not include meal plan section when not provided', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).not.toContain('currently cooking a meal')
  })

  it('includes both preferences and meal plan together', () => {
    const prefs: UserPreferencesContext = { temperatureUnit: 'F', measurementSystem: 'imperial' }
    const mealPlan: ActiveMealPlanContext = {
      name: 'Dinner',
      serveTime: '7 PM',
      items: [{ name: 'Steak', cookTime: 15, method: 'grill' }],
    }
    const prompt = buildSystemPrompt(mealPlan, prefs)
    expect(prompt).toContain('Fahrenheit')
    expect(prompt).toContain('ounces and pounds')
    expect(prompt).toContain('Dinner')
    expect(prompt).toContain('Steak')
  })
})
