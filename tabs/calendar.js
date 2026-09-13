// ─── TABS / CALENDAR.JS ─────────────────────────────────────────────────────
// Own week grid over the three RPM calendars (Weekly / Biweekly / Trial).
// Mon–Sun columns, 9:30 AM – 9:30 PM rows. Drag a lesson to a new day/hour →
// confirm → moves ONLY that occurrence in Google Calendar (backend
// moveCalendarEvent_ in RPM_Calendar.gs). Google stays the source of truth, so
// the sheets and Secretary keep reading it exactly as before.
//
// Past lessons can't be dragged (the counter/income recorder already read them).
// With no script URL (localhost preview) it shows sample lessons; drags there
// don't save anywhere. The plain Google embed lives behind "Google view".

var CAL_DAY_START = 9 * 60 + 30;   // 9:30 AM, minutes from midnight
var CAL_DAY_END   = 21 * 60 + 30;  // 9:30 PM
var CAL_HOUR_PX   = 52;
var CAL_SNAP      = 15;            // drag snaps to 15 minutes
var CAL_COLORS    = { weekly: '#26a69a', biweekly: '#e91e63', trial: '#f4511e' };
var CAL_DAYS      = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var CAL_MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

var _calWeekOffset = 0;    // 0 = this week
var _calEvents     = [];
var _calSample     = false;
var _calLoadToken  = 0;    // ignore responses for a week we already left

function initCalendarTab() {
  _calInjectStyle();
  _calLoad();
}

// ── Data ────────────────────────────────────────────────────────────────────

function _calLoad(statusMsg) {
  var mon   = _calMonday(_calWeekOffset);
  var url   = (document.getElementById('scriptUrl').value || '').trim();
  var token = ++_calLoadToken;
  _calRenderShell(mon);

  if (!url) {
    _calSample = true;
    _calEvents = _calSampleEvents(mon);
    _calRenderEvents();
    _calSetStatus('Sample lessons · no data connected');
    return;
  }

  _calSample = false;
  _calSetStatus('Loading…');
  fetch(url + '?action=getCalendarWeek&weekStart=' + _calYmd(mon))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (token !== _calLoadToken) return;
      if (!data.success) { _calSetStatus(data.message ? 'Error: ' + data.message : 'Calendar backend not deployed yet'); return; }
      _calEvents = data.events || [];
      _calRenderEvents();
      _calSetStatus(statusMsg || (_calEvents.length + ' lessons'));
    })
    .catch(function() { if (token === _calLoadToken) _calSetStatus('Connection failed'); });
}

function _calSave(ev, newDayIdx, newStartMin) {
  var mon     = _calMonday(_calWeekOffset);
  var newDate = _calYmd(_calAddDays(mon, newDayIdx));

  if (_calSample) {
    ev.dayIdx = newDayIdx; ev.endMin = newStartMin + (ev.endMin - ev.startMin); ev.startMin = newStartMin;
    ev.date = newDate;
    _calRenderEvents();
    _calSetStatus('Sample only · nothing saved');
    return;
  }

  _calSetStatus('Moving ' + ev.title + '…');
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=moveCalendarEvent' +
        '&calType='     + encodeURIComponent(ev.calType) +
        '&id='          + encodeURIComponent(ev.id) +
        '&oldStart='    + ev.startMs +
        '&newDate='     + newDate +
        '&newStartMin=' + newStartMin)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { _calLoad('Not moved: ' + (data.message || 'unknown')); return; }
      _calLoad('Moved ' + (data.title || ev.title) + ' → ' + data.newTime);
    })
    .catch(function() { _calLoad('Connection failed · not moved'); });
}

// ── Rendering ───────────────────────────────────────────────────────────────

