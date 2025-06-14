// Service Worker for the mycoRegister
import { APP_VERSION } from './app-version.js';

const version = `${APP_VERSION}`;
const CACHE_NAME = `mycoregister-cache`;
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app-version.js',
  '/assets/pouchdb@8.0.1.min.js',
  '/assets/pouchdb@8.0.1.find.min.js',
  '/css/main.css',
  '/css/components.css',
  '/css/responsive.css',
  '/js/components/allowedEmailTable.js',
  '/js/components/footer.js',
  '/js/components/fungiSampleForm.js',
  '/js/components/fungiTable.js',
  '/js/components/header.js',
  '/js/components/login.js',
  '/js/components/userProfileModal.js',
  '/js/models/fungiSample.js',
  '/js/services/auth/auth.events.js',
  '/js/services/auth/auth.password.js',
  '/js/services/auth/auth.registration.js',
  '/js/services/auth/auth.service.js',
  '/js/services/auth/auth.storage.js',
  '/js/services/auth/auth.users.js',
  '/js/services/auth/index.js',
  '/js/services/admin.service.js',
  '/js/services/connection.js',
  '/js/services/dbCrud.js',
  '/js/services/dbService.js',
  '/js/services/fungiService.js',
  '/js/services/pwa-registration.js',
  '/js/utils/modal.js',
  '/img/logo.png',
  '/img/icons/favicon.ico',
  '/img/icons/icon-72x72.png',
  '/img/icons/icon-96x96.png',
  '/img/icons/icon-128x128.png',
  '/img/icons/icon-144x144.png',
  '/img/icons/icon-152x152.png',
  '/img/icons/icon-192x192.png',
  '/img/icons/icon-384x384.png',
  '/img/icons/icon-512x512.png',
];

// Install event - cache assets
self.addEventListener('install', e => {
  console.log(`[Service Worker] Installing ${APP_VERSION}. Caching static assets.`);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      // do not trigger unrequested 'controllerchange'
      // .then(() => self.skipWaiting())
      .catch(error => {
        // TODO: handle install failures gracefully
        console.error('Failed to cache assets during install:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', e => {
  console.log(`[Service Worker] Activating ${APP_VERSION}. Cleaning old caches.`);
  e.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - respond with cache first, falling back to network
// Updated fetch event handler for sw.js to ensure consistent JWT handling

self.addEventListener('fetch', e => {
  // Skip cross-origin requests
  if (!e.request.url.startsWith(self.location.origin)) {
    return;
  }

  // IMPORTANT: Don't intercept CouchDB or PouchDB replication traffic
  if (e.request.url.includes('/_changes') ||
    e.request.url.includes('/_bulk_docs') ||
    e.request.url.includes('/_revs_diff') ||
    e.request.url.includes('/_local/') ||
    e.request.url.includes('/db/')) {
    // Let PouchDB replication traffic go directly to the network
    return;
  }

  // Special handling for authentication and API endpoints
  if (e.request.url.includes('/api/auth/')) {

    // For auth requests, try the network first, fall back to offline handling
    e.respondWith(
      fetch(e.request.clone(), {
        credentials: 'include' // Ensure credentials are included
      })
        .catch(() => {
          // If the fetch fails (offline), handle based on the specific endpoint
          if (e.request.url.includes('/api/auth/me')) {
            console.log('Offline auth verification requested');
            // Instead of custom error, trigger the offline auth flow
            return new Response(
              JSON.stringify({
                status: 'offline',
                offlineMode: true,
                message: 'Using stored credentials for offline mode'
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 200 // Return 200 to trigger offline auth in auth.js
              }
            );
          }

          // For login/logout when offline
          if (e.request.url.includes('/api/auth/login')) {
            return new Response(
              JSON.stringify({
                error: 'offline',
                message: 'Impossibile effettuare login mentre la connessione è offline.'
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          }

          if (e.request.url.includes('/api/auth/refresh-token')) {
            return new Response(
              JSON.stringify({
                error: 'offline',
                message: 'Token refresh unavailable while offline.'
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          }

          // For other API requests, try to get from cache
          return caches.match(e.request);
        })
    );
    return;
  }

  // Regular API endpoints
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      fetch(e.request.clone(), {
        credentials: 'include' // Ensure credentials are included
      })
        .catch(() => {
          console.log('API request failed (offline):', e.request.url);
          return caches.match(e.request);
        })
    );
    return;
  }

  // For static assets, try cache first, fall back to network
  e.respondWith(
    caches.match(e.request)
      .then(response => {
        // Cache hit - return the response from the cached version
        if (response) {
          return response;
        }

        // Not in cache - return the result from the live server
        // and add it to the cache for later
        return fetch(e.request.clone(), {
          credentials: e.request.credentials // Preserve original credentials mode
        })
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response as it's a stream and can only be consumed once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(e.request, responseToCache);
              });

            return response;
          });
      })
      .catch(error => {
        console.error('Fetch failed:', error);
        // Return a custom offline page if needed
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});