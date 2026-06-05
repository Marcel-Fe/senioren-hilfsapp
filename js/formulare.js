/* Formular-Modus: hilft beim Ausfüllen amtlicher Formulare Schritt für Schritt
   und erstellt am Ende einen ENTWURF. Reine KI-Führung über den Worker (mode "formular").
   Kein rechtlich verbindlicher Inhalt — jeder Entwurf ist klar als Entwurf markiert.
   Global als `Formulare`. */

"use strict";

const Formulare = (() => {
  // Vollständiger Katalog seniorenrelevanter Formulare, nach Themen gruppiert.
  // Jedes ist sofort per KI-Assistent ausfüllbar (Entwurf) + Link zum offiziellen Formular.
  const FORM_GROUPS = [
    {
      cat: "Pflege",
      icon: "🤝",
      forms: [
        "Pflegegrad beantragen (Erstantrag)",
        "Höherstufung des Pflegegrads",
        "Verhinderungspflege",
        "Kurzzeitpflege",
        "Entlastungsbetrag (125 €)",
        "Pflegehilfsmittel zum Verbrauch (40 €)",
        "Zuschuss zum Wohnumbau (bis 4.000 €)",
        "Widerspruch gegen Pflegegrad-Bescheid",
      ],
    },
    {
      cat: "Krankenkasse",
      icon: "🩺",
      forms: [
        "Krankenfahrten / Krankentransport",
        "Haushaltshilfe",
        "Befreiung von Zuzahlungen",
        "Hilfsmittel (z. B. Rollator, Hörgerät)",
        "Widerspruch gegen Ablehnung der Krankenkasse",
      ],
    },
    {
      cat: "Wohnen & Finanzen",
      icon: "🏠",
      forms: [
        "Wohngeld",
        "Grundsicherung im Alter (Sozialamt)",
        "Befreiung vom Rundfunkbeitrag",
        "Schwerbehindertenausweis / GdB (Versorgungsamt)",
      ],
    },
    {
      cat: "Rente & Vorsorge",
      icon: "📜",
      forms: [
        "Hinterbliebenenrente (Witwen-/Witwerrente)",
        "Vorsorgevollmacht",
        "Patientenverfügung",
        "Betreuungsverfügung",
      ],
    },
  ];

  // Hinterlegte Formulare: pro Formular Empfänger, Einleitung und spezifische Felder.
  // typ "antrag" (Brief an eine Stelle) oder "dokument" (eigene Erklärung). t: a=Textfeld groß,
  // d=Datum, s=Auswahl(o), sonst einzeiliges Textfeld.
  const FORM_DEFS = {
    "Pflegegrad beantragen (Erstantrag)": {
      empfaenger: "An die Pflegekasse", intro: "hiermit beantrage ich die Feststellung eines Pflegegrades (Erstantrag).",
      felder: [
        { k: "fuer", l: "Antrag für", ph: "mich selbst / Name der pflegebedürftigen Person" },
        { k: "seit", l: "Einschränkungen bestehen seit", ph: "z. B. seit Januar 2026" },
        { k: "beschwerden", l: "Hauptbeschwerden / Hilfebedarf", t: "a", ph: "z. B. Hilfe beim Waschen, Anziehen, Treppensteigen" },
        { k: "pflegt", l: "Wer pflegt aktuell?", ph: "z. B. Ehefrau, ambulanter Dienst" },
      ],
    },
    "Höherstufung des Pflegegrads": {
      empfaenger: "An die Pflegekasse", intro: "hiermit beantrage ich die Höherstufung meines Pflegegrades.",
      felder: [
        { k: "aktuell", l: "Aktueller Pflegegrad", t: "s", o: ["1", "2", "3", "4"] },
        { k: "seit", l: "Verschlechterung seit", ph: "z. B. seit 2 Monaten" },
        { k: "veraenderung", l: "Was hat sich verschlechtert?", t: "a", ph: "z. B. kann nicht mehr allein aufstehen" },
      ],
    },
    "Verhinderungspflege": {
      empfaenger: "An die Pflegekasse", intro: "hiermit beantrage ich Verhinderungspflege.",
      felder: [
        { k: "pflegegrad", l: "Pflegegrad", t: "s", o: ["2", "3", "4", "5"] },
        { k: "von", l: "Zeitraum von", t: "d" },
        { k: "bis", l: "Zeitraum bis", t: "d" },
        { k: "vertretung", l: "Wer übernimmt die Vertretung?", ph: "Name der Ersatzpflegeperson" },
        { k: "kosten", l: "Voraussichtliche Kosten", ph: "z. B. 600 €" },
      ],
    },
    "Kurzzeitpflege": {
      empfaenger: "An die Pflegekasse", intro: "hiermit beantrage ich Kurzzeitpflege.",
      felder: [
        { k: "pflegegrad", l: "Pflegegrad", t: "s", o: ["2", "3", "4", "5"] },
        { k: "von", l: "Zeitraum von", t: "d" },
        { k: "bis", l: "Zeitraum bis", t: "d" },
        { k: "einrichtung", l: "Einrichtung", ph: "Name der Pflegeeinrichtung" },
        { k: "grund", l: "Grund", t: "a", ph: "z. B. nach Krankenhausaufenthalt" },
      ],
    },
    "Entlastungsbetrag (125 €)": {
      empfaenger: "An die Pflegekasse", intro: "hiermit beantrage ich die Erstattung des Entlastungsbetrags (125 € monatlich).",
      felder: [
        { k: "pflegegrad", l: "Pflegegrad", t: "s", o: ["1", "2", "3", "4", "5"] },
        { k: "leistung", l: "Wofür verwendet?", ph: "z. B. Betreuungsdienst, Haushaltshilfe" },
        { k: "anbieter", l: "Anbieter / Dienst", ph: "Name des Anbieters" },
        { k: "monat", l: "Für welchen Monat?", ph: "z. B. Juni 2026" },
      ],
    },
    "Pflegehilfsmittel zum Verbrauch (40 €)": {
      empfaenger: "An die Pflegekasse", intro: "hiermit beantrage ich die monatliche Pauschale für Pflegehilfsmittel zum Verbrauch (bis 40 €).",
      felder: [
        { k: "pflegegrad", l: "Pflegegrad", t: "s", o: ["1", "2", "3", "4", "5"] },
        { k: "hilfsmittel", l: "Welche Hilfsmittel?", t: "a", ph: "z. B. Einmalhandschuhe, Desinfektionsmittel, Bettschutzeinlagen" },
        { k: "lieferadresse", l: "Lieferadresse (falls abweichend)", ph: "" },
      ],
    },
    "Zuschuss zum Wohnumbau (bis 4.000 €)": {
      empfaenger: "An die Pflegekasse", intro: "hiermit beantrage ich einen Zuschuss für wohnumfeldverbessernde Maßnahmen (bis 4.000 €).",
      felder: [
        { k: "pflegegrad", l: "Pflegegrad", t: "s", o: ["1", "2", "3", "4", "5"] },
        { k: "massnahme", l: "Geplante Maßnahme", t: "a", ph: "z. B. barrierefreies Bad, Treppenlift, Türverbreiterung" },
        { k: "kosten", l: "Voraussichtliche Kosten", ph: "z. B. 3.500 €" },
        { k: "firma", l: "Ausführende Firma", ph: "Name (falls bekannt)" },
      ],
    },
    "Widerspruch gegen Pflegegrad-Bescheid": {
      empfaenger: "An die Pflegekasse", intro: "hiermit lege ich Widerspruch gegen Ihren Bescheid ein.",
      felder: [
        { k: "bescheiddatum", l: "Datum des Bescheids", t: "d" },
        { k: "aktenzeichen", l: "Aktenzeichen", ph: "siehe Bescheid" },
        { k: "zugesprochen", l: "Zugesprochener Pflegegrad", t: "s", o: ["kein", "1", "2", "3", "4"] },
        { k: "begruendung", l: "Begründung des Widerspruchs", t: "a", ph: "Warum ist der Pflegegrad zu niedrig?" },
      ],
    },
    "Krankenfahrten / Krankentransport": {
      empfaenger: "An die Krankenkasse", intro: "hiermit beantrage ich die Übernahme von Fahrkosten für Krankenfahrten.",
      felder: [
        { k: "grund", l: "Grund / Behandlung", ph: "z. B. Dialyse, Bestrahlung" },
        { k: "zeitraum", l: "Zeitraum", ph: "z. B. laufend, 3x pro Woche" },
        { k: "arzt", l: "Arzt / Klinik", ph: "Name der Praxis/Klinik" },
        { k: "fahrtart", l: "Art der Fahrt", t: "s", o: ["Taxi", "Krankentransportwagen", "eigenes Auto", "öffentliche Verkehrsmittel"] },
      ],
    },
    "Haushaltshilfe": {
      empfaenger: "An die Krankenkasse", intro: "hiermit beantrage ich die Übernahme einer Haushaltshilfe.",
      felder: [
        { k: "grund", l: "Grund", ph: "z. B. Krankenhausaufenthalt, schwere Erkrankung" },
        { k: "von", l: "Benötigt von", t: "d" },
        { k: "bis", l: "Benötigt bis", t: "d" },
        { k: "haushalt", l: "Personen im Haushalt", ph: "z. B. ich allein / Ehepaar" },
      ],
    },
    "Befreiung von Zuzahlungen": {
      empfaenger: "An die Krankenkasse", intro: "hiermit beantrage ich die Befreiung von Zuzahlungen für das laufende Jahr.",
      felder: [
        { k: "einkommen", l: "Jährliches Bruttoeinkommen (Haushalt)", ph: "z. B. 18.000 €" },
        { k: "chronisch", l: "Chronisch krank?", t: "s", o: ["ja", "nein"] },
        { k: "gezahlt", l: "Bereits gezahlte Zuzahlungen", ph: "z. B. 120 €" },
      ],
    },
    "Hilfsmittel (z. B. Rollator, Hörgerät)": {
      empfaenger: "An die Krankenkasse", intro: "hiermit beantrage ich die Versorgung mit einem Hilfsmittel.",
      felder: [
        { k: "hilfsmittel", l: "Gewünschtes Hilfsmittel", ph: "z. B. Rollator, Hörgerät" },
        { k: "verordnung", l: "Ärztliche Verordnung vorhanden?", t: "s", o: ["ja", "nein"] },
        { k: "begruendung", l: "Begründung", t: "a", ph: "Warum wird das Hilfsmittel benötigt?" },
      ],
    },
    "Widerspruch gegen Ablehnung der Krankenkasse": {
      empfaenger: "An die Krankenkasse", intro: "hiermit lege ich Widerspruch gegen Ihren ablehnenden Bescheid ein.",
      felder: [
        { k: "bescheiddatum", l: "Datum des Bescheids", t: "d" },
        { k: "aktenzeichen", l: "Aktenzeichen", ph: "siehe Bescheid" },
        { k: "leistung", l: "Abgelehnte Leistung", ph: "Was wurde abgelehnt?" },
        { k: "begruendung", l: "Begründung des Widerspruchs", t: "a", ph: "" },
      ],
    },
    "Wohngeld": {
      empfaenger: "An die Wohngeldstelle", intro: "hiermit beantrage ich Wohngeld (Mietzuschuss).",
      felder: [
        { k: "miete", l: "Monatliche Miete (warm)", ph: "z. B. 650 €" },
        { k: "personen", l: "Personen im Haushalt", ph: "z. B. 1" },
        { k: "einkommen", l: "Monatliches Gesamteinkommen", ph: "z. B. 1.100 €" },
      ],
    },
    "Grundsicherung im Alter (Sozialamt)": {
      empfaenger: "An das Sozialamt", intro: "hiermit beantrage ich Grundsicherung im Alter.",
      felder: [
        { k: "rente", l: "Monatliche Rente / Einkommen", ph: "z. B. 900 €" },
        { k: "vermoegen", l: "Vorhandenes Vermögen", ph: "z. B. 2.000 € Erspartes" },
        { k: "wohnkosten", l: "Monatliche Wohnkosten", ph: "z. B. 600 €" },
      ],
    },
    "Befreiung vom Rundfunkbeitrag": {
      empfaenger: "An den ARD ZDF Deutschlandradio Beitragsservice", intro: "hiermit beantrage ich die Befreiung vom Rundfunkbeitrag.",
      felder: [
        { k: "beitragsnr", l: "Beitragsnummer", ph: "falls vorhanden" },
        { k: "grund", l: "Grund der Befreiung", t: "s", o: ["Grundsicherung im Alter", "Sozialhilfe", "Taubblindheit", "anderer Grund"] },
        { k: "nachweis", l: "Beigefügter Nachweis", ph: "z. B. Bescheid Grundsicherung" },
      ],
    },
    "Schwerbehindertenausweis / GdB (Versorgungsamt)": {
      empfaenger: "An das Versorgungsamt", intro: "hiermit beantrage ich die Feststellung des Grades der Behinderung (GdB) und einen Schwerbehindertenausweis.",
      felder: [
        { k: "erkrankungen", l: "Erkrankungen / Behinderungen", t: "a", ph: "Bitte alle gesundheitlichen Einschränkungen nennen" },
        { k: "aerzte", l: "Behandelnde Ärzte", t: "a", ph: "Namen und Anschriften" },
        { k: "merkzeichen", l: "Gewünschte Merkzeichen (falls bekannt)", ph: "z. B. G, aG, H, B" },
      ],
    },
    "Hinterbliebenenrente (Witwen-/Witwerrente)": {
      empfaenger: "An die Deutsche Rentenversicherung", intro: "hiermit beantrage ich eine Hinterbliebenenrente (Witwen-/Witwerrente).",
      felder: [
        { k: "verstorben", l: "Name der verstorbenen Person", ph: "" },
        { k: "sterbedatum", l: "Sterbedatum", t: "d" },
        { k: "versnr", l: "Versicherungsnummer der verstorbenen Person", ph: "falls bekannt" },
        { k: "heirat", l: "Datum der Eheschließung", t: "d" },
      ],
    },
    "Vorsorgevollmacht": {
      typ: "dokument", intro: "Hiermit erteile ich, im Vollbesitz meiner geistigen Kräfte, folgende Vorsorgevollmacht:",
      felder: [
        { k: "bevollm", l: "Bevollmächtigte Person (Name)", ph: "Name der Vertrauensperson" },
        { k: "bevollmadr", l: "Anschrift der bevollmächtigten Person", t: "a", ph: "" },
        { k: "umfang", l: "Umfang der Vollmacht", t: "s", o: ["Gesundheitssorge", "Vermögensangelegenheiten", "beide Bereiche"] },
        { k: "wuensche", l: "Besondere Wünsche / Einschränkungen", t: "a", ph: "optional" },
      ],
    },
    "Patientenverfügung": {
      typ: "dokument", intro: "Für den Fall, dass ich meinen Willen nicht mehr äußern kann, verfüge ich Folgendes:",
      felder: [
        { k: "lebenserhalt", l: "Lebenserhaltende Maßnahmen", t: "s", o: ["möchte ich in aussichtsloser Lage nicht", "möchte ich in jedem Fall", "im Zweifel für Lebenserhalt"] },
        { k: "schmerz", l: "Schmerzbehandlung", t: "a", ph: "z. B. bestmögliche Linderung, auch wenn das Leben verkürzt wird" },
        { k: "vertrauen", l: "Vertrauensperson", ph: "Name" },
        { k: "weiteres", l: "Weitere Wünsche", t: "a", ph: "optional" },
      ],
    },
    "Betreuungsverfügung": {
      typ: "dokument", intro: "Für den Fall, dass für mich eine rechtliche Betreuung notwendig wird, verfüge ich Folgendes:",
      felder: [
        { k: "betreuer", l: "Gewünschte Betreuungsperson", ph: "Name" },
        { k: "ausschluss", l: "Als Betreuer ausgeschlossen", ph: "optional: Name" },
        { k: "wuensche", l: "Wünsche zur Lebensführung", t: "a", ph: "z. B. zu Hause bleiben, Heimwahl" },
      ],
    },
  };

  const view = { mode: "select", formart: null, fillName: null, messages: [], entwurf: null, hinweis: "", busy: false };

  function reset() {
    view.mode = "select";
    view.formart = null;
    view.fillName = null;
    view.messages = [];
    view.entwurf = null;
    view.hinweis = "";
    view.busy = false;
  }

  async function renderInto(container) {
    if (view.mode === "chat") return renderChat(container);
    if (view.mode === "fill") return renderFill(container);
    return renderSelect(container);
  }

  // Link zum offiziellen Formular — nutzt Profil (Kasse/Bundesland) + Kategorie für eine gezielte Suche.
  function officialUrl(name, profil, cat) {
    const base = name.replace(/\s*\(.*?\)\s*/g, " ").trim();
    const bl = profil.bundesland || "";
    let q;
    if (cat === "Pflege") {
      q = `${base} Antrag Formular ${profil.kasse || "Pflegekasse"}`;
    } else if (cat === "Krankenkasse") {
      q = `${base} Antrag Formular ${profil.kasse || "Krankenkasse"}`;
    } else if (/Wohngeld/i.test(name)) {
      q = `Wohngeldantrag online ausfüllen ${bl}`.trim();
    } else if (/Grundsicherung/i.test(name)) {
      q = `Grundsicherung im Alter Antrag Sozialamt ${bl}`.trim();
    } else if (/Rundfunkbeitrag/i.test(name)) {
      q = "Rundfunkbeitrag Befreiung Antrag online Formular";
    } else if (/Schwerbehindert|GdB/i.test(name)) {
      q = `Schwerbehindertenausweis Antrag Versorgungsamt ${bl}`.trim();
    } else if (/Hinterbliebenen|Witwen/i.test(name)) {
      q = "Deutsche Rentenversicherung Hinterbliebenenrente Antrag online";
    } else if (/Vorsorgevollmacht|Patientenverf|Betreuungsverf/i.test(name)) {
      q = `${base} Formular Bundesjustizministerium`;
    } else {
      q = `${base} offizielles Formular online ausfüllen`;
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

    const groupsHtml = FORM_GROUPS.map(
      (g) => `
      <h3 class="section-title">${g.icon} ${UI.esc(g.cat)}</h3>
      ${g.forms
        .map(
          (f) => `
        <div class="card">
          <strong style="font-size:1.15rem">📝 ${UI.esc(f)}</strong>
          <button class="btn" data-fill="${UI.esc(f)}" style="margin-top:12px">✏️ Jetzt ausfüllen</button>
          <div class="ui-chips" style="margin-top:10px">
            <button class="ui-chip" data-form="${UI.esc(f)}" style="cursor:pointer">🧠 Mit KI-Hilfe</button>
            <a class="ui-chip" href="${officialUrl(f, profil, g.cat)}" target="_blank" rel="noopener" style="cursor:pointer">🔗 Offizielles Formular</a>
          </div>
        </div>`,
        )
        .join("")}`,
    ).join("");

    container.innerHTML = `
      <h2 class="view-title">Formulare</h2>
      <p class="view-subtitle">Alle Formulare sind sofort ausfüllbar. Wählen Sie eines aus.</p>

      ${profilBar}

      <div class="card" style="background:var(--primary-soft);border-color:#c9dbfb">
        <strong>„✏️ Jetzt ausfüllen"</strong> öffnet das Formular direkt in der App — Sie füllen es aus und erhalten ein fertiges, druckbares Schreiben.<br />
        Zusätzlich: <strong>„🧠 Mit KI-Hilfe"</strong> führt Sie per Gespräch, <strong>„🔗 Offizielles Formular"</strong> öffnet die amtliche Seite.
      </div>

      ${groupsHtml}

      <p class="ui-hinweis" style="margin-top:16px">ℹ️ Das ausgefüllte Schreiben ist ein Entwurf zur eigenen Nutzung und keine amtliche Prüfung. Bei vielen Anträgen genügt ein formloses Schreiben.</p>
    `;

    const prBtn = container.querySelector("#form-profil");
    if (prBtn) prBtn.addEventListener("click", () => setTab("profil"));
    container.querySelectorAll("[data-fill]").forEach((el) =>
      el.addEventListener("click", () => startFill(el.dataset.fill, container)),
    );
    container.querySelectorAll("[data-form]").forEach((el) =>
      el.addEventListener("click", () => startForm(el.dataset.form, container)),
    );
  }

  // ---------- Ausfüllbares Formular (direkt in der App) ----------
  // Gemeinsame Antragsteller-Felder; bei "dokument" ohne Kasse/Versichertennr.
  function sharedFields(typ) {
    const base = [
      { k: "name", l: "Ihr Name", ph: "Vor- und Nachname" },
      { k: "gebdatum", l: "Geburtsdatum", t: "d" },
      { k: "adresse", l: "Anschrift", t: "a", ph: "Straße Hausnr.\nPLZ Ort" },
      { k: "telefon", l: "Telefon", ph: "" },
    ];
    if (typ !== "dokument") {
      base.push({ k: "kasse", l: "Kranken-/Pflegekasse", ph: "z. B. AOK Bayern" });
      base.push({ k: "versichertennr", l: "Versichertennummer", ph: "falls vorhanden" });
    }
    return base;
  }

  async function startFill(name, container) {
    view.mode = "fill";
    view.fillName = name;
    renderInto(container);
  }

  function fieldInput(f, val) {
    const id = "ff-" + f.k;
    const common = `style="width:100%;margin-top:6px;padding:12px;font-size:1.1rem;border:1px solid var(--border);border-radius:12px;font-family:inherit"`;
    let control;
    if (f.t === "a") {
      control = `<textarea id="${id}" data-fk="${f.k}" rows="3" placeholder="${UI.esc(f.ph || "")}" ${common}>${UI.esc(val || "")}</textarea>`;
    } else if (f.t === "s") {
      control = `<select id="${id}" data-fk="${f.k}" ${common}>
        <option value="">— bitte wählen —</option>
        ${(f.o || []).map((o) => `<option ${val === o ? "selected" : ""}>${UI.esc(o)}</option>`).join("")}
      </select>`;
    } else {
      const type = f.t === "d" ? "date" : "text";
      control = `<input id="${id}" data-fk="${f.k}" type="${type}" value="${UI.esc(val || "")}" placeholder="${UI.esc(f.ph || "")}" ${common} />`;
    }
    return `<label for="${id}" style="display:block;margin-top:14px"><strong>${UI.esc(f.l)}</strong></label>${control}`;
  }

  async function renderFill(container) {
    const name = view.fillName;
    const def = FORM_DEFS[name] || { empfaenger: "An die zuständige Stelle", felder: [] };
    const typ = def.typ || "antrag";
    const saved = (await DB.get("form:" + name, "settings")) || {};
    const vals = saved.vals || {};
    // Profil-Vorbefüllung, wenn noch nichts gespeichert ist.
    if (typeof Profil !== "undefined") {
      const p = await Profil.get();
      if (!vals.name && p.name) vals.name = p.name;
      if (!vals.kasse && p.kasse) vals.kasse = p.kasse;
    }

    const shared = sharedFields(typ);
    const allFields = shared.concat(def.felder);

    container.innerHTML = `
      <button class="btn" id="fill-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück zur Auswahl</button>
      <h2 class="view-title">${UI.esc(name)}</h2>
      <p class="view-subtitle">Füllen Sie die Felder aus. Pflichtangaben sind Name und Anschrift.</p>

      <div class="card"><strong>👤 Ihre Angaben</strong>${shared.map((f) => fieldInput(f, vals[f.k])).join("")}</div>
      <div class="card"><strong>📋 Zum Formular</strong>${def.felder.map((f) => fieldInput(f, vals[f.k])).join("")}</div>

      <button class="btn" id="fill-preview" style="margin-top:8px">👁️ Vorschau erstellen</button>
      <div id="fill-out" style="margin-top:16px"></div>
      <p class="ui-hinweis" style="margin-top:16px">ℹ️ Dies erzeugt ein selbst erstelltes Schreiben zur eigenen Nutzung — kein amtliches Formular. Ihre Eingaben bleiben auf dem Gerät.</p>
    `;

    container.querySelector("#fill-back").addEventListener("click", () => {
      view.mode = "select";
      view.fillName = null;
      renderInto(container);
    });

    container.querySelector("#fill-preview").addEventListener("click", async () => {
      const current = {};
      container.querySelectorAll("[data-fk]").forEach((i) => (current[i.dataset.fk] = i.value.trim()));
      await DB.put({ id: "form:" + name, vals: current }, "settings"); // Eingaben merken
      showPreview(container, name, def, typ, allFields, current);
    });
  }

  // Baut aus den Eingaben ein druckbares Schreiben.
  function buildDocument(name, def, typ, allFields, vals) {
    const heute = new Date().toLocaleDateString("de-DE");
    const L = [];
    L.push(vals.name || "[Ihr Name]");
    if (vals.adresse) vals.adresse.split("\n").forEach((z) => z.trim() && L.push(z.trim()));
    if (vals.telefon) L.push("Tel.: " + vals.telefon);
    L.push("");
    if (typ !== "dokument") {
      L.push(def.empfaenger || "An die zuständige Stelle");
      if (vals.kasse) L.push(vals.kasse);
      L.push("");
    }
    L.push(heute);
    L.push("");
    L.push("Betreff: " + name);
    L.push("");
    if (typ === "dokument") {
      L.push(def.intro || `Hiermit erkläre ich, ${vals.name || ""}, Folgendes:`);
    } else {
      L.push("Sehr geehrte Damen und Herren,");
      L.push("");
      L.push(def.intro || `hiermit beantrage ich „${name}".`);
    }
    L.push("");
    // Angaben (Kopf-Felder name/adresse/telefon/kasse nicht doppeln).
    const skip = new Set(["name", "adresse", "telefon", "kasse"]);
    const angaben = allFields.filter((f) => !skip.has(f.k) && vals[f.k]);
    if (angaben.length) {
      L.push("Meine Angaben:");
      angaben.forEach((f) => L.push(`- ${f.l}: ${vals[f.k]}`));
      L.push("");
    }
    if (typ === "dokument") {
      L.push("Diese Erklärung gebe ich bei klarem Verstand und aus freiem Willen ab.");
      L.push("");
      L.push("_______________________________");
      L.push(`${vals.name || ""}${vals.name ? ", " : ""}${heute}`);
    } else {
      L.push("Bitte bearbeiten Sie meinen Antrag. Für Rückfragen stehe ich gerne zur Verfügung.");
      L.push("");
      L.push("Mit freundlichen Grüßen");
      L.push("");
      L.push(vals.name || "");
    }
    L.push("");
    L.push("— Erstellt mit der App „Alltagsbegleiter“. Selbst erstellter Entwurf, kein amtliches Formular. —");
    return L.join("\n");
  }

  function showPreview(container, name, def, typ, allFields, vals) {
    const text = buildDocument(name, def, typ, allFields, vals);
    const out = container.querySelector("#fill-out");
    const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    out.innerHTML = `
      <div class="card" style="border:2px solid var(--primary)">
        <strong>📄 Ihr Schreiben</strong>
        <pre style="white-space:pre-wrap;font-family:inherit;font-size:1.02rem;margin:.6rem 0 0">${UI.esc(text)}</pre>
      </div>
      <div class="ui-actions">
        <button class="btn" id="fill-print">🖨️ Drucken / als PDF speichern</button>
        <button class="btn" id="fill-copy" style="background:#e8edf6;color:var(--text)">📋 Kopieren</button>
        ${canShare ? `<button class="btn" id="fill-share" style="background:#e8edf6;color:var(--text)">📤 Teilen</button>` : ""}
      </div>
      <div id="fill-status" class="muted" style="margin-top:8px"></div>
    `;
    out.scrollIntoView({ behavior: "smooth", block: "start" });

    out.querySelector("#fill-print").addEventListener("click", () => printText(name, text));
    out.querySelector("#fill-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        out.querySelector("#fill-status").textContent = "✅ Kopiert.";
      } catch {
        out.querySelector("#fill-status").textContent = "Kopieren nicht möglich — bitte Text markieren.";
      }
    });
    const shareBtn = out.querySelector("#fill-share");
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        try {
          await navigator.share({ title: name, text });
        } catch {
          /* abgebrochen */
        }
      });
    }
  }

  function printText(title, text) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${UI.esc(title)}</title>` +
        `<style>body{font-family:system-ui,sans-serif;font-size:13pt;line-height:1.6;padding:32px;white-space:pre-wrap}</style>` +
        `</head><body>${UI.esc(text)}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
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

  return { renderInto, reset, startForm, startFill };
})();
