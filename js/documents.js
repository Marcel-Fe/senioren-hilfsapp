/* Dokumenten-Safe (Phase 1): Hochladen, lokal speichern, Kategorien, Liste/Detail, OCR.
   Reines Browser-Feature, nutzt [[DB]] (IndexedDB) und [[OCR]] (Tesseract). Global als `Documents`. */

"use strict";

const Documents = (() => {
  const CATEGORIES = [
    "Gesundheit",
    "Pflege",
    "Versicherungen",
    "Wohnen",
    "Finanzen",
    "Behörden",
    "Sonstiges",
  ];

  // Ansicht innerhalb des Tabs: Liste oder ein einzelnes Dokument.
  const view = { mode: "list", currentId: null };
  let filterCategory = null; // optionaler Kategorie-Filter (aus dem Seitenmenü)

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  }

  function isImage(doc) {
    return (doc.type || "").startsWith("image/");
  }

  function toList() {
    view.mode = "list";
    view.currentId = null;
    filterCategory = null;
  }

  // Vom Seitenmenü: Liste auf eine Kategorie filtern (leer/null = alle).
  function setCategory(cat) {
    filterCategory = cat || null;
    view.mode = "list";
    view.currentId = null;
  }

  // ---------- Einstieg ----------
  async function renderInto(container) {
    if (view.mode === "detail" && view.currentId) {
      return renderDetail(container, view.currentId);
    }
    return renderList(container);
  }

  // ---------- Listenansicht ----------
  async function renderList(container) {
    container.innerHTML = `
      <h2 class="view-title">Dokumente</h2>
      <p class="view-subtitle">Briefe, Rezepte und Bescheide sicher ablegen.</p>
      <button class="btn" id="doc-camera-btn">📷 Foto aufnehmen</button>
      <button class="btn" id="doc-upload-btn" style="margin-top:10px;background:#e8edf6;color:var(--text)">📁 Datei oder PDF wählen</button>
      <input type="file" id="doc-cam-input" accept="image/*" capture="environment" hidden />
      <input type="file" id="doc-file-input" accept="image/*,application/pdf" multiple hidden />
      ${
        filterCategory
          ? `<div class="ui-chips" style="margin-top:14px"><span class="ui-chip">Kategorie: ${esc(filterCategory)}</span><button class="ui-chip" id="doc-show-all" style="cursor:pointer">✕ Alle anzeigen</button></div>`
          : ""
      }
      <div id="doc-list" style="margin-top:18px">Wird geladen …</div>
    `;

    const input = container.querySelector("#doc-file-input");
    const camInput = container.querySelector("#doc-cam-input");
    container.querySelector("#doc-upload-btn").addEventListener("click", () => input.click());
    container.querySelector("#doc-camera-btn").addEventListener("click", () => camInput.click());
    input.addEventListener("change", () => handleFiles(input.files, container));
    camInput.addEventListener("change", () => handleFiles(camInput.files, container));

    const showAll = container.querySelector("#doc-show-all");
    if (showAll)
      showAll.addEventListener("click", () => {
        filterCategory = null;
        renderInto(container);
      });

    const listEl = container.querySelector("#doc-list");
    let docs = await DB.getAll();
    if (filterCategory) docs = docs.filter((d) => d.category === filterCategory);
    docs.sort((a, b) => b.createdAt - a.createdAt);

    if (!docs.length) {
      listEl.innerHTML = `<div class="card muted">${
        filterCategory
          ? `Keine Dokumente in „${esc(filterCategory)}“.`
          : "Noch keine Dokumente. Tippen Sie oben auf „Dokument hochladen“."
      }</div>`;
      return;
    }

    listEl.innerHTML = `<ul class="list">${docs.map(cardHtml).join("")}</ul>`;
    listEl.querySelectorAll("[data-open]").forEach((el) => {
      el.addEventListener("click", () => {
        view.mode = "detail";
        view.currentId = el.dataset.open;
        renderInto(container);
      });
    });
  }

  function cardHtml(doc) {
    const icon = isImage(doc) ? "🖼️" : "📄";
    const badge = doc.text ? "✅ Text erkannt" : "";
    return `
      <li data-open="${esc(doc.id)}" style="cursor:pointer">
        <span aria-hidden="true" style="font-size:1.6rem">${icon}</span>
        <span style="flex:1">
          <strong>${esc(doc.title)}</strong><br />
          <span class="muted" style="font-size:0.95rem">${esc(doc.category)} ${badge}</span>
        </span>
        <span aria-hidden="true">›</span>
      </li>`;
  }

  // ---------- Detailansicht ----------
  async function renderDetail(container, id) {
    const doc = await DB.get(id);
    if (!doc) {
      toList();
      return renderList(container);
    }

    const previewUrl = URL.createObjectURL(doc.blob);
    const preview = isImage(doc)
      ? `<img src="${previewUrl}" alt="${esc(doc.title)}" style="max-width:100%;border-radius:12px;border:1px solid var(--border)" />`
      : `<a class="btn" href="${previewUrl}" target="_blank" rel="noopener">📄 PDF öffnen</a>`;

    const options = CATEGORIES.map(
      (c) => `<option value="${esc(c)}" ${c === doc.category ? "selected" : ""}>${esc(c)}</option>`,
    ).join("");

    container.innerHTML = `
      <button class="btn" id="doc-back" style="background:#e8edf6;color:var(--text);margin-bottom:16px">‹ Zurück</button>
      <h2 class="view-title">${esc(doc.title)}</h2>

      <div class="card">${preview}</div>

      <div class="card">
        <label for="doc-cat"><strong>Kategorie</strong></label><br />
        <select id="doc-cat" style="margin-top:8px;width:100%;padding:12px;font-size:1.1rem;border-radius:12px;border:1px solid var(--border)">
          ${options}
        </select>
      </div>

      ${
        isImage(doc) && !doc.text
          ? `<div class="card" style="background:var(--primary-soft);border-color:#c9d3ff">
               <strong>Was steht in diesem Dokument?</strong>
               <p class="muted" style="margin:.3rem 0 10px">Ein Tipp genügt: Die App liest den Text und erklärt ihn in einfacher Sprache.</p>
               <button class="btn" id="doc-scan-all">🔎 Text erkennen und erklären</button>
               <button class="btn" id="doc-ocr" style="margin-top:10px;background:#e8edf6;color:var(--text)">Nur Text erkennen</button>
               <div id="doc-ocr-status" class="muted" style="margin-top:8px"></div>
             </div>`
          : ""
      }

      <div class="card">
        <strong>Erkannter Text</strong>
        <div id="doc-text" style="margin-top:8px;white-space:pre-wrap">${
          doc.text ? esc(doc.text) : '<span class="muted">Noch kein Text erkannt.</span>'
        }</div>
        ${
          isImage(doc) && doc.text
            ? `<button class="btn" id="doc-ocr" style="margin-top:14px;background:#e8edf6;color:var(--text)">🔁 Text neu erkennen</button>
               <div id="doc-ocr-status" class="muted" style="margin-top:8px"></div>`
            : !isImage(doc)
              ? `<p class="muted" style="margin-top:8px">Texterkennung ist aktuell nur für Fotos möglich.</p>`
              : ""
        }
      </div>

      <div class="card">
        <strong>KI-Erklärung</strong>
        <div id="doc-explain">${doc.analysis ? UI.resultHtml(doc.analysis) : ""}</div>
        ${
          doc.text
            ? `<button class="btn" id="doc-explain-btn" style="margin-top:12px">🧠 In einfacher Sprache erklären</button>`
            : `<p class="muted" style="margin-top:8px">Bitte zuerst „Text erkennen“, dann kann die KI das Dokument erklären.</p>`
        }
        <div id="doc-explain-status" class="muted" style="margin-top:8px"></div>
      </div>

      <button class="btn" id="doc-delete" style="background:var(--danger);margin-top:8px">🗑️ Löschen</button>
    `;

    container.querySelector("#doc-back").addEventListener("click", () => {
      toList();
      renderInto(container);
    });

    container.querySelector("#doc-cat").addEventListener("change", async (e) => {
      doc.category = e.target.value;
      await DB.put(doc);
    });

    container.querySelector("#doc-delete").addEventListener("click", async () => {
      if (confirm("Dieses Dokument wirklich löschen?")) {
        await DB.remove(id);
        toList();
        renderInto(container);
      }
    });

    // Texterkennung ausführen (kein Re-Render); aktualisiert doc.text + Anzeige.
    async function runOcr() {
      const status = container.querySelector("#doc-ocr-status");
      if (status) status.textContent = "Texterkennung läuft … (kann beim ersten Mal etwas dauern)";
      const text = await OCR.recognize(doc.blob, (p) => {
        if (status) status.textContent = `Texterkennung läuft … ${Math.round(p * 100)} %`;
      });
      doc.text = text;
      await DB.put(doc);
      const textEl = container.querySelector("#doc-text");
      if (textEl) textEl.textContent = text || "(Kein Text gefunden.)";
      return text;
    }

    // KI-Erklärung in die Erklär-Karte rendern.
    async function runExplain() {
      const out = container.querySelector("#doc-explain");
      const status = container.querySelector("#doc-explain-status");
      if (status) status.textContent = "Die KI erklärt das Dokument …";
      const data = await KI.analyzeDocument(doc.text);
      out.innerHTML = UI.resultHtml(data, [
        { label: "💾 Erklärung in Akte speichern", attr: 'id="doc-save-analysis"' },
      ]);
      if (status) status.textContent = "";
      const saveBtn = container.querySelector("#doc-save-analysis");
      if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
          doc.analysis = data;
          await DB.put(doc);
          saveBtn.textContent = "✅ Gespeichert";
          saveBtn.disabled = true;
        });
      }
    }

    // Kombiniert: erkennen UND erklären in einem Schritt.
    const scanAllBtn = container.querySelector("#doc-scan-all");
    if (scanAllBtn) {
      scanAllBtn.addEventListener("click", async () => {
        const status = container.querySelector("#doc-ocr-status");
        scanAllBtn.disabled = true;
        try {
          const text = await runOcr();
          if (!text) {
            if (status) status.textContent = "Kein Text gefunden. Bitte näher und gerade fotografieren.";
            scanAllBtn.disabled = false;
            return;
          }
          if (status) status.textContent = "✅ Text erkannt. Die KI erklärt es nun …";
          await runExplain();
          if (status) status.textContent = "✅ Fertig.";
        } catch (err) {
          if (status) status.textContent = "⚠️ " + (err && err.message ? err.message : "Es hat nicht geklappt. Bitte erneut versuchen.");
          scanAllBtn.disabled = false;
        }
      });
    }

    const ocrBtn = container.querySelector("#doc-ocr");
    if (ocrBtn) {
      ocrBtn.addEventListener("click", async () => {
        const status = container.querySelector("#doc-ocr-status");
        ocrBtn.disabled = true;
        try {
          await runOcr();
          renderInto(container); // neu aufbauen, damit der Erklären-Knopf erscheint
        } catch (err) {
          if (status) status.textContent = "⚠️ " + (err && err.message ? err.message : "Fehler bei der Texterkennung.");
          ocrBtn.disabled = false;
        }
      });
    }

    const explainBtn = container.querySelector("#doc-explain-btn");
    if (explainBtn) {
      explainBtn.addEventListener("click", async () => {
        const status = container.querySelector("#doc-explain-status");
        explainBtn.disabled = true;
        try {
          await runExplain();
        } catch (err) {
          if (status) status.textContent = "⚠️ " + (err && err.message ? err.message : "Fehler bei der KI-Erklärung.");
        } finally {
          explainBtn.disabled = false;
        }
      });
    }
  }

  // ---------- Upload ----------
  // Spec: nichts automatisch speichern — vor jeder Ablage ausdrücklich fragen.
  async function handleFiles(fileList, container) {
    const files = Array.from(fileList || []);
    const savedIds = [];
    for (const file of files) {
      const ok = confirm(`„${file.name || "Dokument"}“ in Ihrer Akte speichern?`);
      if (!ok) continue;
      const id = crypto.randomUUID();
      await DB.put({
        id,
        title: file.name || (file.type && file.type.startsWith("image/") ? "Foto" : "Dokument"),
        category: "Sonstiges",
        type: file.type || "application/octet-stream",
        blob: file,
        text: "",
        createdAt: Date.now(),
      });
      savedIds.push({ id, isImage: (file.type || "").startsWith("image/") });
    }
    if (!savedIds.length) return;
    // Bei genau einem Foto direkt in die Detailansicht (Senioren: weniger Schritte).
    if (savedIds.length === 1 && savedIds[0].isImage) {
      view.mode = "detail";
      view.currentId = savedIds[0].id;
    }
    renderInto(container);
  }

  return { renderInto, toList, setCategory };
})();
