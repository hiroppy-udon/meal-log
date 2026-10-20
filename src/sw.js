// Service worker source. Owned by us because stage 8 adds a push handler here.
// vite-plugin-pwa (injectManifest) replaces self.__WB_MANIFEST at build time
// with the list of files to cache.
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Stage 8 adds: self.addEventListener('push', ...)
