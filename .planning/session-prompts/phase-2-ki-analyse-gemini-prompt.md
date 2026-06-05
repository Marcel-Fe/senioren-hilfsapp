# Phase 2: KI-Analyse (Gemini) — Session-Prompt für Claude Code
## Kopiere den Prompt unten und füge ihn als erste Nachricht in einer neuen Claude-Code-Session ein
---

```
Du arbeitest am Projekt "Senioren-Alltagsbegleiter" (c:\Users\admin\Desktop\Senioren hilfsapp).
Lies ZUERST README.md im Projekt-Stamm und die Projekt-Memory
(.claude/projects/.../memory/projekt-status.md + projekt-entscheidungen.md) — sie enthalten
Architektur, Entscheidungen und Workflow.

## Aufgabe: Phase 2 — KI-Analyse von Dokumenten via Google Gemini

### Worum geht es?
Hochgeladene Dokumente (Briefe, Bescheide, Rezepte) sollen von einer KI in einfacher Sprache
erklärt werden; zusätzlich erkennt die KI Fristen und Aufgaben. Die KI ist **Google Gemini**,
angesprochen über einen **Cloudflare-Worker** (Schlüssel nie im Frontend). Eingabe ist der
bereits per OCR erkannte Text eines Dokuments (Phase 1). Ziel: Im Dokument-Detail einen Knopf
"In einfacher Sprache erklären", der Zusammenfassung + Fristen + Aufgaben anzeigt und speichert.

### Was BEREITS EXISTIERT (Phase 0 + 1 — nicht neu bauen!)

Lies diese Dateien zuerst, bevor du etwas änderst:

1. `index.html` — App-Hülle, lädt Skripte in Reihenfolge db → ocr → documents → app (Cache `?v=0.0.2`).
2. `js/app.js` — Zustandsmaschine, `render()`, 5-Tab-Navigation; Tab "dokumente" → `Documents.renderInto`.
3. `js/documents.js` — Feature `Documents` (Liste + Detail). Detailansicht in `renderDetail()` (~Zeile 95)
   zeigt Vorschau, Kategorie-Auswahl, "Text erkennen (OCR)", Löschen. HIER kommt der KI-Knopf rein.
   Dokument-Objekt: { id, title, category, type, blob, text (OCR-Text), createdAt }.
4. `js/db.js` — IndexedDB-Wrapper `DB` (put/get/getAll/remove), Store "documents".
5. `js/ocr.js` — `OCR.recognize(blob, onProgress)` liefert erkannten Text (Tesseract via CDN).
6. `sw.js` — Service-Worker, `CACHE_VERSION` + Asset-Liste (muss zu `?v=` in index.html passen).
7. VORLAGE für den Worker: `../Gesundheits app/worker/ki.js` + `wrangler.toml` (Gemini-Proxy,
   System-Prompt zentral, CORS, Secret `GEMINI_API_KEY`). Muster 1:1 übernehmen, anpassen.

### Was FEHLT (deine Aufgabe — schließe diese Lücken)

**Lücke 1: Cloudflare-Worker `senioren-hilfsapp-ki` (Gemini-Proxy)**
- Neu anlegen: `worker/ki.js` + `worker/wrangler.toml` (Name `senioren-hilfsapp-ki`), nach Vorbild
  der Gesundheits-App.
- System-Prompt für DIESES Projekt: erklärt Senioren-Dokumente in einfacher Sprache; gibt
  strukturiertes JSON zurück: { zusammenfassung, fristen:[{titel,datum}], aufgaben:[{titel}] }.
- Endpoint nimmt POST { text } (der OCR-Text) entgegen.
- Deploy: `wrangler secret put GEMINI_API_KEY` (Key vom Nutzer erfragen) → `wrangler deploy`.
  Worker-URL merken.

**Lücke 2: Frontend-KI-Modul `js/ki.js`**
- Neue Datei, global `KI`, Funktion `analyze(text)` → POST an Worker-URL, gibt das JSON zurück.
- Worker-URL als Konstante oben in der Datei (analog GDATA.kiEndpoint der Gesundheits-App).
- In `index.html` als `<script src="js/ki.js?v=0.0.3">` vor `app.js` einbinden.

**Lücke 3: "Erklären"-Knopf + Anzeige im Dokument-Detail**
- In `js/documents.js` → `renderDetail()`: Knopf "🧠 In einfacher Sprache erklären" (nur aktiv,
  wenn `doc.text` vorhanden ist; sonst Hinweis "Erst Text erkennen").
- Klick → `KI.analyze(doc.text)`, Ladeanzeige, Ergebnis in `doc.analysis` speichern (`DB.put`),
  und Zusammenfassung + Fristen + Aufgaben übersichtlich (seniorengerecht) darstellen.

**Lücke 4 (optional): Fristen/Aufgaben im Dashboard**
- Erkannte Fristen/Aufgaben aus allen Dokumenten im Dashboard ("Offene Aufgaben") anzeigen.

### Einschränkungen (Constraints)
- **Stack bleibt Vanilla JS** — kein Framework, keine Build-Tools, keine ES-Module-Umstellung;
  globale Objekte wie bisher (`DB`, `OCR`, `Documents`, neu `KI`).
- **Kein API-Key im Frontend** — Gemini-Key lebt ausschließlich als Cloudflare-Secret.
- **Daten bleiben lokal** (IndexedDB), kein Login/Backend (bewusst, siehe projekt-entscheidungen).
- **Datenschutz:** an die KI geht nur der extrahierte TEXT, niemals das Originalbild/der Blob.
- Antworten/UI auf Deutsch, einfache Sprache, große Schrift (Tokens in `css/styles.css`).
- Bei Gesundheits-/Medizininhalt: KI-Hinweis "ersetzt keine ärztliche Beratung" anzeigen.

### Workflow
1. Alle gelisteten Dateien KOMPLETT lesen, bevor du planst.
2. Lücken als isolierte, unabhängige Schritte umsetzen (Worker zuerst, dann Frontend).
3. Pro Schritt: Code-Änderung + Verifikation (siehe unten).
4. Cache-Version erhöhen: `?v=` in `index.html` UND `CACHE_VERSION` + Asset-Liste in `sw.js`
   gemeinsam auf `0.0.3` (neue `js/ki.js` in die Liste aufnehmen).
5. Ein Commit pro Lücke, klare deutsche Commit-Message, Trailer
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
6. Nach allen Lücken: `git push` (GitHub Pages baut automatisch) und live prüfen.

### Verifikation (echte Befehle)
- `for f in js/*.js sw.js; do node --check "$f"; done`   # Syntax aller JS-Dateien
- `cd worker && npx wrangler deploy`                       # Worker live (nach secret put)
- `curl -s -X POST <WORKER-URL> -H "Content-Type: application/json" -d '{"text":"Test-Arztbrief, Termin am 12.07.2026."}'`  # JSON mit zusammenfassung/fristen/aufgaben
- `git push && sleep 30 && curl -s -o /dev/null -w "%{http_code}" https://marcel-fe.github.io/senioren-hilfsapp/js/ki.js?v=0.0.3`  # 200 = live
- Optional Browser-Test (Playwright, Muster aus letzter Session): Upload → OCR → Erklären → Anzeige, 0 Konsolenfehler.

### Was du NICHT tun darfst
- KEIN Framework/Build-Tool einführen (kein Next.js/React/Vite) — reine Vanilla-PWA bleibt.
- KEIN Gemini-/API-Schlüssel in Frontend-Code oder ins Repo committen (nur Cloudflare-Secret).
- KEIN Supabase/Login einbauen (bewusst zurückgestellt).
- Phase-0/1-Dateien NICHT umschreiben/„aufräumen" außer den nötigen Integrationspunkten.
- Das Originalbild (`doc.blob`) NICHT an die KI senden — nur `doc.text`.
- `git push --force` nicht ohne Rückfrage; nichts ohne Bestätigung löschen.
```

**Speicherort:** `.planning/session-prompts/phase-2-ki-analyse-gemini-prompt.md`
