import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockOrder = vi.fn()

function resetChain() {
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
  mockSingle.mockReturnValue({ data: null, error: null })
  mockOrder.mockReturnValue({ data: [], error: null })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

import { resolveAlexaUser, getActiveMealPlan, redeemLinkingCode } from '../alexa-auth'

describe('alexa-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  describe('resolveAlexaUser', () => {
    it('returns null when no link exists', async () => {
      // First call: alexa_links query returns null
      mockSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await resolveAlexaUser('amzn1.ask.account.test')
      expect(result).toBeNull()
    })

    it('returns user when link exists', async () => {
      // First call: alexa_links query
      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      })
      // Second call: profiles query
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          display_name: 'Cat',
          avatar_url: null,
          temperature_unit: 'C',
          measurement_system: 'metric',
          is_admin: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        error: null,
      })

      const result = await resolveAlexaUser('amzn1.ask.account.test')
      expect(result).not.toBeNull()
      expect(result!.userId).toBe('user-123')
      expect(result!.profile.display_name).toBe('Cat')
    })

    it('returns null when profile not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      })
      mockSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await resolveAlexaUser('amzn1.ask.account.test')
      expect(result).toBeNull()
    })
  })

  describe('getActiveMealPlan', () => {
    it('returns null when no active plan', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await getActiveMealPlan('user-123')
      expect(result).toBeNull()
    })

    it('returns plan with items', async () => {
      const mockPlan = {
        id: 'plan-1',
        user_id: 'user-123',
        name: 'Sunday Roast',
        serve_time: '2024-01-01T18:00:00Z',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        description: null,
      }
      const mockItems = [
        {
          id: 'item-1',
          meal_plan_id: 'plan-1',
          name: 'Roast Chicken',
          cook_time_minutes: 90,
          prep_time_minutes: 15,
          rest_time_minutes: 10,
          temperature: 200,
          temperature_unit: 'C',
          cooking_method: 'oven',
          instructions: null,
          notes: null,
          sort_order: 0,
          created_at: '2024-01-01',
          recipe_id: null,
          ingredients: [],
        },
      ]

      // meal_plans query
      mockSingle.mockResolvedValueOnce({ data: mockPlan, error: null })
      // meal_items query — the chain goes .eq().order()
      mockOrder.mockResolvedValueOnce({ data: mockItems, error: null })

      const result = await getActiveMealPlan('user-123')
      expect(result).not.toBeNull()
      expect(result!.plan.name).toBe('Sunday Roast')
      expect(result!.items).toHaveLength(1)
      expect(result!.items[0].name).toBe('Roast Chicken')
    })
  })

  describe('redeemLinkingCode', () => {
    it('returns null for invalid code', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await redeemLinkingCode('BADCODE', 'amzn1.test')
      expect(result).toBeNull()
    })

    it('returns null for expired code', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'link-1',
          user_id: 'user-123',
          linking_code_expires_at: '2020-01-01T00:00:00Z', // expired
        },
        error: null,
      })

      const result = await redeemLinkingCode('ABC123', 'amzn1.test')
      expect(result).toBeNull()
    })

    it('returns user_id on valid code', async () => {
      const futureDate = new Date(Date.now() + 600000).toISOString()
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'link-1',
          user_id: 'user-123',
          linking_code_expires_at: futureDate,
        },
        error: null,
      })

      // After the select call, the next from() call is for update
      // We need to override mockFrom for the second call
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockUpdateEq })

      // First call returns the select chain (already set up), second returns update chain
      mockFrom
        .mockReturnValueOnce({ select: mockSelect })  // for the select query
        .mockReturnValueOnce({ update: mockUpdateFn }) // for the update query

      const result = await redeemLinkingCode('ABC123', 'amzn1.test')
      expect(result).toBe('user-123')
    })
  })
})
