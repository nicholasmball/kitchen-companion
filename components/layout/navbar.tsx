'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      // Check "remember me" preference
      if (user) {
        const rememberMe = localStorage.getItem('rememberMe')
        const sessionActive = document.cookie.includes('sessionActive=true')

        // If user didn't check "remember me" and this is a new browser session, sign out
        if (rememberMe === 'false' && !sessionActive) {
          await supabase.auth.signOut()
          localStorage.removeItem('rememberMe')
          setUser(null)
          router.push('/login')
          router.refresh()
          return
        }

        // Set a short-lived cookie (10 seconds) - will be refreshed by interval below
        if (rememberMe === 'false') {
          document.cookie = 'sessionActive=true; Max-Age=10; path=/'
        }
      }

      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()
        setAvatarUrl(profile?.avatar_url || null)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single()
        setAvatarUrl(profile?.avatar_url || null)
      } else {
        setAvatarUrl(null)
      }
    })

    // Listen for profile picture changes from settings page
    const handleProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setAvatarUrl(detail?.avatarUrl || null)
    }
    window.addEventListener('profile-updated', handleProfileUpdated)

    // Keep refreshing the session cookie while page is open (for non-remembered sessions)
    const intervalId = setInterval(() => {
      const rememberMe = localStorage.getItem('rememberMe')
      if (rememberMe === 'false') {
        document.cookie = 'sessionActive=true; Max-Age=10; path=/'
      }
    }, 5000) // Refresh every 5 seconds

    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
      window.removeEventListener('profile-updated', handleProfileUpdated)
    }
  }, [supabase.auth, router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    localStorage.removeItem('rememberMe')
    document.cookie = 'sessionActive=; Max-Age=0; path=/' // Clear session cookie
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-warm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold text-lg flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <div className="w-8 h-8 rounded-full overflow-hidden shadow-warm shrink-0">
              <Image
                src="/images/branding/mascot circle.png"
                alt="Cat's Kitchen"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <span className="hidden sm:inline">Cat&apos;s Kitchen</span>
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/planner" className="text-muted-foreground hover:text-primary font-medium transition-colors">
                Planner
              </Link>
              <Link href="/assistant" className="text-muted-foreground hover:text-primary font-medium transition-colors">
                Chef
              </Link>
              <Link href="/recipes" className="text-muted-foreground hover:text-primary font-medium transition-colors">
                Recipes
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar key={avatarUrl || 'fallback'} className="h-10 w-10">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile picture" />}
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">Signed in as</p>
                  <p className="text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/recipes">My Recipes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/planner">Meal Plans</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
