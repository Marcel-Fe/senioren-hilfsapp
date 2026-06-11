/* Einheitlicher Renderer für KI-Antworten im Spec-Format:
   [Überschrift] [Zusammenfassung] [Details] [Fristen/Aufgaben] [Aktionen] [Hinweis].
   Liefert HTML-String. Global als `UI`. */

"use strict";

const UI = (() => {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  }

  function bullets(items, mapFn) {
    return `<ul class="ui-list">${items.map(mapFn).join("")}</ul>`;
  }

  // data: KI-Antwort. extraActions: [{label, attr}] → echte Buttons (Caller verdrahtet via attr).
  function resultHtml(data, extraActions) {
    const d = data || {};
    extraActions = extraActions || [];

    const klass = d.klassifikation
      ? `<span class="ui-badge">${esc(d.klassifikation)}</span>`
      : "";

    const details =
      Array.isArray(d.details) && d.details.length
        ? `<div class="card"><strong>Details</strong>${bullets(d.details, (x) => `<li>${esc(x)}</li>`)}</div>`
        : "";

    const fristen =
      Array.isArray(d.fristen) && d.fristen.length
        ? `<div class="card"><strong>Fristen &amp; Termine</strong>${bullets(
            d.fristen,
            (f) => `<li>${esc(f.titel)}${f.datum ? ` — <strong>${esc(f.datum)}</strong>` : ""}</li>`,
          )}</div>`
        : "";

    const aufgaben =
      Array.isArray(d.aufgaben) && d.aufgaben.length
        ? `<div class="card"><strong>Aufgaben</strong>${bullets(d.aufgaben, (t) => `<li>${esc(t.titel)}</li>`)}</div>`
        : "";

    const aktionen =
      Array.isArray(d.aktionen) && d.aktionen.length
        ? `<div class="ui-chips">${d.aktionen.map((a) => `<span class="ui-chip">${esc(a)}</span>`).join("")}</div>`
        : "";

    const extra = extraActions.length
      ? `<div class="ui-actions">${extraActions
          .map((a) => `<button class="btn" ${a.attr || ""}>${esc(a.label)}</button>`)
          .join("")}</div>`
      : "";

    // Text zum Vorlesen aus allen Teilen zusammensetzen.
    const speakParts = [d.ueberschrift, d.zusammenfassung]
      .concat(Array.isArray(d.details) ? d.details : [])
      .concat(Array.isArray(d.fristen) ? d.fristen.map((f) => `${f.titel}${f.datum ? " am " + f.datum : ""}`) : [])
      .concat(Array.isArray(d.aufgaben) ? d.aufgaben.map((t) => t.titel) : [])
      .concat([d.hinweis])
      .filter(Boolean)
      .join(". ");
    const canSpeak = typeof Voice !== "undefined" && Voice.ttsSupported && Voice.ttsSupported();
    const speakBtn = canSpeak
      ? `<button class="btn speak-btn" type="button" style="background:#e8edf6;color:var(--text);margin-bottom:12px">🔊 Vorlesen</button>
         <span class="speak-src" hidden>${esc(speakParts)}</span>`
      : "";

    return `
      <div class="ui-result">
        <h3 class="ui-heading">${esc(d.ueberschrift || "Antwort")} ${klass}</h3>
        ${speakBtn}
        <div class="card"><strong>Zusammenfassung</strong>
          <p style="margin:.4rem 0 0">${esc(d.zusammenfassung || "")}</p></div>
        ${details}
        ${fristen}
        ${aufgaben}
        ${aktionen}
        ${extra}
        <p class="ui-hinweis">ℹ️ ${esc(d.hinweis || "")}</p>
      </div>`;
  }

  return { resultHtml, esc };
})();