function _calRenderShell(mon) {
  var body = document.getElementById('calBody');
  if (!body) return;
  var sun   = _calAddDays(mon, 6);
  var today = _calYmd(new Date());
  var totalPx = (CAL_DAY_END - CAL_DAY_START) / 60 * CAL_HOUR_PX;

  var html =
    "<div class='cal-bar'>" +
      "<button class='cal-btn' onclick='_calShift(-1)'>‹</button>" +
      "<div class='cal-range'>" + (CAL_MONTHS[mon.getMonth()] + ' ' + mon.getDate() + ' - ' + CAL_MONTHS[sun.getMonth()] + ' ' + sun.getDate()).toUpperCase() + "</div>" +
      "<button class='cal-btn' onclick='_calShift(1)'>›</button>" +
      (_calWeekOffset !== 0 ? "<button class='cal-btn' onclick='_calShift(0)'>This week</button>" : "") +
      "<span class='cal-legend'>" +
        "<i style='background:" + CAL_COLORS.weekly   + "'></i>Weekly" +
        "<i style='background:" + CAL_COLORS.biweekly + "'></i>Biweekly" +
        "<i style='background:" + CAL_COLORS.trial    + "'></i>Trial" +
      "</span>" +
      "<span class='cal-status' id='calStatus'></span>" +
      "<button class='cal-btn' onclick='_calLoad()'>⟳</button>" +
      "<button class='cal-btn' id='calGoogleBtn' onclick='_calToggleGoogle()'>" + (_calGoogleOpen() ? 'Hide Google view' : 'Google view') + "</button>" +
    "</div>" +
    "<div class='cal-wrap'><div class='cal-inner'>" +
      "<div class='cal-head'><div></div>";

  for (var d = 0; d < 7; d++) {
    var day = _calAddDays(mon, d);
    html += "<div class='" + (_calYmd(day) === today ? 'today' : '') + "'>" + CAL_DAYS[d].toUpperCase() + "<b>" + day.getDate() + "</b></div>";
  }
  html += "</div><div class='cal-body' id='calGridBody' style='height:" + totalPx + "px'><div class='cal-gutter'>";

  // Hour labels on the full hours (10 AM … 9 PM); grid starts at 9:30
  for (var m = CAL_DAY_START; m <= CAL_DAY_END; m += 30) {
    var top = (m - CAL_DAY_START) / 60 * CAL_HOUR_PX;
    if (m % 60 === 0) html += "<div class='cal-hr' style='top:" + top + "px'>" + _calHourLabel(m) + "</div>";
  }
  html += "</div>";
  for (var c = 0; c < 7; c++) {
    html += "<div class='cal-col" + (_calYmd(_calAddDays(mon, c)) === today ? ' today' : '') + "' data-day='" + c + "'></div>";
  }
  for (var l = CAL_DAY_START + 30; l < CAL_DAY_END; l += 30) {
    html += "<div class='cal-line" + (l % 60 === 0 ? '' : ' half') + "' style='top:" + ((l - CAL_DAY_START) / 60 * CAL_HOUR_PX) + "px'></div>";
  }
  html += "</div></div></div>";
  body.innerHTML = html;
}

function _calRenderEvents() {
  var cols = document.querySelectorAll('#calGridBody .cal-col');
  if (!cols.length) return;
  for (var i = 0; i < cols.length; i++) cols[i].innerHTML = '';

  var mon = _calMonday(_calWeekOffset);
  var now = new Date();

  _calEvents.forEach(function(ev) {
    var col = cols[ev.dayIdx];
    if (!col) return;
    var s = Math.max(ev.startMin, CAL_DAY_START);
    var e = Math.min(ev.endMin, CAL_DAY_END);
    if (e <= s) return; // entirely outside 9:30–9:30

    var color = CAL_COLORS[ev.calType] || '#777';
    var el = document.createElement('div');
    var endDate = _calAddDays(mon, ev.dayIdx); endDate.setHours(0, ev.endMin, 0, 0);
    ev.past = endDate < now;
    el.className = 'cal-ev' + (ev.past ? ' past' : '');
    el.style.top    = ((s - CAL_DAY_START) / 60 * CAL_HOUR_PX) + 'px';
    el.style.height = Math.max(((e - s) / 60 * CAL_HOUR_PX) - 2, 16) + 'px';
    el.style.borderLeftColor = color;
    el.style.background = _calFade(color, 0.22);
    el.title = ev.title + ' · ' + _calFmt(ev.startMin) + (ev.past ? ' · past, locked' : ' · drag to move');
    el.innerHTML = "<div class='n'>" + _calEsc(ev.title) + "</div><div class='t'>" + _calFmt(ev.startMin) + "</div>";
    el._ev = ev;
    if (!ev.past) el.addEventListener('pointerdown', _calDragStart);
    col.appendChild(el);
  });

  // Red "now" line on today's column
  if (_calWeekOffset === 0) {
    var nm = now.getHours() * 60 + now.getMinutes();
    var tc = cols[(now.getDay() + 6) % 7];
    if (tc && nm >= CAL_DAY_START && nm <= CAL_DAY_END) {
      var line = document.createElement('div');
      line.className = 'cal-now';
      line.style.top = ((nm - CAL_DAY_START) / 60 * CAL_HOUR_PX) + 'px';
      tc.appendChild(line);
    }
  }
}

