// ─── TABS / CALENDAR.JS ─────────────────────────────────────────────────────
// Own week grid over the three RPM calendars (Weekly / Biweekly / Trial).
// Mon–Sun columns, 10:30 AM – 9:30 PM rows. Drag a lesson to a new day/hour,
// or click it → Home's Reschedule / Skip popups from tabs/student.js
// (2026-10-05: a drag used to move straight through moveCalendarEvent_ with
// no log; now it goes through Reschedule, so Reschedule Logs records who
// asked and why). Only that occurrence moves. Google stays the source of
// truth, so the sheets and Secretary keep reading it exactly as before.
// Past lessons can't be dragged or clicked (the counter/income recorder already read them).
// With no script URL (localhost preview) it shows sample lessons; drags there
// don't save anywhere. The plain Google embed lives behind "Google view".

var CAL_DAY_START = 10 * 60 + 30;   // 10:30 AM: the header line is the 10:30 line, the hours run on the half hour like the lessons (user, 2026-11-04; was 10 / 9:30)
var CAL_DAY_END   = 21 * 60 + 30;  // 9:30 PM: the bottom line is the 9:30 line, so an 8:30 lesson fits (user, 2026-11-04)
var CAL_HOUR_PX   = 52;
var CAL_SNAP      = 15;            // drag snaps to 15 minutes
// Our own colours, matched to the red: oklch(0.63 0.19 <hue>), only the hue changes (user, 2026-11-02;
// were Google Calendar's #26a69a / #e91e63 / #f4511e). Weekly blue, biweekly pink, trial green
// (amber went brown in the dark fill).
var CAL_COLORS    = { weekly: 'oklch(0.63 0.19 255)', biweekly: 'oklch(0.63 0.19 350)', trial: 'oklch(0.63 0.19 145)' };
var CAL_DAYS      = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var CAL_MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// A full week (user, 2026-11-03): the VU's 0 and the L / R bars' end.
var CAL_FULL = 20;
var CAL_KNOB = "<span class='cr-knob'><span class='cr-ticks'></span><span class='cr-kn'></span></span>";

var _calWeekOffset = 0;    // 0 = this week
var _calEvents     = [];
var _calSample     = false;
var _calLoadToken  = 0;    // ignore responses for a week we already left

function initCalendarTab() {
  _calInjectStyle();
  _calLoad();
  _calLoadRoster();
}

// ── Student picker ──────────────────────────────────────────────────────────
// Counter names (getStudentRoster, shared with Home and the Lessons tab as
// _imRoster), loaded once. Focus shows them all A–Z; typing keeps the names that
// start with it, like the Home box; ↑↓ light one, Enter opens it, Esc closes.

var _calPickHi = 0;

function _calLoadRoster() {
  var url = getScriptUrl();
  if (!url || _imRoster) return;
  fetch(url + '?action=getStudentRoster')
    .then(function(r) { return r.json(); })
    .then(function(d) { if (d.success && !_imRoster) { _imRoster = d.students || []; _calPickRender(); } })
    .catch(function() {});
}

function _calPickMatches() {
  var el = document.getElementById('calPickIn');
  var q = (el ? el.value : '').trim().toLowerCase();
  return (_imRoster || []).filter(function(n) { return !q || n.toLowerCase().indexOf(q) === 0; });
}

function _calPickToggle() {
  var dd = document.getElementById('calPick');
  if (dd && dd.classList.contains('open')) { _calPickClose(); return; }
  _calPickOpen();
  var i = document.getElementById('calPickIn'); if (i) i.focus();
}

function _calPickOpen() {
  var dd = document.getElementById('calPick');
  if (!dd || dd.classList.contains('open')) return;
  dd.classList.add('open');
  document.getElementById('calPickList').hidden = false;
  _calPickHi = 0;
  _calPickRender();
  setTimeout(function() { document.addEventListener('mousedown', _calPickOutside); }, 0);
}

function _calPickClose() {
  var dd = document.getElementById('calPick');
  document.removeEventListener('mousedown', _calPickOutside);
  if (!dd) return;
  dd.classList.remove('open');
  document.getElementById('calPickList').hidden = true;
  document.getElementById('calPickIn').value = '';
}

function _calPickOutside(e) {
  var dd = document.getElementById('calPick');
  if (!dd || !dd.contains(e.target)) _calPickClose();
}

function _calPickRender() {
  var list = document.getElementById('calPickList');
  if (!list || list.hidden) return;
  var m = _calPickMatches();
  if (_calPickHi >= m.length) _calPickHi = 0;
  list.innerHTML = !_imRoster ? "<div class='cash-dd-opt'>Loading…</div>" :
    m.map(function(n, i) {
      return "<button type='button' class='cash-dd-opt" + (i === _calPickHi ? ' hi' : '') + "' onmouseenter='_calPickHi=" + i + ";_calPickRender()' onclick='_calPickStudent(" + _auEsc(JSON.stringify(n)) + ")'>" + inqEsc(n) + "</button>";
    }).join('');
  var hi = list.querySelector('.hi');
  if (hi) hi.scrollIntoView({ block: 'nearest' });
}

