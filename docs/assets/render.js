/* Shared output rendering for the RUN cells, and the loaded NORTHSTAR data. */
(function () {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const DATA = NS.parseCSV(window.NORTHSTAR_CSV);
  const DICT = NS.parseCSV(window.NORTHSTAR_DICT_CSV);

  // Show a value the way it was typed; make blanks visible.
  function show(v) {
    if (v === null || v === undefined) return '<span class="blank">(missing)</span>';
    if (v === "") return '<span class="blank">(blank)</span>';
    return esc(v);
  }
  function fmt(x, dp) {
    if (x === null || x === undefined || Number.isNaN(x)) return '<span class="blank">(missing)</span>';
    if (typeof x !== "number") return show(x);
    return dp === undefined ? String(x) : x.toFixed(dp);
  }

  /* table(out, headers, rows, opts)
     rows: arrays of cell values. Values are escaped unless wrapped as {html: "..."}.
     opts.caption, opts.num (array of column indexes to right-align), opts.data (monospace style) */
  function table(out, headers, rows, opts = {}) {
    const num = new Set(opts.num || []);
    const cell = (v, i, tag) => {
      const cls = [num.has(i) ? "num" : "", v && v.cls ? v.cls : ""].filter(Boolean).join(" ");
      const content = v && typeof v === "object" && "html" in v ? v.html : (typeof v === "number" ? fmt(v, opts.dp) : show(v));
      return `<${tag}${cls ? ` class="${cls}"` : ""}>${content}</${tag}>`;
    };
    const html = `${opts.caption ? `<div class="caption">${esc(opts.caption)}</div>` : ""}<div class="tablewrap"><table class="${opts.data === false ? "" : "data"}">
      ${headers ? `<thead><tr>${headers.map((h, i) => `<th${num.has(i) ? ' class="num"' : ""}>${esc(h)}</th>`).join("")}</tr></thead>` : ""}
      <tbody>${rows.map(r => `<tr>${r.map((v, i) => cell(v, i, opts.rowHeaders && i === 0 ? "th" : "td")).join("")}</tr>`).join("")}</tbody></table></div>`;
    out.insertAdjacentHTML("beforeend", html);
  }

  function text(out, s, caption) {
    out.insertAdjacentHTML("beforeend", `${caption ? `<div class="caption">${esc(caption)}</div>` : ""}<pre>${esc(s)}</pre>`);
  }
  function html(out, s) { out.insertAdjacentHTML("beforeend", s); }

  function counts(out, column, opts = {}) {
    const vc = NS.valueCounts(DATA.rows.map(r => r[column]));
    table(out, [column, "count"], vc.map(({ value, n }) => [value, n]), Object.assign({ num: [1], caption: `${vc.length} different values in ${column}` }, opts));
    return vc;
  }

  function dictRow(name) { return DICT.rows.find(r => r.variable_name === name); }

  window.UI = { DATA, DICT, esc, show, fmt, table, text, html, counts, dictRow };
})();
