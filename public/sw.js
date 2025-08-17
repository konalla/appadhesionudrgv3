// This is the service worker file for UDRG MMS application

// Name of the cache
const CACHE_NAME = 'udrg-mms-v2';

// Assets to cache
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.svg',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon.png'
];

// Additional runtime assets that will be cached as they are accessed
const RUNTIME_CACHE = [
  /\.(js|css)$/,  // All JS and CSS files
  /\/api\/regions/,  // Region data (for offline access)
  /\/api\/federations/,  // Federation data (for offline access)
  /\/api\/sections/,  // Section data (for offline access)
  /\/api\/photos\/uploads\/.*/  // Photos (for offline access)
];

// Database connection
let db;

// Open the IndexedDB database
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open('UdrgOfflineDB', 1);
    
    request.onerror = event => {
      console.error('Failed to open IndexedDB', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = event => {
      db = event.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Store for queued requests
      if (!db.objectStoreNames.contains('pendingRequests')) {
        const store = db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
      
      // Store for offline members
      if (!db.objectStoreNames.contains('members')) {
        const store = db.createObjectStore('members', { keyPath: 'id' });
        store.createIndex('federationId', 'federationId', { unique: false });
        store.createIndex('sectionId', 'sectionId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

// Add a request to the queue for later processing
async function queueRequest(request, requestData) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      
      const url = request.url;
      const method = request.method;
      const headers = {};
      
      // Convert headers to simple object
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      const queueItem = {
        url,
        method,
        headers,
        body: requestData,
        timestamp: Date.now(),
        status: 'pending'
      };
      
      const addRequest = store.add(queueItem);
      
      addRequest.onsuccess = () => {
        console.log('[SW] Request queued for sync:', url);
        resolve(true);
      };
      
      addRequest.onerror = event => {
        console.error('[SW] Error queueing request:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('[SW] Error in queueRequest:', error);
    return false;
  }
}

// Process pending requests when online
async function processPendingRequests() {
  if (!navigator.onLine) return;
  
  try {
    const db = await openDatabase();
    console.log('[SW] Processing pending requests...');
    
    const transaction = db.transaction(['pendingRequests'], 'readwrite');
    const store = transaction.objectStore('pendingRequests');
    const index = store.index('timestamp');
    
    return new Promise((resolve, reject) => {
      const cursorRequest = index.openCursor();
      let processedCount = 0;
      
      cursorRequest.onsuccess = async event => {
        const cursor = event.target.result;
        
        if (cursor) {
          const item = cursor.value;
          console.log('[SW] Processing queued request:', item.url);
          
          try {
            // Update status to processing
            const updateRequest = cursor.update({ ...item, status: 'processing' });
            await new Promise((res, rej) => {
              updateRequest.onsuccess = res;
              updateRequest.onerror = rej;
            });
            
            // Send the request to the server
            const response = await fetch(item.url, {
              method: item.method,
              headers: item.headers,
              body: item.method !== 'GET' && item.method !== 'HEAD' ? item.body : null,
              credentials: 'same-origin'
            });
            
            if (response.ok) {
              // If successful, delete from queue
              cursor.delete();
              processedCount++;
              console.log('[SW] Request processed successfully:', item.url);
              
              // Broadcast success message
              self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                  client.postMessage({
                    type: 'SYNC_SUCCESS',
                    url: item.url,
                    timestamp: new Date().toISOString()
                  });
                });
              });
            } else {
              console.warn('[SW] Server responded with error:', response.status);
              // Mark as failed but keep in the queue for retry
              cursor.update({ ...item, status: 'failed', lastAttempt: Date.now() });
            }
          } catch (error) {
            console.error('[SW] Error processing queued request:', error);
            // Mark as failed but keep in the queue for retry
            cursor.update({ ...item, status: 'failed', lastAttempt: Date.now() });
          }
          
          // Move to next item
          cursor.continue();
        } else {
          console.log(`[SW] Processed ${processedCount} pending requests`);
          
          // If items were processed, notify clients
          if (processedCount > 0) {
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'SYNC_COMPLETED',
                  processedCount
                });
              });
            });
          }
          
          resolve(processedCount);
        }
      };
      
      cursorRequest.onerror = event => {
        console.error('[SW] Error accessing pending requests:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('[SW] Error in processPendingRequests:', error);
    return 0;
  }
}

