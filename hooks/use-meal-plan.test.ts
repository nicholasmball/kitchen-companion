import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMealPlans } from './use-meal-plan'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

function setupFetchChain(plans: unknown[], activePlan: unknown = null) {
  // Track calls to from() to distinguish meal_plans vs meal_items
  let callCount = 0
  mockFrom.mockImplementation((table: string) => {
    callCount++
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn(),
      order: vi.fn(),
      single: vi.fn(),
    }

    // For fetchMealPlans (first call to meal_plans with order)
    chain.order = vi.fn().mockResolvedValue({ data: plans, error: null })
    // For fetchActivePlan (uses eq then single)
    chain.eq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(
        activePlan
          ? { data: activePlan, error: null }
          : { data: null, error: { code: 'PGRST116', message: 'no rows' } }
      ),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })
    chain.select = vi.fn().mockReturnValue({
      eq: chain.eq,
      order: chain.order,
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    return chain
  })
}

describe('useMealPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('fetches meal plans on mount', async () => {
    const plans = [{ id: '1', name: 'Sunday Roast', is_active: false }]
    setupFetchChain(plans)

    const { result } = renderHook(() => useMealPlans())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.mealPlans).toEqual(plans)
  })

  it('does not fetch when initialFetch is false', () => {
    const { result } = renderHook(() => useMealPlans({ initialFetch: false }))
    expect(result.current.loading).toBe(true)
    expect(result.current.mealPlans).toEqual([])
  })

  it('fetches active plan with meal items', async () => {
    const activePlan = {
      id: '1',
      name: 'Dinner',
      is_active: true,
      meal_items: [
        { id: 'a', name: 'Chicken', sort_order: 1 },
        { id: 'b', name: 'Potatoes', sort_order: 0 },
      ],
    }
    setupFetchChain([], activePlan)

    const { result } = renderHook(() => useMealPlans())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Items should be sorted by sort_order
    expect(result.current.activePlan?.meal_items[0].name).toBe('Potatoes')
    expect(result.current.activePlan?.meal_items[1].name).toBe('Chicken')
  })

  it('sets activePlan to null when no active plan exists', async () => {
    setupFetchChain([])

    const { result } = renderHook(() => useMealPlans())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.activePlan).toBeNull()
  })

  it('creates a new meal plan', async () => {
    setupFetchChain([])

    const { result } = renderHook(() => useMealPlans())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const newPlan = { id: '2', name: 'New Plan', user_id: 'user-1' }
    // Override mockFrom for the create call
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newPlan, error: null }),
        }),
      }),
    })

    let created: unknown
    await act(async () => {
      created = await result.current.createMealPlan({ name: 'New Plan' })
    })

    expect(created).toEqual(newPlan)
  })

  it('returns null when creating plan while logged out', async () => {
    setupFetchChain([])
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { result } = renderHook(() => useMealPlans())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let created: unknown
    await act(async () => {
      created = await result.current.createMealPlan({ name: 'Test' })
    })

    expect(created).toBeNull()
    expect(result.current.error).toContain('logged in')
  })

  it('deletes a meal plan and removes from state', async () => {
    const plans = [{ id: '1', name: 'Plan A' }, { id: '2', name: 'Plan B' }]
    setupFetchChain(plans)

    const { result } = renderHook(() => useMealPlans())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Override for delete
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    await act(async () => {
      await result.current.deleteMealPlan('1')
    })

    expect(result.current.mealPlans.find((p) => p.id === '1')).toBeUndefined()
  })

  it('adds a meal item to active plan', async () => {
    const activePlan = {
      id: '1',
      name: 'Dinner',
      is_active: true,
      meal_items: [{ id: 'a', name: 'Chicken', sort_order: 0 }],
    }
    setupFetchChain([], activePlan)

    const { result } = renderHook(() => useMealPlans())

    await waitFor(() => {
      expect(result.current.activePlan).not.toBeNull()
    })

    const newItem = { id: 'b', name: 'Peas', sort_order: 1, meal_plan_id: '1' }
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newItem, error: null }),
        }),
      }),
    })

    await act(async () => {
      await result.current.addMealItem('1', { name: 'Peas', sort_order: 1 })
    })

    expect(result.current.activePlan?.meal_items).toHaveLength(2)
  })

  it('deletes a meal item from active plan', async () => {
    const activePlan = {
      id: '1',
      name: 'Dinner',
      is_active: true,
      meal_items: [
        { id: 'a', name: 'Chicken', sort_order: 0 },
        { id: 'b', name: 'Peas', sort_order: 1 },
      ],
    }
    setupFetchChain([], activePlan)

    const { result } = renderHook(() => useMealPlans())

    await waitFor(() => {
      expect(result.current.activePlan?.meal_items).toHaveLength(2)
    })

    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    await act(async () => {
      await result.current.deleteMealItem('a')
    })

    expect(result.current.activePlan?.meal_items).toHaveLength(1)
    expect(result.current.activePlan?.meal_items[0].id).toBe('b')
  })

  it('updates a meal item in active plan', async () => {
    const activePlan = {
      id: '1',
      name: 'Dinner',
      is_active: true,
      meal_items: [{ id: 'a', name: 'Chicken', sort_order: 0, cook_time_minutes: 30 }],
    }
    setupFetchChain([], activePlan)

    const { result } = renderHook(() => useMealPlans())

    await waitFor(() => {
      expect(result.current.activePlan).not.toBeNull()
    })

    const updatedItem = { id: 'a', name: 'Chicken', sort_order: 0, cook_time_minutes: 45 }
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedItem, error: null }),
          }),
        }),
      }),
    })

    await act(async () => {
      await result.current.updateMealItem('a', { cook_time_minutes: 45 })
    })

    expect(result.current.activePlan?.meal_items[0].cook_time_minutes).toBe(45)
  })
})
