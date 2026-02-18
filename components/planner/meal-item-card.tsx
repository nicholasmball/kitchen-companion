'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { MealItem } from '@/types'

interface MealItemCardProps {
  item: MealItem
  onEdit: (item: MealItem) => void
  onDelete: (id: string) => void
  completedSteps?: Set<number>
  onToggleStep?: (stepIndex: number) => void
}

const METHOD_LABELS: Record<string, string> = {
  oven: 'Oven',
  hob: 'Hob',
  grill: 'Grill',
  microwave: 'Microwave',
  air_fryer: 'Air Fryer',
  slow_cooker: 'Slow Cooker',
  steamer: 'Steamer',
  bbq: 'BBQ',
  other: 'Other',
}

export function MealItemCard({ item, onEdit, onDelete, completedSteps, onToggleStep }: MealItemCardProps) {
  const [viewOpen, setViewOpen] = useState(false)
  const totalTime = (item.prep_time_minutes || 0) + item.cook_time_minutes + (item.rest_time_minutes || 0)

  const steps = useMemo(() =>
    item.instructions
      ? item.instructions.split('\n').filter(line => line.trim())
      : [],
    [item.instructions]
  )
  const completedCount = completedSteps?.size ?? 0

  return (
    <>
      <Card
        className="hover-lift cursor-pointer"
        onClick={() => setViewOpen(true)}
      >
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{item.name}</h3>

              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">
                  {METHOD_LABELS[item.cooking_method] || item.cooking_method}
                </Badge>
                {item.temperature && (
                  <Badge variant="outline">
                    {item.temperature}°{item.temperature_unit}
                  </Badge>
                )}
                <Badge variant="outline">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {totalTime} min total
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground mt-2 space-x-3">
                {item.prep_time_minutes > 0 && (
                  <span>{item.prep_time_minutes}m prep</span>
                )}
                <span>{item.cook_time_minutes}m cook</span>
                {item.rest_time_minutes > 0 && (
                  <span>{item.rest_time_minutes}m rest</span>
                )}
              </div>

              {item.ingredients && item.ingredients.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {item.ingredients.length} ingredient{item.ingredients.length !== 1 ? 's' : ''}
                </p>
              )}

              {steps.length > 0 && completedSteps && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${(completedCount / steps.length) * 100}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-xs whitespace-nowrap",
                    completedCount === steps.length
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}>
                    {completedCount}/{steps.length}
                  </span>
                </div>
              )}

              {item.instructions && !completedSteps && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {item.instructions}
                </p>
              )}
            </div>

            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(item)
                }}
              >
                <EditIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(item.id)
                }}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{item.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cooking details */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">
                {METHOD_LABELS[item.cooking_method] || item.cooking_method}
              </Badge>
              {item.temperature && (
                <Badge variant="outline" className="text-sm">
                  {item.temperature}°{item.temperature_unit}
                </Badge>
              )}
            </div>

            {/* Time breakdown */}
            <div className="flex flex-wrap gap-3 justify-center">
              {item.prep_time_minutes > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 min-w-[80px] text-center">
                  <p className="text-2xl font-semibold">{item.prep_time_minutes}</p>
                  <p className="text-xs text-muted-foreground">min prep</p>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-3 min-w-[80px] text-center">
                <p className="text-2xl font-semibold">{item.cook_time_minutes}</p>
                <p className="text-xs text-muted-foreground">min cook</p>
              </div>
              {item.rest_time_minutes > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 min-w-[80px] text-center">
                  <p className="text-2xl font-semibold">{item.rest_time_minutes}</p>
                  <p className="text-xs text-muted-foreground">min rest</p>
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground text-center">
              Total: {totalTime} minutes
            </div>

            {/* Ingredients */}
            {item.ingredients && item.ingredients.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Ingredients ({item.ingredients.length})</h4>
                <ul className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  {item.ingredients.map((ing, i) => (
                    <li key={i} className="contents">
                      <span className="text-sm text-muted-foreground whitespace-nowrap py-0.5">
                        {ing.amount}{ing.unit ? ` ${ing.unit}` : ''}
                      </span>
                      <span className="text-sm py-0.5 border-b border-muted last:border-0">
                        {ing.item}
                        {ing.notes && (
                          <span className="text-muted-foreground italic"> ({ing.notes})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* View full recipe link */}
            {item.recipe_id && (
              <Link
                href={`/recipes/${item.recipe_id}`}
                className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                aria-label={`View full recipe: ${item.name}`}
                onClick={() => setViewOpen(false)}
              >
                View full recipe
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            )}

            {/* Instructions */}
            {item.instructions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Instructions</h4>
                  {steps.length > 0 && completedSteps && (
                    <span className={cn(
                      "text-sm",
                      completedCount === steps.length
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    )}>
                      {completedCount === steps.length
                        ? "All steps done!"
                        : `${completedCount} of ${steps.length} steps done`
                      }
                    </span>
                  )}
                </div>
                {steps.length > 0 && completedSteps && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${(completedCount / steps.length) * 100}%` }}
                    />
                  </div>
                )}
                {completedSteps && onToggleStep ? (
                  <div className="space-y-1">
                    {steps.map((line, i) => {
                      const isCompleted = completedSteps.has(i)
                      return (
                        <div
                          key={i}
                          role="checkbox"
                          aria-checked={isCompleted}
                          aria-label={`Step ${i + 1}: ${line.trim()}`}
                          tabIndex={0}
                          onClick={() => onToggleStep(i)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onToggleStep(i)
                            }
                          }}
                          className={cn(
                            "flex items-start gap-3 py-2.5 px-3 rounded-xl cursor-pointer transition-all duration-200 border-b border-muted last:border-0",
                            "active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                            isCompleted && "bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "shrink-0 mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                            isCompleted
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/40"
                          )}>
                            {isCompleted && <CheckIcon className="h-3.5 w-3.5 text-primary-foreground" />}
                          </div>
                          <span className={cn(
                            "text-sm leading-relaxed transition-all duration-200",
                            isCompleted && "opacity-50 line-through"
                          )}>
                            {line}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                    {item.instructions}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="space-y-2">
                <h4 className="font-medium">Notes</h4>
                <p className="text-sm text-muted-foreground">{item.notes}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setViewOpen(false)
                  onEdit(item)
                }}
              >
                <EditIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}
