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
  if (_imOpen) { _imOpenStudent(_imOpen); return; }
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
  var missing = function (n) {
    if (logged.indexOf(_imKey(n)) < 0) return null;   // not logged yet: no verdict
    var m = [];
    if (_imHwToday.rows && !_imHwToday.rows[_imKey(n)]) m.push('HW');
    if (!_imSchedGet(n)) m.push('Schedule');
    return m;
  };
  var names = _imRoster.slice().sort(function (a, b) {
    var ta = today.indexOf(_imKey(a)), tb = today.indexOf(_imKey(b));
    if (ta >= 0 || tb >= 0) return ta < 0 ? 1 : tb < 0 ? -1 : ta - tb;
    return a.localeCompare(b);
  });
  body.innerHTML =
    '<div class="db-section">' +
      '<div class="settings-title"><span>Import<span class="win-sub"> · Students</span></span></div>' +
      // The student page's box-title style (2026-10-06): one heading look on this tab.
      '<div class="db-cx-head im-sec-head im-cards-head"><label class="field-label db-cx-t">' + names.length + ' students</label></div>' +
      names.map(function (n) {
        var miss = missing(n);
        return '<div class="db-card im-card' + (isToday(n) ? ' im-today' : '') + (miss && !miss.length ? ' im-fin' : '') + '" onclick="_imOpenStudent(' + _auEsc(JSON.stringify(n)) + ')" data-tip="Instant.\nEvery lesson logged for ' + _auEsc(n) + '.">' +
          '<div class="db-card-l"><span class="db-card-n">' + inqEsc(n) + '</span></div>' +
          (miss && miss.length ? '<span class="im-miss">' + MISS_ICON + miss.join(' + ') + ' missing</span>' : '') +
        '</div>';
      }).join('') +
    '</div>';
}

// Today's HW Tracking rows (getHwLog by date): who has an HW answer for today.
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
      (d.rows || []).forEach(function (x) { rows[_imKey(x.student)] = x.hw; });
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
  _imLift(body);   // the docked Log box survives the redraw (what's typed stays)
  body.innerHTML = _imStudentHtml(name, lessons, _imHw, _imDetail, { back: true, card: true, log: true });
  _imFixTips(body);
  _imDock();
}

