/* Week 7: outputs for the RUN cells and the cross-field check picker. */
(function () {
  "use strict";
  const { DATA, DICT, table, text, html, esc } = UI;
  const rows = DATA.rows, cols = DATA.columns;

  const MISSING_MARKERS = new Set(["", "NULL", "N/A", "NA", "999", "Unknown", "unknown"]);
  const isMissing = v => MISSING_MARKERS.has(v);
  const COLS = ["crp_adm", "wcc_adm", "lymph_adm", "creat_adm", "urea_adm", "ddimer_adm", "ferritin_adm",
    "adm_weight_kg", "adm_height_cm", "symptom_onset_date", "ethnic_category"];
  const SITES = ["calderbrook", "mersey_general", "wirral_park"];
  const adm = rows.map(r => NS.parseSiteDate(r, "adm_date"));
  const outc = rows.map(r => NS.parseSiteDate(r, "outcome_date"));
  const pick = (r, fields) => fields.map(f => r[f]);
  // Two decimal places the way R and pandas round: an exact half goes to the even digit (0.125 -> 0.12).
  function round2(x) {
    const y = x * 100, f = Math.floor(y);
    const v = Math.abs(y - f - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(y);
    return (v / 100).toFixed(2);
  }

  RUNNERS["w7.load"] = out => text(out, `loaded ${rows.length} records with ${cols.length} fields`);
  RUNNERS["w7.sex"] = out => UI.counts(out, "sex");
  RUNNERS["w7.markers"] = out => text(out, String(rows.filter(r => isMissing(r.ferritin_adm)).length));
  RUNNERS["w7.missing"] = out => {
    const t = COLS.map((c, i) => { const n = rows.filter(r => isMissing(r[c])).length; return { c, n, i }; })
      .sort((a, b) => b.n - a.n || a.i - b.i);
    table(out, ["column", "n_missing", "pct_missing"], t.map(x => [x.c, x.n, +(100 * x.n / rows.length).toFixed(1)]), { num: [1, 2] });
  };
  RUNNERS["w7.bysite"] = out => {
    const n = s => rows.filter(r => r.redcap_data_access_group === s).length;
    table(out, SITES, [SITES.map(n)], { num: [0, 1, 2], caption: "Patients at each site" });
    const cell = (c, s) => {
      const site = rows.filter(r => r.redcap_data_access_group === s);
      const m = site.filter(r => isMissing(r[c])).length;
      const f = m / site.length;
      return { html: `${round2(f)} <span class="hint">(${m}/${site.length})</span>`, cls: f >= 0.25 ? "hot" : "" };
    };
    table(out, ["column"].concat(SITES), COLS.map(c => [c].concat(SITES.map(s => cell(c, s)))),
      { num: [1, 2, 3], caption: "Fraction missing at each site (the counts in brackets are not printed by R or Python)" });
  };
  RUNNERS["w7.dates"] = out => table(out, ["record_id", "redcap_data_access_group", "adm_date", "dob", "outcome_date"],
    rows.slice(0, 12).map(r => pick(r, ["record_id", "redcap_data_access_group", "adm_date", "dob", "outcome_date"])));
  RUNNERS["w7.parse"] = out => {
    const failed = rows.filter((r, i) => adm[i] === null);
    text(out, `failed to parse: ${failed.length}`);
    table(out, ["record_id", "redcap_data_access_group", "adm_date"], failed.map(r => pick(r, ["record_id", "redcap_data_access_group", "adm_date"])));
  };
  RUNNERS["w7.r99"] = out => {
    const r = rows.find(x => x.record_id === "99");
    table(out, ["field", "value"], cols.filter(c => r[c] !== "").map(c => [c, r[c]]), { caption: `${cols.filter(c => r[c] !== "").length} of ${cols.length} fields have anything in them` });
  };

  const PLAUSIBLE = { temp_adm: [34, 42], hr_adm: [30, 200], rr_adm: [6, 60], sbp_adm: [50, 250], spo2_adm: [50, 100],
    adm_weight_kg: [30, 300], adm_height_cm: [120, 220], creat_adm: [20, 1500], hosp_los_days: [0, 200] };
  RUNNERS["w7.plaus"] = out => {
    const probs = [];
    Object.entries(PLAUSIBLE).forEach(([c, [lo, hi]]) => rows.forEach(r => {
      const v = NS.toNumber(r[c]);
      if (v !== null && (v < lo || v > hi)) probs.push([r.record_id, c, v, `${lo} to ${hi}`]);
    }));
    table(out, ["record_id", "field", "value", "expected"], probs, { num: [2] });
  };
  RUNNERS["w7.cross"] = out => table(out, ["record_id", "adm_date", "outcome_date", "hosp_los_days"],
    rows.filter((r, i) => adm[i] !== null && outc[i] !== null && outc[i] < adm[i]).map(r => pick(r, ["record_id", "adm_date", "outcome_date", "hosp_los_days"])));

  const dup1 = () => {
    const key = r => JSON.stringify(pick(r, ["patient_forename", "patient_surname", "dob"]));
    const c = NS.valueCounts(rows.map(key));
    return rows.filter(r => c.find(x => x.value === key(r)).n > 1);
  };
  RUNNERS["w7.dup1"] = out => text(out, `matches on name + date of birth: ${dup1().length}`);
  RUNNERS["w7.dup2"] = out => {
    const n = new Map(NS.valueCounts(rows.map(r => r.nhs_number)).map(({ value, n }) => [value, n]));
    const d = rows.filter(r => r.nhs_number !== "" && n.get(r.nhs_number) > 1);
    text(out, `matches on NHS number: ${d.length}`);
    const f = ["record_id", "redcap_data_access_group", "patient_forename", "patient_surname", "nhs_number", "dob", "postcode", "hospital_number", "adm_date"];
    table(out, ["field"].concat(d.map(r => "record " + r.record_id)), f.map(c => [c].concat(d.map(r => r[c]))),
      { rowHeaders: true, caption: "Shown side by side, one column per record" });
  };

  RUNNERS["w7.long"] = out => {
    const daily = cols.filter(c => /_d\d+$/.test(c));
    const measures = [], days = [];
    daily.forEach(c => { const [, m, d] = /(.*)_d(\d+)$/.exec(c); if (!measures.includes(m)) measures.push(m); if (!days.includes(d)) days.push(d); });
    const long = [];
    rows.forEach(r => days.forEach(d => long.push([r.record_id, d].concat(measures.map(m => cols.includes(`${m}_d${d}`) ? r[`${m}_d${d}`] : null)))));
    text(out, `${daily.length} daily columns became ${long.length} rows`);
    table(out, ["record_id", "day"].concat(measures), long.slice(0, 8),
      { caption: "(missing) = there is no such column (ferritin was only measured on day 5); (blank) = the column exists but the cell is empty. Python lists the measures in alphabetical order." });
  };

  // ---- Your turn 5: the cross-field check picker ----
  const SHOW = ["record_id", "adm_date", "outcome_date", "hosp_los_days"];
  const YES = new Set(["Y", "Yes", "yes", "1"]);
  const CHECKS = {
    los: {
      r: `calculated <- as.numeric(df$outcome_date_parsed - df$adm_date_parsed)
entered    <- suppressWarnings(as.numeric(df$hosp_los_days))
mismatch   <- which(calculated != entered)
data.frame(df[mismatch, c("record_id", "adm_date", "outcome_date", "hosp_los_days")],
           calculated = calculated[mismatch])`,
      py: `calculated = (df["outcome_date_parsed"] - df["adm_date_parsed"]).dt.days
entered    = pd.to_numeric(df["hosp_los_days"], errors="coerce")
mismatch   = calculated.notna() & entered.notna() & (calculated != entered)
result = df.loc[mismatch, ["record_id", "adm_date", "outcome_date", "hosp_los_days"]].copy()
result["calculated"] = calculated[mismatch]
result`,
      run: out => {
        const res = [];
        rows.forEach((r, i) => {
          const calc = adm[i] !== null && outc[i] !== null ? outc[i] - adm[i] : null;
          const ent = NS.toNumber(r.hosp_los_days);
          if (calc !== null && ent !== null && calc !== ent) res.push(pick(r, SHOW).concat([calc]));
        });
        return [SHOW.concat(["calculated"]), res];
      },
    },
    onset: {
      r: `onset <- parse_dates(df, "symptom_onset_date")
late  <- which(onset > df$adm_date_parsed)
df[late, c("record_id", "adm_date", "symptom_onset_date")]`,
      py: `onset = parse_dates(df, "symptom_onset_date")
late  = onset > df["adm_date_parsed"]
df.loc[late, ["record_id", "adm_date", "symptom_onset_date"]]`,
      run: () => {
        const f = ["record_id", "adm_date", "symptom_onset_date"];
        return [f, rows.filter((r, i) => { const o = NS.parseSiteDate(r, "symptom_onset_date"); return o !== null && adm[i] !== null && o > adm[i]; }).map(r => pick(r, f))];
      },
    },
    born: {
      r: `dob  <- parse_dates(df, "dob")
born <- which(dob > df$adm_date_parsed)
cat("born after admission:", length(born), "\\n")
df[born, c("record_id", "redcap_data_access_group", "dob", "adm_date")]`,
      py: `dob  = parse_dates(df, "dob")
born = dob > df["adm_date_parsed"]
print("born after admission:", born.sum())
df.loc[born, ["record_id", "redcap_data_access_group", "dob", "adm_date"]]`,
      run: () => {
        const f = ["record_id", "redcap_data_access_group", "dob", "adm_date"];
        return [f, rows.filter((r, i) => { const d = NS.parseSiteDate(r, "dob"); return d !== null && adm[i] !== null && d > adm[i]; }).map(r => pick(r, f))];
      },
    },
    icu: {
      r: `YES <- c("Y", "Yes", "yes", "1")       # the ways "yes" was typed
no_date <- which(df$icu_admit %in% YES & df$icu_admit_date == "")
df[no_date, c("record_id", "icu_admit", "icu_admit_date")]`,
      py: `YES = ["Y", "Yes", "yes", "1"]          # the ways "yes" was typed
no_date = df["icu_admit"].isin(YES) & (df["icu_admit_date"] == "")
df.loc[no_date, ["record_id", "icu_admit", "icu_admit_date"]]`,
      run: () => {
        const f = ["record_id", "icu_admit", "icu_admit_date"];
        return [f, rows.filter(r => YES.has(r.icu_admit) && r.icu_admit_date === "").map(r => pick(r, f))];
      },
    },
    died: {
      r: `# outcome 2 = Died; discharge_dest 1 = Home (from the data dictionary)
died_home <- which(df$outcome == "2" & df$discharge_dest == "1")
df[died_home, c("record_id", "outcome", "discharge_dest")]`,
      py: `# outcome 2 = Died; discharge_dest 1 = Home (from the data dictionary)
died_home = (df["outcome"] == "2") & (df["discharge_dest"] == "1")
df.loc[died_home, ["record_id", "outcome", "discharge_dest"]]`,
      run: () => {
        const f = ["record_id", "outcome", "discharge_dest"];
        return [f, rows.filter(r => r.outcome === "2" && r.discharge_dest === "1").map(r => pick(r, f))];
      },
    },
  };
  const xc = document.getElementById("w7-xc");
  function runCheck() {
    const c = CHECKS[xc.value];
    document.querySelectorAll("#w7-xc-code pre").forEach(pre => { pre.querySelector("code").textContent = pre.dataset.lang === "r" ? c.r : c.py; });
    const out = document.getElementById("w7-xc-out");
    out.innerHTML = "";
    const [head, res] = c.run();
    if (!res.length) { html(out, "<p><strong>No rows.</strong> Nothing in the data fails this check.</p>"); return; }
    text(out, `${res.length} row${res.length > 1 ? "s" : ""} found`);
    table(out, head, res);
  }
  document.getElementById("w7-xc-run").addEventListener("click", runCheck);
  xc.addEventListener("change", runCheck);
})();
