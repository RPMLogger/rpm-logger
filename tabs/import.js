// ─── TABS / IMPORT.JS ───────────────────────────────────────────────────────
// Import (2026-10-04): every lesson a student has logged in Students Import,
// lessons only (no payments, no HW). Student cards first (A–Z, the Dropbox
// cards' look); a card opens the full list, newest
// first, under year headings. Reads only: getStudentRoster (Counter names)
// and getPastLessons (Import rows 12+, B subject, I date).

var _imRoster = null;   // names from the Counter, A–Z
var _imOpen = null;     // name of the open student, or null on the cards
var _imAnim = false;    // true until the first draw after opening the tab: cards come in one by one
// Where the student page draws (2026-10-06): 'import' (this tab, with Back)
// or 'today' (the Today tab, tabs/today.js, under its row of today's students).
var _imIn = 'import';
function _imBodyEl() { return document.getElementById(_imIn === 'today' ? 'tdStudent' : 'importBody'); }

function initImportTab() {
  _imIn = 'import';
  // Today's students go first: a week read from an earlier day is read again (2026-10-07).
  if (window._weekFetchedDay && window._weekFetchedDay !== _tdYmd()) { var wu = getScriptUrl(); if (wu) fetchWeekStudents(wu); }
  // Always the student list when you come to the tab (2026-10-08, was the last student opened).
  _imOpen = null; _imLast = null;
  _imAnim = true;   // the next draw brings the cards in one by one
  if (_imRoster) { _imRenderCards(); return; }
  var body = document.getElementById('importBody');
  body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(getScriptUrl() + '?action=getStudentRoster')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', d.message || 'unknown', 'center'); return; }
      _imRoster = d.students || [];
      if (!_imOpen) _imRenderCards();   // a student opened meanwhile: stay on them
    })
    .catch(function () { body.innerHTML = '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', 'No answer from Google.', 'center'); });
}

function _imKey(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Today's students first, in lesson-time order and in amber (2026-10-07);
// everyone else A–Z under them. Resorts itself each day from the week read.
function _imRenderCards(noRead) {
  var body = document.getElementById('importBody');
  _imLift(body);
  if (!noRead) _imHwTodayLoad();   // today's HW answers, then draws again
  var today = (todayStudents || []).map(function (s) { return _imKey(s.name); });
  var isToday = function (n) { return today.indexOf(_imKey(n)) >= 0; };
  // Today's lesson logged (2026-10-07): green when Schedule and HW are done too,
  // else the amber card says what's missing; clicking it reopens it to edit.
  var logged = (todayStudents || []).filter(function (s) { return s.alreadyLogged; }).map(function (s) { return _imKey(s.name); });
  // Loading until the checklist is in too, so the cards draw once, already in their
  // groups (user, 2026-10-30; they drew first, then Not logged jumped up amber).
  // _ckLoad calls _imAfterCk when it ends, whoever started it; a failed read draws anyway.
  // The last checklist saved in this browser draws them at once (2026-10-30, the read takes ~12s).
  if (!_ck.loaded) {
    if (!_ck.busy) _ckLoad();
    if (!_ckFromCache() && !_imCkFail) { body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>'; return; }
  }
  // Cards come in one by one on the first draw after opening the tab, not on the quiet redraws (user, 2026-10-30).
  var anim = _imAnim, step = 0; _imAnim = false;
  var inStyle = function () { return anim ? ' style="--i:' + (step++) + '"' : ''; };
  // Missed lessons still open (2026-10-08, Lesson checklist): "2 open".
  var open = function (n) { return _ckPast(n).length; };
  var missing = function (n) {
    if (logged.indexOf(_imKey(n)) < 0) return null;   // not logged yet: no verdict
    return _imTodayMiss(n);
  };
  // Three groups, each A–Z (user, 2026-10-24; today's were in lesson-time order):
  // today's students, then a past lesson still open (red card), then everyone else.
  var group = function (n) { return isToday(n) ? 0 : open(n) ? 1 : 2; };
  var names = _imRoster.slice().sort(function (a, b) {
    return group(a) - group(b) || a.localeCompare(b);
  });
  // One box like Today's (user, 2026-10-26; three boxes were tried): the title,
  // today's students (amber), then everyone else (blue; red past-open first).
  var card = function (n) {
    var miss = missing(n), o = open(n), past = _ckPast(n);
    // The oldest open lesson's steps (user, 2026-10-17; was "1 lesson open"):
    // ✓ done, ☐ still to do, "· 2 open" when more lessons wait.
    var todo = miss && miss.length ? 1 : 0, all = o + todo;
    var first = past.length ? { day: past[0].date, miss: past[0].missing || [], hw: past[0].hwText } : todo ? { day: _tdYmd(), miss: miss } : null;
    return '<div class="db-card im-card' + (isToday(n) ? ' im-today' : o ? ' im-unlog' : '') + (miss && !miss.length && !o ? ' im-donetoday' : '') + '"' + inStyle() + ' onclick="_imOpenStudent(' + _auEsc(JSON.stringify(n)) + ')" data-tip="Instant.\nEvery lesson logged for ' + _auEsc(n) + '.">' +
      '<div class="db-card-l"><span class="db-card-n">' + inqEsc(n) + '</span></div>' +
      (miss && !miss.length && !o ? '<span class="im-logged"><span class="im-logged-t">LOGGED</span>' + PAID_CHECK_ICON.replace('width="13" height="13"', 'width="15" height="15"') + '</span>' : '') +   // the Auto-confirmed check (user, 2026-10-26)
      (isToday(n) && !(miss && !miss.length && !o) ? '<span class="im-steps"><span class="im-step im-today-tag">Today</span></span>' : '') +   // green TODAY sign on today's cards (user, 2026-10-30)
      // Not logged group: one "+ Log" button only (user, 2026-10-30; was the step row + "· 2 open").
      (!isToday(n) && o ? '<span class="im-steps"><button class="im-step todo nolog opens-window" onclick="event.stopPropagation(); _imLogOpen(' + _auEsc(JSON.stringify(n)) + ')" data-tip="Opens a window.\nLog ' + _auEsc(_ckDay(past[0].date)) + '.">+ Log</button></span>' : '') +
      (first && !(!isToday(n) && o) ? '<span class="im-steps">' + _imStepsHtml(first.day, first.miss, first.hw, n) + (all > 1 ? '<span class="im-step-more">· ' + all + ' open</span>' : '') + '</span>' : '') +
    '</div>';
  };
  body.innerHTML =
    '<div class="db-section td-wk-box im-box' + (anim ? ' im-stagger' : '') + '">' +
      // Audit lessons red on the title line, right (user, 2026-10-23; was amber, level with "24 students").
      '<div class="settings-title im-title-row"><span class="im-title-stack"><span>Students<span class="win-sub"> · Lessons</span></span><span class="st-page-icon">' + ANALYSIS_ICON + '</span></span>' +   // no count (user, 2026-10-24; was "· 24 students" grey beside the title)   // was "Import", then "Lesson Log" (2026-10-09), then "Lessons" (renamed Students 2026-10-13)
        '<button class="link-btn im-audit-link" onclick="switchTab(\'audit\')" data-tip="Opens a tab.\nAudit lessons and Audit payments." data-tip-wrap><span>Audit</span></button></div>' +   // white, no glass: just a link, level with STUDENTS (user, 2026-10-30)   // om-120 sits centred under the title, inside it (user, 2026-10-30; was its own line, left-aligned)
      // The student page's box-title style (2026-10-06): one heading look on this tab.
      // Audit lessons (2026-10-14): red, right, level with "24 students", like Audit
      // payments; opens the old Logs page (Unlogged Lessons + Lesson Checklist) here.
      // A heading over each group, the Sheets tab's "Finances" look (user, 2026-10-30).
      ['Today', 'Not logged', 'A–Z'].map(function (h, g) {
        var in_g = names.filter(function (n) { return group(n) === g; });
        return in_g.length ? '<div class="section-label im-group-h"' + inStyle() + '>' + h + '</div>' + in_g.map(card).join('') : '';
      }).join('') +
    '</div>';
  if (_ck.busy) _imListBusy(true);   // drawn from the browser's copy: still Refreshing
}
// The list dims with REFRESHING in the middle while the checklist is read
// again (user, 2026-10-30: it redrew by itself, no way to tell it was working).
function _imListBusy(on) {
  var b = document.querySelector('#importBody .im-box');
  if (b) rpmBusy(b, null, on, 'Refreshing');
}

// Today's HW Tracking rows (getHwLog by date): who has an HW answer for today
// ({ hw: the Materials, text: the HW, files, links }).
var _imHwToday = { day: null, rows: null, busy: false };
function _imHwTodayLoad() {
  var day = _tdYmd();
  if (_imHwToday.busy) return;
  _imHwToday.busy = true;
  fetch(getScriptUrl() + '?action=getHwLog&date=' + day)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) return;
      var rows = {};
      (d.rows || []).forEach(function (x) { rows[_imKey(x.student)] = { hw: x.hw, text: x.text || '', files: x.files || [], links: x.links || [] }; });
      _imHwToday = { day: day, rows: rows, busy: false };
    })
    .catch(function () {})
    .then(function () {
      _imHwToday.busy = false;
      var p = document.getElementById('tab-import');
      if (_imRoster && !_imOpen && p && p.classList.contains('active')) _imRenderCards(true);
    });
}

function _imOpenStudent(name) {
  if (_imIn === 'today') { _tdRefresh(name); return; }   // after a log on the Today tab
  if (_imOpen !== name) _imUndock();   // another student: their own fresh box
  _imLift(document.getElementById('importBody'));
  _imOpen = name;
  _imHw = null;
  _imDetail = null;
  // Same student drawn again (after a log): Data stays open, its numbers read again.
  var keepData = _imData.name === name && _imData.open;
  _imData = { open: false, name: name, d: null };
  if (keepData) _imDataToggle();
  _imLoadHw(name);
  _imLoadDetail(name);
  var body = document.getElementById('importBody');
  body.innerHTML = _imBack() + '<div class="empty-state rpm-loading">Loading</div>';
  window.scrollTo(0, 0);
  fetch(getScriptUrl() + '?action=getPastLessons&count=9999&studentName=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (_imOpen !== name) return;
      if (!d.success) { body.innerHTML = _imBack() + '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', d.message || 'unknown', 'center'); return; }
      _imRenderStudent(name, d.lessons || []);
    })
    .catch(function () {
      if (_imOpen !== name) return;
      body.innerHTML = _imBack() + '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', 'No answer from Google.', 'center');
    });
}

function _imBack() { return '<div style="margin-bottom:22px">' + _imBackBtn() + '</div>'; }
function _imBackBtn() {
  return '<button class="link-btn" onclick="_imClose()" data-tip="Instant.\nBack to the students.">' + ARROW_ICON + '<span>Back</span></button>';
}

function _imClose() { _imUndock(); _imOpen = null; _imLast = null; _imRoster ? _imRenderCards() : initImportTab(); }

var _imLast = null;   // { name, lessons } of the open student, for re-sorting

// lessons arrive newest first, dates without a year ("Sep /30"). Walking down
// that list, a month later than the one above it means the year went back one.
// Then blocks of 4, 1 2 3 4 inside each, as the sheet lays them out; empty
// slots (the current block's, or a blank row) show dimmed.
var _imShowAll = {};   // key → older blocks opened (2026-10-06); Import closes them for the next student

function _imRenderStudent(name, lessons) {
  if (!_imLast || _imLast.name !== name) _imShowAll = {};
  _imLast = { name: name, lessons: lessons };
  var body = _imBodyEl();
  if (!body) return;
  _imLift(body);
  body.innerHTML = _imStudentHtml(name, lessons, _imHw, _imDetail, { back: true, card: true, log: true, data: true });
  _imFixTips(body);
  if (!_ck.loaded && !_ck.busy) _ckLoad(function () { if (_imOpen === name && _imLast) _imRenderStudent(name, _imLast.lessons); });
}

