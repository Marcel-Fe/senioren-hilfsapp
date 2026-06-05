/* Formular-Modus: hilft beim Ausfüllen amtlicher Formulare Schritt für Schritt
   und erstellt am Ende einen ENTWURF. Reine KI-Führung über den Worker (mode "formular").
   Kein rechtlich verbindlicher Inhalt — jeder Entwurf ist klar als Entwurf markiert.
   Global als `Formulare`. */

"use strict";

const Formulare = (() => {
  const FORM_TYPES = [
    "Pflegeantrag (Pflegegrad beantragen)",
    "Höherstufung des Pflegegrads",
    "Verhinderungspflege",
    "Entlastungsbetrag (125 €)",
    "Wohngeld",
  ];

  const view = { mode: "select", formart: null, messages: [], entwurf: null, hinweis: "", busy: false };

  function reset() {
    view.mode = "select";
    view.formart = null;
    view.messages = [];
    view.entwurf = null;
    view.hinweis = "";
    view.busy = false;
  }

  async function renderInto(container) {
    if (view.mode === "chat") return renderChat(container);
    return renderSelect(container);
  }

  // ---------- Auswahl ----------
  function renderSelect(container) {
    container.innerHTML = `
      <h2 class="view-title">Formulare</h2>
      <p class="view-subtitle">Amtliche Formulare Schritt für Schritt ausfüllen — das Ergebnis ist immer ein Entwurf.</p>
      <ul class="list">
        ${FORM_TYPES.map(
          (f) => `<li data-form="${UI.esc(f)}" style="cursor:pointer"><span aria-hidden="true">📝</span><span style="flex:1">${UI.esc(f)}</span><span aria-hidden="true">›</span></li>`,
        ).join("")}
        <li data-form-custom="1" style="cursor:pointer"><span aria-hidden="true">✏️</span><span style="flex:1">Anderes Formular …</span><span aria-hidden="true">›</span></li>
      </ul>
    `;
    container.querySelectorAll("[data-form]").forEach((el) =>
      el.addEventListener("click", () => startForm(el.dataset.form, container)),
    );
    container.querySelector("[data-form-custom]").addEventListener("click", () => {
      const name = prompt("Welches Formular möchten Sie ausfüllen?");
      if (name && name.trim()) startForm(name.trim(), container);
    });
  }

  // ---------- Start eines Formulars ----------
  async function startForm(formart, container) {
    view.mode = "chat";
    view.formart = formart;
    view.entwurf = null;
    view.hinweis = "";
    view.messages = [
      {
        role: "user",
        content: `Ich möchte das Formular „${formart}“ ausfüllen. Bitte führe mich Schritt für Schritt und stelle die erste Frage.`,
      },
    ];
    renderChat(container);
    await ask(container);
  }

  // ---------- KI-Aufruf ----------
  async function ask(container) {
    view.busy = true;
    renderChat(container);
    try {
      const data = await KI.formular(view.formart, view.messages);
      view.messages.push({ role: "assistant", content: data.nachricht || "" });
      if (data.entwurf) view.entwurf = data.entwurf;
      view.hinweis = data.hinweis || view.hinweis;
    } catch (err) {
      view.messages.push({
        role: "assistant",
        content: "⚠️ " + (err && err.message ? err.message : "Die KI ist gerade nicht erreichbar."),
      });
    } finally {
      view.busy = false;
      renderChat(container);
    }
  }

  // ---------- Chat-Ansicht ----------
  function renderChat(container) {
    const bubbles = view.messages
      .map((m) => {
        const mine = m.role === "user";
        return `<div class="chat-bubble ${mine ? "chat-mine" : "chat-ai"}">${UI.esc(m.content)}</div>`;
      })
      .join("");

    const entwurf = view.entwurf
      ? `<div class="entwurf-box">
           <strong>📄 Entwurf</strong>
           <pre id="entwurf-text">${UI.esc(view.entwurf)}</pre>
           <button class="btn" id="entwurf-copy" style="margin-top:10px">📋 Entwurf kopieren</button>
         </div>`
      : "";

    container.innerHTML = `
      <button class="btn" id="form-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück zur Auswahl</button>
      <h2 class="view-title">${UI.esc(view.formart)}</h2>
      <div class="chat-log">${bubbles}${view.busy ? `<div class="chat-bubble chat-ai muted">Die KI denkt nach …</div>` : ""}</div>
      ${entwurf}
      <div class="ki-box" style="margin-top:14px">
        <textarea id="form-input" placeholder="Ihre Antwort …" ${view.busy ? "disabled" : ""}></textarea>
        <button class="btn" id="form-send" style="margin-top:10px" ${view.busy ? "disabled" : ""}>Antwort senden</button>
      </div>
      <p class="ui-hinweis" style="margin-top:14px">ℹ️ ${UI.esc(view.hinweis || "Dies ist ein Entwurf und keine offizielle Prüfung. Nur zur Information, ersetzt keine rechtliche Beratung.")}</p>
    `;

    container.querySelector("#form-back").addEventListener("click", () => {
      reset();
      renderInto(container);
    });

    const copyBtn = container.querySelector("#entwurf-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(view.entwurf || "");
          copyBtn.textContent = "✅ Kopiert";
        } catch {
          copyBtn.textContent = "Kopieren nicht möglich";
        }
      });
    }

    const sendBtn = container.querySelector("#form-send");
    if (sendBtn && !view.busy) {
      sendBtn.addEventListener("click", async () => {
        const input = container.querySelector("#form-input");
        const text = input.value.trim();
        if (!text) return;
        view.messages.push({ role: "user", content: text });
        await ask(container);
      });
    }
  }

  return { renderInto, reset, startForm };
})();
