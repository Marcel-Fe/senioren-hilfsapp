/* Meine Kontakte: persönliche Ansprechpartner (Pflegedienst, Hausarzt, Apotheke, Familie …)
   mit Direktwahl. Alles lokal in einem Datensatz (settings, id "kontakte", Feld list[]).
   Global als `Kontakte`. */

"use strict";

const Kontakte = (() => {
  const ID = "kontakte";
  const ROLLEN = [
    "Pflegedienst",
    "Hausarzt",
    "Facharzt",
    "Apotheke",
    "Angehörige/Familie",
    "Betreuer/Bevollmächtigter",
    "Pflegekasse",
    "Krankenkasse",
    "Sozialamt",
    "Sanitätshaus",
    "Sonstiges",
  ];
  const ICON = {
    Pflegedienst: "🤝",
    Hausarzt: "🩺",
    Facharzt: "👨‍⚕️",
    Apotheke: "💊",
    "Angehörige/Familie": "👨‍👩‍👧",
    "Betreuer/Bevollmächtigter": "📜",
    Pflegekasse: "🏛️",
    Krankenkasse: "🏥",
    Sozialamt: "🏢",
    Sanitätshaus: "🦽",
    Sonstiges: "📇",
  };
  const INP = "width:100%;margin-top:6px;padding:12px;font-size:1.1rem;border:1px solid var(--border);border-radius:12px";
  let data = null;

  function reset() {}
  const E = (s) => UI.esc(s);

  async function load() {
    data = (await DB.get(ID, "settings")) || { id: ID };
    if (!Array.isArray(data.list)) data.list = [];
    return data;
  }
  async function save() {
    await DB.put(data, "settings");
  }

  function card(k, i) {
    const tel = (k.telefon || "").replace(/[^0-9+]/g, "");
    return `<div class="card">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span aria-hidden="true" style="font-size:1.7rem">${ICON[k.rolle] || "📇"}</span>
        <div style="flex:1">
          <strong style="font-size:1.18rem">${E(k.name)}</strong>
          ${k.rolle ? `<div class="muted">${E(k.rolle)}</div>` : ""}
          ${k.telefon ? `<div style="margin-top:4px"><a href="tel:${tel}" style="color:var(--primary);font-weight:800;font-size:1.2rem">${E(k.telefon)}</a></div>` : ""}
          ${k.notiz ? `<div class="muted" style="margin-top:4px">${E(k.notiz)}</div>` : ""}
        </div>
        <button class="ui-chip" data-del="${i}" style="cursor:pointer" aria-label="Löschen">✕</button>
      </div>
      ${k.telefon ? `<a class="btn" href="tel:${tel}" style="margin-top:12px">📞 Anrufen</a>` : ""}
    </div>`;
  }

  async function renderInto(container) {
    await load();
    const items = data.list.length
      ? data.list.map(card).join("")
      : `<div class="card muted">Noch keine Kontakte. Fügen Sie unten Ihre wichtigen Ansprechpartner hinzu — z. B. Pflegedienst, Hausarzt oder Apotheke.</div>`;

    container.innerHTML = `
      <button class="btn" id="ko-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">📇 Meine Kontakte</h2>
      <p class="view-subtitle">Ihre wichtigen Ansprechpartner an einem Ort — mit einem Tipp anrufen.</p>

      <div>${items}</div>

      <div class="card hd-card" style="margin-top:16px">
        <strong>➕ Kontakt hinzufügen</strong>
        <label for="ko-rolle" style="display:block;margin-top:12px"><strong>Art</strong></label>
        <select id="ko-rolle" style="${INP}">
          ${ROLLEN.map((r) => `<option>${E(r)}</option>`).join("")}
        </select>
        <label for="ko-name" style="display:block;margin-top:12px"><strong>Name *</strong></label>
        <input id="ko-name" type="text" placeholder="z. B. Pflegedienst Sonnenschein" style="${INP}" />
        <label for="ko-tel" style="display:block;margin-top:12px"><strong>Telefon</strong></label>
        <input id="ko-tel" type="tel" placeholder="z. B. 030 1234567" style="${INP}" />
        <label for="ko-notiz" style="display:block;margin-top:12px"><strong>Notiz</strong></label>
        <input id="ko-notiz" type="text" placeholder="z. B. Ansprechpartnerin Frau Meier" style="${INP}" />
        <button class="btn" id="ko-add" style="margin-top:14px">Speichern</button>
        <div id="ko-status" class="muted" style="margin-top:8px"></div>
      </div>
    `;

    container.querySelector("#ko-back").addEventListener("click", () => setTab("mehr"));

    container.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Diesen Kontakt löschen?")) return;
        data.list.splice(Number(b.dataset.del), 1);
        await save();
        renderInto(container);
      }),
    );

    container.querySelector("#ko-add").addEventListener("click", async () => {
      const name = container.querySelector("#ko-name").value.trim();
      if (!name) {
        container.querySelector("#ko-status").textContent = "Bitte einen Namen eingeben.";
        return;
      }
      data.list.push({
        rolle: container.querySelector("#ko-rolle").value,
        name,
        telefon: container.querySelector("#ko-tel").value.trim(),
        notiz: container.querySelector("#ko-notiz").value.trim(),
      });
      await save();
      renderInto(container);
    });
  }

  return { renderInto, reset };
})();