// ── Log lesson window (2026-10-08; was a card docked on the Import page) ──
// The Log window (#logPanel, lessons.js) inside a window with Checklist, Log
// lesson, HW, Schedule (_imDoHtml), for one lesson: day = its "2026-10-09"
// (today if left out). item: its Lesson checklist entry, so what's done shows
// done (the log text locked; HW and Schedule tick from their sheets).
// next: opens after Done (the student's next open lesson). _logPanelHome
// remembers where the Log window lives, so openLogFresh doesn't float it and
// closeLogPanel puts it back.
function _imLogWinOpen(student, idx, day, item, next) {
  if (window._logPanelHome || window._imDocked) closeLogPanel();
  var name = student.name;
  day = day || _tdYmd();
  // The date in the title when it isn't today's lesson (2026-10-08).
  var part = 'Log Lesson' + (day !== _tdYmd() ? ' · ' + _ckDay(day) : '');
  if (student.trialEmail) part = 'Trial · ' + _ckDay(day);   // from the Trial card (2026-10-23)
  var w = _stWin('imLogWin', inqEsc(name), part, CHECKLIST_ICON, '<div class="im-do-card im-win-card">' + _imDoHtml(name, day) + '</div>');
  w.querySelector('.st-win').classList.add('im-log-win');
  // Today's look (2026-10-11, from Today; everywhere since): grey, red only on the name and Reschedule.
  w.querySelector('.st-win').classList.add('td-look');
  w.onclick = null;   // only ✕ closes it (user, 2026-10-17): an outside click lost Jiayi's email
  w.querySelector('[data-close]').onclick = closeLogPanel;
  var panel = document.getElementById('logPanel');
  window._logPanelHome = { parent: panel.parentNode, next: panel.nextSibling, css: panel.style.cssText };
  window._imWin = { name: name, day: day, next: next || null, trial: student.trialEmail || null };
  window._imDocked = true;
  panel.style.cssText = '';
  w.querySelector('#imLogDock').appendChild(panel);
  _imHwOut();
  openLogFresh(student, idx);
  // No HW question for this lesson (before HW tracking, or a trial): no HW section.
  if (!logHw) {
    ['.im-hwtext-box', '.im-hw-dock-box'].forEach(function (sel) {
      var hb = w.querySelector(sel), hh = hb && hb.previousElementSibling, hr = hh && hh.previousElementSibling;
      [hb, hh, hr && hr.tagName === 'HR' ? hr : null].forEach(function (el) { if (el) el.style.display = 'none'; });
    });
    var ms = w.querySelector('.im-mat-split');   // 2. Practice materials, its question box sits outside the HW dock (2026-10-25)
    if (ms) { ms.style.display = 'none'; if (ms.previousElementSibling) ms.previousElementSibling.style.display = 'none'; }
  }
  // A trial has no regular lessons to move yet (2026-10-23): no 3. Schedule adjustments.
  if (student.trialEmail) {
    var sb = w.querySelector('.im-sched-box'), sec = sb && sb.closest('.im-main-box');
    if (sec) { sec.style.display = 'none'; if (sec.previousElementSibling) sec.previousElementSibling.style.display = 'none'; }
  }
  _imTeachWire();
  _imPillsWire();
  _imMailWire(student, name, day);
  if (item && item.log) _imLogLock(item.logText || '');
  _imStepsRender();
}
// 3. Notes to teacher (2026-10-25): optional rows under HW, private. They go
// into the same Students Import cell as the log, after "TEACHER:", and never
// into the email.
function _imTeachBox() { return _imQ('imTeachRows'); }
function _imTeachWire() {
  _imNoteWire('imTeach', null);
  // 4. Notes to the student (2026-10-25): optional, only in the email's NOTES
  // part (not the sheet's cell). Open till Send; kept in this browser per lesson.
  var w = window._imWin, box = _imStuBox(), o = {};
  try { o = JSON.parse(localStorage.getItem(_imRowsKey(w.name, w.day)) || '{}'); } catch (e) {}
  if (box && o.notes && o.notes.length) {
    box.innerHTML = o.notes.map(function (v, i) { return '<input type="text" class="rpm-field ll-row' + (i ? '' : ' active') + '" value="' + _auEsc(v) + '">'; }).join('');
  }
  _imNoteWire('imStu', function () { _imRowsPut('notes', llValues(box)); _imStepsRender(); });
}
function _imStuBox() { return _imQ('imStuRows'); }
// Phrase pills (user, 2026-10-26): the openings typed every lesson, one tap
// each, under the rows on the add icon's line. A pill types into the last row:
// capitalised only at the very start of the first row, lowercase after that,
// with a comma before it when the row already has text (rows are joined with
// commas when logged, so an empty later row needs none).
var IM_PILLS = {
  log:   ['Covered', 'Practiced', 'Looked at', 'Went over', 'Talked about', 'We played', 'Started', 'Introduced'],   // last three: user, 2026-10-30
  hw:    ['Go over', 'Practice', 'Play', 'Review', 'Speed up'],
  notes: ['Make sure']
};
function _imPillsWire() {
  // None under Notes to teacher (user, 2026-10-26).
  [[_logBox(), IM_PILLS.log], [_hwRowsBox(), IM_PILLS.hw], [_imStuBox(), IM_PILLS.notes]].forEach(function (x) {
    var box = x[0], wrap = box && box.closest('.ll-wrap');
    if (!wrap || (wrap.nextElementSibling && wrap.nextElementSibling.classList.contains('im-pills'))) return;   // the Log and HW rows stay between windows
    var d = document.createElement('div');
    d.className = 'im-pills';
    d.innerHTML = x[1].map(function (t) { return '<button type="button" class="im-pill">' + t + '</button>'; }).join('');
    d.onmousedown = function (e) { e.preventDefault(); };   // the row keeps its cursor
    d.onclick = function (e) { if (e.target.classList.contains('im-pill')) _imPillPut(box, e.target.textContent); };
    wrap.after(d);
  });
}
function _imPillPut(box, t) {
  var rows = llRows(box), inp = rows[rows.length - 1];
  if (!inp || box.classList.contains('locked') || inp.readOnly || inp.disabled) return;
  var v = inp.value, pos = document.activeElement === inp && inp.selectionStart != null ? inp.selectionStart : v.length;
  var before = v.slice(0, pos).replace(/\s+$/, ''), after = v.slice(pos).replace(/^\s+/, '');
  var word = before || rows.length > 1 ? t.charAt(0).toLowerCase() + t.slice(1) : t;
  var head = before ? before + (/,$/.test(before) ? ' ' : ', ') : '';
  inp.value = head + word + ' ' + after;
  inp.focus();
  var p = (head + word + ' ').length;
  inp.setSelectionRange(p, p);
  inp.dispatchEvent(new Event('input', { bubbles: true }));
}
// One rows box with its own ＋ and mic (ids <pre>Rows / <pre>Add / <pre>Mic).
function _imNoteWire(pre, onChange) {
  var box = _imQ(pre + 'Rows');
  if (!box) return;
  llWire(box, function (i) { llRows(box).forEach(function (el, j) { el.classList.toggle('active', j === i); }); }, onChange, null);
  llPlaceMic(box);
  _imQ(pre + 'Add').onclick = function () { llAddRow(box); };
  _imQ(pre + 'Mic').onclick = function () { _imDictate(this, box); };
}
function _imTeachText() {
  var box = _imTeachBox(), rows = box ? llValues(box).filter(Boolean) : [];
  return rows.length ? toSentenceCase(rows.join(', ')) : '';
}
function _imTeachLock(on) {
  var box = _imTeachBox(), mic = _imQ('imTeachMic');
  if (!box) return;
  if (on) llLock(box); else { box.classList.remove('locked'); llRows(box).forEach(function (el) { el.readOnly = false; }); }
  if (mic) mic.disabled = on;
}
// The log in the Lessons list: the teacher note dimmer, after the lesson (2026-10-25).
function _imLogShow(t) {
  var note = _imTeacherOf(t);
  return inqEsc(_imNoTeacher(t)) + (note ? ' <span class="im-teach">TEACHER: ' + inqEsc(note) + '</span>' : '');
}
// A cell's log without its teacher note, and the note alone.
function _imNoTeacher(t) { return String(t || '').replace(/\s*\bTEACHER:[\s\S]*$/, '').trim(); }
function _imTeacherOf(t) { var m = String(t || '').match(/\bTEACHER:\s*([\s\S]*)$/); return m ? m[1].trim() : ''; }
// Dictation into the box's active row, added after what's there (one box at a time).
var _imDictRec = null;
function _imDictStop() { if (_imDictRec) { var r = _imDictRec; _imDictRec = null; r.onend = null; r.abort(); } }
function _imDictate(btn, box) {
  if (!box || box.classList.contains('locked')) return;
  var ta = box.querySelector('.ll-row.active') || llRows(box)[0];
  if (_imDictRec) { var same = _imDictRec._btn === btn; _imDictRec.stop(); if (same) return; }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { rpmFail('logPanelStatus', 'Speech not supported. Use Chrome.'); return; }
  var r = _imDictRec = new SR(), base = ta.value.trim();
  r._btn = btn;
  r.lang = 'en-US'; r.continuous = true; r.interimResults = true;
  r.onstart = function () { btn.innerHTML = MIC_STOP_ICON; btn.classList.add('rec'); playBeep(880, 100); };
  r.onresult = function (ev) {
    var fin = '', tmp = '';
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) fin += ev.results[i][0].transcript; else tmp += ev.results[i][0].transcript;
    }
    if (fin) base = (base + ' ' + fin).replace(/\s+/g, ' ').trim();
    ta.value = (base + ' ' + tmp).replace(/\s+/g, ' ').trim();
  };
  r.onend = function () {
    btn.innerHTML = MIC_ICON; btn.classList.remove('rec');
    if (_imDictRec !== r) return;
    _imDictRec = null;
    playBeep(440, 80, 0.15);
  };
  r.start();
}
// Already logged (the sheet says so): its text in the row, locked, like right after Log.
function _imLogLock(text) {
  if (!activeStudent) return;
  activeStudent.logged = true;
  var row = llRows(_logBox())[0];
  if (row) row.value = _imNoTeacher(text);
  llLock(_logBox());
  var tb = _imTeachBox(), tr = tb && llRows(tb)[0];
  if (tr) tr.value = _imTeacherOf(text);
  _imTeachLock(true);
  var mic = document.getElementById('logMicBtn');
  if (mic) mic.disabled = true;
  var lb = document.getElementById('btnLog');
  if (lb) { lb.textContent = 'Logged ✓'; lb.disabled = true; }
}

// A student's open lessons, oldest first (2026-10-08): the past ones from the
// Lesson checklist, then today's calendar lesson unless all three are done.
// Each: { date, item, student, idx }.
function _imTodayIdx(name) {
  var today = (typeof todayStudents !== 'undefined' && todayStudents) || [];
  for (var i = 0; i < today.length; i++) if (_imKey(today[i].name) === _imKey(name)) return i;
  return -1;
}
function _imQueue(name) {
  var q = _ckPast(name).map(function (it) {
    return { date: it.date, item: it, student: { name: name, eventDate: it.date.replace(/-/g, '/'), calType: 'regular' } };
  });
  var i = _imTodayIdx(name);
  if (i >= 0) {
    var t = todayStudents[i], day = _tdYmd();
    var hr = _imHwToday.rows && _imHwToday.rows[_imKey(name)];
    var logTxt = _imLoggedToday(_imLast && _imLast.name === name && _imLast.lessons);
    // Today's HW list is read once, when Students draws (2026-10-16): after the
    // Log window it's out of date, so the Lesson checklist fills in (an email
    // window closed by mistake reopened the Log window, not the email).
    var ck = _ckItem(name, day);
    if (ck && !(hr && hr.text) && ck.hwText) hr = { hw: ck.hw, text: ck.hwText, files: ck.hwFiles || [], links: ck.hwLinks || [] };
    if (ck && ck.log && !logTxt) logTxt = ck.logText || '';
    var logged = !!t.alreadyLogged || logTxt !== null || !!(ck && ck.log);
    var sched = _imSchedGet(name, day), mailLeft = day >= MSG_START && !_imMsgGet(name, day);
    if (logged && hr && hr.text && sched && mailLeft)   // only the email left
      q.push({ date: day, idx: i, student: t, item: { date: day, log: true, logText: logTxt || '', hw: hr.hw, hwText: hr.text,
        hwFiles: hr.files || [], hwLinks: hr.links || [], missing: ['Email'] } });
    else if (!(logged && hr && hr.text && sched && !mailLeft))
      q.push({ date: day, idx: i, student: t, item: logged ? { log: true, logText: logTxt || '' } : _ckItem(name, day) });
  }
  return q;
}
// Opens the first; after its Done the next one opens, till none are left.
// Only the email left: the Log window too, done steps dim, 4. Email open (2026-10-25).
function _imRunQueue(q, onEach) {
  var x = q.shift();
  if (!x) return;
  var next = q.length ? function () { _imRunQueue(q, onEach); } : null;
  _imLogWinOpen(x.student, x.idx, x.date, x.item, next);
  if (onEach) onEach(x);
}
function _imLogOpen(name) {
  var q = _imQueue(name);
  if (!q.length) return;
  // A save redraws this student's page under the window; the last Done goes back to the list.
  _imRunQueue(q, function () { window._imLogActive = name; if (window._imWin) window._imWin.fromImport = true; });
}

