/* Senioren-Alltagsbegleiter — Cloudflare Worker: KI-Proxy (Google Gemini)

   Der Gemini-API-Key lebt AUSSCHLIESSLICH hier als Secret (env.GEMINI_API_KEY),
   niemals im Frontend. Der Worker verankert den System-Prompt mit allen
   Sicherheits-Leitplanken (siehe docs/KI-VERHALTEN.md) und gibt strukturiertes
   JSON zurück.

   Deploy:
     1) wrangler secret put GEMINI_API_KEY   (Key von ai.google.dev einfügen)
     2) wrangler deploy
   Danach die Worker-URL in js/ki.js -> WORKER_URL eintragen. */

const MODEL = "gemini-2.5-flash-lite";

const PFLICHT_HINWEIS =
  "Nur zur Information, ersetzt keine medizinische oder rechtliche Beratung.";

const SYSTEM_PROMPT = `Du bist ein KI-gestütztes Assistenzsystem für Senioren, Angehörige und Pflegebedürftige.
Du hilfst, medizinische Dokumente zu verstehen, Medikamente zu organisieren, Pflege- und Sozialleistungen zu verstehen, amtliche Formulare als ENTWURF auszufüllen und Akten zu strukturieren.

Du bist KEIN Arzt, Apotheker, Rechtsanwalt, Steuerberater, keine Behörde und kein Diagnose- oder medizinisches Entscheidungssystem.

STRENGE REGELN (Sicherheit vor Genauigkeit):
- KEINE Diagnosen, KEINE Therapieentscheidungen, KEINE Dosierungs-Empfehlungen oder -Änderungen, kein Absetzen/Ersetzen von Medikamenten.
- KEINE rechtlich verbindlichen Aussagen, keine Garantie auf Bewilligung, keine Vorhersage von Behördenentscheidungen, keine juristische oder steuerliche Beratung.
- Medikamente: nur neutrale Wirkstoff-/Anwendungsinfos und bekannte Nebenwirkungen (beipackzettel-ähnlich), KEINE individuelle medizinische Bewertung.
- Dokumente: erklären, zusammenfassen, Fachbegriffe vereinfachen, strukturieren — aber KEINE Diagnose ableiten.
- Formulare: Felder erklären, Beispielantworten geben, Entwurf erstellen — immer als ENTWURF kennzeichnen.
- Bei erkennbarem akuten Risiko (Symptome, Schmerzen, Notfall) zuerst klar an Arzt/Notruf verweisen.

SPRACHE: immer Deutsch, freundlich, sehr einfach, kurze Sätze, keine Fachbegriffe ohne Erklärung.

Das Feld "hinweis" MUSS immer genau diesen Satz enthalten: "${PFLICHT_HINWEIS}"
Antworte AUSSCHLIESSLICH im vorgegebenen JSON-Format.`;

const DOCUMENT_SCHEMA = {
  type: "object",
  properties: {
    ueberschrift: { type: "string" },
    zusammenfassung: { type: "string" },
    klassifikation: {
      type: "string",
      enum: ["Medikament", "Arztbrief", "Rezept", "Formular", "Sonstiges"],
    },
    details: { type: "array", items: { type: "string" } },
    fristen: {
      type: "array",
      items: {
        type: "object",
        properties: { titel: { type: "string" }, datum: { type: "string" } },
        required: ["titel"],
      },
    },
    aufgaben: {
      type: "array",
      items: { type: "object", properties: { titel: { type: "string" } }, required: ["titel"] },
    },
    hinweis: { type: "string" },
  },
  required: ["ueberschrift", "zusammenfassung", "klassifikation", "details", "hinweis"],
};

const FORMULAR_SCHEMA = {
  type: "object",
  properties: {
    nachricht: { type: "string" },
    entwurf: { type: "string" },
    fertig: { type: "boolean" },
    hinweis: { type: "string" },
  },
  required: ["nachricht", "hinweis"],
};

const CHAT_SCHEMA = {
  type: "object",
  properties: {
    ueberschrift: { type: "string" },
    zusammenfassung: { type: "string" },
    details: { type: "array", items: { type: "string" } },
    aktionen: { type: "array", items: { type: "string" } },
    modul: {
      type: "string",
      enum: ["mediplan", "dokumente", "formulare", "scanner", "keines"],
    },
    hinweis: { type: "string" },
  },
  required: ["ueberschrift", "zusammenfassung", "details", "hinweis"],
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
    if (request.method !== "POST") return json({ error: "Nur POST erlaubt." }, 405);
    if (!env.GEMINI_API_KEY) return json({ error: "Server nicht konfiguriert (GEMINI_API_KEY fehlt)." }, 500);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Ungültiges JSON." }, 400);
    }

    const mode = ["chat", "formular"].includes(body.mode) ? body.mode : "document";
    let contents;
    let schema;
    let systemText = SYSTEM_PROMPT;

    if (mode === "chat" || mode === "formular") {
      const messages = Array.isArray(body.messages) ? body.messages : [];
      if (!messages.length) return json({ error: "Keine Nachrichten." }, 400);
      contents = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: String(m.content || "") }],
        }));

      if (mode === "formular") {
        const formart = String(body.formart || "amtliches Formular").slice(0, 120);
        schema = FORMULAR_SCHEMA;
        systemText =
          SYSTEM_PROMPT +
          `\n\nDu hilfst jetzt Schritt für Schritt beim Ausfüllen von: "${formart}". ` +
          `Stelle immer nur EINE Frage auf einmal und erkläre das jeweilige Feld einfach; gib bei Bedarf eine Beispielantwort. ` +
          `Das Feld "nachricht" ist deine nächste Frage oder Erklärung an die Person. ` +
          `Wenn genügend Informationen vorliegen, schreibe in das Feld "entwurf" einen vollständigen, gut lesbaren ENTWURF und setze "fertig" auf true. ` +
          `Jeder Entwurf MUSS mit dem Satz enden: "Dies ist ein Entwurf und keine offizielle Prüfung." ` +
          `Mache keine rechtlich verbindlichen Aussagen und versprich keine Bewilligung.`;
      } else {
        schema = CHAT_SCHEMA;
      }
    } else {
      const text = String(body.text || "").trim();
      if (!text) return json({ error: "Kein Text." }, 400);
      contents = [
        { role: "user", parts: [{ text: "Analysiere dieses Dokument:\n\n" + text }] },
      ];
      schema = DOCUMENT_SCHEMA;
    }

    const payload = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

    // Gemini ist zeitweise überlastet (503/429) — bis zu 3-mal mit kurzer Pause erneut versuchen.
    let geminiRes;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (geminiRes.ok || (geminiRes.status !== 503 && geminiRes.status !== 429)) break;
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
    } catch {
      return json({ error: "KI nicht erreichbar." }, 502);
    }

    if (!geminiRes.ok) {
      const detail = await geminiRes.text().catch(() => "");
      return json({ error: "KI-Fehler", status: geminiRes.status, detail: detail.slice(0, 300) }, 502);
    }

    const data = await geminiRes.json();
    const raw =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

    // Gemini liefert dank responseSchema JSON-Text — hier parsen und Hinweis erzwingen.
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      result = {
        ueberschrift: "Antwort",
        zusammenfassung: raw || "Dazu habe ich gerade keine Antwort.",
        details: [],
        hinweis: PFLICHT_HINWEIS,
      };
    }
    if (!result.hinweis) result.hinweis = PFLICHT_HINWEIS;

    return json(result);
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
