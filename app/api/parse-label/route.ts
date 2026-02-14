import { createAnthropicClient, CLAUDE_MODEL } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { image, temperatureUnit = 'C' } = await request.json()

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
      max_tokens: 1024,
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
              text: `Analyze this food packaging label and extract cooking instructions. Return a JSON object with these fields (use null if not found):

{
  "name": "Product name",
  "cook_time_minutes": number or null,
  "prep_time_minutes": number or null,
  "temperature": number or null,
  "temperature_unit": "${temperatureUnit}",
  "cooking_method": "oven" | "hob" | "grill" | "microwave" | "air_fryer" | "slow_cooker" | "steamer" | "bbq" | "other",
  "instructions": "Step by step cooking instructions as a single string"
}

Notes:
- ${temperatureUnit === 'F' ? 'Convert all temperatures to Fahrenheit if given in Celsius' : 'Convert all temperatures to Celsius if given in Fahrenheit'}
- Always use temperature_unit: "${temperatureUnit}"
- Parse cooking times like "25-30 minutes" as the higher value (30)
- For cooking method, choose the most appropriate from the list
- Keep instructions concise but complete

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
      // Remove any markdown code blocks if present
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
    console.error('Parse label error:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}
