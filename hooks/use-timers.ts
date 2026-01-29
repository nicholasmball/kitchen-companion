'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimelineEvent } from '@/types'
import { useNotifications } from './use-notifications'

interface TimerState {
  events: TimelineEvent[]
  serveTime: Date | null
  notifiedEvents: Set<string>
  warningEvents: Set<string> // Events warned 5 mins before
}

interface UseTimersOptions {
  events: TimelineEvent[]
  serveTime: Date | null
  enabled?: boolean
}

export function useTimers({ events, serveTime, enabled = true }: UseTimersOptions) {
  const { notify, isGranted } = useNotifications()
  const [now, setNow] = useState(new Date())
  const stateRef = useRef<TimerState>({
    events: [],
    serveTime: null,
    notifiedEvents: new Set(),
    warningEvents: new Set(),
  })

  // Update time every second
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [enabled])

  // Update ref when events change
  useEffect(() => {
    // If events changed (different serve time or items), reset notifications
    const eventsChanged =
      stateRef.current.serveTime?.getTime() !== serveTime?.getTime() ||
      stateRef.current.events.length !== events.length

    if (eventsChanged) {
      stateRef.current = {
        events,
        serveTime,
        notifiedEvents: new Set(),
        warningEvents: new Set(),
      }
    }
  }, [events, serveTime])

  // Check for events that need notifications
  useEffect(() => {
    if (!enabled || !isGranted || events.length === 0) return

    const nowTime = now.getTime()
    const fiveMinutes = 5 * 60 * 1000

    events.forEach((event) => {
      const eventTime = event.time.getTime()
      const eventId = event.id
      const timeUntil = eventTime - nowTime

      // Warning notification (5 minutes before)
      if (
        timeUntil > 0 &&
        timeUntil <= fiveMinutes &&
        !stateRef.current.warningEvents.has(eventId)
      ) {
        stateRef.current.warningEvents.add(eventId)
        notify({
          title: 'Coming up in 5 minutes',
          body: event.description,
          tag: `warning-${eventId}`,
          playSound: 'gentle',
        })
      }

      // Main notification (at time)
      if (
        timeUntil <= 0 &&
        timeUntil > -60000 && // Within last minute
        !stateRef.current.notifiedEvents.has(eventId)
      ) {
        stateRef.current.notifiedEvents.add(eventId)
        notify({
          title: 'Time to act!',
          body: event.description,
          tag: `action-${eventId}`,
          playSound: 'urgent',
          requireInteraction: true,
        })
      }
    })
  }, [now, events, enabled, isGranted, notify])

  // Find next upcoming event
  const nextEvent = events.find((e) => e.time.getTime() > now.getTime()) || null

  // Find most recent event (within last 5 minutes)
  const currentEvent = (() => {
    const fiveMinutesAgo = now.getTime() - 5 * 60 * 1000
    const recentEvents = events.filter((e) => {
      const eventTime = e.time.getTime()
      return eventTime <= now.getTime() && eventTime > fiveMinutesAgo
    })
    // Return the most recent one (last in the filtered list since events are sorted chronologically)
    return recentEvents.length > 0 ? recentEvents[recentEvents.length - 1] : null
  })()

  // Calculate time until next event
  const getTimeUntilNext = useCallback(() => {
    if (!nextEvent) return null

    const diff = nextEvent.time.getTime() - now.getTime()
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, isPast: true }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { hours, minutes, seconds, isPast: false }
  }, [nextEvent, now])

  // Get progress through timeline (0-100)
  const progress = (() => {
    if (events.length === 0) return 0

    const firstTime = events[0].time.getTime()
    const lastTime = events[events.length - 1].time.getTime()
    const total = lastTime - firstTime

    if (total === 0) return now.getTime() >= firstTime ? 100 : 0

    const elapsed = now.getTime() - firstTime
    return Math.max(0, Math.min(100, (elapsed / total) * 100))
  })()

  // Count completed events
  const completedCount = events.filter((e) => e.time.getTime() <= now.getTime()).length

  return {
    now,
    nextEvent,
    currentEvent,
    timeUntilNext: getTimeUntilNext(),
    progress,
    completedCount,
    totalCount: events.length,
    isComplete: completedCount === events.length && events.length > 0,
  }
}
