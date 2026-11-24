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
  // the title box: screws + the calculator icon (three boxes, user 2026-11-15)
  var top = document.getElementById('fin2Top');
  if (top && !top.querySelector(':scope > .td-bolt')) top.insertAdjacentHTML('afterbegin', TD_BOLTS);
  var ic = document.getElementById('fin2Icon');
  if (ic && !ic.innerHTML) ic.innerHTML = MONEY_OUT_ICON;   // the coin + arrow under the title; the boxes below carry no icons (user 2026-11-23; was the om-98 calculator)
  if (top && !document.getElementById('fin2TopInfo')) top.insertAdjacentHTML('beforeend', '<div id="fin2TopInfo"></div>');   // Accountant line, last run, sheet links, the two totals (user, 2026-11-23)
  body.innerHTML = '<div class="td-wk-box f2-box"><div class="empty-state rpm-loading">Loading</div></div>';
  fetch(url + '?action=getFinanceSheet')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) { body.innerHTML = '<div class="td-wk-box f2-box"><div class="empty-state">⚠ ' + _f2Esc((d && d.message) || 'Failed') + '</div></div>'; return; }
      body.innerHTML = _f2Render(d);
      var ti = document.getElementById('fin2TopInfo');
      if (ti) ti.innerHTML = _f2TopInfo;
    })
    .catch(function () { body.innerHTML = '<div class="td-wk-box f2-box"><div class="empty-state">❌ Could not load.</div></div>'; });
}

