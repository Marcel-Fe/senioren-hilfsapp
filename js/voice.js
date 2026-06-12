/* Sprache: Eingabe (Diktat) + Ausgabe (Vorlesen) über die Web Speech API des Browsers.
   Rein lokal — nichts wird an einen Server gesendet; Erkennung/Stimmen liefert das Gerät.
   Beim Vorlesen wird automatisch die natürlichste verfügbare deutsche Stimme gewählt
   (neuronale/Online-Stimmen werden bevorzugt). Global als `Voice`. */

"use strict";

const Voice = (() => {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  let voicesCache = [];

  function refresh() {
    if (synth) voicesCache = synth.getVoices() || [];
    return voicesCache;
  }
  if (synth) {
    refresh();
    // Stimmen werden in vielen Browsern erst asynchron geladen.
    synth.addEventListener("voiceschanged", refresh);
  }

  // ---------- Spracheingabe (Diktat) ----------
  function supported() {
    return !!Rec;
  }
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
  function ttsSupported() {
    return !!synth;
  }
  function speaking() {
    return !!synth && synth.speaking;
  }
  function stopSpeak() {
    if (synth) synth.cancel();
  }

  // Wartet, bis die Stimmenliste geladen ist (oder kurz danach).
  function ready() {
    return new Promise((resolve) => {
      if (!synth) return resolve([]);
      const v = synth.getVoices();
      if (v && v.length) {
        voicesCache = v;
        return resolve(v);
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        voicesCache = synth.getVoices() || [];
        resolve(voicesCache);
      };
      synth.addEventListener("voiceschanged", finish, { once: true });
      setTimeout(finish, 1500);
    });
  }

  function allVoices() {
    return voicesCache.length ? voicesCache : refresh();
  }
  function deVoices() {
    return allVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith("de"));
  }
  // Benachrichtigt, wenn die Stimmenliste (nach)geladen wurde.
  function onChange(cb) {
    if (synth) synth.addEventListener("voiceschanged", cb, { once: true });
  }

  // Höhere Punktzahl = natürlicher klingende Stimme.
  function score(v) {
    const n = (v.name || "").toLowerCase();
    let s = 0;
    if (/neural|natural|natürlich|online|premium|enhanced|wavenet|studio/.test(n)) s += 6;
    if (/google/.test(n)) s += 3;
    if (/siri|stimme/.test(n)) s += 3;
    if (v.localService === false) s += 2; // Online-Stimmen klingen oft besser
    if (/compact|kompakt|eloquence/.test(n)) s -= 4; // alte, blechern klingende Stimmen
    if (v.default) s += 1;
    return s;
  }

  function bestDe() {
    const list = deVoices();
    if (!list.length) return null;
    return list.slice().sort((a, b) => score(b) - score(a))[0];
  }

  function pick(voiceURI) {
    if (voiceURI) {
      const list = voicesCache.length ? voicesCache : refresh();
      const found = list.find((v) => v.voiceURI === voiceURI);
      if (found) return found;
    }
    return bestDe();
  }

  // Liest Text vor. cb: { voiceURI, rate, onStart, onEnd, onError }.
  function speak(text, cb) {
    cb = cb || {};
    if (!synth || !text) {
      if (cb.onError) cb.onError("not-supported");
      return false;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    const v = pick(cb.voiceURI);
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else {
      u.lang = "de-DE";
    }
    u.rate = cb.rate || 0.95;
    u.pitch = 1;
    if (cb.onStart) u.onstart = () => cb.onStart();
    if (cb.onEnd) {
      u.onend = () => cb.onEnd();
      u.onerror = () => cb.onEnd();
    }
    synth.speak(u);
    return true;
  }

  return { supported, listen, ttsSupported, speaking, stopSpeak, speak, ready, deVoices, allVoices, bestDe, onChange };
})();
