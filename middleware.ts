import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { withTimeout } from '@/lib/utils'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Always create the Supabase client and refresh the session.
  // This keeps auth cookies fresh for ALL routes (including /)
  // so Server Components get accurate auth state.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Determine if this route needs redirect logic
  const protectedPaths = ['/planner', '/assistant', '/recipes', '/settings']
  const authPaths = ['/login', '/signup']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  try {
    // Refresh session if expired - required for Server Components
    // 5s timeout prevents Supabase slowness from hanging the entire site
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 5000)

    if (isProtectedPath && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    if (isAuthPath && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  } catch {
    // On timeout or network error, let the request through rather than
    // redirecting to /login. The user likely IS authenticated — Supabase
    // was just slow. Client-side code will handle auth state properly.
    // Only a definitive "no user" response (handled above) should redirect.
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