// Today's lesson in the list (newest first, dates like "Oct /6"): its text, or null.
function _imLoggedToday(lessons) {
  var l = lessons && lessons[0];
  if (!l) return null;
  var m = String(l.date || '').replace(/\//g, '').trim().match(/^([A-Za-z]{3})\s*(\d{1,2})$/), now = new Date();
  if (!m || m[1].toLowerCase() !== MONTHS[now.getMonth()].toLowerCase() || parseInt(m[2], 10) !== now.getDate()) return null;
  return l.subject || '';
}

// ── Finish logging steps (2026-10-06) ──
//   Schedule    ticks on Not needed, or when a skip / move saves in the Reschedule window
//   HW          files in the drop zone → sent; Nothing to send → no HW
//   Lesson log  ticks when the Log box's Log saves (the sheet says so on reopen)
// HW picked before Log goes with the log; picked after, it saves on its own (saveHw).
// Schedule (2026-10-08): saved to the Lesson Checklist sheet (saveSchedule,
// RPM_Checklist.js), so every computer sees it; this browser keeps a copy so
// the tick shows at once. day: the lesson's "2026-10-09" (default today).
function _imSchedKey(name, day) { return 'imSched|' + _imKey(name) + '|' + (day || _tdYmd()); }
function _imSchedGet(name, day) {
  // The sheet wins when it has the lesson; the browser copy only covers
  // today's lesson before the Counter has it.
  var it = _ckItem(name, day || _tdYmd());
  if (it) return it.sched === 'Changed' ? 'changed' : it.sched ? 'nochange' : '';
  try { return localStorage.getItem(_imSchedKey(name, day)) || ''; } catch (e) { return ''; }
}
// The tick on this browser and the loaded checklist, no save.
function _imSchedPut(name, day, x) {
  try { if (x) localStorage.setItem(_imSchedKey(name, day), x); else localStorage.removeItem(_imSchedKey(name, day)); } catch (e) {}
  var it = _ckItem(name, day);
  if (it) it.sched = x === 'changed' ? 'Changed' : x === 'nochange' ? 'Not needed' : '';
  var b = _imQ('imNoChangeBtn');
  if (b) b.classList.toggle('pressed', x === 'nochange');
  _imStepsRender();
}
function _imSchedSet(name, v, day) {
  if (day === undefined) day = _imCtx().day;
  day = day || _tdYmd();
  // In the Log lesson window (2026-10-09) it only ticks; it saves with the rest (_imSend).
  var w = window._imWin;
  if (w && _imKey(w.name) === _imKey(name) && w.day === day) { w.pendSched = v; _imSchedPut(name, day, v); return; }
  var prev = _imSchedGet(name, day);
  function put(x) { _imSchedPut(name, day, x); }
  var bk = _imSchedKey(name, day);
  _imSchedBusy[bk] = true;   // Done waits for Google to say it's saved
  put(v);
  fetch(getScriptUrl() + '?action=saveSchedule&name=' + encodeURIComponent(name) + '&lessonDate=' + day + '&sched=' + (v || ''))
    .then(function (r) { return r.json(); })
    .then(function (d) { if (!d.success) throw new Error(d.message || 'Not saved'); delete _imSchedBusy[bk]; _imStepsRender(); })
    .catch(function (e) {
      delete _imSchedBusy[bk];
      put(prev);
      if (document.getElementById('logPanelStatus')) rpmFail('logPanelStatus', 'Schedule not saved: ' + (e && e.message && e.message !== 'Failed to fetch' ? e.message : 'no answer from Google.'));
    });
}
var _imSchedBusy = {};   // lesson key → a Schedule save still on its way
function _imNoChangeToggle(name) { var d = _imCtx().day; _imSchedSet(name, _imSchedGet(name, d) === 'nochange' ? '' : 'nochange', d); }
// Needed / Not needed (2026-10-25); again undoes it. A saved skip or move stays
// Needed (it's in the calendar already); Reschedule stays open for another.
function _imSchedPick(name, v) {
  var w = window._imWin, d = _imCtx().day, cur = _imSchedGet(name, d);
  if (!w) return;
  if (cur === 'changed') return;   // a skip or move is saved: Needed it was
  if (v === 'no') { w.schedNeed = false; _imSchedSet(name, cur === 'nochange' ? '' : 'nochange', d); return; }
  w.schedNeed = !w.schedNeed;
  if (w.schedNeed && cur === 'nochange') _imSchedSet(name, '', d);
  else _imStepsRender();
}

// ── Email step (2026-10-16): the lesson recap email (RPM_LessonMsg.js) ──
// "Your Guitar Lesson Recap — Oct 15". Since 2026-10-25 it's the Log lesson
// window's last section (4. Email the student, _imMailWire): no Email window.
// Send ticks Email in the Lesson Checklist and keeps a Lesson Recaps row.
// Today's lesson, once logged: the steps still missing (Students cards + the student page).
function _imTodayMiss(n) {
  var m = [];
  var hr = _imHwToday.rows && _imHwToday.rows[_imKey(n)];
  if (_imHwToday.rows && !(hr && hr.text)) m.push('HW');
  if (_imHwToday.rows && !hr) m.push('Materials');
  if (!_imSchedGet(n)) m.push('Schedule');
  if (_imMailNeeded(n, _tdYmd())) m.push('Email');
  return m;
}
var HW_TEXT_START = '2026-10-16';   // HW text is a step from here (CHECK_START2 in RPM_Checklist.js)
// A lesson's steps on its Students card (2026-10-17): Log · HW · Materials · Schedule · Email
// as small buttons, grey when done, amber when missing (an amber one opens that lesson's
// window). HW and Email only from their start days.
function _imStepsHtml(day, miss, hwText, name, onlyMissing) {
  var n = _auEsc(JSON.stringify(name));
  var steps = ['Log', 'HW', 'Materials', 'Schedule', 'Email'].filter(function (s) {
    return (s !== 'HW' || day >= HW_TEXT_START || hwText) && (s !== 'Email' || day >= MSG_START);   // HW shown on older lessons too when they have it
  });
  function red(label, tip, mark) { return '<button class="im-step todo' + (mark === false ? ' nolog' : '') + ' opens-window" onclick="event.stopPropagation(); _imLogOpen(' + n + ')" data-tip="Opens a window.\n' + tip + '">' + (mark === false ? '' : '✕ ') + label + '</button>'; }
  // Nothing done yet: one "Not logged" button, not a row of them (user, 2026-10-17).
  if (steps.every(function (s) { return miss.indexOf(s) >= 0; })) return red('Not logged', _ckDay(day) + ' not logged.', false);   // no ✕ on this one (user, 2026-10-17)
  return steps.map(function (s) {
    var label = s === 'Email' ? 'Recap' : s;   // the Email step reads "Recap" (user, 2026-10-26); the sheet still says Email
    return miss.indexOf(s) >= 0 ? red(label, label + ' missing for ' + _ckDay(day) + '.')
                                : onlyMissing ? '' : '<span class="im-step">✓ ' + label + '</span>';   // a plain check / x in front (user, 2026-10-17)
  }).join('');
}
var MSG_START = '2026-10-14';   // Email is a required step from here (CHECK_MSG_START in RPM_Checklist.js; Oct 16 → Oct 14, user 2026-10-17)
function _imMsgKey(name, day) { return 'imMsg|' + _imKey(name) + '|' + (day || _tdYmd()); }
// 'Sent', 'Not needed' or ''.
function _imMsgGet(name, day) {
  day = day || _tdYmd();
  var it = _ckItem(name, day);
  if (it) return it.msg || '';
  try { return localStorage.getItem(_imMsgKey(name, day)) || ''; } catch (e) { return ''; }
}
function _imMsgPut(name, day, v) {
  try { if (v) localStorage.setItem(_imMsgKey(name, day), v); else localStorage.removeItem(_imMsgKey(name, day)); } catch (e) {}
  var it = _ckItem(name, day);
  if (it) it.msg = v;
}
// Still to send for this lesson (from Oct 16; trials and older lessons have none).
function _imMailNeeded(name, day) { return day >= MSG_START && !_imMsgGet(name, day); }
// The Log window's boxes, one per row (2026-10-17): the sheet joins them with
// commas, so "b7, root" typed in one box came back as two lines. Kept in this
// browser at Log / HW time; used only while they still join to the saved text
// (else, or on another computer, the comma split as before).
function _imRowsKey(name, day) { return 'imRows|' + _imKey(name) + '|' + day; }
function _imRowsPut(part, rows) {
  var w = window._imWin;
  if (!w) return;
  var k = _imRowsKey(w.name, w.day || _tdYmd()), o = {};
  try { o = JSON.parse(localStorage.getItem(k) || '{}'); o[part] = (rows || []).filter(Boolean); localStorage.setItem(k, JSON.stringify(o)); } catch (e) {}
}
function _imRowsFor(m, part, text) {
  var o = {};
  try { o = JSON.parse(localStorage.getItem(_imRowsKey(m.name, m.day)) || '{}'); } catch (e) {}
  var r = o[part];
  var norm = function (t) { return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
  return r && r.length && norm(r.join(', ')) === norm(text) ? r : text;
}
// ── 4. Email the student (2026-10-25; was its own Email window) ──
// The Log window is the email: 1. Lesson and 2. HW are written to the
// student, each row a sentence. Preview shows it here, Send sends what was
// previewed once the steps above are done. 3. Notes to teacher never goes;
// 4. Notes to the student goes under NOTES.
function _imMailWire(student, name, day) {
  var w = window._imWin, box = _imQ('imMailBox'), head = box && box.previousElementSibling;
  if (!w || !box) return;
  // From Oct 14 (MSG_START); a trial's recap is always asked for (2026-10-23). No HW question, no email.
  w.mail = !!logHw && (student.trialEmail ? !_imMsgGet(name, day) : _imMailNeeded(name, day));
  box.style.display = head.style.display = w.mail ? '' : 'none';
  if (!w.mail) return;
  w.mailTo = w.trial || '';
  if (w.trial) _imQ('imMailNum').textContent = '3.';   // no 3. Schedule on a trial
  _imQ('imMailSbj').textContent = 'Your ' + (w.trial ? 'Trial' : 'Guitar') + ' Lesson Recap — ' + _ckDay(day);
  _imQ('imMailPrev').onclick = _imMailPreview;
  _imQ('imMailSend').onclick = _imMailSend;
  _imQ('imMailRedo').onclick = function () { _imMailFill(w, true); };
  // An edit hides an open preview: it no longer shows what would go.
  ['imMailLesson', 'imMailHw', 'imMailNotes'].forEach(function (id) {
    _imQ(id).oninput = function () { _imQ('imMailFrame').hidden = true; _imStepsRender(); };
  });
  // Their email (the Counter, or the trial row) and whether it already went.
  fetch(getScriptUrl() + '?action=getLessonMsgInfo&name=' + encodeURIComponent(name) + '&lessonDate=' + day + (w.trial ? '&trial=' + encodeURIComponent(w.trial) : ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (window._imWin !== w || !d.success) return;
      if (d.email) w.mailTo = d.email;
      if (d.msg) w.mailSent = true;
      _imStepsRender();
    })
    .catch(function () {})
    .then(function () {
      var show = window._imWin === w && _imQ('imMailToShow');
      if (show) show.textContent = w.mailTo || (w.trial ? 'No email on the trial row' : 'No email in the Counter');
    });
}
// Rows (or a comma-joined text) as sentences: capital first letter, a full
// stop unless it ends in . ! or ?, joined with spaces.
function _imMailSentences(rows) {
  if (!Array.isArray(rows)) rows = String(rows || '').split(/\s*,\s*/);
  return rows.filter(Boolean).map(function (t) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (/^no show$/i.test(t)) return 'No show';   // no full stop, as in the log (user, 2026-10-26)
    return /[.!?]$|- RPM$/.test(t) ? t : t + '.';   // a signed line ("- RPM") gets no full stop
  }).join(' ');
}
// The email, from the Log window as it stands. A lesson reopened from the
// sheet has its log in one row: the rows kept in this browser split it again.
function _imLogMail(fromLog) {
  var w = window._imWin, hw = logHw;
  if (!w || !hw) return null;
  var m = { name: w.name, day: w.day, trial: w.trial || '' }, sent = hw.choice === 'sent';
  m.lesson = _imMailSentences(_imRowsFor(m, 'log', _imNoTeacher(llValues(_logBox()).filter(Boolean).join(', '))));
  m.hw = _imMailSentences(_imRowsFor(m, 'hw', _imNoTeacher(_hwRowsJoin())));
  m.notes = _imMailSentences(llValues(_imStuBox()));
  m.files = !!(sent && hw.filesOn && hw.files.length);
  m.paths = m.files ? hw.files.map(function (f) { return f.path; }) : [];   // the email lists them as folders (2026-10-25)
  m.links = sent ? hw.links.slice() : [];
  m.phone = hw.phone ? (hw.zoom ? 'zoom' : '1') : '';   // with Nothing to send too (2026-10-25); Zoom since 2026-10-26
  // The email page's boxes once written (2026-10-30): what's in them goes, edits and all.
  if (w.mailFilled && !fromLog) {
    m.lesson = _imQ('imMailLesson').value.trim();
    m.hw = _imQ('imMailHw').value.trim();
    m.notes = _imQ('imMailNotes').value.trim();
  }
  return m;
}
// The email page's boxes from the log (on first reaching the page, and Start over).
function _imMailFill(w, force) {
  if (!w || (w.mailFilled && !force)) return;
  var m = _imLogMail(true);
  if (!m) return;
  _imQ('imMailLesson').value = m.lesson;
  _imQ('imMailHw').value = m.hw;
  _imQ('imMailNotes').value = m.notes;
  w.mailFilled = true;
  _imQ('imMailFrame').hidden = true;
  _imQ('imMailStatus').innerHTML = '';
  _imStepsRender();
}
// What previewLessonMessage / sendLessonMessage take.
function _imMailParams(m) {
  return {
    name: m.name, lessonDate: m.day, lesson: m.lesson, hw: m.hw, notes: m.notes,
    links: m.links.map(function (l) { return l.kind + ': ' + l.url; }).join('\n'), files: m.files ? '1' : '0', phone: m.phone || '0',
    filePaths: (m.paths || []).slice(0, 80).join('\n'),
    trial: m.trial
  };
}
function _imMsgQuery(p) {
  return Object.keys(p).map(function (k) { return '&' + k + '=' + encodeURIComponent(p[k]); }).join('');
}
function _imMailCheck(p) {
  if (!p.lesson) return 'Lesson notes is empty.';
  if (!p.hw) return 'Things to practice is empty.';
  return '';
}
// The email in a white card, its own page so the portal's styles stay out.
function _imMsgShow(f, html) {
  var logo = new URL('img/email-logo.png', location.href).href;
  var lnk = new URL('img/email-link.png', location.href).href;
  var vid = new URL('img/email-video.png', location.href).href;
  var dbx = new URL('img/email-dropbox.png', location.href).href;   // cid:dbx, the files line's Dropbox logo (2026-10-25)
  f.hidden = false;
  f.onload = function () { try { f.style.height = (f.contentDocument.documentElement.scrollHeight + 2) + 'px'; } catch (e) {} };
  f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'html,body{margin:0;background:#fff;color:#222;font:small/1.45 Arial,Helvetica,sans-serif}body{padding:18px 20px 20px}a{color:#1a0dab}' +
    '</style></head><body>' + String(html || '').replace(/cid:logo/g, logo).replace(/cid:dbx/g, dbx).replace(/cid:lnk/g, lnk).replace(/cid:vid/g, vid) + '</body></html>';
}
// Preview and Send (_imStepsRender): Send waits for the steps before it, not
// for a Preview (user, 2026-10-30: preview only when wanted).
function _imMailRender(w, finished) {
  var prev = _imQ('imMailPrev'), send = _imQ('imMailSend'), redo = _imQ('imMailRedo');
  if (!w || !w.mail || !prev || !send) return;
  var m = _imLogMail(), p = m && _imMailParams(m), off = !!(w.mailBusy || w.mailSent || !p || _imMailCheck(p));
  var f = _imQ('imMailFrame'), shown = !!(f && !f.hidden);
  // Changed since the Preview (more materials, a note): the old email goes.
  if (shown && w.previewed !== JSON.stringify(p) && !w.mailBusy) { f.hidden = true; shown = false; }
  prev.disabled = !!(w.mailBusy || w.mailSent || !p) || (!shown && off);
  prev.querySelector('span').textContent = shown ? 'Hide preview' : 'Preview';
  send.disabled = off || !finished;
  if (redo) redo.disabled = !!(w.mailBusy || w.mailSent);
}
function _imMailBusy(btn, on) {
  var w = window._imWin;
  if (w) w.mailBusy = on;
  // Everything dims, the pressed button too, and SENDING / LOADING sits in the middle of the window (user, 2026-10-21 / 2026-10-23).
  rpmBusy(document.querySelector('#imLogWin .im-do-card'), btn, on, btn && btn.id === 'imMailSend' ? 'Sending' : 'Loading');
  if (!on) _imStepsRender();
}
function _imMailPreview() {
  var w = window._imWin, btn = _imQ('imMailPrev');
  if (!w || w.mailBusy) return;
  var fr = _imQ('imMailFrame');
  if (!fr.hidden) { fr.hidden = true; _imStepsRender(); return; }   // pressed again: hides it
  var p = _imMailParams(_imLogMail()), why = _imMailCheck(p);
  _imQ('imMailStatus').innerHTML = '';
  if (why) { rpmFail('imMailStatus', why); return; }
  _imMailBusy(btn, true);
  fetch(getScriptUrl() + '?action=previewLessonMessage' + _imMsgQuery(p))
    .then(function (r) { return r.json(); })
    .catch(function () { return { success: false, message: 'No answer from Google.' }; })
    .then(function (d) {
      if (window._imWin !== w) return;
      if (d.success) w.previewed = JSON.stringify(p);
      _imMailBusy(btn, false);
      if (!d.success) { rpmFail('imMailStatus', d.message || 'Preview not loaded.'); return; }
      var f = _imQ('imMailFrame');
      _imMsgShow(f, d.html);
      _imStepsRender();   // the button reads Hide preview
      setTimeout(function () { f.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
    });
}
function _imMailSend() {
  var w = window._imWin, btn = _imQ('imMailSend');
  if (!w || w.mailBusy || !btn || btn.disabled) return;
  var p = _imMailParams(_imLogMail()), why = _imMailCheck(p), to = String(w.mailTo || '').trim();
  _imQ('imMailStatus').innerHTML = '';
  if (!why && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) why = 'No email for ' + w.name + (w.trial ? ' on the trial row.' : ' in the Counter (column D).');
  if (why) { rpmFail('imMailStatus', why); return; }
  _imMailBusy(btn, true);
  // GET, like every portal action (a POST lands in the Twilio webhook).
  fetch(getScriptUrl() + '?action=sendLessonMessage' + _imMsgQuery(p) + '&to=' + encodeURIComponent(to))
    .then(function (r) { return r.json(); })
    .catch(function () { return { success: false, message: 'No answer from Google.' }; })
    .then(function (d) {
      if (d.success) { w.mailSent = true; _imMsgPut(w.name, w.day, 'Sent'); }
      if (d.success && w.trial && typeof _tlMarkEmail === 'function') _tlMarkEmail(w.trial, { recap: 'Sent' });   // the Trial card's Email step
      if (window._imWin !== w) { if (!d.success) rpmToast('fail', 'Email not sent', w.name + ': ' + (d.message || '')); return; }
      _imMailBusy(btn, false);
      if (!d.success) { rpmFail('imMailStatus', d.message || 'Not sent.'); return; }
      // Done ✓, the window closes, then the student's next open lesson or back to the list.
      if (d.tickError) { rpmHalf('imMailStatus', 'Sent, not recorded', d.tickError + '. The email went out.'); setTimeout(function () { if (window._imWin === w) _imDone(w.name); }, 2500); return; }
      _imDone(w.name);
    });
}

// ── Lesson checklist (2026-10-08): getChecklistAudit (RPM_Checklist.js) ──
// Every lesson since the sheet's start (Oct 9) that still misses Log, HW or
// Schedule, per student, oldest first, with what's done (log text, HW answer).
// Import's cards and Log lesson button and the Audit tab's Lesson checklist read it.
var _ck = { byName: {}, loaded: false, busy: false, start: '' };
function _ckItem(name, day) {
  var l = _ck.byName[_imKey(name)] || [];
  for (var i = 0; i < l.length; i++) if (l[i].date === day) return l[i];
  return null;
}
function _ckLoad(then) {
  var url = getScriptUrl(); if (!url) return;
  _ck.busy = true;
  _imListBusy(true);
  // window._ckStart (a read only): try the checklist on older lessons.
  fetch(url + '?action=getChecklistAudit' + (window._ckStart ? '&start=' + window._ckStart : ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) throw new Error(d.message || 'unknown');
      var by = {};
      (d.audit || []).forEach(function (a) { by[_imKey(a.name)] = a.lessons; });
      _ck = { byName: by, loaded: true, busy: false, start: d.start || '', audit: d.audit || [] };
      if (!window._ckStart) try { localStorage.setItem('rpmCkCache', JSON.stringify({ byName: by, start: _ck.start, audit: _ck.audit })); } catch (e) {}
      if (then) then(null);
      _imAfterCk(false);
    })
    .catch(function (e) { _ck.busy = false; if (then) then(e && e.message || 'No answer from Google.'); _imAfterCk(true); });
}
// The Students list waits on the checklist (2026-10-30): draw it once it's in.
// The read takes ~12s, so the last one is kept in this browser (rpmCkCache): the
// cards draw from it at once and redraw quietly when the fresh one lands.
var _imCkFail = false;
function _imAfterCk(failed) {
  _imCkFail = failed;
  _imListBusy(false);
  var p = document.getElementById('tab-import');
  if (_imRoster && !_imOpen && p && p.classList.contains('active')) _imRenderCards(true);
}
function _ckFromCache() {
  if (_ck.loaded || _ck.cached) return !!_ck.cached || _ck.loaded;
  try {
    var c = JSON.parse(localStorage.getItem('rpmCkCache') || 'null');
    if (c && c.byName) { _ck.byName = c.byName; _ck.start = c.start || ''; _ck.audit = c.audit || []; _ck.cached = true; }
  } catch (e) {}
  return !!_ck.cached;
}
// Past lessons still open (before today; today's comes from the calendar).
function _ckPast(name) {
  var t = _tdYmd();
  return (_ck.byName[_imKey(name)] || []).filter(function (x) { return x.date < t; });
}
function _ckDay(k) { var p = String(k).split('-'); return MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10); }

// Where the doing card is open (2026-10-08): the Log lesson window
// (_imLogWinOpen), else Import's page (nothing to tick there).
function _imCtx() {
  var a = window._imWin;
  if (a) return { name: a.name, day: a.day || _tdYmd(), root: document.getElementById('imLogWin') };
  return { name: _imOpen, day: _tdYmd(), root: document.getElementById('importBody') };
}
function _imQ(id) { var r = _imCtx().root; return r ? r.querySelector('#' + id) : null; }

function _imStepsRender() {
  // The Checklist box is gone (2026-10-18, user doesn't look at it); this still
  // dims finished sections and sends the lesson once all steps are ticked.
  var c = _imCtx(), el = _imQ('imSteps');
  if (!c.root || !c.name || !window._imDocked) return;
  var name = c.name, hw = logHw, st = activeStudent;
  // A trial has no Schedule step: counts as answered.
  var logged = !!(st && st.logged), sched = window._imWin && window._imWin.trial ? 'trial' : _imSchedGet(name, c.day);
  // A status list (2026-10-06), not buttons: each line ticks itself when its
  // job is done elsewhere (Reschedule, the HW drop zone / Nothing to send, Log).
  // The card's order (2026-10-15): Lesson log, HW log (the HW rows, required),
  // Materials sent (was "HW"), Schedule checked; green, green, blue, red.
  var hwText = !!(hw && hw.textSaved);
  // Materials (2026-10-18): files / links / phone wait for Finish; Nothing to send is
  // its own answer; one already in the sheet counts.
  // Both picks required (2026-10-25): A. recorded or not, B. send or nothing.
  var matIn = !!(hw && hw.choice && (hw.choice === 'none' || hw.saved || hw.matDone));
  var matOk = !!(hw && hw.rec && matIn);
  var fb = _imQ('imMatFinishBtn');
  if (fb) {
    fb.disabled = !(hw && hw.choice === 'sent' && !hw.loading && !hw.uploading && !hw.gathering && !matIn);
    fb.textContent = matIn && hw.choice === 'sent' ? 'Finished ✓' : 'Finish';
  }
  // The materials box (A. Files, B. Video lesson link, C. Web link, Finish) opens on Send (user, 2026-10-30;
  // was once 1. is answered too). 1. is still needed for the step to be done (matOk).
  var open = !!(hw && hw.pick === 'send');
  Array.prototype.forEach.call(c.root.querySelectorAll('.im-mat-sec'), function (el) {
    // D. and E.'s boxes only once their Yes is picked (or a link of that kind is in).
    var kind = el.querySelector('#imMatVideo') ? 'Video' : el.querySelector('#imMatLink') ? 'Link' : el.querySelector('#imHwDock') ? 'Files' : null;
    var on = !kind || _imLinkOn(hw, kind);
    el.style.display = open && on ? '' : 'none';
    if (el.previousElementSibling) el.previousElementSibling.style.display = open ? '' : 'none';
  });
  var ft = _imQ('imMatFilesTools');
  if (ft) ft.style.display = _imLinkOn(hw, 'Files') ? '' : 'none';
  [['imFilesYes', 'Files'], ['imVidYes', 'Video'], ['imWebYes', 'Link']].forEach(function (x) {
    var b = _imQ(x[0]);
    if (!b) return;
    b.classList.toggle('done', _imLinkOn(hw, x[1]));
    b.disabled = !hw || !!(hw.locked || hw.loading || hw.saving);
  });
  if (fb && fb.parentNode) fb.parentNode.style.display = open ? '' : 'none';
  var gl = _imQ('imGatherList'), gb = _imQ('logHwGatherBtn');
  if (gl) gl.innerHTML = _imGatherHtml(hw);
  if (gb) gb.disabled = !hw || !!(hw.locked || hw.loading || hw.uploading || hw.noDbx || hw.gathering);
  var mb = _imQ('imMatBox'), mn = _imQ('imMatNone');
  if (mb) mb.style.display = open ? '' : 'none';
  if (mn) mn.classList.toggle('im-dim', !!(hw && hw.rec && hw.pick));   // both answered: the questions box dims
  // 3. Schedule's picks; Reschedule shows with Needed.
  var sRaw = _imSchedGet(name, c.day), sNeed = !!(window._imWin && window._imWin.schedNeed) || sRaw === 'changed';
  var sy = _imQ('imSchedYes'), sn = _imQ('imSchedNo'), srs = _imQ('imSchedRs');
  if (sy) sy.classList.toggle('done', sNeed);
  if (sn) sn.classList.toggle('done', sRaw === 'nochange');
  if (srs) srs.style.display = sNeed ? '' : 'none';
  [['imRecPhone', hw && hw.rec === 'phone'], ['imRecZoom', hw && hw.rec === 'zoom'], ['imRecNo', hw && hw.rec === 'no'], ['imMatSend', hw && hw.pick === 'send'], ['imMatNo', hw && hw.pick === 'none']].forEach(function (x) {
    var b = _imQ(x[0]);
    if (!b) return;
    b.classList.toggle('done', !!x[1]);
    b.disabled = !hw || !!(hw.locked || hw.loading || hw.saving || (x[0] === 'imMatNo' || x[0] === 'imMatSend') && hw.uploading);
  });
  var steps = [
    { label: 'Lesson log', cls: 'log', done: logged },
    { label: 'HW log', cls: 'hw', done: hwText },
    { label: 'Materials sent', cls: 'mat', done: matOk },
    { label: 'Schedule checked', cls: 'sched', done: !!sched }
  ];
  if (!hw) steps.splice(1, 2);   // no HW question for this lesson (before HW tracking)
  // Circle + label on one line (2026-10-08, back from the Trial pills): done ones dim.
  if (el) el.innerHTML = '<div class="im-checks">' + steps.map(function (x) {
    return '<div class="im-check im-check-' + x.cls + (x.done ? ' done' : '') + '"><i class="im-tick"></i><span>' + inqEsc(x.label) + '</span></div>';
  }).join('') + '</div>';
  // A finished section dims (2026-10-08): Log lesson once logged, HW once
  // answered and saved, Schedule once answered (Not needed / a change saved).
  function dim(cls, on) {
    var box = c.root.querySelector('.' + cls);
    if (!box) return;
    box.classList.toggle('im-dim', on);
    if (box.previousElementSibling) box.previousElementSibling.classList.toggle('im-dim', on);
  }
  // Dims the moment it's ticked (2026-10-09), not when Google answers.
  dim('im-log-box', logged);
  dim('im-hwtext-box', hwText);
  dim('im-hw-dock-box', matOk);
  dim('im-sched-box', !!sched);
  // A finished section (2026-10-18): ✓ after its red title, its whole box dims.
  var secs = c.root.querySelectorAll('.im-main-box'), secDone = [logged && (!hw || hwText), matOk, !!sched, !!(window._imWin && window._imWin.mailSent)];
  Array.prototype.forEach.call(secs, function (box, i) {
    box.classList.toggle('im-sec-done', !!secDone[i]);
    if (box.previousElementSibling) box.previousElementSibling.classList.toggle('im-sec-done', !!secDone[i]);
  });
  var w = window._imWin;
  var all = logged && !!sched && (!hw || (hwText && matOk && !hw.loading && !hw.uploading));
  var pending = !!w && _imPending(w, hw), sending = !!(w && w.sending);
  var fin = _imQ('imFinDone');
  // Finished: all four ticked and saved.
  var finished = all && !pending && !sending && !_imSchedBusy[_imSchedKey(name, c.day)];
  // The window dims while it all goes to Google (2026-10-21): a spinner says it's working, no success line.
  // Also while Log waits for a Dropbox upload to finish, so it never just goes dark (user, 2026-10-21).
  var waitUp = !!(w && w.pendLog && hw && hw.uploading);
  if (fin) fin.innerHTML = (sending || waitUp) ? '<span class="rpm-loading">Logging</span>' : '';
  // All four ticked: they go to Google together.
  if (all && pending && !sending) { _imSend(w, hw); return; }
  // 4. Email (2026-10-25): Send opens once the rest is saved; Send then does Done.
  var mailLeft = !!(w && w.mail && !w.mailSent);
  _imMailRender(w, finished);
  _imPagesRender(w, { 1: logged && (!hw || hwText), 2: matOk, 3: !!sched, 4: !!(w && w.mailSent) }, !!hw);
  // Finished by something pressed here (not just reopened): Done, then back (2026-10-07).
  if (finished && !mailLeft && window._imActed === name) { window._imActed = null; _imDone(name); }
}

// ── Pages (user, 2026-10-30) ──
// The Log window shows one section at a time: 1. Log, 2. Practice materials,
// 3. Change appointment, 4. Email (a trial has no 3; no HW question, no 2; no
// email to send, no 4). Next waits till the page is done, saves it (_imSend,
// as closing does) and turns to the next; Back and the numbers on top go back.
function _imPageList(w, hasHw) {
  return [1, 2, 3, 4].filter(function (p) {
    return (p !== 2 || hasHw) && (p !== 3 || !w.trial) && (p !== 4 || w.mail);
  });
}
function _imPagesRender(w, done, hasHw) {
  var c = _imCtx(), dots = _imQ('imPgDots');
  if (!w || !c.root || !dots) return;
  var list = _imPageList(w, hasHw);
  w.pgDone = done; w.pgList = list;
  // Opens on the first page not done (a lesson half done picks up there).
  if (!w.page || list.indexOf(w.page) < 0) {
    w.page = list.filter(function (p) { return !done[p]; })[0] || list[list.length - 1];
  }
  var at = list.indexOf(w.page);
  Array.prototype.forEach.call(c.root.querySelectorAll('.im-page'), function (el) {
    el.style.display = +el.getAttribute('data-pg') === w.page ? '' : 'none';
  });
  if (w.page === 4) _imMailFill(w);
  // A page can be opened once every page before it is done.
  var open = function (i) { return list.slice(0, i).every(function (p) { return done[p]; }); };
  dots.innerHTML = list.map(function (p, i) {
    var shown = i + 1;   // a trial's pages read 1 2 3
    return '<button type="button" class="link-btn' + (p === w.page ? ' bright' : '') + '" style="min-width:36px;justify-content:center"' +
      (open(i) && p !== w.page ? ' onclick="_imPageTo(' + p + ')"' : ' disabled') + '>' + shown + (done[p] ? ' ✓' : '') + '</button>';
  }).join('');
  var back = _imQ('imPgBack'), next = _imQ('imPgNext'), busy = !!(w.sending || w.mailBusy);
  if (back) { back.style.visibility = at > 0 ? '' : 'hidden'; back.disabled = busy; }
  if (next) { next.style.display = at < list.length - 1 ? '' : 'none'; next.disabled = busy || !done[w.page]; }
}
function _imPageTo(p) {
  var w = window._imWin;
  if (!w || w.sending) return;
  if (_imPending(w, logHw)) _imSend(w, logHw);   // what's ticked goes to Google now, as on close
  w.page = p;
  _imStepsRender();
  var d = _imQ('imPgDots');
  if (d) d.scrollIntoView({ block: 'start' });
}
function _imPageGo(step) {
  var w = window._imWin, list = w && w.pgList;
  if (!list) return;
  var i = list.indexOf(w.page) + step;
  if (i < 0 || i >= list.length || (step > 0 && !(w.pgDone || {})[w.page])) return;
  _imPageTo(list[i]);
}

// ── One save at the end (2026-10-09) ──
// In the Log lesson window Log, HW and Schedule tick and dim the moment
// they're pressed; nothing goes to Google till all three are ticked, then
// all at once: the lesson with its HW in one call, Schedule beside it.
// Closing the window early saves whatever was ticked (_imFlushOnClose).
function _imPendLog(student, params, action) {
  var w = window._imWin;
  if (!w || !activeStudent) return;
  w.pendLog = { student: student, params: params, action: action };
  activeStudent.logged = true;
  llLock(_logBox());
  _imTeachLock(true);
  var mic = document.getElementById('logMicBtn');
  if (mic) mic.disabled = true;
  var lb = document.getElementById('btnLog');
  if (lb) { lb.textContent = 'Logged ✓'; lb.className = 'link-btn green'; lb.disabled = true; }
  var ns = document.getElementById('btnNoShow');
  if (ns) ns.disabled = true;
  // Log is for the lesson and its HW together (2026-10-18): the HW rows tick and lock with it.
  // A No show with nothing in HW leaves it open, as before; one with HW (the
  // no-show line or HW of its own, 2026-10-26) locks it like any lesson.
  if (logHw && (!params.noShow || _hwRowsJoin())) {
    _hwMicStop();
    logHwTextInput();
    if ((logHw.text || '') !== (logHw.textSaved || '')) { logHw.textSaved = logHw.text; if (logHw.choice) logHw.dirty = true; }
    logHw.textLocked = true;
    llLock(_hwRowsBox());
    var hm = document.getElementById('logHwMic');
    if (hm) hm.disabled = true;
  }
  _imStepsRender();
}
// HW to save: answered here, or files picked up here, and not in the sheet yet.
function _imHwNeeds(hw) { return !!(hw && hw.choice && (hw.dirty || !hw.saved) && !hw.loading && !hw.uploading); }
function _imPending(w, hw) { return !!(w.pendLog || _imHwNeeds(hw) || w.pendSched !== undefined); }
function _imSend(w, hw) {
  if (!w || w.sending || !_imPending(w, hw)) return;
  w.sending = true;
  var url = getScriptUrl(), log = w.pendLog, sched = w.pendSched, hwc = _imHwNeeds(hw) ? hw.choice : null;
  var hwq = hwc ? _logHwQuery(hw, '') : '';
  function get(q) {
    return fetch(q).then(function (r) { return r.json(); })
      .catch(function () { return { success: false, message: 'No answer from Google.' }; });
  }
  var calls = [];
  if (log) {
    var q = url + '?action=' + log.action;
    for (var k in log.params) q += '&' + k + '=' + encodeURIComponent(log.params[k]);
    // logLesson's own HW names (hwFiles, hwLinks, hwText).
    if (hwc) q += _logHwQuery(hw, 'hw');
    calls.push(get(q));
  } else calls.push(Promise.resolve(null));
  calls.push(hwc && !log ? get(url + '?action=saveHw&name=' + encodeURIComponent(hw.name) + '&lessonDate=' + hw.date + hwq +
    (w.trial ? '&trial=' + encodeURIComponent(w.trial) : '')) : Promise.resolve(null));
  // Schedule after the log and HW answer (2026-10-11): sent at the same moment
  // they wrote the same checklist row and the log wiped it (Gulnara, Oct 11).
  calls.push(sched !== undefined ? Promise.all(calls.slice()).then(function () {
    return get(url + '?action=saveSchedule&name=' + encodeURIComponent(w.name) + '&lessonDate=' + w.day + '&sched=' + (sched || ''));
  }) : Promise.resolve(null));
  if (hw) hw.locked = true;
  if (window._imWin === w) { rpmBusy(document.querySelector('#imLogWin .im-do-card'), null, true, false); _logHwRender(); _imStepsRender(); }
  Promise.all(calls).then(function (r) {
    var lr = r[0], hr = r[1], sr = r[2], why = [];
    w.sending = false;
    if (hw) hw.locked = false;
    if (lr) {
      w.pendLog = null;
      if (lr.success) {
        _logLessonDone(log.student, log.params.subject, lr, hw);
        // The Trial card's steps follow (2026-10-23).
        if (w.trial && typeof _tlMarkEmail === 'function') {
          var tp = { whatWeDid: log.params.subject, hwLog: log.params.hwText || '' };
          if (lr.hwSaved) tp.hwSent = true;
          _tlMarkEmail(w.trial, tp);
        }
        if (lr.hwSaved && hw && hw.choice === hwc) hw.dirty = false;
        if (lr.noShowError) why.push('No show: ' + lr.noShowError + '.');
        if (lr.hwError) { why.push('HW: ' + lr.hwError); if (hw && hw.choice === hwc) { hw.choice = null; hw.dirty = false; } }
      } else {
        why.push(lr.message || 'Lesson not logged.');
        // Back to Log: the rows open again; HW and Schedule stay ticked and go with the next Log.
        if (window._imWin === w && activeStudent) {
          activeStudent.logged = false;
          var box = _logBox();
          if (box) { box.classList.remove('locked'); llRows(box).forEach(function (el) { el.readOnly = false; }); }
          _imTeachLock(false);
          var mic = document.getElementById('logMicBtn');
          if (mic) mic.disabled = false;
          var lb = document.getElementById('btnLog');
          if (lb) { lb.textContent = '＋ Log'; lb.className = 'link-btn bright'; lb.disabled = false; }
          var ns = document.getElementById('btnNoShow');
          if (ns) ns.disabled = false;
        }
      }
    }
    if (hr) {
      if (hr.success) {
        if (hw.choice === hwc) { hw.saved = true; hw.dirty = false; }
        _logHwSaved(hw.name, hw);
        if (w.trial && typeof _tlMarkEmail === 'function') _tlMarkEmail(w.trial, { hwSent: true, hwLog: hw.text || '' });
      } else {
        why.push('HW: ' + (hr.message || 'not saved.'));
        if (hw.choice === hwc) { hw.choice = null; hw.dirty = false; }   // un-ticked: pick it again to retry
      }
    }
    if (sr) {
      if (w.pendSched === sched) delete w.pendSched;
      if (!sr.success) {
        why.push('Schedule: ' + (sr.message || 'not saved.'));
        if (window._imWin === w) _imSchedPut(w.name, w.day, ''); else try { localStorage.removeItem(_imSchedKey(w.name, w.day)); } catch (e) {}
      }
    }
    if (window._imWin === w) {
      var card2 = document.querySelector('#imLogWin .im-do-card');
      rpmBusy(card2, null, false);
      if (why.length) { window._imActed = null; rpmFail('logPanelStatus', why.join(' ')); }
      _logHwRender(); updateLogButton(); _imStepsRender();
    } else {
      // Saved after the window closed: say so only if something didn't.
      if (why.length) rpmToast('fail', 'Not saved', w.name + ': ' + why.join(' '));
      if (_imOpen && _imKey(_imOpen) === _imKey(w.name) && typeof _imOpenStudent === 'function') _imOpenStudent(_imOpen);
      // Closed with the email still to send: their card shows "✕ Email", which reopens the Log window (2026-10-25).
      _ckLoad(function () { _ckRedraw(); });
    }
  });
}
// closeLogPanel: the window shuts now; what was ticked still saves.
function _imFlushOnClose() {
  var w = window._imWin;
  if (w && !w.sending && _imPending(w, logHw)) _imSend(w, logHw);
}

// Anything pressed or dropped in the doing card arms Done for that student,
// so reopening an already finished one doesn't bounce you out (2026-10-07).
['click', 'drop'].forEach(function (ev) {
  document.addEventListener(ev, function (e) {
    if (!e.target.closest) return;
    if (window._imWin && e.target.closest('#imLogWin')) window._imActed = window._imWin.name;
  }, true);
});
// All done (the email sent, when there is one): the card dims, Done ✓, and
// back to the student list, where their card is green.
function _imDone(name) {
  var c = _imCtx(), card = c.root && c.root.querySelector('.im-do-card');
  if (!card) return;
  card.classList.add('im-done');
  var msg = document.createElement('div');
  msg.className = 'im-done-msg';
  msg.textContent = 'Done ✓';
  card.appendChild(msg);
  setTimeout(function () {
    var w = window._imWin;
    if (!w || w.name !== name) return;
    var next = w.next, fromImport = w.fromImport;
    closeLogPanel();   // the window closes
    if (next) next();  // the student's next open lesson (2026-10-08)
    else if (fromImport && _imOpen && _imKey(_imOpen) === _imKey(name)) _imClose();   // the last one: back to the list, their card green
  }, 1400);
}

// Finish (2026-10-18): the files / links / phone are all in; till then Materials stays open.
// Gathered files (2026-10-25) move into the lesson's HW folder first
// (gatherHwFiles, RPM_HwLog.js), then count as files put in here.
function _imMatFinish() {
  var hw = logHw;
  if (!hw || hw.choice !== 'sent' || hw.loading || hw.uploading || hw.gathering) return;
  var paths = (hw.found || []).map(function (f) { return f.path; });
  if (!paths.length) { hw.matDone = true; _imStepsRender(); return; }
  var card = document.querySelector('#imLogWin .im-do-card');
  hw.gathering = 'move';
  rpmBusy(card, null, true, 'Moving');
  _imStepsRender();
  fetch(getScriptUrl() + '?action=gatherHwFiles&name=' + encodeURIComponent(hw.name) + '&lessonDate=' + hw.date + '&paths=' + encodeURIComponent(paths.join('\n')))
    .then(function (r) { return r.json(); })
    .catch(function () { return { success: false, message: 'No answer from Google.' }; })
    .then(function (d) {
      if (logHw !== hw) return;
      hw.gathering = false;
      rpmBusy(card, null, false);
      var folder = lessonFolderName(hw.date);
      var moved = d.paths || (d.success ? paths.map(function (p) { return p.split('/')[0].toUpperCase() === folder ? p : folder + '/' + p; }) : []);
      moved.forEach(function (p) {
        var nm = p.split('/').pop();
        if (!hw.files.some(function (f) { return f.path.toLowerCase() === p.toLowerCase(); })) hw.files.push({ name: nm, path: p });
        hw.mine[nm.toLowerCase()] = true;
      });
      hw.found = null;
      if (!d.success) { rpmFail('logPanelStatus', d.message || 'Files not moved.'); _imHwChanged(); return; }
      hw.matDone = true;
      _imHwChanged();
    });
}
// Gather (2026-10-25): what went into their Dropbox since the lesson day and is
// on no HW yet; no ticks (user: put in that day means meant for it), Finish takes all.
function _imGather() {
  var hw = logHw;
  if (!hw || hw.locked || hw.loading || hw.uploading || hw.noDbx || hw.gathering) return;   // after Browse uploads land, so they don't list twice
  hw.gathering = 'look';
  hw.matDone = false;
  _imStepsRender();
  fetch(getScriptUrl() + '?action=getHwPending&name=' + encodeURIComponent(hw.name) + '&lessonDate=' + hw.date)
    .then(function (r) { return r.json(); })
    .catch(function () { return { success: false, message: 'No answer from Google.' }; })
    .then(function (d) {
      if (logHw !== hw) return;
      hw.gathering = false;
      var have = {};
      hw.files.forEach(function (f) { have[f.path.toLowerCase()] = 1; });
      var k = hw.date.split('-'), since = new Date(+k[0], +k[1] - 1, +k[2]).getTime();   // the lesson day's midnight, here
      hw.found = d.success ? (d.files || []).filter(function (f) {
        return !have[String(f.path).toLowerCase()] && f.modified && new Date(f.modified).getTime() >= since;
      }) : [];
      hw.foundMsg = !d.success ? (d.message || "Couldn't read Dropbox.") : d.noFolder ? 'No Dropbox folder named ' + hw.name + '.' : 'Nothing new in their Dropbox since ' + _ckDay(hw.date) + '.';
      _imHwChanged();
    });
}
function _imGatherHtml(hw) {
  if (!hw || (!hw.found && hw.gathering !== 'look')) return '';
  if (hw.gathering === 'look') return '<div class="im-gather"><span class="rpm-loading">Looking in their Dropbox</span></div>';
  var head = '<div class="im-gather-t">Finish adds these to ' + inqEsc(lessonFolderName(hw.date)) + '</div>';   // the lesson's folder (user, 2026-10-25)
  if (!hw.found.length) return '<div class="im-gather">' + head + '<div class="im-gather-none">' + inqEsc(hw.foundMsg || '') + '</div></div>';
  // The Dropbox tab's file list (user, 2026-10-25): folders in caps, files under them.
  return '<div class="im-gather">' + head + '<div class="db-files db-files-in im-gather-files">' + _dbDetailsFilesHtml({ items: hw.found }) + '</div></div>';
}
// B. Practice materials (2026-10-25): Send or Nothing to send; again undoes it.
// Nothing to send clears any links (files stay in Dropbox, just not sent);
// Send waits for C–E and Finish. Adding a file or link picks Send by itself.
function _imMatPick(v) {
  var hw = logHw;
  if (!hw || hw.loading || hw.uploading || hw.saving || hw.locked) return;
  hw.pick = hw.pick === v ? null : v;
  hw.matDone = false;
  if (hw.pick === 'none') { hw.choice = 'none'; hw.links = []; hw.videoOnly = false; hw.filesOn = false; hw.found = null; hw.linkYes = {}; _imHwLinkClear(); }
  else hw.choice = null;
  _imHwChanged();
}
function _imNothingToSend() { _imMatPick('none'); }   // the old button's onclick (index.html)
// Send (2026-10-11 as Sent): the files in the zone go to them. Uploads don't
// tick it, so more can go in first; again undoes it. Goes with links (2026-10-15).
function _imHwSent() {
  var hw = logHw;
  if (!hw || hw.loading || hw.uploading || hw.saving || hw.choice === 'none' || !hw.files.length) return;
  hw.filesOn = !hw.filesOn;
  _imHwChanged();
}
// A. Recorded on their side? (2026-10-18 as a button; Yes / No since
// 2026-10-25, required, and it goes with Nothing to send too; Phone / Zoom / No
// since 2026-10-26.)
function _imHwRec(v) {
  var hw = logHw;
  if (!hw || hw.loading || hw.saving || hw.locked) return;
  hw.rec = hw.rec === v ? null : v;
  hw.phone = hw.rec === 'phone' || hw.rec === 'zoom';   // recorded, either way
  hw.zoom = hw.rec === 'zoom';   // on Zoom, their side (2026-10-26)
  _imHwChanged();
}
// Video lesson link / Web link (2026-10-15): paste, Add (or Enter) puts it on
// that list, × takes it off. Any number, with files too.
function _imHwLinkAdd(kind) {
  var hw = logHw, inp = document.getElementById(kind === 'Video' ? 'logHwVideoInput' : 'logHwLinkInput');
  if (!hw || !inp || hw.choice === 'none' || hw.locked) return;
  var url = inp.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  hw.links.push({ kind: kind === 'Video' ? 'Video' : 'Link', url: url });
  if (kind === 'Video') hw.videoOnly = false;
  inp.value = '';
  _imHwChanged();
}
// A. / B. / C. circles (2026-10-25): open that box; again closes it and drops its files or links.
function _imLinkOn(hw, kind) {
  if (hw && kind === 'Files') return !!((hw.linkYes || {}).Files || hw.files.length || (hw.found && hw.found.length) || hw.uploading || hw.gathering);
  return !!(hw && ((hw.linkYes || {})[kind] || hw.links.some(function (l) { return l.kind === kind; }) || (kind === 'Video' && hw.videoOnly)));
}
function _imLinkYes(kind) {
  var hw = logHw;
  if (!hw || hw.locked || hw.loading || hw.saving) return;
  hw.linkYes = hw.linkYes || {};
  var on = !_imLinkOn(hw, kind);
  hw.linkYes[kind] = on;
  if (!on && kind === 'Files') {
    if (hw.uploading || hw.gathering) { hw.linkYes.Files = true; return; }
    // Off: no files for this lesson (anything uploaded stays in their Dropbox).
    hw.files = []; hw.mine = {}; hw.found = null; hw.filesOn = false;
  } else if (!on) {
    hw.links = hw.links.filter(function (l) { return l.kind !== kind; });
    if (kind === 'Video') hw.videoOnly = false;
    var inp = document.getElementById(kind === 'Video' ? 'logHwVideoInput' : 'logHwLinkInput');
    if (inp) inp.value = '';
  }
  _imHwChanged();
  if (on && kind !== 'Files') { var el = document.getElementById(kind === 'Video' ? 'logHwVideoInput' : 'logHwLinkInput'); if (el) el.focus(); }
}
function _imHwLinkClear() {
  ['logHwVideoInput', 'logHwLinkInput'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
}
function _imHwLinkDel(i) {
  var hw = logHw;
  if (!hw || hw.locked) return;
  hw.links.splice(i, 1);
  _imHwChanged();
}
// Ticks only (2026-10-09): it saves with Log and Schedule (_imSend).
function _imHwChanged() {
  var hw = logHw;
  if (!hw) return;
  _logHwRecalc(hw);
  hw.dirty = !!hw.choice;
  _logHwRender(); updateLogButton(); _imStepsRender();
}
// Before a redraw: park the docked Log box in its hidden home so innerHTML
// doesn't throw it away.
// The Log window's HW part (#logHw) sits in its own box on the card; these
// move it out of the window and back in (before Log's row) when undocking.
// Also its HW buttons row (#logHwHead) and Log's row (#logActions) go up to
// the box titles.
function _imHwOut() {
  var hw = document.getElementById('logHw'), d = _imQ('imHwDock');
  if (hw && d && hw.parentNode !== d) d.appendChild(hw);
  // What HW (2026-10-15) in the HW box above Materials.
  var what = document.getElementById('logHwWhat'), td = _imQ('imHwTextDock');
  if (what && td && what.parentNode !== td) td.appendChild(what);
  // Materials (2026-10-15), each piece under its small title: Yes (small, left;
  // click to pick, dims while other materials are in) under Nothing to send; Browse and Open (the Dropbox logo) on the Files
  // title over the drop zone; the Video lesson link and Web link paste boxes
  // in theirs. No Send: files count once they're in (stays hidden in #logHwHead).
  var files = document.getElementById('logHwFiles');
  var br = document.querySelector('.lh-folder-btn'), db = document.getElementById('logHwDbxBtn');
  if (db && !db.querySelector('svg')) db.insertAdjacentHTML('afterbegin', DBX_LOGO.replace('class="win-icon"', 'class="lh-dbx-ico"'));
  var ft = _imQ('imMatFilesTools');   // Nothing to send is B.'s own pick now (2026-10-25); the old button stays hidden in #logHwHead
  if (ft) [br, db].forEach(function (el) { if (el && el.parentNode !== ft) ft.appendChild(el); });
  // Add is the add-row icon, bigger, no box (user, 2026-10-25).
  ['logHwVideoAddBtn', 'logHwLinkAddBtn'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b && !b.classList.contains('im-link-add')) { b.classList.add('im-link-add'); b.innerHTML = ROW_ADD_ICON; b.setAttribute('aria-label', 'Add'); b.setAttribute('data-tip', 'Instant.\nAdds the link. Enter does too.'); b.setAttribute('data-tip-left', ''); }
  });
  var vs = document.getElementById('logHwVideo'), vd = _imQ('imMatVideo');
  if (vs && vd && vs.parentNode !== vd) vd.appendChild(vs);
  var ls = document.getElementById('logHwLink'), ld = _imQ('imMatLink');
  if (ls && ld && ls.parentNode !== ld) ld.appendChild(ls);
  // No show on the Log lesson title row, top right (2026-10-11).
  var ns = document.getElementById('btnNoShow'), lbox = _imQ('imLogDock');
  var lhead = lbox && lbox.parentNode && lbox.parentNode.previousElementSibling;
  if (ns && lhead && ns.parentNode !== lhead) lhead.appendChild(ns);
  // Log at the bottom of 1. Log the lesson and HW, under HW (2026-10-18; was under the
  // log rows): one button for both. The add-row stays under the log rows.
  var acts = document.getElementById('logActions'), dock = _imQ('imLogDock');
  var sec = dock && dock.closest('.im-main-box');
  if (acts && sec) {
    var foot = sec.querySelector(':scope > .im-log-foot');
    if (!foot) { foot = document.createElement('div'); foot.className = 'im-log-foot im-log-foot-all'; sec.appendChild(foot); }
    if (acts.parentNode !== foot) foot.appendChild(acts);
  }
}
function _imHwBack() {
  var hw = document.getElementById('logHw'), panel = document.getElementById('logPanel'), acts = document.getElementById('logActions');
  var head = document.getElementById('logHwHead');
  if (!hw || !panel || !acts) return;
  var ns = document.getElementById('btnNoShow'), lb = document.getElementById('btnLog');
  if (ns && lb && ns.parentNode !== acts) acts.insertBefore(ns, lb);
  var foot = panel.querySelector('.im-log-foot'), add = document.getElementById('logAddRow');
  if (foot) { if (add) panel.insertBefore(add, foot); foot.remove(); }
  if (acts.parentNode !== panel) panel.appendChild(acts);   // last in the window
  if (hw.parentNode !== panel) panel.insertBefore(hw, acts);
  // #logHw's pieces back in their HTML order (2026-10-15), the buttons in the head's tools.
  ['logHwHead', 'logHwWhat', 'logHwFiles', 'logHwVideo', 'logHwLink', 'logHwInput', 'logHwFolder', 'logHwPick'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) hw.appendChild(el);
  });
  var tools = head && head.querySelector('.lh-hw-tools');
  if (tools) {
    ['logHwNothing', 'logHwSentBtn', 'logHwDbxBtn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode !== tools) tools.appendChild(el);
    });
    var br = document.querySelector('.lh-folder-btn');
    if (br && br.parentNode !== tools) tools.appendChild(br);
  }
  document.querySelectorAll('.im-sent-row, .im-none-row').forEach(function (el) { if (!el.children.length) el.remove(); });
}
function _imLift(body) {
  if (window._imWin) return;   // the Log box is in the Log lesson window, not on this page
  _imHwBack();
  var panel = document.getElementById('logPanel');
  if (panel && body && body.contains(panel)) (window._logPanelHome ? window._logPanelHome.parent : document.body).appendChild(panel);
}
function _imUndock() { if (window._imDocked) closeLogPanel(); }
// closeLogPanel (lessons.js) calls this: the Log lesson window goes with it.
function _imLogClosed() {
  _imDictStop();
  _imHwBack();
  if (!window._imDocked) return;
  window._imDocked = false;
  window._imWin = null;
  var w = document.getElementById('imLogWin');
  if (w) w.remove();
  var rs = document.getElementById('imRsWin');   // its Reschedule window too (2026-10-19): it stayed behind the Email window
  if (rs) rs.remove();
  // Read the Lesson checklist again: Import's cards / button and Audit's list follow (2026-10-08).
  _ckLoad(function () { _ckRedraw(); });
}
function _ckRedraw() {
  if (window._imDocked) return;   // another window opened meanwhile (the next lesson)
  var ip = document.getElementById('tab-import');
  if (ip && ip.classList.contains('active') && _imIn === 'import') {
    if (_imOpen && _imLast) _imRenderStudent(_imOpen, _imLast.lessons);
    else if (_imRoster && !_imOpen) _imRenderCards(true);
  }
  if (typeof _runCkAudit === 'function' && document.getElementById('auditCkSection')) _runCkAudit(null, true);
}

