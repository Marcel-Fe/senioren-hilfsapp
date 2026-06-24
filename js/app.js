/* Senioren-Alltagsbegleiter — App-Grundgerüst (Phase 0).
   Eine einfache Zustandsmaschine: state -> render(). Noch ohne Backend;
   die Tabs zeigen das Gerüst, Inhalte folgen in den nächsten Phasen. */

"use strict";

const state = {
  tab: "dashboard",
};

const APP_VERSION = "0.3.1";

// Vorlese-Einstellung (Stimme + Geschwindigkeit), aus den Einstellungen geladen.
const voicePref = { voiceURI: null, rate: 0.95 };
async function loadVoicePref() {
  const set = (await DB.get("einstellungen", "settings")) || {};
  if (set.voiceURI) voicePref.voiceURI = set.voiceURI;
  if (set.voiceRate) voicePref.rate = set.voiceRate;
}

// Für „Zum Startbildschirm hinzufügen" (PWA-Installation), wenn der Browser es anbietet.
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

// Definition der 5 Tabs (untere Navigation) — Module gemäß Spec.
const TABS = [
  { id: "dashboard", label: "Start", icon: "🏠" },
  { id: "dokumente", label: "Dokumente", icon: "📄" },
  { id: "mediplan", label: "Mediplan", icon: "💊" },
  { id: "formulare", label: "Formulare", icon: "📝" },
  { id: "mehr", label: "Mehr", icon: "☰" },
];

const app = document.getElementById("app");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menu-btn");

// Seitenmenü mit Kategorien und Unterkategorien.
const MENU = [
  { label: "Start", icon: "🏠", tab: "dashboard" },
  { label: "KI-Assistent", icon: "💬", tab: "assistent" },
  {
    label: "Dokumente",
    icon: "📄",
    sub: [
      { label: "Alle Dokumente", cat: "" },
      { label: "Gesundheit", cat: "Gesundheit" },
      { label: "Pflege", cat: "Pflege" },
      { label: "Versicherungen", cat: "Versicherungen" },
      { label: "Wohnen", cat: "Wohnen" },
      { label: "Finanzen", cat: "Finanzen" },
      { label: "Behörden", cat: "Behörden" },
    ],
  },
  { label: "Mediplan", icon: "💊", tab: "mediplan" },
  { label: "Erinnerungen", icon: "⏰", tab: "erinnerungen" },
  { label: "Gesundheitsakte", icon: "❤️", tab: "gesundheit" },
  {
    label: "Formulare",
    icon: "📝",
    subForms: [
      "Pflegegrad beantragen (Erstantrag)",
      "Höherstufung des Pflegegrads",
      "Verhinderungspflege",
      "Entlastungsbetrag (125 €)",
      "Wohngeld",
    ],
  },
  { label: "Pflege", icon: "🤝", tab: "pflege" },
  { label: "Notfall", icon: "🆘", tab: "notfall" },
  { label: "Meine Kontakte", icon: "📇", tab: "kontakte" },
  { label: "Angehörige", icon: "👨‍👩‍👧", tab: "angehoerige" },
  { label: "Profil", icon: "👤", tab: "profil" },
  { label: "Einstellungen", icon: "⚙️", tab: "einstellungen" },
];

function setTab(tabId) {
  // Beim Tab-Wechsel die Unteransichten zurücksetzen.
  if (tabId !== state.tab) {
    if (typeof Documents !== "undefined") Documents.toList();
    if (typeof Formulare !== "undefined") Formulare.reset();
    if (typeof Mediplan !== "undefined") Mediplan.reset();
    if (typeof Notfall !== "undefined") Notfall.reset();
    if (typeof Pflege !== "undefined") Pflege.reset();
    if (typeof Gesundheit !== "undefined") Gesundheit.reset();
    if (typeof Profil !== "undefined") Profil.reset();
    if (typeof Angehoerige !== "undefined") Angehoerige.reset();
    if (typeof Erinnerungen !== "undefined") Erinnerungen.reset();
    if (typeof Kontakte !== "undefined") Kontakte.reset();
    if (typeof Assistent !== "undefined") Assistent.reset();
  }
  state.tab = tabId;
  render();
  window.scrollTo({ top: 0 });
}

// ---- Ansichten je Tab ----

// Sammelt offene Aufgaben aus gespeicherten Dokument-Analysen.
async function collectTasks() {
  const docs = await DB.getAll();
  const tasks = [];
  for (const doc of docs) {
    const a = doc.analysis;
    if (a && Array.isArray(a.aufgaben)) {
      for (const t of a.aufgaben) tasks.push({ titel: t.titel, doc: doc.title });
    }
  }
  return tasks;
}

const KI_EXAMPLES = [
  "Was bedeutet mein Arztbrief?",
  "Wie fülle ich einen Pflegeantrag aus?",
  "Wofür ist mein Medikament?",
];

