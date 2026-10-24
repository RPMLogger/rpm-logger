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
    // A blue badge like Payments' Venmo / Zelle tags; red when the run didn't go through (user 2026-10-22)
    ? '<div class="f2-lastrun"><span class="f2-badge' + (st.result === 'OK' ? '' : ' bad') + '">Last run ' + _f2Esc(st.lastRun || '—') +
        (st.result === 'OK' ? '' : ' · ' + _f2Esc(st.result || '?') + (st.message ? ' — ' + _f2Esc(st.message) : '')) +
      '</span></div>'
    : '';

  // Current total: one row — season income so far (lessons + gigs) and how many weeks that covers.
  var weeksSoFar = 0, expSoFar = 0;
  blocks.forEach(function (b, bi) { if (curBlock >= 0 && bi <= curBlock && b.expense != null) expSoFar += b.expense; });
  blocks.forEach(function (b) { b.weeks.forEach(function (w) { if (d.curWeek >= 0 && w.idx <= d.curWeek) weeksSoFar++; }); });
  var season =
    '<div class="f2-head" style="margin-top:48px">Current total income</div>' +   // no divider above it (user 2026-10-22)   // divider + heading like Income (user 2026-10-22)
    '<div class="f2-cur"><span class="f2-hi">' + _f2Money(lessons + gigs) + '</span> · ' + weeksSoFar + ' weeks</div>' +   // plain text, not a table (user 2026-10-22)
    '<hr class="divider f2-rule">';

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
    // INCOME left, the Accountant's last run right, above the table (user 2026-10-22)
    // INCOME left; the Accountant sheet's own Income + Expenses tabs on its line, right (user 2026-10-22)
    '<div class="f2-head-row"><div class="f2-head f2-red">Income</div><span class="f2-sheet-links">' +
      _f2SheetLink('Income sheet', '671214587', 'Income') + _f2SheetLink('Expenses sheet', '0', 'Expenses') + '</span></div>' +
    '<div class="tv-sec-note f2-note">Filled by the Accountant every morning at 6am</div>' +   // like Travel Plan's how-to lines (user 2026-10-22)
    status +   // its last run, right under that line (user 2026-10-22)   // the title's gray half, Bebas (user 2026-10-22; was a section-label)
    '<div class="f2-wrap"><table class="f2-table f2-inc">' + head + body + '</table></div>' +
    // Under the table: Accountant note on the left, Show more on the right.
    '<div class="f2-foot">' +   // Show more, right
    (curBlock >= 0 && blocks.length > curBlock + 2
      ? '<button class="link-btn" onclick="_f2ToggleLater(this)">Show more</button>' : '') +
    '</div>' +
    season;

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
      '<td>' + _f2Esc(e.length) + '</td>' +
      '<td>' + _f2Esc(e.renewal) + '</td>' +
    '</tr>';
  }).join('');
  var expenses =
    // EXPENSES left; right, the receipts in Gmail — the "Subscriptions - RPM" label the user's filter fills (2026-10-22)
    '<div class="f2-head-row"><div class="f2-head f2-red">Expenses</div>' +
      '<a class="link-btn" href="https://mail.google.com/mail/u/0/#label/Subscriptions+-+RPM" target="_blank" rel="noopener" ' +
        'data-tip="Opens elsewhere.\nYour subscription receipts in Gmail." data-tip-left><span>Receipts in Gmail</span><span data-icon="out">' + OPEN_OUT_ICON + '</span></a></div>' +
    '<div class="f2-icon">' + MONEY_OUT_ICON + '</div>' +   // om-105 under the heading (user 2026-10-22)
    // how-to under the icon, as numbered steps like Travel Plan's (user 2026-10-22)
    '<div class="tv-sec-note tv-steps f2-howto"><span><i>1.</i>Press Add expense to add one</span>' +
      '<span><i>2.</i>Click a row, then Edit or Remove</span></div>' +
    '<div class="f2-wrap"><table class="f2-table f2-ex">' +
      '<tr><th>Application</th><th>Paid on</th><th>Yearly</th><th>Monthly</th><th>Length</th><th>Renewal</th></tr>' +
      exRows +
    '</table></div>' +
    // The asterisk's footnote, as far under this table as the Accountant line is under Income (user 2026-10-22)
    // Edit / Remove / ＋ Add expense, right — like Show more under Income (plain ＋ like Log skip, user 2026-10-23)
    '<div class="f2-foot">' +
      '<span class="f2-ex-acts"><button class="link-btn" id="f2ExEditPicked" disabled onclick="_f2EditPicked()">Edit</button>' +
      '<button class="link-btn" id="f2ExRemovePicked" disabled onclick="_f2RemovePicked()">Remove</button>' +
      '<button class="link-btn" onclick="_f2OpenExpense(-1)">＋ Add expense</button></span></div>' +
    // Average expenses: the old three boxes as one line of text, like Current total (user 2026-10-22)
    '<div class="f2-head" style="margin-top:48px">Average expenses</div>' +
    '<div class="f2-cur"><span class="f2-hi">' + (_f2Money(d.totalMonthly) || '—') + '</span> monthly · ' +
      '<span class="f2-hi">' + (_f2Money(d.perFourWeeks) || '—') + '</span> normalized · ' +
      '<span class="f2-hi">' + ex.length + '</span> subscriptions</div>' +
    '<div class="f2-status" style="margin-top:10px">Normalized for 4 week length months</div>' +   // under Average expenses, no asterisk (user 2026-10-22)
    // Current total expense: the Exp. column summed over this season's months so far (user 2026-10-22)
    '<div class="f2-head" style="margin-top:48px">Current total expense</div>' +
    '<div class="f2-cur"><span class="f2-hi">' + _f2Money(expSoFar) + '</span> · ' + weeksSoFar + ' weeks</div>';   // footnote at the bottom (user 2026-10-22)

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
  // Monthly-billed when the sheet's Length says month (e.g. "1 Month"); else yearly.
  var monthlyBill = !!(e && /month/i.test(e.length || ''));
  var price = e ? (monthlyBill ? e.monthly : e.yearly) : null;
  price = price != null ? String(price) : '';
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
    // Billed monthly or yearly (user 2026-10-22): one price box, the other is worked out.
    '<label class="settings-label">Billed</label>' +
    // Radio circles (user 2026-10-22): grey ring, white when picked
    '<div class="f2-bill">' +
      '<label class="f2-radio"><input type="radio" name="f2Bill" value="m"' + (monthlyBill ? ' checked' : '') + ' onchange="_f2PickBill(this)">Monthly</label>' +
      '<label class="f2-radio"><input type="radio" name="f2Bill" value="y"' + (monthlyBill ? '' : ' checked') + ' onchange="_f2PickBill(this)">Yearly</label>' +
    '</div>' +
    f('f2ExPrice', 'Price $', price, monthlyBill ? '10' : '179') +
    f('f2ExLength', 'Length', e ? e.length : '', '1 Year') +
    f('f2ExRenewal', 'Renewal', e ? e.renewal : '', 'June 9, 2027') +
    '<div class="f2-ex-btns">' +
      (e ? '<button class="link-btn" onclick="_f2RemoveExpense(this)">Remove</button>' : '<span></span>') +
      '<button class="link-btn" onclick="_f2SaveExpense(this)">Save</button>' +
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
  _f2ExCall('saveExpense', q, btn, 'Saving', 'Saved');
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
    _f2ExCall('removeExpense', '&row=' + encodeURIComponent(e.row || '') + '&was=' + encodeURIComponent(e.app), btn, 'Removing', 'Removed');
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
    message: 'Clears this row in the Expenses sheet. A saved login in the sheet stays.',
    confirmLabel: 'Remove', danger: true
  }).then(function (ok) {
    if (!ok) return;
    _f2ExCall('removeExpense', '&row=' + encodeURIComponent(e.row) + '&was=' + encodeURIComponent(e.app), null, 'Removing', 'Removed', true);
  });
}

