import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAnthropicClient = {
  messages: {
    create: vi.fn(),
  },
}
vi.mock('@/lib/anthropic', () => ({
  createAnthropicClient: vi.fn(() => mockAnthropicClient),
  CLAUDE_MODEL: 'claude-test-model',
}))

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/parse-label', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/parse-label', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when image is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Image is required')
  })

  it('returns 400 for invalid image format (not base64 data URI)', async () => {
    const res = await POST(makeRequest({ image: 'not-a-data-uri' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid image format')
  })

  it('parses valid label image and returns JSON data', async () => {
    const labelData = {
      name: 'Fish Fingers',
      cook_time_minutes: 15,
      temperature: 200,
      temperature_unit: 'C',
      cooking_method: 'oven',
      instructions: 'Preheat oven. Cook for 15 minutes.',
    }

    mockAnthropicClient.messages.create.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(labelData) }],
    })

    const res = await POST(makeRequest({
      image: 'data:image/jpeg;base64,/9j/4AAQ==',
    }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('Fish Fingers')
    expect(json.data.cook_time_minutes).toBe(15)
  })

  it('strips markdown code blocks from AI response', async () => {
    const labelData = { name: 'Pizza', cook_time_minutes: 12, cooking_method: 'oven' }
    mockAnthropicClient.messages.create.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(labelData) + '\n```' }],
    })

    const res = await POST(makeRequest({
      image: 'data:image/png;base64,iVBORw==',
    }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('Pizza')
  })

  it('returns 500 when AI returns no text content', async () => {
    mockAnthropicClient.messages.create.mockResolvedValueOnce({
      content: [],
    })

    const res = await POST(makeRequest({
      image: 'data:image/jpeg;base64,/9j/4AAQ==',
    }))

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('No response from AI')
  })

  it('returns 500 when AI returns invalid JSON', async () => {
    mockAnthropicClient.messages.create.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'This is not JSON' }],
    })

    const res = await POST(makeRequest({
      image: 'data:image/jpeg;base64,/9j/4AAQ==',
    }))

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Failed to parse AI response')
  })

  it('passes temperatureUnit to the AI prompt', async () => {
    mockAnthropicClient.messages.create.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"name":"Test","temperature_unit":"F"}' }],
    })

    await POST(makeRequest({
      image: 'data:image/jpeg;base64,/9j/4AAQ==',
      temperatureUnit: 'F',
    }))

    const callArgs = mockAnthropicClient.messages.create.mock.calls[0][0]
    const textContent = callArgs.messages[0].content.find((c: { type: string }) => c.type === 'text')
    expect(textContent.text).toContain('"F"')
  })
})
