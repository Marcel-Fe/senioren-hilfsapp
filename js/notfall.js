/* Notfall-Bereich: im Ernstfall schnell sichtbar — Notfallkontakt, Hausarzt, Allergien,
   Diagnosen, Medikamente (aus dem Mediplan), Blutgruppe. Daten liegen lokal im "settings"-Store
   (ein Datensatz id "notfall"). Global als `Notfall`. */

"use strict";

const Notfall = (() => {
  const ID = "notfall";
  const view = { mode: "show" };

  // Fest hinterlegte, bundesweit gültige Notruf- und Hilfenummern (kostenlos, rund um die Uhr,
  // sofern nicht anders angegeben). Tippen wählt direkt.
  const NOTRUF = [
    { icon: "🚑", label: "Notruf – Rettung & Feuerwehr", nr: "112" },
    { icon: "👮", label: "Polizei", nr: "110" },
    { icon: "🩺", label: "Ärztlicher Bereitschaftsdienst", nr: "116117" },
    { icon: "💊", label: "Apotheken-Notdienst", nr: "0800 0022833" },
    { icon: "📞", label: "Silbernetz – für ältere Menschen", nr: "0800 4708090" },
    { icon: "💬", label: "Telefonseelsorge", nr: "0800 1110111" },
  ];

  function renderNotruf() {
    const rows = NOTRUF.map((n) => {
      const tel = n.nr.replace(/[^0-9+]/g, "");
      return `<li>
        <span aria-hidden="true" style="font-size:1.5rem">${n.icon}</span>
        <span style="flex:1"><strong>${UI.esc(n.label)}</strong><br>
          <a href="tel:${tel}" style="color:var(--primary);font-weight:800;font-size:1.25rem">${UI.esc(n.nr)}</a></span>
        <a class="btn" href="tel:${tel}" style="width:auto;padding:10px 16px;font-size:1rem">📞 Anrufen</a>
      </li>`;
    }).join("");
    return `<div class="card" style="border-left:6px solid var(--danger)">
      <strong>📞 Wichtige Notrufnummern</strong>
      <p class="muted" style="margin:.3rem 0 8px">Tippen Sie auf eine Nummer oder „Anrufen", um direkt anzurufen.</p>
      <ul class="list" style="margin-top:8px">${rows}</ul>
    </div>`;
  }

  function reset() {
    view.mode = "show";
  }

  async function load() {
    return (await DB.get(ID, "settings")) || { id: ID };
  }

  async function renderInto(container) {
    const data = await load();
    if (view.mode === "edit") return renderEdit(container, data);
    return renderShow(container, data);
  }

  function field(label, value, telHref) {
    if (!value) return "";
    const inner = telHref
      ? `<a href="tel:${UI.esc(String(value).replace(/[^0-9+]/g, ""))}" style="color:var(--primary);font-weight:700">${UI.esc(value)}</a>`
      : UI.esc(value);
    return `<div style="margin-top:6px"><span class="muted">${UI.esc(label)}:</span> ${inner}</div>`;
  }

  async function renderShow(container, data) {
    const meds = await DB.getAll("medications");
    const hasData =
      data.kontaktName || data.kontaktTel || data.hausarztName || data.hausarztTel ||
      data.allergien || data.diagnosen || data.blutgruppe || data.eigenerName;

    const medList = meds.length
      ? `<ul class="list">${meds
          .map(
            (m) =>
              `<li><span aria-hidden="true">💊</span> <span style="flex:1"><strong>${UI.esc(m.name)}</strong>${m.dose ? " — " + UI.esc(m.dose) : ""}</span></li>`,
          )
          .join("")}</ul>`
      : `<div class="card muted">Keine Medikamente eingetragen.</div>`;

    container.innerHTML = `
      <button class="btn" id="nf-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">🆘 Notfall</h2>
      <p class="view-subtitle">Die wichtigsten Angaben für den Ernstfall.</p>

      ${renderNotruf()}

      ${
        hasData
          ? `
        ${data.eigenerName ? `<div class="card"><strong>Person</strong>${field("Name", data.eigenerName)}${field("Blutgruppe", data.blutgruppe)}</div>` : ""}
        <div class="card">
          <strong>📞 Notfallkontakt</strong>
          ${field("Name", data.kontaktName)}
          ${field("Telefon", data.kontaktTel, true)}
          ${!data.kontaktName && !data.kontaktTel ? '<div class="muted" style="margin-top:6px">Noch nicht eingetragen.</div>' : ""}
        </div>
        <div class="card">
          <strong>🩺 Hausarzt</strong>
          ${field("Name", data.hausarztName)}
          ${field("Telefon", data.hausarztTel, true)}
          ${!data.hausarztName && !data.hausarztTel ? '<div class="muted" style="margin-top:6px">Noch nicht eingetragen.</div>' : ""}
        </div>
        <div class="card"><strong>⚠️ Allergien</strong><div style="margin-top:6px">${data.allergien ? UI.esc(data.allergien) : '<span class="muted">keine Angabe</span>'}</div></div>
        <div class="card"><strong>📋 Diagnosen</strong><div style="margin-top:6px">${data.diagnosen ? UI.esc(data.diagnosen) : '<span class="muted">keine Angabe</span>'}</div></div>
        <div class="card"><strong>💊 Medikamente</strong><div style="margin-top:8px">${medList}</div></div>
      `
          : `<div class="card muted">Noch keine Notfalldaten hinterlegt. Tippen Sie auf „Bearbeiten", um sie einzutragen.</div>`
      }

      <button class="btn" id="nf-edit" style="margin-top:8px">✏️ Bearbeiten</button>
    `;

    container.querySelector("#nf-back").addEventListener("click", () => setTab("mehr"));
    container.querySelector("#nf-edit").addEventListener("click", () => {
      view.mode = "edit";
      renderInto(container);
    });
  }

  function input(id, label, value, placeholder, suggestion) {
    // Vorschlag aus der Gesundheitsakte: nur zeigen, wenn das Feld leer ist und ein Wert vorliegt.
    const hint =
      suggestion && !value
        ? `<button type="button" class="ui-chip" data-fill="${id}" data-val="${UI.esc(suggestion)}" style="cursor:pointer;margin-top:6px;display:inline-block">＋ Aus Gesundheitsakte: ${UI.esc(suggestion)}</button>`
        : "";
    return `
      <label for="${id}" style="display:block;margin-top:14px"><strong>${UI.esc(label)}</strong></label>
      <input id="${id}" type="text" value="${UI.esc(value || "")}" placeholder="${UI.esc(placeholder || "")}"
        style="width:100%;margin-top:6px;padding:12px;font-size:1.1rem;border:1px solid var(--border);border-radius:12px" />
      ${hint}`;
  }

  // Allergien/Diagnosen aus der Gesundheitsakte (settings id "gesundheit") als Komma-Liste.
  async function suggestionsFromGesundheit() {
    const g = (await DB.get("gesundheit", "settings")) || {};
    const join = (arr) =>
      Array.isArray(arr) ? arr.map((e) => e && e.text).filter(Boolean).join(", ") : "";
    return { allergien: join(g.allergien), diagnosen: join(g.diagnosen) };
  }

  async function renderEdit(container, data) {
    const sug = await suggestionsFromGesundheit();
    container.innerHTML = `
      <button class="btn" id="nf-cancel" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Abbrechen</button>
      <h2 class="view-title">Notfalldaten bearbeiten</h2>
      <div class="card">
        ${input("nf-name", "Name", data.eigenerName, "Vor- und Nachname")}
        ${input("nf-blut", "Blutgruppe", data.blutgruppe, "z. B. 0+")}
        ${input("nf-knam", "Notfallkontakt – Name", data.kontaktName, "z. B. Tochter Anna")}
        ${input("nf-ktel", "Notfallkontakt – Telefon", data.kontaktTel, "z. B. 0151 …")}
        ${input("nf-hnam", "Hausarzt – Name", data.hausarztName, "z. B. Dr. Schmidt")}
        ${input("nf-htel", "Hausarzt – Telefon", data.hausarztTel, "z. B. 030 …")}
        ${input("nf-alle", "Allergien", data.allergien, "z. B. Penicillin", sug.allergien)}
        ${input("nf-diag", "Diagnosen", data.diagnosen, "z. B. Diabetes, Bluthochdruck", sug.diagnosen)}
      </div>
      <button class="btn" id="nf-save" style="margin-top:8px">Speichern</button>
    `;

    container.querySelectorAll("[data-fill]").forEach((b) =>
      b.addEventListener("click", () => {
        const inp = container.querySelector("#" + b.dataset.fill);
        if (inp) inp.value = b.dataset.val;
        b.remove();
      }),
    );

    container.querySelector("#nf-cancel").addEventListener("click", () => {
      view.mode = "show";
      renderInto(container);
    });

    container.querySelector("#nf-save").addEventListener("click", async () => {
      const val = (id) => container.querySelector(id).value.trim();
      await DB.put(
        {
          id: ID,
          eigenerName: val("#nf-name"),
          blutgruppe: val("#nf-blut"),
          kontaktName: val("#nf-knam"),
          kontaktTel: val("#nf-ktel"),
          hausarztName: val("#nf-hnam"),
          hausarztTel: val("#nf-htel"),
          allergien: val("#nf-alle"),
          diagnosen: val("#nf-diag"),
        },
        "settings",
      );
      view.mode = "show";
      renderInto(container);
    });
  }

  return { renderInto, reset };
})();
