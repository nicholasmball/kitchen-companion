'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LabelScanner } from './label-scanner'
import type { MealItem } from '@/types'

interface MealItemFormProps {
  item?: MealItem
  open: boolean
  onOpenChange: (open: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => Promise<MealItem | null>
}

const COOKING_METHODS = [
  { value: 'oven', label: 'Oven' },
  { value: 'hob', label: 'Hob/Stovetop' },
  { value: 'grill', label: 'Grill' },
  { value: 'microwave', label: 'Microwave' },
  { value: 'air_fryer', label: 'Air Fryer' },
  { value: 'slow_cooker', label: 'Slow Cooker' },
  { value: 'steamer', label: 'Steamer' },
  { value: 'bbq', label: 'BBQ' },
  { value: 'other', label: 'Other' },
]

export function MealItemForm({ item, open, onOpenChange, onSubmit }: MealItemFormProps) {
  const [loading, setLoading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [name, setName] = useState(item?.name || '')
  const [cookTime, setCookTime] = useState(item?.cook_time_minutes?.toString() || '')
  const [prepTime, setPrepTime] = useState(item?.prep_time_minutes?.toString() || '')
  const [restTime, setRestTime] = useState(item?.rest_time_minutes?.toString() || '')
  const [temperature, setTemperature] = useState(item?.temperature?.toString() || '')
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>(item?.temperature_unit || 'C')
  const [cookingMethod, setCookingMethod] = useState<string>(item?.cooking_method || 'oven')
  const [instructions, setInstructions] = useState(item?.instructions || '')
  const [notes, setNotes] = useState(item?.notes || '')

  // Sync state with item prop when it changes (for editing existing items)
  useEffect(() => {
    if (item) {
      setName(item.name || '')
      setCookTime(item.cook_time_minutes?.toString() || '')
      setPrepTime(item.prep_time_minutes?.toString() || '')
      setRestTime(item.rest_time_minutes?.toString() || '')
      setTemperature(item.temperature?.toString() || '')
      setTemperatureUnit(item.temperature_unit || 'C')
      setCookingMethod(item.cooking_method || 'oven')
      setInstructions(item.instructions || '')
      setNotes(item.notes || '')
    } else {
      // Reset form when creating new item
      setName('')
      setCookTime('')
      setPrepTime('')
      setRestTime('')
      setTemperature('')
      setTemperatureUnit('C')
      setCookingMethod('oven')
      setInstructions('')
      setNotes('')
    }
  }, [item])

  const handleScanResult = (data: {
    name?: string
    cook_time_minutes?: number
    prep_time_minutes?: number
    temperature?: number
    temperature_unit?: string
    cooking_method?: string
    instructions?: string
  }) => {
    if (data.name) setName(data.name)
    if (data.cook_time_minutes) setCookTime(data.cook_time_minutes.toString())
    if (data.prep_time_minutes) setPrepTime(data.prep_time_minutes.toString())
    if (data.temperature) setTemperature(data.temperature.toString())
    if (data.temperature_unit) setTemperatureUnit(data.temperature_unit as 'C' | 'F')
    if (data.cooking_method) setCookingMethod(data.cooking_method)
    if (data.instructions) setInstructions(data.instructions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const data = {
      name: name.trim(),
      cook_time_minutes: parseInt(cookTime) || 0,
      prep_time_minutes: parseInt(prepTime) || 0,
      rest_time_minutes: parseInt(restTime) || 0,
      temperature: temperature ? parseInt(temperature) : null,
      temperature_unit: temperatureUnit,
      cooking_method: cookingMethod,
      instructions: instructions.trim() || null,
      notes: notes.trim() || null,
    }

    const result = await onSubmit(data)
    setLoading(false)

    if (result) {
      onOpenChange(false)
      // Reset form if it was a new item
      if (!item) {
        setName('')
        setCookTime('')
        setPrepTime('')
        setRestTime('')
        setTemperature('')
        setInstructions('')
        setNotes('')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scan Label Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setScannerOpen(true)}
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            Scan Food Label
          </Button>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Roast Chicken"
              required
            />
          </div>

          {/* Cooking Method */}
          <div className="space-y-2">
            <Label>Cooking Method</Label>
            <Select value={cookingMethod} onValueChange={setCookingMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COOKING_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <div className="flex gap-2">
              <Input
                id="temperature"
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="180"
                className="flex-1"
              />
              <Select value={temperatureUnit} onValueChange={(v) => setTemperatureUnit(v as 'C' | 'F')}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">°C</SelectItem>
                  <SelectItem value="F">°F</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep (min)</Label>
              <Input
                id="prepTime"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="10"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookTime">Cook (min) *</Label>
              <Input
                id="cookTime"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="60"
                min="1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restTime">Rest (min)</Label>
              <Input
                id="restTime"
                type="number"
                value={restTime}
                onChange={(e) => setRestTime(e.target.value)}
                placeholder="15"
                min="0"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any specific cooking instructions..."
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !cookTime}>
              {loading ? 'Saving...' : item ? 'Update' : 'Add Item'}
            </Button>
          </div>
        </form>

        {/* Label Scanner */}
        <LabelScanner
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onResult={handleScanResult}
        />
      </DialogContent>
    </Dialog>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  )
}
