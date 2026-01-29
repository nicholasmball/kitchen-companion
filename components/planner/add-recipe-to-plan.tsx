'use client'

import { useState, useMemo } from 'react'
import { useRecipes } from '@/hooks/use-recipes'
import { RecipeImporter } from '@/components/recipes/recipe-importer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { MealItem } from '@/types'

interface AddRecipeToPlanProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: Omit<MealItem, 'id' | 'meal_plan_id' | 'created_at' | 'sort_order'>) => Promise<void>
}

export function AddRecipeToPlan({ open, onOpenChange, onAdd }: AddRecipeToPlanProps) {
  const { recipes, loading } = useRecipes()
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [importerOpen, setImporterOpen] = useState(false)

  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return recipes
    const lower = search.toLowerCase()
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(lower) ||
        r.cuisine?.toLowerCase().includes(lower) ||
        r.course?.toLowerCase().includes(lower)
    )
  }, [recipes, search])

  const handleSelectRecipe = async (recipe: typeof recipes[0]) => {
    setAdding(true)
    try {
      await onAdd({
        name: recipe.title,
        cook_time_minutes: recipe.cook_time_minutes || 30,
        prep_time_minutes: recipe.prep_time_minutes || 0,
        rest_time_minutes: recipe.rest_time_minutes || 0,
        temperature: null,
        temperature_unit: 'C',
        cooking_method: 'oven',
        instructions: recipe.instructions || null,
        notes: `From recipe: ${recipe.title}`,
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to add recipe:', err)
    } finally {
      setAdding(false)
    }
  }

  const handleImportResult = async (data: {
    title?: string
    instructions?: string
    prep_time_minutes?: number
    cook_time_minutes?: number
    rest_time_minutes?: number
  }) => {
    setAdding(true)
    try {
      await onAdd({
        name: data.title || 'Imported Recipe',
        cook_time_minutes: data.cook_time_minutes || 30,
        prep_time_minutes: data.prep_time_minutes || 0,
        rest_time_minutes: data.rest_time_minutes || 0,
        temperature: null,
        temperature_unit: 'C',
        cooking_method: 'oven',
        instructions: data.instructions || null,
        notes: 'Imported from URL/image',
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to add imported recipe:', err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Recipe to Plan</DialogTitle>
            <DialogDescription>
              Choose from your saved recipes or import a new one.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="saved" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="saved">My Recipes</TabsTrigger>
              <TabsTrigger value="import">Import New</TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="mb-3">
                <Input
                  placeholder="Search recipes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {search ? 'No recipes found' : 'No saved recipes yet'}
                  </div>
                ) : (
                  filteredRecipes.map((recipe) => (
                    <Card
                      key={recipe.id}
                      className="cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => !adding && handleSelectRecipe(recipe)}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{recipe.title}</p>
                            <div className="flex gap-2 mt-1">
                              {recipe.cook_time_minutes && (
                                <span className="text-xs text-muted-foreground">
                                  {recipe.cook_time_minutes}m cook
                                </span>
                              )}
                              {recipe.cuisine && (
                                <Badge variant="outline" className="text-xs">
                                  {recipe.cuisine}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {recipe.is_favourite && (
                            <HeartIcon className="h-4 w-4 text-[#C4897A] fill-[#C4897A]" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="import" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Import a recipe from a URL or image, and add it directly to this meal plan.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col"
                  onClick={() => setImporterOpen(true)}
                >
                  <LinkIcon className="h-6 w-6 mb-2" />
                  From URL
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col"
                  onClick={() => setImporterOpen(true)}
                >
                  <CameraIcon className="h-6 w-6 mb-2" />
                  From Image
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <RecipeImporter
        open={importerOpen}
        onOpenChange={setImporterOpen}
        onResult={handleImportResult}
      />
    </>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  )
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
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
