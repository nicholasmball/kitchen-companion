// Kitchen Companion Service Worker
// Handles background notifications for cooking timers

const CACHE_NAME = 'kitchen-companion-v1'

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, timestamp, tag } = event.data.payload
    const delay = timestamp - Date.now()

    if (delay > 0) {
      // Schedule the notification
      setTimeout(() => {
        self.registration.showNotification(title, {
          body,
          tag,
          icon: '/images/branding/mascot.png',
          badge: '/images/branding/mascot.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' }
          ],
          data: { id, timestamp }
        })
      }, delay)
    } else {
      // Show immediately if time has passed
      self.registration.showNotification(title, {
        body,
        tag,
        icon: '/images/branding/mascot.png',
        badge: '/images/branding/mascot.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { id, timestamp }
      })
    }
  }

  if (event.data.type === 'CANCEL_NOTIFICATION') {
    // Cancel scheduled notification by clearing its timeout
    // Note: This is a simplified version - in production you'd need to track timeouts
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow('/planner')
      }
    })
  )
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  // Could be used for analytics
})
