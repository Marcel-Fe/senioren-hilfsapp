/* Service-Worker: macht die App offline-fähig und installierbar.
   CACHE_VERSION bei jeder Asset-Änderung erhöhen (muss zu ?v= in index.html passen). */

const CACHE_VERSION = "0.3.1";
const CACHE_NAME = `alltagsbegleiter-${CACHE_VERSION}`;

const ASSETS = [
  ".",
  "index.html",
  "css/styles.css?v=0.3.1",
  "js/db.js?v=0.3.1",
  "js/ocr.js?v=0.3.1",
  "js/ui.js?v=0.3.1",
  "js/voice.js?v=0.3.1",
  "js/ki.js?v=0.3.1",
  "js/profil.js?v=0.3.1",
  "js/documents.js?v=0.3.1",
  "js/formulare.js?v=0.3.1",
  "js/mediplan.js?v=0.3.1",
  "js/notfall.js?v=0.3.1",
  "js/pflege.js?v=0.3.1",
  "js/gesundheit.js?v=0.3.1",
  "js/angehoerige.js?v=0.3.1",
  "js/erinnerungen.js?v=0.3.1",
  "js/kontakte.js?v=0.3.1",
  "js/assistent.js?v=0.3.1",
  "js/app.js?v=0.3.1",
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-180.png",
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
  const req = event.request;
  if (req.method !== "GET") return;

  // HTML/Navigation: network-first, damit neue Versionen sofort ankommen (offline: Cache).
  const isHTML =
    req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("index.html"))),
    );
    return;
  }

  // Übrige Dateien (mit ?v= versioniert): cache-first, sonst Netzwerk.
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
