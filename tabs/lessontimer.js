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
var LTM_MAX = 75 * 60 * 1000;   // 75 min after ▶ the timer finishes on its own (user, 2026-11-12)
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
  var arg = _auEsc(JSON.stringify(name));
  var hot = function (v, ev) { return '<span class="ltm-v ltm-hot" data-v="' + v + '" on' + ev + '="ltmHit(' + arg + ',\'' + v + '\')"></span>'; };
  setTimeout(_ltmTick, 0);   // the numbers, once the box is on the page
  return '<div class="im-sec-box ltm-box" data-ltm-box="' + _auEsc(name) + '">' +
    '<div class="db-cx-head im-sec-head"><label class="field-label db-cx-t">Lesson timer</label></div>' +
    '<div class="ltm-grid">' +
      ['Chat', 'Lesson', 'Total'].map(function (h) { return '<span class="ltm-h">' + h + '</span>'; }).join('') +
      hot('chat', 'click') + hot('teach', 'click') + hot('total', 'dblclick') +
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
  if (t && Date.now() - t.marks[0].at >= LTM_MAX) {   // forgot ■: finish it at the 75-minute mark
    if (t.marks.some(function (m) { return m.s === 'teach'; })) ltmLeft(t.name, t.marks[0].at + LTM_MAX); else ltmCancel(t.name);
    return;
  }
  _ltmTopPaint(t);
  document.querySelectorAll('.ltm-box[data-ltm-box]').forEach(function (b) {
    var name = b.dataset.ltmBox, k = _ltmKey(name), run = t && t.key === k ? t : null, v = run || _ltmDone[k] || null;
    var s = v ? _ltmSums(v, Date.now()) : null, st = run ? _ltmStage(run) : '';
    var chat = s ? s.before + s.pause + s.after : 0, teach = s ? s.teach : 0;
    var lbl = !v ? (t ? 'Running for ' + t.name : '') :
      !run ? (v.failed ? 'NOT SAVED' : 'Saved') :
      st === 'before' ? 'Chat before' : st === 'pause' ? 'Chat' : st === 'after' ? 'Chat after' :
      teach >= LTM_LEN ? '+' + _ltmClock(teach - LTM_LEN) + ' over' : 'Teaching';
    var out = { chat: _ltmClock(chat), teach: _ltmClock(teach), total: _ltmClock(chat + teach),
                start: v ? _ltmTime(v.marks[0].at) : '–', end: v && v.left ? _ltmTime(v.left) : '–', lbl: lbl };
    b.classList.toggle('ltm-box-idle', !v);
    b.querySelectorAll('[data-v]').forEach(function (el) {
      var f = el.dataset.v;
      el.textContent = out[f];
      if (f === 'teach') el.classList.toggle('ltm-warn', !!v);   // always amber, no colour change at 50 (user, 2026-11-02)
      if (el.classList.contains('ltm-hot')) el.classList.toggle('ltm-dim', !!run && (f === 'chat' ? st === 'teach' : f === 'teach' ? st !== 'teach' : false));
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

// Hidden controls (2026-11-07): the numbers are the buttons, so students see no Play/Pause.
//   Chat click   → chat runs (starts the visit, or pauses teaching)
//   Lesson click → teaching runs; clicked while teaching → back to chat
//   Total double-click → they left: saves (nothing taught = thrown away)
// The last chat after teaching is saved as "after" (no End lesson button needed).
function ltmHit(name, f) {
  var t = _ltmGet(), k = _ltmKey(name);
  if (t && t.key !== k) return;   // another student's timer is running
  var st = t ? _ltmStage(t) : '';
  if (f === 'chat') { if (!t) ltmStart(name); else if (st === 'teach') ltmPause(name); }
  else if (f === 'teach') {
    if (!t) { ltmStart(name); var n = _ltmGet(); n.marks[0].s = 'teach'; _ltmPut(n); _ltmPaint(); }   // straight into teaching
    else _ltmMark(name, st === 'teach' ? 'pause' : 'teach');
  }
  else if (f === 'total' && t) {
    if (t.marks.some(function (m) { return m.s === 'teach'; })) ltmLeft(name); else ltmCancel(name);
  }
}

// Buttons at the top of the student page (user, 2026-11-10): plain icons, no labels, so students
// don't know what I'm pressing. The box at the bottom shows the times.
//   ▶   they entered the room (chat before starts)
//   ▶▶  the lesson starts (or back to the lesson after a chat)
//   ■   finished: saves (nothing taught = thrown away), same as Total double-click
//   (■■ pause/end removed 2026-11-11, user)
var LTM_TRI = function (x) { return '<path d="M' + x + ' 3.5v9L' + (x + 6.5) + ' 8z" fill="currentColor"/>'; };
var LTM_SQ  = function (x) { return '<rect x="' + x + '" y="4.5" width="7" height="7" rx="1" fill="currentColor"/>'; };
// 2026-11-12 (user): only ▶ (lesson starts) and ■ (saves); no chat-before step.
var LTM_IC = [
  ['teach', '<svg viewBox="0 0 16 16" width="16" height="16">' + LTM_TRI(5) + '</svg>'],
  ['left',  '<svg viewBox="0 0 16 16" width="16" height="16">' + LTM_SQ(4.5) + '</svg>']
];
function ltmTopHtml(name) {
  var arg = _auEsc(JSON.stringify(name));
  setTimeout(_ltmTick, 0);
  return '<span class="ltm-top" data-ltm-top="' + _auEsc(name) + '">' + LTM_IC.map(function (b) {
    return '<button class="ltm-ic" data-f="' + b[0] + '" onclick="ltmTop(' + arg + ',\'' + b[0] + '\')">' + b[1] + '</button>';
  }).join('') + '<span class="ltm-top-n"></span></span>';
}
function ltmTop(name, f) {
  var t = _ltmGet(), st = t ? _ltmStage(t) : '';
  if (t && t.key !== _ltmKey(name)) return;   // another student's timer is running
  if (f === 'in')    { if (!t) ltmStart(name); return; }
  if (f === 'teach') {
    if (!t) { ltmStart(name); var n = _ltmGet(); n.marks[0].s = 'teach'; _ltmPut(n); _ltmPaint(); }   // straight into the lesson
    else if (st !== 'teach') _ltmMark(name, 'teach');
    return;
  }
  if (f === 'end')   { if (st === 'teach' || st === 'pause') ltmEnd(name); return; }
  if (f === 'left')  ltmHit(name, 'total');
}
function _ltmTopPaint(t) {
  document.querySelectorAll('.ltm-top[data-ltm-top]').forEach(function (b) {
    var k = _ltmKey(b.dataset.ltmTop), mine = !!t && t.key === k, st = mine ? _ltmStage(t) : '';
    var on = { in: !t, teach: !t || (mine && st !== 'teach'), end: mine && (st === 'teach' || st === 'pause'), left: mine };
    b.querySelectorAll('[data-f]').forEach(function (el) { el.disabled = !on[el.dataset.f]; });
    // Small dim clock (user, 2026-11-11): ▶ counts the chat before, ▶▶ resets it to 0 and counts the lesson.
    var n = b.querySelector('.ltm-top-n'), s = mine ? _ltmSums(t, Date.now()) : null;
    if (n) n.textContent = _ltmClock(s ? s.teach : 0);   // counter always in the box, 0:00 when idle (user, 2026-11-12)
  });
}

// They left: the row goes to Lesson Times, the box keeps the visit showing.
function ltmLeft(name, at) {
  var t = _ltmGet();
  if (!t || t.key !== _ltmKey(name)) return;
  t.left = at || Date.now();
  var last = t.marks[t.marks.length - 1];
  if (last.s === 'pause') last.s = 'after';   // chat after the last teaching = chat after
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
