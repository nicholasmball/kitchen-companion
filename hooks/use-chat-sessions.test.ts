import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChatSessions } from './use-chat-sessions'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

const sessionA = {
  id: 'sess-1',
  user_id: 'user-1',
  title: 'Cooking help',
  messages: [{ role: 'user', content: 'How do I cook rice?', timestamp: '2024-01-01T00:00:00Z' }],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const sessionB = {
  id: 'sess-2',
  user_id: 'user-1',
  title: 'Baking tips',
  messages: [{ role: 'user', content: 'How do I make bread?', timestamp: '2024-01-02T00:00:00Z' }],
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

function setupFetchSessions(sessions: unknown[]) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: sessions, error: null }),
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: sessions[0] || null, error: null }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn(),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn(),
    }),
  })
}

describe('useChatSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('fetches sessions on mount', async () => {
    setupFetchSessions([sessionA, sessionB])

    const { result } = renderHook(() => useChatSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sessions).toHaveLength(2)
  })

  it('creates a new session', async () => {
    setupFetchSessions([])

    const { result } = renderHook(() => useChatSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const newSession = { id: 'sess-new', user_id: 'user-1', title: 'My Chat', messages: [] }
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newSession, error: null }),
        }),
      }),
    })

    let created: unknown
    await act(async () => {
      created = await result.current.createSession('My Chat')
    })

    expect(created).toEqual(newSession)
    expect(result.current.currentSession).toEqual(newSession)
  })

  it('returns null when creating session while logged out', async () => {
    setupFetchSessions([])
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { result } = renderHook(() => useChatSessions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let created: unknown
    await act(async () => {
      created = await result.current.createSession()
    })

    expect(created).toBeNull()
  })

  it('loads session from local cache', async () => {
    setupFetchSessions([sessionA, sessionB])

    const { result } = renderHook(() => useChatSessions())

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2)
    })

    await act(async () => {
      await result.current.loadSession('sess-1')
    })

    expect(result.current.currentSession?.id).toBe('sess-1')
  })

  it('deletes a session and clears currentSession if active', async () => {
    setupFetchSessions([sessionA])

    const { result } = renderHook(() => useChatSessions())

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    // Set current session
    await act(async () => {
      await result.current.loadSession('sess-1')
    })

    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    await act(async () => {
      await result.current.deleteSession('sess-1')
    })

    expect(result.current.sessions).toHaveLength(0)
    expect(result.current.currentSession).toBeNull()
  })

  it('searches sessions by title', async () => {
    setupFetchSessions([sessionA, sessionB])

    const { result } = renderHook(() => useChatSessions())

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2)
    })

    const found = result.current.searchSessions('baking')
    expect(found).toHaveLength(1)
    expect(found[0].id).toBe('sess-2')
  })

  it('searches sessions by message content', async () => {
    setupFetchSessions([sessionA, sessionB])

    const { result } = renderHook(() => useChatSessions())

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2)
    })

    const found = result.current.searchSessions('rice')
    expect(found).toHaveLength(1)
    expect(found[0].id).toBe('sess-1')
  })

  it('returns all sessions when search query is empty', async () => {
    setupFetchSessions([sessionA, sessionB])

    const { result } = renderHook(() => useChatSessions())

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2)
    })

    expect(result.current.searchSessions('')).toHaveLength(2)
    expect(result.current.searchSessions('   ')).toHaveLength(2)
  })
})
