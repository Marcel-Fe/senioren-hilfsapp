/* KI-Client: spricht den Cloudflare-Worker an (Google Gemini dahinter).
   Der API-Schlüssel liegt NUR im Worker, nie hier. Global als `KI`. */

"use strict";

const KI = (() => {
  const WORKER_URL = "https://senioren-hilfsapp-ki.marcelfehse22.workers.dev";

  async function call(payload) {
    let res;
    try {
      res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("Die KI ist gerade nicht erreichbar (Internetverbindung?).");
    }
    const data = await res.json().catch(() => ({ error: "Antwort konnte nicht gelesen werden." }));
    if (!res.ok || data.error) {
      throw new Error(data.error || `Fehler ${res.status}`);
    }
    return data;
  }

  return {
    // text: erkannter Dokumenttext → strukturierte Analyse.
    analyzeDocument: (text) => call({ mode: "document", text }),
    // messages: [{role:"user"|"assistant", content}] → strukturierte Antwort.
    chat: (messages) => call({ mode: "chat", messages }),
  };
})();
