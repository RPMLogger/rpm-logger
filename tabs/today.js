// ─── TABS / TODAY.JS ────────────────────────────────────────────────────────
// Today (2026-10-06): a glance at the day. Today's students in lesson order,
// one under the other: name · Quick look, then their Lessons log, Last HW and
// Notes (import.js's _imStudentHtml, no buttons). Everyone loads as soon as
// the tab opens. Resets by day: a new day starts empty and reads the
// calendar again.

var _td = { day: null, data: {} };   // data: key → { lessons, hw, detail, failed }

function _tdYmd() {
  var d = new Date(), m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
}

function initTodayTab() {
  _imIn = 'today';
  var day = _tdYmd();
  if (_td.day !== day) _td = { day: day, data: {} };
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
}

function _tdRender() {
  var body = document.getElementById('todayBody');
  if (!body) return;
  var list = todayStudents || [];
  var now = new Date();
  var head = '<div class="settings-title"><span>Today<span class="win-sub"> · ' +
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()] + ', ' + MONTHS[now.getMonth()] + ' ' + now.getDate() + '</span></span></div>';
  if (!list.length) { body.innerHTML = head + '<div class="empty-state">No lessons today</div>'; return; }
  list.forEach(function (s) { if (!_td.data[_imKey(s.name)]) _tdLoad(s.name); });
  body.innerHTML = head + list.map(function (s) {
    return '<div class="td-student" data-key="' + _auEsc(_imKey(s.name)) + '">' + _tdStudentHtml(s) + '</div>';
  }).join('');
  _imFixTips(body);
}

function _tdStudentHtml(s) {
  // Name · Quick look (2026-10-06, was the lesson time).
  var d = _td.data[_imKey(s.name)] || {}, sub = 'Quick look';
  var title = '<div class="settings-title im-title"><span>' + inqEsc(s.name) + '<span class="win-sub"> · ' + sub + '</span></span></div>';
  if (d.failed) return title + '<div class="empty-state">Could not read: ' + inqEsc(d.failed) + '</div>';
  if (!d.lessons) return title + '<div class="empty-state rpm-loading">Loading</div>';
  return _imStudentHtml(s.name, d.lessons, d.hw, d.detail, { sub: sub });
}

// Redraw one student's part when their reads come in.
function _tdDrawOne(name) {
  var key = _imKey(name), el = document.querySelector('#todayBody .td-student[data-key="' + key.replace(/"/g, '') + '"]');
  var s = (todayStudents || []).filter(function (x) { return _imKey(x.name) === key; })[0];
  if (!el || !s) return;
  el.innerHTML = _tdStudentHtml(s);
  _imFixTips(el);
}

// The three reads for one student. Each one redraws that student's part.
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
  get('getStudentDetail', '&name=' + encodeURIComponent(name))
    .then(function (r) { if (r.success) { d.detail = r; done(); } })
    .catch(function () {});
}

// After a lesson or its HW is logged for them: read that student again.
function _tdRefresh(name) {
  delete _td.data[_imKey(name)];
  _tdLoad(name);
}
