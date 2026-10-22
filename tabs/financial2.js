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

function _f2Chip(label, value, color) {
  return '<div class="f2-chip">' +
    '<div class="f2-chip-val"' + (color ? ' style="color:' + color + '"' : '') + '>' + value + '</div>' +
    '<div class="f2-chip-lbl">' + label + '</div>' +
  '</div>';
}

function _f2Render(d) {
  var blocks = d.blocks || [];
  var curBlock = d.curWeek >= 0 ? Math.floor(d.curWeek / 4) : -1;
  var cb = blocks[curBlock] || null;

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

  var chips =
    '<div class="section-label" style="margin-bottom:10px">' + (cb ? 'Month ' + cb.n + ' (this 4 weeks)' : 'This 4 weeks') + '</div>' +
    '<div class="f2-chips">' +
      _f2Chip('Income', cb ? _f2Money(cb.monthly) || '$0' : '—') +
      _f2Chip('Expense', cb ? _f2Money(cb.expense) || '—' : '—', 'var(--muted)') +
      _f2Chip('Net', cb ? _f2Money(cb.net) || '$0' : '—', 'var(--green)') +
      _f2Chip('Gregorian', cb ? _f2Money(cb.gregorian) || '$0' : '—') +
      _f2Chip('Avg students', cb ? _f2Num(cb.avgStudents) || '0' : '—') +
    '</div>' +
    '<div class="section-label" style="margin:16px 0 10px">Season so far</div>' +
    '<div class="f2-chips">' +
      _f2Chip('Lessons', _f2Money(lessons)) +
      _f2Chip('Gigs', _f2Money(gigs)) +
      _f2Chip('Net', _f2Money(net), 'var(--green)') +
    '</div>';

  // Income grid — same columns as the sheet; H..L span their 4-week block.
  var head =
    '<tr><th>Month</th><th>Week</th><th>Students</th><th>Lessons</th><th>Gigs</th><th>Weekly</th>' +
    '<th class="f2-blk">Monthly</th><th class="f2-blk">Expense<br><span>/ 4 wks</span></th>' +
    '<th class="f2-blk">Net</th><th class="f2-blk">Gregorian</th><th class="f2-blk">Avg<br><span>students</span></th></tr>';
  var body = '';
  blocks.forEach(function (b, bi) {
    var future = curBlock >= 0 && bi > curBlock;
    b.weeks.forEach(function (w, wi) {
      var cls = ['f2-row'];
      if (wi === 0) cls.push('f2-first');
      if (future) cls.push('f2-future');
      if (w.idx === d.curWeek) cls.push('f2-now');
      body += '<tr class="' + cls.join(' ') + '">' +
        (wi === 0 ? '<td rowspan="4" class="f2-month">' + b.n + '</td>' : '') +
        '<td class="f2-week">' + _f2Esc(w.date) + (w.idx === d.curWeek ? ' <span class="f2-nowtag">now</span>' : '') + '</td>' +
        '<td>' + _f2Num(w.students) + '</td>' +
        '<td>' + _f2Money(w.lessons) + '</td>' +
        '<td>' + _f2Money(w.gigs) + '</td>' +
        '<td>' + _f2Money(w.weekly) + '</td>' +
        (wi === 0
          ? '<td rowspan="4" class="f2-blk">' + _f2Money(b.monthly) + '</td>' +
            '<td rowspan="4" class="f2-blk f2-muted">' + _f2Money(b.expense) + '</td>' +
            '<td rowspan="4" class="f2-blk f2-net">' + _f2Money(b.net) + '</td>' +
            '<td rowspan="4" class="f2-blk">' + _f2Money(b.gregorian) + '</td>' +
            '<td rowspan="4" class="f2-blk">' + _f2Num(b.avgStudents) + '</td>'
          : '') +
      '</tr>';
    });
  });
  var income =
    '<div class="section-label" style="margin:22px 0 10px">Income</div>' +
    '<div class="f2-wrap"><table class="f2-table">' + head + body + '</table></div>';

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
    '<div class="section-label" style="margin:22px 0 10px">Expenses</div>' +
    '<div class="f2-chips" style="margin-bottom:12px">' +
      _f2Chip('Monthly average', _f2Money(d.totalMonthly) || '—') +
      _f2Chip('Per 4 weeks', _f2Money(d.perFourWeeks) || '—') +
      _f2Chip('Subscriptions', String(ex.length)) +
    '</div>' +
    '<div class="f2-wrap"><table class="f2-table f2-ex">' +
      '<tr><th>Application</th><th>Paid on</th><th>Yearly</th><th>Monthly</th><th>Length</th><th>Renewal</th></tr>' +
      exRows +
    '</table></div>';

  return status + chips + income + expenses;
}
