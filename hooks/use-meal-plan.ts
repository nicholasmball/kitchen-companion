'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MealPlan, MealItem } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInput = any

interface MealPlanWithItems extends MealPlan {
  meal_items: MealItem[]
}

interface UseMealPlansOptions {
  initialFetch?: boolean
}

export function useMealPlans(options: UseMealPlansOptions = { initialFetch: true }) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [activePlan, setActivePlan] = useState<MealPlanWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createClient(), [])

  // Fetch all meal plans
  const fetchMealPlans = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        setError(error.message)
        return
      }

      setMealPlans(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal plans')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Fetch active meal plan with items
  const fetchActivePlan = useCallback(async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meal_items (*)
        `)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        setError(error.message)
        return null
      }

      if (data) {
        // Sort meal items by sort_order
        data.meal_items = (data.meal_items || []).sort((a: MealItem, b: MealItem) => a.sort_order - b.sort_order)
        setActivePlan(data)
      } else {
        setActivePlan(null)
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load active plan')
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Get a single meal plan with items
  const getMealPlan = useCallback(async (id: string): Promise<MealPlanWithItems | null> => {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        meal_items (*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    // Sort meal items by sort_order
    data.meal_items = (data.meal_items || []).sort((a: MealItem, b: MealItem) => a.sort_order - b.sort_order)
    return data
  }, [supabase])

  // Create a new meal plan
  const createMealPlan = useCallback(async (plan: AnyInput): Promise<MealPlan | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      return null
    }

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({ ...plan, user_id: user.id })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    setMealPlans((prev) => [data, ...prev])
    return data
  }, [supabase])

  // Update a meal plan
  const updateMealPlan = useCallback(async (id: string, updates: AnyInput): Promise<MealPlan | null> => {
    const { data, error } = await supabase
      .from('meal_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    setMealPlans((prev) => prev.map((p) => (p.id === id ? data : p)))

    // If this plan was set to active, refresh active plan
    if (updates.is_active) {
      fetchActivePlan()
    }

    return data
  }, [supabase, fetchActivePlan])

  // Delete a meal plan
  const deleteMealPlan = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return false
    }

    setMealPlans((prev) => prev.filter((p) => p.id !== id))

    // If we deleted the active plan, clear it
    if (activePlan?.id === id) {
      setActivePlan(null)
    }

    return true
  }, [supabase, activePlan])

  // Set a plan as active
  const setAsActive = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateMealPlan(id, { is_active: true })
    return result !== null
  }, [updateMealPlan])

  // Deactivate a plan
  const deactivatePlan = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateMealPlan(id, { is_active: false })
    if (result) {
      setActivePlan(null)
    }
    return result !== null
  }, [updateMealPlan])

  // Add a meal item to a plan
  const addMealItem = useCallback(async (planId: string, item: AnyInput): Promise<MealItem | null> => {
    const { data, error } = await supabase
      .from('meal_items')
      .insert({ ...item, meal_plan_id: planId })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    // Update active plan if this is for the active plan
    if (activePlan?.id === planId) {
      setActivePlan({
        ...activePlan,
        meal_items: [...activePlan.meal_items, data].sort((a, b) => a.sort_order - b.sort_order)
      })
    }

    return data
  }, [supabase, activePlan])

  // Update a meal item
  const updateMealItem = useCallback(async (itemId: string, updates: AnyInput): Promise<MealItem | null> => {
    const { data, error } = await supabase
      .from('meal_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    // Update active plan if this item is in it
    if (activePlan) {
      const itemIndex = activePlan.meal_items.findIndex((i) => i.id === itemId)
      if (itemIndex !== -1) {
        const updatedItems = [...activePlan.meal_items]
        updatedItems[itemIndex] = data
        setActivePlan({
          ...activePlan,
          meal_items: updatedItems.sort((a, b) => a.sort_order - b.sort_order)
        })
      }
    }

    return data
  }, [supabase, activePlan])

  // Delete a meal item
  const deleteMealItem = useCallback(async (itemId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('meal_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      setError(error.message)
      return false
    }

    // Update active plan if this item was in it
    if (activePlan) {
      setActivePlan({
        ...activePlan,
        meal_items: activePlan.meal_items.filter((i) => i.id !== itemId)
      })
    }

    return true
  }, [supabase, activePlan])

  useEffect(() => {
    if (options.initialFetch) {
      fetchMealPlans()
      fetchActivePlan()
    }
  }, [options.initialFetch, fetchMealPlans, fetchActivePlan])

  return {
    mealPlans,
    activePlan,
    loading,
    error,
    fetchMealPlans,
    fetchActivePlan,
    getMealPlan,
    createMealPlan,
    updateMealPlan,
    deleteMealPlan,
    setAsActive,
    deactivatePlan,
    addMealItem,
    updateMealItem,
    deleteMealItem,
  }
}
