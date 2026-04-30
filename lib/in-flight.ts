import type { MealItem, TimelineEvent } from '@/types'

/**
 * Detects items that should be considered "in flight" — physically already
 * cooking — at a given moment, so push-back doesn't shift their finish times.
 *
 * Two-signal detection:
 *   - The item has a `cook_end_override` set in the future (strongest signal —
 *     someone explicitly pinned this finish time, e.g. via push-back).
 *   - The item's scheduled `cook_start` event is in the past AND its
 *     `cook_end` is still in the future (heuristic — assumes cook started on
 *     schedule).
 */
export function isItemInFlight(
  item: Pick<MealItem, 'id' | 'cook_end_override'>,
  scheduledCookStart: Date | null,
  scheduledCookEnd: Date | null,
  now: Date = new Date()
): boolean {
  if (item.cook_end_override) {
    const overrideMs = new Date(item.cook_end_override).getTime()
    if (overrideMs > now.getTime()) return true
  }
  if (
    scheduledCookStart &&
    scheduledCookEnd &&
    scheduledCookStart.getTime() <= now.getTime() &&
    scheduledCookEnd.getTime() > now.getTime()
  ) {
    return true
  }
  return false
}

/**
 * Find each meal item's currently in-flight status by walking a base timeline
 * (one without push-back / pause adjustments). Returns a Map<itemId, info>.
 *
 * `scheduledCookEnd` is the value we'd pin if push-back were invoked right
 * now — used by the push-back handler to populate `cook_end_override`.
 */
export function findInFlightItems(
  events: TimelineEvent[],
  now: Date = new Date()
): Map<string, { scheduledCookStart: Date; scheduledCookEnd: Date }> {
  const cookStarts = new Map<string, Date>()
  const cookEnds = new Map<string, Date>()
  for (const e of events) {
    if (e.type === 'cook_start') cookStarts.set(e.mealItemId, e.time)
    if (e.type === 'cook_end') cookEnds.set(e.mealItemId, e.time)
  }
  const inFlight = new Map<string, { scheduledCookStart: Date; scheduledCookEnd: Date }>()
  for (const [itemId, start] of cookStarts.entries()) {
    const end = cookEnds.get(itemId)
    if (!end) continue
    if (start.getTime() <= now.getTime() && end.getTime() > now.getTime()) {
      inFlight.set(itemId, { scheduledCookStart: start, scheduledCookEnd: end })
    }
  }
  return inFlight
}

/**
 * Apply per-item `cook_end_override` to a freshly-calculated timeline.
 *
 * For each item with a non-null override that is still in the future:
 *   - cook_end → override
 *   - rest_start → override (matches cook_end semantics)
 *   - cook_start → override - cook_time (so the displayed start matches the
 *     anchored end, even if calculateTimeline computed a later start)
 *   - prep_start → derived cook_start - prep_time
 *
 * Overrides whose time is in the past are ignored (item is effectively done).
 */
export function applyCookEndOverrides(
  events: TimelineEvent[],
  items: Pick<MealItem, 'id' | 'cook_end_override' | 'cook_time_minutes' | 'prep_time_minutes'>[],
  now: Date = new Date()
): TimelineEvent[] {
  const overrideById = new Map<string, { newEnd: Date; cookStart: Date; prepStart: Date }>()
  for (const item of items) {
    if (!item.cook_end_override) continue
    const newEnd = new Date(item.cook_end_override)
    if (newEnd.getTime() <= now.getTime()) continue
    const cookStartMs = newEnd.getTime() - item.cook_time_minutes * 60 * 1000
    const prepStartMs = cookStartMs - (item.prep_time_minutes || 0) * 60 * 1000
    overrideById.set(item.id, {
      newEnd,
      cookStart: new Date(cookStartMs),
      prepStart: new Date(prepStartMs),
    })
  }
  if (overrideById.size === 0) return events
  return events.map((e) => {
    const override = overrideById.get(e.mealItemId)
    if (!override) return e
    switch (e.type) {
      case 'prep_start':
        return { ...e, time: override.prepStart }
      case 'cook_start':
        return { ...e, time: override.cookStart }
      case 'cook_end':
      case 'rest_start':
        return { ...e, time: override.newEnd }
      default:
        return e
    }
  })
}

/**
 * Compute hot-hold gaps for a plan after push-back. An item has a "hot-hold
 * gap" when its anchored cook_end (+ rest) finishes before the new serve
 * time — the cook will need to keep it warm until serving.
 */
export interface HotHoldGap {
  mealItemId: string
  mealItemName: string
  /** Minutes the item will need to wait between finishing and serve. */
  gapMinutes: number
}

export function computeHotHoldGaps(
  events: TimelineEvent[],
  serveTime: Date
): HotHoldGap[] {
  const gaps: HotHoldGap[] = []
  const seen = new Set<string>()
  for (const e of events) {
    if (e.type !== 'cook_end' && e.type !== 'rest_start') continue
    if (seen.has(e.mealItemId)) continue
    const gapMs = serveTime.getTime() - e.time.getTime()
    const gapMinutes = Math.round(gapMs / 60000)
    if (gapMinutes >= 5) {
      gaps.push({
        mealItemId: e.mealItemId,
        mealItemName: e.mealItemName,
        gapMinutes,
      })
      seen.add(e.mealItemId)
    }
  }
  return gaps
}
