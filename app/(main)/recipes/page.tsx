'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRecipes } from '@/hooks/use-recipes'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { RecipeImporter } from '@/components/recipes/recipe-importer'
import { EmptyStateWithMascot } from '@/components/shared/mascot'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function RecipesPage() {
  const router = useRouter()
  const { recipes, loading, error, toggleFavourite, deleteRecipe, createRecipe } = useRecipes()
  const [importerOpen, setImporterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterFavourites, setFilterFavourites] = useState(false)
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')

  const filteredRecipes = useMemo(() => {
    let result = [...recipes]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(searchLower) ||
          r.description?.toLowerCase().includes(searchLower) ||
          r.ingredients?.some((i) => i.item.toLowerCase().includes(searchLower)) ||
          r.tags?.some((t) => t.toLowerCase().includes(searchLower))
      )
    }

    // Favourites filter
    if (filterFavourites) {
      result = result.filter((r) => r.is_favourite)
    }

    // Difficulty filter
    if (filterDifficulty !== 'all') {
      result = result.filter((r) => r.difficulty === filterDifficulty)
    }

    // Course filter
    if (filterCourse !== 'all') {
      result = result.filter((r) => r.course === filterCourse)
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'name':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'quickest':
        result.sort((a, b) => (a.total_time_minutes || 999) - (b.total_time_minutes || 999))
        break
    }

    return result
  }, [recipes, search, filterFavourites, filterDifficulty, filterCourse, sortBy])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Recipes</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error loading recipes: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Recipes</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImporterOpen(true)}>
            <ImportIcon className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Link href="/recipes/new">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Recipe
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterFavourites ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterFavourites(!filterFavourites)}
          >
            <HeartIcon className={`h-4 w-4 mr-1 ${filterFavourites ? 'fill-current' : ''}`} />
            Favourites
          </Button>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="main">Main</SelectItem>
              <SelectItem value="side">Side</SelectItem>
              <SelectItem value="dessert">Dessert</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="quickest">Quickest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recipe Grid */}
      {filteredRecipes.length === 0 ? (
        <EmptyState search={search} hasRecipes={recipes.length > 0} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleFavourite={toggleFavourite}
              onDelete={deleteRecipe}
            />
          ))}
        </div>
      )}

      {/* Recipe Importer */}
      <RecipeImporter
        open={importerOpen}
        onOpenChange={setImporterOpen}
        onResult={async (data) => {
          // Create the recipe with imported data
          const recipe = await createRecipe({
            title: data.title || 'Imported Recipe',
            description: data.description || null,
            ingredients: data.ingredients || [],
            instructions: data.instructions || null,
            prep_time_minutes: data.prep_time_minutes || null,
            cook_time_minutes: data.cook_time_minutes || null,
            servings: data.servings || null,
            difficulty: data.difficulty || null,
            cuisine: data.cuisine || null,
            course: data.course || null,
            source_url: data.source_url || null,
          })
          if (recipe) {
            // Navigate to edit page so user can review/modify
            router.push(`/recipes/${recipe.id}/edit`)
          }
        }}
      />
    </div>
  )
}

function EmptyState({ search, hasRecipes }: { search: string; hasRecipes: boolean }) {
  if (search || hasRecipes) {
    return (
      <EmptyStateWithMascot
        title="Hmm, couldn't find that one"
        message="Try adjusting your search or filters - maybe the cat hid it somewhere?"
        size="sm"
      />
    )
  }

  return (
    <EmptyStateWithMascot
      title="Your recipe book is waiting!"
      message="Let's add your first recipe and start building your collection."
      action={
        <Link href="/recipes/new">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add your first recipe
          </Button>
        </Link>
      }
    />
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}
