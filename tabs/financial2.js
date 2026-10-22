// ─── TABS / FINANCIAL2.JS ────────────────────────────────────────────────────
// Financial 2: the RPM Accountant sheet (Income + Expenses tabs) drawn in the
// portal's look, like the Calendar tab does for Google Calendar. READ ONLY —
// the Accountant's 6am run is the only thing that writes income.
// Backend: getFinanceSheet (RPM_FinanceView.gs). Lazy: loads when opened.

function initFinancial2Tab() {
  var url = getScriptUrl();
  var body = document.getElementById('fin2Body');
  if (!body) return;
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + '?action=getFinanceSheet')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) { body.innerHTML = '<div class="empty-state">⚠ ' + _f2Esc((d && d.message) || 'Failed') + '</div>'; return; }
      body.innerHTML = _f2Render(d);
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not load.</div>'; });
}

function _f2Esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// $1,234 / -$48; blank stays blank (an unrecorded week is not $0).
function _f2Money(n) {
  if (n == null) return '';
  var s = '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  return n < 0 ? '-' + s : s;
}
function _f2Num(n) { return n == null ? '' : String(Math.round(n)); }
// Income table cells: past/current 0 or blank = a dim 0; future = empty.
function _f2Cell(n, fmt, future) {
  if (future) return '';
  return n == null || Math.round(n) === 0 ? '<span class="f2-dash">0</span>' : fmt(n);
}

// Income shows this month + one empty month; Show more reveals the rest of the season.
function _f2ToggleLater(btn) {
  var t = document.querySelector('#fin2Body .f2-table');
  var open = t.classList.toggle('f2-all');
  btn.textContent = open ? 'Show less' : 'Show more';
}

