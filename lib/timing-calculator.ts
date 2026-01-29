import type { MealItem, TimelineEvent, TimelineEventType } from '@/types'

/**
 * Calculate the cooking timeline from meal items and a target serve time.
 *
 * For each item, we calculate backwards from the serve time:
 * - serve_time = target serve time
 * - rest_end = serve_time (rest ends when we serve)
 * - rest_start = serve_time - rest_time (cook_end)
 * - cook_end = serve_time - rest_time
 * - cook_start = cook_end - cook_time
 * - prep_start = cook_start - prep_time
 */
export function calculateTimeline(
  items: MealItem[],
  serveTime: Date
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const item of items) {
    const serveMs = serveTime.getTime()
    const restMs = (item.rest_time_minutes || 0) * 60 * 1000
    const cookMs = item.cook_time_minutes * 60 * 1000
    const prepMs = (item.prep_time_minutes || 0) * 60 * 1000

    // Calculate times working backwards from serve time
    const restEndTime = serveMs
    const cookEndTime = serveMs - restMs
    const cookStartTime = cookEndTime - cookMs
    const prepStartTime = cookStartTime - prepMs

    // Add prep event if there's prep time
    if (item.prep_time_minutes && item.prep_time_minutes > 0) {
      events.push({
        id: `${item.id}-prep`,
        mealItemId: item.id,
        mealItemName: item.name,
        type: 'prep_start',
        time: new Date(prepStartTime),
        description: `Start prepping ${item.name}`,
      })
    }

    // Add cook start event
    events.push({
      id: `${item.id}-cook-start`,
      mealItemId: item.id,
      mealItemName: item.name,
      type: 'cook_start',
      time: new Date(cookStartTime),
      description: getCookStartDescription(item),
      temperature: item.temperature || undefined,
      temperatureUnit: item.temperature_unit,
      cookingMethod: item.cooking_method,
    })

    // Add cook end event
    events.push({
      id: `${item.id}-cook-end`,
      mealItemId: item.id,
      mealItemName: item.name,
      type: 'cook_end',
      time: new Date(cookEndTime),
      description: `Take ${item.name} out`,
    })

    // Add rest event if there's rest time
    if (item.rest_time_minutes && item.rest_time_minutes > 0) {
      events.push({
        id: `${item.id}-rest`,
        mealItemId: item.id,
        mealItemName: item.name,
        type: 'rest_start',
        time: new Date(cookEndTime),
        description: `Rest ${item.name} for ${item.rest_time_minutes} minutes`,
      })
    }
  }

  // Add final serve event
  events.push({
    id: 'serve',
    mealItemId: 'all',
    mealItemName: 'All items',
    type: 'serve',
    time: serveTime,
    description: 'Serve!',
  })

  // Sort by time
  events.sort((a, b) => a.time.getTime() - b.time.getTime())

  return events
}

function getCookStartDescription(item: MealItem): string {
  const method = item.cooking_method || 'cook'
  const temp = item.temperature
  const unit = item.temperature_unit || 'C'

  let methodVerb = 'Start cooking'
  switch (method) {
    case 'oven':
      methodVerb = 'Put in oven'
      break
    case 'hob':
      methodVerb = 'Put on hob'
      break
    case 'grill':
      methodVerb = 'Put under grill'
      break
    case 'microwave':
      methodVerb = 'Put in microwave'
      break
    case 'air_fryer':
      methodVerb = 'Put in air fryer'
      break
    case 'slow_cooker':
      methodVerb = 'Put in slow cooker'
      break
    case 'steamer':
      methodVerb = 'Put in steamer'
      break
    case 'bbq':
      methodVerb = 'Put on BBQ'
      break
  }

  let description = `${methodVerb}: ${item.name}`
  if (temp) {
    description += ` at ${temp}°${unit}`
  }

  return description
}

/**
 * Get the next upcoming event from the timeline
 */
export function getNextEvent(events: TimelineEvent[]): TimelineEvent | null {
  const now = new Date()
  return events.find((e) => e.time.getTime() > now.getTime()) || null
}

/**
 * Get all events that should have happened but might have been missed
 */
export function getMissedEvents(events: TimelineEvent[], lastChecked: Date): TimelineEvent[] {
  const now = new Date()
  return events.filter(
    (e) => e.time.getTime() > lastChecked.getTime() && e.time.getTime() <= now.getTime()
  )
}

/**
 * Get the earliest start time (when user needs to begin)
 */
export function getStartTime(events: TimelineEvent[]): Date | null {
  if (events.length === 0) return null
  return events[0].time
}

/**
 * Calculate time until an event
 */
export function getTimeUntil(eventTime: Date): {
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isPast: boolean
} {
  const now = new Date()
  const diff = eventTime.getTime() - now.getTime()
  const isPast = diff < 0
  const absDiff = Math.abs(diff)

  const totalSeconds = Math.floor(absDiff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { hours, minutes, seconds, totalSeconds, isPast }
}

/**
 * Format time until as a human-readable string
 */
export function formatTimeUntil(eventTime: Date): string {
  const { hours, minutes, isPast } = getTimeUntil(eventTime)

  if (isPast) {
    if (hours > 0) return `${hours}h ${minutes}m ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'now'
  }

  if (hours > 0) return `in ${hours}h ${minutes}m`
  if (minutes > 0) return `in ${minutes}m`
  return 'now'
}

/**
 * Get a color for an event type (for UI)
 */
export function getEventColor(type: TimelineEventType): string {
  switch (type) {
    case 'prep_start':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'cook_start':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'cook_end':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'rest_start':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'serve':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

/**
 * Get an icon name for an event type
 */
export function getEventIcon(type: TimelineEventType): string {
  switch (type) {
    case 'prep_start':
      return 'knife'
    case 'cook_start':
      return 'flame'
    case 'cook_end':
      return 'timer'
    case 'rest_start':
      return 'pause'
    case 'serve':
      return 'utensils'
    default:
      return 'clock'
  }
}
