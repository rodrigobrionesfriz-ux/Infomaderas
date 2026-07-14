/* ══════════════════════════════════════════════════════════════
   SERVICE WORKER — Informe de Maderas
   Permite que la app abra y funcione sin conexión.

   Estrategia:
   · App shell (HTML, iconos, manifest) → cache-first, con
     actualización en segundo plano. La app abre al instante.
   · Librerías CDN (Chart.js, XLSX, fuentes) → stale-while-revalidate:
     se sirven de caché y se refrescan por detrás.
   · Firestore / Firebase Auth → NUNCA se cachean aquí. El SDK de
     Firestore tiene su propia persistencia offline (IndexedDB), que
     es la que guarda las guías. Interceptarlo aquí rompería la
     sincronización.
   ══════════════════════════════════════════════════════════════ */

const VERSION    = 'v4.7.0';
const CACHE_APP  = 'maderas-app-' + VERSION;
const CACHE_CDN  = 'maderas-cdn-' + VERSION;

// Recursos propios: sin ellos la app no arranca.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Dominios cuyas respuestas NO deben pasar por caché.
const NO_CACHE = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'www.googleapis.com',
];

// ── INSTALACIÓN ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_APP)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())   // la versión nueva toma control ya
      .catch(err => console.error('[SW] Fallo al cachear el app shell:', err))
  );
});

// ── ACTIVACIÓN: borra cachés de versiones anteriores ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_APP && k !== CACHE_CDN)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo se manejan GET: un POST a Firestore jamás debe tocarse.
  if (req.method !== 'GET') return;

  // Firebase y Google APIs van directo a la red, sin intermediarios.
  if (NO_CACHE.some(d => url.hostname.includes(d))) return;

  // Navegación (abrir la app): red primero, caché como respaldo.
  // Así se ve la versión nueva al desplegar, pero abre igual sin señal.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const copia = resp.clone();
          caches.open(CACHE_APP).then(c => c.put('./index.html', copia));
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match('./index.html');
          return cached || caches.match('./offline.html');
        })
    );
    return;
  }

  // Librerías externas (CDN): se sirve la caché al instante y se
  // actualiza por detrás para la próxima vez.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(CACHE_CDN).then(async cache => {
        const cached = await cache.match(req);
        const red = fetch(req)
          .then(resp => {
            if (resp && resp.status === 200) cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => cached);
        return cached || red;
      })
    );
    return;
  }

  // Recursos propios: caché primero.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copia = resp.clone();
          caches.open(CACHE_APP).then(c => c.put(req, copia));
        }
        return resp;
      });
    })
  );
});

// Permite que la página fuerce la actualización del SW
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
