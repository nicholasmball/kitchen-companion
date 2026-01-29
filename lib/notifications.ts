'use client'

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null

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
    // Also register service worker when permission is granted
    await registerServiceWorker()
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  const permission = await Notification.requestPermission()

  if (permission === 'granted') {
    await registerServiceWorker()
  }

  return permission
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    // Check if already registered
    if (serviceWorkerRegistration) {
      return serviceWorkerRegistration
    }

    serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered successfully')

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready

    return serviceWorkerRegistration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

export async function getServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration
  }
  return registerServiceWorker()
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
    icon: options.icon || '/images/branding/mascot.png',
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

export interface ScheduleNotificationOptions {
  id: string
  title: string
  body: string
  timestamp: number // Unix timestamp in milliseconds
  tag?: string
}

export async function scheduleNotification(options: ScheduleNotificationOptions): Promise<boolean> {
  const sw = await getServiceWorker()

  if (!sw || !sw.active) {
    // Fallback: use setTimeout if service worker isn't available
    const delay = options.timestamp - Date.now()
    if (delay > 0) {
      setTimeout(() => {
        sendNotification({
          title: options.title,
          body: options.body,
          tag: options.tag,
        })
      }, delay)
    }
    return true
  }

  // Use service worker for background notifications
  sw.active.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    payload: {
      id: options.id,
      title: options.title,
      body: options.body,
      timestamp: options.timestamp,
      tag: options.tag || options.id,
    }
  })

  return true
}

export async function cancelScheduledNotification(id: string): Promise<void> {
  const sw = await getServiceWorker()

  if (sw?.active) {
    sw.active.postMessage({
      type: 'CANCEL_NOTIFICATION',
      payload: { id }
    })
  }
}
