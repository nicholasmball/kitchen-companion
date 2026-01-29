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

    // Try to extract JSON-LD structured data first (most recipe sites have this)
    let structuredData = ''
    const jsonLdMatches = pageContent.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        const content = match.replace(/<script[^>]*>|<\/script>/gi, '')
        if (content.includes('Recipe') || content.includes('recipe')) {
          structuredData += content + '\n'
        }
      }
    }

    // Limit content size to avoid token limits
    const maxLength = 50000
    if (pageContent.length > maxLength) {
      pageContent = pageContent.slice(0, maxLength)
    }

    const anthropic = createAnthropicClient()

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Extract the recipe from this webpage. Focus only on the actual recipe content.

${structuredData ? `STRUCTURED DATA (JSON-LD) - Use this as your primary source:\n${structuredData}\n\n` : ''}

Return a JSON object with these fields (use null if not found):

{
  "title": "Recipe name",
  "description": "Brief description",
  "ingredients": [
    {"amount": "200", "unit": "g", "item": "flour", "notes": "sifted"}
  ],
  "instructions": "Step by step instructions as a single string with numbered steps. IMPORTANT: Include ALL steps from the recipe.",
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "rest_time_minutes": number or null,
  "servings": number or null,
  "difficulty": "easy" | "medium" | "hard" | null,
  "cuisine": "cuisine type" or null,
  "course": "starter" | "main" | "dessert" | "side" | null
}

Notes:
- Convert all measurements to metric (grams, ml, etc.)
- Extract ALL ingredients with their quantities
- IMPORTANT: Extract ALL instruction steps - do not truncate or summarize
- Number each instruction step clearly (1. 2. 3. etc.)
- IMPORTANT: Look for resting/standing/cooling time in the instructions. Phrases like "let rest for 10 minutes", "allow to stand", "rest before carving", "cool for 15 minutes" indicate rest_time_minutes. This is common for meats, baked goods, and dishes that need to set.
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

      const parsed = JSON.parse(jsonText.trim())
      // Only include expected fields to avoid AI hallucinations (like incorrect tags)
      const data = {
        title: parsed.title || null,
        description: parsed.description || null,
        ingredients: parsed.ingredients || [],
        instructions: parsed.instructions || null,
        prep_time_minutes: parsed.prep_time_minutes || null,
        cook_time_minutes: parsed.cook_time_minutes || null,
        rest_time_minutes: parsed.rest_time_minutes || null,
        servings: parsed.servings || null,
        difficulty: parsed.difficulty || null,
        cuisine: parsed.cuisine || null,
        course: parsed.course || null,
        source_url: url,
      }
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
