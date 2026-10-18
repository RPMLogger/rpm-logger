// ─── TABS / TRAVEL.JS  (TRAVEL PLAN) ────────────────────────────────────────
// The "doing" surface. Two screens:
//   1) PLAN   — Leaving + Arriving pickers over a two-month calendar (each
//               follows the other). Calculate shows the impact ($ / lessons).
//   2) REVIEW — per-student breakdown (before / skip / resume) + the exact text
//               each student will receive. GO LIVE deletes the events, texts the
//               students (TEST → your own phone), and logs the trip.
//
// After GO LIVE everything lives in the TRIP SUMMARY tab (sent status, replies,
// confirmations, history). This tab is only for planning + running a trip.

var _travelState = {
  leaving:   '', arriving:  '',
  firstOff:  '', firstBack: '',
  location:  '',
  preview:   null,
  testMode:  localStorage.getItem('travelTestMode') === '1'
};

function _travelTestParam() { return _travelState.testMode ? '&test=1' : ''; }
function _travelTestArgs(o)  { if (_travelState.testMode) o.test = '1'; return o; }

function _travelToggleTestMode() {
  _travelState.testMode = !_travelState.testMode;
  localStorage.setItem('travelTestMode', _travelState.testMode ? '1' : '0');
  _travelRenderPlan();
}

function _travelTopBar() {
  var bar = document.createElement('div');
  bar.style.cssText =
    'display:flex;justify-content:space-between;align-items:center;gap:10px;' +
    'padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:11px;' +
    (_travelState.testMode
      ? 'background:rgba(255,180,0,0.12);border:1px solid rgba(255,180,0,0.5);color:#ffb400'
      : 'background:var(--surface);border:1px solid var(--border);color:var(--muted)');   // the box colour, a step off the page (2026-10-08)
  var label = _travelState.testMode
    ? '🧪 TEST MODE — texts go to YOUR phone · calendar: redpickmusic@gmail.com'
    : 'LIVE MODE — texts go to students · Weekly + Biweekly calendars';
  bar.innerHTML =
    "<span style='letter-spacing:0.5px;text-transform:uppercase;font-weight:600'>" + label + "</span>" +
    "<button id='travelTestToggle' style='padding:4px 10px;font-size:10px;background:transparent;color:inherit;border:1px solid currentColor;border-radius:4px;cursor:pointer;letter-spacing:0.5px'>" +
      (_travelState.testMode ? 'Switch to LIVE' : 'Switch to TEST') +
    "</button>";
  setTimeout(function() {
    var t = document.getElementById('travelTestToggle');
    if (t) t.onclick = _travelToggleTestMode;
  }, 0);
  return bar;
}

function initTravelTab() {
  _travelRenderPlan();
}


// ─── PLAN SCREEN ────────────────────────────────────────────────────────────

function _travelRenderPlan() {
  var section = document.getElementById('travelBody');
  if (!section) return;
  section.innerHTML = '';
  section.appendChild(_travelTopBar());

  // The pickers sit outside the redrawn parts, so stepping them keeps their keys.
  var cal = document.createElement('div');
  cal.className = 'tv-cal';
  cal.innerHTML =
    "<div class='tv-cal-head' id='travelCalHead'></div>" +
    "<div class='tv-cal-cols tv-cal-pickers'>" +
      "<div id='travelLeavingSlot'></div><div id='travelArrivingSlot'></div>" +
    "</div>" +
    "<div class='tv-cal-cols' id='travelCalMonths'></div>";
  section.appendChild(cal);

  var summary = document.createElement('div');
  summary.id = 'travelSummary';
  summary.style.cssText = 'border:1px solid var(--border);border-radius:var(--radius-card);padding:14px;background:var(--panel)';
  section.appendChild(summary);

  _travelRenderDateSpinner('travelLeavingSlot',  'Leaving',  'firstOff',  'tv-off');
  _travelRenderDateSpinner('travelArrivingSlot', 'Arriving', 'firstBack', 'tv-back');
  _travelRenderCal();
  _travelMarkStale();
}