// One box of the card: its title (and anything on the title's right) above
// the border, the content inside it (2026-10-06).
function _imSec(title, right, cls, inner) {
  return '<div class="db-cx-head im-sec-head"><label class="field-label db-cx-t">' + title + '</label>' + (right || '') + '</div>' +
    '<div class="db-panel im-list' + (cls || '') + '">' + inner + '</div>';
}

// A line cut short with "…" shows its full text on hover.
function _imFixTips(el) {
  el.querySelectorAll('.im-row .im-s').forEach(function (s) {
    // On the row: the cell's overflow:hidden would clip its own CSS tooltip.
    if (s.scrollWidth > s.clientWidth + 1) s.parentNode.setAttribute('data-tip', s.textContent);
  });
}

// Log lesson (2026-10-08): the Log lesson window for their oldest open
// lesson (a missed one, or today's), then the next. Grey when none is open.
// Shared with the Today card (2026-10-11): o.label, and o.plain for the grey
// look (not Lessons' blue, so it reads as a different button).
function _imLogBtnHtml(name, o) {
  o = o || {};
  var n = _auEsc(JSON.stringify(name)), q = _imQueue(name), label = o.label || '＋ Log lesson';   // plus sign (user 2026-10-23)
  if (!q.length) return '<button class="link-btn im-log-off" data-tip="Nothing open.\nEvery lesson has its log, HW and schedule." data-tip-left data-tip-wrap>' + label + '</button>';
  // The student page (2026-10-17): the oldest open lesson's missing steps as the
  // Students card's amber buttons ("✕ Email ▸", or "Not logged ▸"), not Log lesson.
  if (!o.plain) {
    var x = q[0], it = x.item || {};
    var miss = it.missing || (it.log ? (x.date === _tdYmd() ? _imTodayMiss(name) : []) : ['Log', 'HW', 'Materials', 'Schedule', 'Email']);
    var btns = _imStepsHtml(x.date, miss, it.hwText, name, true);
    if (btns) return '<span class="im-steps im-steps-page">' + btns + (q.length > 1 ? '<span class="im-step-more">· ' + q.length + ' open</span>' : '') + '</span>';
  }
  var tip = q.length > 1 ? q.length + ' lessons open, oldest first:\n' + q.map(function (x) { return _ckDay(x.date); }).join(', ') + '.' : 'Log, HW and Schedule for ' + (q[0].date === _tdYmd() ? 'today\'s lesson' : _ckDay(q[0].date)) + '.';
  return '<button class="link-btn' + (o.plain ? '' : ' blue') + ' opens-window" onclick="_imLogOpen(' + n + ')" data-tip="Opens a window.\n' + tip + '" data-tip-left data-tip-wrap>' + label + (q.length > 1 ? ' · ' + q.length : '') + '</button>';
}

