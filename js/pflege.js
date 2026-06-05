/* Pflege-Bereich: Pflegegrad erfassen und die wichtigsten Pflege-Leistungen
   in einfacher Sprache erklären lassen (KI). Pflegegrad liegt lokal im "settings"-Store
   (Datensatz id "pflege"). Global als `Pflege`.
   WICHTIG (Spec): keine rechtlich verbindlichen Aussagen, keine Bewilligungs-Garantie. */

"use strict";

const Pflege = (() => {
  const ID = "pflege";
  const GRADE = ["1", "2", "3", "4", "5"];

  const LEISTUNGEN = [
    { name: "Pflegegeld", kurz: "Geld für die selbst organisierte Pflege zu Hause." },
    { name: "Pflegesachleistung", kurz: "Ein Pflegedienst übernimmt die Pflege zu Hause." },
    { name: "Entlastungsbetrag (125 €)", kurz: "Monatlicher Betrag für Betreuung und Entlastung." },
    { name: "Verhinderungspflege", kurz: "Ersatzpflege, wenn die Pflegeperson verhindert ist." },
    { name: "Kurzzeitpflege", kurz: "Vorübergehende Pflege im Heim, z. B. nach einem Krankenhaus." },
    { name: "Pflegehilfsmittel", kurz: "Verbrauchsmittel wie Handschuhe oder Betteinlagen." },
  ];

  function reset() {}

  async function renderInto(container) {
    const rec = (await DB.get(ID, "settings")) || {};
    const grad = rec.grad || null;
    const gradLabel = grad === "beantragt" ? "beantragt" : grad ? `Pflegegrad ${grad}` : null;

    container.innerHTML = `
      <button class="btn" id="pf-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">🤝 Pflege</h2>
      <p class="view-subtitle">Pflegegrad und Leistungen — einfach erklärt.</p>

      <div class="card">
        <strong>Pflegegrad</strong>
        <div style="margin-top:4px">${gradLabel ? `Aktuell: <strong>${UI.esc(gradLabel)}</strong>` : '<span class="muted">noch nicht eingetragen</span>'}</div>
        <div class="ki-examples" style="margin-top:10px">
          ${GRADE.map((g) => `<button class="ki-example" data-grad="${g}">Grad ${g}</button>`).join("")}
          <button class="ki-example" data-grad="beantragt">Beantragt</button>
          <button class="ki-example" data-grad="">— keiner —</button>
        </div>
        <button class="btn" id="pf-form" style="margin-top:12px">📝 Pflegeantrag ausfüllen</button>
      </div>

      <h3 class="section-title">Leistungen</h3>
      ${LEISTUNGEN.map(
        (l, i) => `
        <div class="card" data-leist="${i}">
          <strong style="font-size:1.15rem">${UI.esc(l.name)}</strong>
          <div class="muted" style="margin-top:4px">${UI.esc(l.kurz)}</div>
          <button class="btn" data-explain style="margin-top:10px;background:#e8edf6;color:var(--text)">🧠 Einfach erklären</button>
          <div data-out style="margin-top:6px"></div>
        </div>`,
      ).join("")}

      <p class="ui-hinweis" style="margin-top:16px">ℹ️ Nur zur Information, ersetzt keine rechtliche Beratung. Über Leistungen entscheidet die Pflegekasse.</p>
    `;

    container.querySelector("#pf-back").addEventListener("click", () => setTab("mehr"));

    container.querySelectorAll("[data-grad]").forEach((b) =>
      b.addEventListener("click", async () => {
        await DB.put({ id: ID, grad: b.dataset.grad || null }, "settings");
        renderInto(container);
      }),
    );

    container
      .querySelector("#pf-form")
      .addEventListener("click", () => openForm("Pflegeantrag (Pflegegrad beantragen)"));

    container.querySelectorAll("[data-leist]").forEach((card) => {
      const i = Number(card.dataset.leist);
      card.querySelector("[data-explain]").addEventListener("click", async () => {
        const out = card.querySelector("[data-out]");
        const btn = card.querySelector("[data-explain]");
        btn.disabled = true;
        out.innerHTML = `<div class="card muted">Die KI erklärt die Leistung …</div>`;
        try {
          const data = await KI.chat([
            {
              role: "user",
              content:
                `Erkläre die Pflege-Leistung „${LEISTUNGEN[i].name}“ in einfacher Sprache: ` +
                `Was ist das, wofür ist es da und wer bekommt es ungefähr? Keine rechtlich verbindliche Aussage.`,
            },
          ]);
          out.innerHTML = UI.resultHtml(data);
        } catch (err) {
          out.innerHTML = `<div class="card">⚠️ ${UI.esc(err && err.message ? err.message : "Fehler bei der Erklärung.")}</div>`;
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  return { renderInto, reset };
})();