// ─── LEAVING / ARRIVING + TRIP CALENDAR ─────────────────────────────────────
// Two ways to set the same two days: the portal's date picker (rpmDtpHtml, with
// the year — a trip can run into the new year), or a tap on the two-month
// calendar under them (a trip never runs past two months). Each follows the
// other, and the calendar slides to keep both days in view. On the calendar a
// tap before the trip moves Leaving, after it moves Arriving, anything else
// starts a new trip (2026-10-18, was the pickers over two Mon–Sun week strips).
// Leaving is the first day off, Arriving the first day teaching.

function _travelRenderDateSpinner(slotId, label, stateKey, tone) {
  var wrap = document.getElementById(slotId);
  if (!wrap) return;
  var id = 'tv' + stateKey;
  wrap.innerHTML =
    "<div class='tv-cal-label " + tone + "'>" + label + "</div>" +
    rpmDtpHtml(id, { date: _travelState[stateKey], noTime: true, year: true, min: 'today', group: 'travel', onChange: function() {
      var ymd = rpmDtpGet(id).date;
      _travelState[stateKey] = ymd;
      _travelSync();
      _travelShowMonth(ymd);
      _travelRenderCal();
      _travelMarkStale();
    } });
}

// leaving / arriving only feed the summary's buffer line; they are the same days now.
function _travelSync() {
  _travelState.leaving  = _travelState.firstOff;
  _travelState.arriving = _travelState.firstBack;
}

