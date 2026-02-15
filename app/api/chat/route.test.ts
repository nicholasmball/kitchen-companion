import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the anthropic module before importing the route
const mockStream = {
  [Symbol.asyncIterator]: vi.fn(),
}
const mockAnthropicClient = {
  messages: {
    stream: vi.fn().mockResolvedValue(mockStream),
  },
}
vi.mock('@/lib/anthropic', () => ({
  createAnthropicClient: vi.fn(() => mockAnthropicClient),
  CLAUDE_MODEL: 'claude-test-model',
  buildSystemPrompt: vi.fn(() => 'Test system prompt'),
}))

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when messages array is empty', async () => {
    const res = await POST(makeRequest({ messages: [] }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Messages are required')
  })

  it('returns 400 when messages is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Messages are required')
  })

  it('returns a streaming response on success', async () => {
    // Set up async iterator to yield text events
    const events = [
      { type: 'content_block_delta', delta: { text: 'Hello' } },
      { type: 'content_block_delta', delta: { text: ' world' } },
    ]

    mockStream[Symbol.asyncIterator] = vi.fn().mockReturnValue({
      next: vi.fn()
        .mockResolvedValueOnce({ value: events[0], done: false })
        .mockResolvedValueOnce({ value: events[1], done: false })
        .mockResolvedValueOnce({ value: undefined, done: true }),
    })

    const res = await POST(makeRequest({
      messages: [{ role: 'user', content: 'Hi' }],
    }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')

    // Read the stream
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let result = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value)
    }
    expect(result).toBe('Hello world')
  })

  it('passes activeMealPlan and preferences to buildSystemPrompt', async () => {
    const { buildSystemPrompt } = await import('@/lib/anthropic')

    mockStream[Symbol.asyncIterator] = vi.fn().mockReturnValue({
      next: vi.fn().mockResolvedValueOnce({ value: undefined, done: true }),
    })

    await POST(makeRequest({
      messages: [{ role: 'user', content: 'test' }],
      activeMealPlan: { name: 'Dinner', serveTime: '7pm', items: [] },
      temperatureUnit: 'F',
      measurementSystem: 'imperial',
    }))

    expect(buildSystemPrompt).toHaveBeenCalledWith(
      { name: 'Dinner', serveTime: '7pm', items: [] },
      { temperatureUnit: 'F', measurementSystem: 'imperial' }
    )
  })

  it('returns 500 when anthropic client throws', async () => {
    mockAnthropicClient.messages.stream.mockRejectedValueOnce(new Error('API error'))

    const res = await POST(makeRequest({
      messages: [{ role: 'user', content: 'Hi' }],
    }))

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Failed to process chat request')
  })
})
