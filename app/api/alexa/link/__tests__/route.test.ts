import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase server client
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockUpsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

async function getHandlers() {
  const mod = await import('../route')
  return { POST: mod.POST, GET: mod.GET, DELETE: mod.DELETE }
}

describe('/api/alexa/link', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@test.com' } },
    })

    // Default chain
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
      select: mockSelect,
      delete: mockDelete,
    })
    mockUpsert.mockResolvedValue({ error: null })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  describe('POST — generate linking code', () => {
    it('returns 401 if not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const { POST } = await getHandlers()
      const res = await POST()
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.success).toBe(false)
    })

    it('returns a 6-character code on success', async () => {
      const { POST } = await getHandlers()
      const res = await POST()
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.code).toHaveLength(6)
      expect(json.data.expiresAt).toBeDefined()
    })

    it('calls upsert with correct params', async () => {
      const { POST } = await getHandlers()
      await POST()

      expect(mockFrom).toHaveBeenCalledWith('alexa_links')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          linking_code: expect.any(String),
          linking_code_expires_at: expect.any(String),
        }),
        { onConflict: 'user_id' }
      )
    })
  })

  describe('GET — check link status', () => {
    it('returns not linked when no record', async () => {
      const { GET } = await getHandlers()
      const res = await GET()
      const json = await res.json()

      expect(json.success).toBe(true)
      expect(json.data.linked).toBe(false)
      expect(json.data.pendingCode).toBeNull()
    })

    it('returns linked when amazon_user_id present', async () => {
      mockSingle.mockResolvedValue({
        data: {
          amazon_user_id: 'amzn1.test',
          linking_code: null,
          linking_code_expires_at: null,
        },
        error: null,
      })

      const { GET } = await getHandlers()
      const res = await GET()
      const json = await res.json()

      expect(json.data.linked).toBe(true)
      expect(json.data.pendingCode).toBeNull()
    })

    it('returns pending code when not expired', async () => {
      const future = new Date(Date.now() + 300000).toISOString()
      mockSingle.mockResolvedValue({
        data: {
          amazon_user_id: null,
          linking_code: 'ABC123',
          linking_code_expires_at: future,
        },
        error: null,
      })

      const { GET } = await getHandlers()
      const res = await GET()
      const json = await res.json()

      expect(json.data.linked).toBe(false)
      expect(json.data.pendingCode).toBe('ABC123')
    })
  })

  describe('DELETE — unlink', () => {
    it('returns 401 if not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const { DELETE } = await getHandlers()
      const res = await DELETE()

      expect(res.status).toBe(401)
    })

    it('deletes link on success', async () => {
      const { DELETE } = await getHandlers()
      const res = await DELETE()
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('alexa_links')
    })
  })
})
