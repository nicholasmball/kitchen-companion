'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Recipe } from '@/types'

interface RecipeCardProps {
  recipe: Recipe
  onToggleFavourite?: (id: string) => void
}

export function RecipeCard({ recipe, onToggleFavourite }: RecipeCardProps) {
  const totalTime = recipe.total_time_minutes

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="h-full overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
        {/* Image placeholder */}
        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <PlateIcon className="h-12 w-12" />
            </div>
          )}
          {/* Favourite button */}
          {onToggleFavourite && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-background"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavourite(recipe.id)
              }}
            >
              <HeartIcon
                className={`h-4 w-4 ${
                  recipe.is_favourite ? 'fill-[#C4897A] text-[#C4897A]' : ''
                }`}
              />
            </Button>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {recipe.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {totalTime && (
              <Badge variant="secondary" className="text-xs">
                <ClockIcon className="h-3 w-3 mr-1" />
                {totalTime} min
              </Badge>
            )}
            {recipe.difficulty && (
              <Badge variant="secondary" className="text-xs capitalize">
                {recipe.difficulty}
              </Badge>
            )}
            {recipe.cuisine && (
              <Badge variant="outline" className="text-xs">
                {recipe.cuisine}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function PlateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513c0 1.135.845 2.098 1.976 2.192 1.327.11 2.669.166 4.024.166 1.355 0 2.697-.056 4.024-.166C17.155 15.22 18 14.257 18 13.122v-2.513c0-1.135-.845-2.098-1.976-2.192A48.424 48.424 0 0 0 12 8.25Zm0 0V6.75m0 0c-1.355 0-2.697.056-4.024.166C6.845 7.01 6 7.973 6 9.108M12 6.75c1.355 0 2.697.056 4.024.166C17.155 7.01 18 7.973 18 9.108m-6 9.392v1.5m0-1.5c1.355 0 2.697-.056 4.024-.166C17.155 15.74 18 14.777 18 13.642m-6 2.108c-1.355 0-2.697-.056-4.024-.166C6.845 15.49 6 14.527 6 13.392" />
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
