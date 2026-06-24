/* Erinnerungen: Medikamenten-Einnahmen zu festen Uhrzeiten in Erinnerung rufen.
   Zwei Wege, beide rein lokal (kein Backend):
   1) Dashboard „Jetzt fällig" zeigt bei jedem App-Öffnen die fälligen, noch offenen Einnahmen
      (zuverlässiges Sicherheitsnetz — `getDue()`).
   2) Browser-Benachrichtigung exakt zur Uhrzeit, SOLANGE die App geöffnet ist (`startWatcher()`).
   WICHTIG/EHRLICH: Ohne Server gibt es keine Benachrichtigung bei geschlossener App.
   Einstellungen liegen in settings id "erinnerungen". Global als `Erinnerungen`. */

"use strict";

const Erinnerungen = (() => {
  const ID = "erinnerungen";
  // Tageszeit-Schlüssel müssen zu den Mediplan-Zeiten (TIMES) passen.
  const SLOTS = [
    { label: "Morgens", def: "08:00" },
    { label: "Mittags", def: "12:00" },
    { label: "Abends", def: "18:00" },
    { label: "Zur Nacht", def: "22:00" },
  ];
  const notified = new Set(); // Dedupe pro Sitzung: "<medId>|<label>|<YYYY-MM-DD>"
  let timer = null;

  function reset() {}

  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  async function load() {
    const s = (await DB.get(ID, "settings")) || { id: ID };
    if (!s.zeiten) s.zeiten = {};
    for (const sl of SLOTS) if (!s.zeiten[sl.label]) s.zeiten[sl.label] = sl.def;
    return s;
  }

  // Menge "<medId>|<slot>", die heute schon eingenommen sind (alte Einträge ohne Slot = "Tag").
  async function takenTodaySet() {
    const today = dayKey(new Date());
    const all = await DB.getAll("intakes");
    return new Set(all.filter((r) => r.date === today).map((r) => `${r.medId}|${r.slot || "Tag"}`));
  }

  // Aktuelle Uhrzeit als Minuten seit Mitternacht.
  function hmToMin(hm) {
    const [h, m] = (hm || "0:0").split(":").map(Number);
    return h * 60 + m;
  }

  // Fällige, heute noch offene Einnahmen: Medikamente mit einer Zeit, deren Uhrzeit erreicht ist.
  async function getDue() {
    const s = await load();
    if (!s.enabled) return [];
    const meds = await DB.getAll("medications");
    const taken = await takenTodaySet();
    const nowMin = (() => {
      const n = new Date();
      return n.getHours() * 60 + n.getMinutes();
    })();

    const due = [];
    for (const med of meds) {
      // Nur Tageszeiten mit hinterlegter Uhrzeit (also nicht „Bei Bedarf"), die fällig und offen sind.
      const slots = (med.times || [])
        .filter((t) => s.zeiten[t] && hmToMin(s.zeiten[t]) <= nowMin)
        .filter((t) => !taken.has(`${med.id}|${t}`))
        .sort((a, b) => hmToMin(s.zeiten[a]) - hmToMin(s.zeiten[b]));
      for (const slot of slots) {
        due.push({ med, label: slot, uhr: s.zeiten[slot] });
      }
    }
    return due;
  }

  // ---------- Benachrichtigungs-Watcher (nur bei geöffneter App) ----------
  function startWatcher() {
    if (timer) return;
    // Jede halbe Minute prüfen, ob eine konfigurierte Uhrzeit jetzt erreicht ist.
    timer = setInterval(tick, 30 * 1000);
    tick();
  }

  async function tick() {
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const s = await load();
      if (!s.enabled) return;
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = dayKey(now);
      const meds = await DB.getAll("medications");
      const taken = await takenTodaySet();
      for (const med of meds) {
        for (const label of med.times || []) {
          if (s.zeiten[label] !== hm) continue;
          if (taken.has(`${med.id}|${label}`)) continue;
          const key = `${med.id}|${label}|${today}`;
          if (notified.has(key)) continue;
          notified.add(key);
          new Notification("Zeit für Ihr Medikament", {
            body: `${med.name}${med.dose ? " – " + med.dose : ""} (${label})`,
            tag: key,
          });
        }
      }
    } catch (err) {
      /* Stiller Fehler — Benachrichtigungen sind ein Bonus, dürfen die App nicht stören. */
    }
  }

  // ---------- Einstellungs-Seite ----------
  function permLabel() {
    if (typeof Notification === "undefined") return "von diesem Gerät nicht unterstützt";
    if (Notification.permission === "granted") return "erlaubt ✓";
    if (Notification.permission === "denied") return "blockiert (im Browser freigeben)";
    return "noch nicht erlaubt";
  }

  async function renderInto(container) {
    const s = await load();
    const supported = typeof Notification !== "undefined";

    container.innerHTML = `
      <button class="btn" id="er-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">⏰ Erinnerungen</h2>
      <p class="view-subtitle">Lassen Sie sich an Ihre Medikamente erinnern.</p>

      <div class="card">
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer">
          <input type="checkbox" id="er-enabled" ${s.enabled ? "checked" : ""} style="width:26px;height:26px" />
          <strong style="flex:1">Erinnerungen aktivieren</strong>
        </label>
        <div class="muted" style="margin-top:8px">Benachrichtigungen: ${permLabel()}</div>
      </div>

      <div class="card">
        <strong>Uhrzeiten</strong>
        <p class="muted" style="margin:.3rem 0 8px">Wann sollen die Einnahmezeiten erinnert werden?</p>
        ${SLOTS.map(
          (sl) => `
          <label for="er-${UI.esc(sl.label)}" style="display:flex;align-items:center;gap:12px;margin-top:10px">
            <span style="flex:1">${UI.esc(sl.label)}</span>
            <input id="er-${UI.esc(sl.label)}" data-slot="${UI.esc(sl.label)}" type="time" value="${UI.esc(s.zeiten[sl.label])}"
              style="padding:10px;font-size:1.1rem;border:1px solid var(--border);border-radius:12px" />
          </label>`,
        ).join("")}
      </div>

      <div class="card" style="background:#fff8e6;border:1px solid #f3e2a6">
        <strong>⚠️ Wichtig zu wissen</strong>
        <p style="margin:.4rem 0 0">Benachrichtigungen erscheinen nur, <strong>solange die App geöffnet ist</strong>. Bei geschlossener App können wir (noch) nicht erinnern — dafür bräuchte es einen Server.</p>
        <p style="margin:.5rem 0 0">Verlässlich ist die <strong>Startseite</strong>: dort sehen Sie bei jedem Öffnen, welche Einnahmen fällig sind.</p>
      </div>

      <button class="btn" id="er-save" style="margin-top:8px" ${supported ? "" : "disabled"}>Speichern</button>
      <div id="er-status" class="muted" style="margin-top:8px"></div>
    `;

    container.querySelector("#er-back").addEventListener("click", () => setTab("mehr"));

    container.querySelector("#er-save").addEventListener("click", async () => {
      const enabled = container.querySelector("#er-enabled").checked;
      const zeiten = {};
      container.querySelectorAll("[data-slot]").forEach((i) => (zeiten[i.dataset.slot] = i.value || "08:00"));

      // Beim Aktivieren die Benachrichtigungs-Erlaubnis anfragen.
      let permNote = "";
      if (enabled && supported && Notification.permission === "default") {
        try {
          const res = await Notification.requestPermission();
          if (res !== "granted") permNote = " (Benachrichtigungen wurden nicht erlaubt — Startseite zeigt fällige Einnahmen trotzdem.)";
        } catch (err) {
          /* ignorieren */
        }
      }

      await DB.put({ id: ID, enabled, zeiten }, "settings");
      if (enabled) startWatcher();
      container.querySelector("#er-status").textContent = "✅ Gespeichert." + permNote;
      // Anzeige der Erlaubnis aktualisieren.
      const lbl = container.querySelector(".muted");
      if (lbl) lbl.textContent = "Benachrichtigungen: " + permLabel();
    });
  }

  return { renderInto, reset, getDue, startWatcher };
})();
