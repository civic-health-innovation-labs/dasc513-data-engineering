/* NORTHSTAR data helpers.
 *
 * Pure functions, no page code. They reproduce what the Python notebooks do
 * (read every value as text, parse dates per site, pd.to_numeric with
 * errors="coerce", value_counts, k-anonymity check) so the numbers on the web
 * pages match the notebooks and the R/Python code shown beside them.
 * Loaded by the pages as a plain script, and by tests/check.js under Node.
 */
(function (root) {
  "use strict";

  // ---------- CSV ----------
  // RFC 4180 parser: quoted fields, doubled quotes, commas and newlines inside quotes.
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", i = 0, inQuotes = false;
    if (text.charCodeAt(0) === 0xfeff) i = 1;
    for (; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
        } else field += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += ch;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    const header = rows.shift();
    const records = rows.filter(r => r.length > 1 || r[0] !== "").map(r => {
      const o = {};
      header.forEach((h, j) => { o[h] = r[j] === undefined ? "" : r[j]; });
      return o;
    });
    return { columns: header, rows: records };
  }

  // ---------- counting ----------
  // Like pandas value_counts(dropna=False): most common first, ties in order of first appearance.
  function valueCounts(values) {
    const counts = new Map();
    values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    return [...counts.entries()].map(([value, n], order) => ({ value, n, order }))
      .sort((a, b) => b.n - a.n || a.order - b.order)
      .map(({ value, n }) => ({ value, n }));
  }

  // pd.to_numeric(errors="coerce"): a number, or null if the text is not one.
  function toNumber(s) {
    if (s === null || s === undefined) return null;
    const t = String(s).trim();
    if (t === "" || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return null;
    return Number(t);
  }

  // ---------- dates ----------
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

  function makeDate(y, m, d) {
    if (m < 1 || m > 12 || d < 1) return null;
    const t = Date.UTC(y, m - 1, d);
    const dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return t / 86400000;                      // whole days since 1970-01-01
  }

  // The three site conventions, written as Python strptime formats in the notebooks.
  const FORMATS = {
    "%d/%m/%Y": s => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); return m ? makeDate(+m[3], +m[2], +m[1]) : null; },
    "%Y-%m-%d": s => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s); return m ? makeDate(+m[1], +m[2], +m[3]) : null; },
    // %y follows Python: 00-68 become 20xx, 69-99 become 19xx.
    "%d-%b-%y": s => {
      const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/.exec(s);
      if (!m) return null;
      const mon = MONTHS[m[2].toLowerCase()];
      if (!mon) return null;
      const yy = +m[3];
      return makeDate(yy < 69 ? 2000 + yy : 1900 + yy, mon, +m[1]);
    },
  };
  const SITE_FORMATS = { mersey_general: "%d/%m/%Y", calderbrook: "%Y-%m-%d", wirral_park: "%d-%b-%y" };

  function parseDate(s, fmt) { return s ? FORMATS[fmt](s.trim()) : null; }
  function parseSiteDate(row, column) {
    const fmt = SITE_FORMATS[row.redcap_data_access_group];
    return fmt ? parseDate(row[column], fmt) : null;
  }
  function isoDate(day) {
    if (day === null || day === undefined) return "";
    return new Date(day * 86400000).toISOString().slice(0, 10);
  }
  // fix_century from the week 6 notebook: a date of birth after 2025-03-01 must be a century too late.
  function fixCentury(day) {
    if (day === null) return null;
    const today = makeDate(2025, 3, 1);
    if (day <= today) return day;
    const d = new Date(day * 86400000);
    return makeDate(d.getUTCFullYear() - 100, d.getUTCMonth() + 1, d.getUTCDate());
  }

  // ---------- summaries ----------
  // pandas Series.describe() for numbers (sample std, linear-interpolated quartiles).
  function describe(nums) {
    const v = nums.filter(x => x !== null && !Number.isNaN(x)).sort((a, b) => a - b);
    const n = v.length;
    if (!n) return { count: 0 };
    const mean = v.reduce((a, b) => a + b, 0) / n;
    const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : NaN;
    const q = p => { const h = (n - 1) * p, lo = Math.floor(h); return v[lo] + (h - lo) * ((v[lo + 1] ?? v[lo]) - v[lo]); };
    return { count: n, mean, std: sd, min: v[0], "25%": q(.25), "50%": q(.5), "75%": q(.75), max: v[n - 1] };
  }

  // pd.cut with right-closed bins: (0,18], (18,40], ...
  function band(x, bins, labels) {
    if (x === null || Number.isNaN(x)) return null;
    for (let i = 0; i < labels.length; i++) if (x > bins[i] && x <= bins[i + 1]) return labels[i];
    return null;
  }

  // ---------- de-identification ----------
  function postcodeDistrict(pc) {
    if (typeof pc !== "string" || pc.trim() === "") return "";
    const clean = pc.replace(/ /g, "").toUpperCase();
    return clean.slice(0, -3);
  }

  // k-anonymity over the chosen columns. Missing values form their own group (dropna=False).
  function kCheck(rows, cols, k) {
    const groups = new Map();
    rows.forEach(r => {
      const key = JSON.stringify(cols.map(c => (r[c] === null || r[c] === undefined) ? "\u0000NA" : r[c]));
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    const sizes = [...groups.values()];
    return {
      groups: [...groups.entries()].map(([key, n]) => ({ key: JSON.parse(key).map(v => v === "\u0000NA" ? null : v), n })).sort((a, b) => a.n - b.n),
      smallest: sizes.length ? Math.min(...sizes) : 0,
      uniques: sizes.filter(n => n === 1).length,
      belowK: sizes.filter(n => n < k).reduce((a, b) => a + b, 0),
      nGroups: sizes.length,
      total: rows.length,
    };
  }

  // SHA-256 (FIPS 180-4) on a UTF-8 string, returned as hex. Small and synchronous,
  // so it works when the page is opened from disk, where crypto.subtle may not exist.
  function sha256(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const bytes = Array.from(unescape(encodeURIComponent(str)), c => c.charCodeAt(0));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
    let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    const W = new Array(64);
    for (let off = 0; off < bytes.length; off += 64) {
      for (let t = 0; t < 16; t++) W[t] = (bytes[off + 4*t] << 24) | (bytes[off + 4*t + 1] << 16) | (bytes[off + 4*t + 2] << 8) | bytes[off + 4*t + 3];
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(W[t-15], 7) ^ rotr(W[t-15], 18) ^ (W[t-15] >>> 3);
        const s1 = rotr(W[t-2], 17) ^ rotr(W[t-2], 19) ^ (W[t-2] >>> 10);
        W[t] = (W[t-16] + s0 + W[t-7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[t] + W[t]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = H.map((x, i) => (x + [a, b, c, d, e, f, g, h][i]) | 0);
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, "0")).join("");
  }

  function pseudonymise(value, salt) {
    if (typeof value !== "string" || value.trim() === "") return "";
    return "P-" + sha256(salt + value.trim()).slice(0, 10);
  }

  // ---------- missing values (week 7) ----------
  const DEFAULT_MISSING = ["", "NULL", "N/A", "999", "Unknown", "unknown", "NA"];

  const api = {
    parseCSV, valueCounts, toNumber, parseDate, parseSiteDate, isoDate, makeDate, fixCentury,
    SITE_FORMATS, describe, band, postcodeDistrict, kCheck, sha256, pseudonymise, DEFAULT_MISSING,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NS = api;
})(typeof window !== "undefined" ? window : globalThis);
