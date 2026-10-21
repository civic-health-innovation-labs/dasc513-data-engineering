/* Week 6: outputs for the RUN cells, the column sorter and the k-anonymity explorer. */
(function () {
  "use strict";
  const { DATA, table, text, html, esc } = UI;
  const rows = DATA.rows, cols = DATA.columns;

  // ---- the de-identification pipeline, computed once, as in the notebook ----
  const SALT = "northstar-teaching-salt-do-not-reuse";
  const adm = rows.map(r => NS.parseSiteDate(r, "adm_date"));
  const dobRaw = rows.map(r => NS.parseSiteDate(r, "dob"));
  const ageOf = dobs => rows.map((r, i) => adm[i] !== null && dobs[i] !== null ? (adm[i] - dobs[i]) / 365.25 : null);
  const ageRaw = ageOf(dobRaw);
  const age = ageOf(dobRaw.map(NS.fixCentury));
  const BANDS = {
    nb: { bins: [0, 18, 40, 55, 65, 75, 85, 120], labels: ["<18", "18-39", "40-54", "55-64", "65-74", "75-84", "85+"] },
    b10: { bins: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120], labels: ["(0,10]", "(10,20]", "(20,30]", "(30,40]", "(40,50]", "(50,60]", "(60,70]", "(70,80]", "(80,90]", "(90,100]", "(100,110]", "(110,120]"] },
    b20: { bins: [0, 20, 40, 60, 80, 100, 120], labels: ["(0,20]", "(20,40]", "(40,60]", "(60,80]", "(80,100]", "(100,120]"] },
    b65: { bins: [0, 65, 120], labels: ["<65", "65+"] },
  };
  const safe = rows.map((r, i) => {
    const district = NS.postcodeDistrict(r.postcode);
    const s = {
      record_id: r.record_id, study_id: NS.pseudonymise(r.nhs_number, SALT), sex: r.sex,
      redcap_data_access_group: r.redcap_data_access_group, ethnic_category: r.ethnic_category, com_rare_ild: r.com_rare_ild,
      sex_tidy: { M: "M", Male: "M", "1": "M", F: "F", female: "F", "2": "F" }[r.sex] || null,
      postcode_district: district, postcode_area: district.replace(/\d+/g, ""),
    };
    Object.keys(BANDS).forEach(b => { s["age_" + b] = NS.band(age[i], BANDS[b].bins, BANDS[b].labels); });
    s.age_band = s.age_nb;
    ["symptom_onset_date", "outcome_date", "icu_admit_date", "steroid_start_date"].forEach(c => {
      const d = NS.parseSiteDate(r, c);
      s["days_to_" + c.replace("_date", "")] = d !== null && adm[i] !== null ? d - adm[i] : null;
    });
    return s;
  });

  function statsTable(out, nums) {
    const d = NS.describe(nums);
    const missing = nums.filter(x => x === null).length;
    table(out, ["", "age_years"], [
      ["count", d.count], ["missing", missing], ["mean", +d.mean.toFixed(2)], ["standard deviation", +d.std.toFixed(2)],
      ["min", +d.min.toFixed(2)], ["25%", +d["25%"].toFixed(2)], ["median (50%)", +d["50%"].toFixed(2)],
      ["75%", +d["75%"].toFixed(2)], ["max", +d.max.toFixed(2)],
    ], { num: [1], rowHeaders: true, caption: "R's summary() and Python's describe() show these numbers in slightly different layouts" });
  }
  function kText(cols, k, label) {
    const res = NS.kCheck(safe, cols, k);
    return `indirect identifiers: ${label || cols.join(", ")}\n` +
      `  smallest group size (k)     : ${res.smallest}\n` +
      `  combinations seen only once : ${res.uniques}\n` +
      `  rows in groups smaller than ${k}: ${res.belowK} of ${res.total}`;
  }

  // ---- RUN cells ----
  RUNNERS["w6.load"] = out => text(out, `admission dates parsed: ${adm.filter(x => x !== null).length} of ${rows.length}`);
  RUNNERS["w6.drop"] = out => text(out, `columns remaining: ${cols.length + 1 - 5}`);   // + adm_date_parsed, - 5 identifiers
  RUNNERS["w6.pseudo"] = out => table(out, ["record_id", "study_id"], safe.slice(0, 5).map(s => [s.record_id, s.study_id]));
  RUNNERS["w6.dup"] = out => table(out, ["record_id", "study_id"], safe.filter(s => s.record_id === "47" || s.record_id === "88").map(s => [s.record_id, s.study_id]));
  RUNNERS["w6.age"] = out => statsTable(out, ageRaw);
  RUNNERS["w6.neg"] = out => {
    const neg = rows.filter((r, i) => ageRaw[i] !== null && ageRaw[i] < 0);
    text(out, `negative ages: ${neg.length}`);
    table(out, ["site", "count"], NS.valueCounts(neg.map(r => r.redcap_data_access_group)).map(({ value, n }) => [value, n]), { num: [1] });
    table(out, ["record_id", "dob"], neg.slice(0, 6).map(r => [r.record_id, r.dob]), { caption: "The first few, with their dates of birth as typed" });
  };
  RUNNERS["w6.fix"] = out => {
    text(out, `negative ages now: ${age.filter(a => a !== null && a < 0).length}`);
    statsTable(out, age);
    const i63 = rows.findIndex(r => r.record_id === "63");
    text(out, `record 63: dob typed as ${rows[i63].dob}, now read as ${NS.isoDate(NS.fixCentury(dobRaw[i63]))}, age ${age[i63].toFixed(1)}`);
  };
  RUNNERS["w6.bands"] = out => {
    text(out, `patients with an age band: ${safe.filter(s => s.age_band).length} of ${safe.length}`);
    const vc = new Map(NS.valueCounts(safe.map(s => s.age_band)).map(({ value, n }) => [value, n]));
    table(out, ["age_band", "count"], BANDS.nb.labels.map(l => [l, vc.get(l) || 0]), { num: [1] });
  };
  RUNNERS["w6.postcode"] = out => {
    const vc = NS.valueCounts(safe.map(s => s.postcode_district)).slice(0, 12);
    table(out, ["postcode_district", "count"], vc.map(({ value, n }) => [value, n]),
      { num: [1], caption: "The 12 most common districts. Districts with the same count may be listed in a different order in R and Python." });
  };
  RUNNERS["w6.trap"] = out => {
    const tv = ["L7 2EZ", "PR80GQ", "ch42 9aa", " CH44  5TU "];
    table(out, ["value", "naive", "better"], tv.map(v => [{ html: `<code>${esc(JSON.stringify(v))}</code>` }, v.split(" ")[0], NS.postcodeDistrict(v)]));
  };
  RUNNERS["w6.days"] = out => table(out, ["study_id", "days_to_symptom_onset", "days_to_outcome", "days_to_icu_admit"],
    safe.slice(0, 8).map(s => [s.study_id, s.days_to_symptom_onset, s.days_to_outcome, s.days_to_icu_admit]), { num: [1, 2, 3] });
  RUNNERS["w6.k1"] = out => text(out, kText(["sex", "age_band"], 5));
  RUNNERS["w6.k2"] = out => text(out, kText(["sex", "age_band", "postcode_district"], 5));
  RUNNERS["w6.k3"] = out => text(out, kText(["sex", "age_band", "postcode_district", "redcap_data_access_group"], 5));

  const comments = [...new Set(rows.map(r => r.clinician_comments_txt).filter(c => c.trim() !== ""))];
  RUNNERS["w6.comments"] = out => text(out, `${comments.length} distinct comments\n\n` + comments.map(c => "- " + c).join("\n"));
  RUNNERS["w6.regex"] = out => {
    const PHONE = /\b0\d{3}\s?\d{3}\s?\d{3,4}\b|\b07\d{3}\s?\d{6}\b/g;
    const PERSON = /\b(?:Dr|Mrs|Mr|Ms|Rev)\b|wife|son|daughter|brother|neighbour|employee|midwife/i;
    const red = comments.map(c => c.replace(PHONE, "[PHONE]")).filter(c => PERSON.test(c));
    text(out, red.map(c => "- " + c).join("\n"));
  };

  const SCRIPT1 = `import pandas as pd
DB_HOST = "northstar-db.example.nhs.uk"
DB_USER = "analyst"
DB_PASSWORD = "Nst4r!2025-prod"      # TODO move this somewhere safer
def connect():
    return f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/northstar"`;
  const SCRIPT2 = `import os
import pandas as pd
DB_HOST = "northstar-db.example.nhs.uk"
DB_USER = "analyst"
DB_PASSWORD = os.environ["NORTHSTAR_DB_PASSWORD"]
def connect():
    return f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/northstar"`;
  RUNNERS["w6.git1"] = out => text(out, `$ git log --oneline\n7a47043 remove password from code\n120b269 first pass at the analysis script\n\n$ cat analysis.py\n${SCRIPT2}`);
  RUNNERS["w6.git2"] = out => text(out, `$ git log -p
commit 7a470433f13a295cf287c3899951893120a96f4c
Author: A Student <student@example.org>

    remove password from code

diff --git a/analysis.py b/analysis.py
--- a/analysis.py
+++ b/analysis.py
@@ -1,6 +1,7 @@
+import os
 import pandas as pd
 DB_HOST = "northstar-db.example.nhs.uk"
 DB_USER = "analyst"
-DB_PASSWORD = "Nst4r!2025-prod"      # TODO move this somewhere safer
+DB_PASSWORD = os.environ["NORTHSTAR_DB_PASSWORD"]
 def connect():
     return f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/northstar"

commit 120b2697ed1d0a64fd25fa3792cf35b0efea758a
Author: A Student <student@example.org>

    first pass at the analysis script

diff --git a/analysis.py b/analysis.py
new file mode 100644
--- /dev/null
+++ b/analysis.py
@@ -0,0 +1,6 @@
${SCRIPT1.split("\n").map(l => "+" + l).join("\n")}`);

  // ---- Your turn 1: sort the columns ----
  const GROUPS = [["direct", "Direct"], ["indirect", "Indirect"], ["free", "Free text"], ["neither", "Neither"]];
  const PRESET = { patient_forename: "direct", dob: "indirect", clinician_comments_txt: "free" };
  // Fourteen columns chosen to cover the three groups and the borderline cases; the full list is in week 5.
  const SORT_COLS = ["patient_forename", "nhs_number", "hospital_number", "dob", "sex", "postcode", "gp_practice_code",
    "adm_date", "ethnic_category", "com_rare_ild", "site_code", "temp_adm", "crp_adm", "clinician_comments_txt"];
  const box = document.getElementById("w6-classify");
  box.innerHTML = SORT_COLS.map(c => `<div class="item" data-col="${esc(c)}"><span>${esc(c)}</span>
    <select data-save="cls.${esc(c)}" data-optional="1" aria-label="Group for ${esc(c)}"><option value=""></option>${GROUPS.map(([v, l]) => `<option value="${v}"${PRESET[c] === v ? " selected" : ""}>${l}</option>`).join("")}</select></div>`).join("");
  function tallyClasses() {
    const sel = [...box.querySelectorAll("select")];
    const n = v => sel.filter(s => s.value === v).length;
    document.getElementById("w6-cls-kpi").innerHTML = GROUPS.map(([v, l]) => `<div><b>${n(v)}</b><span>${l}</span></div>`).join("") +
      `<div><b>${n("")}</b><span>not sorted yet, of ${sel.length}</span></div>`;
  }
  box.addEventListener("change", tallyClasses);

  // ---- Your turn 3: the k-anonymity explorer ----
  const kx = document.getElementById("kx");
  const AGE_CODE = {
    nb: { col: "age_band", r: "", py: "" },
    b10: { col: "age_10", r: "safe$age_10 <- cut(age_years, breaks = seq(0, 120, by = 10))\n", py: "safe[\"age_10\"] = pd.cut(age_years, bins=range(0, 130, 10))\n" },
    b20: { col: "age_20", r: "safe$age_20 <- cut(age_years, breaks = seq(0, 120, by = 20))\n", py: "safe[\"age_20\"] = pd.cut(age_years, bins=range(0, 140, 20))\n" },
    b65: { col: "age_65", r: "safe$age_65 <- cut(age_years, breaks = c(0, 65, 120), labels = c(\"<65\", \"65+\"))\n", py: "safe[\"age_65\"] = pd.cut(age_years, bins=[0, 65, 120], labels=[\"<65\", \"65+\"])\n" },
  };
  const GEO_CODE = {
    district: { col: "postcode_district", r: "", py: "" },
    area: { col: "postcode_area", r: "safe$postcode_area <- gsub(\"[0-9]+\", \"\", safe$postcode_district)   # L8 becomes L\n",
      py: "safe[\"postcode_area\"] = safe[\"postcode_district\"].str.replace(r\"\\d+\", \"\", regex=True)   # L8 becomes L\n" },
  };
  let lastSummary = "";
  function explore() {
    const ageKey = document.getElementById("kx-age").value, geoKey = document.getElementById("kx-geo").value;
    const k = Math.max(2, +document.getElementById("kx-k").value || 5);
    const sup = document.getElementById("kx-sup").checked;
    const picked = [...kx.querySelectorAll("fieldset input:checked")].map(i => i.value);
    const tidy = document.getElementById("kx-sex").checked;
    const name = v => v === "age" ? AGE_CODE[ageKey].col : v === "geo" ? GEO_CODE[geoKey].col : v === "sex" && tidy ? "sex_tidy" : v;
    const chosen = picked.map(v => v === "age" ? "age_" + ageKey : name(v));
    const shown = picked.map(name);
    const out = document.getElementById("kx-out");
    let rcode = "", pycode = "";
    if (tidy && picked.includes("sex")) {
      rcode += 'safe$sex_tidy <- c(M = "M", Male = "M", "1" = "M", F = "F", female = "F", "2" = "F")[safe$sex]   # Unknown becomes NA\n';
      pycode += 'safe["sex_tidy"] = safe["sex"].map({"M": "M", "Male": "M", "1": "M", "F": "F", "female": "F", "2": "F"})   # Unknown becomes NaN\n';
    }
    if (picked.includes("age")) { rcode += AGE_CODE[ageKey].r; pycode += AGE_CODE[ageKey].py; }
    if (picked.includes("geo")) { rcode += GEO_CODE[geoKey].r; pycode += GEO_CODE[geoKey].py; }
    const kArg = k === 5 ? "" : `, k = ${k}`;
    rcode += `k_check(safe, c(${shown.map(c => `"${c}"`).join(", ")})${kArg})`;
    pycode += `k_check(safe, [${shown.map(c => `"${c}"`).join(", ")}]${kArg.replace(" = ", "=")})`;
    if (sup) {
      rcode += `\n\n# Suppress: keep only rows whose combination appears at least ${k} times
key <- do.call(paste, c(safe[c(${shown.map(c => `"${c}"`).join(", ")})], sep = "|"))
released <- safe[table(key)[key] >= ${k}, ]
table(safe$redcap_data_access_group)       # before
table(released$redcap_data_access_group)   # after`;
      pycode += `\n\n# Suppress: keep only rows whose combination appears at least ${k} times
key = safe[[${shown.map(c => `"${c}"`).join(", ")}]].astype("string").fillna("NA").agg("|".join, axis=1)
released = safe[key.map(key.value_counts()) >= ${k}]
print(safe["redcap_data_access_group"].value_counts())       # before
print(released["redcap_data_access_group"].value_counts())   # after`;
    }
    document.querySelectorAll("#kx-code pre").forEach(pre => { pre.querySelector("code").textContent = pre.dataset.lang === "r" ? rcode : pycode; });
    out.innerHTML = "";
    if (!chosen.length) { html(out, "<p>Tick at least one identifier.</p>"); lastSummary = ""; return; }
    const res = NS.kCheck(safe, chosen, k);
    html(out, `<div class="kpi">
      <div class="${res.smallest >= k ? "good" : "bad"}"><b>${res.smallest}</b><span>smallest group size</span></div>
      <div class="${res.uniques ? "bad" : "good"}"><b>${res.uniques}</b><span>combinations seen only once</span></div>
      <div class="${res.belowK ? "bad" : "good"}"><b>${res.belowK}</b><span>of ${res.total} rows in groups smaller than ${k}</span></div>
      <div><b>${res.nGroups}</b><span>different combinations</span></div></div>`);
    const desc = `${shown.join(" + ")}, k = ${k}`;
    lastSummary = `${desc}: smallest group ${res.smallest}, ${res.uniques} unique combinations, ${res.belowK} of ${res.total} rows below k.`;
    if (sup) {
      const small = new Set(res.groups.filter(g => g.n < k).map(g => JSON.stringify(g.key)));
      const kept = safe.filter(s => !small.has(JSON.stringify(chosen.map(c => s[c] === undefined ? null : s[c]))));
      const sites = ["mersey_general", "calderbrook", "wirral_park"];
      const before = s => safe.filter(x => x.redcap_data_access_group === s).length;
      const after = s => kept.filter(x => x.redcap_data_access_group === s).length;
      table(out, ["site", "rows before", "rows released", "% kept"],
        sites.map(s => [s, before(s), after(s), before(s) ? Math.round(100 * after(s) / before(s)) + "%" : "-"]).concat([["all sites", safe.length, kept.length, Math.round(100 * kept.length / safe.length) + "%"]]),
        { num: [1, 2, 3], caption: `After suppressing every row in a group smaller than ${k}` });
      lastSummary += ` Suppressing them releases ${kept.length} of ${safe.length} rows (` + sites.map(s => `${s} ${after(s)}/${before(s)}`).join(", ") + ").";
    }
  }
  kx.addEventListener("change", explore);
  kx.addEventListener("input", e => { if (e.target.id === "kx-k") explore(); });
  document.getElementById("kx-keep").addEventListener("click", () => {
    const ta = document.getElementById("w6-yt3b");
    if (!lastSummary) return;
    ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + lastSummary;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    DASC.toast("Added to your answer for Your turn 3.");
  });

  document.addEventListener("DOMContentLoaded", () => setTimeout(() => { tallyClasses(); explore(); }, 0));
})();
