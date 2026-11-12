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
    return '<div class="db-card im-card' + (isToday(n) ? ' im-today' : o ? ' im-unlog' : '') + (miss && !miss.length && !o ? ' im-donetoday' : '') + '"' + inStyle() + ' onclick="_imOpenFirst(' + _auEsc(JSON.stringify(n)) + ')" data-tip="Opens a window.\nTheir last lesson and HW first;\nclose it for every lesson logged.">' +
      '<div class="db-card-l"><span class="db-card-n">' + inqEsc(n) + '</span></div>' +
      (miss && !miss.length && !o ? '<span class="im-logged"><span class="im-logged-t">LOGGED</span>' + PAID_CHECK_ICON.replace('width="13" height="13"', 'width="15" height="15"') + '</span>' : '') +   // the Auto-confirmed check (user, 2026-10-26)
      (isToday(n) && !(miss && !miss.length && !o) ? '<span class="im-steps"><span class="im-step im-today-tag">Today</span></span>' : '') +   // green TODAY sign on today's cards (user, 2026-10-30)
      // Not logged group: one "+ Log" button only (user, 2026-10-30; was the step row + "· 2 open").
      (!isToday(n) && o ? '<span class="im-steps"><button class="im-step todo nolog opens-window" onclick="event.stopPropagation(); _imLogOpen(' + _auEsc(JSON.stringify(n)) + ')" data-tip="Opens a window.\nLog ' + _auEsc(_ckDay(past[0].date)) + '.">+ Log</button></span>' : '') +
      (first && !(!isToday(n) && o) ? '<span class="im-steps">' + _imStepsHtml(first.day, first.miss, first.hw, n) + (all > 1 ? '<span class="im-step-more">· ' + all + ' open</span>' : '') + '</span>' : '') +
    '</div>';
  };
  // Three boxes like Today's (user, 2026-10-30; was one box, group headings inside):
  // Today, Not logged, Students (was A–Z, user 2026-10-31), each titled in Today's red. The first one drawn carries
  // the ID-card icon under its title and Audit top right.
  var firstBox = true;
  body.innerHTML = ['Today', 'Not logged', 'General'].map(function (h, g) {
    var in_g = names.filter(function (n) { return group(n) === g; });
    if (!in_g.length) return '';
    var top = firstBox; firstBox = false;
    return '<div class="db-section td-wk-box im-box' + (anim ? ' im-stagger' : '') + '">' + TD_BOLTS +   // the Today tab's four screws (user, 2026-11-04)
      '<div class="settings-title td-wk-title im-title-row"' + inStyle() + '><span class="im-title-stack"><span>Lessons<span class="win-sub"> · ' + h + '</span></span>' + (top ? '<span class="st-page-icon">' + ANALYSIS_ICON + '</span>' : '') + '</span>' +
        (top ? '<button class="link-btn im-audit-link" onclick="switchTab(\'audit\')" data-tip="Opens a tab.\nAudit lessons and Audit payments." data-tip-wrap><span>Audit</span></button>' : '') + '</div>' +   // white, no glass: just a link (user, 2026-10-30)
      in_g.map(card).join('') +
    '</div>';
  }).join('');
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

