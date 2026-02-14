import { createAnthropicClient, CLAUDE_MODEL, buildSystemPrompt, type ActiveMealPlanContext } from '@/lib/anthropic'

export const runtime = 'edge'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  activeMealPlan?: ActiveMealPlanContext
  temperatureUnit?: 'C' | 'F'
  measurementSystem?: 'metric' | 'imperial'
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, activeMealPlan, temperatureUnit, measurementSystem } = body

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const anthropic = createAnthropicClient()
    const systemPrompt = buildSystemPrompt(activeMealPlan, {
      temperatureUnit: temperatureUnit || 'C',
      measurementSystem: measurementSystem || 'metric',
    })

    // Create streaming response
    const stream = await anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    // Create a readable stream for the response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta
              if ('text' in delta) {
                controller.enqueue(encoder.encode(delta.text))
              }
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
