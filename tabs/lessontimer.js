// ─── TABS / LESSONTIMER.JS ──────────────────────────────────────────────────
// Lesson timer (2026-11-02): a box at the bottom of a student's Lessons page,
// so I see where a 50-minute lesson turns into 1:05. Two buttons on its title row:
//   main  Start (they arrived) → Start teaching → Pause ⇄ Resume lesson
//   side  Cancel (before teaching) → End lesson → Left room
// Pause = off-topic chat inside the lesson, as many times as needed. Under them
// Chat | Lesson | Total, then Start | what's happening | End. Lesson is amber,
// past 50 min the middle says how far over. Kept in this browser
// (localStorage lessonTimer) so a reload or another tab loses nothing; one
// student at a time. Left room sends the row to "Lesson Times"
// (saveLessonTime, RPM_LessonTimes.js) and the box keeps that visit showing.

var LTM_KEY = 'lessonTimer';
var LTM_LEN = 50 * 60;   // seconds of teaching
var _ltmDone = {};   // student key → the visit just saved { marks, left, failed }, until the page is left

function _ltmKey(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function _ltmGet() { try { return JSON.parse(localStorage.getItem(LTM_KEY) || 'null'); } catch (e) { return null; } }
function _ltmPut(t) { try { t ? localStorage.setItem(LTM_KEY, JSON.stringify(t)) : localStorage.removeItem(LTM_KEY); } catch (e) {} }

// marks: [{ s: 'before'|'teach'|'pause'|'after', at }] — each stage runs until the next mark.
function _ltmSums(t, now) {
  var o = { before: 0, teach: 0, pause: 0, after: 0 };
  (t.marks || []).forEach(function (m, i, a) {
    var end = i + 1 < a.length ? a[i + 1].at : (t.left || now);
    o[m.s] += Math.max(0, end - m.at) / 1000;
  });
  return o;
}
function _ltmAt(t, s) { var m = (t.marks || []).filter(function (x) { return x.s === s; }); return m.length ? m[0].at : 0; }
function _ltmStage(t) { return t && t.marks && t.marks.length ? t.marks[t.marks.length - 1].s : ''; }

function _ltmClock(sec) {
  sec = Math.floor(sec);
  var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
function _ltmTime(ms) {
  var d = new Date(ms), h = d.getHours(), m = d.getMinutes();
  return ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM');
}
function _ltmYmd(ms) {
  var d = new Date(ms), m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
}

// The box (tabs/import.js puts it last on the student page).
function ltmBoxHtml(name) {
  var cell = function (cls, v) { return '<span class="' + cls + '" data-v="' + v + '"></span>'; };
  setTimeout(_ltmTick, 0);   // the numbers, once the box is on the page
  return '<div class="im-sec-box ltm-box" data-ltm-box="' + _auEsc(name) + '">' +
    '<div class="db-cx-head im-sec-head"><label class="field-label db-cx-t">Lesson timer</label><span class="ltm-btns">' + _ltmBtns(name) + '</span></div>' +
    '<div class="ltm-grid">' +
      ['Chat', 'Lesson', 'Total'].map(function (h) { return '<span class="ltm-h">' + h + '</span>'; }).join('') +
      cell('ltm-v', 'chat') + cell('ltm-v', 'teach') + cell('ltm-v', 'total') +
      ['Start', '', 'End'].map(function (h) { return '<span class="ltm-h ltm-h2">' + h + '</span>'; }).join('') +
      cell('ltm-t', 'start') + cell('ltm-t ltm-lbl', 'lbl') + cell('ltm-t', 'end') +
    '</div></div>';
}

function _ltmBtns(name) {
  var t = _ltmGet(), mine = t && t.key === _ltmKey(name), arg = _auEsc(JSON.stringify(name));
  var btn = function (cls, fn, label, tip, off) {
    return '<button class="link-btn ltm-btn ' + cls + '"' + (off ? ' disabled' : '') + ' onclick="' + fn + '(' + arg + ')" data-tip="' + tip + '" data-tip-left data-tip-wrap>' + label + '</button>';
  };
  if (!mine) return t ? btn('', 'ltmStart', 'Start', 'Timer running for ' + _auEsc(t.name) + '.\nEnd it on their page first.', true)
                      : btn('ltm-main', 'ltmStart', 'Start', 'They arrived.\nCounts the chat before the lesson.');
  var st = _ltmStage(t);
  if (st === 'before') return btn('ltm-main', 'ltmTeach', 'Start teaching', 'The lesson starts.\nChat before stops here.') +
                              btn('', 'ltmCancel', 'Cancel', 'Throws this timer away.\nNothing is saved.');
  if (st === 'teach')  return btn('ltm-main', 'ltmPause', 'Pause', 'Off-topic chat.\nLesson time stops until Resume.') +
                              btn('', 'ltmEnd', 'End lesson', 'Teaching is over.\nCounts the chat after.');
  if (st === 'pause')  return btn('ltm-main', 'ltmResume', 'Resume lesson', 'Back to the lesson.\nChat time stops.') +
                              btn('', 'ltmEnd', 'End lesson', 'Teaching is over.\nCounts the chat after.');
  return btn('ltm-main', 'ltmLeft', 'Left room', 'They left.\nSaves the times to Lesson Times.');
}

// Every second: only the numbers change (buttons stay put, so a click is never lost).
function _ltmTick() {
  var t = _ltmGet();
  document.querySelectorAll('.ltm-box[data-ltm-box]').forEach(function (b) {
    var name = b.dataset.ltmBox, k = _ltmKey(name), run = t && t.key === k ? t : null, v = run || _ltmDone[k] || null;
    var s = v ? _ltmSums(v, Date.now()) : null, st = run ? _ltmStage(run) : '';
    var chat = s ? s.before + s.pause + s.after : 0, teach = s ? s.teach : 0;
    var lbl = !v ? (t ? 'Running for ' + t.name : '') :
      !run ? (v.failed ? 'NOT SAVED' : 'Saved') :
      st === 'before' ? 'Chat before' : st === 'pause' ? 'Paused' : st === 'after' ? 'Chat after' :
      teach >= LTM_LEN ? '+' + _ltmClock(teach - LTM_LEN) + ' over' : 'Teaching';
    var out = { chat: _ltmClock(chat), teach: _ltmClock(teach), total: _ltmClock(chat + teach),
                start: v ? _ltmTime(v.marks[0].at) : '–', end: v && v.left ? _ltmTime(v.left) : '–', lbl: lbl };
    b.classList.toggle('ltm-box-idle', !v);
    b.querySelectorAll('[data-v]').forEach(function (el) {
      var f = el.dataset.v;
      el.textContent = out[f];
      if (f === 'teach') el.classList.toggle('ltm-warn', !!v);   // always amber, no colour change at 50 (user, 2026-11-02)
      if (f === 'lbl') el.classList.toggle('ltm-fail', !run && !!v && !!v.failed);
    });
  });
}
function _ltmPaint() {
  document.querySelectorAll('.ltm-box[data-ltm-box]').forEach(function (b) {
    var el = b.querySelector('.ltm-btns');
    if (el) el.innerHTML = _ltmBtns(b.dataset.ltmBox);
  });
  _ltmTick();
}
function _ltmMark(name, s) {
  var t = _ltmGet();
  if (!t || t.key !== _ltmKey(name)) return null;
  t.marks.push({ s: s, at: Date.now() });
  _ltmPut(t);
  _ltmPaint();
  return t;
}

function ltmStart(name) {
  if (_ltmGet()) return;
  delete _ltmDone[_ltmKey(name)];
  _ltmPut({ key: _ltmKey(name), name: name, marks: [{ s: 'before', at: Date.now() }] });
  _ltmPaint();
}
function ltmTeach(name)  { _ltmMark(name, 'teach'); }
function ltmPause(name)  { _ltmMark(name, 'pause'); }
function ltmResume(name) { _ltmMark(name, 'teach'); }
function ltmEnd(name)    { _ltmMark(name, 'after'); }
function ltmCancel(name) {
  var t = _ltmGet();
  if (t && t.key === _ltmKey(name)) { _ltmPut(null); _ltmPaint(); }
}

// They left: the row goes to Lesson Times, the box keeps the visit showing.
function ltmLeft(name) {
  var t = _ltmGet();
  if (!t || t.key !== _ltmKey(name)) return;
  t.left = Date.now();
  var s = _ltmSums(t, t.left), r = function (x) { return Math.round(x); };
  var pauses = t.marks.filter(function (m) { return m.s === 'pause'; }).length;
  var q = '&name=' + encodeURIComponent(t.name) + '&day=' + _ltmYmd(t.marks[0].at) +
    '&arrived=' + encodeURIComponent(_ltmTime(t.marks[0].at)) +
    '&teachStart=' + encodeURIComponent(_ltmTime(_ltmAt(t, 'teach'))) +
    '&teachEnd=' + encodeURIComponent(_ltmTime(_ltmAt(t, 'after'))) +
    '&left=' + encodeURIComponent(_ltmTime(t.left)) +
    '&before=' + r(s.before) + '&teach=' + r(s.teach) + '&during=' + r(s.pause) + '&after=' + r(s.after) + '&pauses=' + pauses;
  _ltmDone[t.key] = t;
  _ltmPut(null);
  _ltmPaint();
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=saveLessonTime' + q)
    .then(function (res) { return res.json(); })
    .then(function (d) { if (!d.success) throw new Error(d.message); })
    .catch(function () { t.failed = true; _ltmTick(); });
}

setInterval(_ltmTick, 1000);
// Another portal tab pressed a button: follow it.
window.addEventListener('storage', function (e) { if (e.key === LTM_KEY) _ltmPaint(); });
