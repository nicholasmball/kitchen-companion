import { createAnthropicClient, CLAUDE_MODEL } from '@/lib/anthropic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for storage operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Download external image and upload to Supabase
async function downloadAndUploadImage(imageUrl: string): Promise<string | null> {
  try {
    console.log('Downloading image from:', imageUrl)

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText)
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    console.log('Image content-type:', contentType)

    // Accept any content type that might be an image
    if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
      console.error('Not an image:', contentType)
      return null
    }

    // Get image data
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('Downloaded image size:', buffer.length, 'bytes')

    // Check size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      console.error('Image too large:', buffer.length)
      return null
    }

    // Determine extension from content type or URL
    let ext = 'jpg'
    if (contentType.includes('png')) ext = 'png'
    else if (contentType.includes('webp')) ext = 'webp'
    else if (contentType.includes('gif')) ext = 'gif'
    else if (imageUrl.toLowerCase().includes('.png')) ext = 'png'
    else if (imageUrl.toLowerCase().includes('.webp')) ext = 'webp'
    else if (imageUrl.toLowerCase().includes('.gif')) ext = 'gif'

    // Generate unique filename
    const filename = `imports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    console.log('Uploading to Supabase as:', filename)

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('recipe-images')
      .upload(filename, buffer, {
        contentType: contentType.includes('image') ? contentType : `image/${ext}`,
        upsert: true,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('recipe-images')
      .getPublicUrl(data.path)

    console.log('Successfully uploaded, public URL:', publicUrl)
    return publicUrl
  } catch (err) {
    console.error('Image download/upload error:', err)
    return null
  }
}

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
    let imageUrl: string | null = null

    const jsonLdMatches = pageContent.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        const content = match.replace(/<script[^>]*>|<\/script>/gi, '')
        if (content.includes('Recipe') || content.includes('recipe')) {
          structuredData += content + '\n'
          // Try to extract image from JSON-LD
          try {
            const jsonData = JSON.parse(content)
            const recipe = jsonData['@type'] === 'Recipe' ? jsonData :
              (Array.isArray(jsonData['@graph']) ? jsonData['@graph'].find((item: { '@type'?: string }) => item['@type'] === 'Recipe') : null)
            if (recipe?.image && !imageUrl) {
              if (typeof recipe.image === 'string') {
                imageUrl = recipe.image
              } else if (Array.isArray(recipe.image)) {
                // Could be array of strings or array of objects
                const firstImage = recipe.image[0]
                if (typeof firstImage === 'string') {
                  imageUrl = firstImage
                } else if (firstImage?.url) {
                  imageUrl = firstImage.url
                }
              } else if (recipe.image.url) {
                imageUrl = recipe.image.url
              }
              console.log('Extracted image URL from JSON-LD:', imageUrl)
            }
          } catch (e) {
            console.error('JSON-LD parse error:', e)
          }
        }
      }
    }

    // Fallback: try Open Graph meta tag (handle both attribute orders)
    if (!imageUrl) {
      const ogImageMatch = pageContent.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                           pageContent.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
      if (ogImageMatch) {
        imageUrl = ogImageMatch[1]
        console.log('Extracted image URL from og:image:', imageUrl)
      }
    }

    console.log('Final extracted image URL:', imageUrl)

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
      // If we have an external image URL, download and re-upload it
      let finalImageUrl: string | null = null
      if (imageUrl) {
        console.log('Attempting to download and re-upload image:', imageUrl)
        const uploadedUrl = await downloadAndUploadImage(imageUrl)
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl
          console.log('Image successfully re-uploaded:', finalImageUrl)
        } else {
          console.log('Failed to re-upload image, not including in response')
        }
      }

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
        image_url: finalImageUrl,
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