// A card on the list (user, 2026-11-02): the student page, and over it a window with
// their last lesson and HW (the Today tab's All look, _tdAllOneHtml); closing it shows the page.
function _imOpenFirst(name) {
  _imOpenStudent(name);
  var w = _stWin('imLastWin', inqEsc(name), 'Last lesson & HW', null, '<div id="imLastBody"></div>');
  w.querySelector('.st-win').classList.add('td-all-win');
  _tdMagBtn(w);   // the magnifier, like Today's All window (user, 2026-11-04)
  var st = { ls: undefined, hw: null, hwIn: false };
  var draw = function () {
    var b = document.getElementById('imLastBody');
    if (b) b.innerHTML = _tdAllOneHtml(name, st.ls, st.hw, st.hwIn, { noName: true });
  };
  draw();
  var url = getScriptUrl();
  fetch(url + '?action=getPastLessons&count=1&studentName=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) { st.ls = d.success ? d.lessons || [] : 'fail'; })
    .catch(function () { st.ls = 'fail'; })
    .then(draw);
  // Newest first: the first row with HW text, files or links is the last HW.
  fetch(url + '?action=getHwLog&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) { st.hw = (d.success ? d.rows || [] : []).filter(function (x) { return x.text || (x.files || []).length || (x.links || []).length; })[0] || null; })
    .catch(function () {})
    .then(function () { st.hwIn = true; draw(); });
}

function _imOpenStudent(name) {
  if (_imOpen !== name) _imUndock();   // another student: their own fresh box
  if (typeof rpmNavGo === 'function') rpmNavGo('import', { kind: 'imStudent', name: name });   // Back's history (core/nav.js)
  _imLift(document.getElementById('importBody'));
  _imOpen = name;
  _imHw = null;
  _imDetail = null;
  // No Data box on the Students page now (user, 2026-10-31): nothing to read.
  _imData = { open: false, name: name, d: null };
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

// The page's own Back is gone (2026-11-07): the header's Back does it (core/nav.js).
function _imBack() { return ''; }
function _imBackBtn() {
  return '<button class="link-btn" onclick="_imClose()" data-tip="Instant.\nBack to the students.">' + ARROW_ICON + '<span>Back</span></button>';
}

function _imClose() { _imUndock(); _imOpen = null; _imLast = null; _imRoster ? _imRenderCards() : initImportTab(); }

var _imLast = null;   // { name, lessons } of the open student, for re-sorting

// Picture in the student card from Data ▾ Guitar Types (_gtData, tabs/guitartypes.js).
// Hidden until the type is known so the electric never flashes before the acoustic.
var _imGtLoading = null;
function _imGuitarArt(img, name) {
  if (!img) return;
  function apply() {
    var k = String(name || '').trim().toLowerCase();
    var s = (_gtData || []).filter(function (x) { return String(x.name).trim().toLowerCase() === k; })[0];
    if (s && s.type === 'Acoustic') img.src = 'img/student-acoustic.png';
    img.style.visibility = '';
  }
  if (typeof _gtData === 'undefined') return;
  if (_gtData) return apply();
  img.style.visibility = 'hidden';
  var url = typeof _gtUrl === 'function' ? _gtUrl() : '';
  if (!url) return apply();
  _imGtLoading = _imGtLoading || fetch(url + '?action=getGuitarTypes').then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.success && !_gtData) _gtData = d.students || []; })
    .catch(function () {}).then(function () { _imGtLoading = null; });
  _imGtLoading.then(apply);
}

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
  body.innerHTML = _imStudentHtml(name, lessons, _imHw, _imDetail, { card: true, log: true, data: true });   // no Back: the Students knob does the same (user, 2026-10-31)
  // Notes, History, HW sent and Data each in their own box, its heading inside (user, 2026-10-31; were one big box).
  var st = body.querySelector('.td-student');
  if (st) {
    st.classList.add('im-split');
    st.querySelectorAll(':scope > .im-sec-head').forEach(function (h) {
      var box = document.createElement('div');
      box.className = 'im-sec-box';
      h.parentNode.insertBefore(box, h);
      var next = h.nextElementSibling;
      box.appendChild(h);
      if (next && next.classList.contains('im-list')) box.appendChild(next);
    });
    // The name + Log lesson in a small card like the Students list's (user, 2026-10-31).
    var t = st.querySelector(':scope > .im-title');
    if (t) {
      var card = document.createElement('div');
      card.className = 'im-head-card';
      st.insertBefore(card, t);
      // The name on the left, Log lesson on the right (user, 2026-10-31; Back removed, the Students knob does the same).
      var main = document.createElement('div');
      main.className = 'im-head-main';
      main.appendChild(t);
      card.appendChild(main);
      var acts = document.createElement('div');
      acts.className = 'im-head-acts';
      [].slice.call(t.children, 1).forEach(function (el) { acts.appendChild(el); });
      card.appendChild(acts);
      var snb = acts.querySelector('.sn-note-btn');
      if (snb) { var snr = document.createElement('div'); snr.className = 'sn-note-under'; snr.appendChild(snb); card.appendChild(snr); }   // ＋ Note on its own row under the name; Not logged stays centred on the name's line (user, 2026-11-10)
      card.insertAdjacentHTML('beforeend', '<img class="im-head-art" src="img/student-guitar.svg" alt="" aria-hidden="true">');   // the red guitar in the card's empty middle (user, 2026-11-11)
      _imGuitarArt(card.querySelector('.im-head-art'), name);   // Acoustic → acoustic guitar; Electric / Both / not set → red electric (user, 2026-11-11)
      if (typeof ltmTopHtml === 'function') t.insertAdjacentHTML('beforeend', ltmTopHtml(name));   // hidden Play/Pause + Finish right of the name (user, 2026-11-09)
      // Goals bottom left of the History box, on Show all's row (user, 2026-11-02).
      var gl = acts.querySelector('.gl-btn');
      var hist = [].filter.call(st.querySelectorAll(':scope > .im-sec-box'), function (b) { return /^history$/i.test((b.querySelector('.db-cx-t') || {}).textContent || ''); })[0];
      var list = hist && hist.querySelector('.im-list');
      // Show all alone, centred under History (user, 2026-11-05); Goals moved to its own plate at the bottom.
      var more = list && list.querySelector(':scope > .im-more');
      if (more) {
        var foot = document.createElement('div');
        foot.className = 'im-hist-foot';
        foot.appendChild(more);
        list.appendChild(foot);
      }
      if (gl) gl.remove();
    }
    var notes = [].filter.call(st.querySelectorAll(':scope > .im-sec-box'), function (b) { return /^notes$/i.test((b.querySelector('.db-cx-t') || {}).textContent || ''); })[0];
    if (notes) notes.remove();   // no Notes box on the Students page (user, 2026-10-31; was moved last)
    // No Data box either: skips and reschedules live on the Skip and reschedule count tab (user, 2026-10-31).
    [].forEach.call(st.querySelectorAll(':scope > .im-sec-box'), function (b) { if (/^data$/i.test((b.querySelector('.db-cx-t') || {}).textContent || '')) b.remove(); });
    // Material sent in its own box under Last homework (user, 2026-10-31): everything after the header moves, Hide / Show more too.
    var mat = st.querySelector(':scope > .im-sec-box .im-hw-mat');
    if (mat) {
      var hwBox = mat.closest('.im-sec-box'), matBox = document.createElement('div');
      var head = hwBox.querySelector('.im-sec-head').cloneNode(true), list = hwBox.querySelector('.im-list').cloneNode(false), files = mat.parentNode.cloneNode(false);
      head.querySelector('.db-cx-t').textContent = 'Material sent';
      matBox.className = 'im-sec-box';
      while (mat.nextSibling) files.appendChild(mat.nextSibling);
      mat.remove();
      list.appendChild(files); matBox.appendChild(head); matBox.appendChild(list);
      hwBox.parentNode.insertBefore(matBox, hwBox.nextSibling);
    }
    if (typeof glBtnHtml === 'function') st.insertAdjacentHTML('beforeend', _imGoalsBoxHtml(name));   // Goals plate above the timer (user, 2026-11-05)
    // Lesson timer box removed (user, 2026-11-12): the icons by the name + small clock are the timer now
    // if (typeof ltmBoxHtml === 'function') st.insertAdjacentHTML('beforeend', ltmBoxHtml(name));   // Chat / Lesson / Total at the very bottom (tabs/lessontimer.js, 2026-11-02; under Goals, user 2026-11-05)
    // Screws on every plate, Today's (user, 2026-11-05). The name card + History read as one plate: two on top, two at the bottom.
    var hc = st.querySelector(':scope > .im-head-card');
    [].forEach.call(st.querySelectorAll(':scope > :is(.im-head-card, .im-sec-box)'), function (b) {
      var joinTop = b === hc && hc.nextElementSibling && hc.nextElementSibling.classList.contains('im-sec-box');
      var joinBot = hc && b === hc.nextElementSibling;
      b.insertAdjacentHTML('beforeend', joinTop ? TD_BOLTS.split('</span>').filter(function (s, i) { return s && (i === 0 || i === 2); }).map(function (s) { return s + '</span>'; }).join('')
        : joinBot ? TD_BOLTS.split('</span>').filter(function (s, i) { return s && (i === 1 || i === 3); }).map(function (s) { return s + '</span>'; }).join('')
        : TD_BOLTS);
    });
  }
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
  // No date in the title (user, 2026-10-30; was the date when not today's, 2026-10-08).
  var part = 'Log Lesson & Homework';
  if (student.trialEmail) part = 'Trial · ' + _ckDay(day);   // from the Trial card (2026-10-23)
  var w = _stWin('imLogWin', inqEsc(name), part, LOG_ICON, '<div class="im-do-card im-win-card">' + _imDoHtml(name, day) + '</div>');
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
  _imTermsWire();
  _imMailWire(student, name, day);
  if (item && item.log) _imLogLock(item.logText || '');
  if (typeof ltStart === 'function') ltStart(name, day, student.trialEmail);   // silent log timer (tabs/logtimer.js)
  _imStepsRender();
}
// 3. Notes to teacher (2026-10-25): optional rows under HW, private. They go
// into the same Students Import cell as the log, after "TEACHER:", and never
// into the email.
function _imTeachBox() { return _imQ('imTeachRows'); }
function _imTeachWire() {
  _imNoteWire('imTeach', function () { if (typeof updateLogButton === 'function') updateLogButton(); });   // Log waits on all four boxes (user, 2026-11-10)
  // 4. Notes to the student (2026-10-25): optional, only in the email's NOTES
  // part (not the sheet's cell). Open till Send; kept in this browser per lesson.
  var w = window._imWin, box = _imStuBox(), o = {};
  try { o = JSON.parse(localStorage.getItem(_imRowsKey(w.name, w.day)) || '{}'); } catch (e) {}
  if (box && o.notes && o.notes.length) {
    box.innerHTML = o.notes.map(function (v, i) { return '<textarea rows="1" class="rpm-field ll-row' + (i ? '' : ' active') + '">' + _auEsc(v) + '</textarea>'; }).join('');
  }
  _imNoteWire('imStu', function () { _imRowsPut('notes', llValues(box)); if (typeof updateLogButton === 'function') updateLogButton(); _imStepsRender(); });
}
function _imStuBox() { return _imQ('imStuRows'); }
// Phrase pills (user, 2026-10-26): the openings typed every lesson, one tap
// each, under the rows on the add icon's line. A pill fills the last row when
// it is empty; otherwise it opens a new row under it (user, 2026-11-02: each row
// is its own line in the log). Always capitalised, a row's first word.
var IM_PILLS = {
  log:   ['Covered', 'Practiced', 'Looked at', 'Went over', 'Talked about', 'We played', 'Started', 'Introduced', 'Improved', 'Reviewed'],   // last five: user, 2026-10-30
  hw:    ['Go over', 'Practice', 'Play', 'Review', 'Speed up', 'Try to', 'Look at'],   // Try to: user, 2026-10-31 · Look at: user, 2026-11-02
  notes: ['None', 'Make sure', 'What matters'],   // What matters + None: user, 2026-11-10 · None first, as a bordered pill (user, 2026-11-12)
  teach: ['None']   // user, 2026-11-10: the notes boxes need something in them, None says there's nothing
};
// "None" in a notes box means empty: never saved after TEACHER:, never emailed.
function _imNotNone(v) { return !!v && !/^\s*none\s*$/i.test(v); }
// Both notes boxes answered (a row typed or None), so Log can go (user, 2026-11-10).
function _imNotesAnswered() {
  return [_imTeachBox(), _imStuBox()].every(function (b) { return !b || llValues(b).some(function (v) { return v && v.trim(); }); });
}
// Terms (user, 2026-11-02): one Terms column right of the Log page's boxes (was a
// line of chips under each). They don't start a row and aren't capitalised: typed
// in where the cursor is, in whichever box was typed in last. Add more to a group here.
var IM_TERMS = [
  ['Progressions', ['ii–V–i', 'ii–V–I', 'I–vi', 'I–IV–V', 'i–iv–v', 'i–iv–V', 'i–vi–ii–V7', 'I–V7', 'i–V7']],
  ['Keys',         ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'].map(function (k) { return 'key of ' + k; })],   // round the circle of fifths (user, 2026-11-02)
  ['Chords',       ['maj', 'min', '7th', 'sus4', 'sus2', 'aug', 'dim']],
  ['Sevenths',     ['maj7', '7', 'min7', 'min(maj7)', 'maj7#5', 'maj7b5', '7#5', '7b5', 'm7b5', 'dim7']],   // user, 2026-11-02
  ['Extensions',   ['m9', 'maj9', '9', '7b9', '7#9', '9b13', '13', '7sus4', 'm11']],   // user, 2026-11-02
  ['Intervals',    ['seconds', 'thirds', 'fourths', 'fifths', 'sixths', 'sevenths']],   // seconds to sevenths (user, 2026-11-02)
  ['Modes',        ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian']],   // user, 2026-11-02
  ['Strings',      ['1st string', '2nd string', '3rd string', '4th string', '5th string', '6th string']],   // user, 2026-11-02
  ['Fingers',      ['1st finger', '2nd finger', '3rd finger', '4th finger']],   // user, 2026-11-02
  ['Techniques',   ['hammer-on', 'pull-off', 'strumming']]
];
var _imTermRow = null;   // the last row typed in on the Log page
// Every row starts with a capital by itself (user, 2026-11-10), as it's typed or dictated.
// Only real typing: a Shortcut put in first (ii–V–i) keeps its small letters.
document.addEventListener('input', function (e) {
  var el = e.target;
  if (!e.inputType || !el.classList || !el.classList.contains('ll-row') || !el.closest('#imLogWin')) return;
  var v = el.value, m = v.match(/^(\s*)([a-z])/);
  if (!m || /–/.test(v.split(' ')[0])) return;
  var a = el.selectionStart, b = el.selectionEnd;
  el.value = m[1] + m[2].toUpperCase() + v.slice(m[0].length);
  el.setSelectionRange(a, b);
}, true);
document.addEventListener('focusin', function (e) {
  if (e.target.classList && e.target.classList.contains('ll-row') && e.target.closest('#imLogWin')) _imTermRow = e.target;
});
// Clicking into a locked row of a saved log is Edit (user, 2026-11-12: went back to
// change Notes to teacher, None couldn't be deleted). The cursor stays where clicked.
document.addEventListener('focusin', function (e) {
  var el = e.target;
  if (!el.classList || !el.classList.contains('ll-row') || !el.readOnly || !el.closest('#imLogWin')) return;
  var box = el.closest('.ll-rows');
  if (!box || [_logBox(), _imTeachBox(), _hwRowsBox()].indexOf(box) < 0) return;
  if (typeof _imLogEditStart !== 'function' || !_imLogEditStart()) return;
  el.focus();
  el.setSelectionRange(el.value.length, el.value.length);
});
// Each group opens and closes on its name (user, 2026-11-02: the list got long); all
// closed whenever the window opens (user, 2026-11-10).
function _imTermsColHtml() {
  var open = {};   // all closed each time the window opens (user, 2026-11-10); a click opens one for now
  return '<div class="im-terms-col"><div class="db-cx-head im-sub-head"><label class="field-label db-cx-t im-sub-t">Shortcuts</label></div>' +
    IM_TERMS.map(function (g) {
      var on = !!open[g[0]];
      return '<div class="im-terms-grp' + (on ? ' open' : '') + '"><button type="button" class="im-terms-h" data-grp="' + g[0] + '">' + g[0] + '<span class="im-terms-car">▾</span></button><div class="im-pills im-terms">' +
        g[1].map(function (t) { return '<button type="button" class="im-pill im-term">' + t + '</button>'; }).join('') + '</div></div>';
    }).join('') + '</div>';
}
function _imTermsWire() {
  var col = _imQ('imTermsCol');
  if (!col) return;
  var side = _imQ('imSideCol');
  if (side && col.parentNode !== side) side.appendChild(col);   // under the steps (2026-11-08)
  // ← → under the steps too (user, 2026-11-08); the fail line + Try again stay bottom left.
  var sn = _imQ('imSideNav');
  ['imPgBack', 'imPgNext'].forEach(function (id) { var b = _imQ(id); if (sn && b && b.parentNode !== sn) sn.appendChild(b); });
  col.innerHTML = _imTermsColHtml();
  col.onmousedown = function (e) { e.preventDefault(); };   // the row keeps its cursor
  col.onclick = function (e) {
    var h = e.target.closest && e.target.closest('.im-terms-h');
    if (h) {
      h.parentNode.classList.toggle('open');
      return;
    }
    if (!e.target.classList.contains('im-term')) return;
    var row = _imTermRow && document.contains(_imTermRow) ? _imTermRow : null;
    _imTermPut(row ? row.closest('.ll-rows') : _logBox(), e.target.textContent);
  };
}
function _imPillsWire() {
  // None under both notes boxes (user, 2026-11-10; Notes to teacher had none before).
  [[_logBox(), IM_PILLS.log], [_hwRowsBox(), IM_PILLS.hw], [_imTeachBox(), IM_PILLS.teach], [_imStuBox(), IM_PILLS.notes]].forEach(function (x) {
    var box = x[0], wrap = box && box.closest('.ll-wrap');
    if (!wrap || (wrap.nextElementSibling && wrap.nextElementSibling.classList.contains('im-pills'))) return;   // the Log and HW rows stay between windows
    var d = document.createElement('div');
    d.className = 'im-pills im-words';   // plain words with dashes between, lit on hover (user, 2026-11-02; were chips)
    // each word keeps its dash with it, so a new line never starts with a dash (user, 2026-11-09)
    // None first, in a border with no dash after it, so it reads apart from the starters (user, 2026-11-12)
    d.innerHTML = x[1].map(function (t, i, a) { var no = t === 'None'; return '<span class="im-word-grp"><button type="button" class="im-pill' + (no ? ' im-pill-none' : '') + '">' + t + '</button>' + (!no && i < a.length - 1 ? '<span class="im-word-sep">–</span>' : '') + '</span>'; }).join('');
    d.onmousedown = function (e) { e.preventDefault(); };   // the row keeps its cursor
    d.onclick = function (e) { if (e.target.classList.contains('im-pill')) _imPillPut(box, e.target.textContent); };
    wrap.after(d);
  });
}
function _imPillPut(box, t) {
  var rows = llRows(box), inp = rows[rows.length - 1];
  if (!inp || box.classList.contains('locked') || inp.readOnly || inp.disabled) return;
  if (inp.value.trim()) { llAddRow(box); rows = llRows(box); inp = rows[rows.length - 1]; }
  inp.value = t.charAt(0).toUpperCase() + t.slice(1) + ' ';
  inp.focus();
  inp.setSelectionRange(inp.value.length, inp.value.length);
  inp.dispatchEvent(new Event('input', { bubbles: true }));
}
// A term goes in at the cursor of the row being typed in (else the last row), spaced from its neighbours.
function _imTermPut(box, t) {
  var rows = llRows(box), ae = document.activeElement;
  var inp = rows.indexOf(ae) >= 0 ? ae : rows.filter(function (r) { return r.classList.contains('active'); })[0] || rows[rows.length - 1];
  if (!inp || box.classList.contains('locked') || inp.readOnly || inp.disabled) return;
  var v = inp.value, pos = document.activeElement === inp && inp.selectionStart != null ? inp.selectionStart : v.length;
  var before = v.slice(0, pos), after = v.slice(pos);
  var head = before && !/\s$/.test(before) ? before + ' ' : before;
  if (!head && !/–/.test(t)) t = t.charAt(0).toUpperCase() + t.slice(1);   // a row's first word still gets its capital (not ii–V–i)
  inp.value = head + t + (after && /^\s/.test(after) ? '' : ' ') + after;
  inp.focus();
  var p = (head + t + ' ').length;
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
  var box = _imTeachBox(), rows = box ? llValues(box).filter(_imNotNone) : [];
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
// Edit (user, 2026-11-08): back on the Log page of a lesson already in the sheet, the
// Log button reads Edit. It opens the log, teacher and HW rows again; Save writes over
// the same log (logLesson replace=1) and the HW text over the same HW row (saveHw), and
// stays on the page. The email, if not sent yet, is written again from the new log.
function _imLogEditStart() {
  var w = window._imWin;
  if (!w || !activeStudent || !activeStudent.logged || w.logEdit || w.pendLog || w.sending) return false;
  // Back on a page already passed: Save stays. On the furthest page (a reopened lesson, HW missing): Save turns on.
  w.logEdit = true; w.logReplace = true; w.noTurn = (w.pgList || []).indexOf(w.page) < (w.pgMax || 0);
  activeStudent.logged = false;
  var box = _logBox();
  if (box) { box.classList.remove('locked'); llRows(box).forEach(function (el) { el.readOnly = false; }); }
  _imTeachLock(false);
  var mic = document.getElementById('logMicBtn');
  if (mic) mic.disabled = false;
  if (logHw) {
    logHw.textLocked = false;
    var hb = _hwRowsBox();
    if (hb) { hb.classList.remove('locked'); llRows(hb).forEach(function (el) { el.readOnly = false; }); }
    var hm = document.getElementById('logHwMic');
    if (hm) hm.disabled = false;
  }
  var lb = document.getElementById('btnLog');
  if (lb) { lb.textContent = 'Save'; lb.className = 'link-btn bright'; }
  updateLogButton();
  var r = box && llRows(box)[0];
  if (r) r.focus();
  return true;
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
  // No text with it (the checklist only knows it's logged): read it from their sheet (user, 2026-11-08, Cathy).
  if (!text) _imLogTextLoad();
}
function _imLogTextLoad() {
  var w = window._imWin, st = activeStudent;
  if (!w || !st || !st.student) return;
  var d = new Date(w.day + 'T12:00:00'), key = d.toLocaleString('en-US', { month: 'short' }) + ' /' + d.getDate();
  fetch(getScriptUrl() + '?action=getPastLessons&studentName=' + encodeURIComponent(st.student.name))
    .then(function (r) { return r.json(); })
    .then(function (r) {
      if (window._imWin !== w || activeStudent !== st || !st.logged || w.logEdit) return;
      var hit = (r.lessons || []).filter(function (l) { return l.date === key; })[0];
      if (!hit || !hit.subject) return;
      var row = llRows(_logBox())[0];
      if (row && !row.value) row.value = _imNoTeacher(hit.subject);
      var tb = _imTeachBox(), tr = tb && llRows(tb)[0];
      if (tr && !tr.value) tr.value = _imTeacherOf(hit.subject);
    })
    .catch(function () {});
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
// Change appointment's Done (user, 2026-11-09: "are you done here"): nothing changed = no change,
// saved, then on to the next page. A skip or move saved stays as it is.
function _imSchedDone(name) {
  var w = window._imWin, d = _imCtx().day;
  if (!w || w.sending) return;
  var cur = _imSchedGet(name, d);
  if (cur !== 'changed' && cur !== 'nochange') { w.schedNeed = false; _imSchedSet(name, 'nochange', d); }
  var list = w.pgList || [], nx = list[list.indexOf(3) + 1];
  if (nx) _imPageTo(nx); else if (_imPending(w, logHw)) _imSend(w, logHw);
  _imStepsRender();
}
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
  if (_imHwToday.rows && !(hr && hr.hw)) m.push('Materials');   // a HW-text-only row (2026-11-08) isn't Materials
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
  // Nothing done yet: one button, not a row of them (user, 2026-10-17). It says what it does,
  // "＋ Log", not the state "Not logged" (user, 2026-11-10); dimmed when there's nothing to log.
  if (steps.every(function (s) { return miss.indexOf(s) >= 0; })) return red('＋ Log', 'Log ' + _ckDay(day) + '.', false);   // no ✕ on this one (user, 2026-10-17)
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
    _imQ(id).oninput = function () { _imQ('imMailFrame').hidden = true; _imMlGrow(this); _imStepsRender(); };
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
// One item a line, Title Case, no full stops (user, 2026-11-02; were sentences).
function _imMailSentences(rows) {
  var whole = Array.isArray(rows) ? rows.join(', ') : String(rows || '');
  if (typeof NS_HW === 'string' && whole.trim() === NS_HW.trim()) return whole.trim();   // No show's HW stays a sentence
  if (!Array.isArray(rows)) rows = whole.split(/\s*,\s*/);
  return rows.map(toLogLine).filter(Boolean).join('\n');
}
// Notes to the student stay sentences: first letter up, a full stop unless signed.
function _imMailNotes(rows) {
  return (rows || []).filter(_imNotNone).map(function (t) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return /[.!?]$|- RPM$/.test(t) ? t : t + '.';
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
  m.notes = _imMailNotes(llValues(_imStuBox()));
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
  if (w && w.mailFilled && !force) { _imMailDarkLoad(w, _imLogMail(true)); return; }   // materials changed on a page before: read again
  if (!w || (w.mailFilled && !force)) return;
  var m = _imLogMail(true);
  if (!m) return;
  _imQ('imMailLesson').value = m.lesson;
  _imQ('imMailHw').value = m.hw;
  _imQ('imMailNotes').value = m.notes;
  w.mailFilled = true;
  _imQ('imMailFrame').hidden = true;
  _imQ('imMailStatus').innerHTML = '';
  ['imMailLesson', 'imMailHw', 'imMailNotes'].forEach(function (id) { _imMlGrow(_imQ(id)); });
  _imMailDarkLoad(w, m);
  _imStepsRender();
}
function _imMlGrow(t) { if (t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; } }
// The rest of the email (greeting, materials, next lesson, signature) from previewLessonMessage,
// split round the three parts typed here. Placeholders stand in for them in the read.
function _imMailDarkLoad(w, m) {
  if (!m) return;
  var p = _imMailParams(m);
  p.lesson = 'x'; p.hw = 'x'; p.notes = '';
  var key = JSON.stringify(p);
  if (w.mailDarkKey === key) return;   // same materials: nothing to read
  w.mailDarkKey = key;
  var top = _imQ('imMailTop'), mat = _imQ('imMailMat'), end = _imQ('imMailEnd');
  if (mat) mat.innerHTML = '<div class="im-none rpm-loading is-inline">Loading</div>';
  fetch(getScriptUrl() + '?action=previewLessonMessage' + _imMsgQuery(p))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (window._imWin !== w || !d.success) throw new Error();
      var img = function (h) {
        return h.replace(/cid:logo/g, 'img/email-logo.png').replace(/cid:dbx/g, 'img/email-dropbox.png').replace(/cid:lnk/g, 'img/email-link.png').replace(/cid:vid/g, 'img/email-video.png');
      };
      var box = document.createElement('div');
      box.innerHTML = img(String(d.html || ''));
      var root = box.firstElementChild && box.firstElementChild.children.length ? box.firstElementChild : box;
      var kids = [].slice.call(root.children), hrs = [], matAt = -1;
      kids.forEach(function (el, i) {
        if (el.tagName === 'HR') hrs.push(i);
        if (/^\s*MATERIALS\s*$/.test(el.textContent) && el.tagName === 'P') matAt = i;
      });
      var html = function (a, b) { return kids.slice(a, b).filter(function (el) { return el.tagName === 'HR' || !/^\s*$/.test(el.textContent) || el.querySelector('img'); }).map(function (el) { return el.outerHTML; }).join(''); };
      if (top) top.innerHTML = html(0, hrs[0]);
      if (mat) mat.innerHTML = matAt >= 0 ? html(matAt, hrs[hrs.length - 1]) : '';
      if (end) end.innerHTML = html(hrs[hrs.length - 1], kids.length);
    })
    .catch(function () { w.mailDarkKey = null; if (mat && window._imWin === w) mat.innerHTML = ''; });
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
    // Preview only (user, 2026-10-30): white paper with a faint grain (no cream); the real email stays plain.
    'html,body{background-color:#fff;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'p\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix values=\'0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.09 0\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23p)\'/%3E%3C/svg%3E")}' +
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
      if (d.success) { w.mailSent = true; _imMsgPut(w.name, w.day, 'Sent'); if (typeof ltFinish === 'function') ltFinish(w.name, w.day); }
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
  // Materials, three pages since 2026-11-02 (user): 2 Recorded? · 5 Include links? (Finish) ·
  // 6 Sending files? (Finish). Each is its own answer; one already in the sheet counts.
  var linksYes = !!(hw && (hw.linksQ === 'yes' || hw.links.length || hw.videoOnly));
  var recDone = !!(hw && _imRecDone(hw));
  var linksDone = !!(hw && ((hw.linksQ === 'no' && !linksYes) || (linksYes && hw.linksDone)));
  var filesDone = !!(hw && (hw.pick === 'none' || (hw.pick === 'send' && hw.matDone && !hw.uploading && !hw.loading && !hw.gathering)));   // never done mid-upload (2026-11-08)
  var matIn = !!(hw && hw.choice && linksDone && filesDone);
  var matOk = recDone && matIn;
  // Files page: the box (drop zone, Gather, Browse, Finish) opens on Send.
  var open = !!(hw && hw.pick === 'send');
  var fb = _imQ('imMatFinishBtn');
  if (fb) {
    fb.disabled = !(hw && open && hw.choice === 'sent' && (hw.files.length || (hw.found || []).length) && !hw.loading && !hw.uploading && !hw.gathering && !hw.matDone);
    fb.textContent = hw && hw.matDone ? 'Finished ✓' : 'Finish';
  }
  var mb = _imQ('imMatBox');
  if (mb) mb.style.display = '';   // always open (one page, 2026-11-08)
  // Links page: Yes opens the two lines and their Finish.
  var lbx = _imQ('imLinksBox'), lfb = _imQ('imLinksFinishBtn');
  if (lbx) lbx.style.display = '';
  if (lfb) {
    lfb.disabled = !(hw && linksYes && !hw.locked && !hw.linksDone);   // a link still typed in its line counts: Finish adds it
    lfb.textContent = hw && hw.linksDone ? 'Finished ✓' : 'Finish';
  }
  [['imLinksYes', linksYes], ['imLinksNo', hw && hw.linksQ === 'no' && !linksYes]].forEach(function (x) {
    var b = _imQ(x[0]);
    if (!b) return;
    b.classList.toggle('done', !!x[1]);
    b.disabled = !hw || !!(hw.locked || hw.loading || hw.saving);
  });
  // Done (one page, 2026-11-08): says when there's nothing to send; waits out uploads.
  var db = _imQ('imMatDoneBtn');
  if (db) {
    var some = !!(hw && (hw.files.length || hw.links.length || hw.videoOnly || (hw.found || []).length || hw.rec === 'phone' || hw.rec === 'zoom'));
    db.disabled = !hw || !!(hw.locked || hw.loading || hw.uploading || hw.gathering || hw.saving) || !_imMatAnswered(hw);
    db.textContent = 'Done';   // one word, like Log, no hover tip (user, 2026-11-09; was "Done · Nothing to send" when empty)
    db.removeAttribute('data-tip');
  }
  var gl = _imQ('imGatherList'), gb = _imQ('logHwGatherBtn');
  if (gl) gl.innerHTML = _imGatherHtml(hw);
  if (gb) gb.disabled = !hw || !!(hw.locked || hw.loading || hw.uploading || hw.noDbx || hw.gathering);
  // 3. Schedule's picks; Reschedule shows with Needed.
  var sRaw = _imSchedGet(name, c.day), sNeed = !!(window._imWin && window._imWin.schedNeed) || sRaw === 'changed';
  var sy = _imQ('imSchedYes'), sn = _imQ('imSchedNo'), srs = _imQ('imSchedRs');
  if (sy) sy.classList.toggle('done', sNeed);
  if (sn) sn.classList.toggle('done', sRaw === 'nochange');
  if (srs) srs.style.display = '';   // always there (2026-11-09)
  // Done waits for an answer (user, 2026-11-12): No change or a saved change first.
  var sdb = _imQ('imSchedDoneBtn');
  if (sdb) sdb.disabled = sRaw !== 'changed' && sRaw !== 'nochange';
  // Recorded: Yes opens Phone / Zoom on the line under it (user, 2026-11-02).
  var recYes = !!(hw && (hw.rec === 'yes' || hw.rec === 'phone' || hw.rec === 'zoom')), rw = _imQ('imRecHow');
  if (rw) rw.style.display = recYes ? '' : 'none';
  [['imRecYes', recYes], ['imRecPhone', hw && hw.rec === 'phone'], ['imRecZoom', hw && hw.rec === 'zoom'], ['imRecNo', hw && hw.rec === 'no'], ['imMatSend', hw && hw.pick === 'send'], ['imMatNo', hw && hw.pick === 'none']].forEach(function (x) {
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
  var matPage = recDone && linksDone && filesDone && !!(hw && !hw.uploading && !hw.loading && !hw.gathering);
  var pgDone = { 1: logged && (!hw || hwText), 6: matPage, 3: !!sched, 4: !!(window._imWin && window._imWin.mailSent) };
  Array.prototype.forEach.call(c.root.querySelectorAll('.im-main-box'), function (box) {
    var pg = box.closest('.im-page'), d = !!(pg && pgDone[pg.getAttribute('data-pg')]);
    box.classList.toggle('im-sec-done', d);
    if (box.previousElementSibling) box.previousElementSibling.classList.toggle('im-sec-done', d);
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
  _imPagesRender(w, pgDone, !!hw);
  // Finished by something pressed here (not just reopened): Done, then back (2026-10-07).
  if (finished && !mailLeft && window._imActed === name) { window._imActed = null; _imDone(name); }
}

// ── Pages (user, 2026-10-30) ──
// The Log window shows one section at a time: 1. Log, 2. Practice materials,
// 3. Change appointment, 4. Email (a trial has no 3; no HW question, no 2; no
// email to send, no 4). A done page saves (_imSend, as closing does) and turns
// to the next by itself; ← goes back, → forward again to pages already done.
function _imPageList(w, hasHw) {
  // Materials is three pages (2, 5, 6) since 2026-11-02; the ids stay numbers, the order is this list's.
  // Files, Links, then Recorded (user, 2026-11-08; was Recorded, Links, Files).
  // One Practice materials page (6) since 2026-11-08 (2 and 5 folded into it).
  return [1, 6, 3, 4].filter(function (p) {
    return (p !== 6 || hasHw) && (p !== 3 || !w.trial) && (p !== 4 || w.mail);
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
  // A page turns to the next by itself once it's done (user, 2026-10-30; off 2026-11-02, back on
  // 2026-11-08): only when it was open and not done, so going back to a finished page stays put.
  // Log, the picks, Finish and Change appointment are what turn the page; → is only for going forward again.
  w.pgOpen = w.pgOpen || {};
  var nx = list[list.indexOf(w.page) + 1];
  // Reached for the first time already done (answered before the window reopened, e.g. Change
  // appointment): turns on too (user, 2026-11-08, Cathy), or it's a dead end with → still grey.
  w.pgSeen = w.pgSeen || {};
  var firstSeen = !w.pgSeen[w.page];
  w.pgSeen[w.page] = true;
  if (!done[w.page]) w.pgOpen[w.page] = true;
  else if ((w.pgOpen[w.page] || firstSeen) && nx && !w.noTurn && w.page !== 3) {   // Change appointment waits for its Done (2026-11-09)
    w.pgOpen[w.page] = false;
    var from = w.page;
    var turn = function () {
      if (window._imWin !== w || w.page !== from) return;
      if (w.sending) return setTimeout(turn, 300);   // waits out a save
      _imPageTo(nx);
    };
    setTimeout(turn, 350);   // a beat to see the tick
  }
  var at = list.indexOf(w.page);
  w.pgMax = Math.max(w.pgMax || 0, at);   // the furthest page reached: → lights only behind it
  // The page's name in the window title, red (user, 2026-10-30): no heading on the page.
  var sub = c.root.querySelector('.settings-title .win-sub');
  if (sub) sub.textContent = ' · ' + ({ 1: 'Log Lesson & Homework', 2: 'Recorded on Their Side', 5: 'Links', 6: 'Practice Materials', 3: 'Change Appointment', 4: 'Lesson Recap Email' })[w.page];
  Array.prototype.forEach.call(c.root.querySelectorAll('.im-page'), function (el) {
    el.style.display = +el.getAttribute('data-pg') === w.page ? '' : 'none';
  });
  if (w.page === 4) {
    _imMailFill(w);
    ['imMailLesson', 'imMailHw', 'imMailNotes'].forEach(function (id) { _imMlGrow(_imQ(id)); });   // sized once the page shows (hidden it measures wrong)
  }
  var sw = c.root.querySelector('.st-win');
  if (sw) sw.classList.add('im-log-wide');   // two panels on every page, one size (user, 2026-11-08; was the Log page only)
  var tc = _imQ('imTermsCol');
  if (tc) tc.style.display = w.page === 1 ? '' : 'none';   // Shortcuts belong to the Log page
  _imStepsSide(w, list, done);
  if (typeof ltPage === 'function') ltPage(w.page === 5 || w.page === 6 ? 2 : w.page);   // the timer keeps Materials as one
  // No step buttons on top (user, 2026-10-30): the section titles are numbered already; Back goes back.
  var back = _imQ('imPgBack'), next = _imQ('imPgNext'), busy = !!(w.sending || w.mailBusy);
  if (back) { back.style.visibility = at > 0 ? '' : 'hidden'; back.disabled = busy || !!w.logEdit; }
  // A saved log reads Edit (user, 2026-11-08); Logged ✓ only while it waits to go.
  var lb = _imQ('btnLog') || document.getElementById('btnLog');
  if (lb && !w.logEdit && activeStudent && activeStudent.logged) {   // done or not: a reopened lesson with no HW yet needs Edit to go on
    var saved = !w.pendLog && !w.sending;
    lb.textContent = saved ? 'Edit' : 'Logged ✓';
    lb.className = saved ? 'link-btn' : 'link-btn green';
    lb.disabled = !saved;
    lb.setAttribute('data-tip', saved ? 'Instant.\nOpens the log and HW again.\nSave writes over the saved one.' : 'Instant.\nSaves the lesson log.\n⌘ Enter does too.');
  }
  if (next) { next.style.visibility = at < list.length - 1 ? '' : 'hidden'; next.disabled = busy || !!w.logEdit || !done[w.page] || at >= w.pgMax; }
}
// The steps at the top of the right panel (user, 2026-11-08), in the Shortcuts look:
// the page you're on bright, done ones with a ✓, the rest grey. Not buttons: ← → move.
function _imStepsSide(w, list, done) {
  var el = _imQ('imStepsCol');
  if (!el) return;
  var names = { 1: 'Log lesson & homework', 6: 'Practice materials', 3: 'Change appointment', 4: 'Lesson recap email' };
  el.innerHTML = '<div class="db-cx-head im-sub-head"><label class="field-label db-cx-t im-sub-t">Steps</label></div>' +
    list.map(function (p, i) {
      var cls = p === w.page ? ' on' : done[p] ? ' done' : '';
      return '<div class="im-step-side' + cls + '"><span>' + (i + 1) + '. ' + names[p] + '</span><span class="im-step-side-m">' + (done[p] ? '✓' : '') + '</span></div>';
    }).join('');
}
function _imPageTo(p) {
  var w = window._imWin;
  if (!w) return;
  // Already saving (a tick that finished the lesson starts the save itself, 2026-11-12): turn once it's saved,
  // or the page stayed put and needed a second press.
  if (w.sending) { w.turnTo = p; return; }
  // Save first, on this page, then turn (user, 2026-11-08: turning first showed the NEXT page
  // with LOGGING over it, before it was ever seen). _imSend turns to w.turnTo once it's saved.
  if (_imPending(w, logHw)) { w.turnTo = p; _imSend(w, logHw); return; }
  w.page = p;
  w.noTurn = false;
  _imStepsRender();
  var d = _imQ('imPgDots');
  if (d) d.scrollIntoView({ block: 'start' });
}
function _imPageGo(step) {
  var w = window._imWin, list = w && w.pgList;
  if (!list) return;
  var i = list.indexOf(w.page) + step;
  if (w.logEdit || i < 0 || i >= list.length || (step > 0 && (!(w.pgDone || {})[w.page] || list.indexOf(w.page) >= (w.pgMax || 0)))) return;
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
  var edited = !!w.logEdit;
  if (edited) { w.logEdit = false; w.pgOpen = w.pgOpen || {}; if (w.noTurn) w.pgOpen[1] = false; if (!w.mailSent) w.mailFilled = false; }
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
  if (edited) _imSend(w, logHw);   // an edit saves now and stays on the page
}
// HW to save: answered here, or files picked up here, and not in the sheet yet.
function _imHwNeeds(hw) { return !!(hw && hw.choice && (hw.dirty || !hw.saved) && !hw.loading && !hw.uploading); }
function _imPending(w, hw) { return !!(w.pendLog || _imHwNeeds(hw) || w.pendSched !== undefined); }
function _imSend(w, hw) {
  if (!w || w.sending || !_imPending(w, hw)) return;
  w.sending = true;
  var pst = _imQ('imPgState');
  if (pst) pst.innerHTML = '';
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
    // No Materials answer yet: the HW text goes with the log on its own (hw=text, user 2026-11-08),
    // so it's saved the moment Log is pressed; Materials fills in the same row later.
    else if (hw && hw.text && log.params.studentName) { q += '&hw=text&hwText=' + encodeURIComponent(hw.text); var hwTextSent = hw.text; }
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
    // Lock timeout (user, 2026-11-08): Google was busy with another job (the hourly payment
    // check, the inquiry sync). Keep the answers and try again by itself, 3 times, 5s apart.
    var tries = w.lockTries || 0, retry = false;
    function isLock(m) { return /lock timeout|holding the lock/i.test(String(m || '')); }
    function lockBusy(m) { return tries < 3 && isLock(m); }
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
        if (lr.hwSaved && hw && hwTextSent) hw.textStored = hwTextSent;
        if (lr.noShowError) why.push('No show: ' + lr.noShowError + '.');
        if (lr.hwError && lockBusy(lr.hwError)) { retry = true; if (hw && hw.choice === hwc) hw.dirty = true; }
        else if (lr.hwError) { why.push('HW: ' + lr.hwError); if (hw && hw.choice === hwc) { if (isLock(lr.hwError)) hw.dirty = true; else { hw.choice = null; hw.dirty = false; } } }
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
          if (lb) { lb.textContent = '＋ Log'; lb.className = 'link-btn amber'; lb.disabled = false; }
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
      } else if (lockBusy(hr.message)) {
        retry = true;
        if (hw.choice === hwc) hw.dirty = true;
      } else {
        why.push('HW: ' + (hr.message || 'not saved.'));
        // Google busy: the answer stays, Try again sends it. Anything else: un-ticked, pick it again.
        if (hw.choice === hwc) { if (isLock(hr.message)) hw.dirty = true; else { hw.choice = null; hw.dirty = false; } }
      }
    }
    if (sr) {
      if (w.pendSched === sched) delete w.pendSched;
      if (!sr.success && lockBusy(sr.message)) { retry = true; if (w.pendSched === undefined) w.pendSched = sched; }
      else if (!sr.success) {
        why.push('Schedule: ' + (sr.message || 'not saved.'));
        if (window._imWin === w) _imSchedPut(w.name, w.day, ''); else try { localStorage.removeItem(_imSchedKey(w.name, w.day)); } catch (e) {}
      }
    }
    w.lockTries = retry ? tries + 1 : 0;
    if (retry) setTimeout(function () { if (!w.sending && _imPending(w, hw)) _imSend(w, hw); }, 5000);
    // Saved: now the page turns (it waited, _imPageTo). Not saved: it stays, with the reason.
    var turnTo = !retry && !why.length && window._imWin === w ? w.turnTo : null;
    if (!retry) w.turnTo = null;
    if (window._imWin === w) {
      var card2 = document.querySelector('#imLogWin .im-do-card');
      rpmBusy(card2, null, false);
      if (why.length) { window._imActed = null; rpmFail('logPanelStatus', why.join(' ')); _imFailWhy(why); }
      _logHwRender(); updateLogButton(); _imStepsRender();
      if (turnTo) _imPageTo(turnTo);
    } else {
      // Saved after the window closed: say so only if something didn't.
      if (why.length) rpmToast('fail', 'Not saved', w.name + ': ' + why.join(' '));
      if (_imOpen && _imKey(_imOpen) === _imKey(w.name) && typeof _imOpenStudent === 'function') _imOpenStudent(_imOpen);
      // Closed with the email still to send: their card shows "✕ Email", which reopens the Log window (2026-10-25).
      _ckLoad(function () { _ckRedraw(); });
    }
  });
}
// The reason written out next to Unsuccessful (user, 2026-11-08: it hid in the hover), in plain words.
function _imFailWhy(why) {
  var el = document.getElementById('logPanelStatus');
  if (!el) return;
  var lock = false;
  var plain = why.map(function (m) {
    if (!/lock timeout|holding the lock/i.test(m)) return m;
    lock = true;
    return m.split(':')[0] + ': Google was busy with another job and didn\'t answer in time.';
  }).join(' ');
  el.insertAdjacentHTML('afterbegin', '<span class="im-fail-why">' + inqEsc(plain) + '</span>');
  // The same at the bottom of every page (the Log page's line is out of sight later on), with Try again.
  var pst = _imQ('imPgState');
  if (pst) pst.innerHTML = '<span class="tl-fail">Unsuccessful</span><span class="im-fail-why">' + inqEsc(plain) + '</span>' +
    (lock ? '<button type="button" class="link-btn" onclick="_imSend(window._imWin, logHw)" data-tip="Waits for Google.&#10;Sends what didn\'t save." data-tip-left>Try again</button>' : '');
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
      if (hw.doneAfterMove) { hw.doneAfterMove = false; _imMatDone(); return; }   // Done pressed with gathered files
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
// Sending files? (2026-10-25; files only since 2026-11-02, links have their own page):
// Send or Nothing to send; again undoes it. Nothing to send drops the files from
// this lesson (they stay in Dropbox), links stay. Send waits for Finish.
function _imMatPick(v) {
  var hw = logHw;
  if (!hw || hw.loading || hw.uploading || hw.saving || hw.locked) return;
  hw.pick = hw.pick === v ? null : v;
  hw.matDone = false;
  if (hw.pick === 'none') { hw.filesOn = false; hw.found = null; }
  hw.choice = null;
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
// since 2026-10-26; Yes / No again 2026-11-02, Yes opens Phone / Zoom.)
// hw.rec: 'yes' = Yes pressed, Phone / Zoom not picked yet (not answered).
function _imRecDone(hw) { return !!hw.rec && hw.rec !== 'yes'; }
// Practice materials, one page (user, 2026-11-08): Done answers all three at once from what's
// on the page: files in → Send (gathered ones are moved in first), none → No files; links in →
// Links, none → No; Phone / Zoom picked → recorded, neither → No. Anything changed after it: Done again.
// Video lesson link, Web link and Recorded each need an answer before Done (user, 2026-11-10):
// a link, or None typed / picked in the box; Phone, Zoom or No. Files can stay empty.
function _imMatAnswered(hw) {
  if (!hw) return false;
  if (hw.linksDone) return true;   // a reopened lesson, already answered
  function box(kind, id) {
    var inp = document.getElementById(id);
    return hw.links.some(function (l) { return l.kind === kind; }) || (kind === 'Video' && !!hw.videoOnly) || !!(inp && inp.value.trim());
  }
  return box('Video', 'logHwVideoInput') && box('Link', 'logHwLinkInput') && ['phone', 'zoom', 'no'].indexOf(hw.rec) >= 0;
}
function _imMatDone() {
  var hw = logHw;
  if (!hw || hw.locked || hw.loading || hw.uploading || hw.gathering || hw.saving) return;
  if (!_imMatAnswered(hw)) return;
  ['Video', 'Link'].forEach(function (k) {   // a link still typed in its line goes in
    var inp = document.getElementById(k === 'Video' ? 'logHwVideoInput' : 'logHwLinkInput');
    if (inp && inp.value.trim()) _imHwLinkAdd(k);
  });
  if ((hw.found || []).length) { hw.pick = 'send'; _logHwRecalc(hw); hw.doneAfterMove = true; _imMatFinish(); return; }
  var files = hw.files.length > 0, links = hw.links.length > 0 || !!hw.videoOnly;
  hw.pick = files ? 'send' : 'none';
  hw.matDone = files;
  if (!files) { hw.filesOn = false; hw.found = null; }
  hw.linksQ = links ? 'yes' : 'no';
  hw.linksDone = true;
  if (hw.rec !== 'phone' && hw.rec !== 'zoom') hw.rec = 'no';
  hw.phone = hw.rec === 'phone' || hw.rec === 'zoom';
  hw.zoom = hw.rec === 'zoom';
  hw.choice = null;
  _imHwChanged();
}
// Phone / Zoom (2026-11-08): one or the other, again = not recorded. Done needed again.
function _imRecPick(v) {
  var hw = logHw;
  if (!hw || hw.loading || hw.saving || hw.locked) return;
  hw.rec = hw.rec === v ? null : v;
  hw.phone = hw.rec === 'phone' || hw.rec === 'zoom';
  hw.zoom = hw.rec === 'zoom';
  hw.linksDone = false;   // the page waits for Done again
  _imHwChanged();
}
function _imHwRec(v) {
  var hw = logHw;
  if (!hw || hw.loading || hw.saving || hw.locked) return;
  if (v === 'yes') hw.rec = hw.rec && hw.rec !== 'no' ? null : 'yes';   // Yes again undoes Phone / Zoom too
  else if (v === 'no') hw.rec = hw.rec === 'no' ? null : 'no';
  else hw.rec = hw.rec === v ? 'yes' : v;   // Phone / Zoom again: back to just Yes
  hw.phone = hw.rec === 'phone' || hw.rec === 'zoom';   // recorded, either way
  hw.zoom = hw.rec === 'zoom';   // on Zoom, their side (2026-10-26)
  _imHwChanged();
}
// Video lesson link / Web link (2026-10-15): paste, Add (or Enter) puts it on
// that list, × takes it off. Any number, with files too.
function _imHwLinkAdd(kind) {
  var hw = logHw, inp = document.getElementById(kind === 'Video' ? 'logHwVideoInput' : 'logHwLinkInput');
  if (!hw || !inp || hw.locked) return;
  var url = inp.value.trim();
  if (!url || /^none$/i.test(url)) return;   // None answers the box, it's never a link (user, 2026-11-10)
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  hw.links.push({ kind: kind === 'Video' ? 'Video' : 'Link', url: url });
  if (kind === 'Video') hw.videoOnly = false;
  hw.linksDone = false;
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
// Add links? (user, 2026-11-02; were B. and C.'s own circles): Yes opens the
// Video lesson link and Web link boxes, No closes them and drops their links.
function _imLinksQ(v) {
  var hw = logHw;
  if (!hw || hw.locked || hw.loading || hw.saving) return;
  var yes = hw.linksQ === 'yes' || hw.links.length || hw.videoOnly;
  hw.linksQ = (v === 'yes' ? yes : hw.linksQ === 'no') ? null : v;
  hw.linkYes = hw.linkYes || {};
  hw.linkYes.Video = hw.linkYes.Link = hw.linksQ === 'yes';
  if (hw.linksQ !== 'yes') { hw.links = []; hw.videoOnly = false; _imHwLinkClear(); }
  hw.linksDone = false;
  hw.choice = null;
  _imHwChanged();
  if (hw.linksQ === 'yes') { var el = document.getElementById('logHwVideoInput'); if (el) el.focus(); }
}
// Links Finish: anything still typed in a line goes in first, then the page is done.
function _imLinksFinish() {
  var hw = logHw;
  if (!hw || hw.locked) return;
  ['Video', 'Link'].forEach(function (k) {
    var inp = document.getElementById(k === 'Video' ? 'logHwVideoInput' : 'logHwLinkInput');
    if (inp && inp.value.trim()) _imHwLinkAdd(k);
  });
  if (!hw.links.length && !hw.videoOnly) return;
  hw.linksDone = true;
  _imHwChanged();
}
function _imHwLinkClear() {
  ['logHwVideoInput', 'logHwLinkInput'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
}
function _imHwLinkDel(i) {
  var hw = logHw;
  if (!hw || hw.locked) return;
  hw.links.splice(i, 1);
  hw.linksDone = false;
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
  // Under the drop zone, not on the Files title (user, 2026-11-09).
  var fdock = _imQ('imHwDock');
  if (ft && fdock && ft.previousElementSibling !== fdock) { fdock.after(ft); ft.classList.add('im-mat-tools-below'); }
  // Add is the add-row icon, bigger, no box (user, 2026-10-25).
  ['logHwVideoAddBtn', 'logHwLinkAddBtn'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b && !b.classList.contains('im-link-add')) { b.classList.add('im-link-add'); b.innerHTML = ROW_ADD_ICON; b.setAttribute('aria-label', 'Add'); b.setAttribute('data-tip', 'Instant.\nAdds the link. Enter does too.'); b.setAttribute('data-tip-left', ''); }
  });
  // None under each link box (user, 2026-11-10): fills the box with None, never sent.
  [['logHwVideo', 'logHwVideoInput'], ['logHwLink', 'logHwLinkInput']].forEach(function (x) {
    var sec = document.getElementById(x[0]), inp = document.getElementById(x[1]);
    if (!sec || !inp || sec.querySelector('.im-link-none')) return;
    var d = document.createElement('div');
    d.className = 'im-pills im-words im-link-none';
    d.innerHTML = '<span class="im-word-grp"><button type="button" class="im-pill im-pill-none">None</button></span>';
    d.onmousedown = function (e) { e.preventDefault(); };
    d.onclick = function (e) {
      if (!e.target.classList.contains('im-pill') || !logHw || logHw.locked) return;
      inp.value = 'None'; logHw.linksDone = false; _imHwChanged();
    };
    // On the add icon's line, right under the box, like the notes boxes' None (user, 2026-11-12; sat a line lower)
    var add = sec.querySelector('.lh-link-add');
    add.insertBefore(d, add.querySelector('.im-link-add'));
    inp.addEventListener('input', function () { if (logHw && logHw.linksDone) logHw.linksDone = false; _imStepsRender(); });
  });
  var vs = document.getElementById('logHwVideo'), vd = _imQ('imMatVideo');
  if (vs && vd && vs.parentNode !== vd) vd.appendChild(vs);
  var ls = document.getElementById('logHwLink'), ld = _imQ('imMatLink');
  if (ls && ld && ls.parentNode !== ld) ld.appendChild(ls);
  // No show bottom left, on Log's line (user, 2026-10-30; was the Log lesson title row, top right, 2026-10-11).
  var ns = document.getElementById('btnNoShow');
  // Log at the bottom of 1. Log the lesson and HW, under HW (2026-10-18; was under the
  // log rows): one button for both. The add-row stays under the log rows.
  var acts = document.getElementById('logActions'), dock = _imQ('imLogDock');
  var sec = dock && dock.closest('.im-main-box');
  if (acts && sec) {
    var foot = sec.querySelector(':scope > .im-log-foot');
    if (!foot) { foot = document.createElement('div'); foot.className = 'im-log-foot im-log-foot-all'; sec.appendChild(foot); }
    if (acts.parentNode !== foot) foot.appendChild(acts);
  }
  // No show under the hint, above LOG LESSON, dim (user, 2026-11-02; was bottom left, on Log's line).
  var nsSlot = _imQ('imNsSlot');
  if (ns && nsSlot && ns.parentNode !== nsSlot) nsSlot.appendChild(ns);
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
  if (typeof ltStop === 'function') ltStop();
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
// ── Goals plate (user, 2026-11-05): last on the student page, Goals / Update goals top right.
// Shows what we know from their trial (inquiry Level + Interests, their tab's Goals / Interests)
// and the newest check-in's goals; empty when there is none. One getGoals read per student.
var _imGoals = {};   // key → getGoals answer
function _imGoalsBoxHtml(name) {
  var k = _imKey(name);
  if (!_imGoals[k]) {
    _imGoals[k] = { busy: true };
    fetch(getScriptUrl() + '?action=getGoals&name=' + encodeURIComponent(name))
      .then(function (r) { return r.json(); })
      .then(function (d) { _imGoals[k] = d.success ? d : { fail: true }; })
      .catch(function () { _imGoals[k] = { fail: true }; })
      .then(function () {
        var b = document.querySelector('#importBody .im-goals-box[data-gl-box="' + k + '"] .im-goals-body');
        if (b) b.innerHTML = _imGoalsBody(_imGoals[k]);
      });
  }
  return '<div class="im-sec-box im-goals-box" data-gl-box="' + _auEsc(k) + '">' +
    '<div class="db-cx-head im-sec-head"><label class="field-label db-cx-t">Goals</label>' + glBtnHtml(name) + '</div>' +
    '<div class="im-goals-body">' + _imGoalsBody(_imGoals[k]) + '</div></div>';
}
function _imGoalsBody(d) {
  if (!d || d.busy) return '<div class="gl-none">Loading…</div>';
  if (d.fail) return '<div class="gl-none">Couldn\'t load goals.</div>';
  var inq = d.inquiry || {}, pr = d.profile || {}, last = (d.checkins || [])[0] || {};
  var same = function (a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); };
  var interests = inq.interests || pr.interests;
  var f = [
    ['Level',     inq.level],
    ['Interests', interests],
    ['Styles',    inq.interests && pr.interests && !same(pr.interests, inq.interests) ? pr.interests : ''],
    ['Goals',     same(pr.goals, interests) ? '' : pr.goals],
    ['Latest',    last.goals ? last.goals + (last.date ? ' (' + _glDay(last.date) + ')' : '') : '']
  ].filter(function (x) { return x[1] && String(x[1]).trim(); });
  if (!f.length) return '';   // nothing for this student: the plate stays empty (user, 2026-11-05)
  return '<div class="inq-fields im-goals-f">' + f.map(function (x) { return '<span class="inq-flabel">' + x[0] + '</span><span class="inq-fval">' + inqEsc(x[1]) + '</span>'; }).join('') + '</div>';
}

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
      if (!l) return '<div class="im-row im-empty"><span class="im-n">' + (k + 1) + '</span><span class="im-s">—</span><span class="im-d"></span></div>';   // the dash where the lesson goes (user, 2026-11-05; was on the date side)
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
      (o.log ? _imLogBtnHtml(name, { label: '＋ Log' }) : '') +   // just "＋ Log" on the student page (user, 2026-10-31)
      (o.log && typeof _calSchedView === 'function' ? '<button class="link-btn opens-window sn-note-btn" onclick="_calSchedView(this.dataset.n,{from:\'Lessons\',note:true})" data-n="' + inqEsc(name) + '" data-tip="Opens a window.\nTheir schedule, with notes on top." data-tip-left>＋ Note</button>' : '') +   // Take a note during the lesson (tabs/schednotes.js, user 2026-11-10)
      (o.log && typeof glBtnHtml === 'function' ? glBtnHtml(name) : '') +   // Goal window, red when a 3-month check-in is due (tabs/goals.js, 2026-11-02)
      '</div>') +
    // Each box's small title sits above it, outside its border (2026-10-06).
    // Notes first (2026-10-06): what to mention, before anything else.
    // Today leaves Notes out (2026-10-09).
    (o.noNotes ? '' : _imSec('Notes', '', '', '<div class="im-notes-in">' + _imNotesBoxHtml(detail, name) + '</div>')) +
    _imSec('History', '<button class="link-btn im-sort-btn" onclick="_imToggleSort()" data-tip="Instant.\nFlips the list.">' + (_imNewestFirst() ? 'Newest' : 'Oldest') + '</button>',
      '', items.length ? html + more : 'No lessons logged yet') +
    _imSec('Last homework', '', '', '<div class="db-files db-files-in">' + _imLastHwHtml(hw, name) + '</div>') +
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
    // next on Next (_imPagesRender). #imPgDots is only where a turn scrolls to.
    '<div id="imPgDots"></div>' +
    // The right panel on every page (user, 2026-11-08): the steps on top, a line, then the
    // page's own helper (Shortcuts on Log; #imTermsCol moves in here, _imTermsWire).
    '<div id="imSideCol"><div id="imStepsCol"></div><div id="imSideNav"></div><div class="im-side-div"></div></div>' +
    // Three sections (2026-10-15): Log (the lesson and the HW), Materials
    // (what goes to them: nothing, files, video lesson links, web links), Schedule.
    // Each of the three sections sits in its own bordered box, its title above it, no dividers (2026-10-18).
    // The typing reminder on its own line under it (user, 2026-10-26), in the (optional) grey.
    '<div class="im-page" data-pg="1">' +
    _imMainHead('1. Log the lesson and HW', '', '', 'im-main-log') +   // all red (2026-10-18)
    '<div class="im-ns-slot" id="imNsSlot"></div>' +   // No show first, then the typing rules (user, 2026-11-09; was under the hint)
    // the typing rules on one line under the icon (user, 2026-11-09)
    '<div class="im-mail-opt im-case-list">One item per row - No commas - No end punctuation</div>' +   // one line again, dashes (user, 2026-11-09; were four bullets)
    '<div class="im-main-box"><div class="im-log-cols"><div class="im-log-left">' +   // the boxes left, Terms right (user, 2026-11-02)
      _imSub('Log lesson', '', ' im-log-box', '<div id="imLogDock"></div>') +
      _imSub('Log homework', '', ' im-hwtext-box', '<div id="imHwTextDock"></div>') +
      // Private (2026-10-25): saved after "TEACHER:" in the log's cell, never emailed.
      _imSub('Notes to teacher', '', ' im-teach-box',
        '<div class="ll-wrap"><div class="ll-rows" id="imTeachRows"><textarea rows="1" class="rpm-field ll-row active"></textarea></div>' +
        '<button type="button" class="link-btn tl-mic" id="imTeachMic" data-tip="Instant.\nStarts or stops dictation." data-tip-left>' + MIC_ICON + '</button></div>' +
        '<button type="button" class="ll-add" id="imTeachAdd" data-tip="Instant.&#10;Adds a row. Enter does too.">' + llAddInner() + '</button>') +
      // In the email only, under NOTES (2026-10-25): "Bring your capo next time."
      _imSub('Notes to the student', '', ' im-teach-box',
        '<div class="ll-wrap"><div class="ll-rows" id="imStuRows"><textarea rows="1" class="rpm-field ll-row active"></textarea></div>' +
        '<button type="button" class="link-btn tl-mic" id="imStuMic" data-tip="Instant.\nStarts or stops dictation." data-tip-left>' + MIC_ICON + '</button></div>' +
        '<button type="button" class="ll-add" id="imStuAdd" data-tip="Instant.&#10;Adds a row. Enter does too.&#10;Each row is a sentence in the email.">' + llAddInner() + '</button>') +
    '</div><div id="imTermsCol"></div></div>' +
    '</div>' +
    '</div><div class="im-page" data-pg="6">' +
    // One Practice materials page (user, 2026-11-08; were three pages, Recorded / Links / Files, a
    // Yes / No question each): everything open, what's put in is sent, one Done finishes it.
    _imMainHead('Practice materials', '', '', 'im-main-mat') +
    '<div class="im-main-box im-mat-split">' +
      '<div class="im-mat-box" id="imMatBox">' +
      // The Log window's HW part (#logHw) is split over these (_imHwOut).
      '<div class="im-hw-dock-box">' +
      // Gather (2026-10-25): files put in their Dropbox by hand (Finder) show under the zone.
      _imSub('Files', '<span id="imMatFilesTools"><button type="button" class="link-btn lh-gather-btn" id="logHwGatherBtn" onclick="_imGather()" data-tip="Instant.&#10;Lists what you put in their Dropbox since the lesson day,&#10;e.g. with Finder, that\'s on no HW yet.&#10;Done moves it all into this lesson\'s HW folder." data-tip-left data-tip-wrap>' + TRAY_IN_ICON + '<span>Gather</span></button></span>', ' im-mat-sec', '<div id="imHwDock"></div><div id="imGatherList"></div>') +
      '</div></div>' +
      '<div class="im-mat-box" id="imLinksBox">' +
        _imSub('Video lesson link', '', ' im-mat-sec', '<div id="imMatVideo"></div>') +
        _imSub('Web link', '', ' im-mat-sec', '<div id="imMatLink"></div>') +
      '</div>' +
      // Recorded on their side: Phone or Zoom, or neither (not recorded).
      '<div class="im-mat-qbox"><div class="im-mat-row"><span class="im-mat-q">Recorded on their side?</span>' +
        '<button type="button" class="link-btn im-rec-btn" id="imRecPhone" onclick="_imRecPick(\'phone\')" data-tip="Instant.&#10;They filmed the lesson on their phone.&#10;The email says so. Again: not recorded." data-tip-left>Phone</button>' +
        '<button type="button" class="link-btn im-rec-btn" id="imRecZoom" onclick="_imRecPick(\'zoom\')" data-tip="Instant.&#10;They recorded the lesson on Zoom, their side.&#10;The email says so. Again: not recorded." data-tip-left>Zoom</button>' +
      '</div>' +
      // None as a word under the question, like under the link boxes (user, 2026-11-10); lit once picked
      '<div class="im-pills im-words im-rec-none"><span class="im-word-grp"><button type="button" class="im-pill" id="imRecNo" onmousedown="event.preventDefault()" onclick="_imRecPick(\'no\')">None</button></span></div>' +
      '</div>' +
      '<div class="im-log-foot im-log-foot-all"><button type="button" class="link-btn amber" id="imMatDoneBtn" onclick="_imMatDone()">Done</button></div>' +
    '</div>' +
    '</div><div class="im-page" data-pg="3">' +
    // Schedule (2026-10-25, like Practice materials): Needed / Not needed first.
    // Not needed is the answer; Needed opens Reschedule, and the section is done
    // only once a skip or move is saved.
    _imMainHead('3. Change appointment') +   // all red, no grey subtitle (2026-10-18); was Schedule adjustments (user, 2026-10-27: it skips or moves)
    '<div class="im-main-box">' +
    '<div class="db-panel im-list im-sched-box">' +
      // No question (user, 2026-11-09): like Practice materials, change it if needed, then Done.
      // The question under the icon (user, 2026-11-09)
      '<div class="im-mail-opt im-sched-q">Does the next appt need adjustment?</div>' +
      // (user, 2026-11-09) No change on top (grey), then "or" Change appointment (red), centred
      '<div id="imSchedRs" class="im-sched-rs">' +
        '<div class="sn-row"><button class="link-btn im-rs-btn sn-nochange" onclick="_imSchedDone(' + n + ')" data-tip="Instant.\nNothing to change: ticks Schedule\nand goes to the next page.">No change</button></div>' +
        '<div class="sn-row"><span class="sn-or">or</span></div>' +   // "or" on its own line (user, 2026-11-09)
        // Take a note left here (user, 2026-11-09): notes get taken during the lesson, on the lesson page
        '<div class="sn-row">' +
        '<button class="link-btn red im-rs-btn opens-window" onclick="_imReschedule(' + n + ')" data-tip="Opens a window.\nTheir next 8 weeks: skip or move a lesson.">Change appointment</button></div></div>' +
    '</div>' +
    '<div class="im-log-foot im-log-foot-all"><button type="button" class="link-btn amber" id="imSchedDoneBtn" onclick="_imSchedDone(' + n + ')">Done</button></div>' +
    '</div>' +
    '</div><div class="im-page" data-pg="4">' +
    // "Logging" spinner while the three go to Google; stays bright in the dimmed window (2026-10-21).
    // The email (user, 2026-10-30, Initiate's Compose look): written from the log,
    // each part editable here (the sheet keeps the log as it is); Preview if
    // wanted, Send; Start over writes it from the log again.
    _imMainHead('<span id="imMailNum">4.</span> Lesson recap email') +
    '<div class="im-main-box im-mail-box" id="imMailBox">' +
      '<div class="im-mail-to"><div class="td-mini-row"><span class="td-mini-t">To:</span><span class="td-wk-name" id="imMailToShow">…</span></div>' +
        '<div class="td-mini-row"><span class="td-mini-t">Sbj:</span><span class="td-wk-name" id="imMailSbj"></span></div></div>' +
      // The email's own setup and wording, dark (user, 2026-11-02): the greeting, materials and
      // sign-off come from previewLessonMessage; the three parts are typed in right where they go.
      '<div class="im-mail-dark" id="imMailDark">' +
        '<div id="imMailTop"><p>Hi …</p></div><hr>' +
        '<p class="im-ml-h"><label for="imMailLesson">LESSON NOTES</label></p><textarea id="imMailLesson" rows="2" class="im-ml-box"></textarea>' +
        '<p class="im-ml-h"><label for="imMailHw">THINGS TO PRACTICE</label></p><textarea id="imMailHw" rows="2" class="im-ml-box"></textarea>' +
        '<div id="imMailMat"></div>' +
        '<p class="im-ml-h"><label for="imMailNotes">NOTES</label> <span class="im-mail-opt">(optional, left out when empty)</span></p><textarea id="imMailNotes" rows="1" class="im-ml-box"></textarea>' +
        '<div id="imMailEnd"></div>' +
      '</div>' +
      '<div class="im-log-foot im-log-foot-all im-mail-foot"><span class="ll-state" id="imMailStatus"></span>' +
        '<button type="button" class="link-btn" id="imMailRedo" data-tip="Instant.&#10;Throws away your edits:&#10;the email is written from the log again." data-tip-left>Start over</button>' +
        '<button type="button" class="link-btn" id="imMailPrev" data-tip="Instant.\nShows the email here, as it will go.&#10;Press again to hide it." data-tip-left>' + DETAILS_ICON + '<span>Preview</span></button>' +
        '<button type="button" class="link-btn amber" id="imMailSend" disabled>Send</button></div>' +
      '<iframe class="im-msg-frame" id="imMailFrame" title="The email" hidden></iframe>' +
    '</div>' +
    '</div>' +
    '<div class="im-log-foot im-log-foot-all im-pg-nav" style="margin-top:22px"><span class="ll-state im-pg-state" id="imPgState"></span>' +
      // ← → (user, 2026-11-08; were Back / Next): pages turn by themselves, → only goes forward again after ←.
      // Every page can be changed on the way back: Edit on Log, × on files (user, 2026-11-08).
      '<button type="button" class="link-btn im-pg-arrow" id="imPgBack" onclick="_imPageGo(-1)" aria-label="Page before" data-tip="Instant.&#10;The page before." data-tip-left>' + PAGE_ARROW_ICON.replace('class="pg-arrow-icon"', 'class="pg-arrow-icon back"') + '</button>' +
      '<button type="button" class="link-btn im-pg-arrow" id="imPgNext" onclick="_imPageGo(1)" aria-label="Page after" data-tip="Instant.&#10;Forward again, to a page already done.&#10;New pages turn by themselves." data-tip-left>' + PAGE_ARROW_ICON + '</button></div>' +
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
  return _imSec('Data', btn, '', inner);   // opens shown; Hide folds it (user, 2026-10-31)
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
    // The HW sentence first with the date on its line; no lesson number; the file count under it
    // (user, 2026-10-31; was "3 · 22 files · Oct 30" above the sentence).
    var cnt = n ? n + (n === 1 ? ' file' : ' files') : '';
    out = '<div class="im-row im-hw-row">' +
        (r.text ? '<span class="im-hw-text">' + inqEsc(r.text) + '</span>' : '<span class="im-s">' + cnt + '</span>') +
        '<span class="im-d">' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + '</span></div>' +
      // A "Material sent" header over the folders in place of the file count (user, 2026-10-31).
      (r.text && n ? '<div class="im-hw-count im-hw-mat">Material sent</div>' : '') +
      (r.links || []).map(function (l) {
        return '<div class="im-hw-link"><span>' + (l.kind === 'Video' ? 'Video lesson' : 'Link') + '</span>' +
          '<a href="' + inqEsc(l.url) + '" target="_blank" rel="noopener">' + inqEsc(l.url) + '</a></div>';
      }).join('') +
      (hide || !n ? '' : '<div class="im-hw-files">' + _dbDetailsFilesHtml({ foldersOnly: true, items: r.files.map(function (x) { return { name: x.split('/').pop(), path: x }; }) }) + '</div>');
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
    '<button class="link-btn im-more" onclick="_imToggleDbx(' + n2 + ')" data-tip="Instant.\nReads their Dropbox folder.">' + (x.open ? 'Show less' : 'Show more') + '</button></div>';
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
        "<button class='link-btn bright' id='imRsConfirmBtn' onclick='_stPickConfirm(this)' data-tip='Instant.\nMoves only this lesson in Google Calendar\nand logs it to Reschedule Logs.' data-tip-left>Confirm move</button></div></div>");
  _stWireWho(w, 'imRsWho', function(v) { _stPickWho = v; });
  _stWireReasons(w, 'imRsReasons', 'imRsNote');
  _stPickWho = 'Student';
  _rpmTpStyle();
  // Undo on the icon's line, top right (user, 2026-10-29): one step back at a time.
  var ic = w.querySelector('.win-icon');
  if (ic) { ic.parentNode.classList.add('im-rs-iconrow'); ic.parentNode.insertAdjacentHTML('beforeend', "<button class='link-btn im-rs-undo' id='imRsUndo' disabled onclick='_stPickUndo()' data-tip='Instant.\nTakes back the last step on the weeks.' data-tip-left>Undo</button>"); }
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
        '<button class="link-btn" onclick="_imClearWrong(this, ' + _auEsc(JSON.stringify(name)) + ')" data-tip="Instant.\nClears the warning.\nPress once you\'ve reminded them.">Reminded ✓</button></div>' });
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
      var d = _imDetail;   // the Today card's own read is gone with the card (user, 2026-11-10)
      if (d) d.wrongNumberFlag = null;
      _imRedraw();
    })
    .catch(function () { btn.disabled = false; btn.textContent = 'Reminded ✓'; });
}
