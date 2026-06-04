/* Senioren-Alltagsbegleiter — App-Grundgerüst (Phase 0).
   Eine einfache Zustandsmaschine: state -> render(). Noch ohne Backend;
   die Tabs zeigen das Gerüst, Inhalte folgen in den nächsten Phasen. */

"use strict";

const state = {
  tab: "dashboard",
};

// Definition der 5 Tabs (untere Navigation).
const TABS = [
  { id: "dashboard", label: "Start", icon: "🏠" },
  { id: "dokumente", label: "Dokumente", icon: "📄" },
  { id: "medikamente", label: "Medikamente", icon: "💊" },
  { id: "pflege", label: "Pflege", icon: "🤝" },
  { id: "mehr", label: "Mehr", icon: "☰" },
];

const app = document.getElementById("app");
const tabbar = document.getElementById("tabbar");

function setTab(tabId) {
  state.tab = tabId;
  render();
  window.scrollTo({ top: 0 });
}

// ---- Ansichten je Tab ----

function viewDashboard() {
  return `
    <h2 class="view-title">Guten Tag!</h2>
    <p class="view-subtitle">Was möchten Sie heute tun?</p>
    <div class="tile-grid">
      <button class="tile" data-goto="medikamente">
        <span class="tile-icon" aria-hidden="true">💊</span>
        Heutige Medikamente
      </button>
      <button class="tile" data-goto="dokumente">
        <span class="tile-icon" aria-hidden="true">📄</span>
        Dokument hochladen
      </button>
      <button class="tile" data-goto="dashboard">
        <span class="tile-icon" aria-hidden="true">🔔</span>
        Offene Aufgaben
      </button>
      <button class="tile" data-goto="dashboard">
        <span class="tile-icon" aria-hidden="true">💬</span>
        KI fragen
      </button>
    </div>
  `;
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
    ["👤", "Profil"],
    ["👨‍👩‍👧", "Angehörige"],
    ["🆘", "Notfall"],
    ["⚙️", "Einstellungen"],
    ["🚪", "Abmelden"],
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
    case "dashboard":
      return viewDashboard();
    case "dokumente":
      return placeholderView(
        "Dokumente",
        "Briefe, Rezepte und Bescheide sicher ablegen.",
        "Hier erscheinen Ihre Dokumente. Das Hochladen wird im nächsten Schritt eingebaut.",
      );
    case "medikamente":
      return placeholderView(
        "Medikamente",
        "Einnahmeplan und Erinnerungen.",
        "Hier entsteht Ihr Medikamentenplan.",
      );
    case "pflege":
      return placeholderView(
        "Pflege",
        "Pflegegrad, Leistungen und Unterlagen.",
        "Dieser Bereich wird später gebaut.",
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
  app.innerHTML = renderMain();
  tabbar.innerHTML = renderTabbar();
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
