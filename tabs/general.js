// ─── TABS / GENERAL.JS ───────────────────────────────────────────────────────
// Load tab (id "general"): student load stats + income estimator.

// Student List table removed 2026-09-16. Kept as a no-op so an older cached
// core/api.js that still calls it does not throw.
function renderStudentList() {}

// ── Estimator ─────────────────────────────────────────────────────────────
var estState = { students: 14, rate: 95 };

function estCalc() {
  var total = Math.round(estState.students * estState.rate * 4);
  var greg  = Math.round(total * (52 / 48));
  var sLabel = estState.students % 1 === 0 ? String(estState.students) : estState.students.toFixed(1);
  _estPick('estPickStudents', 'students', 0.5, sLabel);
  _estPick('estPickRate', 'rate', 5, '$' + estState.rate);
  document.getElementById('est-total').textContent        = '$' + total.toLocaleString();
  document.getElementById('est-greg').textContent         = '$' + greg.toLocaleString();
}

// One value between − and + in a single grey box (2026-09-30).
function _estPick(id, field, step, label) {
  var box = document.getElementById(id);
  if (!box) return;
  var btn = function(dir) {
    return '<button type="button" class="ld-pb" tabindex="-1" ' +
      'onclick="estStep(\'' + field + '\',' + (dir * step) + ')">' + (dir < 0 ? '−' : '+') + '</button>';
  };
  box.innerHTML = btn(-1) + '<span class="ld-pv">' + label + '</span>' + btn(1);
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
