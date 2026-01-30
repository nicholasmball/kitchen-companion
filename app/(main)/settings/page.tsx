'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (profile) {
        setDisplayName(profile.display_name || '')
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage({ type: 'error', text: 'Not authenticated' })
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName,
        updated_at: new Date().toISOString()
      })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Settings saved!' })
      router.refresh()
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            {message && (
              <div className={`p-3 text-sm rounded-lg ${
                message.type === 'success'
                  ? 'text-green-800 bg-green-100 border border-green-200 dark:text-green-200 dark:bg-green-900/30 dark:border-green-800'
                  : 'text-destructive bg-destructive/10 border border-destructive/20'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This is how you&apos;ll be greeted on the dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
