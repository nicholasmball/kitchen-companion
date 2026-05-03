// Recovery for the Supabase refresh-token deadlock that locks users out of
// the PWA: a stale `sb-*` cookie causes auth-js to wedge on `navigator.locks`,
// freezing every getUser/signIn/signOut call. The only escape is to wipe the
// cookies. This module gives the app a programmatic way to do that.

import type { SupabaseClient } from '@supabase/supabase-js'

const SB_COOKIE_PREFIX = 'sb-'
const SB_LOCAL_STORAGE_PREFIX = 'sb-'

const REFRESH_TOKEN_ERROR_PATTERNS = [
  'refresh_token_not_found',
  'invalid refresh token',
  'invalid_grant',
  'refresh token already used',
  'refresh token not found',
] as const

export function isInvalidRefreshTokenError(err: unknown): boolean {
  if (!err) return false
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : typeof (err as { message?: unknown })?.message === 'string'
          ? ((err as { message: string }).message)
          : ''
  if (!message) return false
  const lower = message.toLowerCase()
  return REFRESH_TOKEN_ERROR_PATTERNS.some((p) => lower.includes(p))
}

function clearSupabaseCookies(): void {
  if (typeof document === 'undefined') return
  const cookies = document.cookie ? document.cookie.split(';') : []
  for (const raw of cookies) {
    const eq = raw.indexOf('=')
    const name = (eq > -1 ? raw.slice(0, eq) : raw).trim()
    if (!name.startsWith(SB_COOKIE_PREFIX)) continue
    // Wipe at root path (where @supabase/ssr writes them) and the current
    // path as a fallback.
    document.cookie = `${name}=; Max-Age=0; path=/`
    document.cookie = `${name}=; Max-Age=0; path=${window.location.pathname}`
  }
}

function clearSupabaseLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  const toRemove: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (key && key.startsWith(SB_LOCAL_STORAGE_PREFIX)) toRemove.push(key)
  }
  for (const key of toRemove) window.localStorage.removeItem(key)
}

// Wipe every trace of Supabase auth state from the browser. Use this when the
// user is wedged by a bad refresh token. Safe to call on a healthy session
// too — it'll just sign the user out locally.
//
// Pass a Supabase client to also fire signOut({ scope: 'local' }), which lets
// the SDK release any in-memory locks. We do this fire-and-forget with a hard
// timeout because the call itself can wedge on the same lock — that's the
// whole bug we're recovering from.
export async function clearSupabaseAuthState(
  supabase?: Pick<SupabaseClient, 'auth'>
): Promise<void> {
  if (supabase) {
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ])
    } catch {
      // Ignore — we're going to wipe the cookies regardless.
    }
  }
  clearSupabaseCookies()
  clearSupabaseLocalStorage()
}
