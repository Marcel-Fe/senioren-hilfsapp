/* Lokale Datenbank im Browser (IndexedDB).
   Speichert Dokumente samt Datei (Blob) direkt auf dem Gerät — nichts verlässt den Browser.
   Einfache Promise-Hülle, global als `DB` verfügbar. */

"use strict";

const DB = (() => {
  const NAME = "senioren-app";
  const VERSION = 1;
  const STORE = "documents";
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function store(mode) {
    const db = await open();
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  function wrap(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    async put(doc) {
      const s = await store("readwrite");
      await wrap(s.put(doc));
      return doc;
    },
    async getAll() {
      const s = await store("readonly");
      return wrap(s.getAll());
    },
    async get(id) {
      const s = await store("readonly");
      return wrap(s.get(id));
    },
    async remove(id) {
      const s = await store("readwrite");
      return wrap(s.delete(id));
    },
  };
})();
