// ================= Service Worker - quran-player =================
// المطور: BMHEA58

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `quran-static-${CACHE_VERSION}`;
const API_CACHE = `quran-api-${CACHE_VERSION}`;
const AUDIO_CACHE = `quran-audio-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './quran-data.js',
    './manifest.json',
    './offline.html',
    './icons/icon.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => ![STATIC_CACHE, API_CACHE, AUDIO_CACHE].includes(k))
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (url.hostname === 'api.alquran.cloud') {
        event.respondWith(networkFirstWithCache(request, API_CACHE));
        return;
    }
    if (url.hostname.includes('mp3quran.net') || url.hostname.includes('everyayah.com')) {
        event.respondWith(cacheFirstWithNetwork(request, AUDIO_CACHE));
        return;
    }
    if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
        return;
    }
    if (url.origin === location.origin) {
        event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
        return;
    }
    event.respondWith(fetch(request).catch(() => caches.match(request)));
});

async function cacheFirstWithNetwork(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirstWithCache(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cached = await caches.match(request);
    const networkPromise = fetch(request).then(response => {
        if (response.ok) {
            caches.open(cacheName).then(cache => cache.put(request, response.clone()));
        }
        return response;
    }).catch(() => cached);
    return cached || networkPromise;
}

self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