// Slide the two months so this day is on screen.
function _travelShowMonth(ymd) {
  var d = _ymdToDate(ymd), c = _travelState.calMonth;
  if (!d || !c) return;
  var k = (d.getFullYear() - c.getFullYear()) * 12 + d.getMonth() - c.getMonth();
  if (k < 0)      _travelState.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  else if (k > 1) _travelState.calMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function _travelRenderCal() {
  var head = document.getElementById('travelCalHead');
  var months = document.getElementById('travelCalMonths');
  if (!head || !months) return;
  var s = _travelState;
  var now = new Date();
  var thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (!s.calMonth) s.calMonth = thisMonth;
  var off = s.firstOff, back = s.firstBack > off ? s.firstBack : '';

  var n = back ? _daysBetween(off, back) : 0;
  head.innerHTML =
    "<div class='tv-cal-hint'>" +
      (!off  ? "<span class='tv-cal-muted'>Pick the day you leave</span>"
      : !back ? "<span class='tv-cal-muted'>Now pick the day you're back teaching</span>"
      : n + " day" + (n === 1 ? '' : 's') + " off") +
    "</div>" +
    (off ? "<button class='tv-cal-clear' onclick='_travelClear()'>Clear</button>" : "");

  var second = new Date(s.calMonth.getFullYear(), s.calMonth.getMonth() + 1, 1);
  months.innerHTML =
    _travelMonthHtml(s.calMonth, 'prev', s.calMonth <= thisMonth, off, back) +
    _travelMonthHtml(second, 'next', false, off, back);
}

function _travelMonthHtml(first, navSide, navOff, off, back) {
  var today = _dateToYmd(new Date());
  var y = first.getFullYear(), m = first.getMonth();
  var name = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  var html =
    "<div class='tv-cal-month'>" +
      "<div class='tv-cal-title'>" +
        "<button class='tv-cal-nav " + navSide + "'" + (navOff ? " disabled" : "") +
          " onclick='_travelCalStep(" + (navSide === 'prev' ? -1 : 1) + ")'>" + (navSide === 'prev' ? '‹' : '›') + "</button>" +
        name +
      "</div>" +
      "<div class='tv-cal-grid'>";
  ['M','T','W','T','F','S','S'].forEach(function(d) { html += "<div class='tv-cal-dow'>" + d + "</div>"; });
  var lead = (first.getDay() + 6) % 7;                 // Monday-first, like the rest of the portal
  for (var i = 0; i < lead; i++) html += "<div></div>";
  var days = new Date(y, m + 1, 0).getDate();
  for (var d = 1; d <= days; d++) {
    var ymd = _dateToYmd(new Date(y, m, d));
    var cls = 'tv-cal-day';
    if (ymd < today)                         cls += ' is-past';
    if (ymd === today)                       cls += ' is-today';
    if (ymd === off)                         cls += ' is-off' + (back ? ' has-end' : '');
    if (ymd === back)                        cls += ' is-back';
    if (back && ymd > off && ymd < back)     cls += ' is-in';
    html += "<button class='" + cls + "'" + (ymd < today ? " disabled" : " onclick=\"_travelPickDay('" + ymd + "')\"") +
            "><span>" + d + "</span></button>";
  }
  return html + "</div></div>";
}

function _travelPickDay(ymd) {
  var s = _travelState, off = s.firstOff, back = s.firstBack > off ? s.firstBack : '';
  if (off && !back && ymd > off)       s.firstBack = ymd;
  else if (off && back && ymd < off)   s.firstOff  = ymd;
  else if (off && back && ymd > back)  s.firstBack = ymd;
  else { s.firstOff = ymd; s.firstBack = ''; }
  _travelSync();
  rpmDtpSet('tvfirstOff',  s.firstOff);
  rpmDtpSet('tvfirstBack', s.firstBack);
  _travelRenderCal();
  _travelMarkStale();
}

function _travelCalStep(n) {
  var c = _travelState.calMonth;
  _travelState.calMonth = new Date(c.getFullYear(), c.getMonth() + n, 1);
  _travelRenderCal();
}

function _travelClear() {
  var s = _travelState;
  s.leaving = s.arriving = s.firstOff = s.firstBack = '';
  s.preview = null;
  rpmDtpSet('tvfirstOff', '');
  rpmDtpSet('tvfirstBack', '');
  _travelRenderCal();
  _travelMarkStale();
}

// Manual calculate flow: moving the dates NEVER auto-scans. It just clears any
// previous result and shows the Calculate button, so a scan only runs when you
// press it — you're always sure you're on the right dates first. The sequence
// token still guards a stray double-tap (only the newest response paints).
var _travelPreviewSeq = 0;

// Called on every date change — wipes the old number, shows Calculate again.
function _travelMarkStale() {
  _travelState.preview = null;
  _travelPreviewSeq++;               // invalidate anything in flight
  _travelRenderCalcPrompt();
}

function _travelRenderCalcPrompt() {
  var box = document.getElementById('travelSummary');
  if (!box) return;
  var off = _travelState.firstOff, back = _travelState.firstBack;
  var ready = off && back && off < back;
  box.innerHTML =     // the calendar's own line says what to tap next
    "<button id='travelCalcBtn'" + (ready ? "" : " disabled") +
      " style='width:100%;padding:12px;font-size:13px;background:rgba(232,70,58,0.15);color:var(--accent);" +
      "border:1px solid rgba(232,70,58,0.4);border-radius:4px;letter-spacing:0.5px;" +
      "cursor:" + (ready ? 'pointer' : 'default') + ";opacity:" + (ready ? '1' : '0.45') + "'>Calculate</button>";
  if (ready) {
    var b = document.getElementById('travelCalcBtn');
    if (b) b.onclick = _travelRunCalc;
  }
}

function _travelRunCalc() {
  var off = _travelState.firstOff, back = _travelState.firstBack;
  if (!off || !back || off >= back) return;
  var url = getScriptUrl(); if (!url) return;
  var mySeq = ++_travelPreviewSeq;
  document.getElementById('travelSummary').innerHTML = "<div class='empty-state'>Scanning calendar…</div>";
  fetch(url + '?action=getTravelPreview&start=' + encodeURIComponent(off) + '&end=' + encodeURIComponent(back) + _travelTestParam())
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (mySeq !== _travelPreviewSeq) return;   // a date changed mid-scan → drop it
      if (!data.success) {
        document.getElementById('travelSummary').innerHTML =
          "<div class='empty-state'>Error: " + (data.message || 'unknown') + "</div>";
        return;
      }
      _travelState.preview = data;
      _travelRenderSummary(data);
    })
    .catch(function() {
      if (mySeq !== _travelPreviewSeq) return;
      document.getElementById('travelSummary').innerHTML = "<div class='empty-state'>Connection failed</div>";
    });
}

