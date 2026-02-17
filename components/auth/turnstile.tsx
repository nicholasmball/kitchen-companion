'use client'

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import Script from 'next/script'
import { useTheme } from 'next-themes'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact' | 'invisible'
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export interface TurnstileRef {
  reset: () => void
}

interface TurnstileProps {
  onToken: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  function Turnstile({ onToken, onExpire, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const { resolvedTheme } = useTheme()

    const renderWidget = useCallback(() => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: onToken,
        'expired-callback': () => {
          onExpire?.()
        },
        'error-callback': () => {
          onError?.()
        },
        theme: resolvedTheme === 'dark' ? 'dark' : 'light',
      })
    }, [onToken, onExpire, onError, resolvedTheme])

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current)
        }
      },
    }))

    useEffect(() => {
      return () => {
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
      }
    }, [])

    if (!SITE_KEY) return null

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          onReady={renderWidget}
        />
        <div ref={containerRef} />
      </>
    )
  }
)
