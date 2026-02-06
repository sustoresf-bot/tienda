// Service Worker para Tienda Online
// Permite funcionamiento offline y mejor rendimiento

const CACHE_NAME = 'tienda-cache-v4';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/assets/app.js',
    '/assets/tailwind.css',
    '/manifest.json',
    '/icon-192.png',
    '/icon-192.svg'
];

// Instalación: cachear archivos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .catch(() => undefined)
    );
    self.skipWaiting();
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            const toDelete = cacheNames.filter((cacheName) => cacheName !== CACHE_NAME);
            return Promise.all(toDelete.map((cacheName) => caches.delete(cacheName)));
        })
    );
    self.clients.claim();
});

// Lista de dominios externos a ignorar
const EXTERNAL_DOMAINS = [
    'googleapis.com',
    'firebaseio.com',
    'gstatic.com',
    'mercadopago.com',
    'esm.sh',
    'unpkg.com',
    'tailwindcss.com',
    'mlstatic.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

// Fetch: estrategia Network First con fallback a cache
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignorar peticiones que no sean GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignorar peticiones a dominios externos
    const isExternal = EXTERNAL_DOMAINS.some(domain => url.hostname.includes(domain));
    if (isExternal) {
        return;
    }

    // Solo cachear peticiones del mismo origen
    if (url.origin !== self.location.origin) {
        return;
    }

    const isAsset = url.pathname.startsWith('/assets/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js');
    if (isAsset) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(event.request);
            const network = fetch(event.request).then(async (res) => {
                if (res.status === 200) {
                    await cache.put(event.request, res.clone());
                }
                return res;
            }).catch(() => null);
            return cached || network || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        })());
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                });
            })
    );
});

// Mensaje para actualizar cache
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