var _f2TopInfo = '';
var F2_ACC_SHEET = 'https://docs.google.com/spreadsheets/d/1pHKWO9j2DrVWrGRYT3bEdvXKHkEIqQZq-Gib27bC_CA/edit?gid=';
function _f2SheetLink(label, gid, tab) {
  return '<a class="link-btn" target="_blank" rel="noopener" href="' + F2_ACC_SHEET + gid + '#gid=' + gid + '" ' +
    'data-tip="Opens elsewhere.\nThe Accountant sheet&#39;s ' + tab + ' tab." data-tip-left><span>' + label + '</span><span data-icon="out">' + OPEN_OUT_ICON + '</span></a>';
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
// The sheet's Renewal / Length are typed by hand in mixed styles; the table shows them one way
// ("Jun 9, 2027", "1 year") and leaves the sheet alone (user, 2026-11-23). Not a date ("Monthly (20th)") → as typed.
function _f2Date(s) {
  s = String(s == null ? '' : s).trim();
  if (!/\d{4}/.test(s)) return s;
  var d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function _f2Length(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
// Income table cells: 0, blank and future all = a dim dash, the table's default (user, 2026-11-23; was a dim 0, future empty).
function _f2Cell(n, fmt, future) {
  return future || n == null || Math.round(n) === 0 ? '<span class="f2-dash">–</span>' : fmt(n);
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
  // The Accountant's last run as a Dashboard row (user, 2026-11-24; was a blue badge); red when the run didn't go through.
  var runBad = st && st.result !== 'OK';
  var status = st
    ? '<div class="ld-row' + (runBad ? ' f2-run-bad' : '') + '"><span class="ld-l">Last run</span><span class="ld-v">' + _f2Esc(st.lastRun || '—') +
        (runBad ? ' · ' + _f2Esc(st.result || '?') + (st.message ? ' — ' + _f2Esc(st.message) : '') : '') + '</span></div>'
    : '<div class="ld-row"><span class="ld-l">Last run</span><span class="ld-v">—</span></div>';

  // Current total: one row — season income so far (lessons + gigs) and how many weeks that covers.
  var weeksSoFar = 0, expSoFar = 0;
  // A month's expense counts once its weeks have income, like the table (user, 2026-11-23). Weeks count through the
  // current one: the Accountant writes it from day 1 with every booked lesson (user, 2026-11-24; briefly finished weeks only).
  blocks.forEach(function (b, bi) { if (curBlock >= 0 && bi <= curBlock && b.monthly && b.expense != null) expSoFar += b.expense; });
  blocks.forEach(function (b) { b.weeks.forEach(function (w) { if (d.curWeek >= 0 && w.idx <= d.curWeek) weeksSoFar++; }); });
  // The title box in the Reviews Dashboard look (user, 2026-11-24): a heading + note over a screwed card per group.
  // Sheet links stay top right. The Income table below is its own rack unit.
  _f2TopInfo =
    '<div class="f2-top-links"><span class="f2-sheet-links">' + _f2SheetLink('Income sheet', '671214587', 'Income') + _f2SheetLink('Expenses sheet', '0', 'Expenses') + '</span></div>' +
    // How it works above the Accountant heading, lined up with it (user, 2026-11-24)
    '<div class="f2-how-row"><button class="link-btn opens-window f2-how-btn" onclick="_f2HowWrites()" data-tip="Opens a window.\nHow the Accountant writes the sheet." data-tip-left>How it works</button></div>' +
    '<div class="rv-group"><div class="rv-yhead">Accountant<span class="rv-ysum">Fills the Income sheet every morning at 6am</span></div>' +
      // How the Accountant writes: behind a button, in a window (user, 2026-11-24; was rows in the card).
      '<div class="rv-card">' + status + '</div>' +
    '</div>' +
    '<div class="rv-group"><div class="rv-yhead">Current total<span class="rv-ysum">' + weeksSoFar + ' weeks recorded</span></div>' +
      '<div class="rv-card">' +
        '<div class="ld-row"><span class="ld-l">Income</span><span class="ld-v">' + _f2Money(lessons + gigs) + '</span></div>' +
        '<div class="ld-row"><span class="ld-l">Expense</span><span class="ld-v">' + _f2Money(expSoFar) + '</span></div>' +
      '</div></div>';

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
      if (curBlock >= 0 && bi === curBlock + 1 && wi === b.weeks.length - 1) cls.push('f2-cut');   // next month's last week = a half-height empty stub, the Calendar's end (user, 2026-11-23)
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
            '<td rowspan="4" class="f2-blk f2-tot">' + _f2Cell(b.expense, _f2Money, future || !b.monthly) + '</td>' +   // Exp. waits too (user, 2026-11-23)
            '<td rowspan="4" class="f2-blk f2-hi f2-sep">' + _f2Cell(b.avgStudents, _f2Num, future) + '</td>' +
            // Net / Gre. Inc. (and Exp. above) wait for the month's first recorded week: before that they're only minus the expense (user, 2026-11-23)
            '<td rowspan="4" class="f2-blk f2-net">' + _f2Cell(b.net, _f2Money, future || !b.monthly) + '</td>' +
            '<td rowspan="4" class="f2-blk">' + _f2Cell(b.gregorian, _f2Money, future || !b.monthly) + '</td>'
          : '') +
      '</tr>';
    });
  });
  // The Income table IS its rack unit, like the Calendar grid (user, 2026-11-23): no box around it, edge to edge.
  var income =
    '<div class="f2-wrap"><table class="f2-table f2-inc">' + head + body + '</table></div>' +
    (curBlock >= 0 && blocks.length > curBlock + 2
      ? '<div class="f2-foot"><button class="link-btn" onclick="_f2ToggleLater(this)">Show more</button></div>' : '');

  // Expenses — app, who, card, price, renewal. Login columns are never sent.
  var ex = d.expenses || [];
  _f2Ex = ex;
  var exRows = ex.map(function (e, i) {
    // click = select (highlight) for Edit / Remove under the table; double-click = Edit (user 2026-10-22)
    return '<tr class="f2-row f2-click" data-i="' + i + '" onclick="_f2ExSelect(this)" ondblclick="_f2OpenExpense(' + i + ')">' +
      '<td class="f2-app">' + _f2Esc(e.app) + '<span>' + _f2Esc(e.vendor) + '</span></td>' +
      '<td>' + _f2Esc(e.on) + '</td>' +
      '<td>' + _f2Money(e.yearly) + '</td>' +
      '<td>' + _f2Money(e.monthly) + '</td>' +
      '<td>' + _f2Esc(_f2Length(e.length)) + '</td>' +
      '<td>' + _f2Esc(_f2Date(e.renewal)) + '</td>' +
    '</tr>';
  }).join('');
  var expenses =
    // EXPENSES left; right, the receipts in Gmail — the "Subscriptions - RPM" label the user's filter fills (2026-10-22)
    '<div class="f2-head-row"><div class="f2-head f2-red">Expenses</div>' +
      '<a class="link-btn" href="https://mail.google.com/mail/u/0/#label/Subscriptions+-+RPM" target="_blank" rel="noopener" ' +
        'data-tip="Opens elsewhere.\nYour subscription receipts in Gmail." data-tip-left><span>Receipts in Gmail</span><span data-icon="out">' + OPEN_OUT_ICON + '</span></a></div>' +
    // how-to under the icon, as numbered steps like Travel Plan's (user 2026-10-22)
    '<div class="tv-sec-note tv-steps f2-howto"><span><i>1.</i>Press Add expense to add one</span>' +
      '<span><i>2.</i>Click a row, then Edit or Remove</span></div>' +
    // Average expenses in the Reviews Dashboard look (user, 2026-11-24; was one big line + a note): heading + note, a screwed card.
    '<div class="f2-dashboard"><div class="rv-group"><div class="rv-yhead">Average expenses<span class="rv-ysum">Normalized for 4-week months</span></div>' +
      '<div class="rv-card">' +
        '<div class="ld-row"><span class="ld-l">Monthly</span><span class="ld-v">' + (_f2Money(d.totalMonthly) || '—') + '</span></div>' +
        '<div class="ld-row"><span class="ld-l">Normalized</span><span class="ld-v">' + (_f2Money(d.perFourWeeks) || '—') + '</span></div>' +
        '<div class="ld-row"><span class="ld-l">Subscriptions</span><span class="ld-v">' + ex.length + '</span></div>' +
      '</div></div></div>';

  // The Expenses table as its own rack unit, like Income's (user, 2026-11-24): edge to edge, the buttons in its footer.
  var exTable =
    '<div class="f2-wrap"><table class="f2-table f2-ex">' +
      '<tr><th>Application</th><th>Paid on</th><th>Yearly</th><th>Monthly</th><th>Length</th><th>Renewal</th></tr>' +
      exRows +
    '</table></div>' +
    // The asterisk's footnote, as far under this table as the Accountant line is under Income (user 2026-10-22)
    // Edit / Remove / ＋ Add expense, right — like Show more under Income (plain ＋ like Log skip, user 2026-10-23)
    '<div class="f2-foot">' +
      '<span class="f2-ex-acts"><button class="link-btn opens-window" id="f2ExEditPicked" disabled onclick="_f2EditPicked()" data-tip="Opens a window.\nEdits the picked row." data-tip-left>Edit</button>' +
      '<button class="link-btn opens-window f2-del" id="f2ExRemovePicked" disabled onclick="_f2RemovePicked()" data-tip="Asks first.\nClears the picked row in the Expenses sheet." data-tip-left>Remove</button>' +
      '<button class="link-btn opens-window" onclick="_f2OpenExpense(-1)" data-tip="Opens a window.\nNew expense." data-tip-left>＋ Add expense</button></span></div>';

  // three boxes (user, 2026-11-15): the title box is in index.html; Income and Expenses each get their own
  return '<div class="td-wk-box f2-box f2-inc-unit">' + TD_BOLTS + income + '</div>' +   // screws like the other units (user, 2026-11-24)
         '<div class="td-wk-box f2-box">' + TD_BOLTS + expenses + '</div>' +
         '<div class="td-wk-box f2-box f2-ex-unit">' + TD_BOLTS + exTable + '</div>';
}

