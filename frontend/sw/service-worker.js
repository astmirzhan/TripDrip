/* TripDrip service worker. Generated into dist/sw.js by the precache plugin in vite.config.ts. */
const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const APP_CACHE = `tripdrip-app-${VERSION}`
const FONT_CACHE = 'tripdrip-fonts-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(['/', ...PRECACHE]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith('tripdrip-app-') && n !== APP_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Google Fonts: serve from cache, refresh in the background.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(request, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
    return
  }

  // API calls and other origins always go to the network.
  if (url.origin !== self.location.origin) return

  // App pages: network first, fall back to the cached shell so every route opens offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(APP_CACHE).then((cache) => cache.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Hashed assets and icons: cache first.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(APP_CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        }),
    ),
  )
})