function _calPickKey(e) {
  var m = _calPickMatches();
  if (e.key === 'Escape') { _calPickClose(); e.target.blur(); return; }
  if (!m.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _calPickHi = Math.min(_calPickHi + 1, m.length - 1); _calPickRender(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _calPickHi = Math.max(_calPickHi - 1, 0); _calPickRender(); }
  else if (e.key === 'Enter') { e.preventDefault(); _calPickStudent(m[Math.min(_calPickHi, m.length - 1)]); }
}

function _calPickStudent(name) {
  _calPickClose();
  document.getElementById('calPickIn').blur();
  _calSchedView(name);
}

// The student's next 12 weeks (user, 2026-11-02): Reschedule / Slot change on
// top, the dates numbered, a line, then the weeks as the Change appointment
// window's strips with nothing to tap.
var _calSvName = '', _calSvWeeks = 12;

function _calSchedView(name) {
  _calSvName = name; _calSvWeeks = 12;
  var w = _stWin('calSvWin', inqEsc(name), 'Schedule', CALENDAR_ICON,
    // The Log window's wide look (user, 2026-11-02): left the main column, Calendar view;
    // right a darker 210px column, Reschedule / Slot change at its top and List view,
    // with one line between them running the whole window.
    "<div class='cal-sv-cols'><div class='cal-sv-main'>" +
      "<div class='cal-sv-t'>Calendar view</div><div id='calSvBody'></div>" +
    "</div><div class='cal-sv-side'>" +
      // Reschedule / Slot change at the top of the right column (user, 2026-11-02; were over Calendar view)
      "<div class='cal-sv-acts'>" +
        "<button class='link-btn amber opens-window' onclick='_calSvGo(\"rs\")' data-tip='Opens a window.\nSkip or move one lesson.' data-tip-left>Reschedule</button>" +
        "<button class='link-btn amber opens-window' onclick='_calSvGo(\"slot\")' data-tip='Opens a window.\nChange their regular slot for good.' data-tip-left>Slot change</button>" +
      "</div>" +
      "<div class='cal-sv-t'>List view</div><div class='cal-sv-dates' id='calSvDates'></div>" +
    "</div></div>");
  w.querySelector('.st-win').classList.add('im-rs-win', 'cal-sv-win');
  _calSvLoad();
}

// Reschedule = the Change appointment window; Slot change = the Slot change
// tab's window (tabs/slotchange.js), its student list read first if not yet.
function _calSvGo(what) {
  var name = _calSvName;
  var w = document.getElementById('calSvWin');
  if (w) w.remove();
  if (what === 'rs') { _imReschedule(name, { onDone: function() { _calLoad(); } }); return; }
  _slcInjectStyle();
  _rpmTpStyle();
  var pick = function() {
    var i = _slc.data.students.map(function(x) { return x.name; }).indexOf(name);
    if (i === -1) { rpmToast('half', 'No regular slot', name + ' has no weekly or biweekly slot to change.'); return; }
    _slcPick(i);
  };
  if (_slc.data) { pick(); return; }
  fetch(getScriptUrl() + '?action=getSlotChange')
    .then(function(r) { return r.json(); })
    .then(function(d) { if (!d.success) { rpmToast('fail', 'Unsuccessful', d.message || 'Slot change list did not load.'); return; } _slc.data = d; pick(); })
    .catch(function() { rpmToast('fail', 'Unsuccessful', 'No answer from Google.'); });
}

function _calSvLoad() {
  var url = getScriptUrl(); if (!url) return;
  var name = _calSvName, weeks = _calSvWeeks;
  var dl0 = document.getElementById('calSvDates');
  if (!dl0.firstChild) dl0.innerHTML = "<div class='empty-state rpm-loading'>Loading</div>";
  var box = document.getElementById('calSvBody');
  if (!box.firstChild) box.innerHTML = "<div class='empty-state rpm-loading'>Loading</div>";
  rpmBusy(document.querySelector('#calSvWin .st-win'), null, true, 'Loading');
  fetch(url + '?action=getStudentLessons&weeks=' + weeks + '&name=' + encodeURIComponent(name))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var box = document.getElementById('calSvBody');
      if (!box || weeks !== _calSvWeeks || name !== _calSvName) return;   // closed, or another pick meanwhile
      rpmBusy(document.querySelector('#calSvWin .st-win'), null, false);
      if (!data.success) { box.innerHTML = '<div class="empty-state">Error: ' + inqEsc(data.message || 'unknown') + '</div>'; return; }
      var today = _stToday(), monday = _stMondayOf(today), byDate = {}, n = 0, list = '';
      var endYmd = _stYmd(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + weeks * 7));
      (data.lessons || []).forEach(function(l) {
        if (l.date >= endYmd) return;   // past the last week shown
        byDate[l.date] = l;
        if (new Date(l.stamp) < today) return;
        n++;
        // "Sun, Nov 8 at 2:30 PM", the usual US way (user, 2026-11-02)
        // 1. and at darker; the dates one width, so the ats line up (user, 2026-11-02)
        list += "<div><i>" + n + ".</i><span><b>" + inqEsc(l.dateLabel.replace(' ', ', ')) + "</b> <i>at</i> " + inqEsc(l.time) + "</span></div>";
      });
      var dl = document.getElementById('calSvDates');
      dl.innerHTML = list;
      box.innerHTML = '';
      var strips = document.createElement('div');
      strips.className = 'im-rs-strips cal-sv-strips';
      for (var k = 0; k < weeks; k++) {
        strips.appendChild(_stBuildWeekStrip(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + k * 7), byDate, today, data.student || name, { view: true }));
      }
      box.appendChild(strips);
    })
    .catch(function() {
      var box = document.getElementById('calSvBody');
      if (!box) return;
      rpmBusy(document.querySelector('#calSvWin .st-win'), null, false);
      box.innerHTML = '<div class="empty-state">No answer from Google.</div>';
    });
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
    _calMeters(_calEvents.length, _calEvents.length);
    _calSetStatus('Sample lessons · no data connected');
    return;
  }

  _calSample = false;
  var calBody = document.getElementById('calBody');
  _calSetStatus('');
  rpmBusy(calBody, null, true, 'Loading');   // dim the week + centred LOADING (user, 2026-10-28)
  fetch(url + '?action=getCalendarWeek&weekStart=' + _calYmd(mon))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (token !== _calLoadToken) return;
      rpmBusy(calBody, null, false);
      if (!data.success) { _calSetStatus(data.message ? 'Error: ' + data.message : 'Calendar backend not deployed yet'); return; }
      _calEvents = data.events || [];
      _calRenderEvents();
      _calSetStatus(statusMsg || '');
      _calMeters(_calEvents.length, null);
      // the week after, for the R bar
      fetch(url + '?action=getCalendarWeek&weekStart=' + _calYmd(_calAddDays(mon, 7)))
        .then(function(r) { return r.json(); })
        .then(function(d) { if (token === _calLoadToken && d.success) _calMeters(null, (d.events || []).length); })
        .catch(function() {});
    })
    .catch(function() { if (token === _calLoadToken) { rpmBusy(calBody, null, false); _calSetStatus('Connection failed'); } });
}