// ── Drag to move ────────────────────────────────────────────────────────────

var _calDrag = null;

function _calDragStart(e) {
  if (e.button !== 0) return;
  var el = e.currentTarget;
  _calDrag = { el: el, ev: el._ev, x: e.clientX, y: e.clientY, moved: false,
               dayIdx: el._ev.dayIdx, startMin: el._ev.startMin };
  el.setPointerCapture(e.pointerId);
  el.addEventListener('pointermove', _calDragMove);
  el.addEventListener('pointerup', _calDragEnd);
  el.addEventListener('pointercancel', _calDragEnd);
}

function _calDragMove(e) {
  var d = _calDrag;
  if (!d) return;
  if (!d.moved && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 5) return;
  d.moved = true;
  d.el.classList.add('dragging');

  var cols = document.querySelectorAll('#calGridBody .cal-col');
  var dayIdx = d.ev.dayIdx;
  for (var i = 0; i < cols.length; i++) {
    var r = cols[i].getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX < r.right) { dayIdx = i; break; }
    if (i === 0 && e.clientX < r.left) { dayIdx = 0; break; }
    if (i === cols.length - 1 && e.clientX >= r.right) dayIdx = i;
  }

  var dur   = d.ev.endMin - d.ev.startMin;
  var delta = Math.round(((e.clientY - d.y) / CAL_HOUR_PX * 60) / CAL_SNAP) * CAL_SNAP;
  var start = Math.min(Math.max(d.ev.startMin + delta, CAL_DAY_START), CAL_DAY_END - dur);

  if (cols[dayIdx] && d.el.parentNode !== cols[dayIdx]) cols[dayIdx].appendChild(d.el);
  d.el.style.top = ((start - CAL_DAY_START) / 60 * CAL_HOUR_PX) + 'px';
  d.el.querySelector('.t').textContent = _calFmt(start);
  d.dayIdx = dayIdx; d.startMin = start;
}

function _calDragEnd() {
  var d = _calDrag;
  _calDrag = null;
  if (!d) return;
  d.el.removeEventListener('pointermove', _calDragMove);
  d.el.removeEventListener('pointerup', _calDragEnd);
  d.el.removeEventListener('pointercancel', _calDragEnd);
  d.el.classList.remove('dragging');
  if (!d.moved || (d.dayIdx === d.ev.dayIdx && d.startMin === d.ev.startMin)) { _calRenderEvents(); return; }

  var mon      = _calMonday(_calWeekOffset);
  var target   = _calAddDays(mon, d.dayIdx); target.setHours(0, d.startMin, 0, 0);
  if (target < new Date()) { _calRenderEvents(); _calSetStatus("Can't move a lesson into the past"); return; }

  var newEnd   = d.startMin + (d.ev.endMin - d.ev.startMin);
  var overlaps = _calEvents.filter(function(o) {
    return o !== d.ev && o.dayIdx === d.dayIdx && o.startMin < newEnd && o.endMin > d.startMin;
  }).map(function(o) { return o.title; });

  _calConfirm(d.ev, d.dayIdx, d.startMin, overlaps);
}

