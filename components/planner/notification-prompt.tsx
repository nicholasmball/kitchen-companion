'use client'

import { useNotifications } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function NotificationPrompt() {
  const { permission, isSupported, requestPermission } = useNotifications()

  // Don't show if already granted, denied, or not supported
  if (!isSupported || permission === 'granted' || permission === 'denied') {
    return null
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <BellIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Enable notifications?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get alerts when it&apos;s time to start cooking each dish. We&apos;ll notify you 5 minutes before and when it&apos;s time to act.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={requestPermission}>
                Enable Notifications
              </Button>
              <Button size="sm" variant="ghost">
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  )
}
