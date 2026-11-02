// ─── TABS / TODAY.JS ────────────────────────────────────────────────────────
// Today (2026-10-06): a glance at the day. Today's students in lesson order,
// one under the other: name · Quick look, then their Lessons log and Last HW
// (import.js's _imStudentHtml, no buttons; no Notes since 2026-10-09).
// Everyone loads as soon as the tab opens. Resets by day: a new day starts empty and reads the
// calendar again. One card at a time (2026-10-09): the names in the list at
// the top are buttons; one opens that student's card, another swaps to theirs.
// The reads already ran, so it opens at once.

var _td = { day: null, data: {}, sel: null };   // data: key → { lessons, hw, detail, failed }; sel: the open card's key

function _tdYmd() {
  var d = new Date(), m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
}

function initTodayTab() {
  _imIn = 'today';
  var day = _tdYmd();
  if (_td.day !== day) _td = { day: day, data: {}, sel: null };
  var body = document.getElementById('todayBody');
  // The calendar read (fetchWeekStudents) is from an earlier day: read it again.
  if (window._weekFetchedDay && window._weekFetchedDay !== day) {
    body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
    var url = getScriptUrl(); if (url) fetchWeekStudents(url);
    return;
  }
  if (!window._weekFetchedDay) { body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>'; return; }
  _tdRender();
  _tdHolCheck();   // the holiday reminder window, once a day
}

// fetchWeekStudents (core/api.js) calls this once today's students are in.
function _tdWeekReady() {
  var p = document.getElementById('tab-today');
  if (p && p.classList.contains('active')) initTodayTab();
  // Import's card list puts today's students first: redraw it once the week is read.
  var ip = document.getElementById('tab-import');
  if (ip && ip.classList.contains('active') && !_imOpen && _imRoster) _imRenderCards();
}

// One colour for every Today card (2026-10-09, was one per student): red on
// the card's edge, the name, and its badge in the list at the top.
var TD_COLOR = '#e8463a';
function _tdColor() { return TD_COLOR; }

function _tdTime(iso) {
  var m = String(iso || '').match(/T(\d{2}):(\d{2})/);
  if (!m) return '';
  var h = parseInt(m[1], 10);
  return ((h % 12) || 12) + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM');
}

function _tdRender() {
  var body = document.getElementById('todayBody');
  if (!body) return;
  var list = todayStudents || [];
  var now = new Date();
  // Today's top part in a box like This Week's under it (user, 2026-10-24): title, calendar, count, list.
  var head = '<div class="td-wk-box td-today-box"><div class="settings-title td-wk-title"><span>Today</span>' +   // no " · Tue, Oct 27": the date page under it says it (user, 2026-10-27)
    '<span class="td-top-btns"><button class="link-btn opens-window" onclick="_tdAllOpen()" data-tip="Opens a window.\nToday\'s students: last lesson,\nlast HW and its folders.">All</button>' +   // All, left of No show (user, 2026-11-01)
    '<button class="link-btn opens-window" onclick="_tdNsOpen()" data-tip="Instant.\nThe No show text, to copy\nand send from Messages.">No show</button></span></div>' +   // no Week button: This Week is under it (user, 2026-10-24); No show (portal button) top right opens the No show text window (user, 2026-10-26)
    '<img class="td-hero" src="img/amp-head.svg" alt="">' +   // orange amp head (user, 2026-11-01; was the guitarist figure)
    '<div class="td-day-cal"><div class="td-hol-mo">' + MONTHS[now.getMonth()] + '</div><div class="td-hol-dd">' + now.getDate() + '</div></div>';   // today's date page, the holiday warning's (user, 2026-10-27; was the plain calendar icon)
  // A day off (2026-10-08): the resting figure over the line (om-82).
  if (!list.length) { body.innerHTML = head + '<div class="empty-state td-rest">' + REST_ICON + '<div>No lessons today!</div></div></div>' + _tdWeekSection(); return; }
  list.forEach(function (s) { if (!_td.data[_imKey(s.name)]) _tdLoad(s.name); });
  // At the top (2026-10-06): how many, and a mini list of times + names; a
  // name jumps to its card.
  var mini = '<div class="db-cx-head im-sec-head td-count"><label class="field-label db-cx-t">' + list.length + (list.length === 1 ? ' student' : ' students') + '</label></div>' +
    '<hr class="divider td-rule td-rule-top">' +
    '<div class="db-panel im-list td-mini">' + list.map(function (s, i) {
      // The name in the portal's link-button look, a plain tag since 2026-11-01 (was a button opening its card, 2026-10-09).
      return '<div class="td-mini-row' + (_td.sel === _imKey(s.name) ? ' td-on' : '') + '" id="tdMini' + i + '">' +
        '<span class="td-mini-t">' + _tdTime(s.eventDate) + '</span><span class="link-btn td-mini-b td-mini-tag">' + inqEsc(s.name) + '</span></div>';   // a plain name tag, not a button (user, 2026-11-01): All shows their lesson and HW
    }).join('') + '</div></div>';   // the box ends after the list; the open card goes under it
  // The open card is a window over the page (user, 2026-10-24); a click outside it closes it.
  body.innerHTML = head + mini + '<div class="im-notes-back td-card-back' + (_td.sel ? ' td-show' : '') + '" id="tdCardBack" onclick="if (event.target === this) _tdClose()">' + list.map(function (s, i) {
    return '<div class="td-student' + (_td.sel === _imKey(s.name) ? ' td-open' : '') + '" id="tdCard' + i + '" style="--td-c:' + _tdColor(i) + '" data-key="' + _auEsc(_imKey(s.name)) + '">' + _tdStudentHtml(s) + '</div>';
  }).join('') + '</div>' + _tdWeekSection();
  _imFixTips(body);
}

// A name in the list at the top opens that card and closes the one that was
// open; their name again (or the card's name row) closes it. Kept for the day.
function _tdJump(i) {
  var el = document.getElementById('tdCard' + i);
  if (!el) return;
  var key = el.getAttribute('data-key');
  _td.sel = _td.sel === key ? null : key;
  document.querySelectorAll('#todayBody .td-student').forEach(function (c) { c.classList.toggle('td-open', c.getAttribute('data-key') === _td.sel); });
  document.querySelectorAll('#todayBody .td-mini-row').forEach(function (r, j) { r.classList.toggle('td-on', j === i && !!_td.sel); });
  var back = document.getElementById('tdCardBack');
  if (back) back.classList.toggle('td-show', !!_td.sel);
}
function _tdClose() {
  var el = document.querySelector('#todayBody .td-student.td-open');
  if (el) _tdJump(parseInt(el.id.replace('tdCard', ''), 10));
}

// ── All (user, 2026-11-01) ──────────────────────────────────────────────────
// Today's students in one window, at a glance (user, 2026-11-01; was every student): last lesson, last HW and its
// folder names only. One read of HW Tracking (getHwLog, no filter = every row)
// and each student's last lesson (getPastLessons count=1; was the last 4, user 2026-11-01), six at a time so
// Google isn't hit by all of them at once. Boxes fill in as answers come.
// A name opens that student's lesson log on the Students tab.
var _tdAll = null;   // { lessons: key → [..] | 'fail', hw: key → row, hwIn }

function _tdAllOpen() {
  var w = _stWin('tdAllWin', 'Today', 'Last lesson and HW', null, '<div id="tdAllBody"><div class="empty-state rpm-loading">Loading</div></div>');
  w.querySelector('.st-win').classList.add('td-all-win');
  // The magnifier on the window too (user, 2026-11-01): the header's is under the window's dark.
  w.querySelector('.settings-close').insertAdjacentHTML('beforebegin', '<button class="win-mag' + (_magOn ? ' on' : '') + '" data-mag onclick="magToggle()" aria-label="Magnifier" data-tip="Instant.\nMagnifier: rest the pointer on longer text\nfor half a second to see it bigger." data-tip-left><span class="hdr-mag-i"></span></button>');
  var url = getScriptUrl(), all = _tdAll = { lessons: {}, hw: {}, hwIn: false };
  function go() {
    if (_tdAll !== all) return;
    _tdAllRender();
    fetch(url + '?action=getHwLog')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        // Rows come newest first: the first with HW text, files or links is the last HW.
        (d.success ? d.rows || [] : []).forEach(function (x) {
          var k = _imKey(x.student);
          if (all.hw[k] || !(x.text || (x.files || []).length || (x.links || []).length)) return;
          all.hw[k] = x;
        });
      })
      .catch(function () {})
      .then(function () { all.hwIn = true; if (_tdAll === all) _tdAllRender(); });
    var queue = _tdAllNames();
    function next() {
      var n = queue.shift();
      if (!n || _tdAll !== all || !document.getElementById('tdAllWin')) return;
      fetch(url + '?action=getPastLessons&count=1&studentName=' + encodeURIComponent(n))
        .then(function (r) { return r.json(); })
        .then(function (d) { all.lessons[_imKey(n)] = d.success ? d.lessons || [] : 'fail'; })
        .catch(function () { all.lessons[_imKey(n)] = 'fail'; })
        .then(function () { if (_tdAll === all) { _tdAllRender(); next(); } });
    }
    for (var i = 0; i < 6; i++) next();
  }
  go();
}
// Today's students, in lesson-time order.
function _tdAllNames() { return (todayStudents || []).map(function (s) { return s.name; }); }