function _calConfirm(ev, dayIdx, startMin, overlaps) {
  var mon  = _calMonday(_calWeekOffset);
  var from = _calDayLabel(_calAddDays(mon, ev.dayIdx)) + ', ' + _calFmt(ev.startMin);
  var to   = _calDayLabel(_calAddDays(mon, dayIdx)) + ', ' + _calFmt(startMin);

  var ov = document.createElement('div');
  ov.className = 'cal-modal';
  ov.innerHTML =
    "<div class='cal-modal-box'>" +
      "<div class='cal-modal-title'>Move " + _calEsc(ev.title) + "?</div>" +
      "<div class='cal-modal-row'><span>From</span>" + _calEsc(from) + "</div>" +
      "<div class='cal-modal-row'><span>To</span><b>" + _calEsc(to) + "</b></div>" +
      "<div class='cal-modal-note'>Only this lesson moves" + (ev.recurring ? ". The rest of the series stays where it is." : ".") + "</div>" +
      (overlaps.length ? "<div class='cal-modal-warn'>Overlaps " + _calEsc(overlaps.join(', ')) + "</div>" : "") +
      (_calSample ? "<div class='cal-modal-note'>Sample data · nothing will be saved.</div>" : "") +
      "<div class='cal-modal-btns'><button class='cal-btn' data-a='no'>Cancel</button><button class='cal-btn cal-btn-go' data-a='yes'>Move</button></div>" +
    "</div>";

  function close(go) {
    document.removeEventListener('keydown', onKey);
    ov.remove();
    if (go) _calSave(ev, dayIdx, startMin); else _calRenderEvents();
  }
  function onKey(k) { if (k.key === 'Escape') close(false); if (k.key === 'Enter') close(true); }
  ov.addEventListener('click', function(c) {
    if (c.target === ov) close(false);
    var a = c.target.getAttribute && c.target.getAttribute('data-a');
    if (a) close(a === 'yes');
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(ov);
}

// ── Controls ────────────────────────────────────────────────────────────────

function _calShift(dir) {
  _calWeekOffset = dir === 0 ? 0 : _calWeekOffset + dir;
  _calLoad();
}

function _calGoogleOpen() {
  var g = document.getElementById('calGoogle');
  return g && g.style.display !== 'none';
}

function _calToggleGoogle() {
  var g  = document.getElementById('calGoogle');
  var ce = document.getElementById('calEmbed');
  var open = !_calGoogleOpen();
  g.style.display = open ? 'block' : 'none';
  if (open && !ce.src) ce.src = ce.getAttribute('data-src');
  var b = document.getElementById('calGoogleBtn');
  if (b) b.textContent = open ? 'Hide Google view' : 'Google view';
}

function _calSetStatus(msg) {
  var s = document.getElementById('calStatus');
  if (s) s.textContent = msg || '';
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function _calMonday(offset) {
  var n = new Date();
  var d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return d;
}
function _calAddDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function _calPad(n) { return (n < 10 ? '0' : '') + n; }
function _calYmd(d) { return d.getFullYear() + '-' + _calPad(d.getMonth() + 1) + '-' + _calPad(d.getDate()); }
function _calDayLabel(d) { return CAL_DAYS[(d.getDay() + 6) % 7] + ' ' + CAL_MONTHS[d.getMonth()] + ' ' + d.getDate(); }
function _calFmt(min) {
  var h = Math.floor(min / 60), m = min % 60;
  return ((h % 12) || 12) + ':' + _calPad(m) + ' ' + (h < 12 ? 'AM' : 'PM');
}
function _calHourLabel(min) { var h = min / 60; return ((h % 12) || 12) + (h < 12 ? ' AM' : ' PM'); }
function _calFade(hex, a) {
  var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}
function _calEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Localhost preview only (no script URL): a believable week to design against.
function _calSampleEvents(mon) {
  var list = [
    [0, 13 * 60 + 15, 'Gene Chou', 'weekly'],
    [0, 16 * 60 + 30, 'Jean Gabriel', 'biweekly'],
    [0, 17 * 60 + 30, 'Weekly Student', 'weekly'],
    [1, 18 * 60 + 30, 'Yaxu', 'biweekly'],
    [1, 19 * 60 + 30, 'Weekly Student', 'weekly'],
    [2, 17 * 60 + 30, 'Jordan', 'biweekly'],
    [2, 19 * 60 + 30, 'Charlotte', 'biweekly'],
    [3, 15 * 60,      'Trial Student', 'trial'],
    [3, 18 * 60 + 30, 'Weekly Student', 'weekly'],
    [4, 17 * 60 + 30, 'Weekly Student', 'weekly'],
    [6, 10 * 60 + 30, 'Flora', 'biweekly'],
    [6, 13 * 60 + 30, 'Cathy', 'weekly']
  ];
  return list.map(function(x, i) {
    var d = _calAddDays(mon, x[0]); d.setHours(0, x[1], 0, 0);
    return { id: 'sample' + i, calType: x[3], title: x[2], date: _calYmd(d), dayIdx: x[0],
             startMin: x[1], endMin: x[1] + 60, startMs: d.getTime(), recurring: x[3] !== 'trial' };
  });
}

function _calInjectStyle() {
  if (document.getElementById('calStyle')) return;
  var st = document.createElement('style');
  st.id = 'calStyle';
  st.textContent =
    // The portal column is narrow; the grid breaks out wider on desktop so all 7 days fit.
    "#calBody,#calGoogle{width:min(1200px,calc(100vw - 40px));position:relative;left:50%;transform:translateX(-50%)}" +
    ".cal-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}" +
    ".cal-btn{padding:6px 12px;font-size:12px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-family:inherit}" +
    ".cal-btn:hover{border-color:#555}" +
    ".cal-btn-go{background:var(--accent);border-color:var(--accent);color:#fff}" +
    ".cal-range{font-size:13px;letter-spacing:1px;min-width:140px;text-align:center}" +
    ".cal-legend{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted);margin-left:8px}" +
    ".cal-legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-left:6px}" +
    ".cal-status{font-size:11px;color:var(--muted);margin-left:auto}" +
    ".cal-wrap{border:1px solid var(--border);border-radius:8px;background:var(--surface);overflow-x:auto}" +
    ".cal-inner{min-width:720px}" +
    ".cal-head,.cal-body{display:grid;grid-template-columns:58px repeat(7,1fr)}" +
    ".cal-head>div{padding:8px 4px;text-align:center;font-size:10px;color:var(--muted);letter-spacing:1px;border-bottom:1px solid var(--border)}" +
    ".cal-head>div.today{color:var(--accent)}" +
    ".cal-head b{display:block;font-size:17px;color:var(--text);font-weight:500;letter-spacing:0;margin-top:2px}" +
    ".cal-head>div.today b{color:var(--accent)}" +
    ".cal-body{position:relative;margin:8px 0}" +
    ".cal-gutter{position:relative}" +
    ".cal-hr{position:absolute;right:8px;font-size:9px;color:var(--muted);transform:translateY(-50%);white-space:nowrap}" +
    ".cal-col{position:relative;border-left:1px solid var(--border)}" +
    ".cal-col.today{background:rgba(232,70,58,0.035)}" +
    ".cal-line{position:absolute;left:58px;right:0;border-top:1px solid var(--border);pointer-events:none}" +
    ".cal-line.half{border-top:1px dashed rgba(255,255,255,0.035)}" +
    ".cal-ev{position:absolute;left:3px;right:3px;z-index:2;border-radius:4px;border-left:3px solid;padding:3px 6px;font-size:11px;line-height:1.25;overflow:hidden;cursor:grab;user-select:none;touch-action:none;color:var(--text)}" +
    ".cal-ev .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".cal-ev .t{font-size:9px;opacity:.7;margin-top:1px}" +
    ".cal-ev.past{opacity:.4;cursor:default}" +
    ".cal-ev.dragging{cursor:grabbing;z-index:6;box-shadow:0 6px 18px rgba(0,0,0,.6);outline:1px solid rgba(255,255,255,.25)}" +
    ".cal-now{position:absolute;left:0;right:0;z-index:4;border-top:2px solid var(--accent);pointer-events:none}" +
    ".cal-now:before{content:'';position:absolute;left:-4px;top:-5px;width:8px;height:8px;border-radius:50%;background:var(--accent)}" +
    ".cal-modal{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}" +
    ".cal-modal-box{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px 20px;width:100%;max-width:360px}" +
    ".cal-modal-title{font-size:14px;margin-bottom:12px}" +
    ".cal-modal-row{font-size:12px;margin:5px 0;display:flex;gap:10px}" +
    ".cal-modal-row span{color:var(--muted);width:40px}" +
    ".cal-modal-note{font-size:11px;color:var(--muted);margin-top:10px}" +
    ".cal-modal-warn{font-size:11px;color:var(--accent2);margin-top:8px}" +
    ".cal-modal-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}";
  document.head.appendChild(st);
}
