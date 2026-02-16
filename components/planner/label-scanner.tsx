'use client'

import { useState } from 'react'
import { usePreferences } from '@/hooks/use-preferences'
import { ImageUpload } from '@/components/shared/image-upload'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ParsedLabel {
  name?: string
  cook_time_minutes?: number
  prep_time_minutes?: number
  temperature?: number
  temperature_unit?: string
  cooking_method?: string
  instructions?: string
}

interface LabelScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (data: ParsedLabel) => void
}

export function LabelScanner({ open, onOpenChange, onResult }: LabelScannerProps) {
  const { temperatureUnit } = usePreferences()
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ParsedLabel | null>(null)

  const handleScan = async () => {
    if (!image) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/parse-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, temperatureUnit }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to scan label')
      }

      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan label')
    } finally {
      setLoading(false)
    }
  }

  const handleUseResult = () => {
    if (result) {
      onResult(result)
      handleClose()
    }
  }

  const handleClose = () => {
    setImage(null)
    setResult(null)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan Food Label</DialogTitle>
          <DialogDescription>
            Take a photo or upload an image of a food label to automatically extract cooking instructions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              <ImageUpload
                onImageSelect={setImage}
                disabled={loading}
                showCameraCapture
              />

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleScan} disabled={!image || loading}>
                  {loading ? (
                    <>
                      <SpinnerIcon className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    'Scan Label'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <h3 className="font-medium">Extracted Information</h3>
                <dl className="text-sm space-y-1">
                  {result.name && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Name:</dt>
                      <dd>{result.name}</dd>
                    </div>
                  )}
                  {result.cook_time_minutes && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Cook Time:</dt>
                      <dd>{result.cook_time_minutes} minutes</dd>
                    </div>
                  )}
                  {result.prep_time_minutes && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Prep Time:</dt>
                      <dd>{result.prep_time_minutes} minutes</dd>
                    </div>
                  )}
                  {result.temperature && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Temperature:</dt>
                      <dd>{result.temperature}°{result.temperature_unit || 'C'}</dd>
                    </div>
                  )}
                  {result.cooking_method && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Method:</dt>
                      <dd className="capitalize">{result.cooking_method}</dd>
                    </div>
                  )}
                  {result.instructions && (
                    <div>
                      <dt className="text-muted-foreground mb-1">Instructions:</dt>
                      <dd className="text-xs bg-background p-2 rounded">{result.instructions}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResult(null)}>
                  Scan Again
                </Button>
                <Button onClick={handleUseResult}>
                  Use This Information
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
