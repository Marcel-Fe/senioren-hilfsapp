/* Profil: Name, Pflege-/Krankenkasse und Bundesland — lokal gespeichert (settings id "profil").
   Wird u. a. genutzt, damit die Formular-Links direkt zur richtigen Stelle führen.
   Global als `Profil`. */

"use strict";

const Profil = (() => {
  const ID = "profil";
  const INP = "width:100%;margin-top:6px;padding:12px;font-size:1.1rem;border:1px solid var(--border);border-radius:12px";
  const BUNDESLAENDER = [
    "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg",
    "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen",
    "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt",
    "Schleswig-Holstein", "Thüringen",
  ];

  function reset() {}

  async function get() {
    return (await DB.get(ID, "settings")) || { id: ID };
  }

  async function renderInto(container) {
    const p = await get();
    container.innerHTML = `
      <button class="btn" id="pr-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">👤 Profil</h2>
      <p class="view-subtitle">Diese Angaben bleiben auf dem Gerät und helfen z. B. bei den richtigen Formular-Links.</p>
      <div class="card">
        <label for="pr-name"><strong>Name</strong></label>
        <input id="pr-name" type="text" value="${UI.esc(p.name || "")}" placeholder="Vor- und Nachname" style="${INP}" />

        <label for="pr-kasse" style="display:block;margin-top:14px"><strong>Pflege-/Krankenkasse</strong></label>
        <input id="pr-kasse" type="text" value="${UI.esc(p.kasse || "")}" placeholder="z. B. AOK Bayern, Techniker Krankenkasse" style="${INP}" />

        <label for="pr-bl" style="display:block;margin-top:14px"><strong>Bundesland</strong></label>
        <select id="pr-bl" style="${INP}">
          <option value="">— bitte wählen —</option>
          ${BUNDESLAENDER.map((b) => `<option ${p.bundesland === b ? "selected" : ""}>${b}</option>`).join("")}
        </select>
      </div>
      <button class="btn" id="pr-save" style="margin-top:8px">Speichern</button>
      <div id="pr-status" class="muted" style="margin-top:8px"></div>
    `;

    container.querySelector("#pr-back").addEventListener("click", () => setTab("mehr"));
    container.querySelector("#pr-save").addEventListener("click", async () => {
      await DB.put(
        {
          id: ID,
          name: container.querySelector("#pr-name").value.trim(),
          kasse: container.querySelector("#pr-kasse").value.trim(),
          bundesland: container.querySelector("#pr-bl").value,
        },
        "settings",
      );
      container.querySelector("#pr-status").textContent = "✅ Gespeichert.";
    });
  }

  return { renderInto, reset, get };
})();