// Folder names only, never files (user, 2026-11-01): "HW - OCT 30", then the
// folders inside it, in the Students page's folder look (_dbDetailsFilesHtml).
function _tdAllFolders(paths) {
  // Under a Material sent title, the lesson folders inside the top "HW - OCT 25" folder,
  // one under another, not indented (user, 2026-11-02); files straight in the top
  // folder (no lesson folders) show the top folder instead.
  var tops = [], subs = [];
  paths.forEach(function (x) {
    var p = String(x).split('/'); p.pop();   // the file's name off
    if (!p.length) return;
    if (tops.indexOf(p[0]) < 0) tops.push(p[0]);
    if (p[1] && subs.indexOf(p[1]) < 0) subs.push(p[1]);
  });
  var list = subs.length ? subs.sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); }) : tops;
  return '<span class="db-group">' + list.map(function (n) {
    return '<span class="db-file db-dir">' + DB_FOLDER_GLYPH + '<span style="text-transform:uppercase">' + inqEsc(n) + '</span></span>';
  }).join('') + '</span>';
}

// One line per comma part, each starting with a capital (user, 2026-11-02).
function _tdAllLines(t) {
  return String(t).split(',').map(function (x) { return x.trim(); }).filter(Boolean)
    .map(function (x) { return '<div>' + inqEsc(x.charAt(0).toUpperCase() + x.slice(1)) + '</div>'; }).join('');
}