// One student's page as HTML (2026-10-06, shared with the Today tab):
// headline, buttons (o.buttons), Lessons log, Last HW, Notes. o.back adds
// Import's Back; o.sub adds " · <sub>" after the name.
function _imStudentHtml(name, lessons, hw, detail, o) {
  o = o || {};
  var n = _auEsc(JSON.stringify(name)), open = !!_imShowAll[_imKey(name)];
  var total = lessons.length, year = new Date().getFullYear(), prevMon = null, nowMon = new Date().getMonth();
  var items = lessons.map(function (l) {
    var m = String(l.date || '').replace(/\//g, '').trim().match(/^([A-Za-z]{3})\s*(\d{1,2})$/);
    var mon = m ? MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()) : -1;
    if (mon >= 0) {
      if (prevMon === null) { if (mon > nowMon) year--; }
      else if (mon > prevMon) year--;
      prevMon = mon;
    }
    return { year: year, row: l.row, n: l.n, date: m ? m[1] + ' ' + parseInt(m[2], 10) : (l.date || '—'), subject: l.subject };
  }).reverse();   // oldest first

  // Blocks are the sheet's own: column M numbers each row 1-4, so a blank row
  // stays an empty slot. Without row numbers (older backend), count
  // lessons in fours instead.
  var blocks = [];
  if (items.length && items[0].row) {
    var byBlock = {}, keys = [];
    items.forEach(function (it) {
      // Column M's 1-4 decides the slot; the row is the fallback.
      var slot = (it.n >= 1 && it.n <= 4) ? it.n - 1 : (it.row - 12) % 4;
      var b = it.row - slot;   // the block's first row
      if (!byBlock[b]) { byBlock[b] = [null, null, null, null]; keys.push(b); }
      byBlock[b][slot] = it;
    });
    blocks = keys.map(function (b) { var a = byBlock[b]; a.year = (a.filter(Boolean)[0] || {}).year; return a; });
  } else {
    for (var i = 0; i < items.length; i += 4) { var c = items.slice(i, i + 4); c.year = c[0].year; blocks.push(c); }
  }
  // Oldest or newest first (2026-10-06): the numbers stay the lessons' own, so
  // newest first reads 1 2 3 4 from the bottom (4 3 2 1 from the top).
  var newest = _imNewestFirst();
  // Only the 3 newest blocks (12 lessons) show; Show all opens the rest (2026-10-06).
  var hidden = open ? 0 : Math.max(0, blocks.length - 3);
  var shown = blocks.slice(hidden);
  var order = newest ? shown.slice().reverse() : shown;
  var more = blocks.length > 3 ? '<button class="link-btn im-more" onclick="_imToggleAll(' + n + ')">' +
    (open ? 'Show less' : 'Show all') + '</button>' : '';
  var slots = newest ? [3, 2, 1, 0] : [0, 1, 2, 3];

  var lastYear = null;
  var html = order.map(function (b) {
    var y = b.year, head = '';
    if (y !== lastYear) { head = '<div class="im-year">' + y + '</div>'; lastYear = y; }
    var rows = slots.map(function (k) {
      var l = b[k];
      // 1-4, the lesson, and the date on the right (2026-10-04). No HW
      // column: Last HW under the list covers it (user's call).
      if (!l) return '<div class="im-row im-empty"><span class="im-n">' + (k + 1) + '</span><span class="im-s"></span><span class="im-d">—</span></div>';
      // The newest lesson is marked (2026-10-07); the Today tab shows it brighter.
      return '<div class="im-row' + (l === items[items.length - 1] ? ' im-latest' : '') + '">' +
        '<span class="im-n">' + (k + 1) + '</span>' +
        '<span class="im-s">' + (l.subject ? _imLogShow(l.subject) : '<span style="color:var(--muted)">—</span>') + '</span>' +
        '<span class="im-d">' + inqEsc(l.date) + '</span>' +
      '</div>';
    }).join('');
    return head + '<div class="im-block">' + rows + '</div>';
  }).join('');

  // Back above the card; Reschedule is the Finish logging Schedule step (2026-10-06).
  return (o.back ? _imBack() : '') +
    // One card (2026-10-06, the Today tab's look): the name in amber (Today
    // adds " · Quick look" in grey via o.sub), then the three boxes.
    (o.card ? '<div class="td-student">' : '') +
    // Today draws its own name row (the card's open/close bar, 2026-10-09).
    (o.noTitle ? '' : '<div class="settings-title im-title"><span>' + inqEsc(name) + (o.sub ? '<span class="win-sub"> · ' + inqEsc(o.sub) + '</span>' : '') + '</span>' +
      (o.log ? _imLogBtnHtml(name) : '') +
      '</div>') +
    // Each box's small title sits above it, outside its border (2026-10-06).
    // Notes first (2026-10-06): what to mention, before anything else.
    // Today leaves Notes out (2026-10-09).
    (o.noNotes ? '' : _imSec('Notes', '', '', '<div class="im-notes-in">' + _imNotesBoxHtml(detail, name) + '</div>')) +
    _imSec('History', '<button class="link-btn im-sort-btn" onclick="_imToggleSort()" data-tip="Flips the list.">' + (_imNewestFirst() ? 'Newest' : 'Oldest') + '</button>',
      '', items.length ? html + more : 'No lessons logged yet') +
    _imSec('HW sent - last', '', '', '<div class="db-files db-files-in">' + _imLastHwHtml(hw, name) + '</div>') +
    (o.data ? _imDataHtml(name) : '') +
    // Log lesson, always open, its HW the Dropbox drop area; Checklist, the
    // Trial card's to-do look: done when Schedule, HW and Lesson log are ticked.
    // Second card (2026-10-06): the first is for looking, this one does the
    // lesson — Log lesson, Reschedule, Checklist.
    // Each box holds only its content, so the room above and below matches;
    // the buttons sit on the title rows (Log; Nothing to send / Browse folder).
    // The Checklist box at the top of the doing card, its three steps on one line (2026-10-07).
    (o.card ? '</div>' : '');
}

