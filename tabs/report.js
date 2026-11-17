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

function _rpHm(min) { var h = Math.floor(min / 60), m = min % 60; return ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m; }   // 2:53, no AM/PM

// Time lost (user, 2026-11-16): the minutes taught past 50 in each lesson — a lesson is 50 min,
// anything longer is given away. Only lessons the rack timed. → { lost, by: [[first name, minutes], ...] }
var RP_LEN = 50;
function _rpLost(D) {
  var lost = 0, by = [];
  _rpTaught(D).forEach(function (L) {
    var over = (L.teach || L.ae - L.as) - RP_LEN;
    if (over > 0) { lost += over; by.push([String(L.name).trim().split(/\s+/)[0], over]); }
  });
  return { lost: lost, by: by };
}

// Three lines on one scale (user, 2026-11-16): green = the lessons at 50 min each, grey = the
// hour slots (50 + 10 each), red = what was really taught. Red past green = time lost.
function _rpBars(tg) {
  if (!tg.length) return '';
  var n = tg.length, should = n * RP_LEN, slots = n * 60;
  var taught = tg.reduce(function (s, L) { return s + (L.teach || L.ae - L.as); }, 0);
  var max = Math.max(should, slots, taught);
  var bar = function (lbl, cls, v, note) {
    return '<span class="rp-lbl">' + lbl + '</span><div class="rp-bar-row"><span class="rp-bar ' + cls + '" style="width:calc((100% - 210px) * ' + (v / max).toFixed(3) + ')"></span>' +   // room left for the minutes
      '<span class="rp-bar-v">' + Math.round(v) + ' min' + (note ? '<span class="rp-by"> · ' + note + '</span>' : '') + '</span></div>';
  };
  // One bordered graph (user, 2026-11-16): a dashed mark at the lessons' total runs through all three
  return '<div class="rp-graph"><div class="rp-grid rp-bars"><div class="rp-mark-row"><span class="rp-mark" style="left:calc((100% - 210px) * ' + (should / max).toFixed(3) + ')"></span></div>' +
    bar('Lessons', 'g', should) +   // just the numbers, no notes (user, 2026-11-16)
    bar('Slots', 'k', slots) +
    bar('Taught', 'r', taught) +
    '</div></div>';
}

// Day recap (user's sketch, 2026-11-16; tidied to the payment Details window's look the same day):
// today's lessons on one time scale, in the Recap window from the rack (rpRecapOpen).
//   hours on top, then BOOKED (the calendar's slots, dashed chips with the name) and
//   TAUGHT (the rack's real start → end, green chips with the minutes). Then the three lines (_rpBars). Hover a green chip
//   for the times, minutes lost past 50, log and recap lag. Under 5 minutes timed = a mis-press, left off.
function _rpTaught(D) { return D.lessons.filter(function (L) { return L.as != null && L.ae != null && L.ae - L.as >= 5; }).sort(function (a, b) { return a.as - b.as; }); }
function _rpLine(D) {
  var bk = D.lessons.filter(function (L) { return L.bs != null && L.be > L.bs; }), tg = _rpTaught(D);
  if (!bk.length && !tg.length) return '';
  var all = [];
  bk.forEach(function (L) { all.push(L.bs, L.be); });
  tg.forEach(function (L) { all.push(L.as, L.ae); });
  var t0 = Math.floor(Math.min.apply(null, all) / 30) * 30, t1 = Math.ceil(Math.max.apply(null, all) / 30) * 30, span = Math.max(t1 - t0, 60);   // half hours (user, 2026-11-16)
  var x = function (t) { return ((t - t0) / span * 100).toFixed(2) + '%'; };
  var w = function (a, b) { return 'left:' + x(a) + ';width:calc(' + x(b) + ' - ' + x(a) + ' - 4px)'; };   // 4px apart, like the grid's cells
  var booked = bk.map(function (L) {
    return '<div class="rp-chip bk" style="' + w(L.bs, L.be) + '">' + _rpEsc(String(L.name).trim().split(/\s+/)[0]) + '</div>';
  }).join('');
  var taught = tg.map(function (L) {
    var tip = _rpEsc(L.name) + '\n' + _rpClock(L.as) + ' – ' + _rpClock(L.ae) +
              ((L.teach || L.ae - L.as) > RP_LEN ? '\nExtra teaching (lost) ' + ((L.teach || L.ae - L.as) - RP_LEN) + ' min' : '') +
              (L.log != null ? '\nLogged in ' + _rpLog(L.log) : '') + (L.lag != null ? '\nRecap ' + _rpLag(L.lag) : '');
    var span = L.ae - L.as, red = span > RP_LEN ? '<span class="rp-over" style="left:' + (RP_LEN / span * 100).toFixed(2) + '%"></span>' : '';   // past 50 min turns red (user, 2026-11-16)
    return '<div class="rp-chip tg" style="' + w(L.as, L.ae) + '" data-tip="' + tip + '" data-tip-wrap>' + red + '<span class="rp-chip-t">' + _rpLen(L.teach || span) + '</span></div>';
  }).join('');
  var hours = '';
  var marks = '';
  for (var t = t0; t <= t1; t += 30) if (t % 60) {   // only the half hours (user, 2026-11-16), each with a dashed line down through the slots
    hours += '<span class="rp-hr" style="left:' + x(t) + '">' + ((Math.floor(t / 60) + 11) % 12 + 1) + ':30</span>';
    marks += '<span class="rp-vl" style="left:' + x(t) + '"></span>';
  }
  return '<div class="rp-sec">Timeline</div><div class="rp-box"><div class="rp-grid"><div class="rp-vls">' + marks + '</div>' +   // in a border too (user, 2026-11-16)
    '<span></span><div class="rp-trk rp-hrs">' + hours + '</div>' +
    '<span class="rp-lbl">Booked</span><div class="rp-trk">' + booked + '</div>' +
    '<span class="rp-lbl">Taught</span><div class="rp-trk">' + taught + '</div>' +
    '</div></div>';   // the bar graph moved under Total (user, 2026-11-17)
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

// The range's averages, under the days (user, 2026-11-16; were on top).
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
  body.innerHTML = '<div class="ld-cards">' + days.map(_rpDay).join('') + (days.length > 1 ? _rpSummary(days) : '') + '</div>';   // Averages at the bottom (user, 2026-11-16)
  if (typeof _imFixTips === 'function') _imFixTips(body);
}

