/* Mediplan: Medikamente erfassen, Einnahmezeiten, neutrale Wirkstoff-Erklärung (KI).
   Speichert lokal im "medications"-Store von [[DB]]. Global als `Mediplan`.
   WICHTIG (Spec): keine Dosier-/Therapieempfehlungen — nur Darstellung und neutrale Erklärung. */

"use strict";

const Mediplan = (() => {
  const TIMES = ["Morgens", "Mittags", "Abends", "Zur Nacht", "Bei Bedarf"];
  const view = { mode: "list" };

  function reset() {
    view.mode = "list";
  }

  async function renderInto(container) {
    if (view.mode === "add") return renderAdd(container);
    return renderList(container);
  }

  // ---------- Liste ----------
  async function renderList(container) {
    const meds = await DB.getAll("medications");
    meds.sort((a, b) => a.name.localeCompare(b.name));

    const items = meds.length
      ? meds.map(medCard).join("")
      : `<div class="card muted">Noch keine Medikamente. Tippen Sie oben auf „Medikament hinzufügen".</div>`;

    container.innerHTML = `
      <h2 class="view-title">Mediplan</h2>
      <p class="view-subtitle">Ihre Medikamente und Einnahmezeiten. Erklärungen sind neutral und ersetzen keine ärztliche Beratung.</p>
      <button class="btn" id="med-add-btn">➕ Medikament hinzufügen</button>
      <div style="margin-top:18px">${items}</div>
    `;

    container.querySelector("#med-add-btn").addEventListener("click", () => {
      view.mode = "add";
      renderInto(container);
    });

    meds.forEach((med) => {
      const root = container.querySelector(`[data-med="${med.id}"]`);
      if (!root) return;
      root.querySelector("[data-explain]").addEventListener("click", () => explain(med, root));
      root.querySelector("[data-del]").addEventListener("click", async () => {
        if (confirm(`„${med.name}“ wirklich löschen?`)) {
          await DB.remove(med.id, "medications");
          renderInto(container);
        }
      });
    });
  }

  function medCard(med) {
    const times = (med.times || []).length
      ? (med.times || []).map((t) => `<span class="ui-chip">${UI.esc(t)}</span>`).join(" ")
      : `<span class="muted">keine Zeit angegeben</span>`;
    return `
      <div class="card" data-med="${UI.esc(med.id)}">
        <strong style="font-size:1.2rem">💊 ${UI.esc(med.name)}</strong>
        ${med.dose ? `<div style="margin-top:4px">${UI.esc(med.dose)}</div>` : ""}
        <div class="ui-chips" style="margin-top:8px">${times}</div>
        ${med.note ? `<div class="muted" style="margin-top:8px">${UI.esc(med.note)}</div>` : ""}
        <div class="ui-actions">
          <button class="btn" data-explain style="background:#e8edf6;color:var(--text)">🧠 Wirkstoff erklären</button>
          <button class="btn" data-del style="background:var(--danger)">🗑️ Löschen</button>
        </div>
        <div data-explain-out style="margin-top:6px"></div>
      </div>`;
  }

  async function explain(med, root) {
    const out = root.querySelector("[data-explain-out]");
    const btn = root.querySelector("[data-explain]");
    btn.disabled = true;
    out.innerHTML = `<div class="card muted">Die KI erklärt den Wirkstoff …</div>`;
    try {
      const data = await KI.chat([
        {
          role: "user",
          content:
            `Erkläre das Medikament „${med.name}“ in einfacher Sprache: Wofür wird der Wirkstoff allgemein angewendet, ` +
            `und welche bekannten Nebenwirkungen gibt es? Gib KEINE Dosier- oder Therapieempfehlung.`,
        },
      ]);
      out.innerHTML = UI.resultHtml(data);
    } catch (err) {
      out.innerHTML = `<div class="card">⚠️ ${UI.esc(err && err.message ? err.message : "Fehler bei der Erklärung.")}</div>`;
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- Hinzufügen ----------
  function renderAdd(container) {
    container.innerHTML = `
      <button class="btn" id="med-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">Medikament hinzufügen</h2>
      <div class="card">
        <label for="med-name"><strong>Name *</strong></label>
        <input id="med-name" type="text" placeholder="z. B. Ramipril 5 mg" style="width:100%;margin-top:6px;padding:12px;font-size:1.1rem;border:1px solid var(--border);border-radius:12px" />

        <label for="med-dose" style="display:block;margin-top:14px"><strong>Dosis / Menge</strong></label>
        <input id="med-dose" type="text" placeholder="z. B. 1 Tablette" style="width:100%;margin-top:6px;padding:12px;font-size:1.1rem;border:1px solid var(--border);border-radius:12px" />

        <div style="margin-top:14px"><strong>Einnahmezeiten</strong></div>
        <div class="ki-examples" style="margin-top:8px">
          ${TIMES.map(
            (t) => `<label class="ki-example" style="cursor:pointer"><input type="checkbox" value="${UI.esc(t)}" class="med-time" style="margin-right:6px" />${UI.esc(t)}</label>`,
          ).join("")}
        </div>

        <label for="med-note" style="display:block;margin-top:14px"><strong>Notiz</strong></label>
        <input id="med-note" type="text" placeholder="z. B. nach dem Essen" style="width:100%;margin-top:6px;padding:12px;font-size:1.1rem;border:1px solid var(--border);border-radius:12px" />
      </div>
      <button class="btn" id="med-save" style="margin-top:8px">Speichern</button>
      <div id="med-save-status" class="muted" style="margin-top:8px"></div>
    `;

    container.querySelector("#med-back").addEventListener("click", () => {
      reset();
      renderInto(container);
    });

    container.querySelector("#med-save").addEventListener("click", async () => {
      const name = container.querySelector("#med-name").value.trim();
      if (!name) {
        container.querySelector("#med-save-status").textContent = "Bitte einen Namen eingeben.";
        return;
      }
      const times = Array.from(container.querySelectorAll(".med-time:checked")).map((c) => c.value);
      await DB.put(
        {
          id: crypto.randomUUID(),
          name,
          dose: container.querySelector("#med-dose").value.trim(),
          times,
          note: container.querySelector("#med-note").value.trim(),
          createdAt: Date.now(),
        },
        "medications",
      );
      reset();
      renderInto(container);
    });
  }

  return { renderInto, reset };
})();
