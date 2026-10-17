// ─── TABS / IMPORT.JS ───────────────────────────────────────────────────────
// Import (2026-10-04): every lesson a student has logged in Students Import,
// lessons only (no payments, no HW). Student cards first (A–Z, the Dropbox
// cards' look); a card opens the full list, newest
// first, under year headings. Reads only: getStudentRoster (Counter names)
// and getPastLessons (Import rows 12+, B subject, I date).

var _imRoster = null;   // names from the Counter, A–Z
var _imOpen = null;     // name of the open student, or null on the cards
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
  if (!noRead && !_ck.loaded && !_ck.busy) _ckLoad(function () { var p = document.getElementById('tab-import'); if (_imRoster && !_imOpen && p && p.classList.contains('active')) _imRenderCards(true); });
  // Missed lessons still open (2026-10-08, Lesson checklist): "2 open".
  var open = function (n) { return _ckPast(n).length; };
  var missing = function (n) {
    if (logged.indexOf(_imKey(n)) < 0) return null;   // not logged yet: no verdict
    var m = [];
    var hr = _imHwToday.rows && _imHwToday.rows[_imKey(n)];
    if (_imHwToday.rows && !(hr && hr.text)) m.push('HW');
    if (_imHwToday.rows && !hr) m.push('Materials');
    if (!_imSchedGet(n)) m.push('Schedule');
    if (_imMailNeeded(n, _tdYmd())) m.push('Email');
    return m;
  };
  var names = _imRoster.slice().sort(function (a, b) {
    var ta = today.indexOf(_imKey(a)), tb = today.indexOf(_imKey(b));
    if (ta >= 0 || tb >= 0) return ta < 0 ? 1 : tb < 0 ? -1 : ta - tb;
    return a.localeCompare(b);
  });
  body.innerHTML =
    '<div class="db-section">' +
      '<div class="settings-title"><span>Students</span></div>' +   // was "Import", then "Lesson Log" (2026-10-09), then "Lessons" (renamed Students 2026-10-13)
      // The student page's box-title style (2026-10-06): one heading look on this tab.
      // Audit lessons (2026-10-14): red, right, level with "24 students", like Audit
      // payments; opens the old Logs page (Unlogged Lessons + Lesson Checklist) here.
      '<div class="db-cx-head im-sec-head im-cards-head"><label class="field-label db-cx-t">' + names.length + ' students</label>' +
        '<button class="link-btn red" onclick="openLessonAudit()" data-tip="Opens a page.\nLessons missing a log, HW, materials,\nschedule or email." data-tip-wrap>' + DETAILS_ICON + '<span>Audit lessons</span></button></div>' +
      names.map(function (n) {
        var miss = missing(n), o = open(n);
        var bits = [];
        if (o) bits.push(o + (o === 1 ? ' lesson open' : ' lessons open'));
        if (miss && miss.length) bits.push(miss.join(' + ') + ' missing');
        return '<div class="db-card im-card' + (isToday(n) ? ' im-today' : '') + (miss && !miss.length && !o ? ' im-fin' : '') + '" onclick="_imOpenStudent(' + _auEsc(JSON.stringify(n)) + ')" data-tip="Instant.\nEvery lesson logged for ' + _auEsc(n) + '.">' +
          '<div class="db-card-l"><span class="db-card-n">' + inqEsc(n) + '</span></div>' +
          (bits.length ? '<span class="im-miss">' + MISS_ICON + bits.join(' · ') + '</span>' : '') +
        '</div>';
      }).join('') +
    '</div>';
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
  var w = _stWin('imLogWin', inqEsc(name), part, CHECKLIST_ICON, '<div class="im-do-card im-win-card">' + _imDoHtml(name, day) + '</div>');
  w.querySelector('.st-win').classList.add('im-log-win');
  // Today's look (2026-10-11, from Today; everywhere since): grey, red only on the name and Reschedule.
  w.querySelector('.st-win').classList.add('td-look');
  w.onclick = function (e) { if (e.target === w) closeLogPanel(); };
  w.querySelector('[data-close]').onclick = closeLogPanel;
  var panel = document.getElementById('logPanel');
  window._logPanelHome = { parent: panel.parentNode, next: panel.nextSibling, css: panel.style.cssText };
  window._imWin = { name: name, day: day, next: next || null };
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
  }
  if (item && item.log) _imLogLock(item.logText || '');
  _imStepsRender();
}
// Already logged (the sheet says so): its text in the row, locked, like right after Log.
function _imLogLock(text) {
  if (!activeStudent) return;
  activeStudent.logged = true;
  var row = llRows(_logBox())[0];
  if (row) row.value = text;
  llLock(_logBox());
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
// Only the email left (2026-10-16): the Email window, no Log lesson window.
function _imRunQueue(q, onEach) {
  var x = q.shift();
  if (!x) return;
  var next = q.length ? function () { _imRunQueue(q, onEach); } : null;
  var m = x.item && x.item.missing;
  if (m && m.length === 1 && m[0] === 'Email') {
    var mail = _imMailFromItem(x.student.name, x.item);
    mail.next = next;
    _imMailOpen(mail);
    if (onEach) onEach(x);
    if (window._imLogActive) mail.fromImport = true;
    return;
  }
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

// ── Email window (2026-10-16): the lesson recap email (RPM_LessonMsg.js) ──
// When the Log lesson window's four steps are done it closes ("Logged ✓") and
// this opens for the same lesson (from the Audit, or Students' Log lesson,
// straight away when only the email is left). "Your Guitar Lesson Recap —
// Oct 15": the short log and HW line sit on top for reference, and you dictate
// Lesson notes and Things to practice as proper sentences (both required),
// plus optional Notes ("bring your capo"; left out when empty). Materials come
// from what was sent. Preview shows the email exactly as it will go
// (previewLessonMessage); Send sends it, ticks Email in the Lesson Checklist,
// keeps a Lesson Recaps row, and the lesson is Done. (No "No email" button,
// user 2026-10-16; saveLessonMessage stays for later.) What's typed is kept in this
// browser till it's sent, so a closed window loses nothing. Email only.
var MSG_START = '2026-10-14';   // Email is a required step from here (CHECK_MSG_START in RPM_Checklist.js; Oct 16 → Oct 14, user 2026-10-17)
function _imMsgKey(name, day) { return 'imMsg|' + _imKey(name) + '|' + (day || _tdYmd()); }
// 'Sent', 'Not needed' or ''.
function _imMsgGet(name, day) {
  day = day || _tdYmd();
  var m = window._imMail;
  if (m && m.state !== undefined && _imKey(m.name) === _imKey(name) && m.day === day) return m.state;
  var it = _ckItem(name, day);
  if (it) return it.msg || '';
  try { return localStorage.getItem(_imMsgKey(name, day)) || ''; } catch (e) { return ''; }
}
function _imMsgPut(name, day, v) {
  try { if (v) localStorage.setItem(_imMsgKey(name, day), v); else localStorage.removeItem(_imMsgKey(name, day)); } catch (e) {}
  var it = _ckItem(name, day);
  if (it) it.msg = v;
  var m = window._imMail;
  if (m && _imKey(m.name) === _imKey(name) && m.day === day) m.state = v;
}
// Still to send for this lesson (from Oct 16; trials and older lessons have none).
function _imMailNeeded(name, day) { return day >= MSG_START && !_imMsgGet(name, day); }
// The lesson, from the Log lesson window as it closes.
function _imMailFromWin(w) {
  var hw = logHw, sent = hw.choice === 'sent';
  return { name: w.name, day: w.day,
    log: toSentenceCase(llValues(_logBox()).filter(Boolean).join(', ')), hw: hw.text || '',
    files: !!(sent && hw.filesOn && hw.files.length), links: sent ? hw.links.slice() : [], none: hw.choice === 'none' };
}
// The lesson, from a Lesson checklist entry (Audit / Students' Log lesson).
function _imMailFromItem(name, it) {
  return { name: name, day: it.date, log: it.logText || '', hw: it.hwText || '',
    files: !!(it.hwFiles && it.hwFiles.length), links: (it.hwLinks || []).slice(), none: /None/.test(it.hw || '') };
}
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
function _imMailDraftKey(m) { return 'imMail|' + _imKey(m.name) + '|' + m.day; }
function _imMailDraft(m, d) {
  try {
    if (d === undefined) return JSON.parse(localStorage.getItem(_imMailDraftKey(m)) || '{}');
    if (d) localStorage.setItem(_imMailDraftKey(m), JSON.stringify(d)); else localStorage.removeItem(_imMailDraftKey(m));
  } catch (e) { return {}; }
}
function _imMailQ(id) { var w = document.getElementById('imMailWin'); return w ? w.querySelector('#' + id) : null; }
// m: { name, day, log, hw, files, links, none, next?, fromImport? }
function _imMailOpen(m) {
  window._imMail = m;
  var dr = _imMailDraft(m), esc = inqEsc;
  // Rows like the Log window's (2026-10-16): Enter or ＋ adds one, each row is
  // a sentence (it gets its full stop), rows join with spaces.
  function field(id, title, ref, ph, val, cls) {
    var rows = (Array.isArray(val) ? val : [val || '']).filter(function (v, i) { return v || !i; });
    // The short log / HW rows as a small italic list under the title (2026-10-16).
    return '<div class="im-mail-sec' + (cls || '') + '"><div class="im-mail-head"><label class="field-label">' + title.replace(/^((?:[A-Z]|\d+)\.)\s*/, '<span class="im-mail-n">$1</span>') + '</label>' +
      // As a list (user, 2026-10-16): the log's comma-joined rows, one per line.
      (ref !== null ? '<div class="im-mail-ref">' + (ref && ref.length ? '<ul>' + (Array.isArray(ref) ? ref : String(ref).split(/\s*,\s*/)).filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : 'Nothing logged') + '</div>' : '') + '</div>' +
      '<div class="ll-wrap"><div class="ll-rows" id="' + id + '">' + rows.map(function (v, i) {
        return '<input type="text" class="rpm-field ll-row' + (i ? '' : ' active') + '"' + ' value="' + _auEsc(v) + '">';
      }).join('') + '</div>' +
      '<button type="button" class="link-btn tl-mic" data-mic="' + id + '" data-tip="Starts or stops dictation." data-tip-left>' + MIC_ICON + '</button></div>' +
      '<button type="button" class="ll-add" data-add="' + id + '" data-tip="Instant.&#10;Adds a row. Enter does too.&#10;Each row is a sentence.">' + llAddInner() + '</button></div>';
  }
  // No Materials section (user, 2026-10-17): it fills itself from the Log window; the email still lists them (m.files, m.links).
  var body =
    // Bands (2026-10-16): the title row dark, then 1 and 3 lighter, 2 and 4 dark.
    // Look (user, 2026-10-16): no To or Subject on show (To is the Counter
    // email, the subject is fixed); four numbered red titles like the Log
    // window's "1. Log"; the short log / HW line in italics above its box;
    // Notes a small optional box; buttons amber.
    // Under the icon the subject as a bigger white title, a line under it (user, 2026-10-16). No email on show, no hints in the boxes.
    '<div class="im-mail">' +
      '<input id="imMailTo" type="hidden" value="' + _auEsc(dr.to || '') + '">' +
      // To and Subject back on show, read only, in This Week's row look (user, 2026-10-17).
      '<div class="im-mail-to"><div class="td-mini-row"><span class="td-mini-t">To:</span><span class="td-wk-name" id="imMailToShow">' + esc(dr.to || '…') + '</span></div>' +
        '<div class="td-mini-row"><span class="td-mini-t">Sbj:</span><span class="td-wk-name">Your Guitar Lesson Recap — ' + _ckDay(m.day) + '</span></div></div>' +
      '<hr class="divider im-mail-hr">' +
      field('imMailLesson', 'A. Lesson notes', _imRowsFor(m, 'log', m.log), 'Dictate the lesson as sentences', dr.lesson, ' im-mail-log im-mail-band') +
      '<hr class="divider im-mail-hr">' +
      field('imMailHw', 'B. HW', _imRowsFor(m, 'hw', m.hw), 'Dictate the practice as sentences', dr.hw, ' im-mail-log') +
      '<hr class="divider im-mail-hr">' +
      field('imMailNotes', 'C. Notes <span class="im-mail-opt">(optional)</span>', null, 'Bring your capo next time…', dr.notes, ' im-mail-small im-mail-band') +
      // No line before the buttons (user, 2026-10-17).
      '<div class="im-mail-foot"><span class="ll-state" id="imMailStatus"></span>' +
        '<button class="link-btn" id="imMailPrev">' + DETAILS_ICON + '<span>Preview</span></button>' +   // your magnifier (user, 2026-10-17)
        '<button class="link-btn bright" id="imMailSend">' + SEND_ICON + '<span>Send</span></button></div>' +
      '<iframe class="im-msg-frame" id="imMailFrame" title="The email" hidden></iframe>' +
    '</div>';
  // Back to the windows' title (user, 2026-10-17): "Tianyi Cao · Oct 16", the name red, the date grey.
  var w = _stWin('imMailWin', esc(m.name), _ckDay(m.day), RECAP_WIN_ICON, body);
  w.querySelector('.st-win').classList.add('im-mail-win');
  w.onclick = null;   // only ✕ closes it (user, 2026-10-16): a click outside lost a half-done email
  w.querySelector('[data-close]').onclick = _imMailClose;
  ['imMailLesson', 'imMailHw', 'imMailNotes'].forEach(function (id) {
    var box = _imMailQ(id);
    llWire(box, function (i) { llRows(box).forEach(function (el, j) { el.classList.toggle('active', j === i); }); }, _imMailKeep, null);
    llPlaceMic(box);
  });
  w.querySelectorAll('[data-add]').forEach(function (b) { b.onclick = function () { llAddRow(_imMailQ(b.getAttribute('data-add'))); }; });
  w.querySelectorAll('[data-mic]').forEach(function (b) { b.onclick = function () { _imMailMic(b); }; });
  _imMailQ('imMailPrev').onclick = _imMailPreview;
  _imMailQ('imMailSend').onclick = _imMailSend;
  // Their email (Counter) and whether it already went.
  fetch(getScriptUrl() + '?action=getLessonMsgInfo&name=' + encodeURIComponent(m.name) + '&lessonDate=' + m.day)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (window._imMail !== m || !d.success) return;
      if (d.msg) m.state = d.msg;
      var to = _imMailQ('imMailTo'), show = _imMailQ('imMailToShow');
      if (to && !to.value) to.value = d.email || '';
      if (show) show.textContent = (to && to.value) || 'No email in the Counter';
    })
    .catch(function () {});
  // Start in the first empty box (To is hidden).
  var first = ['imMailLesson', 'imMailHw', 'imMailNotes'].filter(function (id) { return !_imMailText(id); })[0];
  if (first) llRows(_imMailQ(first))[0].focus();
}
// One box's rows as sentences: capital first letter, a full stop unless it
// ends in . ! or ?, joined with spaces.
function _imMailText(id) {
  return llValues(_imMailQ(id)).filter(Boolean).map(function (t) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return /[.!?]$/.test(t) ? t : t + '.';
  }).join(' ');
}
function _imMailKeep() {
  var m = window._imMail;
  if (!m) return;
  _imMailDraft(m, { to: _imMailQ('imMailTo').value, lesson: llValues(_imMailQ('imMailLesson')), hw: llValues(_imMailQ('imMailHw')), notes: llValues(_imMailQ('imMailNotes')) });
}
function _imMailClose() {
  _imMailMicStop();
  var w = document.getElementById('imMailWin');
  if (w) w.remove();
  window._imMail = null;
  _ckLoad(function () { _ckRedraw(); });
}
// Dictation into the box's active row (one box at a time), added after what's there.
var _imMailRec = null;
function _imMailMicStop() { if (_imMailRec) { var r = _imMailRec; _imMailRec = null; r.onend = null; r.abort(); } }
function _imMailMic(btn) {
  var box = _imMailQ(btn.getAttribute('data-mic'));
  if (!box) return;
  var ta = box.querySelector('.ll-row.active') || llRows(box)[0];
  if (_imMailRec) { var same = _imMailRec._btn === btn; _imMailRec.stop(); if (same) return; }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { rpmFail('imMailStatus', 'Speech not supported. Use Chrome.'); return; }
  var r = _imMailRec = new SR(), base = ta.value.trim();
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
    _imMailKeep();
  };
  r.onend = function () {
    btn.innerHTML = MIC_ICON; btn.classList.remove('rec');
    if (_imMailRec !== r) return;
    _imMailRec = null;
    playBeep(440, 80, 0.15);
  };
  r.start();
}
// What previewLessonMessage / sendLessonMessage take.
function _imMailParams(m) {
  return {
    name: m.name, lessonDate: m.day,
    lesson: _imMailText('imMailLesson'), hw: _imMailText('imMailHw'), notes: _imMailText('imMailNotes'),
    links: m.links.map(function (l) { return l.kind + ': ' + l.url; }).join('\n'), files: m.files ? '1' : '0'
  };
}
function _imMsgQuery(p) {
  return Object.keys(p).map(function (k) { return '&' + k + '=' + encodeURIComponent(p[k]); }).join('');
}
function _imMailCheck(p) {
  if (!p.lesson) return 'Lesson notes are empty.';
  if (!p.hw) return 'HW is empty.';
  return '';
}
// The email in a white card, its own page so the portal's styles stay out.
function _imMsgShow(f, html) {
  var logo = new URL('img/email-logo.png', location.href).href;
  f.hidden = false;
  f.onload = function () { try { f.style.height = (f.contentDocument.documentElement.scrollHeight + 2) + 'px'; } catch (e) {} };
  f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'html,body{margin:0;background:#fff;color:#222;font:small/1.45 Arial,Helvetica,sans-serif}body{padding:18px 20px 20px}a{color:#1a0dab}' +
    '</style></head><body>' + String(html || '').replace(/cid:logo/g, logo) + '</body></html>';
}
function _imMailBusy(btn, on) {
  var m = window._imMail;
  if (m) m.busy = on;
  rpmBusy(document.querySelector('#imMailWin .im-mail'), btn, on);
}
function _imMailPreview() {
  var m = window._imMail, btn = _imMailQ('imMailPrev');
  if (!m || m.busy) return;
  var p = _imMailParams(m), why = _imMailCheck(p);
  _imMailQ('imMailStatus').innerHTML = '';
  if (why) { rpmFail('imMailStatus', why); return; }
  _imMailBusy(btn, true);
  fetch(getScriptUrl() + '?action=previewLessonMessage' + _imMsgQuery(p))
    .then(function (r) { return r.json(); })
    .catch(function () { return { success: false, message: 'No answer from Google.' }; })
    .then(function (d) {
      if (window._imMail !== m) return;
      _imMailBusy(btn, false);
      if (!d.success) { rpmFail('imMailStatus', d.message || 'Preview not loaded.'); return; }
      var f = _imMailQ('imMailFrame');
      _imMsgShow(f, d.html);
      setTimeout(function () { f.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
    });
}
function _imMailSend() {
  var m = window._imMail, btn = _imMailQ('imMailSend');
  if (!m || m.busy) return;
  var p = _imMailParams(m), why = _imMailCheck(p), to = _imMailQ('imMailTo').value.trim();
  _imMailQ('imMailStatus').innerHTML = '';
  if (!why && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) why = 'No email for ' + m.name + ' in the Counter (column D).';
  if (why) { rpmFail('imMailStatus', why); return; }
  _imMailBusy(btn, true);
  // GET, like every portal action (a POST lands in the Twilio webhook).
  fetch(getScriptUrl() + '?action=sendLessonMessage' + _imMsgQuery(p) + '&to=' + encodeURIComponent(to))
    .then(function (r) { return r.json(); })
    .catch(function () { return { success: false, message: 'No answer from Google.' }; })
    .then(function (d) {
      if (d.success) { _imMsgPut(m.name, m.day, 'Sent'); _imMailDraft(m, null); }
      if (window._imMail !== m) { if (!d.success) rpmToast('fail', 'Email not sent', m.name + ': ' + (d.message || '')); return; }
      _imMailBusy(btn, false);
      if (!d.success) { rpmFail('imMailStatus', d.message || 'Not sent.'); return; }
      if (d.tickError) { rpmHalf('imMailStatus', 'Sent, not recorded', d.tickError + '. The email went out.'); setTimeout(function () { _imMailDone(m); }, 2500); return; }
      _imMailDone(m);
    });
}
// Done ✓, the window closes, then the student's next open lesson or back to the list.
function _imMailDone(m) {
  var card = document.querySelector('#imMailWin .im-mail');
  if (card) {
    card.classList.add('im-done');
    var t = document.createElement('div');
    t.className = 'im-done-msg';
    t.textContent = 'Done ✓';
    card.appendChild(t);
  }
  setTimeout(function () {
    if (window._imMail !== m) return;
    _imMailClose();
    if (m.next) m.next();
    else if (m.fromImport && _imOpen && _imKey(_imOpen) === _imKey(m.name)) _imClose();
  }, 1400);
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
  // window._ckStart (a read only): try the checklist on older lessons.
  fetch(url + '?action=getChecklistAudit' + (window._ckStart ? '&start=' + window._ckStart : ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) throw new Error(d.message || 'unknown');
      var by = {};
      (d.audit || []).forEach(function (a) { by[_imKey(a.name)] = a.lessons; });
      _ck = { byName: by, loaded: true, busy: false, start: d.start || '', audit: d.audit || [] };
      if (then) then(null);
    })
    .catch(function (e) { _ck.busy = false; if (then) then(e && e.message || 'No answer from Google.'); });
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
  var c = _imCtx(), el = _imQ('imSteps');
  if (!el || !c.name || !window._imDocked) return;
  var name = c.name, hw = logHw, st = activeStudent;
  var logged = !!(st && st.logged), sched = _imSchedGet(name, c.day);
  // A status list (2026-10-06), not buttons: each line ticks itself when its
  // job is done elsewhere (Reschedule, the HW drop zone / Nothing to send, Log).
  // The card's order (2026-10-15): Lesson log, HW log (the HW rows, required),
  // Materials sent (was "HW"), Schedule checked; green, green, blue, red.
  var hwText = !!(hw && hw.textSaved);
  var steps = [
    { label: 'Lesson log', cls: 'log', done: logged },
    { label: 'HW log', cls: 'hw', done: hwText },
    { label: 'Materials sent', cls: 'mat', done: !!(hw && hw.choice) },
    { label: 'Schedule checked', cls: 'sched', done: !!sched }
  ];
  if (!hw) steps.splice(1, 2);   // no HW question for this lesson (before HW tracking)
  // Circle + label on one line (2026-10-08, back from the Trial pills): done ones dim.
  el.innerHTML = '<div class="im-checks">' + steps.map(function (x) {
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
  dim('im-hw-dock-box', !!(hw && hw.choice));
  dim('im-sched-box', !!sched);
  var w = window._imWin;
  var all = logged && !!sched && (!hw || (hwText && !!hw.choice && !hw.loading && !hw.uploading));
  var pending = !!w && _imPending(w, hw), sending = !!(w && w.sending);
  var fin = _imQ('imFinDone');
  // Finished: all four ticked and saved.
  var finished = all && !pending && !sending && !_imSchedBusy[_imSchedKey(name, c.day)];
  if (fin) fin.innerHTML = sending ? '<span class="rpm-loading">Saving</span>' : finished ? 'Finished ✓' : '';
  // All four ticked: they go to Google together.
  if (all && pending && !sending) { _imSend(w, hw); return; }
  // Finished by something pressed here (not just reopened): Done, then back (2026-10-07).
  if (finished && window._imActed === name) { window._imActed = null; _imDone(name); }
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
  var mic = document.getElementById('logMicBtn');
  if (mic) mic.disabled = true;
  var lb = document.getElementById('btnLog');
  if (lb) { lb.textContent = 'Logged ✓'; lb.className = 'link-btn green'; lb.disabled = true; }
  var ns = document.getElementById('btnNoShow');
  if (ns) ns.disabled = true;
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
  calls.push(hwc && !log ? get(url + '?action=saveHw&name=' + encodeURIComponent(hw.name) + '&lessonDate=' + hw.date + hwq) : Promise.resolve(null));
  // Schedule after the log and HW answer (2026-10-11): sent at the same moment
  // they wrote the same checklist row and the log wiped it (Gulnara, Oct 11).
  calls.push(sched !== undefined ? Promise.all(calls.slice()).then(function () {
    return get(url + '?action=saveSchedule&name=' + encodeURIComponent(w.name) + '&lessonDate=' + w.day + '&sched=' + (sched || ''));
  }) : Promise.resolve(null));
  if (hw) hw.locked = true;
  if (window._imWin === w) { rpmBusy(document.querySelector('#imLogWin .im-do-card'), null, true); _logHwRender(); _imStepsRender(); }
  Promise.all(calls).then(function (r) {
    var lr = r[0], hr = r[1], sr = r[2], why = [];
    w.sending = false;
    if (hw) hw.locked = false;
    if (lr) {
      w.pendLog = null;
      if (lr.success) {
        _logLessonDone(log.student, log.params.subject, lr, hw);
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
          var mic = document.getElementById('logMicBtn');
          if (mic) mic.disabled = false;
          var lb = document.getElementById('btnLog');
          if (lb) { lb.textContent = 'Log'; lb.className = 'link-btn bright'; lb.disabled = false; }
          var ns = document.getElementById('btnNoShow');
          if (ns) ns.disabled = false;
        }
      }
    }
    if (hr) {
      if (hr.success) {
        if (hw.choice === hwc) { hw.saved = true; hw.dirty = false; }
        _logHwSaved(hw.name, hw);
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
// All done: the card dims, Done ✓, and back to the student list, where their card is green.
// The email still to send (2026-10-16): "Logged ✓", then the Email window opens.
function _imDone(name) {
  var c = _imCtx(), card = c.root && c.root.querySelector('.im-do-card');
  if (!card) return;
  var w0 = window._imWin, mail = w0 && logHw && _imMailNeeded(name, c.day) ? _imMailFromWin(w0) : null;
  card.classList.add('im-done');
  var msg = document.createElement('div');
  msg.className = 'im-done-msg';
  msg.textContent = mail ? 'Logged ✓' : 'Done ✓';
  card.appendChild(msg);
  setTimeout(function () {
    var w = window._imWin;
    if (!w || w.name !== name) return;
    var next = w.next, fromImport = w.fromImport;
    closeLogPanel();   // the window closes
    if (mail) { mail.next = next; mail.fromImport = fromImport; _imMailOpen(mail); return; }
    if (next) next();  // the student's next open lesson (2026-10-08)
    else if (fromImport && _imOpen && _imKey(_imOpen) === _imKey(name)) _imClose();   // the last one: back to the list, their card green
  }, 1400);
}

// Nothing to send (2026-10-06): no materials this lesson. Only while nothing
// else is picked (2026-10-15); again undoes it.
function _imNothingToSend() {
  var hw = logHw;
  if (!hw || hw.loading || hw.uploading || hw.saving || hw.choice === 'sent') return;
  hw.choice = hw.choice === 'none' ? null : 'none';
  _imHwLinkClear();
  _imHwChanged();
}
// Send (2026-10-11 as Sent): the files in the zone go to them. Uploads don't
// tick it, so more can go in first; again undoes it. Goes with links (2026-10-15).
function _imHwSent() {
  var hw = logHw;
  if (!hw || hw.loading || hw.uploading || hw.saving || hw.choice === 'none' || !hw.files.length) return;
  hw.filesOn = !hw.filesOn;
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
  var nb = document.getElementById('logHwNothing'), files = document.getElementById('logHwFiles');
  var br = document.querySelector('.lh-folder-btn'), db = document.getElementById('logHwDbxBtn');
  if (db && !db.querySelector('svg')) db.insertAdjacentHTML('afterbegin', DBX_LOGO.replace('class="win-icon"', 'class="lh-dbx-ico"'));
  var nt = _imQ('imMatNone'), ft = _imQ('imMatFilesTools');
  if (nb && nt && nb.parentNode !== nt) nt.appendChild(nb);
  if (ft) [br, db].forEach(function (el) { if (el && el.parentNode !== ft) ft.appendChild(el); });
  var vs = document.getElementById('logHwVideo'), vd = _imQ('imMatVideo');
  if (vs && vd && vs.parentNode !== vd) vd.appendChild(vs);
  var ls = document.getElementById('logHwLink'), ld = _imQ('imMatLink');
  if (ls && ld && ls.parentNode !== ld) ld.appendChild(ls);
  // No show on the Log lesson title row, top right (2026-10-11).
  var ns = document.getElementById('btnNoShow'), lbox = _imQ('imLogDock');
  var lhead = lbox && lbox.parentNode && lbox.parentNode.previousElementSibling;
  if (ns && lhead && ns.parentNode !== lhead) lhead.appendChild(ns);
  // Under the log rows (2026-10-08): add-row on the left, Log on the right.
  var acts = document.getElementById('logActions'), add = document.getElementById('logAddRow'), dock = _imQ('imLogDock');
  if (acts && add && dock && dock.contains(add)) {
    var foot = dock.querySelector('.im-log-foot');
    if (!foot) { foot = document.createElement('div'); foot.className = 'im-log-foot'; add.parentNode.insertBefore(foot, add); }
    if (add.parentNode !== foot) foot.appendChild(add);
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
  _imHwBack();
  if (!window._imDocked) return;
  window._imDocked = false;
  window._imWin = null;
  var w = document.getElementById('imLogWin');
  if (w) w.remove();
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
  var n = _auEsc(JSON.stringify(name)), q = _imQueue(name), label = o.label || 'Log lesson';
  if (!q.length) return '<button class="link-btn im-log-off" data-tip="Nothing open.\nEvery lesson has its log, HW and schedule." data-tip-left data-tip-wrap>' + label + '</button>';
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
        '<span class="im-s">' + (l.subject ? inqEsc(l.subject) : '<span style="color:var(--muted)">—</span>') + '</span>' +
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
    _imSec('Checklist', '<span class="im-fin" id="imFinDone"></span>', ' im-steps-row', '<div id="imSteps"></div>') +
    // Three sections (2026-10-15): Log (the lesson and the HW), Materials
    // (what goes to them: nothing, files, video lesson links, web links), Schedule.
    '<hr class="divider im-do-hr">' +
    _imMainHead('1. Log', 'Lesson and HW', '', 'im-main-log') +
    _imSub('A. Lesson', '', ' im-log-box', '<div id="imLogDock"></div>') +
    _imSub('B. HW', '', ' im-hwtext-box', '<div id="imHwTextDock"></div>') +
    '<hr class="divider im-do-hr">' +
    _imMainHead('2. Materials', 'For practice', '', 'im-main-mat') +
    // The Log window's HW part (#logHw) is split over these (_imHwOut).
    '<div class="im-hw-dock-box">' +
      _imSub('A. Nothing to send', '', ' im-mat-sec', '<div id="imMatNone"></div>') +
      _imSub('B. Files', '<span id="imMatFilesTools"></span>', ' im-mat-sec', '<div id="imHwDock"></div>') +
      _imSub('C. Video lesson link', '', ' im-mat-sec', '<div id="imMatVideo"></div>') +
      _imSub('D. Web link', '', ' im-mat-sec', '<div id="imMatLink"></div>') +
    '</div>' +
    // Schedule: Reschedule and Not needed side by side (2026-10-06); a click
    // ticks Schedule, again undoes it.
    '<hr class="divider im-do-hr">' +
    _imMainHead('3. Schedule', 'Adjustments') +
    '<div class="db-panel im-list im-sched-box">' +
      '<button class="link-btn red im-rs-btn opens-window" onclick="_imReschedule(' + n + ')" data-tip="Opens a window.\nTheir next 8 weeks: skip or move a lesson.">Reschedule</button>' +
      '<button class="link-btn im-rs-btn im-nochange' + (_imSchedGet(name, day) === 'nochange' ? ' pressed' : '') + '" id="imNoChangeBtn" data-toggle onclick="_imNoChangeToggle(' + n + ')" data-tip="Nothing to move or skip.\nPress again to undo.">Not needed</button>' +
    '</div>');
}
// A main section's title: red, with a grey subtitle like the window title's.
function _imMainHead(title, sub, right, cls) {
  return '<div class="db-cx-head im-sec-head im-main-head' + (cls ? ' ' + cls : '') + '"><label class="field-label db-cx-t im-main-t">' + title +
    '<span class="win-sub"> · ' + sub + '</span></label>' + (right || '') + '</div>';
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
  if (!hw) return '<span style="color:var(--muted)">Loading</span>';
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
function _imReschedule(name) {
  var w = _stWin('imRsWin', inqEsc(name), 'Reschedule', CALENDAR_ICON,
    // The hint under the weeks (2026-10-06).
    "<label class='field-label'>Next 8 weeks</label><div id='imRsBody'><div class='empty-state rpm-loading'>Loading</div></div>" +
    // No "No change" button here (2026-10-08): close it and press Not needed instead.
    "<div class='im-rs-hint'>Click to reschedule or skip.</div>");
  w.querySelector('.st-win').classList.add('im-rs-win');
  _imRsLoad(name);
}

function _imRsLoad(name) {
  var url = getScriptUrl(); if (!url) return;
  fetch(url + '?action=getStudentLessons&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var box = document.getElementById('imRsBody');
      if (!box) return;   // window closed meanwhile
      if (!data.success) { box.innerHTML = '<div class="empty-state">Error: ' + inqEsc(data.message || 'unknown') + '</div>'; return; }
      if (!data.lessons || !data.lessons.length) { box.innerHTML = '<div class="empty-state">No lessons on the calendar</div>'; return; }
      var byDate = {};
      data.lessons.forEach(function (l) { byDate[l.date] = l; });
      var today = _stToday(), monday = _stMondayOf(today);
      var opts = { onDone: function () { _imSchedSet(name, 'changed'); _imRsLoad(name); } };
      box.innerHTML = '';
      var strips = document.createElement('div');
      strips.className = 'im-rs-strips';
      for (var k = 0; k < (data.weeks || 8); k++) {
        strips.appendChild(_stBuildWeekStrip(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + k * 7), byDate, today, data.student || name, opts));
      }
      box.appendChild(strips);
    })
    .catch(function () {
      var box = document.getElementById('imRsBody');
      if (box) box.innerHTML = '<div class="empty-state">No answer from Google.</div>';
    });
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
  if (!d) return '<div class="im-note-d">Loading</div>';
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