// The doing card's boxes (shared with the Audit window, 2026-10-08): Checklist,
// Log lesson (the Log window docks in #imLogDock), HW, Schedule (the email has its own window). day: the
// lesson's (Audit); Import's is today.
function _imDoHtml(name, day) {
  var n = _auEsc(JSON.stringify(name));
  return (
    // Pages (user, 2026-10-30): one section at a time, the window turns to the
    // next on Next (_imPagesRender). The numbers on top jump back to a page.
    '<div class="im-pg-dots" id="imPgDots" style="display:flex;gap:8px;margin:0 0 18px"></div>' +
    // Three sections (2026-10-15): Log (the lesson and the HW), Materials
    // (what goes to them: nothing, files, video lesson links, web links), Schedule.
    // Each of the three sections sits in its own bordered box, its title above it, no dividers (2026-10-18).
    // The typing reminder on its own line under it (user, 2026-10-26), in the (optional) grey.
    '<div class="im-page" data-pg="1">' +
    _imMainHead('1. Log the lesson and HW', '', '<span class="im-mail-opt im-case-hint">(Sentence case, caps only on first line and song names, no end punctuation)</span>', 'im-main-log') +   // all red (2026-10-18)
    '<div class="im-main-box">' +
      _imSub('1. Lesson', '', ' im-log-box', '<div id="imLogDock"></div>') +
      _imSub('2. HW', '', ' im-hwtext-box', '<div id="imHwTextDock"></div>') +
      // Private (2026-10-25): saved after "TEACHER:" in the log's cell, never emailed.
      _imSub('3. Notes to teacher <span class="im-mail-opt">(optional)</span>', '', ' im-teach-box',
        '<div class="ll-wrap"><div class="ll-rows" id="imTeachRows"><input type="text" class="rpm-field ll-row active"></div>' +
        '<button type="button" class="link-btn tl-mic" id="imTeachMic" data-tip="Starts or stops dictation." data-tip-left>' + MIC_ICON + '</button></div>' +
        '<button type="button" class="ll-add" id="imTeachAdd" data-tip="Instant.&#10;Adds a row. Enter does too.">' + llAddInner() + '</button>') +
      // In the email only, under NOTES (2026-10-25): "Bring your capo next time."
      _imSub('4. Notes to the student <span class="im-mail-opt">(optional)</span>', '', ' im-teach-box',
        '<div class="ll-wrap"><div class="ll-rows" id="imStuRows"><input type="text" class="rpm-field ll-row active"></div>' +
        '<button type="button" class="link-btn tl-mic" id="imStuMic" data-tip="Starts or stops dictation." data-tip-left>' + MIC_ICON + '</button></div>' +
        '<button type="button" class="ll-add" id="imStuAdd" data-tip="Instant.&#10;Adds a row. Enter does too.&#10;Each row is a sentence in the email.">' + llAddInner() + '</button>') +
    '</div>' +
    '</div><div class="im-page" data-pg="2">' +
    _imMainHead('2. Practice materials', '', '', 'im-main-mat') +   // all red (2026-10-18)
    // Two boxes (user, 2026-10-25): the two required questions, numbered, dim once
    // both are answered; then the materials (lettered, optional) in their own box,
    // only with 2. Send.
    '<div class="im-main-box im-mat-split">' +
      // 1. did they record it on their phone, 2. am I sending anything. Any mix goes
      // (recorded + nothing to send too). Each answer has the check circle.
      '<div id="imMatNone" class="im-mat-none im-mat-qbox">' +
        '<div class="im-mat-row"><label class="field-label db-cx-t im-sub-t">1.</label><span class="im-mat-q">Recorded on their side?</span>' +   // Phone / Zoom / No (user, 2026-10-26; was Yes / No)
          _imPickBtn('imRecPhone', "_imHwRec('phone')", 'Phone', 'They filmed the lesson on their phone.&#10;The email says so.') +
          _imPickBtn('imRecZoom', "_imHwRec('zoom')", 'Zoom', 'They recorded the lesson on Zoom, their side.&#10;The email says so.') +
          _imPickBtn('imRecNo', "_imHwRec('no')", 'No', 'Nothing filmed.') + '</div>' +
        '<div class="im-mat-row"><label class="field-label db-cx-t im-sub-t">2.</label><span class="im-mat-q">Sending anything?</span>' +
          _imPickBtn('imMatSend', "_imMatPick('send')", 'Send', 'Files, a video lesson link or a web link:&#10;A, B and C below. Finish when they are all in.') +
          _imPickBtn('imMatNo', "_imMatPick('none')", 'Nothing to send', 'No materials this lesson.') + '</div>' +
      '</div>' +
      '<div class="im-mat-box" id="imMatBox">' +
      // The Log window's HW part (#logHw) is split over these (_imHwOut).
      '<div class="im-hw-dock-box">' +
      // Gather (2026-10-25): files put in their Dropbox by hand (Finder) show under the zone, ticked.
      // A. opens with its circle too (user, 2026-10-25); its tools show with it.
      _imSub('A. Files', '<span class="im-link-yes">' + _imPickBtn('imFilesYes', "_imLinkYes('Files')", '', 'Files to send: the drop zone,&#10;Gather, Browse and their Dropbox.') + '</span><span id="imMatFilesTools"><button type="button" class="link-btn lh-gather-btn" id="logHwGatherBtn" onclick="_imGather()" data-tip="Instant.&#10;Lists what you put in their Dropbox since the lesson day,&#10;e.g. with Finder, that\'s on no HW yet.&#10;Finish moves it all into this lesson\'s HW folder." data-tip-left data-tip-wrap>' + TRAY_IN_ICON + '<span>Gather</span></button></span>', ' im-mat-sec', '<div id="imHwDock"></div><div id="imGatherList"></div>') +
      // B and C open with the circle after their title (user, 2026-10-25): no Yes / No words, unpicked is no.
      _imSub('B. Video lesson link', '<span class="im-link-yes">' + _imPickBtn('imVidYes', "_imLinkYes('Video')", '', 'A video lesson link to send.&#10;Opens the box for it.') + '</span>', ' im-mat-sec', '<div id="imMatVideo"></div>') +
      _imSub('C. Web link', '<span class="im-link-yes">' + _imPickBtn('imWebYes', "_imLinkYes('Link')", '', 'A web link to send.&#10;Opens the box for it.') + '</span>', ' im-mat-sec', '<div id="imMatLink"></div>') +
    '</div>' +
    // Finish (2026-10-18): Materials waits for it, like Log for section 1.
    '<div class="im-log-foot im-log-foot-all"><button type="button" class="link-btn" id="imMatFinishBtn" onclick="_imMatFinish()" disabled data-tip="All files and links are in.&#10;Till then Materials stays open." data-tip-left>Finish</button></div>' +
      '</div>' +
    '</div>' +
    '</div><div class="im-page" data-pg="3">' +
    // Schedule (2026-10-25, like Practice materials): Needed / Not needed first.
    // Not needed is the answer; Needed opens Reschedule, and the section is done
    // only once a skip or move is saved.
    _imMainHead('3. Change appointment') +   // all red, no grey subtitle (2026-10-18); was Schedule adjustments (user, 2026-10-27: it skips or moves)
    '<div class="im-main-box">' +
    '<div class="db-panel im-list im-sched-box">' +
      '<div class="im-mat-row im-sched-picks">' +
        _imPickBtn('imSchedYes', '_imSchedPick(' + n + ', &quot;yes&quot;)', 'Needed', 'A lesson to skip or move:&#10;Reschedule opens under it.') +
        _imPickBtn('imSchedNo', '_imSchedPick(' + n + ', &quot;no&quot;)', 'Not needed', 'Nothing to move or skip.') + '</div>' +
      '<div id="imSchedRs" class="im-sched-rs" style="display:none"><button class="link-btn red im-rs-btn opens-window" onclick="_imReschedule(' + n + ')" data-tip="Opens a window.\nTheir next 8 weeks: skip or move a lesson.">Change appointment</button></div>' +
    '</div>' +
    '</div>' +
    '</div><div class="im-page" data-pg="4">' +
    // "Logging" spinner while the three go to Google; stays bright in the dimmed window (2026-10-21).
    // The email (user, 2026-10-30, Initiate's Compose look): written from the log,
    // each part editable here (the sheet keeps the log as it is); Preview if
    // wanted, Send; Start over writes it from the log again.
    _imMainHead('<span id="imMailNum">4.</span> Email the student') +
    '<div class="im-main-box im-mail-box" id="imMailBox">' +
      '<div class="im-mail-to"><div class="td-mini-row"><span class="td-mini-t">To:</span><span class="td-wk-name" id="imMailToShow">…</span></div>' +
        '<div class="td-mini-row"><span class="td-mini-t">Sbj:</span><span class="td-wk-name" id="imMailSbj"></span></div></div>' +
      '<div style="margin:18px 0 14px"><label class="field-label" for="imMailLesson">Lesson notes</label><textarea id="imMailLesson" rows="4" class="rpm-field"></textarea></div>' +
      '<div style="margin-bottom:14px"><label class="field-label" for="imMailHw">Things to practice</label><textarea id="imMailHw" rows="3" class="rpm-field"></textarea></div>' +
      '<div style="margin-bottom:6px"><label class="field-label" for="imMailNotes">Notes <span class="im-mail-opt">(optional)</span></label><textarea id="imMailNotes" rows="2" class="rpm-field"></textarea></div>' +
      '<div class="im-log-foot im-log-foot-all im-mail-foot"><span class="ll-state" id="imMailStatus"></span>' +
        '<button type="button" class="link-btn" id="imMailRedo" data-tip="Instant.&#10;Throws away your edits:&#10;the email is written from the log again." data-tip-left>Start over</button>' +
        '<button type="button" class="link-btn" id="imMailPrev" data-tip="Shows the email here, as it will go.&#10;Press again to hide it." data-tip-left>' + DETAILS_ICON + '<span>Preview</span></button>' +
        '<button type="button" class="link-btn bright" id="imMailSend" disabled data-tip="Sends this email.&#10;Waits for the steps before it." data-tip-left>' + SEND_ICON + '<span>Send</span></button></div>' +
      '<iframe class="im-msg-frame" id="imMailFrame" title="The email" hidden></iframe>' +
    '</div>' +
    '</div>' +
    '<div class="im-log-foot im-log-foot-all im-pg-nav" style="margin-top:22px"><span class="ll-state"></span>' +
      '<button type="button" class="link-btn" id="imPgBack" onclick="_imPageGo(-1)" data-tip="Instant.&#10;The page before." data-tip-left>Back</button>' +
      '<button type="button" class="link-btn bright" id="imPgNext" onclick="_imPageGo(1)" data-tip="Saves this page and turns to the next.&#10;Waits till this page is done." data-tip-left>Next</button></div>' +
    '<div id="imFinDone" class="im-saving rpm-load-center rpm-keep"></div>');   // in the middle of the window (user, 2026-10-21)
}
// One answer of a two-way pick, no box (user, 2026-10-25): a full circle, and
// once picked the check (om-63's) sweeps out of it.
var PICK_ICON = (function () {
  var ck = PAID_CHECK_ICON.match(/<path d="[^"]*"\/>/)[0].replace('<path', '<path class="im-pick-ck"');
  return '<svg class="im-pick-i" viewBox="0 0 907.5 885" width="14" height="14" fill="currentColor" aria-hidden="true">' +
    '<circle cx="441" cy="442" r="395" fill="none" stroke="currentColor" stroke-width="80"/>' + ck + '</svg>';
})();
function _imPickBtn(id, onclick, label, tip) {
  return '<button type="button" class="im-pick" id="' + id + '" onclick="' + onclick + '" data-tip="Instant.&#10;' + tip + '&#10;Press again to undo." data-tip-left data-tip-wrap>' + PICK_ICON + '<span>' + label + '</span></button>';
}
// A main section's title: red, with a grey subtitle like the window title's (none: all red).
function _imMainHead(title, sub, right, cls) {
  return '<div class="db-cx-head im-sec-head im-main-head' + (cls ? ' ' + cls : '') + '"><label class="field-label db-cx-t im-main-t">' + title +
    (sub ? '<span class="win-sub"> · ' + sub + '</span>' : '') + '</label>' + (right || '') + '</div>';
}
// A small white title inside a section, and its box.
function _imSub(title, right, cls, inner) {
  return '<div class="db-cx-head im-sub-head"><label class="field-label db-cx-t im-sub-t">' + title + '</label>' + (right || '') + '</div>' +
    '<div class="db-panel im-list' + (cls || '') + '">' + inner + '</div>';
}