function _tdAllPick(name) {
  var w = document.getElementById('tdAllWin');
  if (w) w.remove();
  switchTab('import');
  _imOpenStudent(name);
}

function _tdAllRender() {
  var box = document.getElementById('tdAllBody');
  if (!box || !_tdAll) return;
  var a = _tdAll, wait = '<div class="im-none rpm-loading is-inline">Loading</div>';
  var day = function (ymd) { var p = String(ymd).split('-'); return MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10); };
  box.innerHTML = !_tdAllNames().length ? '<div class="empty-state">No lessons today!</div>' : _tdAllNames().map(function (n) {
    var k = _imKey(n), ls = a.lessons[k], hw = a.hw[k];
    // One box per student (user, 2026-11-01): Lesson, then HW (no line between, user); one date top right
    // (the HW's own date only when it's another day); titles in the field-label font.
    var l = ls && ls !== 'fail' && ls[0];
    var lm = l && String(l.date || '').replace(/\//g, '').trim().match(/^([A-Za-z]{3})\s*(\d{1,2})$/);
    var lDay = l ? (lm ? lm[1] + ' ' + parseInt(lm[2], 10) : l.date || '') : '';
    var t = l ? _imNoTeacher(l.subject) : '';
    var lesson = ls === undefined ? wait : ls === 'fail' ? '<div class="im-none">Could not read</div>' : !l ? '<div class="im-none">None</div>' :
      '<div class="td-all-txt">' + (t ? _tdAllLines(t) : '—') + '</div>';
    var files = hw && (hw.files || []).length, hDay = hw ? day(hw.date) : '';
    var hwHtml = !a.hwIn ? wait : !hw ? '<div class="im-none">None</div>' :
      (hw.text ? '<div class="td-all-txt">' + _tdAllLines(hw.text) + '</div>' : '') +
      (hw.links || []).map(function (x) { return '<div class="im-hw-link"><span>' + (x.kind === 'Video' ? 'Video lesson' : 'Link') + '</span><a href="' + inqEsc(x.url) + '" target="_blank" rel="noopener">' + inqEsc(x.url) + '</a></div>'; }).join('') +
      (files ? '<div class="td-all-h td-all-mat"><span class="td-all-lbl">Material sent</span></div><div class="im-hw-files">' + _tdAllFolders(hw.files) + '</div>' : '');
    var head = function (label, d) { return '<div class="td-all-h"><span class="td-all-lbl">' + label + '</span>' + (d ? '<span class="im-d">' + inqEsc(d) + '</span>' : '') + '</div>'; };
    // The name as Today's name button (user, 2026-11-01: kept over a title), opening their
    // lesson log; the other windows' darker box with the grey edge under it (No show's).
    return '<div class="td-all-one">' +
      '<button class="link-btn td-mini-b td-all-name" onclick="_tdAllPick(' + _auEsc(JSON.stringify(n)) + ')" data-tip="Opens a tab.\nEvery lesson logged for ' + _auEsc(n) + '.">' + inqEsc(n) + '</button>' +
      '<div class="ts-thread tv-rv-thread rv-thread td-all-box">' +
        head('Lesson', lDay) + lesson +
        head('HW given', hDay && hDay !== lDay ? hDay : '') + hwHtml +
      '</div>' +
    '</div>';
  }).join('');   // no line between students, just room (user, 2026-11-01)
}

