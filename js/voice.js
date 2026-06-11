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

  return { supported, listen };
})();
