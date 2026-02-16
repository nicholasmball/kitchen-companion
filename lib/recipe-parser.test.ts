import { describe, it, expect } from 'vitest'
import { containsRecipe, extractRecipeTitle, parseRecipeFromContent } from './recipe-parser'

describe('containsRecipe', () => {
  it('detects a recipe with ingredients and method', () => {
    expect(containsRecipe('## Ingredients\n- 500g chicken\n## Method\n1. Cook it')).toBe(true)
  })

  it('detects a recipe with ingredients and steps', () => {
    expect(containsRecipe('**Ingredients:**\n- flour\n**Steps:**\n1. Mix')).toBe(true)
  })

  it('detects a recipe with serves and ingredients', () => {
    expect(containsRecipe('Serves 4\nIngredients: flour, eggs\nPrep: 10 min, Cook: 20 min')).toBe(true)
  })

  it('returns false for non-recipe text', () => {
    expect(containsRecipe('The weather is lovely today')).toBe(false)
  })

  it('returns false for text with only ingredients but no method', () => {
    expect(containsRecipe('I need some ingredients from the shop')).toBe(false)
  })
})

describe('extractRecipeTitle', () => {
  it('extracts from markdown header', () => {
    expect(extractRecipeTitle('## Classic Chicken Tikka Masala\nA lovely curry')).toBe('Classic Chicken Tikka Masala')
  })

  it('extracts from bold text', () => {
    expect(extractRecipeTitle('**Spaghetti Bolognese**\nA classic Italian dish')).toBe('Spaghetti Bolognese')
  })

  it('extracts from "recipe for" pattern', () => {
    expect(extractRecipeTitle('Here is a recipe for shepherd\'s pie.\nIngredients...')).toBe("shepherd's pie")
  })

  it('falls back to default', () => {
    expect(extractRecipeTitle('Some random text')).toBe('Recipe from Chef')
  })
})

