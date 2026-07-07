// ─── TABS / TRAVEL.JS  (TRAVEL PLAN) ────────────────────────────────────────
// The "doing" surface. Two screens:
//   1) PLAN   — Leaving + Arriving spinners anchor two Mon-Sun day strips; tap a
//               day to extend the buffer. Live impact ($ / lessons / students)
//               updates on every change.
//   2) REVIEW — per-student breakdown (before / skip / resume) + the exact text
//               each student will receive. GO LIVE deletes the events, texts the
//               students (TEST → your own phone), and logs the trip.
//
// After GO LIVE everything lives in the TRIP SUMMARY tab (sent status, replies,
// confirmations, history). This tab is only for planning + running a trip.

var _travelState = {
  leaving:   '', arriving:  '',
  firstOff:  '', firstBack: '',
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
      : 'background:transparent;border:1px solid var(--border);color:var(--muted)');
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

  // Pre-fill with today so the year is already right — just nudge month/day.
  if (!_travelState.leaving) {
    var today = _dateToYmd(new Date());
    _travelState.leaving = _travelState.arriving = today;
    _travelState.firstOff = _travelState.firstBack = today;
  }

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
  hdr.innerHTML =
    "<div style='font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>Plan a Trip</div>" +
    "<button id='travelReset' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>↺ Reset dates</button>";
  section.appendChild(hdr);
  document.getElementById('travelReset').onclick = function() {
    _travelState.leaving = _travelState.arriving = _travelState.firstOff = _travelState.firstBack = '';
    _travelState.preview = null;
    _travelRenderPlan();
  };

  var inputs = document.createElement('div');
  inputs.style.cssText = 'display:flex;gap:10px;margin-bottom:10px';
  inputs.innerHTML =
    "<div id='travelLeavingSlot'  style='flex:1'></div>" +
    "<div id='travelArrivingSlot' style='flex:1'></div>";
  section.appendChild(inputs);

  _travelRenderDateSpinner('travelLeavingSlot',  'Leaving',  'leaving',  0);
  _travelRenderDateSpinner('travelArrivingSlot', 'Arriving', 'arriving', 2);

  var leavingWeek = document.createElement('div');
  leavingWeek.id = 'travelLeavingWeek';
  leavingWeek.style.cssText = 'margin-bottom:8px';
  section.appendChild(leavingWeek);

  var arrivingWeek = document.createElement('div');
  arrivingWeek.id = 'travelArrivingWeek';
  arrivingWeek.style.cssText = 'margin-bottom:14px';
  section.appendChild(arrivingWeek);

  var summary = document.createElement('div');
  summary.id = 'travelSummary';
  summary.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:14px;background:var(--panel)';
  summary.innerHTML = "<div class='empty-state'>Pick leaving + arriving dates to see impact</div>";
  section.appendChild(summary);

  if (_travelState.leaving && _travelState.arriving) {
    _travelRebuildWeeks();
    _travelFetchPreview();
  }
}


// ─── DATE SPINNER WIDGET ────────────────────────────────────────────────────

var _SK_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function _travelRenderDateSpinner(slotId, label, stateKey, baseOrder) {
  var wrap = document.getElementById(slotId);
  if (!wrap) return;
  wrap.innerHTML = '';

  var lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px';
  lbl.textContent = label;
  wrap.appendChild(lbl);

  var box = document.createElement('div');
  box.style.cssText = 'display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--border);' +
    'border-radius:4px;padding:6px 10px;font-size:15px;color:var(--text);font-family:inherit';

  var monthSeg = _travelDateSeg();
  monthSeg.dataset.navOrder = String(baseOrder);
  var daySeg = _travelDateSeg();
  daySeg.dataset.navOrder = String(baseOrder + 1);
  var yearSeg = _travelDateSeg();

  function refresh() {
    var d = _ymdToDate(_travelState[stateKey]);
    monthSeg.textContent = _SK_MONTHS[d.getMonth()];
    daySeg.textContent   = _travelZeroPad(d.getDate());
    yearSeg.textContent  = String(d.getFullYear());
  }

  function step(which, dir) {
    var d = _ymdToDate(_travelState[stateKey]);
    var y = d.getFullYear(), m = d.getMonth(), dd = d.getDate();
    if (which === 'month')      m = (m + dir + 12) % 12;
    else if (which === 'year')  y = y + dir;
    else if (which === 'day') {
      var maxNow = new Date(y, m + 1, 0).getDate();
      dd = dd + dir;
      if (dd < 1)      dd = maxNow;
      if (dd > maxNow) dd = 1;
    }
    var maxNew = new Date(y, m + 1, 0).getDate();
    if (dd > maxNew) dd = maxNew;

    var ymd = y + '-' + _travelZeroPad(m + 1) + '-' + _travelZeroPad(dd);
    _travelState[stateKey] = ymd;
    if (stateKey === 'leaving')  _travelState.firstOff  = ymd;
    if (stateKey === 'arriving') _travelState.firstBack = ymd;

    refresh();
    _travelRebuildWeeks();
    _travelFetchPreview();
  }

  function arrowHandler(which, hasLeftRight) {
    return function(e) {
      if (e.key === 'ArrowUp')   { e.preventDefault(); step(which, +1); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); step(which, -1); return; }
      if (hasLeftRight && e.key === 'ArrowRight') { e.preventDefault(); _travelNavSeg(this, +1); return; }
      if (hasLeftRight && e.key === 'ArrowLeft')  { e.preventDefault(); _travelNavSeg(this, -1); return; }
    };
  }

  monthSeg.onkeydown = arrowHandler('month', true);
  daySeg.onkeydown   = arrowHandler('day',   true);
  yearSeg.onkeydown  = arrowHandler('year',  false);

  box.appendChild(monthSeg);
  box.appendChild(_travelDateSlash());
  box.appendChild(daySeg);
  box.appendChild(_travelDateSlash());
  box.appendChild(yearSeg);

  wrap.appendChild(box);
  refresh();
}

