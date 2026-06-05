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
const tabbar = document.getElementById("tabbar");

function setTab(tabId) {
  // Beim Tab-Wechsel die Unteransichten zurücksetzen.
  if (tabId !== state.tab) {
    if (typeof Documents !== "undefined") Documents.toList();
    if (typeof Formulare !== "undefined") Formulare.reset();
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
  const statusText = tasks.length
    ? `${tasks.length} offene ${tasks.length === 1 ? "Aufgabe" : "Aufgaben"}`
    : "Keine offenen Aufgaben";

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
    <div class="card muted">🔔 Keine Medikamenten-Erinnerungen eingestellt.</div>
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
    ["🤝", "Pflege"],
    ["👤", "Profil"],
    ["👨‍👩‍👧", "Angehörige"],
    ["🆘", "Notfall"],
    ["⚙️", "Einstellungen"],
  ];
  return `
    <h2 class="view-title">Mehr</h2>
    <p class="view-subtitle">Weitere Bereiche und Einstellungen.</p>
    <ul class="list">
      ${items
        .map(
          ([icon, label]) =>
            `<li><span aria-hidden="true">${icon}</span> ${label}</li>`,
        )
        .join("")}
    </ul>
  `;
}

function renderMain() {
  switch (state.tab) {
    case "mediplan":
      return placeholderView(
        "Mediplan",
        "Medikamente, Einnahmezeiten und Erinnerungen.",
        "Der Medikamentenplan wird als Nächstes gebaut. Wirkstoffe erklärt die KI dann neutral — ohne Dosier- oder Therapieempfehlungen.",
      );
    case "mehr":
      return viewMehr();
    default:
      return placeholderView("Nicht gefunden", "", "Diese Ansicht gibt es nicht.");
  }
}

function renderTabbar() {
  return TABS.map(
    (t) => `
      <button class="tab" data-tab="${t.id}" ${
        state.tab === t.id ? 'aria-current="page"' : ""
      }>
        <span class="tab-icon" aria-hidden="true">${t.icon}</span>
        ${t.label}
      </button>`,
  ).join("");
}

function render() {
  tabbar.innerHTML = renderTabbar();
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
  app.innerHTML = renderMain();
}

// ---- Ereignisse (eine zentrale Stelle per Delegation) ----
document.addEventListener("click", (e) => {
  const tabBtn = e.target.closest("[data-tab]");
  if (tabBtn) {
    setTab(tabBtn.dataset.tab);
    return;
  }
  const goto = e.target.closest("[data-goto]");
  if (goto) {
    setTab(goto.dataset.goto);
  }
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
