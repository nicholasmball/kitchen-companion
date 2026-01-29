'use client'

import Link from 'next/link'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-semibold text-lg">
            Kitchen Companion
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/planner" className="text-muted-foreground hover:text-foreground transition-colors">
                Planner
              </Link>
              <Link href="/assistant" className="text-muted-foreground hover:text-foreground transition-colors">
                Chef
              </Link>
              <Link href="/recipes" className="text-muted-foreground hover:text-foreground transition-colors">
                Recipes
              </Link>
            </nav>
          )}
        </div>

        <div>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
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
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
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
