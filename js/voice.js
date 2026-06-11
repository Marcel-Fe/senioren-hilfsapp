/* Spracheingabe (Diktat) über die Web Speech API des Browsers — rein lokal, nichts wird
   an einen Server gesendet (die Erkennung macht der Browser/das Gerät). Global als `Voice`.
   Nicht jeder Browser unterstützt das; `supported()` prüft das vorab. */

"use strict";

const Voice = (() => {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;

  function supported() {
    return !!Rec;
  }

  // Startet eine einzelne Diktat-Aufnahme. callbacks: { onStart, onResult(text), onEnd, onError(code) }.
  // Gibt das Recognition-Objekt zurück (zum Abbrechen via .stop()), oder null wenn nicht unterstützt.
  function listen(cb) {
    cb = cb || {};
    if (!Rec) {
      if (cb.onError) cb.onError("not-supported");
      return null;
    }
    const r = new Rec();
    r.lang = "de-DE";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.continuous = false;
    if (cb.onStart) r.onstart = () => cb.onStart();
    r.onresult = (e) => {
      const text = e.results && e.results[0] && e.results[0][0] ? e.results[0][0].transcript : "";
      if (cb.onResult) cb.onResult(text.trim());
    };
    if (cb.onError) r.onerror = (e) => cb.onError(e.error || "error");
    if (cb.onEnd) r.onend = () => cb.onEnd();
    try {
      r.start();
    } catch (err) {
      if (cb.onError) cb.onError("start-failed");
      return null;
    }
    return r;
  }

  // ---------- Sprachausgabe (Vorlesen) ----------
  const synth = window.speechSynthesis;

  function ttsSupported() {
    return !!synth;
  }
  function speaking() {
    return !!synth && synth.speaking;
  }
  function stopSpeak() {
    if (synth) synth.cancel();
  }
  // Liest Text vor (Deutsch, etwas langsamer für gute Verständlichkeit).
  function speak(text, cb) {
    cb = cb || {};
    if (!synth || !text) {
      if (cb.onError) cb.onError("not-supported");
      return false;
    }
    synth.cancel(); // laufende Ausgabe beenden
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = "de-DE";
    u.rate = 0.95;
    u.pitch = 1;
    const de = (synth.getVoices() || []).find((v) => v.lang && v.lang.toLowerCase().startsWith("de"));
    if (de) u.voice = de;
    if (cb.onStart) u.onstart = () => cb.onStart();
    if (cb.onEnd) {
      u.onend = () => cb.onEnd();
      u.onerror = () => cb.onEnd();
    }
    synth.speak(u);
    return true;
  }

  return { supported, listen, ttsSupported, speaking, stopSpeak, speak };
})();
