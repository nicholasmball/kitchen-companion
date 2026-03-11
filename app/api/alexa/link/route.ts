import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I/O/0/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * POST /api/alexa/link — Generate a 6-character linking code (10-min expiry)
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Upsert: create or update the user's alexa_links row
    const { error } = await supabase
      .from('alexa_links')
      .upsert({
        user_id: user.id,
        linking_code: code,
        linking_code_expires_at: expiresAt,
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to generate linking code:', error)
      return NextResponse.json({ success: false, error: 'Failed to generate code' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { code, expiresAt },
    })
  } catch (error) {
    console.error('Alexa link POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

/**
 * GET /api/alexa/link — Check current link status
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { data: link } = await supabase
      .from('alexa_links')
      .select('amazon_user_id, linking_code, linking_code_expires_at')
      .eq('user_id', user.id)
      .single()

    if (!link) {
      return NextResponse.json({
        success: true,
        data: { linked: false, pendingCode: null },
      })
    }

    const isLinked = !!link.amazon_user_id
    const hasPendingCode = !!link.linking_code &&
      link.linking_code_expires_at &&
      new Date(link.linking_code_expires_at) > new Date()

    return NextResponse.json({
      success: true,
      data: {
        linked: isLinked,
        pendingCode: hasPendingCode ? link.linking_code : null,
        codeExpiresAt: hasPendingCode ? link.linking_code_expires_at : null,
      },
    })
  } catch (error) {
    console.error('Alexa link GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

/**
 * DELETE /api/alexa/link — Unlink Alexa account
 */
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { error } = await supabase
      .from('alexa_links')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to unlink Alexa:', error)
      return NextResponse.json({ success: false, error: 'Failed to unlink' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Alexa link DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