// ── No show text (user, 2026-10-26) ─────────────────────────────────────────
// For a student who can't make it, usually said before the lesson: texts to
// copy and send from Messages. They live in "No Show Texts" (Counter sheet);
// these three are the starting ones until it answers. An edit is kept only on
// Save; Copy saves nothing, and closing drops an unsaved edit.
var TD_NS_TEXTS = [
  "Hi! Sorry you can't make it today.",
  "This could be a good time to review the older material and improve it, or just play anything you enjoy. Just doing that, you will still improve.",
  "Lesson policies are what keep the studio running, so thank you for understanding!"
];
function _tdNsOpen() {
  // The Reviews tab's text template look: the blue bubble, editable, Save + Copy on the right.
  _stWin('tdNsWin', 'No show', 'Text', null, '<div id="tdNsList">' + _tdNsHtml() + '</div>');
  fetch(getScriptUrl() + '?action=getNsTexts')
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success || !res.texts || !res.texts.length) return;
      TD_NS_TEXTS = res.texts;
      var box = document.getElementById('tdNsList');
      if (box) box.innerHTML = _tdNsHtml();
    })
    .catch(function () {});   // the starting texts stay
}
function _tdNsHtml() {
  return TD_NS_TEXTS.map(function (t, i) {
    return '<div class="en-tpl">' +
      '<div class="en-tpl-top"><span class="field-label">Text template ' + (i + 1) + '</span>' +
        '<span class="en-tpl-btns">' +
        '<button class="link-btn" id="tdNsSave' + i + '" onclick="_tdNsSave(' + i + ')" data-tip="Saves this text to\nNo Show Texts (Counter sheet).">Save</button>' +
        '<button class="link-btn" id="tdNsCopy' + i + '" onclick="_tdNsCopy(' + i + ')" data-tip="Instant.\nCopies the text for Messages.\nSaves nothing.">' + COPY_ICON + '<span>Copy</span></button></span></div>' +
      '<div class="ts-thread tv-rv-thread rv-thread"><div id="tdNsText' + i + '" class="ts-bub tv-rv-bub rv-bub" contenteditable="plaintext-only" spellcheck="false">' + inqEsc(t) + '</div></div>' +
    '</div>';
  }).join('');
}
function _tdNsSave(i) {
  var el = document.getElementById('tdNsText' + i), btn = document.getElementById('tdNsSave' + i);
  var win = document.querySelector('#tdNsWin .st-win');
  if (!el || !btn) return;
  var text = el.innerText.replace(/\n+$/, '');
  rpmBusy(win, btn, true, 'Saving');
  fetch(getScriptUrl() + '?action=saveNsText&i=' + i + '&text=' + encodeURIComponent(text))
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      TD_NS_TEXTS[i] = text;
      rpmBusy(win, btn, false);
      btn.textContent = 'Saved';
      setTimeout(function () { btn.textContent = 'Save'; }, 1600);
    })
    .catch(function (e) {
      rpmBusy(win, btn, false);
      rpmAlert({ title: 'Not saved', message: String(e && e.message || e) });
    });
}
function _tdNsCopy(i) {
  var el = document.getElementById('tdNsText' + i), btn = document.getElementById('tdNsCopy' + i);
  if (!el) return;
  var text = el.innerText.replace(/\n+$/, '');
  function flash(ok) {
    var lbl = btn && btn.querySelector('span');
    if (!lbl) return;
    lbl.textContent = ok ? 'Copied' : 'Select & copy';
    setTimeout(function () { lbl.textContent = 'Copy'; }, 1600);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { flash(true); }, function () { _rvCopyFallback(text, flash); });
  else _rvCopyFallback(text, flash);
}

