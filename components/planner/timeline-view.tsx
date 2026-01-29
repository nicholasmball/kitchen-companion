'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TimelineEvent } from '@/types'
import { getTimeUntil, formatTimeUntil, getEventColor } from '@/lib/timing-calculator'

interface TimelineViewProps {
  events: TimelineEvent[]
  serveTime: Date
}

export function TimelineView({ events, serveTime }: TimelineViewProps) {
  const [now, setNow] = useState(new Date())

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Add items to your meal plan to see the cooking timeline.
        </CardContent>
      </Card>
    )
  }

  // Find next upcoming event
  const nextEventIndex = events.findIndex((e) => e.time.getTime() > now.getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cooking Timeline</span>
          <Badge variant="outline" className="font-normal">
            Serving at {serveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-primary/30" />

          {/* Events */}
          <div className="space-y-4">
            {events.map((event, index) => {
              const isPast = event.time.getTime() <= now.getTime()
              const isNext = index === nextEventIndex
              const timeUntil = getTimeUntil(event.time)

              return (
                <div
                  key={event.id}
                  className={`relative pl-10 ${isPast ? 'opacity-50' : ''}`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${isNext ? 'bg-primary border-primary animate-pulse' : isPast ? 'bg-muted border-muted-foreground' : 'bg-background border-border'}
                    `}
                  >
                    {isPast && <CheckIcon className="h-3 w-3 text-muted-foreground" />}
                  </div>

                  {/* Event card */}
                  <div
                    className={`p-3 rounded-lg border ${isNext ? 'border-primary bg-primary/5' : ''} ${getEventColor(event.type)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <EventIcon type={event.type} className="h-4 w-4" />
                          <span className="font-medium">{event.description}</span>
                        </div>
                        {event.temperature && (
                          <p className="text-sm mt-1">
                            {event.temperature}°{event.temperatureUnit}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-medium">
                          {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className={`text-sm ${isNext ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          {isPast ? 'Done' : formatTimeUntil(event.time)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EventIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'prep_start':
      return <KnifeIcon className={className} />
    case 'cook_start':
      return <FlameIcon className={className} />
    case 'cook_end':
      return <TimerIcon className={className} />
    case 'rest_start':
      return <PauseIcon className={className} />
    case 'serve':
      return <UtensilsIcon className={className} />
    default:
      return <ClockIcon className={className} />
  }
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
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

function KnifeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
    </svg>
  )
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3-5.108 8.25 8.25 0 0 1 3.362.72Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  )
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  )
}

function UtensilsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513c0 1.135.845 2.098 1.976 2.192 1.327.11 2.669.166 4.024.166 1.355 0 2.697-.056 4.024-.166C17.155 15.22 18 14.257 18 13.122v-2.513c0-1.135-.845-2.098-1.976-2.192A48.424 48.424 0 0 0 12 8.25Zm0 0V6.75m0 0a2.25 2.25 0 0 0-2.25-2.25H9A2.25 2.25 0 0 0 6.75 6.75v1.5m5.25-1.5a2.25 2.25 0 0 1 2.25-2.25H15a2.25 2.25 0 0 1 2.25 2.25v1.5m-10.5 0v8.25a2.25 2.25 0 0 0 2.25 2.25h6a2.25 2.25 0 0 0 2.25-2.25V6.75" />
    </svg>
  )
}
