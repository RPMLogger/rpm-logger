// ─── TABS / REPORT.JS ───────────────────────────────────────────────────────
// Report (2026-11-16, user): what the Day Clock rack keeps quiet, per day and per student —
//   Booked   the calendar's time
//   Start    when teaching really started (the rack's button / Lesson Times)
//   End      when it ended
//   Lesson   the counter: minutes teaching
//   Log      how long logging took (Log Times, the Log window's silent timer)
//   Lag      how long after the booked end the recap email went out (Lesson Recaps K/L)
// Opened from the sidebar under Lessons, or the rack's Report button (tabs/dayclock.js).
// One read, getDayReport (RPM_LessonTimes.js). Today / Last 7 days / Last 30 days picks the range.
// Portal Usage look (tabs/usage.js): ld-card boxes, css shares #tab-general's rules.

var _rpData = {}, _rpView = 'week';
var RP_DAYS = { today: 1, week: 7, month: 30 };
var RP_MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var RP_WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function _rpYmd(d) { var m = d.getMonth() + 1, x = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (x < 10 ? '0' : '') + x; }
function _rpEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _rpClock(min) {
  if (min == null) return '';
  var h = Math.floor(min / 60), m = min % 60;
  return ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM');
}
function _rpBooked(L) {   // "3:00 – 3:50 PM"
  if (L.bs == null) return '';
  var a = _rpClock(L.bs), b = _rpClock(L.be);
  return a.slice(-2) === b.slice(-2) ? a.slice(0, -3) + ' – ' + b : a + ' – ' + b;
}
function _rpLen(min) {   // 52 → "52 min", 75 → "1h 15m"
  if (min == null) return '';
  min = Math.round(min);
  return min < 60 ? min + ' min' : Math.floor(min / 60) + 'h ' + (min % 60 < 10 ? '0' : '') + min % 60 + 'm';
}
function _rpLog(min) { return min == null ? '' : (Math.round(min * 10) / 10).toFixed(1) + ' min'; }
function _rpLag(min) {   // "+45m", "+2h 15m", "+1d 3h"
  if (min == null) return '';
  if (min < 0) return 'before end';
  if (min < 60) return '+' + min + 'm';
  if (min < 1440) return '+' + Math.floor(min / 60) + 'h ' + (min % 60 < 10 ? '0' : '') + min % 60 + 'm';
  var d = Math.floor(min / 1440), h = Math.round((min % 1440) / 60);
  if (h === 24) { d++; h = 0; }
  return '+' + d + 'd ' + h + 'h';
}
function _rpDayName(day) {
  var p = day.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
  return RP_WD[d.getDay()] + ', ' + RP_MO[d.getMonth()] + ' ' + d.getDate() + (day === _rpYmd(new Date()) ? ' · today' : '');
}
function _rpAvg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
function _rpMid(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); return a[Math.floor(a.length / 2)]; }

function initReportTab() {
  try { _rpView = localStorage.getItem('reportView') || 'week'; } catch (e) {}
  _rpRender();
  _rpLoad(_rpView);
}

function _rpSetView(v) {
  _rpView = v;
  try { localStorage.setItem('reportView', v); } catch (e) {}
  _rpRender();
  _rpLoad(v);
}

function _rpLoad(v) {
  var url = getScriptUrl();
  if (!url) return;
  var to = new Date(), from = new Date(); from.setDate(to.getDate() - RP_DAYS[v] + 1);
  fetch(url + '?action=getDayReport&from=' + _rpYmd(from) + '&to=' + _rpYmd(to))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) throw new Error(d && d.message || 'No answer');
      _rpData[v] = d.days || [];
      if (v === _rpView) _rpRender();
    })
    .catch(function () { if (!_rpData[v]) { _rpData[v] = 'error'; if (v === _rpView) _rpRender(); } });
}

function _rpCell(v, cls) { return '<span class="rp-c' + (cls ? ' ' + cls : '') + '">' + (v === '' || v == null ? '<span class="rp-none">–</span>' : v) + '</span>'; }
function _rpHead() {
  return '<div class="rp-row rp-hd">' + ['Student', 'Booked', 'Start', 'End', 'Lesson', 'Log', 'Lag'].map(function (h) { return '<span class="rp-c">' + h + '</span>'; }).join('') + '</div>';
}

