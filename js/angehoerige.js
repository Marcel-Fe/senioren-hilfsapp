/* Angehörige / Teilen: erzeugt aus Notfall-, Gesundheits-, Mediplan- und Profildaten
   eine lesbare Zusammenfassung zum Weitergeben — per System-Teilen (navigator.share),
   Kopieren oder Drucken. Rein lokal, kein Backend, keine KI. Global als `Angehoerige`.
   HINWEIS: Echtes Mehrnutzer-Sharing mit Freigaben/Rollen bräuchte ein Backend (Supabase)
   und ist bewusst NICHT enthalten. */

"use strict";

const Angehoerige = (() => {
  let lastText = "";

  function reset() {
    lastText = "";
  }

  const E = (s) => UI.esc(s);

  // Baut die Zusammenfassung als reinen Text (gut für Teilen/Kopieren/Drucken).
  async function buildSummary() {
    const profil = (typeof Profil !== "undefined" && Profil.get) ? await Profil.get() : {};
    const notfall = (await DB.get("notfall", "settings")) || {};
    const gesundheit = (await DB.get("gesundheit", "settings")) || {};
    const meds = await DB.getAll("medications");

    const L = [];
    const add = (s) => L.push(s);
    const heute = new Date().toLocaleDateString("de-DE");

    add("ÜBERSICHT FÜR ANGEHÖRIGE");
    add(`Erstellt am ${heute}`);
    add("");

    const name = notfall.eigenerName || (profil && profil.name) || "";
    if (name || notfall.blutgruppe) {
      add("— PERSON —");
      if (name) add(`Name: ${name}`);
      if (notfall.blutgruppe) add(`Blutgruppe: ${notfall.blutgruppe}`);
      add("");
    }

    add("— NOTFALLKONTAKT —");
    if (notfall.kontaktName || notfall.kontaktTel) {
      if (notfall.kontaktName) add(`Name: ${notfall.kontaktName}`);
      if (notfall.kontaktTel) add(`Telefon: ${notfall.kontaktTel}`);
    } else {
      add("(nicht hinterlegt)");
    }
    add("");

    add("— HAUSARZT —");
    if (notfall.hausarztName || notfall.hausarztTel) {
      if (notfall.hausarztName) add(`Name: ${notfall.hausarztName}`);
      if (notfall.hausarztTel) add(`Telefon: ${notfall.hausarztTel}`);
    } else {
      add("(nicht hinterlegt)");
    }
    add("");

    // Allergien: Notfall-Feld + Gesundheitsakte zusammenführen.
    const allergien = [];
    if (notfall.allergien) allergien.push(notfall.allergien);
    if (Array.isArray(gesundheit.allergien)) gesundheit.allergien.forEach((a) => a.text && allergien.push(a.text));
    add("— ALLERGIEN —");
    add(allergien.length ? allergien.join(", ") : "(keine Angabe)");
    add("");

    // Diagnosen: Notfall-Feld + Gesundheitsakte.
    const diagnosen = [];
    if (notfall.diagnosen) diagnosen.push(notfall.diagnosen);
    if (Array.isArray(gesundheit.diagnosen)) gesundheit.diagnosen.forEach((d) => d.text && diagnosen.push(d.text));
    add("— DIAGNOSEN —");
    add(diagnosen.length ? diagnosen.join(", ") : "(keine Angabe)");
    add("");

    add("— MEDIKAMENTE —");
    if (meds.length) {
      meds
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((m) => {
          const t = (m.times || []).length ? ` [${m.times.join(", ")}]` : "";
          add(`• ${m.name}${m.dose ? " – " + m.dose : ""}${t}`);
        });
    } else {
      add("(keine eingetragen)");
    }
    add("");

    // Arztkontakte aus der Gesundheitsakte.
    if (Array.isArray(gesundheit.aerzte) && gesundheit.aerzte.length) {
      add("— WEITERE ÄRZTE —");
      gesundheit.aerzte.forEach((a) => {
        add(`• ${a.name}${a.fach ? " (" + a.fach + ")" : ""}${a.tel ? " – " + a.tel : ""}`);
      });
      add("");
    }

    add("Diese Übersicht stammt aus der App „Alltagsbegleiter“ und ersetzt keine ärztliche Beratung.");

    return L.join("\n");
  }

  async function renderInto(container) {
    container.innerHTML = `
      <button class="btn" id="ang-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">👨‍👩‍👧 Angehörige</h2>
      <p class="view-subtitle">Erzeugen Sie eine Übersicht Ihrer wichtigsten Daten zum Weitergeben an Familie oder Pflegekräfte.</p>

      <div class="card">
        <strong>Was wird geteilt?</strong>
        <p class="muted" style="margin:.4rem 0 0">Notfallkontakt, Hausarzt, Allergien, Diagnosen und Medikamente — aus Notfall, Gesundheitsakte und Mediplan. Es werden keine Daten ins Internet gesendet; Sie entscheiden selbst, an wen Sie die Übersicht weitergeben.</p>
      </div>

      <button class="btn" id="ang-build">📋 Übersicht erstellen</button>
      <div id="ang-out" style="margin-top:16px"></div>
    `;

    container.querySelector("#ang-back").addEventListener("click", () => setTab("mehr"));
    container.querySelector("#ang-build").addEventListener("click", () => showSummary(container));
  }

  async function showSummary(container) {
    const out = container.querySelector("#ang-out");
    out.innerHTML = `<div class="card muted">Übersicht wird erstellt …</div>`;
    lastText = await buildSummary();

    const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    out.innerHTML = `
      <div class="card">
        <strong>Ihre Übersicht</strong>
        <pre id="ang-text" style="white-space:pre-wrap;font-family:inherit;font-size:1.02rem;margin:.6rem 0 0">${E(lastText)}</pre>
      </div>
      <div class="ui-actions">
        ${canShare ? `<button class="btn" id="ang-share">📤 Teilen</button>` : ""}
        <button class="btn" id="ang-copy" style="background:#e8edf6;color:var(--text)">📄 Kopieren</button>
        <button class="btn" id="ang-print" style="background:#e8edf6;color:var(--text)">🖨️ Drucken</button>
      </div>
      <div id="ang-status" class="muted" style="margin-top:8px"></div>
    `;

    const status = out.querySelector("#ang-status");

    const shareBtn = out.querySelector("#ang-share");
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        try {
          await navigator.share({ title: "Übersicht für Angehörige", text: lastText });
        } catch (err) {
          /* Vom Nutzer abgebrochen oder nicht unterstützt — kein Fehler anzeigen. */
        }
      });
    }

    out.querySelector("#ang-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(lastText);
        status.textContent = "✅ In die Zwischenablage kopiert.";
      } catch (err) {
        status.textContent = "Kopieren nicht möglich — bitte Text markieren und manuell kopieren.";
      }
    });

    out.querySelector("#ang-print").addEventListener("click", () => printSummary(lastText));
  }

  // Öffnet ein eigenes Fenster nur mit dem Text und ruft den Druckdialog.
  function printSummary(text) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Übersicht für Angehörige</title>` +
        `<style>body{font-family:system-ui,sans-serif;font-size:14pt;line-height:1.5;padding:24px;white-space:pre-wrap}</style>` +
        `</head><body>${E(text)}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return { renderInto, reset };
})();