function _travelRenderSummary(data) {
  var box = document.getElementById('travelSummary');
  var bufferBefore = _daysBetween(_travelState.firstOff,  _travelState.leaving);
  var bufferAfter  = _daysBetween(_travelState.arriving, _travelState.firstBack);
  var bufferTxt = '';
  if (bufferBefore > 0 || bufferAfter > 0) {
    var parts = [];
    if (bufferBefore > 0) parts.push('+' + bufferBefore + ' day' + (bufferBefore === 1 ? '' : 's') + ' before');
    if (bufferAfter  > 0) parts.push('+' + bufferAfter  + ' day' + (bufferAfter  === 1 ? '' : 's') + ' after');
    bufferTxt = "<div style='text-align:center;font-size:10px;color:var(--muted);margin-bottom:10px;letter-spacing:0.5px;text-transform:uppercase'>Buffer: " + parts.join(' · ') + "</div>";
  }

  if (!data.totalLessons) {
    box.innerHTML = bufferTxt + "<div class='empty-state' style='color:var(--green)'>No lessons in this range — you're clear to go</div>";
    return;
  }

  var rev = '$' + (data.totalRevenue || 0).toLocaleString();
  var warn = data.missingRate && data.missingRate.length
    ? "<div style='margin-top:10px;padding:8px;background:rgba(255,180,0,0.1);border:1px solid rgba(255,180,0,0.3);border-radius:4px;font-size:11px;color:#ffb400'>" +
        "⚠ No rate found for: " + data.missingRate.join(', ') + " — counted as $0 for now</div>"
    : "";

  box.innerHTML = bufferTxt +
    "<div style='display:flex;gap:28px;align-items:center;justify-content:center;text-align:center'>" +
      "<div><div style='font-size:28px;font-weight:700;color:var(--text)'>" + data.totalLessons + "</div>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>lessons</div></div>" +
      "<div><div style='font-size:28px;font-weight:700;color:#ff6b6b'>" + rev + "</div>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>revenue loss</div></div>" +
    "</div>" + warn +
    "<button id='travelNextBtn' style='width:100%;margin-top:14px;padding:10px;font-size:13px;background:rgba(232,70,58,0.15);color:var(--accent);border:1px solid rgba(232,70,58,0.4);border-radius:4px;cursor:pointer;letter-spacing:0.5px'>NEXT — review & texts →</button>";

  document.getElementById('travelNextBtn').onclick = _travelRenderReview;
}


// ─── REVIEW SCREEN ──────────────────────────────────────────────────────────