// ─── DAY RECAP WINDOW (user, 2026-11-16) ────────────────────────────────────
// The rack's Recap button (tabs/dayclock.js): today on one window — time lost first,
// then the booked / taught line. The rest stays on the Report tab (link at the bottom).
function rpRecapOpen() {
  var ov = document.getElementById('rpRecapOv');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'settings-overlay';
    ov.id = 'rpRecapOv';
    ov.innerHTML = '<div class="settings-modal rp-recap-win" id="rpRecapWin"></div>';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) rpRecapClose(); });
    document.body.appendChild(ov);
  }
  ov.classList.add('open');
  _rpRecapPaint();
  var url = getScriptUrl(), day = _rpYmd(new Date());
  if (!url) return;
  fetch(url + '?action=getDayReport&from=' + day + '&to=' + day)
    .then(function (r) { return r.json(); })
    .then(function (d) { if (!d || !d.success) throw new Error(d && d.message); _rpData.today = d.days || []; _rpRecapPaint(); })
    .catch(function () { if (!_rpData.today) { _rpData.today = 'error'; _rpRecapPaint(); } });
}
function rpRecapClose() { var ov = document.getElementById('rpRecapOv'); if (ov) ov.classList.remove('open'); }

// Total extra = THE day number (user, 2026-11-17: "10 min extra teaching is fine if it all fits in
// the 3 hours"): time actually worked (first start → last end of each back-to-back block) minus the
// time booked for those blocks; 6:32 → 9:33 for a 180-min block = +1 min. null = nothing fully timed.
function _rpWorked(bl) {
  var used = 0, booked = 0, i = 0;
  while (i < bl.length) {
    var j = i; while (j < bl.length - 1 && bl[j + 1].bs <= bl[j].be) j++;
    var blk = bl.slice(i, j + 1), t = blk.filter(function (x) { return x.as != null && x.ae != null && x.ae - x.as >= 5; });
    if (t.length === blk.length) {   // only blocks timed end to end
      used += Math.max.apply(null, t.map(function (x) { return x.ae; })) - Math.min.apply(null, t.map(function (x) { return x.as; }));
      booked += blk[blk.length - 1].be - blk[0].bs;
    }
    i = j + 1;
  }
  return booked ? used - booked : null;
}
function _rpRecapPaint() {
  var win = document.getElementById('rpRecapWin');
  if (!win) return;
  var d = _rpData.today, day = _rpYmd(new Date());
  var D = Array.isArray(d) ? d.filter(function (x) { return x.day === day; })[0] : null;
  var body;
  if (!d) body = '<div class="empty-state rpm-loading">Loading</div>';
  else if (d === 'error') body = '<div class="empty-state">Couldn\'t load today.</div>';
  else if (!D || !D.lessons.length) body = '<div class="empty-state">No lessons today.</div>';
  else {
    var L = _rpLost(D), tg = _rpTaught(D);
    // Total extra + Hours side by side at the very top (user, 2026-11-17; Late finish dropped)
    var bl = D.lessons.filter(function (x) { return x.bs != null && x.be != null; }).sort(function (a, b) { return a.bs - b.bs; });
    var ex = _rpWorked(bl);
    var big = function (l, v, cls) { return '<div><span class="rp-bl">' + l + '</span><span class="rp-bv ' + cls + '">' + v + '</span></div>'; };
    var top = '<div class="rp-card rp-top"><div class="rp-big">' +
      // Total extra = the cards' extras added up; the over-the-booked-hours number in ( ) after Hours (user, 2026-11-17)
      big('Total extra', tg.length ? (L.lost ? '+' + _rpLen(L.lost) : '0 min') : '—', tg.length && L.lost ? 'rp-amb' : 'rp-dim') +
      big('Hours', tg.length ? _rpClock(tg[0].as) + ' → ' + _rpClock(tg[tg.length - 1].ae) +
        (ex != null ? ' <span class="rp-hx' + (ex > 0 ? ' rp-amb' : '') + '">(' + (ex > 0 ? '+' + ex : '0') + ')</span>' : '') : '—', tg.length ? '' : 'rp-dim') + '</div></div>';
    // Then Timeline, Lesson length, and the bar graph under Total (user, 2026-11-17)
    body = top + _rpLine(D) +
      // Each lesson its own small box (user, 2026-11-16): start, end, teaching (past 50 in red),
      // late (how long after the booked start I started). No chat (user).
      '<div class="rp-sec">Lesson length</div>' +
      '<div class="rp-cards">' + D.lessons.map(function (x) {
        var nm = _rpEsc(String(x.name).trim().split(/\s+/)[0]), timed = x.as != null && x.ae != null && x.ae - x.as >= 5;
        var r = function (l, v) { return '<span class="rp-cl">' + l + '</span><span class="rp-cv">' + v + '</span>'; };
        // Untimed: just a dim dash, centred (user, 2026-11-17)
        if (!timed) return '<div class="rp-card rp-untimed"><div class="rp-cn">' + nm + '</div><div class="rp-dash">—</div></div>';
        var m = x.teach || x.ae - x.as, over = m - RP_LEN, late = x.bs != null ? x.as - x.bs : null;
        // The two numbers that matter big: extra taught + late start; times small underneath (user, 2026-11-17)
        return '<div class="rp-card"><div class="rp-cn">' + nm + '</div><div class="rp-big">' +
          big('Extra', over > 0 ? '+' + over : '0', over > 0 ? 'rp-amb' : 'rp-dim') +
          big('Late', late == null ? '–' : late > 0 ? late + ' min' : 'On time', late > 0 ? '' : 'rp-dim') +   // Extra amber, Late grey (user, 2026-11-17)
          '</div><div class="rp-big rp-sub">' + big('Start', _rpClock(x.as), '') + big('End', _rpClock(x.ae), '') + '</div></div>';   // Start + End small at the bottom (user, 2026-11-17)
      }).join('') + '</div>' +
      // Titles above the boxes, all in the Bebas title font (user, 2026-11-17)
      (tg.length ? '<div class="rp-sec">Total</div>' + _rpBars(tg) : '');
  }
  win.innerHTML = '<div class="settings-title"><span>Day recap<span class="win-sub"> · ' + _rpDayName(day).replace(' · today', '') + '</span></span>' +
      '<button class="settings-close" onclick="rpRecapClose()">✕</button></div>' +
    '<div class="rp-icon">' + TIME_ICON + '</div>' + body +
    '<div class="rp-recap-foot"><button class="link-btn" onclick="rpRecapClose();switchTab(\'report\')">Full report</button></div>';
  if (typeof _imFixTips === 'function') _imFixTips(win);
}

