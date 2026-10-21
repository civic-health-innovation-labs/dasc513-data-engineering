/* Week 8: live counts for the lay summary, dropped fields, committee scores and the letter preview. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const sel = q => [...document.querySelectorAll(q)];
  const esc = UI.esc;
  const LAY_LIMIT = 100, MAX_SCORE = 12;

  function update() {
    const words = ($("w8-lay").value.trim().match(/\S+/g) || []).length;
    $("w8-lay-count").textContent = `${words} words${words > LAY_LIMIT + 20 ? ", over the limit" : ""}`;

    // Column 0 of the field table is the minimum form.
    const forms = sel('select[data-save^="app.6b."]').filter(s => /\.0$/.test(s.dataset.save));
    const dropped = forms.filter(s => s.value === "dropped").length;
    $("w8-dropped").textContent = dropped ? `${dropped} group${dropped > 1 ? "s" : ""} of fields dropped.` :
      "Nothing dropped yet. The committee will look for at least one field given up, with a reason.";

    const a = sel('#dac-a select');
    const no = a.filter(s => s.value === "No").length, answered = a.filter(s => s.value).length;
    $("dac-a-total").innerHTML = `${answered} of ${a.length} checked · <strong>${no} "No"</strong>` +
      (no >= 2 ? ' · <strong>Incomplete: the usual decision is "resubmit when complete".</strong>' : "");

    const b = sel('#dac-b select');
    const scored = b.filter(s => s.value !== "");
    const total = scored.reduce((t, s) => t + +s.value, 0);
    const zeroBar = ["lawful", "match"].some(k => { const s = document.querySelector(`select[data-save="dac.b.${k}.0"]`); return s && s.value === "0"; });
    let guide = "";
    if (scored.length === b.length) guide = zeroBar ? "reject (a 0 on permissions or DPIA match)" : total >= 10 ? "usually approve" : total >= 7 ? "usually approve with conditions" : "usually reject";
    $("dac-score").innerHTML = `<div><b>${total} / ${MAX_SCORE}</b><span>${scored.length} of ${b.length} criteria scored</span></div>` +
      (guide ? `<div class="${zeroBar || total < 7 ? "bad" : total >= 10 ? "good" : ""}"><b style="font-size:1.05rem">${guide}</b><span>what the guide suggests</span></div>` : "");

    const v = id => esc($(id).value.trim() || "______");
    $("w8-letter").innerHTML = `<p><strong>To:</strong> ${v("w8-whose")} · <strong>From:</strong> the NORTHSTAR data access committee (${v("w8-chair")})
      · <strong>Date:</strong> ${new Date().toLocaleDateString("en-GB")}</p>
      <p><strong>Decision:</strong> ${v("w8-decision")} · <strong>Score:</strong> ${total} / ${MAX_SCORE}</p>
      <p><strong>Reasons.</strong> ${v("w8-reasons").replace(/\n/g, "<br>")}</p>
      <p><strong>Conditions, or what would change the answer.</strong> ${v("w8-conditions").replace(/\n/g, "<br>")}</p>`;
  }
  document.addEventListener("input", update);
  document.addEventListener("change", update);
  document.addEventListener("DOMContentLoaded", () => setTimeout(update, 0));
})();
