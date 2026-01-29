'use client'

import { useTimers } from '@/hooks/use-timers'
import { useNotifications } from '@/hooks/use-notifications'
import { CelebrationMascot } from '@/components/shared/mascot'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { TimelineEvent } from '@/types'

interface TimerDisplayProps {
  events: TimelineEvent[]
  serveTime: Date | null
}

export function TimerDisplay({ events, serveTime }: TimerDisplayProps) {
  const { permission, requestPermission, isSupported } = useNotifications()
  const {
    nextEvent,
    currentEvent,
    timeUntilNext,
    progress,
    completedCount,
    totalCount,
    isComplete,
  } = useTimers({ events, serveTime, enabled: true })

  if (events.length === 0) {
    return null
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedCount} / {totalCount} steps</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Notification status */}
        {isSupported && permission !== 'granted' && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
            <span className="text-sm text-muted-foreground">
              {permission === 'denied' ? 'Notifications blocked' : 'Notifications off'}
            </span>
            {permission !== 'denied' && (
              <Button size="sm" variant="outline" onClick={requestPermission}>
                Enable
              </Button>
            )}
          </div>
        )}

        {/* Current action */}
        {currentEvent && (
          <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
              <span className="text-sm font-medium text-primary">NOW</span>
            </div>
            <p className="font-semibold">{currentEvent.description}</p>
            {currentEvent.temperature && (
              <p className="text-sm text-muted-foreground">
                {currentEvent.temperature}°{currentEvent.temperatureUnit}
              </p>
            )}
          </div>
        )}

        {/* Next up */}
        {nextEvent && !currentEvent && (
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next up</p>
                <p className="font-semibold">{nextEvent.description}</p>
                {nextEvent.temperature && (
                  <p className="text-sm text-muted-foreground">
                    {nextEvent.temperature}°{nextEvent.temperatureUnit}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold tabular-nums">
                  {timeUntilNext && formatCountdown(timeUntilNext)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {nextEvent.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Complete state */}
        {isComplete && (
          <CelebrationMascot message="All done! Time to serve!" />
        )}

        {/* Upcoming events preview */}
        {!isComplete && events.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Coming up</p>
            <div className="space-y-1">
              {events
                .filter((e) => e.time.getTime() > Date.now())
                .slice(0, 3)
                .map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                  >
                    <span className="truncate">{event.description}</span>
                    <Badge variant="outline" className="shrink-0 ml-2">
                      {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  </div>
                ))}
            </div>
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

