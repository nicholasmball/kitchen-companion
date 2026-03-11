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

// Mock alexa-auth
const mockResolveAlexaUser = vi.fn().mockResolvedValue(null)
const mockGetActiveMealPlan = vi.fn().mockResolvedValue(null)
const mockGetUserRecipes = vi.fn().mockResolvedValue([])
const mockRedeemLinkingCode = vi.fn().mockResolvedValue(null)

vi.mock('@/lib/alexa-auth', () => ({
  resolveAlexaUser: (...args: unknown[]) => mockResolveAlexaUser(...args),
  getActiveMealPlan: (...args: unknown[]) => mockGetActiveMealPlan(...args),
  getUserRecipes: (...args: unknown[]) => mockGetUserRecipes(...args),
  redeemLinkingCode: (...args: unknown[]) => mockRedeemLinkingCode(...args),
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
    process.env.NODE_ENV = 'test'
    mockResolveAlexaUser.mockResolvedValue(null)
    mockGetActiveMealPlan.mockResolvedValue(null)
    mockGetUserRecipes.mockResolvedValue([])
    mockRedeemLinkingCode.mockResolvedValue(null)
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

  it('mentions meal plans in launch when linked', async () => {
    mockResolveAlexaUser.mockResolvedValue({
      userId: 'user-123',
      profile: { display_name: 'Cat' },
    })

    const POST = await getHandler()
    const body = buildAlexaRequest({ type: 'LaunchRequest' })
    const response = await POST(createRequest(body))
    const json = await response.json()

    expect(json.response.outputSpeech.text).toContain("what's cooking")
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

    expect(json.sessionAttributes.messages).toBeDefined()
    expect(json.sessionAttributes.messages).toHaveLength(2)
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

  // --- New intent tests ---

  describe('LinkAccountIntent (two-step flow)', () => {
    it('prompts for code on LinkAccountIntent', async () => {
      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: { name: 'LinkAccountIntent' },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain('six character')
      expect(json.sessionAttributes.awaitingLinkCode).toBe(true)
    })

    it('processes code via LinkAccountCodeIntent', async () => {
      mockRedeemLinkingCode.mockResolvedValue('user-123')

      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: {
          name: 'LinkAccountCodeIntent',
          slots: { code: { name: 'code', value: 'A B C D E F' } },
        },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain('now linked')
      expect(mockRedeemLinkingCode).toHaveBeenCalledWith('ABCDEF', 'amzn1.ask.account.test')
    })

    it('intercepts AskChefIntent as code when awaitingLinkCode', async () => {
      mockRedeemLinkingCode.mockResolvedValue('user-123')

      const POST = await getHandler()
      const body = buildAlexaRequest(
        {
          type: 'IntentRequest',
          intent: {
            name: 'AskChefIntent',
            slots: { question: { name: 'question', value: 'A B C D E F' } },
          },
        },
        { awaitingLinkCode: true }
      )
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain('now linked')
      expect(mockCreate).not.toHaveBeenCalled() // Should NOT call Claude
    })

    it('rejects invalid code via LinkAccountCodeIntent', async () => {
      mockRedeemLinkingCode.mockResolvedValue(null)

      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: {
          name: 'LinkAccountCodeIntent',
          slots: { code: { name: 'code', value: 'A B C D E F' } },
        },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain('invalid or has expired')
    })
  })

  describe('GetMealPlanIntent', () => {
    it('tells unlinked user to link', async () => {
      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: { name: 'GetMealPlanIntent' },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain("haven't linked")
    })

    it('tells user when no active plan', async () => {
      mockResolveAlexaUser.mockResolvedValue({ userId: 'user-123', profile: {} })
      mockGetActiveMealPlan.mockResolvedValue(null)

      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: { name: 'GetMealPlanIntent' },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain("don't have an active meal plan")
    })

    it('reads out the meal plan', async () => {
      mockResolveAlexaUser.mockResolvedValue({ userId: 'user-123', profile: {} })
      mockGetActiveMealPlan.mockResolvedValue({
        plan: { name: 'Sunday Roast', serve_time: '2024-01-01T18:00:00Z' },
        items: [
          { name: 'Roast Chicken', cook_time_minutes: 90 },
          { name: 'Roast Potatoes', cook_time_minutes: 45 },
        ],
      })

      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: { name: 'GetMealPlanIntent' },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain('Sunday Roast')
      expect(json.response.outputSpeech.text).toContain('Roast Chicken')
      expect(json.response.outputSpeech.text).toContain('Roast Potatoes')
    })
  })

  describe('GetNextEventIntent', () => {
    it('tells unlinked user to link', async () => {
      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: { name: 'GetNextEventIntent' },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain("haven't linked")
    })
  })

  describe('GetServeTimeIntent', () => {
    it('tells unlinked user to link', async () => {
      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: { name: 'GetServeTimeIntent' },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain("haven't linked")
    })

    it('reads serve time when linked', async () => {
      mockResolveAlexaUser.mockResolvedValue({ userId: 'user-123', profile: {} })
      mockGetActiveMealPlan.mockResolvedValue({
        plan: { name: 'Dinner', serve_time: '2024-01-01T18:00:00Z' },
        items: [],
      })

      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: { name: 'GetServeTimeIntent' },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain('18:00')
    })
  })

  describe('GetIngredientsIntent', () => {
    it('tells unlinked user to link', async () => {
      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: { name: 'GetIngredientsIntent' },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain("haven't linked")
    })

    it('reads ingredients when available', async () => {
      mockResolveAlexaUser.mockResolvedValue({ userId: 'user-123', profile: {} })
      mockGetActiveMealPlan.mockResolvedValue({
        plan: { name: 'Dinner' },
        items: [
          {
            name: 'Pasta',
            ingredients: [
              { amount: '500', unit: 'g', item: 'spaghetti' },
              { amount: '2', unit: 'tbsp', item: 'olive oil' },
            ],
          },
        ],
      })

      const POST = await getHandler()
      const body = buildAlexaRequest({
        type: 'IntentRequest',
        intent: { name: 'GetIngredientsIntent' },
      })
      const response = await POST(createRequest(body))
      const json = await response.json()

      expect(json.response.outputSpeech.text).toContain('spaghetti')
      expect(json.response.outputSpeech.text).toContain('olive oil')
    })
  })
})
