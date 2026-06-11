// ─── TABS / GENERAL.JS ───────────────────────────────────────────────────────
// General tab: student load stats + student list table.

function renderStudentList(data) {
  var rows = document.getElementById("studentListRows");
  rows.innerHTML = "";
  var all = [];
  (data.weeklyList   || []).forEach(function(s) { all.push({ name: s.name || s, rate: s.rate || 95, ave: 1   }); });
  (data.biweeklyList || []).forEach(function(s) { all.push({ name: s.name || s, rate: s.rate || 95, ave: 0.5 }); });
  all.sort(function(a, b) { return a.name.localeCompare(b.name); });
  all.forEach(function(s) {
    var row = document.createElement("div");
    row.className = "load-row"; row.style.padding = "5px 14px";
    row.innerHTML =
      "<div class='load-label' style='flex:1;color:var(--text)'>" + s.name + "</div>" +
      "<div class='load-value' style='width:60px;text-align:center;font-size:10px;color:" +
        (s.ave === 1 ? "var(--accent)" : "var(--accent2)") + "'>" + s.ave + "</div>" +
      "<div class='load-value' style='width:60px;text-align:right;font-size:10px;color:var(--muted)'>$" + s.rate + "</div>";
    rows.appendChild(row);
  });
  document.getElementById("listNormTotal").textContent = data.normalized;
  document.getElementById("studentListTable").style.display = "block";
}

// ── Estimator ─────────────────────────────────────────────────────────────
var estState = { students: 14, rate: 95 };

function estCalc() {
  var total = Math.round(estState.students * estState.rate * 4);
  var greg  = Math.round(total * (52 / 48));
  var sLabel = estState.students % 1 === 0 ? String(estState.students) : estState.students.toFixed(1);
  document.getElementById('est-val-students').textContent = sLabel;
  document.getElementById('est-val-rate').textContent     = '$' + estState.rate;
  document.getElementById('est-total').textContent        = '$' + total.toLocaleString();
  document.getElementById('est-greg').textContent         = '$' + greg.toLocaleString();
}

function estStep(field, delta) {
  var min = field === 'students' ? 0.5 : 5;
  estState[field] = Math.max(min, estState[field] + delta);
  estCalc();
}

function estReset() {
  var normEl = document.getElementById('loadNorm');
  var incEl  = document.getElementById('loadIncome');
  var norm = parseFloat(normEl && normEl.textContent !== '—' ? normEl.textContent : '14') || 14;
  var inc  = parseFloat((incEl && incEl.textContent  !== '—' ? incEl.textContent  : '0').replace(/[$,]/g, '')) || 0;
  var derivedRate = (norm > 0 && inc > 0) ? Math.round(inc / (norm * 4) / 5) * 5 : 95;
  estState.students = norm;
  estState.rate     = derivedRate;
  estCalc();
}

estCalc();
