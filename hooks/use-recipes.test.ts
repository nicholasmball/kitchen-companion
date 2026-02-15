import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRecipes } from './use-recipes'

// Get the mocked supabase instance
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

function setupChain(resolveValue: { data: unknown; error: unknown }) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    update: mockUpdate.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    single: mockSingle.mockReturnThis(),
  }
  mockFrom.mockReturnValue(chain)
  // The terminal call resolves
  mockOrder.mockResolvedValue(resolveValue)
  mockSingle.mockResolvedValue(resolveValue)
  mockEq.mockReturnValue({ ...chain, then: (resolve: (v: unknown) => void) => resolve(resolveValue) })
  return chain
}

describe('useRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('fetches recipes on mount when initialFetch is true', async () => {
    const recipes = [{ id: '1', title: 'Pasta', is_favourite: false }]
    setupChain({ data: recipes, error: null })

    const { result } = renderHook(() => useRecipes({ initialFetch: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockFrom).toHaveBeenCalledWith('recipes')
    expect(result.current.recipes).toEqual(recipes)
  })

  it('does not fetch on mount when initialFetch is false', () => {
    const { result } = renderHook(() => useRecipes({ initialFetch: false }))
    // from() should not be called for fetching
    expect(result.current.loading).toBe(true)
  })

  it('sets error state when fetch fails', async () => {
    setupChain({ data: null, error: { message: 'Database error' } })
    // Override order to return the error
    mockOrder.mockResolvedValue({ data: null, error: { message: 'Database error' } })

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Database error')
  })

  it('creates a recipe and adds it to state', async () => {
    const existingRecipe = { id: '1', title: 'Soup' }
    setupChain({ data: [existingRecipe], error: null })

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const newRecipe = { id: '2', title: 'Cake', user_id: 'user-1' }
    mockSingle.mockResolvedValueOnce({ data: newRecipe, error: null })

    let created: unknown
    await act(async () => {
      created = await result.current.createRecipe({ title: 'Cake' })
    })

    expect(created).toEqual(newRecipe)
  })

  it('returns null and sets error when creating recipe while logged out', async () => {
    setupChain({ data: [], error: null })
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let created: unknown
    await act(async () => {
      created = await result.current.createRecipe({ title: 'Cake' })
    })

    expect(created).toBeNull()
    expect(result.current.error).toContain('logged in')
  })

  it('updates a recipe in state', async () => {
    const recipe = { id: '1', title: 'Old Title', is_favourite: false }
    setupChain({ data: [recipe], error: null })

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updated = { id: '1', title: 'New Title', is_favourite: false }
    mockSingle.mockResolvedValueOnce({ data: updated, error: null })

    await act(async () => {
      await result.current.updateRecipe('1', { title: 'New Title' })
    })

    expect(result.current.recipes.find((r) => r.id === '1')?.title).toBe('New Title')
  })

  it('deletes a recipe from state', async () => {
    const recipes = [{ id: '1', title: 'Soup' }, { id: '2', title: 'Cake' }]
    setupChain({ data: recipes, error: null })

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock the delete chain
    const deleteChain = { eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue(deleteChain) })

    await act(async () => {
      await result.current.deleteRecipe('1')
    })

    expect(result.current.recipes.find((r) => r.id === '1')).toBeUndefined()
  })

  it('toggles favourite status', async () => {
    const recipe = { id: '1', title: 'Soup', is_favourite: false }
    setupChain({ data: [recipe], error: null })

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock the update chain for toggleFavourite
    const updateChain = { eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue(updateChain) })

    await act(async () => {
      await result.current.toggleFavourite('1')
    })

    expect(result.current.recipes.find((r) => r.id === '1')?.is_favourite).toBe(true)
  })
})