function _f2Render(d) {
  var blocks = d.blocks || [];
  var curBlock = d.curWeek >= 0 ? Math.floor(d.curWeek / 4) : -1;

  // Season so far: blocks that have any recorded week.
  var lessons = 0, gigs = 0, net = 0;
  blocks.forEach(function (b) {
    b.weeks.forEach(function (w) { lessons += w.lessons || 0; gigs += w.gigs || 0; });
    if (b.net != null) net += b.net;
  });

  var st = d.status;
  var status = st
    ? '<div class="f2-status">Accountant last run ' + _f2Esc(st.lastRun || '—') +
        // OK says nothing; anything else shows in red with its message (user 2026-10-22)
        (st.result === 'OK' ? ''
                            : ' · <span style="color:var(--accent)">' + _f2Esc(st.result || '?') + '</span>' +
                              (st.message ? ' — ' + _f2Esc(st.message) : '')) +
      '</div>'
    : '';

  // Current total: one row — season income so far (lessons + gigs) and how many weeks that covers.
  var weeksSoFar = 0;
  blocks.forEach(function (b) { b.weeks.forEach(function (w) { if (d.curWeek >= 0 && w.idx <= d.curWeek) weeksSoFar++; }); });
  var season =
    '<div class="f2-head" style="margin-top:34px">Current total</div>' +   // no divider above it (user 2026-10-22)   // divider + heading like Income (user 2026-10-22)
    '<div class="f2-cur"><span class="f2-hi">' + _f2Money(lessons + gigs) + '</span> · ' + weeksSoFar + ' weeks</div>' +   // plain text, not a table (user 2026-10-22)
    '<hr class="divider f2-rule" style="margin-top:28px">';

  // Income grid — same columns as the sheet; H..L span their 4-week block.
  // Two header rows: "Income" spans Lessons/Gigs/Weekly/Monthly; widths live on the <col>s.
  var head =
    '<colgroup><col class="f2-nar"><col class="f2-eq"><col class="f2-avs"><col class="f2-eq"><col class="f2-eq"><col class="f2-eq">' +
    '<col class="f2-eq2"><col class="f2-eq2"><col class="f2-avs"><col class="f2-eq2"><col class="f2-eq2"></colgroup>' +
    '<tr><th rowspan="2" title="Month">Mo.</th><th rowspan="2">Week</th><th rowspan="2" title="Students">St.</th><th colspan="4">Income</th><th class="f2-blk" title="Expense">Exp.</th><th rowspan="2" class="f2-blk f2-sep" title="Avg students">Av.<br>St.</th>' +
    '<th colspan="2" class="f2-blk">Income</th></tr>' +
    '<tr class="f2-sub"><th title="Lessons">Les.</th><th title="Gigs">Gig.</th><th title="Weekly total">We. Tot.</th><th title="Monthly total">Mo. Tot.</th><th class="f2-blk" title="Average per 4 weeks">Ave.</th><th class="f2-blk">Net</th><th class="f2-blk" title="Gregorian income">Gre. Inc.</th></tr>';
  var body = '';
  blocks.forEach(function (b, bi) {
    var future = curBlock >= 0 && bi > curBlock;
    b.weeks.forEach(function (w, wi) {
      var wFuture = d.curWeek >= 0 && w.idx > d.curWeek;
      var cls = ['f2-row'];
      if (wi === 0) cls.push('f2-first');
      if (future) cls.push('f2-future');
      if (curBlock >= 0 && bi > curBlock + 1) cls.push('f2-later');
      if (w.weekly === 0) cls.push('f2-zero');
      body += '<tr class="' + cls.join(' ') + '">' +
        (wi === 0 ? '<td rowspan="4" class="f2-month">' + b.n + '</td>' : '') +
        '<td class="f2-week">' + _f2Esc(w.date) + '</td>' +
        '<td class="f2-hi">' + _f2Cell(w.students, _f2Num, wFuture) + '</td>' +
        '<td>' + _f2Cell(w.lessons, _f2Money, wFuture) + '</td>' +
        '<td>' + _f2Cell(w.gigs, _f2Money, wFuture) + '</td>' +
        '<td>' + _f2Cell(w.weekly, _f2Money, wFuture) + '</td>' +
        (wi === 0
          ? '<td rowspan="4" class="f2-mid f2-tot">' + _f2Cell(b.monthly, _f2Money, future) + '</td>' +
            '<td rowspan="4" class="f2-blk f2-tot">' + _f2Cell(b.expense, _f2Money, future) + '</td>' +
            '<td rowspan="4" class="f2-blk f2-hi f2-sep">' + _f2Cell(b.avgStudents, _f2Num, future) + '</td>' +
            '<td rowspan="4" class="f2-blk f2-net">' + _f2Cell(b.net, _f2Money, future) + '</td>' +
            '<td rowspan="4" class="f2-blk">' + _f2Cell(b.gregorian, _f2Money, future) + '</td>'
          : '') +
      '</tr>';
    });
  });
  var income =
    '<div class="f2-icon">' + COST_ICON.replace(/class="[^"]*"/, 'class="win-icon"') + '</div>' +   // om-98 calculator + coin under the title (user 2026-10-22)
    '<hr class="divider f2-rule">' +
    '<div class="f2-head">Income</div>' +   // the title's gray half, Bebas (user 2026-10-22; was a section-label)
    '<div class="f2-wrap"><table class="f2-table f2-inc">' + head + body + '</table></div>' +
    // Under the table: Accountant note on the left, Show more on the right.
    '<div class="f2-foot">' + status +   // Accountant line back under the table, Show more right (user 2026-10-22)
    (curBlock >= 0 && blocks.length > curBlock + 2
      ? '<button class="link-btn" onclick="_f2ToggleLater(this)">Show more</button>' : '') +
    '</div>' +
    season;

  // Expenses — app, who, card, price, renewal. Login columns are never sent.
  var ex = d.expenses || [];
  _f2Ex = ex;
  var exRows = ex.map(function (e, i) {
    return '<tr class="f2-row f2-click" onclick="_f2OpenExpense(' + i + ')">' +   // click → Edit window
      '<td class="f2-app">' + _f2Esc(e.app) + '<span>' + _f2Esc(e.vendor) + '</span></td>' +
      '<td>' + _f2Esc(e.on) + '</td>' +
      '<td>' + _f2Money(e.yearly) + '</td>' +
      '<td>' + _f2Money(e.monthly) + '</td>' +
      '<td>' + _f2Esc(e.length) + '</td>' +
      '<td>' + _f2Esc(e.renewal) + '</td>' +
    '</tr>';
  }).join('');
  var expenses =
    '<div class="f2-head">Expenses</div>' +   // like Income / Current total (user 2026-10-22)
    '<div class="f2-icon">' + MONEY_OUT_ICON + '</div>' +   // om-105 under the heading (user 2026-10-22)
    '<div class="f2-wrap"><table class="f2-table f2-ex">' +
      '<tr><th>Application</th><th>Paid on</th><th>Yearly</th><th>Monthly</th><th>Length</th><th>Renewal</th></tr>' +
      exRows +
    '</table></div>' +
    // The asterisk's footnote, as far under this table as the Accountant line is under Income (user 2026-10-22)
    // The asterisk's footnote left, + Add expense right — like the Accountant line + Show more under Income
    '<div class="f2-foot"><div class="f2-status">* Normalized: for 4 week length months</div>' +
      '<button class="link-btn" onclick="_f2OpenExpense(-1)">+ Add expense</button></div>' +
    // Average expenses: the old three boxes as one line of text, like Current total (user 2026-10-22)
    '<div class="f2-head" style="margin-top:34px">Average expenses</div>' +
    '<div class="f2-cur"><span class="f2-hi">' + (_f2Money(d.totalMonthly) || '—') + '</span> monthly · ' +
      '<span class="f2-hi">' + (_f2Money(d.perFourWeeks) || '—') + '</span> normalized<sup>*</sup> · ' +
      '<span class="f2-hi">' + ex.length + '</span> subscriptions</div>';

  return income + expenses;
}

// ── Expenses window: add / edit / remove one row (user, 2026-10-22) ─────────
// Writes the Accountant's Expenses tab D..J through saveExpense / removeExpense
// (RPM_FinanceEdit.gs). The login columns K/L are never touched.
var _f2Ex = [];
var _f2ExIdx = -1;

