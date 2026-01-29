import { createAnthropicClient, CLAUDE_MODEL } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch the webpage content
    let pageContent: string
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KitchenCompanion/1.0)',
        },
      })
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: ${response.status}` },
          { status: 400 }
        )
      }
      pageContent = await response.text()
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch the URL' },
        { status: 400 }
      )
    }

    // Limit content size to avoid token limits
    const maxLength = 50000
    if (pageContent.length > maxLength) {
      pageContent = pageContent.slice(0, maxLength)
    }

    const anthropic = createAnthropicClient()

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Extract the recipe from this webpage content. Ignore ads, comments, author stories, and other non-recipe content. Focus only on the actual recipe.

Return a JSON object with these fields (use null if not found):

{
  "title": "Recipe name",
  "description": "Brief description",
  "ingredients": [
    {"amount": "200", "unit": "g", "item": "flour", "notes": "sifted"}
  ],
  "instructions": "Step by step instructions as a single string with numbered steps",
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "servings": number or null,
  "difficulty": "easy" | "medium" | "hard" | null,
  "cuisine": "cuisine type" or null,
  "course": "starter" | "main" | "dessert" | "side" | null
}

Notes:
- Convert all measurements to metric (grams, ml, etc.)
- Extract ALL ingredients with their quantities
- Number each instruction step
- Ignore any "jump to recipe" buttons or duplicate content

Webpage content:
${pageContent}

Return ONLY the JSON object, no other text.`,
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
      // Add the source URL
      data.source_url = url
      return NextResponse.json({ success: true, data })
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: textContent.text },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Parse recipe URL error:', error)
    return NextResponse.json(
      { error: 'Failed to process URL' },
      { status: 500 }
    )
  }
}
