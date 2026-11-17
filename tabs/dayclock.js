// ─── TABS / DAYCLOCK.JS ─────────────────────────────────────────────────────
// Day Clock (2026-11-16, user): the day as a time sheet, in the Portal Usage look.
//   A rack unit (user's sketch, 2026-11-16; replaced the Usage-look box): the clock on the left, then one
//   section per lesson on today's calendar with START / COUNTER / END screens and one button. It drives the SAME lesson timer as the
//               ▶ / ■ icons on a student's page (tabs/lessontimer.js, localStorage lessonTimer), so
//               there is one timer, not two. Start on the next student stops the one running first.
//   Not stopped: a lesson the timer ended by itself at 75 min (forgot ■) shows FIX; its button corrects it.
// Saved rows come from Counter "Lesson Times" (getLessonTimes, RPM_LessonTimes.js); booked times from
// the calendar read the portal already does (todayStudents, core/api.js).
// Next steps (agreed 2026-11-16): log lag per lesson, three days side by side, then an archive.

var DC_LEN = 50, DC_AUTO = 75;   // booked minutes when the calendar gives no end; the timer's auto-off
var _dcRows = null, _dcDay = '', _dcN = -1;   // saved Lesson Times rows for _dcDay

function _dcYmd(d) { d = d || new Date(); var m = d.getMonth() + 1, x = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (x < 10 ? '0' : '') + x; }
function _dcEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function _dcMinOfIso(iso) { var m = String(iso || '').match(/T(\d{2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; }
function _dcMinOfStr(s) {
  var m = String(s || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!m) return null;
  return (+m[1] % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + +m[2];
}
function _dcMinOfMs(ms) { var d = new Date(ms); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }
function _dcClock(min) {
  if (min == null) return '–';
  min = Math.floor(min);
  var h = Math.floor(min / 60), m = min % 60;
  return ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM');
}
function _dcDur(min) {
  min = Math.max(0, Math.round(min));
  var h = Math.floor(min / 60), m = min % 60;
  return h ? h + 'h ' + (m < 10 ? '0' : '') + m + 'm' : m + ' min';
}

function initDayClockTab() {
  var day = _dcYmd();
  if (_dcDay !== day) { _dcRows = null; _dcDay = day; }
  _dcRender();
  _dcLoad();
}

function _dcLoad() {
  var url = getScriptUrl(), day = _dcDay;
  if (!url) return;
  fetch(url + '?action=getLessonTimes&day=' + day)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) throw new Error(d && d.message || 'No answer');
      if (day !== _dcDay) return;
      _dcRows = d.rows || [];
      _dcRender();
    })
    .catch(function () { if (!_dcRows) { _dcRows = []; _dcRender(); } });
}

// Everything the tab shows, worked out from the calendar, the saved rows, and the timer running now.
function _dcModel() {
  var now = Date.now(), nowMin = _dcMinOfMs(now);
  var run = typeof _ltmGet === 'function' ? _ltmGet() : null;
  if (run && _ltmYmd(run.marks[0].at) !== _dcDay) run = null;
  var saved = (_dcRows || []).slice(), lessons = [];

  (todayStudents || []).forEach(function (s) {
    var k = _ltmKey(s.name), bs = _dcMinOfIso(s.eventDate), be = _dcMinOfIso(s.eventEnd);
    if (be == null && bs != null) be = bs + DC_LEN;
    var L = { name: s.name, key: k, bs: bs, be: be };
    var i = -1;
    saved.some(function (r, j) { if (_ltmKey(r.name) === k) { i = j; return true; } return false; });
    if (i >= 0) {
      var r = saved.splice(i, 1)[0];
      L.as = _dcMinOfStr(r.start); L.ae = _dcMinOfStr(r.end); L.len = r.teach; L.row = r.row; L.auto = r.teach >= DC_AUTO;
    } else if (run && run.key === k) {
      var st = _ltmAt(run, 'teach') || run.marks[0].at;
      L.as = _dcMinOfMs(st); L.len = _ltmSums(run, now).teach / 60; L.running = true;
    } else if (typeof _ltmDone !== 'undefined' && _ltmDone[k] && _ltmYmd(_ltmDone[k].marks[0].at) === _dcDay) {
      var t = _ltmDone[k];   // just stopped, not read back from the sheet yet
      L.as = _dcMinOfMs(_ltmAt(t, 'teach') || t.marks[0].at); L.ae = _dcMinOfMs(t.left); L.len = _ltmSums(t, t.left).teach / 60;
    }
    lessons.push(L);
  });
  saved.forEach(function (r) {   // timed but not on today's calendar (an extra lesson)
    lessons.push({ name: r.name, key: _ltmKey(r.name), bs: null, be: null, as: _dcMinOfStr(r.start), ae: _dcMinOfStr(r.end), len: r.teach, row: r.row, auto: r.teach >= DC_AUTO });
  });
  lessons.sort(function (a, b) { var x = a.bs != null ? a.bs : a.as, y = b.bs != null ? b.bs : b.as; return (x || 0) - (y || 0); });

  var tot = { teach: 0, booked: 0, gaps: 0, over: 0, done: 0, first: null }, prevEnd = null;
  lessons.forEach(function (L) {
    if (L.bs != null) tot.booked += L.be - L.bs;
    if (L.as != null) {
      if (tot.first == null || L.as < tot.first) tot.first = L.as;
      if (prevEnd != null && L.as > prevEnd) { L.gap = L.as - prevEnd; L.gapFrom = prevEnd; tot.gaps += L.gap; }
      tot.teach += L.len || 0;
      if (!L.running && L.bs != null && !L.auto) { tot.over += (L.len || 0) - (L.be - L.bs); tot.done++; }
      prevEnd = L.running ? nowMin : L.ae;
    }
  });
  return { lessons: lessons, tot: tot, run: run, nowMs: now };
}

// The rack (user's sketch, 2026-11-16): the clock on the left, then one section per lesson —
// the name engraved on top, one button (start / stop), and START · COUNTER · END screens.
function _dcSec(L, m) {
  var arg = _auEsc(JSON.stringify(L.name)), tip, fn, on = false, off = false;
  if (L.running) { fn = 'dcStop'; tip = 'Stops the lesson.'; on = true; }
  else if (L.as == null) { fn = 'dcStart'; tip = m.run ? 'Starts the lesson.\nStops ' + _dcEsc(m.run.name) + ' first.' : 'Starts the lesson.'; }
  else if (L.auto) { fn = 'dcFix'; tip = 'Never stopped: the timer ended it at ' + DC_AUTO + ' min.\nSet when it really ended.'; }
  else { off = true; tip = 'Done.'; }
  var call = fn === 'dcFix' ? 'dcFix(' + L.row + ',' + arg + ',' + (L.be != null ? L.be : 'null') + ')' : fn + '(' + arg + ')';
  var scr = function (cap, v, k) { return '<span class="dc-cap hr-cap">' + cap + '</span><span class="dc-lcd"' + (k ? ' data-dc="' + k + '"' : '') + '>' + v + '</span>'; };
  return '<div class="dc-sec' + (on ? ' on' : '') + (L.auto ? ' auto' : '') + '">' +
    '<span class="dc-nm hr-cap">' + _dcEsc(String(L.name).trim().split(/\s+/)[0]) + '</span>' +   // first name only, like the sketch (user, 2026-11-16)
    '<div class="dc-body">' +
      '<span class="dc-ctl"><i class="mr-led dc-led"></i>' +   // a light on top, lit soft amber while counting (user, 2026-11-16)
      '<button class="dc-key"' + (off ? ' disabled' : ' onclick="' + call + '"') + ' data-tip="' + tip + '" data-tip-wrap></button></span>' +   // a lit push button, not a knob (user, 2026-11-16, photo)
      '<div class="dc-scr">' +
        // no START screen (user, 2026-11-16): only the count; the start is still saved
        scr('Count', L.running ? _dcCount(L.len) : L.auto ? 'FIX' : '', L.running ? 'run' : '') +   // no END screen (user, 2026-11-16: thinner); the end is still saved
      '</div></div></div>';
}
function _dcCount(min) { var s = Math.max(0, Math.floor(min * 60)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + s % 60; }

function _dcRender() {
  var rack = document.getElementById('dcRack');
  if (!rack) return;
  _dcN = (todayStudents || []).length;
  var m = _dcRows === null ? { lessons: [] } : _dcModel();
  var secs = _dcRows === null ? '<div class="dc-sec dc-msg"><span class="dc-lcd">LOADING</span></div>' :
    !m.lessons.length ? '<div class="dc-sec dc-msg"><span class="dc-lcd">NO LESSONS TODAY</span></div>' :
    m.lessons.map(function (L) { return _dcSec(L, m); }).join('');
  rack.innerHTML = '<span class="hr-bolt" style="left:10px"></span><span class="hr-bolt" style="right:10px"></span>' +
    '<div class="dc-row">' +
      '<div class="dc-sec dc-clk"><span class="dc-nm hr-cap">Clock</span><span class="dc-lcd dc-big" id="dcNow"></span></div>' +
      secs +
      // Recap (user, 2026-11-16): today's day recap in a window (rpRecapOpen, tabs/report.js); the rest on the Report tab
      '<div class="dc-sec dc-rep"><span class="dc-nm hr-cap">Recap</span><div class="dc-body">' +   // a window, not the tab (user, 2026-11-16)
        '<button class="dc-key" onclick="rpRecapOpen()" data-tip="Opens a window.\nToday: time lost, booked vs taught." data-tip-wrap></button></div></div>' +
      '</div>';
  _dcClockPaint();
  if (typeof _imFixTips === 'function') _imFixTips(rack);
}

function _dcClockPaint() {
  var n = document.getElementById('dcNow');
  if (n) n.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
// Every second: the clock and the running counter. The button stays put.
function _dcTick() {
  var rk = document.getElementById('dcRack');
  if (!rk || !rk.offsetParent) return;   // shown on Day Clock and Lessons (css)
  _dcClockPaint();
  if ((todayStudents || []).length !== _dcN) { _dcRender(); return; }   // the calendar read came in after the rack was drawn
  if (_dcDay && _dcDay !== _dcYmd()) { initDayClockTab(); return; }   // past midnight: a new day
  if (_dcRows === null) return;
  var m = _dcModel(), r = m.lessons.filter(function (L) { return L.running; })[0];
  var el = document.querySelector('#dcRack [data-dc="run"]');
  if ((!!el) !== (!!r)) { _dcRender(); return; }   // the timer started/stopped somewhere else
  if (el) el.textContent = _dcCount(r.len);
}

function dcStart(name) {
  var t = _ltmGet();
  if (t && t.key !== _ltmKey(name)) {   // the next student: the one before stops first (saves, like ■)
    if (t.marks.some(function (x) { return x.s === 'teach'; })) ltmLeft(t.name); else ltmCancel(t.name);
  }
  ltmTop(name, 'teach');
  _dcRender();
  setTimeout(_dcLoad, 4000);
}
function dcStop(name) {
  ltmTop(name, 'left');
  _dcRender();
  setTimeout(_dcLoad, 4000);
}
function dcFix(row, name, bookedEnd) {
  rpmPrompt({ title: 'Fix end time', message: 'When did ' + name + '\'s lesson really end?', value: bookedEnd != null ? _dcClock(bookedEnd) : '', placeholder: '3:55 PM', confirmLabel: 'Save' })
    .then(function (v) {
      if (!v) return;
      if (_dcMinOfStr(v) == null) { rpmAlert({ title: 'Fix end time', message: 'Write the time like 3:55 PM.' }); return; }
      return fetch(getScriptUrl() + '?action=fixLessonTimeEnd&row=' + row + '&end=' + encodeURIComponent(v))
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d.success) throw new Error(d.message); _dcLoad(); })
        .catch(function (e) { rpmAlert({ title: 'Not saved', message: String(e && e.message || e) }); });
    });
}

setInterval(_dcTick, 1000);
window.addEventListener('storage', function (e) { if (e.key === 'lessonTimer') _dcRender(); });
