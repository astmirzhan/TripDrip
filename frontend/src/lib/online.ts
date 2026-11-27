import { useSyncExternalStore } from 'react'

const subscribe = (fn: () => void) => {
  window.addEventListener('online', fn)
  window.addEventListener('offline', fn)
  return () => {
    window.removeEventListener('online', fn)
    window.removeEventListener('offline', fn)
  }
}

/** True while the browser has a network connection. */
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}

/** Registers the service worker in production builds so the app opens offline. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is optional; the app works online without it.
    })
  })
}
