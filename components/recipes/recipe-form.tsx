'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Recipe, Ingredient } from '@/types'

interface RecipeFormProps {
  recipe?: Recipe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => Promise<Recipe | null>
}

const UNITS = [
  '', 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb',
  'piece', 'pinch', 'handful', 'slice', 'clove', 'sprig'
]

const CUISINES = [
  'British', 'Italian', 'French', 'Mexican', 'Indian', 'Chinese',
  'Japanese', 'Thai', 'Mediterranean', 'American', 'Middle Eastern', 'Other'
]

export function RecipeForm({ recipe, onSubmit }: RecipeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState(recipe?.title || '')
  const [description, setDescription] = useState(recipe?.description || '')
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients?.length
      ? recipe.ingredients.map(ing => ({
          amount: ing.amount || '',
          unit: ing.unit || '',
          item: ing.item || '',
          notes: ing.notes || '',
        }))
      : [{ amount: '', unit: '', item: '', notes: '' }]
  )
  const [instructions, setInstructions] = useState(recipe?.instructions || '')
  const [prepTime, setPrepTime] = useState(recipe?.prep_time_minutes?.toString() || '')
  const [cookTime, setCookTime] = useState(recipe?.cook_time_minutes?.toString() || '')
  const [restTime, setRestTime] = useState(recipe?.rest_time_minutes?.toString() || '')
  const [servings, setServings] = useState(recipe?.servings?.toString() || '4')
  const [difficulty, setDifficulty] = useState(recipe?.difficulty || '')
  const [cuisine, setCuisine] = useState(recipe?.cuisine || '')
  const [course, setCourse] = useState(recipe?.course || '')
  const [sourceName, setSourceName] = useState(recipe?.source_name || '')
  const [sourceUrl, setSourceUrl] = useState(recipe?.source_url || '')
  const [tags, setTags] = useState(recipe?.tags?.join(', ') || '')

  const addIngredient = () => {
    setIngredients([...ingredients, { amount: '', unit: '', item: '', notes: '' }])
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index))
    }
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Filter out empty ingredients
    const filteredIngredients = ingredients.filter((i) => i.item.trim())

    const data = {
      title: title.trim(),
      description: description.trim() || null,
      ingredients: filteredIngredients,
      instructions: instructions.trim() || null,
      prep_time_minutes: prepTime ? parseInt(prepTime) : null,
      cook_time_minutes: cookTime ? parseInt(cookTime) : null,
      rest_time_minutes: restTime ? parseInt(restTime) : null,
      servings: servings ? parseInt(servings) : 4,
      difficulty: difficulty as 'easy' | 'medium' | 'hard' | null || null,
      cuisine: cuisine || null,
      course: course || null,
      source_name: sourceName.trim() || null,
      source_url: sourceUrl.trim() || null,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }

    const result = await onSubmit(data)

    if (result) {
      router.push(`/recipes/${result.id}`)
    } else {
      setError('Failed to save recipe. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Recipe Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chicken Tikka Masala"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of the dish..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                placeholder="Qty"
                value={ingredient.amount || ''}
                onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                className="w-20"
              />
              <Select
                value={ingredient.unit || ''}
                onValueChange={(value) => updateIngredient(index, 'unit', value)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit || 'none'} value={unit || 'none'}>
                      {unit || '—'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Ingredient"
                value={ingredient.item || ''}
                onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Notes (optional)"
                value={ingredient.notes || ''}
                onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                className="w-32 hidden sm:block"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(index)}
                disabled={ingredients.length === 1}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addIngredient}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Ingredient
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Step-by-step cooking instructions..."
            rows={8}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Tip: Number your steps (1. Preheat oven... 2. Mix ingredients...)
          </p>
        </CardContent>
      </Card>

      {/* Times & Servings */}
      <Card>
        <CardHeader>
          <CardTitle>Times & Servings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep (min)</Label>
              <Input
                id="prepTime"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookTime">Cook (min)</Label>
              <Input
                id="cookTime"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restTime">Rest (min)</Label>
              <Input
                id="restTime"
                type="number"
                value={restTime}
                onChange={(e) => setRestTime(e.target.value)}
                placeholder="10"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cuisine">Cuisine</Label>
              <Select value={cuisine} onValueChange={setCuisine}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cuisine" />
                </SelectTrigger>
                <SelectContent>
                  {CUISINES.map((c) => (
                    <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="side">Side</SelectItem>
                  <SelectItem value="dessert">Dessert</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                  <SelectItem value="drink">Drink</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="vegetarian, quick, comfort food"
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source */}
      <Card>
        <CardHeader>
          <CardTitle>Source (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sourceName">Source Name</Label>
              <Input
                id="sourceName"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g., BBC Good Food"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Source URL</Label>
              <Input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : recipe ? 'Update Recipe' : 'Save Recipe'}
        </Button>
      </div>
    </form>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}