// The week display (user, 2026-11-03): CURRENT / NEXT / LAST WEEK over the dates; further away, the dates.
function _calWeekLabel(mon, sun) {
  var dates = (CAL_MONTHS[mon.getMonth()] + ' ' + mon.getDate() + ' – ' + CAL_MONTHS[sun.getMonth()] + ' ' + sun.getDate()).toUpperCase();
  var name = { '0': 'Current week', '1': 'Next week', '-1': 'Last week' }[String(_calWeekOffset)];
  return name ? name.toUpperCase() + "<small>" + dates + "</small>" : dates;
}

// How full a week is: its lessons out of CAL_FULL.
function _calFull(n) { return n == null ? null : n / CAL_FULL; }

// The VU meter: the needle sits at 0 when the week is full, into the red past it.
function _calVuSvg(frac) {
  var cx = 40, cy = 74, R = 46;
  function pt(a, r) { var t = a * Math.PI / 180; return [cx + r * Math.sin(t), cy - r * Math.cos(t)]; }
  function arc(a1, a2) { var p1 = pt(a1, R), p2 = pt(a2, R); return 'M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 0 1 ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1); }
  var marks = [['20', -36], ['10', -25], ['7', -17], ['5', -10], ['3', -3], ['2', 2], ['1', 7], ['0', 13], ['1', 20], ['2', 27], ['3', 34]];
  var out = '';
  marks.forEach(function(m, i) {
    var col = i >= 8 ? '#b8322a' : '#2a2418', p1 = pt(m[1], R), p2 = pt(m[1], R + 3.5), t = pt(m[1], R + 8.5);
    out += "<line x1='" + p1[0].toFixed(1) + "' y1='" + p1[1].toFixed(1) + "' x2='" + p2[0].toFixed(1) + "' y2='" + p2[1].toFixed(1) + "' stroke='" + col + "' stroke-width='.8'/>" +
      "<text x='" + t[0].toFixed(1) + "' y='" + (t[1] + 2).toFixed(1) + "' font-size='5.5' text-anchor='middle' fill='" + col + "'>" + m[0] + "</text>";
  });
  // 0 → −36°, full → 13° (the 0 mark), 1.25 → 34° (+3)
  var a = frac == null ? -40 : frac <= 1 ? -36 + 49 * frac : Math.min(34, 13 + (frac - 1) * 84);
  var n = pt(a, R + 4);
  return "<svg class='cr-vu' viewBox='0 0 84 56' width='66' height='44'><defs>" +
    "<radialGradient id='crGlow' cx='50%' cy='100%' r='90%'><stop offset='0' stop-color='oklch(.86 .06 88)'/><stop offset='.6' stop-color='oklch(.74 .06 82)'/><stop offset='1' stop-color='oklch(.55 .05 75)'/></radialGradient>" +
    "<linearGradient id='crShade' x1='0' y1='0' x2='0' y2='1'><stop offset='.62' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.6'/></linearGradient>" +
    "<radialGradient id='crVig' cx='50%' cy='70%' r='75%'><stop offset='.55' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.5'/></radialGradient></defs>" +
    "<rect x='.5' y='.5' width='83' height='55' rx='4' fill='#0c0c0c' stroke='#333'/><g transform='translate(2,0)'>" +
    "<rect x='2' y='4' width='76' height='48' rx='2' fill='url(#crGlow)'/>" +
    "<path d='" + arc(-36, 13) + "' fill='none' stroke='#2a2418' stroke-width='.8'/><path d='" + arc(13, 34) + "' fill='none' stroke='#b8322a' stroke-width='2.2'/>" + out +
    "<text x='7' y='12' font-size='6.5' font-weight='700' fill='#2a2418'>VU</text><circle cx='71' cy='10' r='2' fill='#2a2a2a' stroke='#555' stroke-width='.5'/>" +
    "<line x1='" + cx + "' y1='" + cy + "' x2='" + n[0].toFixed(1) + "' y2='" + n[1].toFixed(1) + "' stroke='#111' stroke-width='.9'/>" +
    "<rect x='2' y='4' width='76' height='48' rx='2' fill='url(#crVig)'/><rect x='2' y='4' width='76' height='48' rx='2' fill='url(#crShade)'/></g>" +
    "<title>" + (frac == null ? 'This week' : Math.round(frac * CAL_FULL) + ' of ' + CAL_FULL + ' lessons') + "</title></svg>";
}

// Count + meters: L and the VU = the shown week, R = the week after (read once per load).
function _calMeters(n, nNext) {
  var c = document.getElementById('calCount'); if (c && n != null) c.textContent = n;
  var vu = document.getElementById('calVu'); if (vu && n != null) vu.innerHTML = _calVuSvg(_calFull(n));
  [['calMeterL', n], ['calMeterR', nNext]].forEach(function(m) {
    var el = document.getElementById(m[0]);
    if (el && m[1] != null) el.style.setProperty('--v', Math.min(100, Math.round(_calFull(m[1]) * 100)) + '%');
  });
}

// ── Rendering ───────────────────────────────────────────────────────────────

function _calRenderShell(mon) {
  var body = document.getElementById('calBody');
  if (!body) return;
  var sun   = _calAddDays(mon, 6);
  var today = _calYmd(new Date());
  var totalPx = (CAL_DAY_END - CAL_DAY_START) / 60 * CAL_HOUR_PX;

  // The bar as a rack unit (user, 2026-11-03; the mock is _rack-samples.html "Base"): two real
  // controls, the week (‹ ›, the display = back to this week) and STUDENTS ▾; GOOGLE / ANALYZE
  // switches; the VU needle and the L / R bars show how full the week is (CAL_FULL lessons = full).
  // Under the week grid (user, 2026-11-04; was above it).
  var bar =
    "<div class='cal-bar cr'>" +
      "<span class='cr-bolt' style='left:8px;top:10px'></span><span class='cr-bolt' style='left:8px;bottom:10px'></span>" +
      "<span class='cr-bolt' style='right:8px;top:10px'></span><span class='cr-bolt' style='right:8px;bottom:10px'></span>" +
      // one slim row, as wide as the cab (user, 2026-11-03; was two rows at the head's width)
      "<div class='cr-row'>" +
        // the knob at the very left, then the grille, then the lesson count (user, 2026-11-03)
        CAL_KNOB +
        "<span class='cr-vents'><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>" +
        "<span class='cr-cap'>Lessons</span><span class='cr-count' id='calCount'>–</span>" +
        "<span class='cr-sp'></span>" +   // even gaps between the five groups (user, 2026-11-03)
        "<button class='cr-btn' onclick='_calShift(-1)' aria-label='Previous week'>‹</button>" +
        "<div class='cr-lcd" + (_calWeekOffset ? " back" : "") + "'" + (_calWeekOffset ? " onclick='_calShift(0)' data-tip='Back to this week.'" : "") + ">" + _calWeekLabel(mon, sun) + "</div>" +
        "<button class='cr-btn' onclick='_calShift(1)' aria-label='Next week'>›</button>" +
        "<span class='cr-sp'></span>" +
        // STUDENTS ▾ is the dropdown itself: the list, a box to type in, the Schedule window on a pick
        "<span class='cr-dd' id='calPick'>" +
          "<span class='cr-cap cr-ddlab' onclick='_calPickToggle()' data-tip='Opens a student\'s next 12 weeks.'>Students ▾</span>" +
          "<span class='cr-ddpanel'><input class='rpm-field' id='calPickIn' placeholder='Type to find…' autocomplete='off' oninput='_calPickHi=0;_calPickRender()' onkeydown='_calPickKey(event)'>" +
          "<span class='cash-dd-list' id='calPickList' hidden></span></span>" +
        "</span>" +
        "<span class='cr-lr' data-tip='L = this week, R = next week: lessons out of " + CAL_FULL + ".'><b>L</b><i id='calMeterL'></i><b>R</b><i id='calMeterR'></i></span>" +
        "<span class='cr-sp'></span>" +
        "<span class='cr-pair'>" +
          "<span class='cr-col'><button class='cr-pb" + (_calGoogleOpen() ? " lit" : "") + "' id='calGoogleBtn' onclick='_calToggleGoogle()' data-tip='Google Calendar\'s own view under the grid.'></button><span class='cr-cap'>Google</span></span>" +
          "<span class='cr-col'><button class='cr-pb' id='calAnalyzeBtn' data-tip='Coming soon: this week\'s and next week\'s suggested fixes.'></button><span class='cr-cap'>Analyze</span></span>" +
        "</span>" +
        "<span class='cr-sp'></span>" +
        "<span id='calVu'>" + _calVuSvg(null) + "</span>" +
        "<span class='cr-legend'>" +
          "<span class='wk'><i></i>Weekly</span><span class='bi'><i></i>Biweekly</span><span class='tr'><i></i>Trial</span>" +
        "</span>" +
      "</div>" +
    "</div>";
  var html =
    bar +   // the rack back above the week (user, 2026-11-04; was under it)
    "<div class='cal-status' id='calStatus'></div>" +
    "<div class='cal-wrap'><div class='cal-inner'>" +
      // the days row: no screws (user, 2026-11-03)
      "<div class='cal-head'><div></div>";

  for (var d = 0; d < 7; d++) {
    var day = _calAddDays(mon, d);
    html += "<div class='" + (_calYmd(day) === today ? 'today' : '') + "'>" + CAL_DAYS[d].toUpperCase() + "<b>" + day.getDate() + "</b></div>";
  }
  html += "</div><div class='cal-body' id='calGridBody' style='height:" + totalPx + "px'><div class='cal-gutter'>";

  // Hour labels on the half hours (10:30 AM … 9:30 PM), like the lessons; the grid starts at 10:30, on the header line
  for (var m = CAL_DAY_START; m <= CAL_DAY_END; m += 30) {
    var top = (m - CAL_DAY_START) / 60 * CAL_HOUR_PX;
    if (m % 60 === 30) html += "<div class='cal-hr' style='top:" + top + "px'>" + _calHourLabel(m) + "</div>";
  }
  html += "</div>";
  for (var c = 0; c < 7; c++) {
    html += "<div class='cal-col" + (_calYmd(_calAddDays(mon, c)) === today ? ' today' : '') + "' data-day='" + c + "'></div>";
  }
  for (var l = CAL_DAY_START + 30; l < CAL_DAY_END; l += 30) {
    html += "<div class='cal-line" + (l % 60 === 30 ? '' : ' half') + "' style='top:" + ((l - CAL_DAY_START) / 60 * CAL_HOUR_PX) + "px'></div>";
  }
  html += "</div></div></div>";   // no bottom panel, no right column (user, 2026-11-03)
  body.innerHTML = html;
}

function _calRenderEvents() {
  var cols = document.querySelectorAll('#calGridBody .cal-col');
  if (!cols.length) return;
  for (var i = 0; i < cols.length; i++) cols[i].innerHTML = '';

  var mon = _calMonday(_calWeekOffset);
  var now = new Date();
  _calLayoutLanes();

  _calEvents.forEach(function(ev) {
    var col = cols[ev.dayIdx];
    if (!col) return;
    var s = Math.max(ev.startMin, CAL_DAY_START);
    var e = Math.min(ev.endMin, CAL_DAY_END);
    if (e <= s) return; // entirely outside 10:30–9:30

    var color = CAL_COLORS[ev.calType] || '#777';
    var el = document.createElement('div');
    var endDate = _calAddDays(mon, ev.dayIdx); endDate.setHours(0, ev.endMin, 0, 0);
    ev.past = endDate < now;
    el.className = 'cal-ev' + (ev.past ? ' past' : '');
    el.style.top    = ((s - CAL_DAY_START) / 60 * CAL_HOUR_PX) + 'px';
    el.style.height = Math.max(((e - s) / 60 * CAL_HOUR_PX) - 2, 16) + 'px';
    if (ev._lanes > 1) {   // shares its time with another lesson: side by side, like Google Calendar
      el.style.left  = 'calc((100% - 3px) * ' + ev._lane + ' / ' + ev._lanes + ' + 3px)';
      el.style.width = 'calc((100% - 3px) / ' + ev._lanes + ' - 3px)';
      el.style.right = 'auto';
    }
    // Solid, not see-through, one even fill, no left bar (user, 2026-11-02): a dark mix of the colour.
    el.style.backgroundColor = 'color-mix(in oklab, ' + color + ' 24%, #1a1a1a)';   // colour only: the shading comes from .cal-ev
    el.title = ev.title + ' · ' + _calFmt(ev.startMin) + (ev.past ? ' · past, locked' : ' · click: skip / reschedule · drag: move');
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

// Lessons on the same day whose times overlap (2026-10-15): each gets a lane (ev._lane) and the group shares
// the column width (ev._lanes). A group is every lesson chained by overlaps; a lane is reused once its lesson ends.
function _calLayoutLanes() {
  var byDay = {};
  _calEvents.forEach(function(ev) { (byDay[ev.dayIdx] = byDay[ev.dayIdx] || []).push(ev); });
  Object.keys(byDay).forEach(function(k) {
    var list = byDay[k].sort(function(a, b) { return a.startMin - b.startMin || b.endMin - a.endMin; });
    var group = [], laneEnds = [], groupEnd = -1;
    function close() { group.forEach(function(g) { g._lanes = laneEnds.length; }); group = []; laneEnds = []; }
    list.forEach(function(ev) {
      if (ev.startMin >= groupEnd) close();
      var lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > ev.startMin) lane++;
      laneEnds[lane] = ev.endMin;
      ev._lane = lane;
      group.push(ev);
      groupEnd = Math.max(groupEnd, ev.endMin);
    });
    close();
  });
}

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

// Smooth drag (user, 2026-11-02: it was slow and glitchy): the columns are measured once when
// the drag starts, the card stays in its own column and slides with a transform (moving it into
// another column dropped the pointer capture), and it updates once per frame.
function _calDragMove(e) {
  var d = _calDrag;
  if (!d) return;
  if (!d.moved && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 5) return;
  if (!d.moved) {
    d.moved = true;
    d.el.classList.add('dragging');
    d.el.style.left = '3px'; d.el.style.right = '3px'; d.el.style.width = '';   // full width while it moves
    d.rects = [].map.call(document.querySelectorAll('#calGridBody .cal-col'), function(c) { return c.getBoundingClientRect(); });
    d.top0 = parseFloat(d.el.style.top) || 0;
    d.t = d.el.querySelector('.t');
  }
  d.cx = e.clientX; d.cy = e.clientY;
  if (!d.raf) d.raf = requestAnimationFrame(function() { d.raf = 0; _calDragPaint(d); });
}

function _calDragPaint(d) {
  if (_calDrag !== d) return;
  var rs = d.rects, dayIdx = d.ev.dayIdx;
  for (var i = 0; i < rs.length; i++) {
    if (d.cx >= rs[i].left && d.cx < rs[i].right) { dayIdx = i; break; }
    if (i === 0 && d.cx < rs[i].left) { dayIdx = 0; break; }
    if (i === rs.length - 1 && d.cx >= rs[i].right) dayIdx = i;
  }
  var dur   = d.ev.endMin - d.ev.startMin;
  var raw = d.ev.startMin + (d.cy - d.y) / CAL_HOUR_PX * 60, start;
  if (d.ev.recurring) {
    // Regular lessons land only on half past, an hour at a time; trials keep 15-minute steps (user, 2026-11-04)
    start = Math.round((raw - 30) / 60) * 60 + 30;
    start = Math.min(Math.max(start, Math.ceil((CAL_DAY_START - 30) / 60) * 60 + 30), Math.floor((CAL_DAY_END - dur - 30) / 60) * 60 + 30);
  } else {
    start = d.ev.startMin + Math.round((raw - d.ev.startMin) / CAL_SNAP) * CAL_SNAP;
    start = Math.min(Math.max(start, CAL_DAY_START), CAL_DAY_END - dur);
  }
  var dx = rs[dayIdx].left - rs[d.ev.dayIdx].left;
  var dy = ((start - CAL_DAY_START) / 60 * CAL_HOUR_PX) - d.top0;
  d.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  if (start !== d.startMin) d.t.textContent = _calFmt(start);
  d.dayIdx = dayIdx; d.startMin = start;
}

function _calDragEnd() {
  var d = _calDrag;
  _calDrag = null;
  if (!d) return;
  if (d.raf) cancelAnimationFrame(d.raf);
  d.el.removeEventListener('pointermove', _calDragMove);
  d.el.removeEventListener('pointerup', _calDragEnd);
  d.el.removeEventListener('pointercancel', _calDragEnd);
  d.el.classList.remove('dragging');
  if (!d.moved) { _calRenderEvents(); _calOpenActions(d.ev); return; }
  if (d.dayIdx === d.ev.dayIdx && d.startMin === d.ev.startMin) { _calRenderEvents(); return; }

  var mon      = _calMonday(_calWeekOffset);
  var target   = _calAddDays(mon, d.dayIdx); target.setHours(0, d.startMin, 0, 0);
  if (target < new Date()) { _calRenderEvents(); _calSetStatus("Can't move a lesson into the past"); return; }

  var newEnd   = d.startMin + (d.ev.endMin - d.ev.startMin);
  var overlaps = _calEvents.filter(function(o) {
    return o !== d.ev && o.dayIdx === d.dayIdx && o.startMin < newEnd && o.endMin > d.startMin;
  }).map(function(o) { return o.title; });

  // The same Reschedule / Skip box a click opens (2026-10-05), so a drag is
  // logged with who asked and why. Reschedule starts at the dropped day/time.
  _calRenderEvents();
  _calOpenActions(d.ev, { ymd: _calYmd(_calAddDays(mon, d.dayIdx)), time: _calFmt(d.startMin),
    label: _calDayLabel(_calAddDays(mon, d.dayIdx)) + ' · ' + _calFmt(d.startMin), overlaps: overlaps });
}

// ── Controls ────────────────────────────────────────────────────────────────

// Click or drag on a lesson → Home's Reschedule / Skip chooser and popups
// (tabs/student.js): same backend, same Skip Logs and Reschedule Logs. A drag
// passes `to` (dropped day, time, overlaps) so Reschedule starts there.
// Results refresh this grid.
function _calOpenActions(ev, to) {
  if (_calSample) { _calSetStatus('Sample only · Skip / Reschedule need real data'); return; }
  var p = ev.date.split('-');
  var lesson = { date: ev.date, dateLabel: _calDayLabel(new Date(+p[0], +p[1] - 1, +p[2])), time: _calFmt(ev.startMin),
                 id: ev.id, stamp: ev.startMs };   // id + stamp → backend acts on this exact event
  // A click (no drag) opens the Change appointment window (user, 2026-10-27), the
  // Log window's 8 weeks with this lesson picked: ✕ skips it, a green day's ✓ moves it.
  // A drag, or a lesson outside those 8 weeks, keeps the Skip / Reschedule chooser.
  var today = _stToday(), last = _stMondayOf(today); last = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 56);
  var d0 = new Date(+p[0], +p[1] - 1, +p[2]);
  if (!to && d0 >= today && d0 < last && typeof _imReschedule === 'function') {
    _imReschedule(ev.title, { pre: ev.date, time: lesson.time, onDone: function() { _calLoad(); } });
    return;
  }
  _stOpenLessonActions(ev.title, lesson, {
    fromCalendar: true,
    to: to,
    // No success line (2026-10-05): the window closes and the grid redraws
    // with the lesson in its new spot; a failure shows in the window itself.
    onDone: function() { _calLoad(); },
    onFail: function() {}
  });
}

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
  if (b) b.classList.toggle('lit', open);   // the GOOGLE button lit while the view is open
}

function _calSetStatus(msg, busy) {
  var s = document.getElementById('calStatus');
  if (!s) return;
  if (busy) s.innerHTML = "<span class='rpm-loading is-inline'>" + msg + "</span>";   // spinning ring while it loads (user, 2026-10-21)
  else s.textContent = msg || '';
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
function _calHourLabel(min) { var h = Math.floor(min / 60), m = min % 60; return ((h % 12) || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h < 12 ? ' AM' : ' PM'); }
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
    // ── The rack (user, 2026-11-03): the amp head's frame, handles, screws, two 64px rows ──
    // a rack unit, not an amp: one thin border; its edges line up with the cab's outer ring (user, 2026-11-03)
    ".cal-bar.cr{position:relative;box-sizing:border-box;margin:0 0 12px;border:1px solid #2c2c2c;border-radius:6px;background-color:var(--box)}" +
    ".cr-row{display:flex;align-items:center;gap:10px;height:64px;padding:0 40px}.cr-row+.cr-row{border-top:1px solid #2c2c2c}" +
    ".cr-sp{flex:1}.cr-pair{display:inline-flex;gap:10px}" +
    ".cr-bolt{position:absolute;width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6a6a6a,#2b2b2b 55%,#111 80%);box-shadow:0 1px 2px #000,inset 0 0 0 1px #0a0a0a}" +
    ".cr-bolt:before,.cr-bolt:after{content:'';position:absolute;left:3px;right:3px;top:6.5px;height:2px;background:#111;border-radius:1px}.cr-bolt:after{transform:rotate(90deg)}" +
    ".cr-knob{position:relative;flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center}" +
    ".cr-ticks{position:absolute;inset:0;background:repeating-conic-gradient(from -136deg,#555 0 2deg,transparent 2deg 27deg);" +
      "-webkit-mask:radial-gradient(circle,transparent 17px,#000 18px,#000 21px,transparent 22px),conic-gradient(from -137deg,#000 0 274deg,transparent 274deg);-webkit-mask-composite:source-in;" +
      "mask:radial-gradient(circle,transparent 17px,#000 18px,#000 21px,transparent 22px),conic-gradient(from -137deg,#000 0 274deg,transparent 274deg);mask-composite:intersect}" +
    ".cr-kn{position:relative;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 40% 30%,#4a4a4a,#1c1c1c 60%,#0e0e0e);box-shadow:0 2px 4px #000,inset 0 1px 0 rgba(255,255,255,.1)}" +
    ".cr-kn:after{content:'';position:absolute;left:14px;top:3px;width:2px;height:9px;border-radius:1px;background:#ddd}" +
    ".cr-btn{flex:none;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:1px solid #2c2c2c;border-radius:4px;background:#151515;color:var(--t-faint);font:12px 'DM Mono',monospace;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 1px 0 #000}" +   // the arrows in the now line's grey (user, 2026-11-03) +
    ".cr-btn:hover{border-color:#555}" +
    ".cr-lcd{flex:none;height:44px;min-width:190px;padding:0 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.25;border-radius:3px;background:#0a0c0a;border:1px solid #222;" +
      "box-shadow:inset 0 2px 6px rgba(0,0,0,.8);font:12px 'DM Mono',monospace;letter-spacing:2px;color:oklch(.72 .08 145);text-shadow:0 0 5px oklch(.63 .19 145 / .35)}" +
    ".cr-lcd small{font-size:10px;letter-spacing:1.5px;opacity:.75}.cr-lcd.back{cursor:pointer}.cr-lcd.back:hover{color:oklch(.80 .09 145)}" +
    ".cr-col{display:flex;flex-direction:column;align-items:center;gap:4px}" +
    ".cr-cap{font:8px 'DM Mono',monospace;letter-spacing:1.2px;text-transform:uppercase;color:#6e6e6e;white-space:nowrap}" +
    ".cr-pb{width:22px;height:22px;padding:0;border-radius:3px;background:linear-gradient(#3a3a3a,#232323);box-shadow:0 1px 0 #000,inset 0 1px 0 rgba(255,255,255,.12);border:1px solid #111;cursor:pointer}" +
    ".cr-pb.lit{background:linear-gradient(oklch(.65 .16 29),oklch(.54 .17 29));box-shadow:0 0 6px oklch(.63 .19 29 / .4),inset 0 1px 0 rgba(255,255,255,.35)}" +
    "#calAnalyzeBtn{cursor:default}" +
    ".cr-vu{display:block;flex:none;font-family:'DM Mono',monospace;filter:brightness(.88) drop-shadow(0 1px 1px #000)}" +
    ".cr-vents{display:flex;gap:4px}.cr-vents i{width:3px;height:18px;border-radius:2px;background:#0a0a0a;box-shadow:inset 0 1px 1px #000,0 1px 0 #1f1f1f}" +
    ".cr-count{min-width:40px;height:26px;padding:0 10px;display:flex;align-items:center;justify-content:center;border-radius:2px;background:#1b1006;border:1px solid #000;box-shadow:inset 0 2px 5px rgba(0,0,0,.9);" +
      "font:500 10px 'DM Mono',monospace;letter-spacing:1.5px;color:oklch(.72 .14 70);text-shadow:0 0 5px oklch(.63 .19 60 / .4)}" +
    ".cr-dd{position:relative}.cr-ddlab{cursor:pointer;user-select:none}.cr-ddlab:hover,.cr-dd.open .cr-ddlab{color:var(--t-text)}" +
    ".cr-ddpanel{display:none;position:absolute;bottom:calc(100% + 10px);left:-10px;z-index:20;width:210px;padding:6px;border-radius:8px;background:#121212;border:1px solid #333;box-shadow:0 8px 20px rgba(0,0,0,.6)}" +
    ".cr-dd.open .cr-ddpanel{display:block}.cr-ddpanel .rpm-field{width:100%;font-size:12px;margin-bottom:4px}" +
    ".cr-ddpanel .cash-dd-list{position:static;display:block;max-height:280px;border:none;box-shadow:none;padding:0;background:transparent}" +
    ".cr-lr{height:26px;width:80px;padding:0 6px;display:grid;grid-template-columns:7px 1fr;align-content:center;gap:3px 4px;align-items:center;border-radius:3px;background:#0a0c0a;border:1px solid #222;box-shadow:inset 0 2px 6px rgba(0,0,0,.8)}" +
    ".cr-lr b{font:500 7px 'DM Mono',monospace;color:oklch(.72 .08 145 / .75);text-shadow:0 0 6px oklch(.63 .19 145 / .4)}" +
    ".cr-lr i{--v:0%;display:block;height:5px;border-radius:1px;background:repeating-linear-gradient(90deg,transparent 0 5px,#0a0c0a 5px 6px),linear-gradient(90deg,oklch(.72 .08 145) 0 var(--v),oklch(.28 .04 145) var(--v));box-shadow:0 0 5px oklch(.63 .19 145 / .25);transition:--v .4s}" +
    ".cr-legend{display:flex;flex-direction:column;gap:3px}.cr-legend span{display:inline-flex;align-items:center;gap:5px;font:8px 'DM Mono',monospace;letter-spacing:1.2px;text-transform:uppercase;color:#6e6e6e}" +
    ".cr-legend i{width:6px;height:6px;border-radius:50%;opacity:.85}" +
    ".cr-legend .wk i{background:" + CAL_COLORS.weekly + ";box-shadow:0 0 4px " + CAL_COLORS.weekly + "}.cr-legend .bi i{background:" + CAL_COLORS.biweekly + ";box-shadow:0 0 4px " + CAL_COLORS.biweekly + "}.cr-legend .tr i{background:" + CAL_COLORS.trial + ";box-shadow:0 0 4px " + CAL_COLORS.trial + "}" +
    ".cal-status{min-height:0;margin:0 auto 10px;text-align:center;font-size:11px;color:var(--t-faint)}.cal-status:empty{display:none}" +
    ".cal-btn{padding:6px 10px;white-space:nowrap;font-size:12px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-family:inherit}" +
    ".cal-btn:hover:where(:not(:disabled)){border-color:#555}" +
    ".cal-sv-acts{position:absolute;top:24px;right:0;display:flex;flex-direction:column;align-items:flex-end;gap:10px}" +
    ".st-win.cal-sv-win{width:min(702px,96vw);background-image:linear-gradient(to right,transparent calc(100% - 250px),color-mix(in srgb,#ffffff 11%,transparent) calc(100% - 250px),color-mix(in srgb,#ffffff 11%,transparent) calc(100% - 249px),rgba(0,0,0,.22) calc(100% - 249px));background-attachment:local}" +
    ".st-win.cal-sv-win>.settings-title{margin-right:242px}" +
    ".cal-sv-cols{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:32px;align-items:start}" +
    ".cal-sv-t{font-family:'DM Mono',monospace;font-size:11.5px;letter-spacing:2.5px;text-transform:uppercase;color:#7c7c7c;margin:0 0 12px}" +
    ".cal-sv-main .cal-sv-t{margin-top:8px;margin-bottom:16px}.cal-sv-side{position:absolute;top:-106px;bottom:-24px;right:0;width:210px;display:flex;flex-direction:column;justify-content:center}" +   // no lines (user, 2026-11-02); List view centred in the whole window's height, as the Log window's Shortcuts
    ".cal-sv-dates{display:flex;flex-direction:column;gap:6px;font-size:12px}" +
    // List rows: just the days, no borders (user, 2026-11-02).
    ".cal-sv-strips{margin-top:0}.cal-sv-dates>div:not(.empty-state){display:flex;align-items:baseline;gap:12px;padding:5px 2px;color:var(--t-normal)}" +
    ".cal-sv-dates i{font-style:normal;color:var(--t-faint)}.cal-sv-dates>div>i{width:20px;text-align:right}.cal-sv-dates b{display:inline-block;min-width:11ch;font-weight:normal}" +
    ".cal-sv-strips button,.cal-sv-strips button[data-past='0'][data-has='0']{cursor:default}" +
    ".cal-btn-go{background:var(--accent);border-color:var(--accent);color:#fff}" +
    // A speaker cab under the amp head (user, 2026-11-02): the head's frame, a dark rounded inner line
    // inside a 4px body ring with its own rounded edge (styles.css .header::before).
    "#calBody.rpm-busy>.cal-wrap{opacity:0}#calBody.rpm-busy>.cal-bar{opacity:1}" +   // loading: the rack stays, the week fades out   // loading: just LOADING, no ghost of the week under it (user, 2026-11-02)
    ".cal-wrap{margin:0;overflow-x:auto}.cal-inner{border:1px solid #2c2c2c;border-radius:6px;background-color:var(--box);position:relative}" +   // Google's lines (user, 2026-11-04): header + hour lines fade out on the right, day lines only a short tick in the header, nothing past the frame
    ".cal-head{overflow:visible}.cal-head::after{content:'';position:absolute;left:60px;right:0;bottom:0;height:1px;background:linear-gradient(to right,#2c2c2c calc(100% - 80px),transparent);pointer-events:none}" +
    ".cal-head::before{content:'';position:absolute;left:72px;height:22px;bottom:0;border-left:1px solid #2c2c2c;pointer-events:none;z-index:1}" +   // the hours' line: a short tick above the header line; the body's own line carries it down
    "" +   // the rack's thin border, not the amp's double ring (user, 2026-11-03)
    // Two backgrounds (user, 2026-11-02): the days row and the hours column lighter (#1c1c1c), the
    // lessons inside a plain darker #101010 (no grain, which lifted it to the frame's shade); a #2c2c2c line between.
    ".cal-inner{min-width:700px}" +
    // A neutral grain (grey specks, no cream) whose lift (~8 steps, measured) is taken off the base, so
    // the average stays #1c1c1c / #101010: texture without changing the colour (user, 2026-11-02).
    ".cal-head{position:relative;background:transparent}.cal-head-ear{position:relative}" +   // days row + hours on the rack's own surface (the box shade + its grain, from .cal-wrap) (user, 2026-11-03)
    ".cal-body{background:linear-gradient(to right,transparent 72px,#2c2c2c 72px,#2c2c2c 73px,transparent 73px) padding-box}" +   // the inside plain #101010; the frame lines 1px like the rack's (user, 2026-11-03)
    ".cal-head,.cal-body{display:grid;grid-template-columns:72px repeat(7,1fr)}" +   // a roomier hours column for 10:30 AM (user, 2026-11-04; was 60, 44px)
    "" +
    ".cal-head>div{padding:12px 4px;white-space:nowrap;text-align:center;font-size:10px;color:var(--muted);letter-spacing:1px}" +
    // One colour inside the frame; the day lines run up past the header and down past the grid, the hour lines a bit into the hours column, like Google's (user, 2026-11-04)
    ".cal-head>div{position:relative}.cal-head>div:nth-child(n+3)::before{content:'';position:absolute;left:0;bottom:0;height:22px;border-left:1px solid var(--border)}" +
    "" +
    ".cal-head b{display:block;height:22px;line-height:22px;font-size:inherit;color:inherit;font-weight:inherit;letter-spacing:inherit;margin:3px 0 0}" +   // the date under the day name, like Google's (user, 2026-11-04; was on the same line)
    ".cal-body{position:relative;margin:0;box-sizing:content-box;border-bottom:62px solid transparent}" +   // the space under the 9:30 PM line = the header's height above the 10 AM line (user, 2026-11-04)
    "" +
    // The bottom like the header (user, 2026-11-04): a line that fades in on the left and out on the right, the day lines run 22px past it and stop
    ".cal-body::after{content:'';position:absolute;left:60px;right:0;top:100%;height:1px;background:linear-gradient(to right,#2c2c2c calc(100% - 80px),transparent);pointer-events:none}" +
    ".cal-body::before{content:'';position:absolute;left:72px;top:100%;height:22px;border-left:1px solid #2c2c2c;pointer-events:none}" +
    ".cal-col+.cal-col::after{content:'';position:absolute;left:-1px;top:100%;height:22px;border-left:1px solid var(--border);pointer-events:none}" +
    ".cal-gutter{position:relative}" +
    ".cal-hr{position:absolute;right:16px;font-size:9px;color:var(--muted);transform:translateY(-50%);white-space:nowrap}" +
    ".cal-col{position:relative;border-left:1px solid var(--border)}" +
    // today: only the green name + round date badge, no column wash (user, 2026-11-04)
    ".cal-head>div.today{color:oklch(.72 .08 145)}" +
    ".cal-head>div.today b{width:22px;height:22px;line-height:22px;margin:3px auto 0;border-radius:50%;background:oklch(.72 .08 145);color:#0a0c0a;letter-spacing:0;font-weight:600}" +
    ".cal-line{position:absolute;left:60px;right:24px;height:1px;background:var(--border);pointer-events:none}" +   // the hour lines stop short of the frame, no fade; only the header line fades (user, 2026-11-04)
    "" +
    ".cal-line.half{height:0;background:none;border-top:1px dashed rgba(255,255,255,0.045);right:24px}" +
    // Lesson cards made like the GOOGLE / ANALYZE buttons: a top-lit gradient over the colour, a thin dark edge, a light top line, a black under-shadow (user, 2026-11-04)
    ".cal-ev{position:absolute;left:3px;right:3px;z-index:2;border-radius:4px;padding:3px 8px;box-sizing:border-box;border:1px solid #111;background-image:linear-gradient(rgba(255,255,255,.07),rgba(0,0,0,.22));box-shadow:0 1px 0 #000,inset 0 1px 0 rgba(255,255,255,.12);font-size:11px;line-height:1.25;overflow:hidden;cursor:grab;user-select:none;touch-action:none;color:var(--t-text)}" +
    ".cal-ev .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".cal-ev .t{font-size:9px;color:var(--t-normal);margin-top:1px}" +
    ".cal-ev.past{cursor:default}" +   // past lessons look the same as the rest, just locked (user, 2026-11-04; were dimmed)
    ".cal-ev.dragging{cursor:grabbing;z-index:6;will-change:transform;box-shadow:0 6px 18px rgba(0,0,0,.6);outline:1px solid rgba(255,255,255,.25)}" +
    ".cal-now{position:absolute;left:0;right:0;z-index:4;height:4px;margin-top:-2px;border-radius:2px;background:linear-gradient(#3a3a3a,#232323);box-shadow:0 1px 0 #000,inset 0 1px 0 rgba(255,255,255,.12);pointer-events:none}" +
    ".cal-now:before{content:'';position:absolute;left:-5px;top:-3px;width:10px;height:10px;border-radius:50%;background:linear-gradient(#3a3a3a,#232323);box-shadow:0 1px 0 #000,inset 0 1px 0 rgba(255,255,255,.12)}" +   // the now line made like the GOOGLE button: its grey gradient, top highlight, dark under-shadow (user, 2026-11-04; was a flat --t-faint)
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