function _travelDateSeg() {
  var b = document.createElement('button');
  b.type = 'button';
  b.tabIndex = 0;
  b.style.cssText =
    'background:transparent;border:none;color:inherit;font-family:inherit;font-size:inherit;font-weight:600;' +
    'padding:2px 6px;cursor:pointer;border-radius:3px;outline:none;letter-spacing:0.3px';
  b.onfocus = function() { b.style.background = 'rgba(232,70,58,0.18)'; b.style.color = 'var(--accent)'; };
  b.onblur  = function() { b.style.background = 'transparent';          b.style.color = 'inherit'; };
  b.onclick = function() { b.focus(); };
  return b;
}

function _travelDateSlash() {
  var s = document.createElement('span');
  s.textContent = '/';
  s.style.cssText = 'color:var(--muted);margin:0 1px;font-weight:400';
  return s;
}

function _travelZeroPad(n) { return n < 10 ? '0' + n : '' + n; }

function _travelNavSeg(seg, dir) {
  var order = parseInt(seg.dataset.navOrder, 10);
  if (isNaN(order)) return;
  var target = order + dir;
  if (target < 0 || target > 3) return;
  var next = document.querySelector('[data-nav-order="' + target + '"]');
  if (next) next.focus();
}

function _travelRebuildWeeks() {
  _renderWeekStrip('travelLeavingWeek',  'First day off  (tap to buffer earlier)',
                   _travelState.leaving,  _travelState.firstOff,  'before', 'var(--accent)');
  _renderWeekStrip('travelArrivingWeek', 'First day teaching  (tap to buffer later)',
                   _travelState.arriving, _travelState.firstBack, 'after',  'var(--green)');
}

function _renderWeekStrip(wrapId, label, anchorYmd, selectedYmd, mode, accentVar) {
  var wrap = document.getElementById(wrapId);
  wrap.innerHTML = '';
  if (!anchorYmd) return;
  accentVar = accentVar || 'var(--accent)';
  // Tint the selected pill's background from the accent (accent for off, green
  // for the resume day). Fixed low-alpha wash keeps it subtle in both cases.
  var accentBg = accentVar === 'var(--green)' ? 'rgba(0,200,100,0.18)' : 'rgba(232,70,58,0.18)';

  var lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px';
  lbl.textContent = label;
  wrap.appendChild(lbl);

  var pillRow = document.createElement('div');
  pillRow.style.cssText = 'display:flex;gap:4px;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:6px';

  var anchor = _ymdToDate(anchorYmd);
  var monday = _mondayOfWeek(anchor);

  for (var i = 0; i < 7; i++) {
    var d        = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
    var ymd      = _dateToYmd(d);
    var enabled  = mode === 'before' ? (d <= anchor) : (d >= anchor);
    var selected = ymd === selectedYmd;
    var isAnchor = ymd === anchorYmd;
    var dayName  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];

    var btn = document.createElement('button');
    btn.innerHTML =
      "<div style='font-size:9px;line-height:1;letter-spacing:0.5px'>" + dayName.toUpperCase() + "</div>" +
      "<div style='font-size:15px;font-weight:600;line-height:1.3'>" + d.getDate() + "</div>";
    btn.style.cssText =
      'flex:1;padding:6px 4px;border-radius:4px;font-family:inherit;' +
      'border:1px solid ' + (selected ? accentVar : 'transparent') + ';' +
      'background:' + (selected ? accentBg : 'transparent') + ';' +
      'color:' + (enabled ? (selected ? accentVar : 'var(--text)') : 'rgba(180,180,180,0.25)') + ';' +
      'cursor:' + (enabled ? 'pointer' : 'default') + ';' +
      'opacity:' + (enabled ? '1' : '0.5') + ';' +
      (isAnchor && !selected ? 'box-shadow:inset 0 -2px 0 var(--muted);' : '');

    if (enabled) {
      (function(ymdCap) {
        btn.onclick = function() {
          if (mode === 'before') _travelState.firstOff  = ymdCap;
          else                   _travelState.firstBack = ymdCap;
          _travelRebuildWeeks();
          _travelFetchPreview();
        };
      })(ymd);
    }
    pillRow.appendChild(btn);
  }
  wrap.appendChild(pillRow);
}