function _tdStudentHtml(s) {
  // Name · Quick look (2026-10-06, was the lesson time), with a chevron: the
  // whole row opens and closes the card (2026-10-09).
  var d = _td.data[_imKey(s.name)] || {}, i = (todayStudents || []).indexOf(s);
  // A window since 2026-10-24: the ✕ closes it, like every window (was the chevron + the whole row).
  var title = '<div class="settings-title im-title td-head"><span>' + inqEsc(s.name) +
    '<span class="win-sub"> · Quick look</span></span><button class="settings-close" onclick="_tdClose()">✕</button></div>';
  var body = d.failed ? '<div class="empty-state">Could not read: ' + inqEsc(d.failed) + '</div>'
    : !d.lessons ? '<div class="empty-state rpm-loading">Loading</div>'
    : _imStudentHtml(s.name, d.lessons, d.hw, null, { noTitle: true, noNotes: true }) +
      // Log lesson (2026-10-11): the Log lesson window without leaving Today; small, grey, bottom left.
      '<div class="td-foot">' + _imLogBtnHtml(s.name, { plain: true }) + '</div>';
  // Owes 2 blocks: a quiet line; 3+: red (2026-10-12), under the name even
  // with the card closed, so it's seen during the lesson.
  var owes = (d.pay && d.pay.owes) || 0;
  var owe = owes >= 2 ? '<div class="td-owe' + (owes >= 3 ? ' td-owe-alert' : '') + '">' +
    (owes >= 3 ? '⚠ ' : '') + 'Owes ' + owes + ' blocks</div>' : '';
  // The PREVIEW stamp under the name (om-84, 2026-10-09).
  return title + owe + '<div class="td-body"><img class="td-stamp" src="img/preview-stamp.svg" alt="">' + body + '</div>';
}

