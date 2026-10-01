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

// ── Instant cards (2026-09-30) ────────────────────────────────────────────
// A card draws its last answer from localStorage at once, then fetches and
// redraws when Google answers, so opening General never sits on "Loading".
// A failed fetch leaves the last numbers up rather than an error.
function _ldCached(action, url, body, render) {
  var key = 'ldCache:' + action, had = false;
  try { var old = JSON.parse(localStorage.getItem(key) || 'null'); if (old) { render(old); had = true; } } catch (e) {}
  fetch(url + '?action=' + action)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      render(d);
      if (d && d.success) { try { localStorage.setItem(key, JSON.stringify(d)); } catch (e) {} }
    })
    .catch(function () { if (!had) body.innerHTML = '<div class="empty-state">Could not load.</div>'; });
}

// ── Website Rates card ────────────────────────────────────────────────────
// The website's price list, card-sized (2026-09-30; replaced the Rates tab).
// Reads getWebsiteRates (RPM_Rates.gs), so it cannot disagree with the sheet.
function initLoadRatesCard() {
  var url  = getScriptUrl();
  var body = document.getElementById('loadRatesBody');
  if (!body || !url) return;
  _ldCached('getWebsiteRates', url, body, function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state">' + inqEsc(d.message || d.error || 'Could not load') + '</div>'; return; }
      var rates = d.rates || [];
      if (!rates.length) { body.innerHTML = '<div class="empty-state">None</div>'; return; }
      // One "Since" line when every type shares the date; otherwise per row.
      var froms = rates.map(function (r) { return r.from || ''; });
      var oneDate = froms.every(function (f) { return f === froms[0]; });
      // Prices up top (Weekly + Biweekly amber caps, Trial grey caps); what the
      // website lists them as (monthly) under a rule.
      var price = function (r) {
        var cls = /weekly/i.test(r.type) ? ' lead' : ' sub caps';
        return '<div class="ld-row' + cls + '"><span class="ld-l">' + inqEsc(r.type) + '</span>' +
          '<span class="ld-v">' + (r.rate == null ? '—' : '$' + r.rate) +
          (!oneDate && r.from ? ' <span class="ld-vsub">' + inqEsc(r.from) + '</span>' : '') + '</span></div>';
      };
      var listed = rates.filter(function (r) { return r.monthly; });
      body.innerHTML = rates.map(price).join('') +
        (listed.length ? '<hr class="ld-rule"><div class="ld-sublabel">Listed as</div>' +
          listed.map(function (r) {
            return '<div class="ld-row sub"><span class="ld-l">' + inqEsc(r.type) + '</span>' +
              '<span class="ld-v">' + inqEsc(r.monthly) + ' / month</span></div>';
          }).join('') : '') +
        (oneDate && froms[0] ? '<div class="ld-note">Last raise: ' + inqEsc(froms[0]) + '</div>' : '') +
        // A half-filled block in the archive (a raise typed in but not finished)
        // gets shouted, as the old Rates tab did.
        ((d.problems || []).length ? '<div class="ld-problems">Unfinished in the archive' +
          d.problems.map(function (p) { return '<div>' + inqEsc(p) + '</div>'; }).join('') + '</div>' : '');
  });
}

// ── Since 2026 card ───────────────────────────────────────────────────────
// Did the raise change how many applicants become students? (2026-09-30)
// getRaiseStats splits this year's inquiries at every Weekly rate change in the
// Website Rates Archive. Offered trial = trial finished (Outcome Successful or
// Unsuccessful); students = Successful. Matched to inquiries by email.
function initLoadYearCard() {
  var url  = getScriptUrl();
  var body = document.getElementById('loadYearBody');
  if (!body || !url) return;
  _ldCached('getRaiseStats', url, body, function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state">' + inqEsc(d.message || 'Could not load') + '</div>'; return; }
      body.innerHTML = (d.periods || []).map(function (p, k) {
        // The archive starts at the Aug 25 2026 raise; the price before it was
        // $95 but is deliberately NOT in the archive (adding it would reprice
        // income history), so it is named here, for the card's first period only.
        var rate = p.rate != null ? p.rate : (k === 0 ? 95 : null);
        // Rate only, no dates: the rate already says which period it is.
        var head = rate != null ? 'Rate: $' + rate : (p.to ? p.from + ' – ' + p.to : 'Since ' + p.from);
        var pct = p.inquiries ? Math.round(p.students / p.inquiries * 100) + '%' : '';
        return (k ? '<hr class="ld-rule">' : '') +
          '<div class="ld-sublabel">' + inqEsc(head) + '</div>' +
          '<div class="ld-row sub caps"><span class="ld-l">Inquiries</span><span class="ld-v">' + p.inquiries + '</span></div>' +
          '<div class="ld-row sub caps"><span class="ld-l">Offered trial</span><span class="ld-v">' + (p.trials != null ? p.trials : '—') + '</span></div>' +
          '<div class="ld-row lead"><span class="ld-l">Became students</span><span class="ld-v">' +
            (pct ? '<span class="ld-vsub">' + pct + '</span>' : '') + p.students + '</span></div>';
      }).join('');
  });
}
