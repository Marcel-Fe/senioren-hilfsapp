/* Gesundheitsakte: Diagnosen, Allergien, Impfungen, Blutdruck, Laborwerte, Arztkontakte.
   Alles lokal in einem Datensatz (settings, id "gesundheit"). Global als `Gesundheit`.
   WICHTIG (Spec): keine Diagnose/Bewertung durch die App — reine Erfassung durch den Nutzer. */

"use strict";

const Gesundheit = (() => {
  const ID = "gesundheit";
  const KEYS = ["diagnosen", "allergien", "impfungen", "blutdruck", "laborwerte", "aerzte"];
  const INP = "padding:12px;font-size:1.05rem;border:1px solid var(--border);border-radius:12px";
  let data = null;

  function reset() {}

  async function load() {
    data = (await DB.get(ID, "settings")) || { id: ID };
    for (const k of KEYS) if (!Array.isArray(data[k])) data[k] = [];
    return data;
  }
  async function save() {
    await DB.put(data, "settings");
  }

  const E = (s) => UI.esc(s);
  const heute = () => new Date().toLocaleDateString("de-DE");

  function entries(key, mapFn) {
    if (!data[key].length) return '<div class="muted" style="margin-top:6px">Noch nichts eingetragen.</div>';
    return `<ul class="list" style="margin-top:8px">${data[key]
      .map(
        (e, i) =>
          `<li><span style="flex:1">${mapFn(e)}</span><button class="ui-chip" data-del="${key}" data-idx="${i}" style="cursor:pointer">✕</button></li>`,
      )
      .join("")}</ul>`;
  }

  function field(name, ph, type) {
    return `<input data-field="${name}" type="${type || "text"}" placeholder="${E(ph)}" style="flex:1;min-width:88px;${INP}" />`;
  }

  function section(title, key, body, addRow) {
    return `<div class="card hd-card"><strong>${title}</strong>${entries(key, body)}
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        ${addRow}
        <button class="btn" data-add="${key}" style="width:auto;padding:12px 18px">＋</button>
      </div></div>`;
  }

  function buildEntry(key, f) {
    switch (key) {
      case "diagnosen":
      case "allergien":
        return f.text ? { text: f.text } : null;
      case "impfungen":
        return f.text ? { text: f.text, datum: f.datum } : null;
      case "blutdruck":
        return f.sys && f.dia ? { sys: f.sys, dia: f.dia, datum: f.datum || heute() } : null;
      case "laborwerte":
        return f.bez ? { bez: f.bez, wert: f.wert, datum: f.datum } : null;
      case "aerzte":
        return f.name ? { name: f.name, fach: f.fach, tel: f.tel } : null;
      default:
        return null;
    }
  }

  async function renderInto(container) {
    await load();
    container.innerHTML = `
      <button class="btn" id="ge-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">❤️ Gesundheitsakte</h2>
      <p class="view-subtitle">Ihre wichtigsten Gesundheitsdaten an einem Ort.</p>

      ${section("📋 Diagnosen", "diagnosen", (e) => E(e.text), field("text", "z. B. Bluthochdruck"))}
      ${section("⚠️ Allergien", "allergien", (e) => E(e.text), field("text", "z. B. Penicillin"))}
      ${section(
        "💉 Impfungen",
        "impfungen",
        (e) => `${E(e.text)}${e.datum ? ` <span class="muted">(${E(e.datum)})</span>` : ""}`,
        field("text", "Impfung") + field("datum", "Datum"),
      )}
      ${section(
        "🩸 Blutdruck",
        "blutdruck",
        (e) => `${E(e.sys)}/${E(e.dia)} mmHg${e.datum ? ` <span class="muted">(${E(e.datum)})</span>` : ""}`,
        field("sys", "Sys", "number") + field("dia", "Dia", "number") + field("datum", "Datum (optional)"),
      )}
      ${section(
        "🧪 Laborwerte",
        "laborwerte",
        (e) => `${E(e.bez)}: <strong>${E(e.wert)}</strong>${e.datum ? ` <span class="muted">(${E(e.datum)})</span>` : ""}`,
        field("bez", "Bezeichnung") + field("wert", "Wert") + field("datum", "Datum"),
      )}
      ${section(
        "👨‍⚕️ Arztkontakte",
        "aerzte",
        (e) =>
          `<strong>${E(e.name)}</strong>${e.fach ? ` — ${E(e.fach)}` : ""}${
            e.tel ? `<br><a href="tel:${E(String(e.tel).replace(/[^0-9+]/g, ""))}" style="color:var(--primary);font-weight:700">${E(e.tel)}</a>` : ""
          }`,
        field("name", "Name") + field("fach", "Fachrichtung") + field("tel", "Telefon"),
      )}

      <p class="ui-hinweis" style="margin-top:16px">ℹ️ Nur zur Information, ersetzt keine ärztliche Beratung.</p>
    `;

    container.querySelector("#ge-back").addEventListener("click", () => setTab("mehr"));

    container.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        data[b.dataset.del].splice(Number(b.dataset.idx), 1);
        await save();
        renderInto(container);
      }),
    );

    container.querySelectorAll("[data-add]").forEach((b) =>
      b.addEventListener("click", async () => {
        const key = b.dataset.add;
        const card = b.closest(".hd-card");
        const f = {};
        card.querySelectorAll("[data-field]").forEach((x) => (f[x.dataset.field] = x.value.trim()));
        const entry = buildEntry(key, f);
        if (!entry) return;
        data[key].push(entry);
        await save();
        renderInto(container);
      }),
    );
  }

  return { renderInto, reset };
})();
