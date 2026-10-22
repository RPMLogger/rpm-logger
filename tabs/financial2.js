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

function _f2Chip(label, value, color) {
  return '<div class="f2-chip">' +
    '<div class="f2-chip-val"' + (color ? ' style="color:' + color + '"' : '') + '>' + value + '</div>' +
    '<div class="f2-chip-lbl">' + label + '</div>' +
  '</div>';
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
    ? '<div class="f2-status">Accountant last run ' + _f2Esc(st.lastRun || '—') + ' · ' +
        (st.result === 'OK' ? '<span style="color:var(--green)">OK</span>'
                            : '<span style="color:var(--accent)">' + _f2Esc(st.result || '?') + '</span>' +
                              (st.message ? ' — ' + _f2Esc(st.message) : '')) +
      '</div>'
    : '';

  // Current total: one row — season income so far (lessons + gigs) and how many weeks that covers.
  var weeksSoFar = 0;
  blocks.forEach(function (b) { b.weeks.forEach(function (w) { if (d.curWeek >= 0 && w.idx <= d.curWeek) weeksSoFar++; }); });
  var season =
    '<div class="f2-wrap" style="margin-top:34px"><table class="f2-table">' +
      '<tr class="f2-row f2-cur"><td class="f2-curlbl">Current total</td>' +
        '<td class="f2-net">' + _f2Money(lessons + gigs) + '</td>' +
        '<td>' + weeksSoFar + ' weeks</td></tr>' +
    '</table></div>';

  // Income grid — same columns as the sheet; H..L span their 4-week block.
  // Two header rows: "Income" spans Lessons/Gigs/Weekly/Monthly; widths live on the <col>s.
  var head =
    '<colgroup><col class="f2-nar"><col class="f2-eq"><col><col class="f2-eq"><col class="f2-eq"><col class="f2-eq">' +
    '<col class="f2-eq2"><col class="f2-eq2"><col class="f2-avs"><col class="f2-eq2"><col class="f2-eq2"></colgroup>' +
    '<tr><th rowspan="2" title="Month">Mo.</th><th rowspan="2">Week</th><th rowspan="2" title="Students">St.</th><th colspan="4">Income</th><th class="f2-blk" title="Expense">Exp.</th><th rowspan="2" class="f2-blk f2-sep" title="Avg students">Av. St.</th>' +
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
      if (w.idx === d.curWeek) cls.push('f2-now');
      body += '<tr class="' + cls.join(' ') + '">' +
        (wi === 0 ? '<td rowspan="4" class="f2-month">' + b.n + '</td>' : '') +
        '<td class="f2-week">' + _f2Esc(w.date) + '</td>' +
        '<td class="f2-hi">' + _f2Cell(w.students, _f2Num, wFuture) + '</td>' +
        '<td class="f2-muted">' + _f2Cell(w.lessons, _f2Money, wFuture) + '</td>' +
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
    '<div class="section-label" style="margin-bottom:10px">Income</div>' +
    '<div class="f2-wrap"><table class="f2-table">' + head + body + '</table></div>' +
    // Under the table: Accountant note on the left, Show more on the right.
    '<div class="f2-foot">' + status +
    (curBlock >= 0 && blocks.length > curBlock + 2
      ? '<button class="link-btn" onclick="_f2ToggleLater(this)">Show more</button>' : '') +
    '</div>' +
    season;

  // Expenses — app, who, card, price, renewal. Login columns are never sent.
  var ex = d.expenses || [];
  var exRows = ex.map(function (e) {
    return '<tr class="f2-row">' +
      '<td class="f2-app">' + _f2Esc(e.app) + '<span>' + _f2Esc(e.vendor) + '</span></td>' +
      '<td>' + _f2Esc(e.on) + '</td>' +
      '<td>' + _f2Money(e.yearly) + '</td>' +
      '<td>' + _f2Money(e.monthly) + '</td>' +
      '<td>' + _f2Esc(e.length) + '</td>' +
      '<td>' + _f2Esc(e.renewal) + '</td>' +
    '</tr>';
  }).join('');
  var expenses =
    '<div class="section-label" style="margin:36px 0 10px">Expenses</div>' +
    '<div class="f2-chips" style="margin-bottom:12px">' +
      _f2Chip('Monthly average', _f2Money(d.totalMonthly) || '—') +
      _f2Chip('Per 4 weeks', _f2Money(d.perFourWeeks) || '—') +
      _f2Chip('Subscriptions', String(ex.length)) +
    '</div>' +
    '<div class="f2-wrap"><table class="f2-table f2-ex">' +
      '<tr><th>Application</th><th>Paid on</th><th>Yearly</th><th>Monthly</th><th>Length</th><th>Renewal</th></tr>' +
      exRows +
    '</table></div>';

  return income + expenses;
}
