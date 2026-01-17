// Service Worker para WULFIN DISEÑOS
// Permite funcionamiento offline y mejor rendimiento

const CACHE_NAME = 'wulfin-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css'
];

// Instalación: cachear archivos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cacheando archivos estáticos');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
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

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cachear respuestas exitosas
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si falla la red, buscar en cache
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    // Si es una página HTML, devolver index.html (SPA)
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