async function renderDashboard(container) {
  const tasks = await collectTasks();
  const meds = await DB.getAll("medications");
  const docs = await DB.getAll();
  const statusText = tasks.length
    ? `${tasks.length} offene ${tasks.length === 1 ? "Aufgabe" : "Aufgaben"}`
    : "Alles erledigt";

  // Heute bereits bestätigte Einnahmen (Schlüssel "<medId>|<YYYY-MM-DD>").
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const intakes = await DB.getAll("intakes");
  const takenToday = new Set(intakes.filter((r) => r.date === todayKey).map((r) => r.medId));
  const takenCount = meds.filter((m) => takenToday.has(m.id)).length;

  // Tageszeit-Begrüßung (mit Vorname aus dem Profil) + ausgeschriebenes Datum.
  const profil = typeof Profil !== "undefined" ? await Profil.get() : {};
  const vorname = (profil.name || "").trim().split(/\s+/)[0] || "";
  const h = now.getHours();
  const tag = h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const greet = vorname ? `${tag}, ${vorname}!` : `${tag}!`;
  const dateStr = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Begrüßungs-Onboarding: nach dem Namen fragen, wenn noch keiner hinterlegt ist.
  const onboardHtml = !vorname
    ? `<div class="card" style="border-left:6px solid var(--primary)">
        <strong>👋 Herzlich willkommen!</strong>
        <p class="muted" style="margin:.3rem 0 10px">Wie dürfen wir Sie begrüßen? Ihr Name bleibt nur auf diesem Gerät.</p>
        <input id="onb-name" type="text" placeholder="Ihr Vorname" style="width:100%;padding:12px;font-size:1.1rem;border:1px solid var(--border);border-radius:12px" />
        <button class="btn" id="onb-save" style="margin-top:10px">Speichern</button>
      </div>`
    : "";

  // Tagesfortschritt bei den Medikamenten.
  const progressPct = meds.length ? Math.round((takenCount / meds.length) * 100) : 0;
  const progressHtml = meds.length
    ? `<div class="card">
         <div style="display:flex;justify-content:space-between;align-items:center">
           <strong>💊 Medikamente heute</strong>
           <span class="muted">${takenCount} von ${meds.length}</span>
         </div>
         <div class="progress"><div class="progress-bar" style="width:${progressPct}%"></div></div>
       </div>`
    : "";

  const heuteMeds = meds.length
    ? `<ul class="list">${meds
        .map((m) => {
          const done = takenToday.has(m.id);
          return `<li><span aria-hidden="true">${done ? "✅" : "💊"}</span> <span style="flex:1"><strong>${UI.esc(m.name)}</strong>${
            m.times && m.times.length ? ` — ${UI.esc(m.times.join(", "))}` : ""
          }${done ? ' <span class="muted">(heute eingenommen)</span>' : ""}</span></li>`;
        })
        .join("")}</ul>`
    : `<div class="card muted">🔔 Keine Medikamente eingetragen.</div>`;

  const heuteAufgaben = tasks.length
    ? `<ul class="list">${tasks
        .map((t) => `<li><span aria-hidden="true">✅</span> ${UI.esc(t.titel)}</li>`)
        .join("")}</ul>`
    : `<div class="card muted">Aktuell nichts zu erledigen.</div>`;

  // Fällige, noch offene Medikamenten-Einnahmen (nur wenn Erinnerungen aktiv sind).
  const due = typeof Erinnerungen !== "undefined" ? await Erinnerungen.getDue() : [];
  const dueHtml = due.length
    ? `<h3 class="section-title">⏰ Jetzt fällig</h3>
       ${due
         .map(
           (d) => `<div class="due-card">
             <div class="due-info">
               <div class="due-name">💊 ${UI.esc(d.med.name)}</div>
               <div class="due-time">${UI.esc(d.label)} · ${UI.esc(d.uhr)} Uhr${d.med.dose ? " · " + UI.esc(d.med.dose) : ""}</div>
             </div>
             <button class="btn" data-take-due="${UI.esc(d.med.id)}">✅ Eingenommen</button>
           </div>`,
         )
         .join("")}`
    : "";

  container.innerHTML = `
    <div class="hero">
      <p class="hero-greet">${greet}</p>
      <p class="hero-date">${UI.esc(dateStr)}</p>
      <span class="hero-status">${tasks.length ? "📌" : "✨"} ${statusText}</span>
    </div>

    ${onboardHtml}

    <div class="stat-grid">
      <div class="stat"><div class="stat-icon" aria-hidden="true">💊</div><div class="stat-num">${takenCount}/${meds.length}</div><div class="stat-label">heute genommen</div></div>
      <div class="stat"><div class="stat-icon" aria-hidden="true">✅</div><div class="stat-num">${tasks.length}</div><div class="stat-label">offene Aufgaben</div></div>
      <div class="stat"><div class="stat-icon" aria-hidden="true">📄</div><div class="stat-num">${docs.length}</div><div class="stat-label">Dokumente</div></div>
    </div>

    ${progressHtml}

    ${dueHtml}

    <button class="notfall-cta" data-goto="notfall">
      <span class="nc-icon" aria-hidden="true">🆘</span>
      <span style="flex:1">Notfall & Notrufnummern<br><span style="font-weight:500;font-size:0.95rem;color:var(--text-muted)">112, Hausarzt, Notfallkontakt</span></span>
      <span aria-hidden="true">›</span>
    </button>

    <h3 class="section-title">⚡ Schnellzugriff</h3>
    <div class="tile-grid">
      <button class="tile" data-goto="mediplan"><span class="tile-icon" aria-hidden="true">💊</span> Mediplan öffnen</button>
      <button class="tile" data-goto="dokumente"><span class="tile-icon" aria-hidden="true">📷</span> Dokument scannen</button>
      <button class="tile" data-goto="formulare"><span class="tile-icon" aria-hidden="true">📝</span> Formular ausfüllen</button>
      <button class="tile" data-goto="erinnerungen"><span class="tile-icon" aria-hidden="true">⏰</span> Erinnerungen</button>
    </div>

    <h3 class="section-title">📅 Heute</h3>
    ${heuteMeds}
    <div style="margin-top:12px">${heuteAufgaben}</div>

    <h3 class="section-title">💬 Frag die KI</h3>
    <div class="ki-box">
      <div class="ki-input-row">
        <textarea id="ki-input" placeholder="Ihre Frage … z. B. „Was bedeutet mein Arztbrief?“"></textarea>
        <button class="mic-btn" id="ki-mic" aria-label="Frage einsprechen" title="Frage einsprechen">🎤</button>
      </div>
      <div class="ki-examples">
        ${KI_EXAMPLES.map((q) => `<button class="ki-example" data-example="${UI.esc(q)}">${UI.esc(q)}</button>`).join("")}
      </div>
      <button class="btn" id="ki-ask">💬 Frage stellen</button>
      <p class="muted" style="margin-top:8px;font-size:.95rem">Sie können nachfragen und ein Gespräch führen — die Antworten werden Ihnen auf Wunsch vorgelesen.</p>
    </div>
  `;

  container.querySelectorAll("[data-take-due]").forEach((el) =>
    el.addEventListener("click", async () => {
      const medId = el.dataset.takeDue;
      await DB.put({ id: `${medId}|${todayKey}`, medId, date: todayKey, ts: Date.now() }, "intakes");
      renderDashboard(container);
    }),
  );

  // Onboarding: Name speichern → persönliche Begrüßung.
  const onbSave = container.querySelector("#onb-save");
  if (onbSave) {
    onbSave.addEventListener("click", async () => {
      const val = container.querySelector("#onb-name").value.trim();
      if (!val) return;
      await DB.put({ ...profil, id: "profil", name: val }, "settings");
      renderDashboard(container);
    });
  }

  // „Frag die KI" führt in den Dialog-Assistenten.
  container.querySelectorAll("[data-example]").forEach((el) =>
    el.addEventListener("click", () => openAssistent(el.dataset.example, false)),
  );

  const micBtn = container.querySelector("#ki-mic");
  if (micBtn) {
    const micPossible = typeof Voice !== "undefined" && (Voice.supported() || Voice.onIOS());
    if (!micPossible) micBtn.style.display = "none";
    else micBtn.addEventListener("click", () => openAssistent(null, true));
  }

  const askBtn = container.querySelector("#ki-ask");
  askBtn.addEventListener("click", () => {
    const frage = container.querySelector("#ki-input").value.trim();
    if (frage) openAssistent(frage, false);
  });
}

