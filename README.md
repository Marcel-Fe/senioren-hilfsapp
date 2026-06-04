# Senioren-Alltagsbegleiter

KI-gestützte Web-App (PWA) als digitale Lebensakte für Senioren, Angehörige und
Pflegeunternehmen: Dokumente fotografieren → KI erklärt sie in einfacher Sprache,
erkennt Fristen und Aufgaben. Dazu Medikamentenplan, Erinnerungen, Pflege- und
Versicherungsverwaltung sowie Angehörigen- und Unternehmensportal.

## Technik

- **Frontend:** Vanilla HTML/CSS/JS als installierbare **PWA** (Service-Worker).
- **Backend:** Supabase (Auth + Postgres + RLS + Storage) — _folgt in Phase 0b._
- **KI:** Claude über einen Cloudflare-Worker (Schlüssel nie im Frontend) — _folgt._
- **OCR:** Tesseract.js im Browser — _folgt in Phase 1._
- **Datenschutz:** Dokumente clientseitig verschlüsselt; an die KI geht nur der
  extrahierte Text, nie das Originalbild.

## Lokal starten

Service-Worker brauchen einen echten Server (nicht per Doppelklick öffnen):

```bash
python -m http.server 8080
```

Dann im Browser öffnen: http://localhost:8080

## Projektstruktur

- `index.html` — App-Hülle
- `css/styles.css` — Theme/Senioren-Design (eine Stelle)
- `js/app.js` — Zustand, `render()`, Tab-Navigation
- `js/modules/` — Bereichs-Logik (folgt: auth, documents, crypto, ocr, ki, meds, …)
- `sw.js` + `manifest.json` — Offline + Installierbarkeit
- `icons/` — App-Icon

> Cache-Version: bei Änderungen an Assets `?v=` in `index.html` **und**
> `CACHE_VERSION` in `sw.js` gleich hochzählen.

## Stand

| Phase | Inhalt | Status |
| --- | --- | --- |
| 0a | Lokales PWA-Gerüst, Theme, 5-Tab-Navigation | ✅ fertig |
| 0b | Supabase-Projekt, GitHub-Repo + Pages, Cloudflare-Worker | offen |
| 0c | Login/Logout + Profil/Rolle | offen |
| 1 | Dokumente (Upload, Verschlüsselung, OCR, Liste/Detail) | geplant |
| 2 | KI-Analyse + Medikamente + Erinnerungen | geplant |
| 3 | Pflege/Versicherung/Angehörige | geplant |
| 4 | Unternehmensportal + KI-Assistent + Leistungsfinder | geplant |
