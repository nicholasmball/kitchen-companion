'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C')
  const [measurementSystem, setMeasurementSystem] = useState<'metric' | 'imperial'>('metric')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
        .select('display_name, avatar_url, temperature_unit, measurement_system')
        .eq('id', user.id)
        .single()

      if (profile) {
        setDisplayName(profile.display_name || '')
        setAvatarUrl(profile.avatar_url || null)
        setTemperatureUnit(profile.temperature_unit || 'C')
        setMeasurementSystem(profile.measurement_system || 'metric')
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  const compressImage = useCallback((file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(file); return }

        // Crop to square from center, then resize to 256x256
        const size = Math.min(img.width, img.height)
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2

        canvas.width = 256
        canvas.height = 256
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256)

        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          0.85
        )
      }
      const reader = new FileReader()
      reader.onload = (e) => { img.src = e.target?.result as string }
      reader.readAsDataURL(file)
    })
  }, [])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed, 'avatar.jpg')

      const response = await fetch('/api/upload-profile-picture', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'Upload failed' })
        return
      }

      setAvatarUrl(result.url)
      setMessage({ type: 'success', text: 'Profile picture updated!' })
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatarUrl: result.url } }))
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload picture' })
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleAvatarRemove() {
    setUploadingAvatar(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const response = await fetch('/api/upload-profile-picture', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'Failed to remove picture' })
        return
      }

      setAvatarUrl(null)
      setMessage({ type: 'success', text: 'Profile picture removed' })
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatarUrl: null } }))
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove picture' })
    } finally {
      setUploadingAvatar(false)
    }
  }

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
        temperature_unit: temperatureUnit,
        measurement_system: measurementSystem,
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

            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-3 pb-2">
              <Avatar className="h-24 w-24 text-2xl">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile picture" />}
                <AvatarFallback>
                  {email.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? 'Uploading...' : avatarUrl ? 'Change picture' : 'Upload picture'}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAvatarRemove}
                    disabled={uploadingAvatar}
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

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

            {/* Cooking Preferences */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Cooking Preferences</h3>

              <div className="space-y-2">
                <Label htmlFor="temperatureUnit">Temperature unit</Label>
                <Select value={temperatureUnit} onValueChange={(v) => setTemperatureUnit(v as 'C' | 'F')}>
                  <SelectTrigger id="temperatureUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Celsius (&deg;C)</SelectItem>
                    <SelectItem value="F">Fahrenheit (&deg;F)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used as default for meal plans and the chef assistant
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurementSystem">Measurement system</Label>
                <Select value={measurementSystem} onValueChange={(v) => setMeasurementSystem(v as 'metric' | 'imperial')}>
                  <SelectTrigger id="measurementSystem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric (g, kg, ml, L)</SelectItem>
                    <SelectItem value="imperial">Imperial (oz, lb, cups)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used by the chef assistant and when importing recipes
                </p>
              </div>
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
