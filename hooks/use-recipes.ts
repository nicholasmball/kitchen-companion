'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import type { Recipe } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecipeInput = any

interface UseRecipesOptions {
  initialFetch?: boolean
}

export function useRecipes(options: UseRecipesOptions = { initialFetch: true }) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createClient(), [])

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false }),
        10000
      )

      if (error) {
        setError(error.message)
        return
      }

      setRecipes(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const createRecipe = useCallback(async (recipe: RecipeInput): Promise<Recipe | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to create a recipe')
      return null
    }

    const { data, error } = await supabase
      .from('recipes')
      .insert({ ...recipe, user_id: user.id })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    setRecipes((prev) => [data, ...prev])
    return data
  }, [supabase])

  const updateRecipe = useCallback(async (id: string, updates: RecipeInput): Promise<Recipe | null> => {
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    setRecipes((prev) => prev.map((r) => (r.id === id ? data : r)))
    return data
  }, [supabase])

  const deleteRecipe = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return false
    }

    setRecipes((prev) => prev.filter((r) => r.id !== id))
    return true
  }, [supabase])

  const toggleFavourite = useCallback(async (id: string): Promise<boolean> => {
    const recipe = recipes.find((r) => r.id === id)
    if (!recipe) return false

    const { error } = await supabase
      .from('recipes')
      .update({ is_favourite: !recipe.is_favourite })
      .eq('id', id)

    if (error) {
      setError(error.message)
      return false
    }

    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_favourite: !r.is_favourite } : r))
    )
    return true
  }, [supabase, recipes])

  const getRecipe = useCallback(async (id: string): Promise<Recipe | null> => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    return data
  }, [supabase])

  useEffect(() => {
    if (options.initialFetch) {
      fetchRecipes()
    }
  }, [options.initialFetch, fetchRecipes])

  return {
    recipes,
    loading,
    error,
    fetchRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleFavourite,
    getRecipe,
  }
}