// ── Log lesson box (2026-10-06): the Log window (#logPanel, lessons.js), docked
// at the bottom of the student's card instead of floating. Same trick as
// _floatLogPanel (ctrl.js): _logPanelHome remembers where it lives, so
// openLogFresh doesn't float it and closeLogPanel puts it back. Undocked on
// Back, another student, or leaving the tab.
function _imDock() {
  var dock = document.getElementById('imLogDock'), panel = document.getElementById('logPanel');
  if (!dock || !panel || !_imOpen) return;
  // Only while Import is the open tab: a late redraw (Notes / HW loading in)
  // after you've left must not pull the Log window into a hidden page.
  var tab = document.getElementById('tab-import');
  if (!tab || !tab.classList.contains('active')) return;
  if (window._imDocked) { dock.appendChild(panel); _imHwOut(); _imStepsRender(); return; }   // a redraw: same lesson, carry on
  if (window._logPanelHome) return;   // open as a window somewhere else: leave it
  window._logPanelHome = { parent: panel.parentNode, next: panel.nextSibling, css: panel.style.cssText };
  window._imDocked = true;
  panel.style.cssText = '';
  dock.appendChild(panel);
  _imHwOut();
  _imLog(_imOpen);
  // Already logged today (the sheet says so): show it, locked, like right after Log.
  var done = _imLoggedToday(_imLast && _imLast.lessons);
  if (done !== null && activeStudent) {
    activeStudent.logged = true;
    var row = llRows(_logBox())[0];
    if (row) row.value = done;
    llLock(_logBox());
    var mic = document.getElementById('logMicBtn');
    if (mic) mic.disabled = true;
  }
  _imStepsRender();
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
//   Schedule    ticks from the Reschedule window: No change, or a skip / move
//   HW          files in the drop zone → sent; Nothing to send → no HW
//   Lesson log  ticks when the Log box's Log saves (the sheet says so on reopen)
// HW picked before Log goes with the log; picked after, it saves on its own (saveHw).
// Schedule is kept in this browser for the day (nothing in the sheets says "no change" yet).
function _imSchedKey(name) { return 'imSched|' + _imKey(name) + '|' + new Date().toDateString(); }
function _imSchedGet(name) { try { return localStorage.getItem(_imSchedKey(name)) || ''; } catch (e) { return ''; } }
function _imSchedSet(name, v) {
  try { if (v) localStorage.setItem(_imSchedKey(name), v); else localStorage.removeItem(_imSchedKey(name)); } catch (e) {}
  var b = document.getElementById('imNoChangeBtn');
  if (b) b.classList.toggle('pressed', v === 'nochange');
  _imStepsRender();
}
function _imNoChangeToggle(name) { _imSchedSet(name, _imSchedGet(name) === 'nochange' ? '' : 'nochange'); }

function _imStepsRender() {
  var el = document.getElementById('imSteps');
  if (!el || !_imOpen || !window._imDocked) return;
  var name = _imOpen, hw = logHw, st = activeStudent;
  var logged = !!(st && st.logged), sched = _imSchedGet(name);
  // A status list (2026-10-06), not buttons: each line ticks itself when its
  // job is done elsewhere (Reschedule, the HW drop zone / Nothing to send, Log).
  var steps = [
    { label: 'Schedule', done: !!sched,
      note: sched === 'changed' ? 'changed' : sched === 'nochange' ? 'not needed' : '' },   // the button's word (2026-10-06)
    { label: 'HW', done: !!(hw && hw.choice),
      note: '' },   // just the tick (2026-10-07; was "nothing to send")
    { label: 'Lesson log', done: logged, note: '' }
  ];
  if (!hw) steps.splice(1, 1);   // no HW question for this lesson (before HW tracking)
  el.innerHTML = '<div class="im-checks">' + steps.map(function (x) {
    return '<div class="im-check' + (x.done ? ' done' : '') + '"><i class="im-tick"></i><span>' + inqEsc(x.label) + '</span>' +
      (x.note ? '<span class="im-check-note">' + inqEsc(x.note) + '</span>' : '') + '</div>';
  }).join('') + '</div>';
  var fin = document.getElementById('imFinDone');
  // Finished: logged, Schedule answered, HW answered and saved.
  var finished = logged && sched && (!hw || (hw.choice && hw.saved));
  if (fin) fin.textContent = finished ? 'Finished ✓' : '';
  // Finished by something pressed here (not just reopened): Done, then back (2026-10-07).
  if (finished && window._imActed === name) { window._imActed = null; _imDone(name); }
}

// Anything pressed or dropped in the doing card arms Done for that student,
// so reopening an already finished one doesn't bounce you out (2026-10-07).
['click', 'drop'].forEach(function (ev) {
  document.addEventListener(ev, function (e) {
    if (_imOpen && e.target.closest && e.target.closest('#importBody .im-do-card')) window._imActed = _imOpen;
  }, true);
});
// All done: the card dims, Done ✓, and back to the student list, where their card is green.
function _imDone(name) {
  var card = document.querySelector('#importBody .im-do-card');
  if (!card) return;
  card.classList.add('im-done');
  var msg = document.createElement('div');
  msg.className = 'im-done-msg';
  msg.textContent = 'Done ✓';
  card.appendChild(msg);
  setTimeout(function () { if (_imOpen === name) _imClose(); }, 1400);
}

// Nothing to send (2026-10-06): the HW heading's button. Press again to undo
// (files in the drop zone then count as sent again).
function _imNothingToSend() {
  var hw = logHw;
  if (!hw || hw.loading || hw.uploading || hw.saving) return;
  _imSetHw(hw.choice === 'none' ? (hw.files.length ? 'sent' : null) : 'none');
}
// Before the log the answer waits and goes with it; once logged it saves now.
function _imSetHw(c) {
  var hw = logHw;
  if (!hw) return;
  var logged = !!(activeStudent && activeStudent.logged);
  if (!logged || !c) {
    hw.choice = c;
    _logHwRender(); updateLogButton(); _imStepsRender(); return;
  }
  var prev = hw.choice, prevSaved = hw.saved;
  hw.choice = c; hw.saving = true; _logHwRender(); _imStepsRender();
  var q = getScriptUrl() + '?action=saveHw&name=' + encodeURIComponent(hw.name) + '&lessonDate=' + hw.date +
    '&hw=' + c + '&source=' + (c === 'sent' ? 'Auto' : 'Manual') +
    '&files=' + encodeURIComponent(c === 'sent' ? hw.files.map(function (f) { return f.path; }).join('\n') : '');
  fetch(q).then(function (r) { return r.json(); }).then(function (d) {
    hw.saving = false;
    if (!d.success) throw new Error(d.message || 'Not saved');
    hw.saved = true;
    _logHwRender(); _imStepsRender();
    if (typeof _logHwSaved === 'function') _logHwSaved(hw.name, hw);   // HW sent - last + Audit
  }).catch(function (e) {
    hw.saving = false; hw.choice = prev; hw.saved = prevSaved;
    _logHwRender(); _imStepsRender();
    rpmFail('logPanelStatus', e && e.message && e.message !== 'Failed to fetch' ? e.message : 'No answer from Google.');
  });
}
// After a Dropbox check (lessons.js logHwCheck): files found after the lesson
// was logged are this lesson's HW, so they save straight away.
function _imHwChecked() {
  var hw = logHw;
  if (!window._imDocked || !hw || hw.saving || !(activeStudent && activeStudent.logged)) return;
  if (hw.choice === 'sent' && !hw.saved) _imSetHw('sent');
}
// Before a redraw: park the docked Log box in its hidden home so innerHTML
// doesn't throw it away; _imDock puts it back.
// The Log window's HW part (#logHw) sits in its own box on the card; these
// move it out of the window and back in (before Log's row) when undocking.
// Also its HW buttons row (#logHwHead) and Log's row (#logActions) go up to
// the box titles.
function _imHwOut() {
  var hw = document.getElementById('logHw'), d = document.getElementById('imHwDock');
  if (hw && d && hw.parentNode !== d) d.appendChild(hw);
  var head = document.getElementById('logHwHead'), t = document.getElementById('imHwTools');
  if (head && t && head.parentNode !== t) t.appendChild(head);
  var acts = document.getElementById('logActions'), a = document.getElementById('imLogActs');
  if (acts && a && acts.parentNode !== a) a.appendChild(acts);
}
function _imHwBack() {
  var hw = document.getElementById('logHw'), panel = document.getElementById('logPanel'), acts = document.getElementById('logActions');
  var head = document.getElementById('logHwHead');
  if (!hw || !panel || !acts) return;
  if (acts.parentNode !== panel) panel.appendChild(acts);   // last in the window
  if (hw.parentNode !== panel) panel.insertBefore(hw, acts);
  if (head && head.parentNode !== hw) hw.insertBefore(head, hw.firstChild);
}
function _imLift(body) {
  _imHwBack();
  var panel = document.getElementById('logPanel');
  if (panel && body && body.contains(panel)) (window._logPanelHome ? window._logPanelHome.parent : document.body).appendChild(panel);
}
function _imUndock() { if (window._imDocked) closeLogPanel(); }
// closeLogPanel (lessons.js) calls this. After a log (it closes itself a
// second later) a fresh box comes back if the student is still open here.
function _imLogClosed() {
  _imHwBack();
  if (!window._imDocked) return;
  window._imDocked = false;
  // Checked after this turn: a tab switch closes the box first and only then
  // hides Import, so it must not come back in a tab that's going away.
  setTimeout(function () {
    var p = document.getElementById('tab-import');
    if (_imIn === 'import' && _imOpen && p && p.classList.contains('active')) _imDock();
  }, 0);
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
    '<div class="settings-title im-title"><span>' + inqEsc(name) + (o.sub ? '<span class="win-sub"> · ' + inqEsc(o.sub) + '</span>' : '') + '</span></div>' +
    // Each box's small title sits above it, outside its border (2026-10-06).
    // Notes first (2026-10-06): what to mention, before anything else.
    _imSec('Notes', '', '', '<div class="im-notes-in">' + _imNotesBoxHtml(detail, name) + '</div>') +
    _imSec('Lessons log', '<button class="link-btn im-sort-btn" onclick="_imToggleSort()" data-tip="Flips the list.">' + (_imNewestFirst() ? 'Newest' : 'Oldest') + '</button>',
      '', items.length ? html + more : 'No lessons logged yet') +
    _imSec('HW sent - last', '', '', '<div class="db-files db-files-in">' + _imLastHwHtml(hw, name) + '</div>') +
    // Log lesson, always open, its HW the Dropbox drop area; Checklist, the
    // Trial card's to-do look: done when Schedule, HW and Lesson log are ticked.
    // Second card (2026-10-06): the first is for looking, this one does the
    // lesson — Log lesson, Reschedule, Checklist.
    // Each box holds only its content, so the room above and below matches;
    // the buttons sit on the title rows (Log; Nothing to send / Browse folder).
    // The Checklist box at the top of the doing card, its three steps on one line (2026-10-07).
    (o.log ? (o.card ? '</div><div class="td-student im-do-card">' : '') +
             _imSec('Checklist', '<span class="im-fin" id="imFinDone"></span>', ' im-steps-row', '<div id="imSteps"></div>') +
             _imSec('Log lesson', '<span id="imLogActs"></span>', ' im-log-box', '<div id="imLogDock"></div>') +
             // HW in its own box (2026-10-06): the Log window's HW part, moved here.
             _imSec('HW', '<span id="imHwTools"></span>', ' im-hw-dock-box', '<div id="imHwDock"></div>') +
             // Schedule box: Reschedule and Not needed side by side (2026-10-06): like
             // HW's Nothing to send, a click ticks Schedule, again undoes it.
             _imSec('Schedule', '', ' im-sched-box',
               '<button class="link-btn red im-rs-btn opens-window" onclick="_imReschedule(' + _auEsc(JSON.stringify(name)) + ')" data-tip="Opens a window.\nTheir next 8 weeks: skip or move a lesson.">Reschedule</button>' +
               '<button class="link-btn im-rs-btn im-nochange' + (_imSchedGet(name) === 'nochange' ? ' pressed' : '') + '" id="imNoChangeBtn" onclick="_imNoChangeToggle(' + _auEsc(JSON.stringify(name)) + ')" data-tip="Nothing to move or skip.\nPress again to undo.">Not needed</button>') : '') +
    (o.card ? '</div>' : '');
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

// Last HW sent (2026-10-06): the newest lesson whose HW was Sent, as one
// lesson-style line (lesson #, how many files, date), its files under it.
// No HW lessons don't count; never sent → None. Hide folds the files away.
var _imHwHide = {};   // key → files folded
function _imLastHwHtml(hw, name) {
  if (!hw) return '<span style="color:var(--muted)">Loading</span>';
  var r = hw.rows.filter(function (x) { return x.hw === 'Sent'; })[0];
  var k = _imKey(name), out;
  if (!r) out = '<div class="im-none">None</div>';
  else {
    var hide = !!_imHwHide[k], n = (r.files || []).length;
    var p = String(r.date).split('-');
    out = '<div class="im-row im-hw-row">' +
        '<span class="im-n">' + (r.lesson || '') + '</span>' +
        '<span class="im-s">' + n + (n === 1 ? ' file' : ' files') + '</span>' +
        '<span class="im-d">' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + '</span></div>' +
      (hide ? '' : '<div class="im-hw-files">' + _dbDetailsFilesHtml({ items: r.files.map(function (x) { return { name: x.split('/').pop(), path: x }; }) }) + '</div>');
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
    (r ? '<button class="link-btn im-more" onclick="_imToggleHw(' + n2 + ')">' + (_imHwHide[k] ? 'Show files' : 'Hide') + '</button>' : '') +
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

// Today's calendar lesson if there is one (so Home's Today grid ticks when it
// saves), else a lesson dated today.
function _imLog(name) {
  window._imLogActive = name;
  window._auditFixActive = false;
  var today = (typeof todayStudents !== 'undefined' && todayStudents) || [];
  for (var i = 0; i < today.length; i++) {
    if (_imKey(today[i].name) === _imKey(name)) { openLogFresh(today[i], i); return; }
  }
  // yyyy/MM/dd: slashes parse in local time on the backend (see _stLogLessonFor).
  var d = new Date(), m = d.getMonth() + 1, dd = d.getDate();
  openLogFresh({ name: name, eventDate: d.getFullYear() + '/' + (m < 10 ? '0' + m : m) + '/' + (dd < 10 ? '0' + dd : dd), calType: 'regular' }, undefined);
}

// Reschedule opens on this page (2026-10-06, was a jump to Home): a window
// with their next 8 weeks, Home's strips. A red day → Skip / Reschedule
// (student.js windows); when one saves, the strips refresh in place.
function _imReschedule(name) {
  var w = _stWin('imRsWin', inqEsc(name), 'Reschedule', CALENDAR_ICON,
    // The hint under the weeks (2026-10-06).
    "<label class='field-label'>Next 8 weeks</label><div id='imRsBody'><div class='empty-state rpm-loading'>Loading</div></div>" +
    "<div class='im-rs-hint'>Click to reschedule or skip.</div>" +
    // No change ticks Finish logging's Schedule step (2026-10-06).
    "<div class='ll-acts st-foot' style='justify-content:flex-end'><button class='link-btn' onclick='_imNoChange(" + _auEsc(JSON.stringify(name)) + ")' data-tip='Nothing to move or skip.\nTicks Schedule.' data-tip-left>No change</button></div>");
  w.querySelector('.st-win').classList.add('im-rs-win');
  _imRsLoad(name);
}

function _imNoChange(name) {
  _imSchedSet(name, 'nochange');
  var w = document.getElementById('imRsWin');
  if (w) w.remove();
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
    out.push({ kind: 'pay', html:
      '<div class="im-note-h">Payment</div><div class="im-note-t">' + inqEsc(d.paymentStatus) + '</div>' });
  }
  return out;
}

function _imNotesBoxHtml(d, name) {
  if (!d) return '<div class="im-note-d">Loading</div>';
  var notes = _imNotes(d, name);
  return notes.length ? notes.map(function (x) { return '<div class="im-note">' + x.html + '</div>'; }).join('')
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
