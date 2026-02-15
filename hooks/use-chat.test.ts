import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from './use-chat'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with empty messages', () => {
    const { result } = renderHook(() => useChat())
    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('does not send empty messages', async () => {
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('')
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.messages).toHaveLength(0)
  })

  it('does not send whitespace-only messages', async () => {
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('   ')
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('sends a message and streams response', async () => {
    // Create a readable stream that emits text
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('Hello'))
        controller.enqueue(encoder.encode(' there'))
        controller.close()
      },
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: stream,
    })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Hi')
    })

    // Should have user + assistant messages
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('Hi')
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].content).toBe('Hello there')
  })

  it('sets error when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Hi')
    })

    expect(result.current.error).toContain('Failed to send message')
    // Assistant placeholder should be removed
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].role).toBe('user')
  })

  it('clears messages', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('Response'))
        controller.close()
      },
    })
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('test')
    })

    expect(result.current.messages.length).toBeGreaterThan(0)

    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.messages).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('loads messages from session', async () => {
    const session = {
      id: 'sess-1',
      user_id: 'user-1',
      title: 'Test',
      messages: [
        { role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant' as const, content: 'Hi!', timestamp: '2024-01-01T00:00:01Z' },
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const { result } = renderHook(() => useChat({ session }))

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    expect(result.current.messages[0].content).toBe('Hello')
    expect(result.current.messages[1].content).toBe('Hi!')
  })

  it('calls onMessagesChange after sending a message', async () => {
    const onMessagesChange = vi.fn()
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('Reply'))
        controller.close()
      },
    })
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream })

    const { result } = renderHook(() => useChat({ onMessagesChange }))

    await act(async () => {
      await result.current.sendMessage('Hi')
    })

    // Should have been called with stored messages and a title (first message)
    expect(onMessagesChange).toHaveBeenCalled()
    const [storedMessages, title] = onMessagesChange.mock.calls[0]
    expect(storedMessages).toHaveLength(2)
    expect(title).toBe('Hi')
  })
})
