// ─── TABS / TODAY.JS ────────────────────────────────────────────────────────
// Today (2026-10-06): a glance at the day. Today's students in lesson order,
// one under the other: name · Quick look, then their Lessons log and Last HW
// (import.js's _imStudentHtml, no buttons; no Notes since 2026-10-09).
// Everyone loads as soon as the tab opens. Resets by day: a new day starts empty and reads the
// calendar again. One card at a time (2026-10-09): the names in the list at
// the top are buttons; one opens that student's card, another swaps to theirs.
// The reads already ran, so it opens at once.

var _td = { day: null, data: {}, sel: null };   // data: key → { lessons, hw, detail, failed }; sel: the open card's key

function _tdYmd() {
  var d = new Date(), m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
}

function initTodayTab() {
  _imIn = 'today';
  var day = _tdYmd();
  if (_td.day !== day) _td = { day: day, data: {}, sel: null };
  var body = document.getElementById('todayBody');
  // The calendar read (fetchWeekStudents) is from an earlier day: read it again.
  if (window._weekFetchedDay && window._weekFetchedDay !== day) {
    body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
    var url = getScriptUrl(); if (url) fetchWeekStudents(url);
    return;
  }
  if (!window._weekFetchedDay) { body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>'; return; }
  _tdRender();
}

// fetchWeekStudents (core/api.js) calls this once today's students are in.
function _tdWeekReady() {
  var p = document.getElementById('tab-today');
  if (p && p.classList.contains('active')) initTodayTab();
  // Import's card list puts today's students first: redraw it once the week is read.
  var ip = document.getElementById('tab-import');
  if (ip && ip.classList.contains('active') && !_imOpen && _imRoster) _imRenderCards();
}

// One colour for every Today card (2026-10-09, was one per student): red on
// the card's edge, the name, and its badge in the list at the top.
var TD_COLOR = '#e8463a';
function _tdColor() { return TD_COLOR; }

function _tdTime(iso) {
  var m = String(iso || '').match(/T(\d{2}):(\d{2})/);
  if (!m) return '';
  var h = parseInt(m[1], 10);
  return ((h % 12) || 12) + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM');
}

function _tdRender() {
  var body = document.getElementById('todayBody');
  if (!body) return;
  var list = todayStudents || [];
  var now = new Date();
  var head = '<div class="settings-title"><span>Today<span class="win-sub"> · ' +
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()] + ', ' + MONTHS[now.getMonth()] + ' ' + now.getDate() + '</span></span>' +
    '<button class="link-btn td-week-btn" onclick="_tdWeekOpen()">' + CALENDAR_ICON + '<span>Week</span></button></div>';
  // A day off (2026-10-08): the resting figure over the line (om-82).
  if (!list.length) { body.innerHTML = head + '<div class="empty-state td-rest">' + REST_ICON + '<div>No lessons today!</div></div>'; return; }
  list.forEach(function (s) { if (!_td.data[_imKey(s.name)]) _tdLoad(s.name); });
  // At the top (2026-10-06): how many, and a mini list of times + names; a
  // name jumps to its card.
  var mini = '<div class="db-cx-head im-sec-head td-count"><label class="field-label db-cx-t">' + list.length + (list.length === 1 ? ' student' : ' students') + '</label></div>' +
    '<hr class="divider td-rule td-rule-top">' +
    '<div class="db-panel im-list td-mini">' + list.map(function (s, i) {
      // The name is the portal's plain link button; the open one stays lit (2026-10-09).
      return '<div class="td-mini-row' + (_td.sel === _imKey(s.name) ? ' td-on' : '') + '" id="tdMini' + i + '">' +
        '<span class="td-mini-t">' + _tdTime(s.eventDate) + '</span><button class="link-btn td-mini-b" onclick="_tdJump(' + i + ')">' + inqEsc(s.name) + '</button></div>';
    }).join('') + '</div>' +
    '<hr class="divider td-rule">';   // lines under the count and between the list and the card (2026-10-09)
  body.innerHTML = head + mini + list.map(function (s, i) {
    return '<div class="td-student' + (_td.sel === _imKey(s.name) ? ' td-open' : '') + '" id="tdCard' + i + '" style="--td-c:' + _tdColor(i) + '" data-key="' + _auEsc(_imKey(s.name)) + '">' + _tdStudentHtml(s) + '</div>';
  }).join('');
  _imFixTips(body);
}

// A name in the list at the top opens that card and closes the one that was
// open; their name again (or the card's name row) closes it. Kept for the day.
function _tdJump(i) {
  var el = document.getElementById('tdCard' + i);
  if (!el) return;
  var key = el.getAttribute('data-key');
  _td.sel = _td.sel === key ? null : key;
  document.querySelectorAll('#todayBody .td-student').forEach(function (c) { c.classList.toggle('td-open', c.getAttribute('data-key') === _td.sel); });
  document.querySelectorAll('#todayBody .td-mini-row').forEach(function (r, j) { r.classList.toggle('td-on', j === i && !!_td.sel); });
}
function _tdToggle(i) { _tdJump(i); }