// How the Accountant writes the Income sheet — a reminder window (user, 2026-11-24).
// Source: RPM Accountant.js (ACC_LIVE_WEEKS = 3, the expense snapshot, the missing-rate stop). Change the code → change this.
function _f2HowWrites() {
  var rows = [
    ['This week', 'Every booked lesson, from day 1'],
    ['2 weeks before', 'Redone each morning, so moves and skips fix themselves'],
    ['Older weeks', 'Frozen. Fix by hand in the sheet'],
    ['Expense', 'This month only, then frozen'],
    ['Missing rate', 'Run stops, nothing written']
  ];
  rpmAlert({
    title: 'How it works',
    className: 'f2-how-dlg',   // wide, the rules in the Dashboard card (user, 2026-11-24: the narrow first try looked terrible)
    html: '<div class="rv-card">' + rows.map(function (r) {
      return '<div class="ld-row"><span class="ld-l">' + r[0] + '</span><span class="ld-v">' + r[1] + '</span></div>';
    }).join('') + '</div>',
    confirmLabel: 'Close'
  });
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
  // Monthly-billed when the sheet's Length says month (e.g. "1 Month"); else yearly.
  var monthlyBill = !!(e && /month/i.test(e.length || ''));
  var price = e ? (monthlyBill ? e.monthly : e.yearly) : null;
  price = price != null ? String(price) : '';
  // one field = label above its box; fields sit side by side in rows, so the boxes are only as long as they need (user, 2026-11-23)
  var f = function (id, label, val, ph) {
    return '<div class="f2-fld"><label class="settings-label" for="' + id + '">' + label + '</label>' +
      '<input class="settings-input" id="' + id + '" type="text" autocomplete="off" value="' + _f2Esc(val) + '"' +
        (ph ? ' placeholder="' + _f2Esc(ph) + '"' : '') + '></div>';
  };
  document.getElementById('f2ExModal').innerHTML =
    '<div class="settings-title"><span>Expenses<span class="win-sub"> · ' + (e ? 'Edit' : 'Add') + '</span></span>' +
      '<button class="settings-close" onclick="_f2CloseExpense()">✕</button></div>' +
    '<div class="f2-ex-grid">' +
      '<div class="f2-ex-row f2-r2">' +
        f('f2ExApp', 'Application', e ? e.app : '', 'Zoom') +
        f('f2ExVendor', 'Company', e ? e.vendor : '', 'Zoom Communications Inc.') +
      '</div>' +
      '<div class="f2-ex-row f2-r2">' +
        f('f2ExOn', 'Paid on', e ? e.on : '', 'PayPal') +
        // Billed monthly or yearly (user 2026-10-22): one price box, the other is worked out.
        // Radio circles (user 2026-10-22): grey ring, white when picked
        '<div class="f2-fld"><label class="settings-label">Billed</label>' +
        '<div class="f2-bill">' +
          '<label class="f2-radio"><input type="radio" name="f2Bill" value="m"' + (monthlyBill ? ' checked' : '') + ' onchange="_f2PickBill(this)">Monthly</label>' +
          '<label class="f2-radio"><input type="radio" name="f2Bill" value="y"' + (monthlyBill ? '' : ' checked') + ' onchange="_f2PickBill(this)">Yearly</label>' +
        '</div></div>' +
      '</div>' +
      '<div class="f2-ex-row f2-r2">' +   // Price · Renewal, Length on its own line under (user, 2026-11-23)
        f('f2ExPrice', 'Price $', price, monthlyBill ? '10' : '179') +
        f('f2ExRenewal', 'Renewal', e ? _f2Date(e.renewal) : '', 'Jun 9, 2027') +
      '</div>' +
      '<div class="f2-ex-row f2-r2">' +
        f('f2ExLength', 'Length', e ? _f2Length(e.length) : '', '1 year') +
      '</div>' +
    '</div>' +
    '<div class="f2-ex-btns">' +
      (e ? '<button class="link-btn opens-window f2-del" onclick="_f2RemoveExpense(this)" data-tip="Asks first.\nClears this row in the Expenses sheet.">Remove</button>' : '<span></span>') +
      '<button class="link-btn bright" onclick="_f2SaveExpense(this)">Save</button>' +
    '</div>' +
    '<div id="f2ExStatus"></div>';
  ov.classList.add('open');
  document.getElementById('f2ExApp').focus();
}

