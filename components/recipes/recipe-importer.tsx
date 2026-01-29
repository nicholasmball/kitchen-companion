'use client'

import { useState } from 'react'
import { ImageUpload } from '@/components/shared/image-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ParsedRecipe {
  title?: string
  description?: string
  ingredients?: Array<{ amount?: string; unit?: string; item: string; notes?: string }>
  instructions?: string
  prep_time_minutes?: number
  cook_time_minutes?: number
  servings?: number
  difficulty?: string
  cuisine?: string
  course?: string
  source_url?: string
}

interface RecipeImporterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (data: ParsedRecipe) => void
}

export function RecipeImporter({ open, onOpenChange, onResult }: RecipeImporterProps) {
  const [tab, setTab] = useState<'url' | 'image'>('url')
  const [url, setUrl] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ParsedRecipe | null>(null)

  const handleImportUrl = async () => {
    if (!url) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/parse-recipe-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to import recipe')
      }

      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipe')
    } finally {
      setLoading(false)
    }
  }

  const handleImportImage = async () => {
    if (!image) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/parse-recipe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to import recipe')
      }

      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipe')
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
    setUrl('')
    setImage(null)
    setResult(null)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Recipe</DialogTitle>
          <DialogDescription>
            Import a recipe from a URL or by uploading an image of a recipe.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'url' | 'image')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">From URL</TabsTrigger>
              <TabsTrigger value="image">From Image</TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Recipe URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/recipe"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Paste a link to a recipe from any website
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleImportUrl} disabled={!url || loading}>
                  {loading ? (
                    <>
                      <SpinnerIcon className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import'
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <ImageUpload
                onImageSelect={setImage}
                disabled={loading}
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleImportImage} disabled={!image || loading}>
                  {loading ? (
                    <>
                      <SpinnerIcon className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-lg">{result.title || 'Untitled Recipe'}</h3>

              {result.description && (
                <p className="text-sm text-muted-foreground">{result.description}</p>
              )}

              <div className="flex flex-wrap gap-2 text-sm">
                {result.prep_time_minutes && (
                  <span className="bg-background px-2 py-1 rounded">
                    Prep: {result.prep_time_minutes}m
                  </span>
                )}
                {result.cook_time_minutes && (
                  <span className="bg-background px-2 py-1 rounded">
                    Cook: {result.cook_time_minutes}m
                  </span>
                )}
                {result.servings && (
                  <span className="bg-background px-2 py-1 rounded">
                    Serves: {result.servings}
                  </span>
                )}
                {result.difficulty && (
                  <span className="bg-background px-2 py-1 rounded capitalize">
                    {result.difficulty}
                  </span>
                )}
              </div>

              {result.ingredients && result.ingredients.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Ingredients ({result.ingredients.length})</h4>
                  <ul className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                    {result.ingredients.slice(0, 5).map((ing, i) => (
                      <li key={i}>
                        {ing.amount} {ing.unit} {ing.item}
                        {ing.notes && ` (${ing.notes})`}
                      </li>
                    ))}
                    {result.ingredients.length > 5 && (
                      <li className="text-muted-foreground/60">
                        +{result.ingredients.length - 5} more...
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {result.instructions && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Instructions</h4>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {result.instructions}
                  </p>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Review looks good? You can edit the details after importing.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResult(null)}>
                Try Again
              </Button>
              <Button onClick={handleUseResult}>
                Use This Recipe
              </Button>
            </div>
          </div>
        )}
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
