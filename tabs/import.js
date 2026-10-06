// ─── TABS / IMPORT.JS ───────────────────────────────────────────────────────
// Import (2026-10-04): every lesson a student has logged in Students Import,
// lessons only (no payments, no HW). Student cards first (today's on top,
// then A–Z, the Dropbox cards' look); a card opens the full list, newest
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
  if (_imOpen) { _imOpenStudent(_imOpen); return; }
  if (_imRoster) { _imRenderCards(); return; }
  var body = document.getElementById('importBody');
  body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(getScriptUrl() + '?action=getStudentRoster')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', d.message || 'unknown', 'center'); return; }
      _imRoster = d.students || [];
      _imRenderCards();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', 'No answer from Google.', 'center'); });
}

function _imKey(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }

function _imRenderCards() {
  var body = document.getElementById('importBody');
  var today = (typeof todayStudents !== 'undefined' && todayStudents) || [];
  var isToday = {};
  today.forEach(function (t) { isToday[_imKey(t.name)] = 1; });
  var names = _imRoster.slice().sort(function (a, b) {
    var ta = isToday[_imKey(a)] ? 0 : 1, tb = isToday[_imKey(b)] ? 0 : 1;
    return ta - tb || a.localeCompare(b);
  });
  body.innerHTML =
    '<div class="db-section">' +
      '<div class="settings-title"><span>Import<span class="win-sub"> · Students</span></span></div>' +
      '<div class="db-cards-head"><label class="field-label">' + names.length + ' students</label></div>' +
      names.map(function (n) {
        return '<div class="db-card im-card' + (isToday[_imKey(n)] ? ' im-today' : '') + '" onclick="_imOpenStudent(' + _auEsc(JSON.stringify(n)) + ')" data-tip="Instant.\nEvery lesson logged for ' + _auEsc(n) + '.">' +
          '<div class="db-card-l"><span class="db-card-n">' + inqEsc(n) + '</span>' +
            (isToday[_imKey(n)] ? '<span class="db-card-s">Today</span>' : '') + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
}

function _imOpenStudent(name) {
  if (_imIn === 'today') { _tdRefresh(name); return; }   // after a log on the Today tab
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

function _imClose() { _imOpen = null; _imLast = null; _imRoster ? _imRenderCards() : initImportTab(); }

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
  body.innerHTML = _imStudentHtml(name, lessons, _imHw, _imDetail, { back: true, buttons: true, card: true });
  _imFixTips(body);
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
      return '<div class="im-row">' +
        '<span class="im-n">' + (k + 1) + '</span>' +
        '<span class="im-s">' + (l.subject ? inqEsc(l.subject) : '<span style="color:var(--muted)">—</span>') + '</span>' +
        '<span class="im-d">' + inqEsc(l.date) + '</span>' +
      '</div>';
    }).join('');
    return head + '<div class="im-block">' + rows + '</div>';
  }).join('');

  // Back on the left, Log lesson + Reschedule on the right, one row (2026-10-06).
  return (o.back || o.buttons ? '<div class="im-top">' + (o.back ? _imBackBtn() : '<span></span>') + (o.buttons ? _imButtons(name) : '') + '</div>' : '') +
    // One card (2026-10-06, the Today tab's look): the name in amber (Today
    // adds " · Quick look" in grey via o.sub), then the three boxes.
    (o.card ? '<div class="td-student">' : '') +
    '<div class="settings-title im-title"><span>' + inqEsc(name) + (o.sub ? '<span class="win-sub"> · ' + inqEsc(o.sub) + '</span>' : '') + '</span></div>' +
    '<div class="db-panel im-list">' +
      // Box heading in Dropbox's Info / Files type, sort toggle on its right (2026-10-06).
      '<div class="db-cx-head im-list-head"><label class="field-label db-cx-t">Lessons log</label>' +
        '<button class="link-btn im-sort-btn" onclick="_imToggleSort()" data-tip="Flips the list.">' + (_imNewestFirst() ? 'Newest' : 'Oldest') + '</button></div>' +
      (items.length ?
html + more
      : 'No lessons logged yet') + '</div>' +
    // Last HW in its own box, heading inside like Lessons log (2026-10-06).
    '<div class="db-panel im-list im-hw-box">' +
      '<div class="db-cx-head im-list-head"><label class="field-label db-cx-t">Last HW</label></div>' +
      '<div class="db-files db-files-in">' + _imLastHwHtml(hw) + '</div>' +
    '</div>' +
    // Notes in their own box too (2026-10-06), the Notes window's lines.
    '<div class="db-panel im-list im-hw-box">' +
      '<div class="db-cx-head im-list-head"><label class="field-label db-cx-t">Notes</label></div>' +
      '<div class="im-notes-in">' + _imNotesBoxHtml(detail, name) + '</div>' +
    '</div>' +
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

function _imLastHwHtml(hw) {
  if (!hw) return '<span style="color:var(--muted)">Loading</span>';
  var r = hw.rows[0];
  if (!r) return '<div class="im-none">None</div>';   // the lesson rows' font (2026-10-06)
  var p = String(r.date).split('-');
  // One line like a Lessons log row (2026-10-06): lesson #, Sent / No HW, the
  // date at the end; a Sent lesson's files under it.
  var line = '<div class="im-row im-hw-row">' +
    '<span class="im-n">' + (r.lesson || '') + '</span>' +
    '<span class="im-s">' + (r.hw === 'Sent' ? 'HW sent' : 'No HW sent') + '</span>' +
    '<span class="im-d">' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + '</span></div>';
  return line + (r.hw === 'Sent'
    ? '<div class="im-hw-files">' + _dbDetailsFilesHtml({ items: r.files.map(function (x) { return { name: x.split('/').pop(), path: x }; }) }) + '</div>'
    : '');
}

// ── Buttons (2026-10-05): above the student's card ──
//   Log lesson  the Log window (lesson + HW) for today; the list redraws after
//   Reschedule  a window with this student's next 8 weeks (2026-10-06)
// (Dropbox button removed 2026-10-06: not needed here.)
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

function _imButtons(name) {
  var n = _auEsc(JSON.stringify(name));
  return '<span class="im-btns">' +
    '<button class="link-btn amber opens-window" onclick="_imLog(' + n + ')" data-tip="Opens a window.\nLog today\'s lesson, with its HW." data-tip-left>Log lesson</button>' +
    '<button class="link-btn amber opens-window" onclick="_imReschedule(' + n + ')" data-tip="Opens a window.\nTheir next 8 weeks: skip or move a lesson." data-tip-left>Reschedule</button>' +
  '</span>';
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
    "<label class='field-label'>Next 8 weeks</label><div id='imRsBody'><div class='empty-state rpm-loading'>Loading</div></div>" +
    "<div class='im-rs-hint'>Click a lesson day to reschedule or skip it.</div>");
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
      var opts = { onDone: function () { _imRsLoad(name); } };
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
