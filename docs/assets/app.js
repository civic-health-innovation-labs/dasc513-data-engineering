/* DASC513 practical pages: shared behaviour.
 *
 * - Every [data-save] input is saved to this browser (localStorage) as you type.
 * - .codebox elements get R / Python tabs; the choice is remembered.
 * - .cell.run[data-run] get a Run button that calls RUNNERS[key](outputElement).
 * - table.rows[data-rows] are editable tables where students add rows.
 * - The finish box offers downloads (Word, Markdown, backup) and restore.
 * Nothing leaves the browser: there is no server.
 */
(function () {
  "use strict";

  const WEEK = document.body.dataset.week || "home";
  const STORE_KEY = "dasc513.week" + WEEK;
  const META_KEY = "dasc513.meta";
  const LANG_KEY = "dasc513.lang";
  window.RUNNERS = window.RUNNERS || {};

  // ---------- storage (fails soft: private windows and locked-down PCs) ----------
  let storageOK = true;
  function readJSON(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { storageOK = false; return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { storageOK = false; return false; }
  }
  try { localStorage.setItem("dasc513.test", "1"); localStorage.removeItem("dasc513.test"); }
  catch (e) { storageOK = false; }

  let state = readJSON(STORE_KEY, {});
  const meta = readJSON(META_KEY, {});

  // ---------- small helpers ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function stamp() {
    return new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- header ----------
  const WEEKS = [
    ["index.html", "Home", "home"], ["week5.html", "Week 5", "5"], ["week6.html", "Week 6", "6"],
    ["week7.html", "Week 7", "7"], ["week8.html", "Week 8", "8"],
  ];
  function buildHeader() {
    const header = document.createElement("header");
    header.className = "topbar";
    header.innerHTML = `
      <a class="skip" href="#main">Skip to content</a>
      <div class="topbar-inner">
        <a class="brand" href="index.html">DASC513 <span>NORTHSTAR</span></a>
        <nav class="weeknav" aria-label="Weeks">
          ${WEEKS.map(([href, label, wk]) => `<a href="${href}"${wk === WEEK ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
        </nav>
        <div class="topbar-tools">
          ${WEEK !== "home" ? `<span class="savestate" aria-live="polite"></span>
          <a class="btn small primary" href="#finish">Download<span class="label-long">&nbsp;my work</span></a>` : ""}
        </div>
      </div>
      ${WEEK !== "home" ? '<div class="progress" aria-hidden="true"><div></div></div>' : ""}`;
    document.body.prepend(header);
  }

  function setSaveState(text, cls) {
    const el = $(".savestate");
    if (!el) return;
    el.textContent = text; el.className = "savestate " + (cls || "");
  }

  // ---------- table of contents ----------
  function buildTOC() {
    const toc = $(".toc");
    if (!toc) return;
    const parts = $$("section.part");
    toc.innerHTML = `<nav aria-label="On this page"><ol>${parts.map(p => {
      const h = $("h2", p);
      return `<li><a href="#${p.id}" data-part="${p.id}">${esc(h.dataset.short || h.textContent)}</a></li>`;
    }).join("")}<li><a href="#finish">Download your work</a></li></ol></nav>`;
    const links = $$("a[data-part]", toc);
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) links.forEach(a => a.classList.toggle("active", a.dataset.part === e.target.id));
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    parts.forEach(p => obs.observe(p));
  }

  // ---------- code boxes ----------
  const LANG_NAMES = { r: "R", py: "Python", sh: "Terminal" };
  let lang = (() => { try { return localStorage.getItem(LANG_KEY) || "r"; } catch (e) { return "r"; } })();

  function highlight(code) {
    // Only comments are coloured: enough to separate explanation from instruction.
    return code.split("\n").map(line => {
      const i = line.indexOf("#");
      if (i < 0) return esc(line);
      const before = line.slice(0, i);
      // ignore # inside quotes
      if ((before.match(/"/g) || []).length % 2 || (before.match(/'/g) || []).length % 2) return esc(line);
      return esc(before) + '<span class="cm">' + esc(line.slice(i)) + "</span>";
    }).join("\n");
  }

  function buildCodeboxes() {
    $$(".codebox").forEach(box => {
      const sources = $$('script[type="text/plain"]', box);
      const tabs = document.createElement("div");
      tabs.className = "tabs"; tabs.setAttribute("role", "tablist");
      sources.forEach(src => {
        const l = src.dataset.lang;
        const pre = document.createElement("pre");
        pre.dataset.lang = l;
        pre.innerHTML = "<code>" + highlight(src.textContent.replace(/^\n+|\s+$/g, "")) + "</code>";
        box.insertBefore(pre, src);
        const b = document.createElement("button");
        b.type = "button"; b.setAttribute("role", "tab"); b.dataset.lang = l; b.textContent = LANG_NAMES[l] || l;
        b.addEventListener("click", () => setLang(l));
        tabs.appendChild(b);
        src.remove();
      });
      const copy = document.createElement("button");
      copy.type = "button"; copy.className = "copy"; copy.textContent = "Copy";
      copy.addEventListener("click", () => {
        const pre = $$("pre", box).find(p => !p.hidden);
        const text = pre.textContent;
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
          .then(() => toast("Code copied. Paste it into RStudio or Colab to try it."))
          .catch(() => {
            const r = document.createRange(); r.selectNodeContents(pre);
            const s = getSelection(); s.removeAllRanges(); s.addRange(r);
            toast("Code selected: press Ctrl+C (Cmd+C on a Mac) to copy.");
          });
      });
      tabs.appendChild(copy);
      box.prepend(tabs);
      if (box.dataset.say) {
        const say = document.createElement("p");
        say.className = "say"; say.textContent = box.dataset.say;
        box.appendChild(say);
      }
    });
    applyLang();
  }
  function setLang(l) {
    lang = l;
    try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* ignore */ }
    applyLang();
  }
  function applyLang() {
    $$(".codebox").forEach(box => {
      const pres = $$("pre", box);
      const has = pres.some(p => p.dataset.lang === lang);
      pres.forEach(p => { p.hidden = has ? p.dataset.lang !== lang : p !== pres[0]; });
      $$(".tabs button[data-lang]", box).forEach(b => {
        const on = has ? b.dataset.lang === lang : b === $(".tabs button[data-lang]", box);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
    });
    $$(".lang-name").forEach(el => { el.textContent = LANG_NAMES[lang]; });
  }

  // ---------- run cells ----------
  function buildRunCells() {
    $$(".cell.run[data-run]").forEach(cell => {
      const key = cell.dataset.run;
      let out = $(".output", cell);
      if (!out) { out = document.createElement("div"); out.className = "output"; out.setAttribute("aria-live", "polite"); cell.appendChild(out); }
      const bar = document.createElement("div");
      bar.className = "runbar";
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "runbtn"; btn.textContent = "▶ Run";
      bar.appendChild(btn);
      if (cell.dataset.predict) {
        const p = document.createElement("div");
        p.className = "predict";
        const id = "predict-" + key.replace(/\W/g, "-");
        p.innerHTML = `<label for="${id}">Predict first: ${esc(cell.dataset.predict)}</label>
          <textarea id="${id}" class="short" data-save="predict.${esc(key)}" data-label="Prediction: ${esc(cell.dataset.predict)}" data-optional="1"></textarea>`;
        cell.insertBefore(p, out);
      }
      cell.insertBefore(bar, out);
      const run = () => {
        const fn = window.RUNNERS[key];
        if (!fn) { out.innerHTML = '<pre>This cell has nothing to run yet.</pre>'; return; }
        try { out.innerHTML = ""; fn(out, cell); }
        catch (e) { out.innerHTML = "<pre>Something went wrong showing this output: " + esc(e.message) + "</pre>"; console.error(e); }
        btn.textContent = "↻ Run again";
        if (!state["ran." + key]) { state["ran." + key] = 1; save(); }
      };
      btn.addEventListener("click", run);
      cell._run = run;
    });
  }
  // Re-run anything the student has already run, so outputs survive a reload.
  function restoreRuns() {
    $$(".cell.run[data-run]").forEach(cell => { if (state["ran." + cell.dataset.run] && cell._run) cell._run(); });
  }

  // ---------- saved fields ----------
  function fieldValue(el) { return el.type === "checkbox" ? (el.checked ? "1" : "") : el.value; }
  function loadFields() {
    $$("[data-save]").forEach(el => {
      const v = state[el.dataset.save];
      if (v === undefined) return;
      if (el.type === "checkbox") el.checked = v === "1"; else el.value = v;
    });
  }
  let saveTimer = null;
  function save() {
    state._updated = Date.now();
    const ok = writeJSON(STORE_KEY, state);
    if (ok) setSaveState("Saved in this browser " + stamp(), "saved");
    else setSaveState("Not saving: download your work before you leave", "error");
    updateProgress();
    updateFinish();
  }
  function onInput(e) {
    const el = e.target.closest("[data-save]");
    if (!el) return;
    state[el.dataset.save] = fieldValue(el);
    clearTimeout(saveTimer);
    setSaveState("Saving…");
    saveTimer = setTimeout(save, 400);
    if (el.matches("select") && el.closest(".classify .item")) el.closest(".item").dataset.v = el.value;
  }

  // ---------- fixed form tables (the handout pro formas) ----------
  // <table class="form" data-key="prov" data-head="|" data-cols="Finding|Source|S / I / ?:S,I,?">
  //   <tr data-id="name"><td>Question text</td></tr> ...
  // Each row keeps its written cells and gets one input per data-cols entry.
  // "Label:a,b,c" makes a dropdown; anything else is a text box.
  function buildFormTables() {
    $$("table.form[data-key]").forEach(table => {
      const key = table.dataset.key;
      const cols = table.dataset.cols.split("|").map(c => {
        const [label, opts] = c.split(":");
        return { label: label.trim(), options: opts ? opts.split(",").map(s => s.trim()) : null };
      });
      const lead = (table.dataset.head || "").split("|");
      const thead = table.createTHead();
      thead.innerHTML = `<tr>${lead.map(h => `<th>${esc(h)}</th>`).join("")}${cols.map(c => `<th>${esc(c.label)}</th>`).join("")}</tr>`;
      $$("tbody tr", table).forEach((tr, i) => {
        const id = tr.dataset.id || String(i + 1);
        const rowLabel = $("td", tr) ? $$("td", tr).map(td => td.innerText.trim()).filter(Boolean).slice(-1)[0] : "";
        $$("td", tr).forEach(td => td.classList.add("label"));
        cols.forEach((c, j) => {
          const td = document.createElement("td");
          const aria = `${rowLabel.slice(0, 80)}: ${c.label}`;
          td.innerHTML = c.options
            ? `<select aria-label="${esc(aria)}"><option value=""></option>${c.options.map(o => `<option>${esc(o)}</option>`).join("")}</select>`
            : `<textarea aria-label="${esc(aria)}"></textarea>`;
          td.firstElementChild.dataset.save = `${key}.${id}.${j}`;
          if (table.dataset.optional) td.firstElementChild.dataset.optional = "1";
          tr.appendChild(td);
        });
      });
    });
  }

  // ---------- editable row tables ----------
  function buildRowTables() {
    $$("table.rows[data-rows]").forEach(table => {
      const key = table.dataset.rows;
      const cols = $$("thead th", table).map(th => ({
        label: th.textContent.trim(), options: th.dataset.options ? th.dataset.options.split("|") : null,
      }));
      const tbody = table.tBodies[0] || table.appendChild(document.createElement("tbody"));
      const minRows = +(table.dataset.min || 3);
      let rows = state["rows." + key];
      if (!Array.isArray(rows)) {
        rows = $$("tr", tbody).map(tr => $$("td", tr).map(td => td.textContent.trim()));
        while (rows.length < minRows) rows.push(cols.map(() => ""));
      }
      const thead = table.tHead.rows[0];
      if (!$("th.del", thead)) { const th = document.createElement("th"); th.className = "del"; th.innerHTML = '<span class="skip">Remove</span>'; thead.appendChild(th); }
      function render() {
        tbody.innerHTML = "";
        rows.forEach((r, i) => {
          const tr = document.createElement("tr");
          cols.forEach((c, j) => {
            const td = document.createElement("td");
            const aria = `${c.label}, row ${i + 1}`;
            if (c.options) {
              td.innerHTML = `<select aria-label="${esc(aria)}"><option value=""></option>${c.options.map(o => `<option${o === r[j] ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
            } else {
              td.innerHTML = `<textarea aria-label="${esc(aria)}" class="short"></textarea>`;
              $("textarea", td).value = r[j] || "";
            }
            const input = td.firstElementChild;
            input.addEventListener("input", () => { rows[i][j] = input.value; state["rows." + key] = rows; clearTimeout(saveTimer); setSaveState("Saving…"); saveTimer = setTimeout(save, 400); });
            tr.appendChild(td);
          });
          const td = document.createElement("td");
          td.innerHTML = `<button type="button" class="rowdel" title="Remove row ${i + 1}" aria-label="Remove row ${i + 1}">✕</button>`;
          $("button", td).addEventListener("click", () => {
            if (rows[i].some(v => v) && !td.dataset.armed) { td.dataset.armed = "1"; $("button", td).textContent = "sure?"; return; }
            rows.splice(i, 1); state["rows." + key] = rows; render(); save();
          });
          tr.appendChild(td);
          tbody.appendChild(tr);
        });
      }
      render();
      const add = document.createElement("button");
      add.type = "button"; add.className = "small noprint"; add.textContent = "+ Add a row";
      add.addEventListener("click", () => { rows.push(cols.map(() => "")); state["rows." + key] = rows; render(); save(); });
      (table.closest(".tablewrap") || table).after(add);
      table._rows = () => ({ cols: cols.map(c => c.label), rows });
    });
  }

  // ---------- progress ----------
  function isFilled(el) { const v = state[el.dataset.save]; return v !== undefined && String(v).trim() !== ""; }
  function updateProgress() {
    const fields = $$("[data-save]").filter(el => !el.dataset.optional);
    const tables = $$("table.rows[data-rows]").filter(t => !t.dataset.optional);
    const total = fields.length + tables.length;
    const tableDone = tables.filter(t => (state["rows." + t.dataset.rows] || []).some(r => r.some(v => v && v.trim()))).length;
    const done = fields.filter(isFilled).length + tableDone;
    const pct = total ? Math.round(100 * done / total) : 0;
    const bar = $(".progress > div");
    if (bar) bar.style.width = pct + "%";
    $$(".cell.turn").forEach(cell => {
      const f = $$("[data-save]", cell).filter(el => !el.dataset.optional);
      const t = $$("table.rows[data-rows]", cell).filter(tb => !tb.dataset.optional);
      const complete = (f.length || t.length) && f.every(isFilled) &&
        t.every(tb => (state["rows." + tb.dataset.rows] || []).some(r => r.some(v => v && v.trim())));
      cell.classList.toggle("complete", !!complete);
    });
    $$("section.part").forEach(p => {
      const f = $$("[data-save]", p).filter(el => !el.dataset.optional);
      const a = $(`.toc a[data-part="${p.id}"]`);
      if (a) a.classList.toggle("done", f.length > 0 && f.every(isFilled));
    });
    meta["progress" + WEEK] = pct;
    writeJSON(META_KEY, meta);
  }

  // ---------- export ----------
  function labelFor(el) {
    if (el.dataset.label) return el.dataset.label;
    if (el.id) { const l = $(`label[for="${el.id}"]`); if (l) return l.innerText.trim(); }
    const f = el.closest(".field");
    if (f && $("label", f)) return $("label", f).innerText.trim();
    return el.getAttribute("aria-label") || el.placeholder || "Answer";
  }

  // Walk the page in order and collect headings, answers, tables and chosen outputs.
  function collect() {
    const items = [];
    const main = $("main");
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        if (n.closest(".finish")) return NodeFilter.FILTER_REJECT;
        if (n.matches("section.part > h2, .cell.turn > h3, .cell.turn > h4, [data-save], table.form, table.rows, .output[data-export], .classify")) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      },
    });
    let n;
    while ((n = walker.nextNode())) {
      if (n.matches("h2")) items.push({ type: "h2", text: n.innerText.trim() });
      else if (n.matches("h3, h4")) items.push({ type: "h3", text: n.innerText.trim() });
      else if (n.matches("table.rows")) {
        const t = n._rows ? n._rows() : { cols: [], rows: [] };
        const rows = t.rows.filter(r => r.some(v => v && v.trim()));
        items.push({ type: "table", caption: n.dataset.caption || "", head: t.cols, rows });
      } else if (n.matches("table.form")) {
        const head = $$("thead th", n).map(th => th.innerText.trim());
        const rows = $$("tbody tr", n).map(tr => $$("td, th", tr).map(td => {
          const input = $("textarea, input, select", td);
          return input ? fieldValue(input) : td.textContent.replace(/\s+/g, " ").trim();
        }));
        items.push({ type: "table", caption: n.dataset.caption || "", head, rows });
      } else if (n.matches(".classify")) {
        const groups = {};
        $$(".item", n).forEach(it => { const v = $("select", it); const lab = v.selectedOptions[0]?.text || ""; if (v.value) (groups[lab] = groups[lab] || []).push(it.dataset.col); });
        items.push({ type: "list", caption: n.dataset.caption || "Classification", groups });
      } else if (n.matches(".output[data-export]")) {
        if (n.innerText.trim()) items.push({ type: "pre", caption: n.dataset.export, text: n.innerText.trim() });
      } else if (n.matches("[data-save]")) {
        if (n.closest("table.form, table.rows, .classify")) continue;
        if (n.dataset.optional && !isFilled(n)) continue;
        items.push({ type: "qa", q: labelFor(n), a: fieldValue(n).trim() });
      }
    }
    return items;
  }

  function header() {
    const name = (meta.name || "").trim();
    return { title: document.title, name, when: new Date().toLocaleString("en-GB") };
  }

  function toMarkdown(items) {
    const h = header();
    const cell = s => String(s || "").replace(/\|/g, "\\|").replace(/\n+/g, "<br>");
    const out = [`# ${h.title}`, "", `${h.name ? h.name + " · " : ""}Downloaded ${h.when}`, ""];
    items.forEach(it => {
      if (it.type === "h2") out.push("", "## " + it.text, "");
      else if (it.type === "h3") out.push("", "### " + it.text, "");
      else if (it.type === "qa") out.push(`**${it.q}**`, "", it.a ? it.a : "_(not answered)_", "");
      else if (it.type === "pre") out.push(`*${it.caption}*`, "", "```", it.text, "```", "");
      else if (it.type === "list") {
        out.push(`*${it.caption}*`, "");
        Object.entries(it.groups).forEach(([g, cols]) => out.push(`- **${g}:** ${cols.join(", ")}`));
        out.push("");
      } else if (it.type === "table") {
        if (it.caption) out.push(`*${it.caption}*`, "");
        if (!it.rows.length) { out.push("_(empty)_", ""); return; }
        const head = it.head.length ? it.head : it.rows[0].map((_, i) => "Column " + (i + 1));
        out.push("| " + head.map(cell).join(" | ") + " |", "|" + head.map(() => "---").join("|") + "|");
        it.rows.forEach(r => out.push("| " + head.map((_, i) => cell(r[i])).join(" | ") + " |"));
        out.push("");
      }
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n");
  }

  function toHTML(items) {
    const h = header();
    const para = s => esc(s).replace(/\n/g, "<br>");
    const body = items.map(it => {
      if (it.type === "h2") return `<h2>${esc(it.text)}</h2>`;
      if (it.type === "h3") return `<h3>${esc(it.text)}</h3>`;
      if (it.type === "qa") return `<p><b>${esc(it.q)}</b></p><p>${it.a ? para(it.a) : "<i>(not answered)</i>"}</p>`;
      if (it.type === "pre") return `<p><i>${esc(it.caption)}</i></p><pre style="font-family:Consolas,monospace;font-size:9pt">${esc(it.text)}</pre>`;
      if (it.type === "list") return `<p><i>${esc(it.caption)}</i></p><ul>${Object.entries(it.groups).map(([g, c]) => `<li><b>${esc(g)}:</b> ${esc(c.join(", "))}</li>`).join("")}</ul>`;
      if (it.type === "table") {
        if (!it.rows.length) return `${it.caption ? `<p><i>${esc(it.caption)}</i></p>` : ""}<p><i>(empty)</i></p>`;
        const head = it.head.length ? `<tr>${it.head.map(c => `<th>${esc(c)}</th>`).join("")}</tr>` : "";
        return `${it.caption ? `<p><i>${esc(it.caption)}</i></p>` : ""}<table border="1" cellpadding="4" style="border-collapse:collapse">${head}${it.rows.map(r => `<tr>${r.map(c => `<td>${para(c)}</td>`).join("")}</tr>`).join("")}</table>`;
      }
      return "";
    }).join("\n");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(h.title)}</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4}h1{font-size:18pt}h2{font-size:14pt;margin-top:18pt}h3{font-size:12pt}th{background:#eee;text-align:left}td,th{vertical-align:top}</style>
</head><body><h1>${esc(h.title)}</h1><p>${h.name ? esc(h.name) + " · " : ""}Downloaded ${esc(h.when)}</p>${body}</body></html>`;
  }

  function fileBase() {
    const name = (meta.name || "").trim().replace(/[^\w-]+/g, "_");
    return `DASC513_week${WEEK}${name ? "_" + name : ""}`;
  }
  function markDownloaded() { state._downloaded = Date.now(); writeJSON(STORE_KEY, state); updateFinish(); }

  function allData() {
    const data = { app: "dasc513-northstar", version: 1, saved: new Date().toISOString(), weeks: {} };
    ["5", "6", "7", "8"].forEach(w => { data.weeks[w] = readJSON("dasc513.week" + w, {}); });
    data.meta = readJSON(META_KEY, {});
    return data;
  }
  function restore(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.app !== "dasc513-northstar") throw new Error("This is not a DASC513 backup file.");
        Object.entries(data.weeks || {}).forEach(([w, v]) => { if (v && Object.keys(v).length) writeJSON("dasc513.week" + w, v); });
        if (data.meta) writeJSON(META_KEY, Object.assign(readJSON(META_KEY, {}), data.meta));
        toast("Restored. Reloading…");
        setTimeout(() => location.reload(), 700);
      } catch (e) { toast("Could not restore: " + e.message); }
    };
    reader.readAsText(file);
  }
  window.DASC = { allData, restore, readJSON, writeJSON, toast, download, esc };

  function buildFinish() {
    const fin = $("#finish");
    if (!fin) return;
    fin.classList.add("finish");
    fin.insertAdjacentHTML("beforeend", `
      <div class="field"><label for="student-name">Your name <span class="hint">Optional. Only goes on your downloaded file; it is never sent anywhere.</span></label>
      <input type="text" id="student-name" autocomplete="name"></div>
      <p class="finish-status"></p>
      <div class="btnrow">
        <button type="button" class="primary" data-act="word">Download for Word (.doc)</button>
        <button type="button" data-act="md">Download as Markdown (.md)</button>
        <button type="button" data-act="print">Print or save as PDF</button>
      </div>
      <details><summary>Backup, move to another computer, or start again</summary>
        <p>A backup file holds everything you have typed in all four weeks. Load it on another computer
        (or after your browser has been cleared) to carry on where you left off.</p>
        <div class="btnrow">
          <button type="button" data-act="backup">Download backup file (.json)</button>
          <label class="btn" for="restore-file">Restore from a backup file…</label>
          <input type="file" id="restore-file" accept=".json,application/json" hidden>
          <button type="button" class="danger" data-act="clear">Clear this week's answers</button>
        </div>
      </details>`);
    const nameEl = $("#student-name", fin);
    nameEl.value = meta.name || "";
    nameEl.addEventListener("input", () => { meta.name = nameEl.value; writeJSON(META_KEY, meta); });
    fin.addEventListener("click", e => {
      const b = e.target.closest("button[data-act]");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "word") { download(fileBase() + ".doc", toHTML(collect()), "application/msword"); markDownloaded(); }
      else if (act === "md") { download(fileBase() + ".md", toMarkdown(collect()), "text/markdown;charset=utf-8"); markDownloaded(); }
      else if (act === "print") { $$("details").forEach(d => d.open = true); window.print(); }
      else if (act === "backup") { download("DASC513_backup_" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(allData(), null, 1), "application/json"); markDownloaded(); }
      else if (act === "clear") {
        if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Click again to delete this week's answers"; return; }
        try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
        location.reload();
      }
    });
    $("#restore-file", fin).addEventListener("change", e => { if (e.target.files[0]) restore(e.target.files[0]); });
    updateFinish();
  }
  function updateFinish() {
    const s = $(".finish-status");
    if (!s) return;
    const u = state._updated, d = state._downloaded;
    if (!storageOK) s.innerHTML = "<strong>This browser is not letting the page save.</strong> Download your work before you close the tab.";
    else if (!u) s.textContent = "Nothing typed yet on this page.";
    else if (!d || u > d) s.innerHTML = "<strong>You have changes that are not in a download yet.</strong> Your work is saved in this browser, but university PCs can wipe it when you log out.";
    else s.textContent = "Everything you have typed is in your last download.";
  }

  // ---------- go ----------
  function init() {
    buildHeader();
    if (WEEK === "home") return;
    buildCodeboxes();
    buildRunCells();
    buildFormTables();
    buildRowTables();
    loadFields();
    $$(".classify .item select").forEach(s => { s.closest(".item").dataset.v = s.value; });
    buildTOC();
    buildFinish();
    document.addEventListener("input", onInput);
    document.addEventListener("change", onInput);
    restoreRuns();
    updateProgress();
    if (!storageOK) {
      setSaveState("Not saving: download your work before you leave", "error");
      const n = document.createElement("div");
      n.className = "notice danger";
      n.innerHTML = "<strong>Your browser is blocking saving</strong> (perhaps a private window). Everything works, but nothing you type survives closing the tab. Use <a href='#finish'>Download</a> before you leave.";
      $("main").prepend(n);
    } else setSaveState(state._updated ? "Saved in this browser" : "Saves as you type", "saved");
  }
  // Pages register their RUNNERS in a script after this one; build once everything has loaded.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
