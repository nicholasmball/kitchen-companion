import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock alexa-verifier
vi.mock('alexa-verifier', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}))

// Mock anthropic
const mockCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'Roast a chicken at 200°C for about 20 minutes per 500g, plus 20 minutes extra.' }],
})

vi.mock('@/lib/anthropic', () => ({
  createAnthropicClient: () => ({
    messages: { create: mockCreate },
  }),
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',
  buildSystemPrompt: () => 'You are a chef assistant.',
}))

function buildAlexaRequest(requestOverrides: Record<string, unknown> = {}, sessionAttributes: Record<string, unknown> = {}) {
  return {
    version: '1.0',
    session: {
      new: true,
      sessionId: 'amzn1.echo-api.session.test',
      application: { applicationId: 'amzn1.ask.skill.test' },
      attributes: sessionAttributes,
      user: { userId: 'amzn1.ask.account.test' },
    },
    context: {
      System: {
        application: { applicationId: 'amzn1.ask.skill.test' },
        user: { userId: 'amzn1.ask.account.test' },
      },
    },
    request: {
      type: 'LaunchRequest',
      requestId: 'amzn1.echo-api.request.test',
      timestamp: new Date().toISOString(),
      locale: 'en-GB',
      ...requestOverrides,
    },
  }
}

function createRequest(body: unknown) {
  return new Request('https://catskitchen.co.uk/api/alexa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Omit verification headers for testing (non-production)
    },
    body: JSON.stringify(body),
  })
}

// Dynamically import the route handler (after mocks are set up)
async function getHandler() {
  const mod = await import('../route')
  return mod.POST
}

describe('/api/alexa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Ensure we're not in production for tests
    process.env.NODE_ENV = 'test'
  })

  it('handles LaunchRequest with greeting', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({ type: 'LaunchRequest' })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.response.outputSpeech.text).toContain("Cat's Kitchen")
    expect(json.response.shouldEndSession).toBe(false)
    expect(json.response.reprompt).toBeDefined()
  })

  it('handles AskChefIntent and forwards to Claude', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({
      type: 'IntentRequest',
      intent: {
        name: 'AskChefIntent',
        slots: {
          question: { name: 'question', value: 'how long to roast a chicken' },
        },
      },
    })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.response.outputSpeech.text).toContain('200°C')
    expect(json.response.shouldEndSession).toBe(false)
    expect(mockCreate).toHaveBeenCalledTimes(1)

    // Verify system prompt includes voice instructions
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.system).toContain('Alexa voice')
    expect(callArgs.max_tokens).toBe(300)
  })

  it('handles AskChefIntent with no question', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({
      type: 'IntentRequest',
      intent: {
        name: 'AskChefIntent',
        slots: {
          question: { name: 'question' },
        },
      },
    })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.response.outputSpeech.text).toContain("didn't catch")
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('handles AMAZON.HelpIntent', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({
      type: 'IntentRequest',
      intent: { name: 'AMAZON.HelpIntent' },
    })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(json.response.outputSpeech.text).toContain('kitchen assistant')
    expect(json.response.shouldEndSession).toBe(false)
  })

  it('handles AMAZON.StopIntent', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({
      type: 'IntentRequest',
      intent: { name: 'AMAZON.StopIntent' },
    })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(json.response.outputSpeech.text).toContain('Goodbye')
    expect(json.response.shouldEndSession).toBe(true)
  })

  it('handles AMAZON.CancelIntent', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({
      type: 'IntentRequest',
      intent: { name: 'AMAZON.CancelIntent' },
    })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(json.response.shouldEndSession).toBe(true)
  })

  it('handles AMAZON.FallbackIntent', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({
      type: 'IntentRequest',
      intent: { name: 'AMAZON.FallbackIntent' },
    })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(json.response.outputSpeech.text).toContain('ask the chef')
    expect(json.response.shouldEndSession).toBe(false)
  })

  it('handles SessionEndedRequest', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({
      type: 'SessionEndedRequest',
      reason: 'USER_INITIATED',
    })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.response.shouldEndSession).toBe(true)
  })

  it('preserves conversation history in session attributes', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({
      type: 'IntentRequest',
      intent: {
        name: 'AskChefIntent',
        slots: {
          question: { name: 'question', value: 'how long to roast a chicken' },
        },
      },
    })
    const response = await POST(createRequest(body))
    const json = await response.json()

    // Should store messages in session attributes for follow-ups
    expect(json.sessionAttributes.messages).toBeDefined()
    expect(json.sessionAttributes.messages).toHaveLength(2) // user + assistant
    expect(json.sessionAttributes.messages[0].role).toBe('user')
    expect(json.sessionAttributes.messages[1].role).toBe('assistant')
  })

  it('includes card in AskChef response', async () => {
    const POST = await getHandler()
    const body = buildAlexaRequest({
      type: 'IntentRequest',
      intent: {
        name: 'AskChefIntent',
        slots: {
          question: { name: 'question', value: 'how long to roast a chicken' },
        },
      },
    })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(json.response.card).toBeDefined()
    expect(json.response.card.title).toBe("Cat's Kitchen")
    expect(json.response.card.content).toContain('how long to roast a chicken')
  })
})
