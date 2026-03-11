import { createAnthropicClient, CLAUDE_MODEL, buildSystemPrompt } from '@/lib/anthropic'
import { resolveAlexaUser, getActiveMealPlan, redeemLinkingCode } from '@/lib/alexa-auth'
import { calculateTimeline, getNextEvent, formatTimeUntil } from '@/lib/timing-calculator'
import type { ActiveMealPlanContext } from '@/lib/anthropic'
import type { ActiveMealPlanWithItems } from '@/lib/alexa-auth'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: verifier } = require('alexa-verifier')

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

// --- Helper to build meal plan context for the chef ---

function buildMealPlanContext(data: ActiveMealPlanWithItems): ActiveMealPlanContext {
  return {
    name: data.plan.name,
    serveTime: data.plan.serve_time
      ? new Date(data.plan.serve_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : 'not set',
    items: data.items.map((item) => ({
      name: item.name,
      cookTime: item.cook_time_minutes,
      method: item.cooking_method,
    })),
  }
}

// --- Intent handlers ---

function handleLaunch(isLinked: boolean): AlexaResponse {
  const linkedMessage = isLinked
    ? " Your account is linked, so I can tell you about your meal plans too. Try saying: what's cooking?"
    : ''

  return buildResponse(
    `Hello! I'm Cat's Kitchen assistant. You can ask me any cooking question, like how long to roast a chicken, or what temperature to bake a cake.${linkedMessage} What would you like to know?`,
    {
      repromptText: 'What cooking question can I help you with?',
      cardTitle: "Cat's Kitchen",
      cardContent: 'Your kitchen companion is ready to help!',
    }
  )
}

function handleLinkAccountStart(
  sessionAttributes: Record<string, unknown>
): AlexaResponse {
  return buildResponse(
    "Sure! Please say the six character linking code from your Cat's Kitchen settings page. For example: my code is A B C 1 2 3.",
    {
      repromptText: "What is the six character code from your settings page? Say: my code is, followed by the code.",
      sessionAttributes: { ...sessionAttributes, awaitingLinkCode: true },
    }
  )
}

async function handleLinkAccountCode(
  code: string,
  amazonUserId: string,
  sessionAttributes: Record<string, unknown>
): Promise<AlexaResponse> {
  // Normalize: remove spaces, uppercase
  const normalizedCode = code.replace(/\s+/g, '').toUpperCase()

  if (normalizedCode.length !== 6) {
    return buildResponse(
      "That doesn't look right. The linking code should be six characters. You can find it on the settings page of Cat's Kitchen. Try saying: my code is, followed by the six characters.",
      {
        repromptText: 'Please say the six character linking code.',
        sessionAttributes: { ...sessionAttributes, awaitingLinkCode: true },
      }
    )
  }

  const userId = await redeemLinkingCode(normalizedCode, amazonUserId)

  if (!userId) {
    return buildResponse(
      "Sorry, that code is invalid or has expired. Please generate a new code on the settings page and try again.",
      {
        repromptText: 'Would you like to try another code?',
        sessionAttributes: { ...sessionAttributes, awaitingLinkCode: false },
      }
    )
  }

  return buildResponse(
    "Your account is now linked! I can see your meal plans and help you with what you're cooking. Try saying: what's cooking?",
    {
      repromptText: "Try saying: what's cooking?",
      cardTitle: "Cat's Kitchen — Account Linked",
      cardContent: 'Your Alexa is now connected to your Cat\'s Kitchen account.',
      sessionAttributes: { ...sessionAttributes, awaitingLinkCode: false },
    }
  )
}

async function handleGetMealPlan(
  userId: string | null,
  sessionAttributes: Record<string, unknown>
): Promise<AlexaResponse> {
  if (!userId) {
    return buildResponse(
      "You haven't linked your account yet. Go to the settings page on Cat's Kitchen to generate a linking code, then say: link my account, followed by the code.",
      { sessionAttributes }
    )
  }

  const data = await getActiveMealPlan(userId)
  if (!data) {
    return buildResponse(
      "You don't have an active meal plan at the moment. Create one on Cat's Kitchen and I'll be able to tell you about it.",
      {
        repromptText: 'Anything else I can help with?',
        sessionAttributes,
      }
    )
  }

  const itemNames = data.items.map((i) => i.name)
  const itemList = itemNames.length > 1
    ? itemNames.slice(0, -1).join(', ') + ' and ' + itemNames[itemNames.length - 1]
    : itemNames[0] || 'no items'

  const serveTimeStr = data.plan.serve_time
    ? `Serve time is ${new Date(data.plan.serve_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`
    : 'No serve time set.'

  return buildResponse(
    `Your meal plan "${data.plan.name}" has ${data.items.length} item${data.items.length !== 1 ? 's' : ''}: ${itemList}. ${serveTimeStr}`,
    {
      repromptText: "You can ask: what's next, or ask the chef a question.",
      cardTitle: `Meal Plan: ${data.plan.name}`,
      cardContent: `Items: ${itemNames.join(', ')}\n${serveTimeStr}`,
      sessionAttributes,
    }
  )
}

async function handleGetNextEvent(
  userId: string | null,
  sessionAttributes: Record<string, unknown>
): Promise<AlexaResponse> {
  if (!userId) {
    return buildResponse(
      "You haven't linked your account yet. Go to settings on Cat's Kitchen to generate a linking code.",
      { sessionAttributes }
    )
  }

  const data = await getActiveMealPlan(userId)
  if (!data || !data.plan.serve_time) {
    return buildResponse(
      "You don't have an active meal plan with a serve time set. Set one up on Cat's Kitchen first.",
      {
        repromptText: 'Anything else I can help with?',
        sessionAttributes,
      }
    )
  }

  const events = calculateTimeline(data.items, new Date(data.plan.serve_time))
  const next = getNextEvent(events)

  if (!next) {
    return buildResponse(
      "All events in your meal plan have passed. It looks like everything should be done!",
      {
        repromptText: 'Anything else I can help with?',
        sessionAttributes,
      }
    )
  }

  const timeStr = formatTimeUntil(next.time)

  return buildResponse(
    `Next up: ${next.description}, ${timeStr}.`,
    {
      repromptText: 'You can ask: what else is coming up, or ask the chef a question.',
      cardTitle: "What's Next",
      cardContent: `${next.description} — ${timeStr}`,
      sessionAttributes,
    }
  )
}

async function handleGetServeTime(
  userId: string | null,
  sessionAttributes: Record<string, unknown>
): Promise<AlexaResponse> {
  if (!userId) {
    return buildResponse(
      "You haven't linked your account yet. Go to settings on Cat's Kitchen to generate a linking code.",
      { sessionAttributes }
    )
  }

  const data = await getActiveMealPlan(userId)
  if (!data) {
    return buildResponse(
      "You don't have an active meal plan at the moment.",
      { sessionAttributes }
    )
  }

  if (!data.plan.serve_time) {
    return buildResponse(
      `Your meal plan "${data.plan.name}" doesn't have a serve time set. You can set one on Cat's Kitchen.`,
      { sessionAttributes }
    )
  }

  const serveTime = new Date(data.plan.serve_time)
  const timeStr = serveTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const untilStr = formatTimeUntil(serveTime)

  return buildResponse(
    `Dinner is set for ${timeStr}, that's ${untilStr}.`,
    {
      repromptText: 'Anything else?',
      cardTitle: 'Serve Time',
      cardContent: `${timeStr} (${untilStr})`,
      sessionAttributes,
    }
  )
}

async function handleGetIngredients(
  userId: string | null,
  sessionAttributes: Record<string, unknown>
): Promise<AlexaResponse> {
  if (!userId) {
    return buildResponse(
      "You haven't linked your account yet. Go to settings on Cat's Kitchen to generate a linking code.",
      { sessionAttributes }
    )
  }

  const data = await getActiveMealPlan(userId)
  if (!data) {
    return buildResponse(
      "You don't have an active meal plan at the moment.",
      { sessionAttributes }
    )
  }

  // Collect all ingredients from all items
  const allIngredients: string[] = []
  for (const item of data.items) {
    if (item.ingredients && item.ingredients.length > 0) {
      for (const ing of item.ingredients) {
        const parts = [ing.amount, ing.unit, ing.item].filter(Boolean).join(' ')
        allIngredients.push(parts)
      }
    }
  }

  if (allIngredients.length === 0) {
    return buildResponse(
      `Your meal plan "${data.plan.name}" doesn't have any ingredients listed. You can add them on Cat's Kitchen.`,
      { sessionAttributes }
    )
  }

  // For voice, limit to first 10 and mention there are more
  const voiceLimit = 10
  const spoken = allIngredients.slice(0, voiceLimit)
  const moreCount = allIngredients.length - voiceLimit

  let speech = `You need: ${spoken.join(', ')}`
  if (moreCount > 0) {
    speech += `, and ${moreCount} more. Check the app for the full list.`
  } else {
    speech += '.'
  }

  return buildResponse(speech, {
    repromptText: 'Anything else?',
    cardTitle: 'Ingredients',
    cardContent: allIngredients.join('\n'),
    sessionAttributes,
  })
}

async function handleAskChef(
  intent: AlexaIntent,
  sessionAttributes: Record<string, unknown>,
  userId: string | null
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

    // If linked, fetch meal plan context and user preferences
    let mealPlanContext: ActiveMealPlanContext | undefined
    let preferences: { temperatureUnit: 'C' | 'F'; measurementSystem: 'metric' | 'imperial' } | undefined

    if (userId) {
      const data = await getActiveMealPlan(userId)
      if (data) {
        mealPlanContext = buildMealPlanContext(data)
      }
      // Preferences are loaded via resolveAlexaUser profile
      // but we already have them in session if linked — keep defaults for now
    }

    const systemPrompt = buildSystemPrompt(mealPlanContext, preferences ?? {
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

function handleHelp(isLinked: boolean): AlexaResponse {
  const linkingHelp = isLinked
    ? " Since your account is linked, you can also say: what's cooking, what's next, when do I serve, or what ingredients do I need."
    : " You can also link your Cat's Kitchen account by going to settings and generating a linking code, then saying: link my account, followed by the code."

  return buildResponse(
    `I'm your kitchen assistant! You can ask me cooking questions like: how long to roast a chicken, what temperature for baking bread, or how to make a roux. Just say: ask the chef, followed by your question.${linkingHelp} What would you like to know?`,
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

    console.log('Alexa headers - certUrl:', certUrl ? 'present' : 'missing', 'signature:', signature ? 'present' : 'missing')

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
      console.error('Alexa missing verification headers. All headers:', JSON.stringify(Object.fromEntries(request.headers.entries())))
      return new Response(JSON.stringify({ error: 'Missing verification headers' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body: AlexaRequestEnvelope = JSON.parse(rawBody)
    const { request: alexaRequest, session } = body
    const sessionAttributes = session.attributes || {}
    const amazonUserId = session.user.userId

    // Resolve linked user (if any)
    const alexaUser = await resolveAlexaUser(amazonUserId)
    const userId = alexaUser?.userId || null
    const isLinked = !!alexaUser

    let response: AlexaResponse

    switch (alexaRequest.type) {
      case 'LaunchRequest':
        response = handleLaunch(isLinked)
        break

      case 'IntentRequest': {
        const intentName = alexaRequest.intent?.name

        // Two-step linking: if we're awaiting a code and the user speaks,
        // intercept AskChefIntent (SearchQuery captures free-form speech) as a code attempt
        if (sessionAttributes.awaitingLinkCode && intentName === 'AskChefIntent') {
          const spokenCode = alexaRequest.intent?.slots?.question?.value
          if (spokenCode) {
            response = await handleLinkAccountCode(spokenCode, amazonUserId, sessionAttributes)
            break
          }
        }

        switch (intentName) {
          case 'LinkAccountIntent':
            response = handleLinkAccountStart(sessionAttributes)
            break
          case 'LinkAccountCodeIntent':
            response = await handleLinkAccountCode(
              alexaRequest.intent?.slots?.code?.value || '',
              amazonUserId,
              sessionAttributes
            )
            break
          case 'GetMealPlanIntent':
            response = await handleGetMealPlan(userId, sessionAttributes)
            break
          case 'GetNextEventIntent':
            response = await handleGetNextEvent(userId, sessionAttributes)
            break
          case 'GetServeTimeIntent':
            response = await handleGetServeTime(userId, sessionAttributes)
            break
          case 'GetIngredientsIntent':
            response = await handleGetIngredients(userId, sessionAttributes)
            break
          case 'AskChefIntent':
            response = await handleAskChef(alexaRequest.intent!, sessionAttributes, userId)
            break
          case 'AMAZON.HelpIntent':
            response = handleHelp(isLinked)
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
