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

  // Link zum offiziellen Formular — nutzt Profil (Kasse/Bundesland) für eine gezielte Suche.
  function officialUrl(name, profil) {
    const base = name.replace(/\s*\(.*?\)\s*/g, " ").trim();
    let q = base + " offizielles Formular online ausfüllen";
    if (/Wohngeld/i.test(name) && profil.bundesland) {
      q = `Wohngeldantrag online ausfüllen ${profil.bundesland}`;
    } else if (profil.kasse) {
      q = `${base} Antrag online ${profil.kasse}`;
    }
    return "https://www.google.com/search?q=" + encodeURIComponent(q);
  }

  // ---------- Auswahl ----------
  async function renderSelect(container) {
    const profil = typeof Profil !== "undefined" ? await Profil.get() : {};
    const profilBar =
      profil.kasse || profil.bundesland
        ? `<div class="card muted">Profil: <strong>${UI.esc(profil.kasse || "")}</strong>${profil.bundesland ? ` · ${UI.esc(profil.bundesland)}` : ""} <button class="ui-chip" id="form-profil" style="cursor:pointer">ändern</button></div>`
        : `<div class="card">💡 Tipp: Hinterlegen Sie Ihre <button class="ui-chip" id="form-profil" style="cursor:pointer">Pflegekasse / Bundesland im Profil</button> — dann führen die Links direkt zur richtigen Stelle.</div>`;

    container.innerHTML = `
      <h2 class="view-title">Formulare</h2>
      <p class="view-subtitle">Wählen Sie ein Formular.</p>

      ${profilBar}

      <div class="card" style="background:var(--primary-soft);border-color:#c9dbfb">
        <strong>„🧠 Mit KI ausfüllen"</strong> führt Sie Schritt für Schritt und erstellt einen Entwurf.<br />
        <strong>„🔗 Offizielles Formular online"</strong> öffnet das echte Formular im Internet zum direkten Ausfüllen.
      </div>

      ${FORM_TYPES.map(
        (f) => `
        <div class="card">
          <strong style="font-size:1.15rem">📝 ${UI.esc(f)}</strong>
          <div class="ui-actions" style="margin-top:12px">
            <button class="btn" data-form="${UI.esc(f)}">🧠 Mit KI ausfüllen (Entwurf)</button>
            <a class="btn" style="background:#e8edf6;color:var(--text)" href="${officialUrl(f, profil)}" target="_blank" rel="noopener">🔗 Offizielles Formular online</a>
          </div>
        </div>`,
      ).join("")}

      <button class="btn" id="form-custom" style="margin-top:8px;background:#e8edf6;color:var(--text)">✏️ Anderes Formular …</button>
      <p class="ui-hinweis" style="margin-top:16px">ℹ️ Das offizielle Formular hängt von Ihrer Pflegekasse oder Ihrem Amt ab. Ein KI-Entwurf ist keine offizielle Prüfung.</p>
    `;

    const prBtn = container.querySelector("#form-profil");
    if (prBtn) prBtn.addEventListener("click", () => setTab("profil"));
    container.querySelectorAll("[data-form]").forEach((el) =>
      el.addEventListener("click", () => startForm(el.dataset.form, container)),
    );
    container.querySelector("#form-custom").addEventListener("click", () => {
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
