/* Week 5: outputs for the RUN cells, computed from the real data. */
(function () {
  "use strict";
  const { DATA, DICT, table, text, html, counts, dictRow, esc } = UI;
  const rows = DATA.rows, cols = DATA.columns;

  function dictTable(out, name) {
    const d = dictRow(name);
    if (!d) { html(out, `<p><strong>${esc(name)}</strong> is <strong>not in the data dictionary.</strong></p>`); return; }
    table(out, ["", name], DICT.columns.map(c => [c, d[c]]), { rowHeaders: true, caption: "Data dictionary entry" });
  }

  RUNNERS["w5.load"] = out => text(out, `loaded ${rows.length} records with ${cols.length} fields, and a data dictionary of ${DICT.rows.length} rows`);

  RUNNERS["w5.head"] = out => {
    table(out, ["column", "row 1", "row 2", "row 3"], cols.map(c => [c, rows[0][c], rows[1][c], rows[2][c]]),
      { rowHeaders: true, caption: `${cols.length} columns × 3 rows, flipped on its side. Scroll to see them all.` });
  };


  RUNNERS["w5.sex"] = out => counts(out, "sex");
  RUNNERS["w5.com"] = out => counts(out, "com_other_txt");
  RUNNERS["w5.site"] = out => counts(out, "site_code");

  RUNNERS["w5.meds"] = out => {
    const meds = rows.map(r => r.meds_on_admission_txt).filter(m => m !== "");
    text(out, meds.slice(0, 10).map(m => "- " + m).join("\n"));
  };

  RUNNERS["w5.crp"] = out => {
    dictTable(out, "crp_adm");
    text(out, "First eight values: " + rows.slice(0, 8).map(r => r.crp_adm).join("  "));
    const notNumbers = rows.map(r => r.crp_adm).filter(v => NS.toNumber(v) === null);
    table(out, ["value that is not a number", "count"], NS.valueCounts(notNumbers).map(({ value, n }) => [value, n]), { num: [1] });
    const nums = rows.map(r => NS.toNumber(r.crp_adm)).filter(x => x !== null);
    text(out, "Largest numeric value: " + Math.max(...nums));
  };

  RUNNERS["w5.undoc"] = out => {
    const documented = new Set(DICT.rows.map(r => r.variable_name));
    const inExport = cols.filter(c => !c.endsWith("_complete"));
    const undoc = inExport.filter(c => !documented.has(c));
    text(out, `${inExport.length} fields in the export, ${documented.size} described in the dictionary\n` +
      `${undoc.length} fields with no entry:\n` + undoc.map(c => "- " + c).join("\n"));
  };

  // ---- interactive bits (built before app.js sets up the page) ----
  const options = cols.map(c => `<option>${esc(c)}</option>`).join("");

  const lookup = document.getElementById("w5-lookup");
  lookup.innerHTML = '<option value="">choose a column…</option>' + options;
  lookup.addEventListener("change", () => {
    const out = document.getElementById("w5-lookup-out");
    out.innerHTML = "";
    if (lookup.value) dictTable(out, lookup.value);
  });

  const pick = document.getElementById("w5-col");
  pick.innerHTML = options;
  pick.value = "consent_type";
  document.getElementById("w5-col-run").addEventListener("click", () => {
    const c = pick.value;
    document.querySelectorAll("#w5-col-code pre").forEach(pre => {
      pre.querySelector("code").textContent = pre.dataset.lang === "r"
        ? `sort(table(df$${c}), decreasing = TRUE)` : `df["${c}"].value_counts()`;
    });
    const out = document.getElementById("w5-col-out");
    out.innerHTML = "";
    counts(out, c);
    const d = dictRow(c);
    html(out, d ? `<p><strong>The dictionary says:</strong> ${esc(d.field_label)}${d.choices_or_units ? ` · <code>${esc(d.choices_or_units)}</code>` : ""}${d.notes ? ` · ${esc(d.notes)}` : ""}</p>`
      : `<p><strong>${esc(c)} is not in the data dictionary.</strong></p>`);
  });

  // Running totals: provenance "?" boxes and the FAIR score.
  function tally() {
    const provSel = [...document.querySelectorAll('select[data-save^="prov."]')];
    document.getElementById("w5-qcount").textContent = provSel.filter(s => s.value === "?").length;
    document.getElementById("w5-qtotal").textContent = provSel.length;
    const scores = [...document.querySelectorAll('select[data-save^="fair."][data-save$=".0"]')];
    const total = scores.reduce((a, s) => a + (/^\d$/.test(s.value) ? +s.value : 0), 0);
    const open = scores.filter(s => s.value === "" || s.value === "?").length;
    document.getElementById("fair-total").textContent = total;
    document.getElementById("fair-note").textContent = open ? `(${open} point${open > 1 ? "s" : ""} unscored or "?")` : "";
  }
  document.addEventListener("change", tally);
  document.addEventListener("DOMContentLoaded", () => setTimeout(tally, 0));
})();