// While Google works the whole window dims, every button included, and a
// separate "Saving…" / "Removing…" with the rolling ring sits mid-window
// (user rule 2026-10-22). When it's done the centre text turns "Saved ✓" for a
// moment, then the window closes and the whole tab reloads (its Loading) with
// the new numbers.
function _f2ExCall(action, q, btn, word, doneWord, onTab) {
  // onTab: the action came from the tab itself (Remove under the table), not the window —
  // the whole tab dims instead, and a failure shows as a toast.
  var modal = onTab ? document.getElementById('fin2Body') : document.getElementById('f2ExModal');
  var st = onTab ? null : document.getElementById('f2ExStatus');
  var fail = function (why) { if (st) rpmFail(st, why); else rpmToast('fail', 'Unsuccessful', why); };
  var busy = function (on) {
    if (on && document.activeElement) document.activeElement.blur();   // a focused button would glow through the dim
    modal.classList.toggle('rpm-busy', on);
    var msg = modal.querySelector('.rpm-load-center');   // the portal's own mid-screen loading box
    if (on && !msg) modal.insertAdjacentHTML('beforeend', '<div class="rpm-load-center rpm-keep"><span class="rpm-loading">' + word + '</span></div>');
    else if (!on && msg) msg.remove();
  };
  if (st) st.innerHTML = '';
  busy(true);
  fetch(getScriptUrl() + '?action=' + action + q)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) { busy(false); fail((d && d.message) || 'No answer'); return; }
      var msg = modal.querySelector('.rpm-load-center');
      if (msg) msg.innerHTML = '<span class="f2-done">' + doneWord + ' ✓</span>';
      setTimeout(function () { busy(false); if (!onTab) _f2CloseExpense(); initFinancial2Tab(); }, 900);
    })
    .catch(function (err) { busy(false); fail(err.message); });
}
