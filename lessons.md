# Lessons

## 2026-06-04 — Stack-Entscheidung ohne Prüfung bestehender Beschlüsse

**Fehler:** Zu Sessionbeginn einen Next.js-Prototyp gebaut, obwohl in einer früheren
Session am selben Tag bereits ein anderer Stack mit dem Nutzer abgestimmt war
(Vanilla-JS-PWA + Supabase + Cloudflare-Worker, clientseitige Verschlüsselung).

**Ursache:** Die abgestimmten Entscheidungen lagen in der Projekt-Memory
(`projekt-entscheidungen.md`), wurden aber nicht automatisch in den Kontext geladen.
Ich habe vor dem Bauen nicht aktiv nach bestehenden Beschlüssen gesucht.

**Fix / Konsequenz:** Next.js-Code auf Nutzerwunsch verworfen, korrekt als Vanilla-PWA
neu gestartet. Künftig **vor** Stack-/Architektur-Entscheidungen den Memory-Ordner und
vorhandene Plan-Dateien (`~/.claude/plans/`) prüfen — besonders bei „weiter".

**Außerdem:** Bei echten Gesundheitsdaten nie das Originalbild an die KI senden — nur
den im Browser extrahierten Text (Datenschutz-Architektur des abgestimmten Plans).
