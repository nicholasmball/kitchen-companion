'use client'

import { RecipeForm } from '@/components/recipes/recipe-form'
import { useRecipes } from '@/hooks/use-recipes'

export default function NewRecipePage() {
  const { createRecipe } = useRecipes({ initialFetch: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Recipe</h1>
        <p className="text-muted-foreground mt-1">
          Save a new recipe to your collection
        </p>
      </div>

      <RecipeForm onSubmit={createRecipe} />
    </div>
  )
}