function _f2PickBill(r) {
  var m = r.value === 'm';
  document.getElementById('f2ExPrice').placeholder = m ? '10' : '179';
}

function _f2SaveExpense(btn) {
  var e = _f2ExIdx >= 0 ? _f2Ex[_f2ExIdx] : null;
  var v = function (id) { return (document.getElementById(id).value || '').trim(); };
  var st = document.getElementById('f2ExStatus');
  if (!v('f2ExApp')) { rpmFail(st, 'Application is required.'); return; }
  var price = parseFloat(v('f2ExPrice').replace(/[$,]/g, ''));
  if (!isFinite(price)) { rpmFail(st, 'Price must be a number.'); return; }
  var monthlyBill = !!document.querySelector('#f2ExModal input[name="f2Bill"][value="m"]:checked');
  var yearly = monthlyBill ? Math.round(price * 12 * 100) / 100 : price;   // the sheet keeps Yearly; Monthly = Yearly / 12
  if (e && !e.row) { rpmFail(st, 'This row has no sheet row number yet. Reload the tab.'); return; }
  var q = '&row=' + encodeURIComponent(e ? (e.row || '') : '') + '&was=' + encodeURIComponent(e ? e.app : '') +
    '&app=' + encodeURIComponent(v('f2ExApp')) + '&vendor=' + encodeURIComponent(v('f2ExVendor')) +
    '&on=' + encodeURIComponent(v('f2ExOn')) + '&yearly=' + encodeURIComponent(yearly) +
    '&length=' + encodeURIComponent(v('f2ExLength')) + '&renewal=' + encodeURIComponent(v('f2ExRenewal'));
  _f2ExCall('saveExpense', q, btn, 'Saving');
}