// Get count of pending requests
async function getPendingRequestsCount() {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingRequests'], 'readonly');
      const store = transaction.objectStore('pendingRequests');
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        resolve(countRequest.result);
      };
      
      countRequest.onerror = event => {
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('[SW] Error getting pending requests count:', error);
    return 0;
  }
}

// Install event - cache initial assets and set up database
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(ASSETS_TO_CACHE)),
      openDatabase()
    ])
    .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all([
        ...cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        }),
        self.clients.claim()
      ]);
    })
  );
});

// Helper function to determine if a request should be cached
function shouldCache(url) {
  return RUNTIME_CACHE.some(pattern => {
    return pattern instanceof RegExp ? pattern.test(url) : url.includes(pattern);
  });
}

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip URLs with ?nocache param
  if (event.request.url.includes('?nocache=')) {
    return;
  }

  // Handle API requests
  if (event.request.url.includes('/api/')) {
    // For API requests that should be cached (like regions data)
    if (shouldCache(event.request.url)) {
      event.respondWith(networkFirst(event.request));
      return;
    }
    
    // For mutation requests (non-GET methods)
    if (event.request.method !== 'GET') {
      event.respondWith(handleMutationRequest(event.request.clone()));
      return;
    }
    
    // For other API requests, fallback to network with offline handling
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          error: 'Network error',
          offline: true,
          message: 'Vous êtes hors ligne. Cette action nécessite une connexion Internet.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For navigation requests (HTML), use network first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // For other assets, use cache first strategy
  event.respondWith(cacheFirst(event.request));
});

// Handle mutation requests (POST, PUT, PATCH, DELETE)
async function handleMutationRequest(request) {
  // If online, try network first
  if (navigator.onLine) {
    try {
      return await fetch(request);
    } catch (error) {
      console.log('[SW] Network request failed, queueing for later:', request.url);
    }
  }
  
  // If offline or request failed, queue for later
  let requestData = null;
  
  // Clone and extract request body
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const requestClone = request.clone();
    try {
      requestData = await requestClone.text();
    } catch (e) {
      console.error('[SW] Could not extract request body:', e);
    }
  }
  
  // Add to queue
  const queued = await queueRequest(request, requestData);
  
  if (queued) {
    // Notify clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'REQUEST_QUEUED',
          url: request.url
        });
      });
    });
    
    // Return provisional response
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      queued: true,
      message: 'Votre demande a été mise en file d\'attente et sera traitée lorsque vous serez à nouveau en ligne.'
    }), {
      status: 202,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Queued': 'true'
      }
    });
  }
  
  // If queueing failed
  return new Response(JSON.stringify({
    success: false,
    message: 'Échec du traitement de votre demande en mode hors ligne'
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Cache-first strategy for assets
function cacheFirst(request) {
  return caches.match(request)
    .then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetchAndCache(request);
    })
    .catch(() => {
      // If both cache and network fail, return the offline page
      if (request.mode === 'navigate') {
        return caches.match('/offline.html');
      }
      return new Response('Contenu non disponible hors ligne');
    });
}

// Network-first strategy for API and navigation
function networkFirst(request) {
  return fetchAndCache(request)
    .catch(() => {
      return caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For navigation, return the offline fallback page
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          // For other requests with no cache, return a simple response
          return new Response('Contenu non disponible hors ligne');
        });
    });
}

// Helper function to fetch from network and update cache
function fetchAndCache(request) {
  return fetch(request)
    .then((response) => {
      // Check if we received a valid response
      if (!response || response.status !== 200) {
        return response;
      }

      // Clone the response as it can only be consumed once
      const responseToCache = response.clone();

      // Only cache valid GET requests that match our patterns
      if (request.method === 'GET' && (
          ASSETS_TO_CACHE.includes(new URL(request.url).pathname) || 
          shouldCache(request.url)
      )) {
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(request, responseToCache);
          });
      }

      return response;
    });
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(processPendingRequests());
  }
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'GET_PENDING_COUNT') {
    getPendingRequestsCount().then(count => {
      event.ports[0].postMessage({ count });
    });
  }
  
  if (event.data && event.data.type === 'SYNC_NOW') {
    processPendingRequests().then(count => {
      event.ports[0].postMessage({ 
        type: 'SYNC_COMPLETED', 
        processedCount: count 
      });
    });
  }
  
  if (event.data && event.data.type === 'ONLINE_STATUS_CHANGE' && event.data.online) {
    processPendingRequests();
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nouvelle notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-icon.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'UDRG MMS', 
        options
      )
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        const url = event.notification.data.url;
        
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});