// Every date nudge calls this. Two guards keep fast tapping from showing stale
// numbers: (1) debounce — wait until you stop moving before scanning, so rapid
// taps collapse into one request; (2) sequence token — each call bumps a
// counter, and a response only paints if it's still the newest, so an older
// scan that finishes late is discarded instead of overwriting a newer one.
var _travelPreviewSeq   = 0;
var _travelPreviewTimer = null;

function _travelFetchPreview() {
  var mySeq = ++_travelPreviewSeq;   // this call is now the newest intent
  if (_travelPreviewTimer) { clearTimeout(_travelPreviewTimer); _travelPreviewTimer = null; }

  var off = _travelState.firstOff, back = _travelState.firstBack;
  if (!off || !back) return;
  if (off >= back) {
    _travelState.preview = null;
    document.getElementById('travelSummary').innerHTML =
      "<div class='empty-state' style='color:#ffb400'>First day off must be before first day back</div>";
    return;
  }
  document.getElementById('travelSummary').innerHTML = "<div class='empty-state'>Scanning calendar…</div>";

  _travelPreviewTimer = setTimeout(function() {
    var url = getScriptUrl(); if (!url) return;
    fetch(url + '?action=getTravelPreview&start=' + encodeURIComponent(off) + '&end=' + encodeURIComponent(back) + _travelTestParam())
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (mySeq !== _travelPreviewSeq) return; // a newer nudge superseded this scan
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
  }, 250);
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
    "<div style='display:flex;gap:18px;align-items:center;justify-content:space-around;text-align:center'>" +
      "<div><div style='font-size:24px;font-weight:700;color:var(--text)'>" + data.totalLessons + "</div>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>lessons</div></div>" +
      "<div><div style='font-size:24px;font-weight:700;color:var(--text)'>" + data.totalStudents + "</div>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>students</div></div>" +
      "<div><div style='font-size:24px;font-weight:700;color:#ff6b6b'>" + rev + "</div>" +
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
        data.totalLessons + ' lessons · ' + data.totalStudents + ' students · $' + (data.totalRevenue || 0).toLocaleString() + ' loss' +
      "</div>" +
    "</div>" +
    "<button id='travelBackToPrev' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>← Back</button>";
  section.appendChild(hdr);
  document.getElementById('travelBackToPrev').onclick = _travelRenderPlan;

  var list = document.createElement('div');
  list.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden;margin-bottom:14px';

  data.students.forEach(function(s, i) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:10px 12px;' + (i > 0 ? 'border-top:1px solid rgba(255,255,255,0.04);' : '');
    var beforeLine = (s.beforeDates && s.beforeDates.length)
      ? "<div style='font-size:11px;color:#5b9dff;margin-bottom:2px'>Before: " + s.beforeDates.join(', ') + "</div>"
      : '';
    row.innerHTML =
      "<div style='display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px'>" +
        "<span style='font-weight:600;font-size:13px'>" + s.name + "</span>" +
        "<span style='font-size:11px;color:var(--muted)'>" + s.lessonCount + " × $" + s.rate + " = $" + s.revenueLoss + "</span>" +
      "</div>" +
      beforeLine +
      "<div style='font-size:11px;color:#ffa500;margin-bottom:2px'>Skip: " + s.skipDates.join(', ') + "</div>" +
      "<div style='font-size:11px;color:var(--green);margin-bottom:6px'>Resume: " + s.firstBack + "</div>" +
      "<div style='font-size:11px;color:var(--muted);background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:8px;line-height:1.5'>" +
        "<span style='display:block;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin-bottom:3px'>📱 Text they'll get</span>" +
        _escapeHtml(s.smsText || '') +
      "</div>";
    list.appendChild(row);
  });
  section.appendChild(list);

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
    var msg = 'Delete ' + data.totalLessons + ' lessons across ' + data.totalStudents + ' students?\n\n' +
      who + '\n\nSecretary also emails on its next hourly run.';
    if (!confirm(msg)) return;
    go.disabled = true; go.textContent = 'Working…';
    _travelExecute();
  };
  actions.appendChild(go);
  section.appendChild(actions);
}

function _travelExecute() {
  var url = getScriptUrl(); if (!url) return;
  callScript(url, 'executeTravel', _travelTestArgs({ start: _travelState.firstOff, end: _travelState.firstBack }), function(data) {
    if (data && data.success) {
      var noPhone = (data.noPhone && data.noPhone.length) ? ' · ⚠ no phone: ' + data.noPhone.join(', ') : '';
      var failed  = data.textsFailed ? ' · ' + data.textsFailed + ' failed' : '';
      addLog('travelFeed',
        '✓ Deleted ' + data.deleted + ' · texted ' + data.textsSent + '/' + data.studentsLogged +
        (data.skipsLogged != null ? ' · ' + data.skipsLogged + ' skips logged' : '') + failed + noPhone,
        'success');
      _travelState.leaving = _travelState.arriving = _travelState.firstOff = _travelState.firstBack = '';
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
