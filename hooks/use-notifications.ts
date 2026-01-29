'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendNotification,
  type NotificationPermissionState,
  type SendNotificationOptions,
} from '@/lib/notifications'
import { playAlertSound, initAudio } from '@/lib/audio'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default')
  const [hasInteracted, setHasInteracted] = useState(false)

  // Check initial permission state
  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  // Track user interaction for audio initialization
  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true)
        initAudio()
      }
    }

    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('keydown', handleInteraction, { once: true })
    window.addEventListener('touchstart', handleInteraction, { once: true })

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [hasInteracted])

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    return result
  }, [])

  const notify = useCallback((options: SendNotificationOptions & { playSound?: 'gentle' | 'urgent' | false }) => {
    const { playSound = 'gentle', ...notificationOptions } = options

    // Play sound
    if (playSound) {
      playAlertSound(playSound)
    }

    // Send browser notification
    return sendNotification(notificationOptions)
  }, [])

  return {
    permission,
    isSupported: permission !== 'unsupported',
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission,
    notify,
  }
}
