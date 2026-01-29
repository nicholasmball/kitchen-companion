'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useMealPlans } from '@/hooks/use-meal-plan'
import { useTimers } from '@/hooks/use-timers'
import { calculateTimeline, getEventColor } from '@/lib/timing-calculator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function ActivePlanWidget() {
  const { activePlan, loading, fetchActivePlan } = useMealPlans({ initialFetch: false })

  // Fetch active plan on mount
  useEffect(() => {
    fetchActivePlan()
  }, [fetchActivePlan])

  // Calculate timeline
  const timeline = useMemo(() => {
    if (!activePlan?.serve_time || !activePlan.meal_items?.length) return []
    return calculateTimeline(activePlan.meal_items, new Date(activePlan.serve_time))
  }, [activePlan])

  const serveTime = activePlan?.serve_time ? new Date(activePlan.serve_time) : null

  // Use the timer hook for countdown and notifications
  const { now, nextEvent, currentEvent, timeUntilNext } = useTimers({
    events: timeline,
    serveTime,
    enabled: !!activePlan,
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="h-6 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!activePlan) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </span>
            No Active Meal Plan
          </CardTitle>
          <CardDescription>
            Start planning your next meal to see your cooking timeline here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/planner">
            <Button>Create Meal Plan</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const planServeTime = new Date(activePlan.serve_time!)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <FlameIcon className="h-4 w-4 text-primary" />
              </span>
              {activePlan.name}
            </CardTitle>
            <CardDescription className="mt-1">
              Serving at {planServeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </CardDescription>
          </div>
          <Link href={`/planner/${activePlan.id}`}>
            <Button variant="outline" size="sm">View Plan</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current action alert */}
        {currentEvent && (
          <div className={`p-3 rounded-lg border-2 border-primary bg-primary/5 animate-pulse`}>
            <div className="flex items-center gap-2 text-primary font-medium">
              <BellIcon className="h-4 w-4" />
              NOW: {currentEvent.description}
            </div>
          </div>
        )}

        {/* Next action */}
        {nextEvent && (
          <div className={`p-4 rounded-lg border ${getEventColor(nextEvent.type)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next up</p>
                <p className="font-medium">{nextEvent.description}</p>
                {nextEvent.temperature && (
                  <p className="text-sm">
                    {nextEvent.temperature}°{nextEvent.temperatureUnit}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">
                  {timeUntilNext && formatCountdown(timeUntilNext)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {nextEvent.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick timeline preview */}
        {timeline.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {timeline.slice(0, 6).map((event, i) => {
              const isPast = event.time.getTime() <= now.getTime()
              const isNext = event === nextEvent
              return (
                <Badge
                  key={event.id}
                  variant={isNext ? 'default' : 'secondary'}
                  className={`shrink-0 ${isPast ? 'opacity-50' : ''}`}
                >
                  {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )
            })}
            {timeline.length > 6 && (
              <Badge variant="outline" className="shrink-0">
                +{timeline.length - 6} more
              </Badge>
            )}
          </div>
        )}

        {/* All done state */}
        {!nextEvent && timeline.length > 0 && (
          <div className="text-center py-4">
            <p className="text-lg font-medium text-primary">All done! Time to serve!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatCountdown(time: { hours: number; minutes: number; seconds: number; isPast: boolean }): string {
  if (time.isPast) return 'Now!'
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m`
  }
  if (time.minutes > 0) {
    return `${time.minutes}m ${time.seconds}s`
  }
  return `${time.seconds}s`
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3-5.108 8.25 8.25 0 0 1 3.362.72Z" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  )
}