function _travelRenderReview() {
  var data = _travelState.preview;
  if (!data) return _travelRenderPlan();

  var section = document.getElementById('travelBody');
  section.innerHTML = '';
  section.appendChild(_travelTopBar());

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
  hdr.innerHTML =
    "<div>" +
      "<div style='font-size:13px;font-weight:600'>" + _travelState.firstOff + ' → ' + _travelState.firstBack + "</div>" +
      "<div style='font-size:11px;color:var(--muted)'>" +
        data.totalLessons + ' lessons · $' + (data.totalRevenue || 0).toLocaleString() + ' loss' +
      "</div>" +
    "</div>" +
    "<button id='travelBackToPrev' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>← Back</button>";
  section.appendChild(hdr);
  document.getElementById('travelBackToPrev').onclick = _travelRenderPlan;

  var noPhone = data.students.filter(function(s) { return !s.phone; }).map(function(s) { return s.name; });
  if (noPhone.length) {
    var warn = document.createElement('div');
    warn.style.cssText = 'border:1px solid rgba(255,107,107,0.5);background:rgba(255,107,107,0.1);color:#ff6b6b;border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.5';
    warn.innerHTML = "<b>⚠ " + noPhone.length + " student" + (noPhone.length === 1 ? '' : 's') +
      " with no number on file — will NOT be texted:</b><br>" + _escapeHtml(noPhone.join(', ')) +
      "<br><span style='color:var(--muted)'>Add a number in the Inquiries sheet, or text them by hand.</span>";
    section.appendChild(warn);
  }

  var list = document.createElement('div');
  list.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden;margin-bottom:14px';

  data.students.forEach(function(s, i) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:10px 12px;' + (i > 0 ? 'border-top:1px solid rgba(255,255,255,0.04);' : '');
    var beforeLine = (s.beforeDates && s.beforeDates.length)
      ? "<div style='font-size:11px;color:#5b9dff;margin-bottom:2px'>Before: " + s.beforeDates.join(', ') + "</div>"
      : '';
    var phoneLine = s.phone
      ? "<div style='font-size:11px;color:var(--muted);margin-bottom:2px'>📱 " + _escapeHtml(s.phone) + "</div>"
      : "<div style='font-size:11px;color:#ff6b6b;margin-bottom:2px;font-weight:600'>⚠ No number on file — will NOT be texted</div>";
    row.innerHTML =
      "<div style='display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px'>" +
        "<span style='font-weight:600;font-size:13px'>" + s.name + "</span>" +
        "<span style='font-size:11px;color:var(--muted)'>" + s.lessonCount + " × $" + s.rate + " = $" + s.revenueLoss + "</span>" +
      "</div>" +
      phoneLine +
      beforeLine +
      "<div style='font-size:11px;color:#ffa500;margin-bottom:2px'>Skip: " + s.skipDates.join(', ') + "</div>" +
      "<div style='font-size:11px;color:var(--green);margin-bottom:6px'>Resume: " + s.firstBack + "</div>" +
      "<div style='font-size:11px;color:var(--muted);background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:8px;line-height:1.5;white-space:pre-wrap'>" +
        "<span style='display:block;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin-bottom:3px'>📱 Text they'll get</span>" +
        _escapeHtml(s.smsText || '') +
      "</div>";
    list.appendChild(row);
  });
  section.appendChild(list);

  // Location (optional) — stored on the trip, shown in Trip History.
  var locWrap = document.createElement('div');
  locWrap.style.cssText = 'margin-bottom:12px';
  locWrap.innerHTML = "<label style='display:block;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Location (optional — shows in Trip History)</label>";
  var locInput = document.createElement('input');
  locInput.type = 'text';
  locInput.placeholder = 'e.g. Turkey';
  locInput.value = _travelState.location || '';
  locInput.style.cssText = 'width:100%;box-sizing:border-box;padding:9px 10px;font-size:13px;font-family:inherit;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)';
  locInput.oninput = function() { _travelState.location = locInput.value; };
  locWrap.appendChild(locInput);
  section.appendChild(locWrap);

  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px';

  var back = document.createElement('button');
  back.textContent = '← Back';
  back.style.cssText = 'flex:0 0 auto;padding:12px 18px;font-size:13px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer;letter-spacing:0.5px';
  back.onclick = _travelRenderPlan;
  actions.appendChild(back);

  var go = document.createElement('button');
  var goLabel = _travelState.testMode
    ? 'GO (TEST) — delete ' + data.totalLessons + ' · text YOU ×' + data.totalStudents
    : 'GO LIVE — delete ' + data.totalLessons + ' · text ' + data.totalStudents + ' students';
  go.textContent = goLabel;
  go.style.cssText = 'flex:1;padding:12px;font-size:12px;background:rgba(232,70,58,0.25);color:var(--accent);border:1px solid var(--accent);border-radius:4px;cursor:pointer;letter-spacing:0.5px;font-weight:600';
  go.onclick = function() {
    var who = _travelState.testMode
      ? 'Texts go to YOUR phone (test).'
      : 'Each student will be TEXTED their trip message now.';
    rpmConfirm({
      title: 'Delete ' + data.totalLessons + ' lessons across ' + data.totalStudents + ' students?',
      message: who + '\n\nSecretary also emails on its next hourly run.',
      confirmLabel: 'Delete and text',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      go.disabled = true; go.textContent = 'Working…';
      _travelExecute();
    });
  };
  actions.appendChild(go);
  section.appendChild(actions);
}