function _f2RemoveExpense(btn) {
  var e = _f2Ex[_f2ExIdx];
  if (!e) return;
  if (!e.row) { rpmFail(document.getElementById('f2ExStatus'), 'This row has no sheet row number yet. Reload the tab.'); return; }
  rpmConfirm({
    title: 'Remove ' + e.app + '?',
    message: '• Takes ' + e.app + ' off your expenses.\n• Its login in the sheet is kept.',   // two bullets, plain words (user, 2026-11-23)
    confirmLabel: 'Remove', danger: true
  }).then(function (ok) {
    if (!ok) return;
    _f2ExCall('removeExpense', '&row=' + encodeURIComponent(e.row || '') + '&was=' + encodeURIComponent(e.app), btn, 'Removing');
  });
}

// One selected Expenses row at a time; a second click on it unselects.
function _f2ExSelect(tr) {
  var on = !tr.classList.contains('f2-sel');
  document.querySelectorAll('#fin2Body .f2-ex .f2-sel').forEach(function (x) { x.classList.remove('f2-sel'); });
  if (on) tr.classList.add('f2-sel');
  ['f2ExEditPicked', 'f2ExRemovePicked'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.disabled = !on;
  });
}

function _f2SelIdx() {
  var tr = document.querySelector('#fin2Body .f2-ex .f2-sel');
  return tr ? +tr.getAttribute('data-i') : -1;
}

function _f2EditPicked() {
  var i = _f2SelIdx();
  if (i >= 0) _f2OpenExpense(i);
}

// Remove the selected row straight from the table (user 2026-10-22).
function _f2RemovePicked() {
  var e = _f2Ex[_f2SelIdx()];
  if (!e) return;
  if (!e.row) { rpmToast('fail', 'Unsuccessful', 'This row has no sheet row number yet. Reload the tab.'); return; }
  rpmConfirm({
    title: 'Remove ' + e.app + '?',
    message: '• Takes ' + e.app + ' off your expenses.\n• Its login in the sheet is kept.',   // two bullets, plain words (user, 2026-11-23)
    confirmLabel: 'Remove', danger: true
  }).then(function (ok) {
    if (!ok) return;
    _f2ExCall('removeExpense', '&row=' + encodeURIComponent(e.row) + '&was=' + encodeURIComponent(e.app), null, 'Removing', true);
  });
}

// While Google works: the portal's one busy rule (rpmBusy, user 2026-11-23) — the window
// (or, from the table, the tab's boxes) hides its content behind SAVING / REMOVING with the
// rolling ring, and the rack screen shows it too. Success says nothing: the window closes
// and the tab reloads with the new numbers. Failure = the red "Unsuccessful" badge / toast.
function _f2ExCall(action, q, btn, word, onTab) {
  // onTab: the action came from the tab itself (Remove under the table), not the window —
  // the tab's boxes go busy instead, and a failure shows as a toast.
  var root = onTab ? document.getElementById('fin2Body') : document.getElementById('f2ExModal');
  var st = onTab ? null : document.getElementById('f2ExStatus');
  var fail = function (why) { if (st) rpmFail(st, why); else rpmToast('fail', 'Unsuccessful', why); };
  if (st) st.innerHTML = '';
  rpmBusy(root, btn, true, word);
  fetch(getScriptUrl() + '?action=' + action + q)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      rpmBusy(root, btn, false);
      if (!d || !d.success) { fail((d && d.message) || 'No answer'); return; }
      if (!onTab) _f2CloseExpense();
      initFinancial2Tab();
    })
    .catch(function (err) { rpmBusy(root, btn, false); fail(err.message); });
}
