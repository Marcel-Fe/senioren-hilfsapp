/* KI-Assistent: fortlaufendes Gespräch (Dialog) mit der KI. Text- und Spracheingabe,
   Antworten können vorgelesen werden. Nutzt den Chat-Modus des Workers mit vollem Verlauf,
   damit Rückfragen im Kontext beantwortet werden. Global als `Assistent`. */

"use strict";

const Assistent = (() => {
  let messages = []; // [{ role:"user"|"assistant", content, hinweis? }]
  let pending = null; // gewünschte erste Frage (z. B. vom Dashboard)
  let autoStartMic = false;
  let busy = false;
  let mic = null;

  function reset() {
    messages = [];
    pending = null;
    autoStartMic = false;
    busy = false;
    if (mic) {
      try { mic.stop(); } catch (e) {}
      mic = null;
    }
    if (typeof Voice !== "undefined") Voice.stopSpeak();
  }

  // Vom Dashboard: mit einer Frage starten bzw. direkt das Mikrofon öffnen.
  function startWith(text) {
    pending = text || null;
  }
  function startListening() {
    autoStartMic = true;
  }

  const E = (s) => UI.esc(s);

  function answerText(data) {
    let t = (data.zusammenfassung || "").trim();
    if (Array.isArray(data.details) && data.details.length) {
      t += (t ? "\n\n" : "") + data.details.map((d) => "• " + d).join("\n");
    }
    return t || "Dazu habe ich gerade keine Antwort. Bitte fragen Sie anders.";
  }

  function bubbles() {
    return messages
      .map((m, i) => {
        if (m.role === "user") {
          return `<div class="chat-bubble chat-mine">${E(m.content)}</div>`;
        }
        return `<div class="chat-bubble chat-ai">
          <div>${E(m.content).replace(/\n/g, "<br>")}</div>
          <button class="mini-action" data-speak-idx="${i}">🔊 Vorlesen</button>
          ${m.hinweis ? `<div class="muted" style="font-size:.82rem;margin-top:8px">ℹ️ ${E(m.hinweis)}</div>` : ""}
        </div>`;
      })
      .join("");
  }

  async function renderInto(container) {
    const usable = typeof Voice !== "undefined" && Voice.dictationUsable();
    const ios = typeof Voice !== "undefined" && Voice.onIOS();
    const showMic = typeof Voice !== "undefined" && (Voice.supported() || ios);

    const intro = messages.length
      ? ""
      : `<div class="card" style="background:var(--primary-soft);border-color:#c9d3ff">
           <strong>💬 Ihr KI-Assistent</strong>
           <p style="margin:.4rem 0 0">Stellen Sie eine Frage — tippen oder über das Mikrofon sprechen. Sie können nachfragen und ein Gespräch führen. Die Antworten kann ich Ihnen vorlesen.</p>
         </div>`;

    container.innerHTML = `
      <button class="btn" id="as-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">💬 KI-Assistent</h2>
      ${intro}
      <div class="chat-log" id="as-log">${bubbles()}${busy ? `<div class="chat-bubble chat-ai muted ki-thinking"><span class="spinner"></span><span>Einen Moment …</span></div>` : ""}</div>

      <div class="ki-box" style="margin-top:14px">
        <div class="ki-input-row">
          <textarea id="as-input" placeholder="Ihre Frage …" ${busy ? "disabled" : ""}></textarea>
          ${showMic ? `<button class="mic-btn" id="as-mic" aria-label="Sprechen" ${busy ? "disabled" : ""}>🎤</button>` : ""}
        </div>
        <div id="as-mic-status" class="muted" style="margin-top:8px;min-height:1.2em"></div>
        <button class="btn" id="as-send" ${busy ? "disabled" : ""}>Senden</button>
      </div>
      <p class="ui-hinweis" style="margin-top:14px">ℹ️ Nur zur Information, ersetzt keine ärztliche oder rechtliche Beratung. Im Notfall 112.</p>
    `;

    const input = container.querySelector("#as-input");
    const status = container.querySelector("#as-mic-status");
    const log = container.querySelector("#as-log");
    if (log) log.scrollTop = log.scrollHeight;

    container.querySelector("#as-back").addEventListener("click", () => setTab("dashboard"));

    // Vorlesen je Antwort
    container.querySelectorAll("[data-speak-idx]").forEach((b) =>
      b.addEventListener("click", () => {
        const m = messages[Number(b.dataset.speakIdx)];
        if (!m) return;
        if (Voice.speaking()) {
          Voice.stopSpeak();
          b.textContent = "🔊 Vorlesen";
          return;
        }
        b.textContent = "⏹️ Stopp";
        Voice.speak(m.content, {
          voiceURI: voicePref.voiceURI,
          rate: voicePref.rate,
          onEnd: () => { b.textContent = "🔊 Vorlesen"; },
        });
      }),
    );

    // Senden (Text)
    const sendBtn = container.querySelector("#as-send");
    sendBtn.addEventListener("click", () => {
      const text = input.value.trim();
      if (text) send(container, text, false);
    });

    // Mikrofon
    const micBtn = container.querySelector("#as-mic");
    if (micBtn) {
      micBtn.addEventListener("click", () => toggleMic(container, micBtn, input, status));
    }

    // Erste Frage vom Dashboard automatisch senden.
    if (pending && !messages.length && !busy) {
      const q = pending;
      pending = null;
      send(container, q, false);
      return;
    }
    // Mikrofon automatisch starten (vom Dashboard angefordert).
    if (autoStartMic && micBtn && !busy) {
      autoStartMic = false;
      toggleMic(container, micBtn, input, status);
    }
  }

  function toggleMic(container, micBtn, input, status) {
    if (mic) {
      try { mic.stop(); } catch (e) {}
      return;
    }
    // iOS / nicht nutzbar: ehrlicher Hinweis auf das Tastatur-Mikrofon.
    if (!Voice.dictationUsable()) {
      status.textContent = Voice.onIOS()
        ? "Auf dem iPhone/iPad: Tippen Sie ins Textfeld und drücken Sie das 🎤 unten auf Ihrer Tastatur, um zu diktieren."
        : "Spracheingabe wird in diesem Browser nicht unterstützt. Bitte tippen Sie Ihre Frage.";
      input.focus();
      return;
    }
    let heard = "";
    mic = Voice.listen({
      onStart: () => {
        micBtn.classList.add("recording");
        status.textContent = "🎤 Ich höre zu – sprechen Sie jetzt …";
      },
      onResult: (t) => {
        heard = t;
        input.value = input.value ? input.value.trim() + " " + t : t;
      },
      onEnd: () => {
        micBtn.classList.remove("recording");
        mic = null;
        if (heard) {
          status.textContent = "Verstanden – wird gesendet …";
          const text = input.value.trim();
          if (text) send(container, text, true); // per Sprache → Antwort wird vorgelesen
        } else {
          status.textContent = "Ich habe nichts gehört. Bitte tippen Sie auf 🎤 und sprechen Sie noch einmal.";
        }
      },
      onError: (code) => {
        micBtn.classList.remove("recording");
        mic = null;
        if (code === "not-allowed" || code === "service-not-allowed") {
          status.textContent = "Bitte erlauben Sie den Zugriff auf das Mikrofon (in den Browser-Einstellungen).";
        } else if (code === "no-speech") {
          status.textContent = "Ich habe nichts gehört. Bitte noch einmal versuchen.";
        } else {
          status.textContent = "Spracheingabe gerade nicht möglich. Bitte tippen Sie Ihre Frage.";
        }
      },
    });
  }

  async function send(container, text, spoken) {
    if (busy) return;
    messages.push({ role: "user", content: text });
    busy = true;
    await renderInto(container);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const data = await KI.chat(history);
      const txt = answerText(data);
      messages.push({ role: "assistant", content: txt, hinweis: data.hinweis || "" });
      busy = false;
      await renderInto(container);
      // Wenn die Frage gesprochen wurde, Antwort automatisch vorlesen (Sprach-Dialog).
      if (spoken && typeof Voice !== "undefined" && Voice.ttsSupported()) {
        Voice.speak(txt, { voiceURI: voicePref.voiceURI, rate: voicePref.rate });
      }
    } catch (err) {
      messages.push({
        role: "assistant",
        content: "⚠️ " + (err && err.message ? err.message : "Die KI ist gerade nicht erreichbar. Bitte versuchen Sie es noch einmal."),
        hinweis: "",
      });
      busy = false;
      await renderInto(container);
    }
  }

  return { renderInto, reset, startWith, startListening };
})();