// Öffnet den KI-Assistenten – optional mit einer ersten Frage oder direkt mit Mikrofon.
function openAssistent(question, listen) {
  if (typeof Assistent === "undefined") return;
  Assistent.reset();
  if (question) Assistent.startWith(question);
  if (listen) Assistent.startListening();
  state.tab = "assistent";
  render();
  window.scrollTo({ top: 0 });
}

function placeholderView(title, subtitle, hint) {
  return `
    <h2 class="view-title">${title}</h2>
    <p class="view-subtitle">${subtitle}</p>
    <div class="card muted">${hint}</div>
  `;
}

function viewMehr() {
  const items = [
    ["💬", "KI-Assistent", "assistent"],
    ["🆘", "Notfall", "notfall"],
    ["📇", "Meine Kontakte", "kontakte"],
    ["⏰", "Erinnerungen", "erinnerungen"],
    ["⚙️", "Einstellungen", "einstellungen"],
    ["❤️", "Gesundheitsakte", "gesundheit"],
    ["🤝", "Pflege", "pflege"],
    ["👤", "Profil", "profil"],
    ["👨‍👩‍👧", "Angehörige", "angehoerige"],
  ];
  return `
    <h2 class="view-title">Mehr</h2>
    <p class="view-subtitle">Weitere Bereiche und Einstellungen.</p>
    <ul class="list">
      ${items
        .map(([icon, label, target]) =>
          target
            ? `<li data-goto="${target}" style="cursor:pointer"><span aria-hidden="true">${icon}</span><span style="flex:1">${label}</span><span aria-hidden="true">›</span></li>`
            : `<li><span aria-hidden="true">${icon}</span><span style="flex:1">${label}</span><span class="muted" style="font-size:0.85rem">kommt bald</span></li>`,
        )
        .join("")}
    </ul>
  `;
}