function _travelExecute() {
  var url = getScriptUrl(); if (!url) return;
  callScript(url, 'executeTravel', _travelTestArgs({ start: _travelState.firstOff, end: _travelState.firstBack, location: _travelState.location || '' }), function(data) {
    if (data && data.success) {
      var noPhone = (data.noPhone && data.noPhone.length) ? ' · ⚠ no phone: ' + data.noPhone.join(', ') : '';
      var failed  = data.textsFailed ? ' · ' + data.textsFailed + ' failed' : '';
      addLog('travelFeed',
        '✓ Deleted ' + data.deleted + ' · texted ' + data.textsSent + '/' + data.studentsLogged +
        (data.skipsLogged != null ? ' · ' + data.skipsLogged + ' skips logged' : '') + failed + noPhone,
        'success');
      _travelState.leaving = _travelState.arriving = _travelState.firstOff = _travelState.firstBack = '';
      _travelState.location = '';
      _travelState.preview = null;
      _travelRenderDone(data);
    } else {
      addLog('travelFeed', '❌ ' + (data && data.message ? data.message : 'Execute failed'), 'error');
      _travelRenderReview();
    }
  });
}

function _travelRenderDone(data) {
  var section = document.getElementById('travelBody');
  section.innerHTML = '';
  section.appendChild(_travelTopBar());

  var card = document.createElement('div');
  card.style.cssText = 'border:1px solid var(--green);border-radius:6px;background:rgba(0,200,100,0.08);padding:18px;text-align:center;margin-bottom:14px';
  card.innerHTML =
    "<div style='font-size:15px;font-weight:700;color:var(--green);margin-bottom:8px'>✓ Trip is live</div>" +
    "<div style='font-size:12px;color:var(--text);line-height:1.6'>" +
      data.deleted + " lessons cancelled<br>" +
      data.textsSent + " / " + data.studentsLogged + " students texted" +
      (data.isTest ? " <span style='color:#ffb400'>(to your phone — test)</span>" : "") +
      (data.textsFailed ? "<br><span style='color:#ff6b6b'>" + data.textsFailed + " texts failed</span>" : "") +
      ((data.noPhone && data.noPhone.length) ? "<br><span style='color:#ffb400'>No phone on file: " + data.noPhone.join(', ') + "</span>" : "") +
    "</div>";
  section.appendChild(card);

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px';
  var summaryBtn = document.createElement('button');
  summaryBtn.textContent = 'View in Trip Summary →';
  summaryBtn.style.cssText = 'flex:1;padding:12px;font-size:13px;background:rgba(232,70,58,0.15);color:var(--accent);border:1px solid rgba(232,70,58,0.4);border-radius:4px;cursor:pointer;letter-spacing:0.5px';
  summaryBtn.onclick = function() { if (typeof switchTab === 'function') switchTab('tripsummary'); };
  btns.appendChild(summaryBtn);

  var planBtn = document.createElement('button');
  planBtn.textContent = 'Plan another';
  planBtn.style.cssText = 'flex:0 0 auto;padding:12px 18px;font-size:13px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer';
  planBtn.onclick = _travelRenderPlan;
  btns.appendChild(planBtn);
  section.appendChild(btns);
}


// ─── DATE HELPERS ───────────────────────────────────────────────────────────

function _ymdToDate(s) {
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

function _dateToYmd(d) {
  var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

function _mondayOfWeek(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

function _daysBetween(earlierYmd, laterYmd) {
  if (!earlierYmd || !laterYmd) return 0;
  var a = _ymdToDate(earlierYmd), b = _ymdToDate(laterYmd);
  if (!a || !b) return 0;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function _escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
