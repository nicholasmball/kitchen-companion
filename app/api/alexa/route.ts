import { createAnthropicClient, CLAUDE_MODEL, buildSystemPrompt } from '@/lib/anthropic'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const verifier = require('alexa-verifier')

// Use Node.js runtime (alexa-verifier needs crypto/http)
export const runtime = 'nodejs'

// --- Alexa request/response types ---

interface AlexaSlot {
  name: string
  value?: string
}

interface AlexaIntent {
  name: string
  slots?: Record<string, AlexaSlot>
}

interface AlexaRequest {
  type: 'LaunchRequest' | 'IntentRequest' | 'SessionEndedRequest'
  requestId: string
  timestamp: string
  locale: string
  intent?: AlexaIntent
  reason?: string
}

interface AlexaRequestEnvelope {
  version: string
  session: {
    new: boolean
    sessionId: string
    application: { applicationId: string }
    attributes?: Record<string, unknown>
    user: { userId: string }
  }
  request: AlexaRequest
}

interface AlexaResponse {
  version: string
  sessionAttributes?: Record<string, unknown>
  response: {
    outputSpeech?: {
      type: 'PlainText' | 'SSML'
      text?: string
      ssml?: string
    }
    reprompt?: {
      outputSpeech: {
        type: 'PlainText'
        text: string
      }
    }
    card?: {
      type: 'Simple'
      title: string
      content: string
    }
    shouldEndSession: boolean
  }
}

// --- Helper to build Alexa responses ---

function buildResponse(
  speechText: string,
  options: {
    shouldEndSession?: boolean
    repromptText?: string
    cardTitle?: string
    cardContent?: string
    sessionAttributes?: Record<string, unknown>
  } = {}
): AlexaResponse {
  const response: AlexaResponse = {
    version: '1.0',
    sessionAttributes: options.sessionAttributes,
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: speechText,
      },
      shouldEndSession: options.shouldEndSession ?? false,
    },
  }

  if (options.repromptText) {
    response.response.reprompt = {
      outputSpeech: {
        type: 'PlainText',
        text: options.repromptText,
      },
    }
  }

  if (options.cardTitle) {
    response.response.card = {
      type: 'Simple',
      title: options.cardTitle,
      content: options.cardContent || speechText,
    }
  }

  return response
}

// --- Intent handlers ---

function handleLaunch(): AlexaResponse {
  return buildResponse(
    "Hello! I'm Cat's Kitchen assistant. You can ask me any cooking question, like how long to roast a chicken, or what temperature to bake a cake. What would you like to know?",
    {
      repromptText: 'What cooking question can I help you with?',
      cardTitle: "Cat's Kitchen",
      cardContent: "Your kitchen companion is ready to help!",
    }
  )
}

async function handleAskChef(
  intent: AlexaIntent,
  sessionAttributes: Record<string, unknown>
): Promise<AlexaResponse> {
  const question = intent.slots?.question?.value

  if (!question) {
    return buildResponse(
      "I didn't catch that. What cooking question would you like to ask?",
      {
        repromptText: 'Try asking something like: how long should I roast a chicken?',
        sessionAttributes,
      }
    )
  }

  try {
    const anthropic = createAnthropicClient()
    const systemPrompt = buildSystemPrompt(undefined, {
      temperatureUnit: 'C',
      measurementSystem: 'metric',
    })

    // Build conversation history from session if available
    const previousMessages = (sessionAttributes.messages as Array<{ role: 'user' | 'assistant'; content: string }>) || []
    const messages = [
      ...previousMessages,
      { role: 'user' as const, content: question },
    ]

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      system: systemPrompt + '\n\nIMPORTANT: You are responding via Alexa voice. Keep responses concise (2-3 sentences max). Do not use markdown, bullet points, or numbered lists. Speak naturally as if talking to someone in the kitchen. Do not use special characters or formatting.',
      messages,
    })

    const assistantText = response.content[0].type === 'text'
      ? response.content[0].text
      : "Sorry, I couldn't come up with an answer for that."

    // Store conversation in session for follow-ups
    const updatedMessages = [
      ...messages,
      { role: 'assistant' as const, content: assistantText },
    ].slice(-6) // Keep last 3 exchanges to stay within session limits

    return buildResponse(assistantText, {
      repromptText: 'Anything else you\'d like to know?',
      cardTitle: "Cat's Kitchen",
      cardContent: `Q: ${question}\n\nA: ${assistantText}`,
      sessionAttributes: { ...sessionAttributes, messages: updatedMessages },
    })
  } catch (error) {
    console.error('Alexa AskChef error:', error)
    return buildResponse(
      "Sorry, I'm having trouble thinking right now. Please try again in a moment.",
      {
        repromptText: 'Would you like to try asking again?',
        sessionAttributes,
      }
    )
  }
}

function handleHelp(): AlexaResponse {
  return buildResponse(
    "I'm your kitchen assistant! You can ask me cooking questions like: how long to roast a chicken, what temperature for baking bread, or how to make a roux. Just say: ask the chef, followed by your question. What would you like to know?",
    {
      repromptText: 'What cooking question can I help with?',
    }
  )
}

function handleStop(): AlexaResponse {
  return buildResponse('Happy cooking! Goodbye.', { shouldEndSession: true })
}

function handleFallback(sessionAttributes: Record<string, unknown>): AlexaResponse {
  return buildResponse(
    "I'm not sure about that. Try saying: ask the chef, followed by a cooking question.",
    {
      repromptText: 'What cooking question can I help with?',
      sessionAttributes,
    }
  )
}

// --- Main handler ---

export async function POST(request: Request) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text()

    // Verify request signature (required for Alexa certification)
    const certUrl = request.headers.get('signaturecertchainurl')
    const signature = request.headers.get('signature-256') || request.headers.get('signature')

    if (certUrl && signature) {
      try {
        await verifier(certUrl, signature, rawBody)
      } catch (err) {
        console.error('Alexa request verification failed:', err)
        return new Response(JSON.stringify({ error: 'Request verification failed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } else if (process.env.NODE_ENV === 'production') {
      // In production, reject unverified requests
      return new Response(JSON.stringify({ error: 'Missing verification headers' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body: AlexaRequestEnvelope = JSON.parse(rawBody)
    const { request: alexaRequest, session } = body
    const sessionAttributes = session.attributes || {}

    let response: AlexaResponse

    switch (alexaRequest.type) {
      case 'LaunchRequest':
        response = handleLaunch()
        break

      case 'IntentRequest': {
        const intentName = alexaRequest.intent?.name
        switch (intentName) {
          case 'AskChefIntent':
            response = await handleAskChef(alexaRequest.intent!, sessionAttributes)
            break
          case 'AMAZON.HelpIntent':
            response = handleHelp()
            break
          case 'AMAZON.StopIntent':
          case 'AMAZON.CancelIntent':
            response = handleStop()
            break
          case 'AMAZON.FallbackIntent':
            response = handleFallback(sessionAttributes)
            break
          default:
            response = handleFallback(sessionAttributes)
        }
        break
      }

      case 'SessionEndedRequest':
        response = { version: '1.0', response: { shouldEndSession: true } }
        break

      default:
        response = buildResponse('Sorry, something went wrong.', { shouldEndSession: true })
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Alexa API error:', error)
    return new Response(
      JSON.stringify(
        buildResponse('Sorry, something went wrong. Please try again later.', {
          shouldEndSession: true,
        })
      ),
      {
        status: 200, // Alexa expects 200 even for errors
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
