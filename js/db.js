/* Lokale Datenbank im Browser (IndexedDB).
   Speichert Dokumente und Medikamente direkt auf dem Gerät — nichts verlässt den Browser.
   Einfache Promise-Hülle, global als `DB`. Methoden nehmen optional den Speichernamen
   (Standard "documents"); für Medikamente "medications". */

"use strict";

const DB = (() => {
  const NAME = "senioren-app";
  const VERSION = 2;
  const STORES = ["documents", "medications"];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: "id" });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function store(mode, name = "documents") {
    const db = await open();
    return db.transaction(name, mode).objectStore(name);
  }

  function wrap(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    async put(obj, name = "documents") {
      const s = await store("readwrite", name);
      await wrap(s.put(obj));
      return obj;
    },
    async getAll(name = "documents") {
      const s = await store("readonly", name);
      return wrap(s.getAll());
    },
    async get(id, name = "documents") {
      const s = await store("readonly", name);
      return wrap(s.get(id));
    },
    async remove(id, name = "documents") {
      const s = await store("readwrite", name);
      return wrap(s.delete(id));
    },
  };
})();