describe('parseRecipeFromContent', () => {
  it('parses a recipe with markdown headers (## format)', () => {
    const content = `## Chicken Tikka Masala
A classic British curry.

## Ingredients
- 800g chicken breast (cut into chunks)
- 2 tbsp tikka paste
- 400ml coconut milk
- 1 large onion, diced

## Method
1. Marinate the chicken in tikka paste for 30 minutes.
2. Fry the onion until soft.
3. Add the chicken and cook through.
4. Pour in the coconut milk and simmer for 20 minutes.

## Tips
- Use thigh meat for extra flavour.`

    const result = parseRecipeFromContent(content)

    expect(result.title).toBe('Chicken Tikka Masala')
    expect(result.description).toBe('A classic British curry.')
    expect(result.ingredients.length).toBe(4)
    expect(result.ingredients[0]).toEqual({
      amount: '800',
      unit: 'g',
      item: 'chicken breast',
      notes: 'cut into chunks'
    })
    expect(result.ingredients[1]).toEqual({
      amount: '2',
      unit: 'tbsp',
      item: 'tikka paste',
      notes: ''
    })
    expect(result.ingredients[3]).toEqual({
      amount: '1',
      unit: 'large',
      item: 'onion',
      notes: 'diced'
    })
    expect(result.instructions).toContain('Marinate the chicken')
    expect(result.instructions).toContain('simmer for 20 minutes')
    expect(result.instructions).not.toContain('thigh meat') // Tips should not leak into instructions
  })

  it('parses a recipe with bold headers (**Ingredients:** format)', () => {
    const content = `**Simple Pasta Carbonara**

A quick weeknight dinner that tastes amazing.

**Ingredients:**
- 400g spaghetti
- 200g pancetta
- 4 large eggs
- 100g parmesan, finely grated
- Salt and pepper to taste

**Method:**
1. Cook the spaghetti according to packet instructions.
2. Fry the pancetta until crispy.
3. Whisk the eggs with the parmesan.
4. Toss the hot pasta with the pancetta, then stir through the egg mixture.

**Tips:**
- Work quickly so the egg creates a silky sauce.`

    const result = parseRecipeFromContent(content)

    expect(result.title).toBe('Simple Pasta Carbonara')
    expect(result.ingredients.length).toBe(5)
    expect(result.ingredients[0]).toEqual({
      amount: '400',
      unit: 'g',
      item: 'spaghetti',
      notes: ''
    })
    expect(result.ingredients[3]).toEqual({
      amount: '100',
      unit: 'g',
      item: 'parmesan',
      notes: 'finely grated'
    })
    expect(result.instructions).toContain('Cook the spaghetti')
    expect(result.instructions).toContain('egg mixture')
    expect(result.instructions).not.toContain('Work quickly') // Tips excluded
  })

  it('parses a recipe with plain text headers (Ingredients: format)', () => {
    const content = `## Scrambled Eggs

Ingredients:
- 3 large eggs
- 1 tbsp butter
- Salt and pepper

Method:
1. Crack the eggs into a bowl and whisk.
2. Melt butter in a pan over low heat.
3. Add eggs and stir gently until just set.`

    const result = parseRecipeFromContent(content)

    expect(result.title).toBe('Scrambled Eggs')
    expect(result.ingredients.length).toBe(3)
    expect(result.instructions).toContain('Crack the eggs')
  })

  it('extracts prep and cook times', () => {
    const content = `## Quick Stir Fry

Prep time: 15 minutes
Cook time: 10 minutes
Serves: 2

## Ingredients
- 200g noodles
- 100g prawns

## Method
1. Cook noodles.
2. Fry prawns.`

    const result = parseRecipeFromContent(content)

    expect(result.prep_time_minutes).toBe(15)
    expect(result.cook_time_minutes).toBe(10)
    expect(result.servings).toBe(2)
  })

  it('handles ingredients with notes in parentheses', () => {
    const content = `## Test Recipe

## Ingredients
- 500g beef mince (lean)
- 2 tins chopped tomatoes (400g each)

## Method
1. Brown the mince.`

    const result = parseRecipeFromContent(content)

    expect(result.ingredients[0]).toEqual({
      amount: '500',
      unit: 'g',
      item: 'beef mince',
      notes: 'lean'
    })
    expect(result.ingredients[1]).toEqual({
      amount: '2',
      unit: 'tins',
      item: 'chopped tomatoes',
      notes: '400g each'
    })
  })

  it('handles ingredients without amounts', () => {
    const content = `## Test Recipe

## Ingredients
- Salt and pepper to taste
- Fresh parsley for garnish

## Method
1. Season well.`

    const result = parseRecipeFromContent(content)

    expect(result.ingredients[0]).toEqual({
      amount: '',
      unit: '',
      item: 'Salt and pepper to taste',
      notes: ''
    })
  })

  it('handles star-listed ingredients (* instead of -)', () => {
    const content = `**Quick Omelette**

**Ingredients:**
* 3 large eggs
* 1 tbsp butter
* 50g cheese

**Method:**
1. Whisk eggs.
2. Cook in butter.
3. Add cheese.`

    const result = parseRecipeFromContent(content)

    expect(result.ingredients.length).toBe(3)
    expect(result.ingredients[0].item).toBe('eggs')
    expect(result.ingredients[2].amount).toBe('50')
    expect(result.ingredients[2].unit).toBe('g')
    expect(result.ingredients[2].item).toBe('cheese')
  })

  it('returns empty ingredients and instructions for non-recipe text', () => {
    const result = parseRecipeFromContent('Just a simple chat message with no recipe.')

    expect(result.ingredients).toEqual([])
    expect(result.instructions).toBe('')
  })

  it('parses recipe with "Instructions" header instead of "Method"', () => {
    const content = `## Banana Bread

## Ingredients
- 3 ripe bananas
- 250g self-raising flour

## Instructions
1. Mash bananas.
2. Mix in flour.
3. Bake at 180C for 45 minutes.`

    const result = parseRecipeFromContent(content)

    expect(result.ingredients.length).toBe(2)
    expect(result.instructions).toContain('Mash bananas')
    expect(result.instructions).toContain('Bake at 180C')
  })

  it('parses recipe with "Steps" header', () => {
    const content = `**Toast**

**Ingredients:**
- 2 slices bread
- Butter

**Steps:**
1. Toast the bread.
2. Spread with butter.`

    const result = parseRecipeFromContent(content)

    expect(result.ingredients.length).toBe(2)
    expect(result.instructions).toContain('Toast the bread')
  })
})
