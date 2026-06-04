/* Texterkennung (OCR) im Browser mit Tesseract.js.
   Das Skript wird erst bei Bedarf vom CDN geladen (spart Ladezeit beim Start).
   Global als `OCR` verfügbar. Funktioniert für Bilder (Fotos), nicht für PDF. */

"use strict";

const OCR = (() => {
  const CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  let scriptPromise = null;

  function loadScript() {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CDN;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Texterkennung konnte nicht geladen werden (keine Internetverbindung?)."));
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  // blob: Bild-Blob. onProgress: optionaler Callback (0..1).
  async function recognize(blob, onProgress) {
    await loadScript();
    const { data } = await Tesseract.recognize(blob, "deu", {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof onProgress === "function") {
          onProgress(m.progress);
        }
      },
    });
    return (data.text || "").trim();
  }

  return { recognize };
})();