// ── Data (2026-10-12): the student's skips and reschedules, all time; the teacher's on their own line ──
// Lessons card only. Folded: just the title and Show; Show reads Skip Logs and
// Reschedule Logs (getStudentData) the first time, then draws the box.
var _imData = { open: false, name: null, d: null };

function _imDataHtml(name) {
  var open = _imData.open && _imData.name === name;
  var btn = '<button class="link-btn im-sort-btn" onclick="_imDataToggle()" data-tip="Instant.\n' + (open ? 'Folds the box away.' : 'Skips and reschedules, all time:\nthe student\'s, then yours.') + '" data-tip-left>' + (open ? 'Hide' : 'Show') + '</button>';
  if (!open) return '<div class="db-cx-head im-sec-head"><label class="field-label db-cx-t">Data</label>' + btn + '</div>';
  var d = _imData.d, inner;
  if (!d) inner = '<span class="rpm-loading" style="color:var(--muted)">Loading</span>';
  else if (!d.success) inner = '<span style="color:var(--muted)">' + inqEsc(d.message || 'No answer from Google.') + '</span>';
  else {
    var k = d.skips, r = d.resched;
    // Two groups (2026-10-12): STUDENT, a blank line, TEACHER; each Skips
    // and Reschedules. Vacation (your trips) sits under Teacher.
    var row = function (l, v) { return '<span class="inq-flabel">' + l + '</span><span class="inq-fval">' + v + '</span>'; };
    var grp = function (t, first) { return '<span class="im-data-h' + (first ? '' : ' im-data-gap') + '">' + t + '</span>'; };
    // "since Jun 23": each log counts from its own first row (2026-10-12).
    var since = function (ymd) {
      var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m ? '<span class="im-data-since">since ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + (parseInt(m[1], 10) !== new Date().getFullYear() ? ', ' + m[1] : '') + '</span>' : '';
    };
    inner = '<div class="inq-fields im-data">' +
      grp('Student', true) + row('Skips', k.student + since(d.skipsSince)) + row('Reschedules', r.student + since(d.reschedSince)) +
      grp('Teacher') + row('Skips', k.teacher + since(d.skipsSince)) + row('Reschedules', r.teacher + since(d.reschedSince)) + row('Vacation', k.vacation + since(d.skipsSince)) +
    '</div>';
  }
  return _imSec('Data', btn, '', inner);
}

