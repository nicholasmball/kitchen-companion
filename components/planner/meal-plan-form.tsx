'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MealPlan } from '@/types'

interface MealPlanFormProps {
  plan?: MealPlan
  open: boolean
  onOpenChange: (open: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => Promise<MealPlan | null>
}

export function MealPlanForm({ plan, open, onOpenChange, onSubmit }: MealPlanFormProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(plan?.name || '')
  const [description, setDescription] = useState(plan?.description || '')
  const [serveDate, setServeDate] = useState(() => {
    if (plan?.serve_time) {
      return new Date(plan.serve_time).toISOString().split('T')[0]
    }
    return new Date().toISOString().split('T')[0]
  })
  const [serveTime, setServeTime] = useState(() => {
    if (plan?.serve_time) {
      const d = new Date(plan.serve_time)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }
    return '18:00' // Default to 6pm
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Combine date and time into ISO string
    const serveDateTime = new Date(`${serveDate}T${serveTime}:00`)

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      serve_time: serveDateTime.toISOString(),
      is_active: plan?.is_active ?? false,
    }

    const result = await onSubmit(data)
    setLoading(false)

    if (result) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Meal Plan' : 'New Meal Plan'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="planName">Plan Name *</Label>
            <Input
              id="planName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sunday Roast"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="planDescription">Description</Label>
            <Textarea
              id="planDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this meal..."
              rows={2}
            />
          </div>

          {/* Serve Time */}
          <div className="space-y-2">
            <Label>Serve Time *</Label>
            <p className="text-sm text-muted-foreground">
              When do you want everything ready?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="serveDate" className="sr-only">Date</Label>
                <Input
                  id="serveDate"
                  type="date"
                  value={serveDate}
                  onChange={(e) => setServeDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="serveTimeInput" className="sr-only">Time</Label>
                <Input
                  id="serveTimeInput"
                  type="time"
                  value={serveTime}
                  onChange={(e) => setServeTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Saving...' : plan ? 'Update' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
