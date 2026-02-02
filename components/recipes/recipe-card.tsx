'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AddToPlanDialog } from '@/components/planner/add-to-plan-dialog'
import type { Recipe } from '@/types'

interface RecipeCardProps {
  recipe: Recipe
  onToggleFavourite?: (id: string) => void
  onDelete?: (id: string) => void
}

export function RecipeCard({ recipe, onToggleFavourite, onDelete }: RecipeCardProps) {
  const totalTime = recipe.total_time_minutes
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAddToPlanDialog, setShowAddToPlanDialog] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleDelete = () => {
    if (onDelete) {
      onDelete(recipe.id)
    }
    setShowDeleteDialog(false)
  }

  return (
    <>
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
            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-1">
              {onToggleFavourite && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-background/80 hover:bg-background"
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
              {onDelete && (
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-background/80 hover:bg-background"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    >
                      <MoreIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem asChild>
                      <Link href={`/recipes/${recipe.id}/edit`}>
                        <EditIcon className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        setDropdownOpen(false)
                        setShowAddToPlanDialog(true)
                      }}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Add to Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.preventDefault()
                        setDropdownOpen(false)
                        setShowDeleteDialog(true)
                      }}
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{recipe.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddToPlanDialog
        open={showAddToPlanDialog}
        onOpenChange={setShowAddToPlanDialog}
        recipe={recipe}
      />
    </>
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
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
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

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}
