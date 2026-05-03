import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clearSupabaseAuthState, isInvalidRefreshTokenError } from './auth-recovery'

describe('isInvalidRefreshTokenError', () => {
  it('matches Supabase "Invalid Refresh Token: Already Used"', () => {
    expect(
      isInvalidRefreshTokenError(new Error('Invalid Refresh Token: Already Used'))
    ).toBe(true)
  })

  it('matches refresh_token_not_found from auth-js', () => {
    expect(
      isInvalidRefreshTokenError(new Error('AuthApiError: refresh_token_not_found'))
    ).toBe(true)
  })

  it('matches invalid_grant from gotrue', () => {
    expect(isInvalidRefreshTokenError({ message: 'invalid_grant' })).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(
      isInvalidRefreshTokenError(new Error('REFRESH TOKEN NOT FOUND'))
    ).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isInvalidRefreshTokenError(new Error('Network error'))).toBe(false)
    expect(isInvalidRefreshTokenError(new Error('PGRST116'))).toBe(false)
  })

  it('returns false for nullish values', () => {
    expect(isInvalidRefreshTokenError(null)).toBe(false)
    expect(isInvalidRefreshTokenError(undefined)).toBe(false)
    expect(isInvalidRefreshTokenError('')).toBe(false)
  })

  it('accepts plain-string errors', () => {
    expect(isInvalidRefreshTokenError('Invalid Refresh Token')).toBe(true)
  })
})

describe('clearSupabaseAuthState', () => {
  function getCookie(name: string): string | null {
    const match = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(name + '='))
    return match ? match.slice(name.length + 1) : null
  }

  // happy-dom is inconsistent: in some test orders Max-Age=0 leaves the entry
  // with value "" (mirroring how some browsers expose deleted cookies), in
  // others it removes the entry entirely (returning null). Both are
  // "deleted" for our purposes — the SDK won't see the old token either way.
  function expectCleared(name: string) {
    const v = getCookie(name)
    expect(v === null || v === '').toBe(true)
  }

  beforeEach(() => {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim()
      if (name) document.cookie = `${name}=; Max-Age=0; path=/`
    })
    window.localStorage.clear()
  })

  it('wipes all sb-* cookies', async () => {
    document.cookie = 'sb-abc-auth-token=somevalue; path=/'
    document.cookie = 'sb-abc-auth-token-code-verifier=verifier; path=/'
    document.cookie = 'unrelated_cookie=keepme; path=/'

    await clearSupabaseAuthState()

    expectCleared('sb-abc-auth-token')
    expectCleared('sb-abc-auth-token-code-verifier')
    expect(getCookie('unrelated_cookie')).toBe('keepme')
  })

  it('wipes sb-* localStorage entries and leaves others alone', async () => {
    window.localStorage.setItem('sb-abc-auth-token', '{"foo":"bar"}')
    window.localStorage.setItem('sb-other-key', 'x')
    window.localStorage.setItem('rememberMe', 'true')

    await clearSupabaseAuthState()

    expect(window.localStorage.getItem('sb-abc-auth-token')).toBeNull()
    expect(window.localStorage.getItem('sb-other-key')).toBeNull()
    expect(window.localStorage.getItem('rememberMe')).toBe('true')
  })

  it('calls signOut with scope: local when a client is provided', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    await clearSupabaseAuthState({ auth: { signOut } as never })
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('still wipes cookies if signOut hangs', async () => {
    document.cookie = 'sb-abc-auth-token=stuck; path=/'
    const signOut = vi.fn(() => new Promise(() => {})) // never resolves
    await clearSupabaseAuthState({ auth: { signOut } as never })
    expectCleared('sb-abc-auth-token')
  })

  it('still wipes cookies if signOut throws', async () => {
    document.cookie = 'sb-abc-auth-token=stuck; path=/'
    const signOut = vi.fn().mockRejectedValue(new Error('lock held'))
    await clearSupabaseAuthState({ auth: { signOut } as never })
    expectCleared('sb-abc-auth-token')
  })
})