function _f2CloseExpense() {
  var ov = document.getElementById('f2ExOverlay');
  if (ov) ov.classList.remove('open');
}

function _f2OpenExpense(i) {
  var e = i >= 0 ? _f2Ex[i] : null;
  if (i >= 0 && !e) return;
  _f2ExIdx = i;
  var ov = document.getElementById('f2ExOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'settings-overlay';
    ov.id = 'f2ExOverlay';
    ov.innerHTML = '<div class="settings-modal" id="f2ExModal"></div>';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) _f2CloseExpense(); });
    document.body.appendChild(ov);
  }
  var f = function (id, label, val, ph) {
    return '<label class="settings-label" for="' + id + '">' + label + '</label>' +
      '<input class="settings-input" id="' + id + '" type="text" autocomplete="off" value="' + _f2Esc(val) + '"' +
        (ph ? ' placeholder="' + _f2Esc(ph) + '"' : '') + '>';
  };
  document.getElementById('f2ExModal').innerHTML =
    '<div class="settings-title"><span>Expenses<span class="win-sub"> · ' + (e ? 'Edit' : 'Add') + '</span></span>' +
      '<button class="settings-close" onclick="_f2CloseExpense()">✕</button></div>' +
    f('f2ExApp', 'Application', e ? e.app : '', 'Zoom') +
    f('f2ExVendor', 'Company', e ? e.vendor : '', 'Zoom Communications Inc.') +
    f('f2ExOn', 'Paid on', e ? e.on : '', 'PayPal') +
    f('f2ExYearly', 'Yearly $', e && e.yearly != null ? String(e.yearly) : '', '179') +
    f('f2ExLength', 'Length', e ? e.length : '', '1 Year') +
    f('f2ExRenewal', 'Renewal', e ? e.renewal : '', 'June 9, 2027') +
    '<div class="win-note">Monthly is worked out from Yearly.</div>' +
    '<div class="f2-ex-btns">' +
      (e ? '<button class="link-btn" onclick="_f2RemoveExpense(this)">Remove</button>' : '<span></span>') +
      '<button class="link-btn" onclick="_f2SaveExpense(this)">Save</button>' +
    '</div>' +
    '<div id="f2ExStatus"></div>';
  ov.classList.add('open');
  document.getElementById('f2ExApp').focus();
}

function _f2SaveExpense(btn) {
  var e = _f2ExIdx >= 0 ? _f2Ex[_f2ExIdx] : null;
  var v = function (id) { return (document.getElementById(id).value || '').trim(); };
  var st = document.getElementById('f2ExStatus');
  if (!v('f2ExApp')) { rpmFail(st, 'Application is required.'); return; }
  if (!isFinite(parseFloat(v('f2ExYearly').replace(/[$,]/g, '')))) { rpmFail(st, 'Yearly must be a number.'); return; }
  if (e && !e.row) { rpmFail(st, 'This row has no sheet row number yet. Reload the tab.'); return; }
  var q = '&row=' + encodeURIComponent(e ? (e.row || '') : '') + '&was=' + encodeURIComponent(e ? e.app : '') +
    '&app=' + encodeURIComponent(v('f2ExApp')) + '&vendor=' + encodeURIComponent(v('f2ExVendor')) +
    '&on=' + encodeURIComponent(v('f2ExOn')) + '&yearly=' + encodeURIComponent(v('f2ExYearly')) +
    '&length=' + encodeURIComponent(v('f2ExLength')) + '&renewal=' + encodeURIComponent(v('f2ExRenewal'));
  _f2ExCall('saveExpense', q, btn);
}

function _f2RemoveExpense(btn) {
  var e = _f2Ex[_f2ExIdx];
  if (!e) return;
  if (!e.row) { rpmFail(document.getElementById('f2ExStatus'), 'This row has no sheet row number yet. Reload the tab.'); return; }
  rpmConfirm({
    title: 'Remove ' + e.app + '?',
    message: 'Clears this row in the Expenses sheet. A saved login in the sheet stays.',
    confirmLabel: 'Remove', danger: true
  }).then(function (ok) {
    if (!ok) return;
    _f2ExCall('removeExpense', '&row=' + encodeURIComponent(e.row || '') + '&was=' + encodeURIComponent(e.app), btn);
  });
}

// Success says nothing: the window closes and the tab reloads with the new numbers.
function _f2ExCall(action, q, btn) {
  var modal = document.getElementById('f2ExModal'), st = document.getElementById('f2ExStatus');
  st.innerHTML = '';
  rpmBusy(modal, btn, true);
  fetch(getScriptUrl() + '?action=' + action + q)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      rpmBusy(modal, btn, false);
      if (!d || !d.success) { rpmFail(st, (d && d.message) || 'No answer'); return; }
      _f2CloseExpense();
      initFinancial2Tab();
    })
    .catch(function (err) { rpmBusy(modal, btn, false); rpmFail(st, err.message); });
}
