/* Senioren-Alltagsbegleiter — App-Grundgerüst (Phase 0).
   Eine einfache Zustandsmaschine: state -> render(). Noch ohne Backend;
   die Tabs zeigen das Gerüst, Inhalte folgen in den nächsten Phasen. */

"use strict";

const state = {
  tab: "dashboard",
};

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
  { label: "Gesundheitsakte", icon: "❤️", tab: "gesundheit" },
  {
    label: "Formulare",
    icon: "📝",
    subForms: [
      "Pflegeantrag (Pflegegrad beantragen)",
      "Höherstufung des Pflegegrads",
      "Verhinderungspflege",
      "Entlastungsbetrag (125 €)",
      "Wohngeld",
    ],
  },
  { label: "Pflege", icon: "🤝", tab: "pflege" },
  { label: "Notfall", icon: "🆘", tab: "notfall" },
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
  const statusText = tasks.length
    ? `${tasks.length} offene ${tasks.length === 1 ? "Aufgabe" : "Aufgaben"}`
    : "Keine offenen Aufgaben";

  const heuteMeds = meds.length
    ? `<ul class="list">${meds
        .map(
          (m) =>
            `<li><span aria-hidden="true">💊</span> <span style="flex:1"><strong>${UI.esc(m.name)}</strong>${
              m.times && m.times.length ? ` — ${UI.esc(m.times.join(", "))}` : ""
            }</span></li>`,
        )
        .join("")}</ul>`
    : `<div class="card muted">🔔 Keine Medikamente eingetragen.</div>`;

  const heuteAufgaben = tasks.length
    ? `<ul class="list">${tasks
        .map((t) => `<li><span aria-hidden="true">✅</span> ${UI.esc(t.titel)}</li>`)
        .join("")}</ul>`
    : `<div class="card muted">Aktuell nichts zu erledigen.</div>`;

  container.innerHTML = `
    <h2 class="view-title">Guten Tag!</h2>
    <span class="status-pill">${statusText}</span>

    <div class="tile-grid">
      <button class="tile" data-goto="mediplan"><span class="tile-icon" aria-hidden="true">💊</span> Mediplan öffnen</button>
      <button class="tile" data-goto="dokumente"><span class="tile-icon" aria-hidden="true">📷</span> Dokument scannen</button>
      <button class="tile" data-goto="formulare"><span class="tile-icon" aria-hidden="true">📝</span> Formular starten</button>
      <button class="tile" data-goto="dokumente"><span class="tile-icon" aria-hidden="true">📄</span> Dokumente anzeigen</button>
    </div>

    <h3 class="section-title">Heute</h3>
    ${heuteMeds}
    <div style="margin-top:12px">${heuteAufgaben}</div>

    <h3 class="section-title">Frag die KI</h3>
    <div class="ki-box">
      <textarea id="ki-input" placeholder="Ihre Frage … z. B. „Was bedeutet mein Arztbrief?“"></textarea>
      <div class="ki-examples">
        ${KI_EXAMPLES.map((q) => `<button class="ki-example" data-example="${UI.esc(q)}">${UI.esc(q)}</button>`).join("")}
      </div>
      <button class="btn" id="ki-ask">💬 Frage stellen</button>
      <div id="ki-answer"></div>
    </div>
  `;

  container.querySelectorAll("[data-example]").forEach((el) =>
    el.addEventListener("click", () => {
      container.querySelector("#ki-input").value = el.dataset.example;
    }),
  );

  const askBtn = container.querySelector("#ki-ask");
  askBtn.addEventListener("click", async () => {
    const input = container.querySelector("#ki-input");
    const answer = container.querySelector("#ki-answer");
    const frage = input.value.trim();
    if (!frage) return;
    askBtn.disabled = true;
    answer.innerHTML = `<div class="card muted">Die KI denkt nach …</div>`;
    try {
      const data = await KI.chat([{ role: "user", content: frage }]);
      answer.innerHTML = UI.resultHtml(data);
      if (data.modul && data.modul !== "keines" && TABS.some((t) => t.id === data.modul)) {
        const go = document.createElement("button");
        go.className = "btn";
        go.style.marginTop = "12px";
        go.textContent = "Dorthin wechseln";
        go.addEventListener("click", () => setTab(data.modul));
        answer.querySelector(".ui-result").appendChild(go);
      }
    } catch (err) {
      answer.innerHTML = `<div class="card">⚠️ ${UI.esc(err.message || "Fehler bei der KI-Anfrage.")}</div>`;
    } finally {
      askBtn.disabled = false;
    }
  });
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
    ["🆘", "Notfall", "notfall"],
    ["⚙️", "Einstellungen", "einstellungen"],
    ["❤️", "Gesundheitsakte", "gesundheit"],
    ["🤝", "Pflege", "pflege"],
    ["👤", "Profil", "profil"],
    ["👨‍👩‍👧", "Angehörige", null],
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

function renderEinstellungen(container) {
  container.innerHTML = `
    <button class="btn" id="set-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
    <h2 class="view-title">Einstellungen</h2>
    <div class="card">
      <strong>Datenschutz</strong>
      <p style="margin:.4rem 0 0">Alle Ihre Daten (Dokumente, Medikamente, Notfalldaten) liegen ausschließlich auf diesem Gerät.</p>
    </div>
    <div class="card">
      <strong>Alle Daten löschen</strong>
      <p class="muted" style="margin:.4rem 0 12px">Entfernt unwiderruflich alle Dokumente, Medikamente und Notfalldaten von diesem Gerät.</p>
      <button class="btn" id="set-delete" style="background:var(--danger)">🗑️ Alle Daten löschen</button>
      <div id="set-status" class="muted" style="margin-top:8px"></div>
    </div>
  `;
  container.querySelector("#set-back").addEventListener("click", () => setTab("mehr"));
  container.querySelector("#set-delete").addEventListener("click", async () => {
    if (!confirm("Wirklich ALLE Daten unwiderruflich löschen?")) return;
    await DB.clearAll();
    container.querySelector("#set-status").textContent = "✅ Alle Daten wurden gelöscht.";
  });
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
  if (state.tab === "einstellungen") {
    renderEinstellungen(app);
    return;
  }
  app.innerHTML = renderMain();
}

// ---- Ereignisse (eine zentrale Stelle per Delegation) ----
document.addEventListener("click", (e) => {
  const goto = e.target.closest("[data-goto]");
  if (goto) {
    setTab(goto.dataset.goto);
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
  if (typeof Formulare.startForm === "function") Formulare.startForm(name, app);
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

// ---- Service-Worker für Offline/Installierbarkeit ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* Im lokalen Betrieb ohne HTTPS kann das fehlschlagen — unkritisch. */
    });
  });
}
