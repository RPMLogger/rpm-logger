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
// Gauges (user, 2026-11-02, cockpit-panel pictures): Chat | Lesson | Total dials,
// then three small meters for the chat before, the pauses and the chat after.
function ltmBoxHtml(name) {
  var cell = function (cls, v) { return '<span class="' + cls + '" data-v="' + v + '"></span>'; };
  setTimeout(_ltmTick, 0);   // the numbers, once the box is on the page
  return '<div class="im-sec-box ltm-box" data-ltm-box="' + _auEsc(name) + '">' +
    '<div class="db-cx-head im-sec-head"><label class="field-label db-cx-t">Lesson timer</label><span class="ltm-btns">' + _ltmBtns(name) + '</span></div>' +
    '<div class="ltm-grid">' +
      _ltmDial('chat', 'Chat', 20, 1, 5, false) +
      _ltmDial('teach', 'Lesson', 60, 1, 5, true) +
      _ltmDial('total', 'Total', 80, 2, 10, false) +
    '</div>' +
    '<div class="ltm-meters">' + _ltmMeter('before', 'Chat before') + _ltmMeter('pause', 'Pauses') + _ltmMeter('after', 'Chat after') + '</div>' +
    '<div class="ltm-panel">' + _ltmKnob('Tone', -60) + _ltmKnob('Drive', 35) +
      '<span class="ltm-fbtns"><span class="ltm-fbtn">Off</span><span class="ltm-fbtn">0 dB</span><span class="ltm-fbtn ltm-fbtn-on">Auto</span></span>' +
      _ltmKnob('Mix', 0) + _ltmKnob('Output', -25) + '</div>' +
    '<div class="ltm-grid">' +
      ['Start', '', 'End'].map(function (h) { return '<span class="ltm-h ltm-h2">' + h + '</span>'; }).join('') +
      cell('ltm-t', 'start') + cell('ltm-t ltm-lbl', 'lbl') + cell('ltm-t', 'end') +
    '</div></div>';
}

// Studio-rack look (user, 2026-11-02, Logic compressor pictures): dark brushed
// plate, backlit silver face with black ink, glass shine, metal screws; the time
// sits on a small dark display under each meter. Gradients are shared by id.
function _ltmDefs() {
  return '<defs>' +
    '<linearGradient id="ltmg-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2c2c"/><stop offset=".5" stop-color="#1e1e1e"/><stop offset="1" stop-color="#151515"/></linearGradient>' +
    '<radialGradient id="ltmg-face" cx=".5" cy=".42" r=".65"><stop offset="0" stop-color="#d6d6d1"/><stop offset=".7" stop-color="#b9bab5"/><stop offset="1" stop-color="#8d8e8a"/></radialGradient>' +
    '<linearGradient id="ltmg-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="ltmg-screw" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#9a9a9a"/><stop offset="1" stop-color="#3a3a3a"/></radialGradient>' +
    '<radialGradient id="ltmg-hub" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#777"/><stop offset="1" stop-color="#111"/></radialGradient>' +
    '<radialGradient id="ltmg-knob" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#e8e8e8"/><stop offset=".45" stop-color="#a5a5a5"/><stop offset="1" stop-color="#4a4a4a"/></radialGradient>' +
    '<clipPath id="ltmg-mclip"><rect x="12" y="10" width="116" height="66" rx="3"/></clipPath>' +
  '</defs>';
}
function _ltmScrew(x, y) {
  return '<g class="ltm-screw"><circle cx="' + x + '" cy="' + y + '" r="5"/><path d="M' + (x - 3) + ' ' + (y - 3) + 'l6 6"/></g>';
}

// A round gauge, 0..max minutes. full = clock face (0 at the top, one turn),
// otherwise a 270° sweep like an airspeed dial. The hand turns in _ltmTick.
function _ltmDial(f, label, max, minor, major, full) {
  var a0 = full ? 0 : -135, sw = full ? 360 : 270, o = [_ltmDefs()];
  var pt = function (deg, r) { var a = (deg - 90) * Math.PI / 180; return [(100 + r * Math.cos(a)).toFixed(1), (100 + r * Math.sin(a)).toFixed(1)]; };
  o.push('<rect class="ltm-plate" x="2" y="2" width="196" height="196" rx="10"/>');
  o.push(_ltmScrew(16, 16) + _ltmScrew(184, 16) + _ltmScrew(16, 184) + _ltmScrew(184, 184));
  o.push('<circle class="ltm-bezel" cx="100" cy="100" r="90"/><circle class="ltm-face" cx="100" cy="100" r="85"/>');
  if (full) {   // 50–60 band: the lesson is over its 50 minutes
    var p1 = pt(a0 + 50 / max * sw, 81), p2 = pt(a0 + sw, 81);
    o.push('<path class="ltm-band" d="M' + p1[0] + ' ' + p1[1] + ' A81 81 0 0 1 ' + p2[0] + ' ' + p2[1] + '"/>');
  }
  for (var v = 0; v <= max; v += minor) {
    if (full && v === max) break;
    var big = v % major === 0, d = a0 + v / max * sw, q1 = pt(d, 78), q2 = pt(d, big ? 68 : 73);
    o.push('<line class="ltm-tick' + (big ? ' ltm-tick-big' : '') + '" x1="' + q1[0] + '" y1="' + q1[1] + '" x2="' + q2[0] + '" y2="' + q2[1] + '"/>');
    if (big && v % (major * (full ? 2 : 1)) === 0) {
      var n = pt(d, 56);
      o.push('<text class="ltm-num" x="' + n[0] + '" y="' + n[1] + '">' + v + '</text>');
    }
  }
  o.push('<text class="ltm-name" x="100" y="' + (full ? 74 : 72) + '">' + label.toUpperCase() + '</text>');
  o.push('<text class="ltm-name ltm-unit" x="100" y="' + (full ? 134 : 140) + '">MINUTES</text>');
  o.push('<g class="ltm-hand" data-hand="' + f + '" data-max="' + max + '" data-a0="' + a0 + '" data-sw="' + sw + '" transform="rotate(' + a0 + ' 100 100)">' +
    '<path d="M100 26 L101.6 100 L100 118 L98.4 100 Z"/><circle cx="100" cy="100" r="7"/></g>');
  o.push('<ellipse class="ltm-glass" cx="100" cy="62" rx="70" ry="44"/>');
  return '<div class="ltm-dial" data-dial="' + f + '"><svg viewBox="0 0 200 200">' + o.join('') + '</svg>' +
    '<span class="ltm-lcd" data-v="' + f + '"></span></div>';
}

