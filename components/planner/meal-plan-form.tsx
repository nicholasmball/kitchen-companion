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
  const [paddingMinutes, setPaddingMinutes] = useState<string>(() =>
    String(plan?.padding_minutes ?? 0)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Combine date and time into ISO string
    const serveDateTime = new Date(`${serveDate}T${serveTime}:00`)

    const padding = Math.max(0, Math.min(120, parseInt(paddingMinutes, 10) || 0))

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      serve_time: serveDateTime.toISOString(),
      padding_minutes: padding,
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

          {/* Buffer / contingency padding */}
          <div className="space-y-2 rounded-lg border border-dashed border-[#40916C]/40 bg-[#40916C]/5 p-3">
            <Label htmlFor="paddingMinutes">
              Buffer minutes <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="paddingMinutes"
                type="number"
                value={paddingMinutes}
                onChange={(e) => setPaddingMinutes(e.target.value)}
                min={0}
                max={120}
                inputMode="numeric"
                className="w-24 text-center font-bold"
              />
              <span className="text-sm font-semibold text-foreground">min of slack at the start</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Adds <strong>slack</strong> before cooking starts so a small interruption doesn&apos;t
              ruin the plan. Try <strong>10–15</strong> to start.
              {Number(paddingMinutes) > 0 && (
                <>
                  {' '}<em>Result:</em> cooking starts {Number(paddingMinutes)} min earlier than strictly needed.
                </>
              )}
            </p>
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
