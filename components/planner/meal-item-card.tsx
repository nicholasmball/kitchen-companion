'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MealItem } from '@/types'

interface MealItemCardProps {
  item: MealItem
  onEdit: (item: MealItem) => void
  onDelete: (id: string) => void
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

export function MealItemCard({ item, onEdit, onDelete }: MealItemCardProps) {
  const totalTime = (item.prep_time_minutes || 0) + item.cook_time_minutes + (item.rest_time_minutes || 0)

  return (
    <Card>
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

            {item.instructions && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {item.instructions}
              </p>
            )}
          </div>

          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
              <EditIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
