/* Service-Worker: macht die App offline-fähig und installierbar.
   CACHE_VERSION bei jeder Asset-Änderung erhöhen (muss zu ?v= in index.html passen). */

const CACHE_VERSION = "0.1.8";
const CACHE_NAME = `alltagsbegleiter-${CACHE_VERSION}`;

const ASSETS = [
  ".",
  "index.html",
  "css/styles.css?v=0.1.8",
  "js/db.js?v=0.1.8",
  "js/ocr.js?v=0.1.8",
  "js/ui.js?v=0.1.8",
  "js/voice.js?v=0.1.8",
  "js/ki.js?v=0.1.8",
  "js/profil.js?v=0.1.8",
  "js/documents.js?v=0.1.8",
  "js/formulare.js?v=0.1.8",
  "js/mediplan.js?v=0.1.8",
  "js/notfall.js?v=0.1.8",
  "js/pflege.js?v=0.1.8",
  "js/gesundheit.js?v=0.1.8",
  "js/angehoerige.js?v=0.1.8",
  "js/erinnerungen.js?v=0.1.8",
  "js/app.js?v=0.1.8",
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Alte Cache-Versionen aufräumen.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Cache-first für die App-Hülle, sonst Netzwerk.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