// Redraw one student's part when their reads come in.
function _tdDrawOne(name) {
  var key = _imKey(name), el = document.querySelector('#todayBody .td-student[data-key="' + key.replace(/"/g, '') + '"]');
  var s = (todayStudents || []).filter(function (x) { return _imKey(x.name) === key; })[0];
  if (!el || !s) return;
  el.innerHTML = _tdStudentHtml(s);
  _imFixTips(el);
}

// The reads for one student (+ payment, 2026-10-12) (Notes' detail read dropped with Notes, 2026-10-09). Each one redraws that student's part.
function _tdLoad(name) {
  var key = _imKey(name), day = _td.day, url = getScriptUrl();
  if (!url) return;
  var d = _td.data[key] = _td.data[key] || {};
  function done() { if (_td.day === day) _tdDrawOne(name); }
  function get(action, q) { return fetch(url + '?action=' + action + q).then(function (r) { return r.json(); }); }
  get('getPastLessons', '&count=9999&studentName=' + encodeURIComponent(name))
    .then(function (r) {
      if (r.success) { d.lessons = r.lessons || []; d.failed = null; }
      else if (/no sheet/i.test(r.message || '')) d.lessons = [];   // a trial: no Import tab yet
      else d.failed = r.message || 'unknown';
      done();
    })
    .catch(function () { d.failed = 'No answer from Google.'; done(); });
  get('getHwLog', '&name=' + encodeURIComponent(name))
    .then(function (r) { if (r.success) { d.hw = { rows: r.rows || [] }; done(); } })
    .catch(function () {});
  get('getPayInfo', '&name=' + encodeURIComponent(name))
    .then(function (r) { if (r.success) { d.pay = { status: r.status, owes: r.owes || 0 }; done(); } })
    .catch(function () {});
}

// After a lesson or its HW is logged for them: read that student again.
function _tdRefresh(name) {
  delete _td.data[_imKey(name)];
  _tdLoad(name);
}

// ── This Week (2026-10-09 a window, was its own Week tab; 2026-10-24 a box under Today's, the Week button gone) ──
// This week's lessons, Mon–Sun, read-only: one group per day (a day off: one line, a dash for its date), time + name like
// the list at the top of Today. Every day looks the same (no dimming: Today is the tab for today).
function _tdWeekSection() {
  var w = _tdWeekHtml();
  return '<div class="td-wk-box"><div class="settings-title td-wk-title"><span>This Week<span class="win-sub"> · ' + w.sub + '</span></span></div>' +
    '<div class="td-wk-icon">' + CALENDAR_ICON.replace(/class="[^"]*"/, 'class="win-icon"') + '</div>' +   // the window's calendar under the title
    w.body + '</div>';
}
function _tdWeekHtml() {
  var list = (typeof weekStudents !== 'undefined' && weekStudents) || [];
  var DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var mon = new Date(today); mon.setDate(today.getDate() - (today.getDay() + 6) % 7);
  var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  function md(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  // How many, like Today's "3 students" (the weekly · biweekly line went with the window, 2026-10-24).
  var body = '<div class="db-cx-head im-sec-head td-wk-head"><label class="field-label db-cx-t">' + list.length + (list.length === 1 ? ' student' : ' students') + '</label></div>' +
    '<hr class="divider td-wk-rule">';
  // The calendar read isn't in yet: say so, don't claim an empty week.
  if (!window._weekFetchedDay) body = '<div class="empty-state rpm-loading">Loading</div>';
  else if (!list.length) body += '<div class="empty-state">No lessons this week</div>';
  DAYS.forEach(function (day, i) {
    var rows = list.filter(function (s) { return s.dayOfWeek === day; });
    if (!list.length) return;
    var d = new Date(mon); d.setDate(mon.getDate() + i);
    body += '<div class="td-wk-day"><label class="field-label"><span class="td-wk-dn">' + day.slice(0, 3) + '</span>' +   // short day (MON), the date in the names' column
      // A day off is one short line: a dash in the date's place, small and grey (2026-10-09).
      (rows.length ? '<span class="td-wk-date">' + md(d) + '</span>' : '<span class="td-wk-none">—</span>') + '</label>' +
      rows.map(function (s) {
        return '<div class="td-mini-row"><span class="td-mini-t">' + _tdTime(s.eventDate) + '</span><span class="td-wk-name">' + inqEsc(s.name) + '</span></div>';
      }).join('') + '</div>';
  });
  return { body: body, sub: md(mon) + ' – ' + md(sun) };
}

// ── Holiday reminder (2026-10-24) ──
// While a holiday from the Holidays tab (tabs/holidays.js; real dates only, not the "~" school guesses) is
// TD_HOL_DAYS away or less, a plain warning pop-up (rpmAlert) shows over Today, once a day (user, 2026-10-24;
// was a box between Today and This Week, then a portal window): per holiday "Halloween coming up in 7 days" with its date under it, and under that that day's
// lessons from the Calendar tab's week read (getCalendarWeek), so students can be asked ahead.
var TD_HOL_DAYS = 15;   // starts 15 days ahead and counts down each day (user, 2026-10-24)
var _tdHolDay = null;   // the day the reminder was last read for (one read + one pop-up a day)

function _tdHolCheck() {
  if (typeof _holUpcoming !== 'function') return;
  var day = _tdYmd();
  if (_tdHolDay === day) return;
  _tdHolDay = day;
  try { if (localStorage.getItem('tdHolShown') === day) return; } catch (e) {}
  var near = _tdHolNear();
  if (near.length) _tdHolLoad(near, day);
}

function _tdHolNear() {
  var now = new Date(), lim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + TD_HOL_DAYS + 1);
  var muted = _tdHolMuted();
  return _holUpcoming().filter(function (e) { return !e.i.approx && e.d < lim && !muted[_tdHolKey(e)]; });
}

// "Don't warn about it again" silences that holiday for this date only; next year it warns again.
function _tdHolKey(e) { return e.i.n + '|' + _tdHolYmd(e.d); }
function _tdHolMuted() { try { return JSON.parse(localStorage.getItem('tdHolMuted') || '{}'); } catch (e) { return {}; } }
function _tdHolMute(list) {
  var m = _tdHolMuted();
  list.forEach(function (e) { m[_tdHolKey(e)] = 1; });
  try { localStorage.setItem('tdHolMuted', JSON.stringify(m)); } catch (e) {}
}

function _tdHolYmd(d) {
  var m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
}

// Each holiday's days → the Mondays of their weeks → one getCalendarWeek read per week, then the window.
function _tdHolLoad(near, day) {
  var url = getScriptUrl(), weeks = {};
  near.forEach(function (e) {
    for (var d = new Date(e.d); d <= e.last; d.setDate(d.getDate() + 1)) {
      var mon = new Date(d); mon.setDate(d.getDate() - (d.getDay() + 6) % 7);
      weeks[_tdHolYmd(mon)] = 1;
    }
  });
  function done(events) {
    if (_tdYmd() !== day) return;
    _tdHolOpen(near.map(function (e) {
      if (!events) return { e: e, lessons: null };
      var from = _tdHolYmd(e.d), to = _tdHolYmd(e.last);
      return { e: e, lessons: events.filter(function (ev) { return ev.date >= from && ev.date <= to && isReal(ev.title); })
                                     .sort(function (a, b) { return a.startMs - b.startMs; }) };
    }));
    try { localStorage.setItem('tdHolShown', day); } catch (e) {}
  }
  if (!url) { done(null); return; }
  Promise.all(Object.keys(weeks).map(function (mon) {
    return fetch(url + '?action=getCalendarWeek&weekStart=' + mon).then(function (r) { return r.json(); })
      .then(function (d) { if (!d.success) throw new Error(d.message); return d.events || []; });
  })).then(function (lists) { done([].concat.apply([], lists)); }).catch(function () { done(null); });
}

function _tdHolOpen(items) {
  var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  function md(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function hm(min) { var h = Math.floor(min / 60), m = min % 60; return ((h % 12) || 12) + ':' + (m < 10 ? '0' + m : m) + ' ' + (h >= 12 ? 'PM' : 'AM'); }
  // Per holiday: a calendar page with its date (OCT over 31), "Halloween coming up in 7 days", a run of days
  // under it (Nov 23–27), then that day's lessons (user, 2026-10-24; the date was a line of text before).
  var html = items.map(function (x) {
    var e = x.e, multi = e.last > e.d;
    var away = Math.round((e.d - today) / 86400000);
    var line = away <= 0 ? e.i.n + ' is today' : e.i.n + ' coming up ' + (away === 1 ? 'tomorrow' : 'in ' + away + ' days');
    var lessons = x.lessons === null ? '<div class="td-hol-l">Could not read the calendar</div>'
      : x.lessons.map(function (ev) {
          var d = new Date(ev.startMs);
          return '<div class="td-hol-l">' + (multi ? HOL_DAYS[d.getDay()] + ' ' : '') + hm(ev.startMin) + '  ' + inqEsc(ev.title) + '</div>';
        }).join('');
    return '<div class="td-hol-one">' +
      '<div class="td-hol-cal"><div class="td-hol-mo">' + MONTHS[e.d.getMonth()] + '</div><div class="td-hol-dd">' + e.d.getDate() + '</div></div>' +
      '<div>' + line + '</div>' +
      (multi ? '<div class="td-hol-l">' + md(e.d) + '–' + (e.last.getMonth() === e.d.getMonth() ? e.last.getDate() : md(e.last)) + '</div>' : '') +
      lessons + '</div>';
  }).join('');
  // A plain pop-up (the portal's alert box): no title, icon or colour; ✕, Escape or a click outside closes it
  // until tomorrow; the button silences these holidays for good (user, 2026-10-24).
  // "Today is Oct 27" centred on the ✕'s line (user, 2026-10-27; there was no title before)
  rpmAlert({ title: 'Today is ' + md(today), message: ' ', confirmLabel: "Don't warn about it again", className: 'td-hol-dlg' })
    .then(function (v) { if (v === undefined) _tdHolMute(items.map(function (x) { return x.e; })); });   // undefined = the button, null = ✕
  var box = document.querySelector('.rpm-dlg.td-hol-dlg');
  if (!box) return;
  box.querySelector('.rpm-dlg-msg').innerHTML = html;   // the alert only takes text; the calendar pages go in after
  var btn = box.querySelector('.rpm-dlg-btn');
  if (btn) { btn.className = 'link-btn'; btn.blur(); }   // the portal's own button look; unfocused so a stray Enter doesn't press it
}
