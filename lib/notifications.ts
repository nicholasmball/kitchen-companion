'use client'

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  return permission
}

export interface SendNotificationOptions {
  title: string
  body: string
  tag?: string
  icon?: string
  requireInteraction?: boolean
  onClick?: () => void
}

export function sendNotification(options: SendNotificationOptions): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  if (Notification.permission !== 'granted') {
    return null
  }

  const notification = new Notification(options.title, {
    body: options.body,
    tag: options.tag,
    icon: options.icon || '/icon-192.png',
    requireInteraction: options.requireInteraction ?? true,
  })

  if (options.onClick) {
    notification.onclick = () => {
      window.focus()
      options.onClick?.()
      notification.close()
    }
  }

  return notification
}
