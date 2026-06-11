/* KI-Client: spricht den Cloudflare-Worker an (Google Gemini dahinter).
   Der API-Schlüssel liegt NUR im Worker, nie hier. Global als `KI`. */

"use strict";

const KI = (() => {
  const WORKER_URL = "https://senioren-hilfsapp-ki.marcelfehse22.workers.dev";
  const TIMEOUT_MS = 45000; // großzügig: Worker wiederholt bei Gemini-Überlast bereits intern
  const MAX_RETRIES = 2; // zusätzliche Versuche bei Netzwerk-/Überlastfehlern

  const wait = (attempt) => new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  const retriable = (status) => status === 429 || status === 502 || status === 503 || status === 504;

  function friendly(status, data) {
    if (status === 429 || status === 503 || status === 502 || status === 504) {
      return "Die KI ist gerade stark ausgelastet. Bitte versuchen Sie es in einem kurzen Moment noch einmal.";
    }
    if (data && data.error) return data.error;
    return `Es gab ein Problem mit der KI (Fehler ${status}). Bitte versuchen Sie es noch einmal.`;
  }

  async function call(payload) {
    let lastError = new Error("Die KI ist gerade nicht erreichbar.");

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let res;
      try {
        res = await fetch(WORKER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        lastError =
          err && err.name === "AbortError"
            ? new Error("Die KI hat zu lange gebraucht. Bitte versuchen Sie es noch einmal.")
            : new Error("Die KI ist gerade nicht erreichbar (Internetverbindung?).");
        if (attempt < MAX_RETRIES) {
          await wait(attempt);
          continue;
        }
        throw lastError;
      }
      clearTimeout(timer);

      // Überlastung/Server-Fehler: kurz warten und erneut versuchen.
      if (retriable(res.status) && attempt < MAX_RETRIES) {
        await wait(attempt);
        continue;
      }

      const data = await res.json().catch(() => ({ error: "Antwort konnte nicht gelesen werden." }));
      if (!res.ok || data.error) {
        throw new Error(friendly(res.status, data));
      }
      return data;
    }

    throw lastError;
  }

  return {
    // text: erkannter Dokumenttext → strukturierte Analyse.
    analyzeDocument: (text) => call({ mode: "document", text }),
    // messages: [{role:"user"|"assistant", content}] → strukturierte Antwort.
    chat: (messages) => call({ mode: "chat", messages }),
    // formart: Name des Formulars; messages: Gesprächsverlauf → {nachricht, entwurf?, fertig, hinweis}.
    formular: (formart, messages) => call({ mode: "formular", formart, messages }),
  };
})();