// One box per day: a row per student, then the day's totals.
function _rpDay(D) {
  var nowMin = new Date().getHours() * 60 + new Date().getMinutes(), today = D.day === _rpYmd(new Date());
  var rows = D.lessons.map(function (L) {
    var ahead = today && L.be != null && L.be > nowMin && L.as == null;   // later today: nothing to show yet
    var lag = L.lag != null ? _rpLag(L.lag) : (ahead ? '' : '<span class="rp-wait">not sent</span>');
    return '<div class="rp-row">' +
      _rpCell(_rpEsc(L.name), 'rp-nm') + _rpCell(_rpBooked(L)) + _rpCell(_rpClock(L.as)) + _rpCell(_rpClock(L.ae)) +
      _rpCell(_rpLen(L.teach)) + _rpCell(_rpLog(L.log)) + _rpCell(lag) + '</div>';
  }).join('');
  var teach = D.lessons.filter(function (L) { return L.teach != null; }).map(function (L) { return L.teach; });
  var log = D.lessons.filter(function (L) { return L.log != null; }).map(function (L) { return L.log; });
  var lag = D.lessons.filter(function (L) { return L.lag != null; }).map(function (L) { return L.lag; });
  var sum = function (a) { return a.reduce(function (s, x) { return s + x; }, 0); };
  var n = D.lessons.length;
  var tot = '<div class="rp-row rp-tot">' + _rpCell('Day') + _rpCell(n + (n === 1 ? ' lesson' : ' lessons')) + _rpCell('') + _rpCell('') +
    _rpCell(teach.length ? _rpLen(sum(teach)) : '') + _rpCell(log.length ? _rpLog(sum(log)) : '') +
    _rpCell(lag.length ? 'avg ' + _rpLag(Math.round(_rpAvg(lag))) : '') + '</div>';
  return '<div class="inq-dcard ld-card"><div class="ld-title">' + _rpDayName(D.day) + '</div>' + _rpHead() + rows + tot + '</div>';
}

// The range's averages, on top.
function _rpSummary(days) {
  var all = [];
  days.forEach(function (D) { all = all.concat(D.lessons); });
  var pick = function (k) { return all.filter(function (L) { return L[k] != null; }).map(function (L) { return L[k]; }); };
  var teach = pick('teach'), log = pick('log'), lag = pick('lag').filter(function (x) { return x >= 0; });
  var row = function (l, v, sub, lead) {
    return '<div class="ld-row' + (lead ? ' lead' : '') + '"><span class="ld-l">' + l + '</span><span class="ld-v">' + (v || '–') +
      (sub ? '<span class="us-note"> · ' + sub + '</span>' : '') + '</span></div>';
  };
  var sameDay = lag.filter(function (x) { return x < 12 * 60; }).length;
  return '<div class="inq-dcard ld-card rp-sum"><div class="ld-title">Averages</div>' +
    row('Lessons', String(all.length), days.length + (days.length === 1 ? ' day' : ' days'), true) +
    row('Lesson length', _rpLen(_rpAvg(teach)), teach.length ? teach.length + ' timed' : 'none timed yet') +
    row('Logging a lesson', _rpLog(_rpAvg(log)), log.length ? log.length + ' timed' : '') +
    row('Lag · average', _rpLag(lag.length ? Math.round(_rpAvg(lag)) : null), lag.length ? lag.length + ' recaps' : '') +
    row('Lag · middle', _rpLag(_rpMid(lag))) +
    row('Sent within 12 hours', lag.length ? Math.round(100 * sameDay / lag.length) + '%' : '') +
    '</div>';
}

function _rpRender() {
  var body = document.getElementById('reportBody');
  if (!body) return;
  document.querySelectorAll('#reportViews .link-btn').forEach(function (b) { b.classList.toggle('lit', b.dataset.view === _rpView); });
  var d = _rpData[_rpView];
  if (!d) { body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>'; return; }
  if (d === 'error') { body.innerHTML = '<div class="empty-state">Couldn\'t load the report.</div>'; return; }
  var days = d.filter(function (D) { return D.lessons.length; });
  if (!days.length) { body.innerHTML = '<div class="empty-state">No lessons in this range.</div>'; return; }
  body.innerHTML = '<div class="ld-cards">' + (days.length > 1 ? _rpSummary(days) : '') + days.map(_rpDay).join('') + '</div>';
}
