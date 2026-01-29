'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { RecipeForm } from '@/components/recipes/recipe-form'
import { useRecipes } from '@/hooks/use-recipes'
import type { Recipe, RecipeInsert } from '@/types'

export default function EditRecipePage() {
  const params = useParams()
  const id = params.id as string
  const { getRecipe, updateRecipe } = useRecipes({ initialFetch: false })
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecipe() {
      const data = await getRecipe(id)
      if (data) {
        setRecipe(data)
      } else {
        setError('Recipe not found')
      }
      setLoading(false)
    }
    fetchRecipe()
  }, [id, getRecipe])

  const handleSubmit = async (data: RecipeInsert) => {
    return updateRecipe(id, data)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || 'Recipe not found'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Recipe</h1>
        <p className="text-muted-foreground mt-1">
          Update {recipe.title}
        </p>
      </div>

      <RecipeForm recipe={recipe} onSubmit={handleSubmit} />
    </div>
  )
}