function _tdStudentHtml(s) {
  // Name · Quick look (2026-10-06, was the lesson time), with a chevron: the
  // whole row opens and closes the card (2026-10-09).
  var d = _td.data[_imKey(s.name)] || {}, i = (todayStudents || []).indexOf(s);
  var title = '<div class="settings-title im-title td-head" onclick="_tdToggle(' + i + ')"><span>' + inqEsc(s.name) +
    '<span class="win-sub"> · Quick look</span></span><span class="td-chev">' + dtArrow(-1) + '</span></div>';
  var body = d.failed ? '<div class="empty-state">Could not read: ' + inqEsc(d.failed) + '</div>'
    : !d.lessons ? '<div class="empty-state rpm-loading">Loading</div>'
    : _imStudentHtml(s.name, d.lessons, d.hw, null, { noTitle: true, noNotes: true });
  // The PREVIEW stamp under the name (om-84, 2026-10-09).
  return title + '<div class="td-body"><img class="td-stamp" src="img/preview-stamp.svg" alt="">' + body + '</div>';
}

// Redraw one student's part when their reads come in.
function _tdDrawOne(name) {
  var key = _imKey(name), el = document.querySelector('#todayBody .td-student[data-key="' + key.replace(/"/g, '') + '"]');
  var s = (todayStudents || []).filter(function (x) { return _imKey(x.name) === key; })[0];
  if (!el || !s) return;
  el.innerHTML = _tdStudentHtml(s);
  _imFixTips(el);
}

// The two reads for one student (Notes' detail read dropped with Notes, 2026-10-09). Each one redraws that student's part.
function _tdLoad(name) {
  var key = _imKey(name), day = _td.day, url = getScriptUrl();
  if (!url) return;
  var d = _td.data[key] = _td.data[key] || {};
  function done() { if (_td.day === day) _tdDrawOne(name); }
  function get(action, q) { return fetch(url + '?action=' + action + q).then(function (r) { return r.json(); }); }
  get('getPastLessons', '&count=9999&studentName=' + encodeURIComponent(name))
    .then(function (r) {
      if (r.success) { d.lessons = r.lessons || []; d.failed = null; }
      else if (/no sheet/i.test(r.message || '')) d.lessons = [];   // a trial: no Import tab yet
      else d.failed = r.message || 'unknown';
      done();
    })
    .catch(function () { d.failed = 'No answer from Google.'; done(); });
  get('getHwLog', '&name=' + encodeURIComponent(name))
    .then(function (r) { if (r.success) { d.hw = { rows: r.rows || [] }; done(); } })
    .catch(function () {});
}

// After a lesson or its HW is logged for them: read that student again.
function _tdRefresh(name) {
  delete _td.data[_imKey(name)];
  _tdLoad(name);
}

// ── Week window (2026-10-09; was its own Week tab) ──
// This week's lessons, Mon–Sun, read-only: one group per day (a day off: one line, OPEN for its date), time + name like
// the list at the top of Today. Every day looks the same (no dimming: Today is the tab for today).
// The count under the icon in Today's heading, weekly · biweekly under it.
function _tdWeekOpen() {
  var list = (typeof weekStudents !== 'undefined' && weekStudents) || [];
  var DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var mon = new Date(today); mon.setDate(today.getDate() - (today.getDay() + 6) % 7);
  var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  function md(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  var n = function (t) { return list.filter(function (s) { return s.calType === t; }).length; };
  // How many, in Today's "3 students" heading; weekly · biweekly under it, trial only when there is one.
  var body = '<div class="db-cx-head im-sec-head td-wk-head"><label class="field-label db-cx-t">' + list.length + (list.length === 1 ? ' student' : ' students') + '</label></div>' +
    '<div class="td-wk-count">' + n('weekly') + ' weekly · ' + n('biweekly') + ' biweekly' + (n('trial') ? ' · ' + n('trial') + ' trial' : '') + '</div>' +
    '<hr class="divider td-wk-rule">';   // a line under the counts, like Today's under "3 students"
  // The calendar read isn't in yet: say so, don't claim an empty week.
  if (!window._weekFetchedDay) body = '<div class="empty-state rpm-loading">Loading</div>';
  else if (!list.length) body += '<div class="empty-state">No lessons this week</div>';
  DAYS.forEach(function (day, i) {
    var rows = list.filter(function (s) { return s.dayOfWeek === day; });
    if (!list.length) return;
    var d = new Date(mon); d.setDate(mon.getDate() + i);
    body += '<div class="td-wk-day"><label class="field-label"><span class="td-wk-dn">' + day.slice(0, 3) + '</span>' +   // short day (MON), the date in the names' column
      // A day off is one short line: OPEN in the date's place, small and grey (2026-10-09).
      (rows.length ? '<span class="td-wk-date">' + md(d) + '</span>' : '<span class="td-wk-none">Open</span>') + '</label>' +
      rows.map(function (s) {
        return '<div class="td-mini-row"><span class="td-mini-t">' + _tdTime(s.eventDate) + '</span><span class="td-wk-name">' + inqEsc(s.name) + '</span></div>';
      }).join('') + '</div>';
  });
  _stWin('tdWeekWin', 'This Week', md(mon) + ' – ' + md(sun), CALENDAR_ICON, body);
}