function _imDataToggle() {
  var name = _imOpen;
  if (!name) return;
  _imData.open = !_imData.open;
  if (_imData.open && !_imData.d) {
    fetch(getScriptUrl() + '?action=getStudentData&name=' + encodeURIComponent(name))
      .then(function (r) { return r.json(); })
      .catch(function () { return { success: false, message: 'No answer from Google.' }; })
      .then(function (d) {
        if (_imData.name !== name) return;
        _imData.d = d;
        if (_imLast && _imLast.name === name) _imRenderStudent(name, _imLast.lessons);
      });
  }
  if (_imLast && _imLast.name === name) _imRenderStudent(name, _imLast.lessons);
}

// ── HW (2026-10-04): this student's rows from the HW Tracking sheet ──
// Under the list, the newest HW in full (Last HW): what was given last time.
var _imHw = null;   // { rows: [...] newest first }

function _imLoadHw(name) {
  fetch(getScriptUrl() + '?action=getHwLog&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (_imOpen !== name || !d.success) return;
      _imHw = { rows: d.rows || [] };
      if (_imLast && _imLast.name === name) _imRenderStudent(name, _imLast.lessons);
    })
    .catch(function () {});
}

// Last HW (2026-10-06): the newest lesson with HW, as one lesson-style line
// (lesson #, how many files, date), then what to practise (the What HW text,
// 2026-10-15) and its files under it. Lessons with neither don't count;
// none ever → None. Hide folds the files away.
var _imHwHide = {};   // key → files folded
function _imLastHwHtml(hw, name) {
  if (!hw) return '<span class="rpm-loading is-inline" style="color:var(--muted)">Loading</span>';
  var r = hw.rows.filter(function (x) { return x.text || (x.files || []).length || (x.links || []).length; })[0];
  var k = _imKey(name), out;
  if (!r) out = '<div class="im-none">None</div>';
  else {
    var hide = !!_imHwHide[k], n = (r.files || []).length;
    var p = String(r.date).split('-');
    out = '<div class="im-row im-hw-row">' +
        '<span class="im-n">' + (r.lesson || '') + '</span>' +
        '<span class="im-s">' + (n ? n + (n === 1 ? ' file' : ' files') : '') + '</span>' +
        '<span class="im-d">' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + '</span></div>' +
      (r.text ? '<div class="im-hw-text">' + inqEsc(r.text) + '</div>' : '') +
      (r.links || []).map(function (l) {
        return '<div class="im-hw-link"><span>' + (l.kind === 'Video' ? 'Video lesson' : 'Link') + '</span>' +
          '<a href="' + inqEsc(l.url) + '" target="_blank" rel="noopener">' + inqEsc(l.url) + '</a></div>';
      }).join('') +
      (hide || !n ? '' : '<div class="im-hw-files">' + _dbDetailsFilesHtml({ items: r.files.map(function (x) { return { name: x.split('/').pop(), path: x }; }) }) + '</div>');
  }
  // Show more (2026-10-07): under the last HW, everything in their Dropbox
  // folder now (the daily clean-up keeps it to ~15 days). Read only on press.
  var x = _imDbx[k] || {};
  if (x.open) out += '<div class="im-year im-dbx-head">' + DBX_LOGO.replace('class="win-icon"', 'class="im-dbx-logo"') + 'DROPBOX</div><div class="im-dbx">' +
    (x.loading ? '<div class="im-none rpm-loading">Loading</div>' :
     x.error ? '<div class="im-none">' + inqEsc(x.error) + '</div>' :
     x.items.length ? _dbDetailsFilesHtml({ items: x.items }) : '<div class="im-none">Empty</div>') + '</div>';
  var n2 = _auEsc(JSON.stringify(name));
  return out + '<div class="im-hw-btns">' +
    (r && (r.files || []).length ? '<button class="link-btn im-more" onclick="_imToggleHw(' + n2 + ')">' + (_imHwHide[k] ? 'Show files' : 'Hide') + '</button>' : '') +
    '<button class="link-btn im-more" onclick="_imToggleDbx(' + n2 + ')" data-tip="Reads their Dropbox folder.">' + (x.open ? 'Show less' : 'Show more') + '</button></div>';
}
var _imDbx = {};   // key → { open, loading, items, error }: Show more's Dropbox list
function _imToggleDbx(name) {
  var k = _imKey(name), x = _imDbx[k] = _imDbx[k] || {};
  x.open = !x.open;
  if (x.open && !x.items && !x.loading) {
    x.loading = true;
    // Just this student's folder (getHwPending all=1), not the whole Dropbox.
    fetch(getScriptUrl() + '?action=getHwPending&all=1&name=' + encodeURIComponent(name) + '&lessonDate=' + _tdYmd())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        x.loading = false;
        if (!d.success) { x.error = 'Could not read Dropbox.'; return; }
        x.items = d.files || [];
        x.error = d.noFolder ? 'No Dropbox folder named ' + name : null;
      })
      .catch(function () { x.loading = false; x.error = 'No answer from Google.'; })
      .then(function () { if (!x.error) x.error = null; else x.items = null; _imRedraw(); });
  }
  _imRedraw();
}
function _imToggleHw(name) {
  var k = _imKey(name);
  _imHwHide[k] = !_imHwHide[k];
  _imRedraw();
}

// Notes (wrong-number text, payment due) are a box on the page since 2026-10-06.
var _imDetail = null;   // getStudentDetail reply (notes come from it)

function _imNewestFirst() { try { return localStorage.getItem('imNewestFirst') === '1'; } catch (e) { return false; } }
function _imToggleAll(name) {
  var k = _imKey(name);
  _imShowAll[k] = !_imShowAll[k];
  _imRedraw();
}
function _imToggleSort() {
  try { localStorage.setItem('imNewestFirst', _imNewestFirst() ? '0' : '1'); } catch (e) {}
  _imRedraw();
}
// Draw again wherever the page is showing: the Today tab or Import.
function _imRedraw() {
  if (_imIn === 'today') { _tdRender(); return; }
  if (_imLast) _imRenderStudent(_imLast.name, _imLast.lessons);
}


// Reschedule opens on this page (2026-10-06, was a jump to Home): a window
// with their next 8 weeks, Home's strips. A red day → Skip / Reschedule
// (student.js windows); when one saves, the strips refresh in place.
// o (the Calendar tab, 2026-10-27): pre = the clicked lesson's day, picked already;
// onDone replaces the Log window's Schedule tick.
function _imReschedule(name, o) {
  var w = _stWin('imRsWin', inqEsc(name), 'Change appointment', CALENDAR_ICON,   // skip or move (user, 2026-10-27; was Reschedule)
    // The steps first, the weeks under them (user, 2026-10-29; were under the weeks).
    "<div class='im-rs-hint im-rs-hint-top'>" + (o && o.pre ? ST_HOW_PICKED : ST_HOW_PICK) + "</div>" +   // the steps (student.js, 2026-10-28)
    "<label class='field-label im-rs-weeks-l'>Next 8 weeks</label><div id='imRsBody'><div class='empty-state rpm-loading'>Loading</div></div>" +
    // What the ✓ set (user, 2026-10-29): a bordered box under the weeks, blank until then; _rpmTpStyle() styles it.
    // No "No change" button here (2026-10-08): close it and press Not needed instead.
    "<div class='im-rs-moved-h'>Moving to</div><div class='im-rs-moved' id='imRsMoved'></div>" +   // the title over the box, in line with SKIP (user, 2026-10-29)
    // The rest of a reschedule right here (user, 2026-10-29: no window on top): a line, then
    // Requested by, Reason and Confirm move, the Reschedule window's look; dimmed until the ✓.
    "<div class='im-rs-confirm st-off' id='imRsConfirm'>" +   // no line above (user, 2026-10-29)
      "<label class='field-label st-gap'>Requested by</label>" + _stWhoSeg('imRsWho', 'Student') +
      "<label class='field-label st-gap'>Reason (optional)</label>" +
      "<input id='imRsNote' type='text' class='rpm-field' autocomplete='off' style='width:100%'>" + _stReasonPills('imRsReasons') +
      "<div class='ll-acts st-foot'><span class='ll-state' id='imRsState' style='flex:1'></span>" +
        "<button class='link-btn bright' id='imRsConfirmBtn' onclick='_stPickConfirm(this)' data-tip='Moves only this lesson in Google Calendar\nand logs it to Reschedule Logs.' data-tip-left>Confirm move</button></div></div>");
  _stWireWho(w, 'imRsWho', function(v) { _stPickWho = v; });
  _stWireReasons(w, 'imRsReasons', 'imRsNote');
  _stPickWho = 'Student';
  _rpmTpStyle();
  // Undo on the icon's line, top right (user, 2026-10-29): one step back at a time.
  var ic = w.querySelector('.win-icon');
  if (ic) { ic.parentNode.classList.add('im-rs-iconrow'); ic.parentNode.insertAdjacentHTML('beforeend', "<button class='link-btn im-rs-undo' id='imRsUndo' disabled onclick='_stPickUndo()' data-tip='Takes back the last step on the weeks.' data-tip-left>Undo</button>"); }
  w.querySelector('.st-win').classList.add('im-rs-win');
  _stPickSel = null;   // a fresh pick each time (student.js)
  _imRsLoad(name, o || {});
}

function _imRsLoad(name, o) {
  var url = getScriptUrl(); if (!url) return;
  // Saved (user, 2026-10-19): "Rescheduled ✓" (or Skipped ✓) a moment, then the window goes, back to the Log window.
  var opts = { pick: true, onDone: function (d, what) { if (o.onDone) o.onDone(d, what); else _imSchedSet(name, 'changed'); _imRsDone(what || 'Rescheduled'); } };   // pick: × / ✓ on the days (2026-10-26)
  function draw(byDate, weeks, student) {
    var box = document.getElementById('imRsBody');
    var today = _stToday(), monday = _stMondayOf(today);
    box.innerHTML = '';
    var strips = document.createElement('div');
    strips.className = 'im-rs-strips';
    for (var k = 0; k < weeks; k++) {
      strips.appendChild(_stBuildWeekStrip(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + k * 7), byDate, today, student, opts));
    }
    box.appendChild(strips);
    // From the Calendar tab: the clicked lesson comes up picked (2026-10-27).
    var pre = o.pre && strips.querySelector('button[data-ymd="' + o.pre + '"][data-has="1"]');
    if (pre) pre.click();
  }
  // From the Calendar tab the weeks show at once with the clicked lesson picked,
  // dimmed with LOADING until the other lessons come in (user, 2026-10-28).
  if (o.pre && o.time) {
    var first = {}; first[o.pre] = { date: o.pre, time: o.time };
    draw(first, 8, name);
    rpmBusy(document.getElementById('imRsBody'), null, true, 'Loading');
  }
  fetch(url + '?action=getStudentLessons&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var box = document.getElementById('imRsBody');
      if (!box) return;   // window closed meanwhile
      rpmBusy(box, null, false);
      if (!data.success) { box.innerHTML = '<div class="empty-state">Error: ' + inqEsc(data.message || 'unknown') + '</div>'; return; }
      if (!data.lessons || !data.lessons.length) { box.innerHTML = '<div class="empty-state">No lessons on the calendar</div>'; return; }
      var byDate = {};
      data.lessons.forEach(function (l) { byDate[l.date] = l; });
      _stPickSel = null;   // the early pick's cells are gone
      draw(byDate, data.weeks || 8, data.student || name);
    })
    .catch(function () {
      var box = document.getElementById('imRsBody');
      if (!box) return;
      rpmBusy(box, null, false);
      box.innerHTML = '<div class="empty-state">No answer from Google.</div>';
    });
}

function _imRsDone(what) {
  var w = document.getElementById('imRsWin'), p = w && w.querySelector('.st-win');
  if (!p) return;
  p.classList.add('im-done');
  var msg = document.createElement('div');
  msg.className = 'im-done-msg';
  msg.textContent = what + ' ✓';
  p.appendChild(msg);
  setTimeout(function () { if (w.parentNode) w.remove(); }, 1200);
}


// The HW-only or Log window saved an answer: refresh Last HW.
function _imHwSaved(name) {
  if (window._imWin && window._imWin.name !== _imOpen) return;   // saved for someone not open here
  if (_imIn === 'today') { _tdRefresh(name); return; }
  if (_imOpen && _imKey(_imOpen) === _imKey(name)) _imLoadHw(_imOpen);
}

function _imLoadDetail(name) {
  fetch(getScriptUrl() + '?action=getStudentDetail&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (_imOpen !== name || !d.success) return;
      _imDetail = d;
      if (_imLast && _imLast.name === name) _imRenderStudent(name, _imLast.lessons);   // Notes button lights up
    })
    .catch(function () {});
}

// What's worth mentioning, from Home's data (getStudentDetail): [{ kind, html }]
function _imNotes(d, name) {
  var out = [];
  if (!d) return out;
  if (d.wrongNumberFlag) {
    out.push({ kind: 'wrong', html:
      '<div class="im-note-h">Texted the RPM line by mistake</div>' +
      '<div class="im-note-t">“' + inqEsc(d.wrongNumberFlag.text || '') + '”</div>' +
      '<div class="im-note-d">' + inqEsc(d.wrongNumberFlag.flaggedAt || '') + '</div>' +
      '<div class="im-note-a"><span class="im-note-d">Remind them: RPM number vs personal, keep chat on personal.</span>' +
        '<button class="link-btn" onclick="_imClearWrong(this, ' + _auEsc(JSON.stringify(name)) + ')" data-tip="Clears the warning.\nPress once you\'ve reminded them.">Reminded ✓</button></div>' });
  }
  if (d.paymentStatus && d.paymentStatus !== 'Paid' && d.paymentStatus !== '—') {
    // Owes 2 blocks = a quiet warning, 3+ = red alert (2026-10-12; 3 is where
    // the Secretary stops reminding and leaves it to you).
    var owes = d.paymentOwes || 0;
    out.push({ kind: owes >= 3 ? 'pay-alert' : 'pay', html:
      '<div class="im-note-h">Payment</div><div class="im-note-t">' + inqEsc(d.paymentStatus) +
      (owes >= 2 ? ' · Owes ' + owes + ' blocks' : '') + '</div>' });
  }
  return out;
}

function _imNotesBoxHtml(d, name) {
  if (!d) return '<div class="im-note-d"><span class="rpm-loading is-inline">Loading</span></div>';
  var notes = _imNotes(d, name);
  return notes.length ? notes.map(function (x) { return '<div class="im-note' + (x.kind === 'pay-alert' ? ' im-note-alert' : '') + '">' + x.html + '</div>'; }).join('')
                      : '<div class="im-none">None</div>';   // the lesson rows' font (2026-10-06)
}

function _imClearWrong(btn, name) {
  if (!name || !btn) return;
  btn.disabled = true; btn.textContent = 'Saving…';
  fetch(getScriptUrl() + '?action=clearWrongNumberFlag&student=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function () {
      // The detail this page drew from: Import's open student, or the Today tab's copy.
      var d = _imIn === 'today' ? (_td.data[_imKey(name)] || {}).detail : _imDetail;
      if (d) d.wrongNumberFlag = null;
      _imRedraw();
    })
    .catch(function () { btn.disabled = false; btn.textContent = 'Reminded ✓'; });
}