// Schriftgröße auf das ganze Dokument anwenden (Basis 18px × Faktor).
function setFontScale(scale) {
  document.documentElement.style.fontSize = 18 * (scale || 1) + "px";
}
async function applyFontScale() {
  const set = (await DB.get("einstellungen", "settings")) || {};
  if (set.fontScale && set.fontScale !== 1) setFontScale(set.fontScale);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// Sicherung: alle lokalen Daten (inkl. Dokument-Dateien als Base64) in eine JSON-Datei.
async function exportBackup() {
  const stores = ["documents", "medications", "settings", "intakes"];
  const dump = { app: "alltagsbegleiter", version: APP_VERSION, exportedAt: new Date().toISOString(), data: {} };
  for (const s of stores) {
    const rows = await DB.getAll(s);
    dump.data[s] = [];
    for (const r of rows) {
      if (r.blob instanceof Blob) {
        dump.data[s].push({ ...r, blob: await blobToDataUrl(r.blob), _blobField: true });
      } else {
        dump.data[s].push(r);
      }
    }
  }
  const blob = new Blob([JSON.stringify(dump)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alltagsbegleiter-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importBackup(file) {
  const text = await file.text();
  const dump = JSON.parse(text);
  if (!dump || !dump.data) throw new Error("Keine gültige Sicherungsdatei.");
  for (const s of Object.keys(dump.data)) {
    for (const r of dump.data[s]) {
      const row = { ...r };
      if (row._blobField) {
        row.blob = await (await fetch(row.blob)).blob();
        delete row._blobField;
      }
      await DB.put(row, s);
    }
  }
}

async function renderEinstellungen(container) {
  const set = (await DB.get("einstellungen", "settings")) || {};
  const scale = set.fontScale || 1;
  const SCALES = [["Normal", 1], ["Groß", 1.15], ["Sehr groß", 1.3]];
  const RATES = [["Langsam", 0.8], ["Normal", 0.95], ["Schneller", 1.1]];
  const curRate = set.voiceRate || 0.95;

  // Verfügbare Vorlese-Stimmen laden (vom Gerät). Deutsche zuerst; sonst alle anbieten.
  const ttsOn = typeof Voice !== "undefined" && Voice.ttsSupported();
  if (ttsOn) await Voice.ready();
  const deList = ttsOn ? Voice.deVoices() : [];
  const voiceList = deList.length ? deList : ttsOn ? Voice.allVoices() : [];
  const best = ttsOn ? Voice.bestDe() : null;
  const selectedUri = set.voiceURI || (best ? best.voiceURI : "");
  const voiceCard = ttsOn
    ? `<div class="card">
        <strong>🔊 Vorlesen &amp; Stimme</strong>
        <p class="muted" style="margin:.3rem 0 10px">Stimme zum Vorlesen der KI-Antworten. Stimmen mit „Online" oder „Natürlich" klingen meist am menschlichsten.</p>
        ${
          voiceList.length
            ? `<label for="set-voice"><strong>Stimme (${voiceList.length})</strong></label>
               <select id="set-voice" style="width:100%;margin:6px 0 14px;padding:12px;font-size:1.05rem;border:1px solid var(--border);border-radius:12px">
                 ${voiceList
                   .map((v) => `<option value="${UI.esc(v.voiceURI)}" ${v.voiceURI === selectedUri ? "selected" : ""}>${UI.esc(v.name)} (${UI.esc(v.lang)})${v.localService === false ? " · Online" : ""}</option>`)
                   .join("")}
               </select>`
            : `<p class="muted" id="voice-empty">Die Stimmen Ihres Geräts werden geladen … Falls hier nichts erscheint, tippen Sie auf „Stimmen suchen".</p>`
        }
        <div class="ui-actions" style="margin-top:0">
          <button class="btn" id="set-voice-test" style="background:#e8edf6;color:var(--text)">▶️ Probe hören</button>
          <button class="btn" id="set-voice-reload" style="background:#e8edf6;color:var(--text)">🔄 Stimmen suchen</button>
        </div>
        <label style="display:block;margin-top:14px"><strong>Geschwindigkeit</strong></label>
        <div class="seg" style="margin-top:6px">
          ${RATES.map(([l, v]) => `<button class="seg-btn ${curRate === v ? "active" : ""}" data-rate="${v}">${l}</button>`).join("")}
        </div>
        <p class="muted" style="margin-top:12px;font-size:0.95rem">Tipp für die natürlichste Stimme: Auf dem Handy in den <strong>System-Einstellungen → Sprachausgabe</strong> eine „neuronale"/„erweiterte" deutsche Stimme herunterladen — sie erscheint dann hier.</p>
      </div>`
    : `<div class="card"><strong>🔊 Vorlesen</strong><p class="muted" style="margin:.3rem 0 0">Dieser Browser unterstützt das Vorlesen leider nicht. Auf dem Handy (Chrome/Safari) funktioniert es.</p></div>`;

  container.innerHTML = `
    <button class="btn" id="set-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
    <h2 class="view-title">⚙️ Einstellungen</h2>

    <div class="card">
      <strong>🔤 Schriftgröße</strong>
      <p class="muted" style="margin:.3rem 0 10px">Stellen Sie die Schrift so ein, dass Sie alles gut lesen können.</p>
      <div class="seg">
        ${SCALES.map(
          ([label, val]) =>
            `<button class="seg-btn ${scale === val ? "active" : ""}" data-scale="${val}">${label}</button>`,
        ).join("")}
      </div>
    </div>

    ${voiceCard}

    <div class="card">
      <strong>📤 App weitergeben</strong>
      <p class="muted" style="margin:.3rem 0 10px">Empfehlen Sie die App Ihren Angehörigen oder fügen Sie sie zum Startbildschirm hinzu.</p>
      <button class="btn" id="set-share">📤 App teilen</button>
      <button class="btn" id="set-install" style="margin-top:10px;background:#e8edf6;color:var(--text)">📲 Zum Startbildschirm hinzufügen</button>
    </div>

    <div class="card">
      <strong>💾 Datensicherung</strong>
      <p class="muted" style="margin:.3rem 0 10px">Ihre Daten liegen nur auf diesem Gerät. Erstellen Sie regelmäßig eine Sicherung, damit nichts verloren geht.</p>
      <button class="btn" id="set-export">⬇️ Sicherung speichern</button>
      <button class="btn" id="set-import-btn" style="margin-top:10px;background:#e8edf6;color:var(--text)">⬆️ Sicherung laden</button>
      <input type="file" id="set-import" accept="application/json,.json" hidden />
      <div id="set-backup-status" class="muted" style="margin-top:8px"></div>
    </div>

    <div class="card">
      <strong>🔒 Datenschutz</strong>
      <p style="margin:.4rem 0 0">Alle Ihre Daten (Dokumente, Medikamente, Notfalldaten) bleiben ausschließlich auf diesem Gerät. Es gibt kein Benutzerkonto, nichts wird an einen Server gesendet — außer dem Text, den Sie der KI-Hilfe stellen.</p>
    </div>

    <div class="card">
      <strong>🗑️ Alle Daten löschen</strong>
      <p class="muted" style="margin:.4rem 0 12px">Entfernt unwiderruflich alle Dokumente, Medikamente und Notfalldaten von diesem Gerät.</p>
      <button class="btn" id="set-delete" style="background:var(--danger)">🗑️ Alle Daten löschen</button>
      <div id="set-status" class="muted" style="margin-top:8px"></div>
    </div>

    <div class="card" data-goto="rechtliches" style="cursor:pointer;display:flex;align-items:center;gap:12px">
      <span aria-hidden="true" style="font-size:1.5rem">📜</span>
      <span style="flex:1"><strong>Rechtliches &amp; Datenschutz</strong><br><span class="muted" style="font-size:0.95rem">Datenschutz, Haftung, Impressum</span></span>
      <span aria-hidden="true">›</span>
    </div>

    <div class="card" style="text-align:center">
      <strong>🫶 Alltagsbegleiter</strong>
      <p class="muted" style="margin:.3rem 0 0">Version ${APP_VERSION} · Ihre digitale Lebensakte</p>
    </div>
  `;

  container.querySelector("#set-back").addEventListener("click", () => setTab("mehr"));

  // Vorlesen: Stimme, Geschwindigkeit, Probe
  const voiceSel = container.querySelector("#set-voice");
  if (voiceSel) {
    voiceSel.addEventListener("change", async () => {
      voicePref.voiceURI = voiceSel.value;
      await DB.put({ id: "einstellungen", ...set, voiceURI: voiceSel.value }, "settings");
    });
  }
  container.querySelectorAll("[data-rate]").forEach((b) =>
    b.addEventListener("click", async () => {
      const val = Number(b.dataset.rate);
      voicePref.rate = val;
      await DB.put({ id: "einstellungen", ...set, voiceRate: val }, "settings");
      container.querySelectorAll("[data-rate]").forEach((x) => x.classList.toggle("active", x === b));
    }),
  );
  const testBtn = container.querySelector("#set-voice-test");
  if (testBtn) {
    testBtn.addEventListener("click", () => {
      Voice.speak("Guten Tag! So klingt das Vorlesen in der App Alltagsbegleiter.", {
        voiceURI: voiceSel ? voiceSel.value : voicePref.voiceURI,
        rate: Number((container.querySelector("[data-rate].active") || {}).dataset?.rate || voicePref.rate),
      });
    });
  }
  const reloadBtn = container.querySelector("#set-voice-reload");
  if (reloadBtn) reloadBtn.addEventListener("click", () => renderEinstellungen(container));
  // Falls die Stimmenliste erst verzögert geladen wird, Ansicht automatisch erneuern.
  if (ttsOn && !voiceList.length && typeof Voice.onChange === "function") {
    Voice.onChange(() => {
      if (state.tab === "einstellungen") renderEinstellungen(container);
    });
  }

  // Schriftgröße
  container.querySelectorAll("[data-scale]").forEach((b) =>
    b.addEventListener("click", async () => {
      const val = Number(b.dataset.scale);
      setFontScale(val);
      await DB.put({ id: "einstellungen", ...set, fontScale: val }, "settings");
      container.querySelectorAll("[data-scale]").forEach((x) => x.classList.toggle("active", x === b));
    }),
  );

  // Teilen
  container.querySelector("#set-share").addEventListener("click", async () => {
    const shareData = {
      title: "Alltagsbegleiter",
      text: "Eine einfache App für Senioren: Dokumente, Medikamente, Pflege und Erinnerungen.",
      url: location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(location.href);
        alert("Link in die Zwischenablage kopiert: " + location.href);
      }
    } catch {
      /* abgebrochen */
    }
  });

  // Installieren
  const installBtn = container.querySelector("#set-install");
  installBtn.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    } else {
      alert(
        "So fügen Sie die App hinzu:\n\n• iPhone (Safari): unten auf „Teilen“ und dann „Zum Home-Bildschirm“.\n• Android (Chrome): oben rechts auf das Menü ⋮ und dann „App installieren“.",
      );
    }
  });

  // Sicherung speichern / laden
  container.querySelector("#set-export").addEventListener("click", async () => {
    const status = container.querySelector("#set-backup-status");
    status.textContent = "Sicherung wird erstellt …";
    try {
      await exportBackup();
      status.textContent = "✅ Sicherung gespeichert (in Ihren Downloads).";
    } catch (err) {
      status.textContent = "⚠️ " + (err && err.message ? err.message : "Sicherung fehlgeschlagen.");
    }
  });
  const importInput = container.querySelector("#set-import");
  container.querySelector("#set-import-btn").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    const status = container.querySelector("#set-backup-status");
    if (!confirm("Sicherung jetzt laden? Vorhandene Einträge mit gleicher Kennung werden überschrieben.")) return;
    status.textContent = "Sicherung wird geladen …";
    try {
      await importBackup(file);
      status.textContent = "✅ Sicherung geladen.";
    } catch (err) {
      status.textContent = "⚠️ " + (err && err.message ? err.message : "Laden fehlgeschlagen.");
    }
    importInput.value = "";
  });

  // Alle Daten löschen
  container.querySelector("#set-delete").addEventListener("click", async () => {
    if (!confirm("Wirklich ALLE Daten unwiderruflich löschen?")) return;
    await DB.clearAll();
    container.querySelector("#set-status").textContent = "✅ Alle Daten wurden gelöscht.";
  });
}

function renderRechtliches(container) {
  container.innerHTML = `
    <button class="btn" id="rl-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
    <h2 class="view-title">📜 Rechtliches &amp; Datenschutz</h2>
    <p class="view-subtitle">Stand: Juni 2026</p>

    <div class="card">
      <strong>🔒 Datenschutz auf einen Blick</strong>
      <p style="margin:.4rem 0 0">Diese App speichert Ihre Daten <strong>nur auf Ihrem Gerät</strong>. Es gibt kein Benutzerkonto, keine Werbung, keine Cookies und kein Nutzer-Tracking.</p>
    </div>

    <div class="card">
      <strong>📁 Ihre Daten auf dem Gerät</strong>
      <p style="margin:.4rem 0 0">Dokumente, Medikamente, Kontakte, Gesundheits- und Notfalldaten sowie Einstellungen werden ausschließlich lokal im Speicher Ihres Browsers (IndexedDB) abgelegt. Niemand außer Ihnen hat darauf Zugriff. Sie können alle Daten jederzeit über <strong>Einstellungen → Alle Daten löschen</strong> entfernen oder über <strong>Datensicherung</strong> exportieren.</p>
    </div>

    <div class="card">
      <strong>🤖 KI-Hilfe (wichtig)</strong>
      <p style="margin:.4rem 0 0">Wenn Sie die KI-Hilfe nutzen, wird der von Ihnen eingegebene Text bzw. der aus einem Dokument erkannte Text zur Beantwortung an unseren Server (Cloudflare) und an <strong>Google Gemini</strong> übertragen. <strong>Bilder werden nie gesendet</strong> — nur Text. Senden Sie keine Angaben, die Sie nicht weitergeben möchten. Eine dauerhafte Speicherung Ihrer Anfragen durch uns erfolgt nicht.</p>
    </div>

    <div class="card">
      <strong>🎤 Sprache</strong>
      <p style="margin:.4rem 0 0">Die <strong>Spracheingabe</strong> (Mikrofon) wird von Ihrem Browser bzw. Gerät verarbeitet. Je nach Browser (z. B. Google Chrome) kann die Sprachaufnahme zur Erkennung an den jeweiligen Anbieter (Google bzw. Apple) übertragen werden. Sie ist nur aktiv, solange Sie den Mikrofon-Knopf benutzen. Das <strong>Vorlesen</strong> erfolgt durch Ihr Gerät.</p>
    </div>

    <div class="card">
      <strong>🌐 Hosting</strong>
      <p style="margin:.4rem 0 0">Die App wird über GitHub Pages (GitHub Inc., USA) bereitgestellt. Beim Aufruf werden technisch bedingt Zugriffsdaten (z. B. IP-Adresse) verarbeitet, wie bei jedem Aufruf einer Internetseite.</p>
    </div>

    <div class="card" style="border-left:6px solid var(--danger)">
      <strong>⚠️ Wichtiger Hinweis (Haftung)</strong>
      <p style="margin:.4rem 0 0">Diese App und die KI ersetzen <strong>keine ärztliche, pflegerische oder rechtliche Beratung</strong>. Es werden keine Diagnosen gestellt und keine Dosierungs- oder Therapieempfehlungen gegeben. Alle Inhalte dienen nur Ihrer Information. <strong>Im Notfall wählen Sie 112.</strong></p>
    </div>

    <div class="card">
      <strong>🧩 Verwendete Dienste</strong>
      <p style="margin:.4rem 0 0">Cloudflare (KI-Vermittlung), Google Gemini (KI-Antworten), Tesseract.js (Texterkennung – läuft lokal in Ihrem Browser).</p>
    </div>

    <div class="card">
      <strong>🏷️ Impressum</strong>
      <p style="margin:.4rem 0 0 0">Verantwortlich für dieses Angebot:</p>
      <p class="muted" style="margin:.3rem 0 0">[Bitte hier Name und Anschrift des Anbieters eintragen]<br>[E-Mail-Adresse für Rückfragen]</p>
      <p class="muted" style="margin:.6rem 0 0;font-size:0.95rem">Hinweis: Sobald die App öffentlich bereitgestellt wird, ist in Deutschland ein vollständiges Impressum (§ 5 DDG) erforderlich.</p>
    </div>
  `;
  container.querySelector("#rl-back").addEventListener("click", () => setTab("einstellungen"));
}

function renderMain() {
  switch (state.tab) {
    case "mehr":
      return viewMehr();
    default:
      return placeholderView("Nicht gefunden", "", "Diese Ansicht gibt es nicht.");
  }
}

function render() {
  // Dashboard und Dokumente werden asynchron aus der DB gerendert.
  if (state.tab === "dashboard") {
    renderDashboard(app);
    return;
  }
  if (state.tab === "dokumente") {
    Documents.renderInto(app);
    return;
  }
  if (state.tab === "formulare") {
    Formulare.renderInto(app);
    return;
  }
  if (state.tab === "mediplan") {
    Mediplan.renderInto(app);
    return;
  }
  if (state.tab === "gesundheit") {
    Gesundheit.renderInto(app);
    return;
  }
  if (state.tab === "pflege") {
    Pflege.renderInto(app);
    return;
  }
  if (state.tab === "notfall") {
    Notfall.renderInto(app);
    return;
  }
  if (state.tab === "profil") {
    Profil.renderInto(app);
    return;
  }
  if (state.tab === "angehoerige") {
    Angehoerige.renderInto(app);
    return;
  }
  if (state.tab === "erinnerungen") {
    Erinnerungen.renderInto(app);
    return;
  }
  if (state.tab === "kontakte") {
    Kontakte.renderInto(app);
    return;
  }
  if (state.tab === "assistent") {
    Assistent.renderInto(app);
    return;
  }
  if (state.tab === "einstellungen") {
    renderEinstellungen(app);
    return;
  }
  if (state.tab === "rechtliches") {
    renderRechtliches(app);
    return;
  }
  app.innerHTML = renderMain();
}

// ---- Ereignisse (eine zentrale Stelle per Delegation) ----
document.addEventListener("click", (e) => {
  const goto = e.target.closest("[data-goto]");
  if (goto) {
    setTab(goto.dataset.goto);
    return;
  }
  // Vorlesen-Button in KI-Antworten (Sprachausgabe).
  const sb = e.target.closest(".speak-btn");
  if (sb && typeof Voice !== "undefined") {
    const result = sb.closest(".ui-result");
    const src = result ? result.querySelector(".speak-src") : null;
    const text = src ? src.textContent : "";
    if (Voice.speaking()) {
      Voice.stopSpeak();
      sb.textContent = "🔊 Vorlesen";
      return;
    }
    sb.textContent = "⏹️ Stopp";
    Voice.speak(text, {
      voiceURI: voicePref.voiceURI,
      rate: voicePref.rate,
      onEnd: () => {
        sb.textContent = "🔊 Vorlesen";
      },
    });
  }
});

// ---- Seitenmenü (Drawer) ----
function buildDrawer() {
  const item = (m) => {
    const active = state.tab === m.tab ? "active" : "";
    if (m.sub || m.subForms) {
      const subs = (m.sub || [])
        .map((s) => `<button class="drawer-subitem" data-nav-cat="${UI.esc(s.cat)}">📁 ${UI.esc(s.label)}</button>`)
        .concat(
          (m.subForms || []).map(
            (f) => `<button class="drawer-subitem" data-nav-form="${UI.esc(f)}">📝 ${UI.esc(f)}</button>`,
          ),
        )
        .join("");
      return `<div class="drawer-group">
        <button class="drawer-item"><span class="di-icon">${m.icon}</span><span style="flex:1">${m.label}</span><span class="di-caret">›</span></button>
        <div class="drawer-sub">${subs}</div>
      </div>`;
    }
    return `<button class="drawer-item ${active}" data-nav-tab="${m.tab}"><span class="di-icon">${m.icon}</span><span style="flex:1">${m.label}</span></button>`;
  };

  drawer.innerHTML = `
    <div class="drawer-head">
      <div class="dh-title">🧓 Alltagsbegleiter</div>
      <div class="dh-sub">Ihre digitale Lebensakte</div>
    </div>
    <nav>${MENU.map(item).join("")}</nav>
  `;
}

function openDrawer() {
  buildDrawer();
  overlay.hidden = false;
  document.body.classList.add("no-scroll");
  requestAnimationFrame(() => {
    overlay.classList.add("show");
    drawer.classList.add("open");
  });
}

function closeDrawer() {
  overlay.classList.remove("show");
  drawer.classList.remove("open");
  document.body.classList.remove("no-scroll");
  setTimeout(() => {
    overlay.hidden = true;
  }, 220);
}

function openDocCategory(cat) {
  if (typeof Documents.setCategory === "function") Documents.setCategory(cat);
  state.tab = "dokumente";
  render();
  window.scrollTo({ top: 0 });
}

function openForm(name) {
  if (typeof Formulare.reset === "function") Formulare.reset();
  state.tab = "formulare";
  render();
  // Direkt die Ausfüll-Maske öffnen (Schnelllink aus dem Seitenmenü).
  if (typeof Formulare.startFill === "function") Formulare.startFill(name, app);
  window.scrollTo({ top: 0 });
}

menuBtn.addEventListener("click", openDrawer);
overlay.addEventListener("click", closeDrawer);
drawer.addEventListener("click", (e) => {
  const cat = e.target.closest("[data-nav-cat]");
  if (cat) {
    closeDrawer();
    openDocCategory(cat.dataset.navCat || null);
    return;
  }
  const form = e.target.closest("[data-nav-form]");
  if (form) {
    closeDrawer();
    openForm(form.dataset.navForm);
    return;
  }
  const tab = e.target.closest("[data-nav-tab]");
  if (tab) {
    closeDrawer();
    setTab(tab.dataset.navTab);
    return;
  }
  const groupItem = e.target.closest(".drawer-group > .drawer-item");
  if (groupItem) groupItem.parentElement.classList.toggle("open");
});

render();

// Gespeicherte Schriftgröße und Vorlese-Einstellung anwenden.
applyFontScale();
loadVoicePref();

// Erinnerungs-Watcher starten (zeigt Benachrichtigungen zur Uhrzeit, solange die App offen ist).
if (typeof Erinnerungen !== "undefined") Erinnerungen.startWatcher();

// ---- Service-Worker für Offline/Installierbarkeit ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* Im lokalen Betrieb ohne HTTPS kann das fehlschlagen — unkritisch. */
    });
  });
}