// Decoration only (user, 2026-11-02): a fake knob and fake buttons, like the
// controls on a studio compressor. They don't do anything.
function _ltmKnob(label, deg) {
  var o = [_ltmDefs()];
  for (var i = 0; i <= 10; i++) {
    var a = (-135 + i * 27 - 90) * Math.PI / 180;
    o.push('<circle class="ltm-kdot" cx="' + (35 + 30 * Math.cos(a)).toFixed(1) + '" cy="' + (35 + 30 * Math.sin(a)).toFixed(1) + '" r="1.3"/>');
  }
  o.push('<circle class="ltm-krim" cx="35" cy="37" r="22"/><circle class="ltm-kcap" cx="35" cy="35" r="20"/>');
  o.push('<line class="ltm-kline" x1="35" y1="35" x2="35" y2="19" transform="rotate(' + deg + ' 35 35)"/>');
  return '<span class="ltm-knob"><span class="ltm-h">' + label + '</span><svg viewBox="0 0 70 70">' + o.join('') + '</svg></span>';
}

// A small VU-style meter, 0–10 minutes; the needle's pivot hides under the window edge.
function _ltmMeter(f, label) {
  var o = [_ltmDefs()], pt = function (deg, r) { var a = (deg - 90) * Math.PI / 180; return [(70 + r * Math.cos(a)).toFixed(1), (96 + r * Math.sin(a)).toFixed(1)]; };
  o.push('<rect class="ltm-plate" x="2" y="2" width="136" height="88" rx="6"/>');
  o.push('<rect class="ltm-bezel" x="9" y="7" width="122" height="72" rx="4"/><rect class="ltm-face" x="12" y="10" width="116" height="66" rx="3"/>');
  for (var v = 0; v <= 10; v++) {
    var d = -50 + v * 10, q1 = pt(d, 72), q2 = pt(d, v % 5 ? 67 : 63);
    o.push('<line class="ltm-tick' + (v % 5 ? '' : ' ltm-tick-big') + '" x1="' + q1[0] + '" y1="' + q1[1] + '" x2="' + q2[0] + '" y2="' + q2[1] + '"/>');
    if (v % 5 === 0) { var n = pt(d, 56); o.push('<text class="ltm-num ltm-num-s" x="' + n[0] + '" y="' + n[1] + '">' + v + '</text>'); }
  }
  o.push('<text class="ltm-name ltm-unit" x="70" y="68">MIN</text>');
  o.push('<g clip-path="url(#ltmg-mclip)"><g class="ltm-hand" data-hand="' + f + '" data-max="10" data-a0="-50" data-sw="100" transform="rotate(-50 70 96)">' +
    '<path d="M70 22 L71 96 L69 96 Z"/></g></g>');
  o.push('<rect class="ltm-glass" x="12" y="10" width="116" height="30" rx="3"/>');
  o.push(_ltmScrew(6, 84) + _ltmScrew(134, 84));
  return '<div class="ltm-meter"><svg viewBox="0 0 140 92">' + o.join('') + '</svg><span class="ltm-lcd ltm-lcd-s" data-v="' + f + '"></span><span class="ltm-h">' + label + '</span></div>';
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
    var mins = { chat: chat / 60, teach: teach / 60, total: (chat + teach) / 60,
                 before: s ? s.before / 60 : 0, pause: s ? s.pause / 60 : 0, after: s ? s.after / 60 : 0 };
    b.querySelectorAll('[data-hand]').forEach(function (h) {
      var max = +h.dataset.max, sw = +h.dataset.sw, m = mins[h.dataset.hand];
      if (sw < 360) m = Math.min(m, max * 1.04);   // pegs just past the end, like a real gauge
      var c = h.closest('svg').viewBox.baseVal.width === 200 ? '100 100' : '70 96';
      h.setAttribute('transform', 'rotate(' + (+h.dataset.a0 + m / max * sw).toFixed(2) + ' ' + c + ')');
    });
    var out = { chat: _ltmClock(chat), teach: _ltmClock(teach), total: _ltmClock(chat + teach),
                before: _ltmClock(mins.before * 60), pause: _ltmClock(mins.pause * 60), after: _ltmClock(mins.after * 60),
                start: v ? _ltmTime(v.marks[0].at) : '–', end: v && v.left ? _ltmTime(v.left) : '–', lbl: lbl };
    b.classList.toggle('ltm-box-idle', !v);
    b.querySelectorAll('[data-v]').forEach(function (el) {
      var f = el.dataset.v;
      el.textContent = out[f];
      if (f === 'teach') el.closest('.ltm-dial').classList.toggle('ltm-warn', !!v);   // always amber, no colour change at 50 (user, 2026-11-02)
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
