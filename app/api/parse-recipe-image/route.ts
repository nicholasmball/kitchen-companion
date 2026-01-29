import { createAnthropicClient, CLAUDE_MODEL } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

// Route segment config for App Router
export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60 seconds for AI processing

export async function POST(request: Request) {
  // Check content length before processing
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Image too large. Please use an image under 10MB.' },
      { status: 413 }
    )
  }
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 })
    }

    const anthropic = createAnthropicClient()

    // Extract base64 data and media type
    const matches = image.match(/^data:(.+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    const mediaType = matches[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    const base64Data = matches[2]

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Analyze this image of a recipe and extract all the information you can see. Return a JSON object with these fields (use null if not visible or cannot be determined):

{
  "title": "Recipe name",
  "description": "Brief description if visible",
  "ingredients": [
    {"amount": "2", "unit": "cups", "item": "flour", "notes": "sifted"}
  ],
  "instructions": "Step by step instructions as a single string with numbered steps",
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "servings": number or null,
  "difficulty": "easy" | "medium" | "hard" | null,
  "cuisine": "cuisine type if mentioned" or null,
  "course": "starter" | "main" | "dessert" | "side" | null,
  "notes": "Any additional notes or tips visible"
}

Notes:
- Use metric measurements (grams, ml) - convert from imperial if needed
- Extract ALL ingredients you can see, preserving quantities
- For instructions, number each step clearly
- If handwritten, do your best to read the text

Return ONLY the JSON object, no other text.`,
            },
          ],
        },
      ],
    })

    // Extract the text response
    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Parse the JSON response
    try {
      let jsonText = textContent.text.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7)
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3)
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3)
      }

      const data = JSON.parse(jsonText.trim())
      return NextResponse.json({ success: true, data })
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: textContent.text },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Parse recipe image error:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}
