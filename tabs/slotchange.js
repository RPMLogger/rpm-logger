// ─── TABS / SLOTCHANGE.JS ───────────────────────────────────────────────────
// Slot change (2026-10-28): a student's regular slot changes for good, weekly
// to another spot or weekly <> biweekly. One card per student (the Dropbox
// tab's look, 2026-10-29); Change opens the Slot change window, the Change
// appointment window's look (2026-10-29):
//   1 Their next 8 weeks: click the lesson to change (its week and after dim),
//     click the new day in that week (green, W and B corners), tap W or B: the
//     new lessons go on the weeks
//   2 Set the time under the weeks, Confirm: the Warning! box, then the
//     change (applySlotChange: mute till the midnight relabel, new series, old
//     one ended from the picked lesson's week on); the weeks reload after
//   3 Email: "Your Recurring Slot Has Changed" goes on its own with the change
//     (2026-10-30, the Secretary's format; keeps a Counter "Slot Changes" row)
// One lesson a week: no start day in a week they already had their lesson.
// Backend RPM_SlotChange.gs: getSlotChange, applySlotChange, checkSlotChange;
// getStudentLessons for the weeks.

var SLC_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var SLC_ANCHOR_A = new Date(2026, 8, 14);   // a Week A Monday, as RPM_FixedCal.gs

var _slc = { data: null, name: '', type: 'weekly', time: '', lessons: null, cutDay: '', pickDay: '', date: '', warn: null, muted: false, applied: null, check: null };

function initSlotChangeTab() {
  _slcInjectStyle();
  _rpmTpStyle();   // the clock, its list and the steps' look (student.js)
  var body = document.getElementById('slcBody');
  if (!body) return;
  if (!_slc.data) body.innerHTML = '<div class="empty-state rpm-loading">Reading 8 weeks of lessons</div>';
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getSlotChange')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state">Error: ' + inqEsc(d.message || 'backend not deployed yet') + '</div>'; return; }
      _slc.data = d;
      if (_slc.name) _slc.muted = _slc.muted || d.muted.indexOf(_slc.name) !== -1;
      _slcRender();
    })
    .catch(function() { body.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

function _slcStudent() {
  var d = _slc.data;
  return d ? d.students.filter(function(s) { return s.name === _slc.name; })[0] : null;
}
function _slcTimeLbl(min) {
  var h = Math.floor(min / 60), m = min % 60;
  return ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM');
}
function _slcSlotLbl(s) {
  return (s.type === 'biweekly' ? 'Biweekly' : 'Weekly') + ' · ' + SLC_DAYS[s.dayIdx] + ' ' + _slcTimeLbl(s.startMin) +
         (s.type === 'biweekly' && s.week ? ' · Week ' + s.week : '');
}
// On a card, under the name, one line: BIWEEKLY · Sun 11:30 AM · Week A (user, 2026-10-29).
function _slcSlotLines(s) {
  return '<span class="db-card-s">' + (s.type === 'biweekly' ? 'BIWEEKLY' : 'WEEKLY') + ' · ' + SLC_DAYS[s.dayIdx] + ' ' + _slcTimeLbl(s.startMin) +
         (s.type === 'biweekly' && s.week ? ' · Week ' + s.week : '') + '</span>';
}
function _slcWeekOf(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - (x.getDay() + 6) % 7);
  var w = Math.round((x - SLC_ANCHOR_A) / (7 * 86400000));
  return ((w % 2) + 2) % 2 === 0 ? 'A' : 'B';
}
// The new slot as { type, dayIdx, startMin, week } or null.
function _slcNew() {
  var d = rpmDtpParse(_slc.date), m = String(_slc.time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!d || !m) return null;
  return { type: _slc.type, dayIdx: (d.getDay() + 6) % 7, startMin: +m[1] * 60 + +m[2], week: _slc.type === 'biweekly' ? _slcWeekOf(d) : '' };
}
// The slot it changes from: the student's slot that isn't the new one.
function _slcOld() {
  var s = _slcStudent(), n = _slcNew();
  if (!s || !s.slots.length) return null;
  var diff = s.slots.filter(function(x) { return !n || x.type !== n.type || x.dayIdx !== n.dayIdx || x.startMin !== n.startMin; });
  return diff[0] || s.slots[0];
}

// Anything changed above a step clears what came after it.
function _slcReset(from) {
  if (from <= 2) _slc.check = null;
}

// Change on a card opens the Slot change window (user, 2026-10-29): the
// Change appointment window's look, their next 8 weeks. Click the lesson to
// change (its week and everything after it dim), click the new day in that
// week (green, a W and a B corner), tap W or B: the new lessons go on the
// weeks and the next window (Reschedule's look) takes the time and confirms.
function _slcPick(i) {
  var s = _slc.data.students[i];
  if (!s) return;
  _slc.name = s.name;
  _slc.muted = _slc.data.muted.indexOf(s.name) !== -1;
  var cur = s.slots[0];
  _slc.type = cur.type;
  _slc.time = _slcPad(Math.floor(cur.startMin / 60)) + ':' + _slcPad(cur.startMin % 60);
  _slc.cutDay = ''; _slc.pickDay = ''; _slc.date = ''; _slc.warn = null; _slc.applied = null; _slc.lessons = null;
  _slcReset(1);
  var w = _stWin('slcModal', inqEsc(s.name), 'Slot change', CALENDAR_ICON, '<div id="slcWin"></div>');
  w.querySelector('.st-win').classList.add('im-rs-win');
  // Undo on the icon's line, right side (user, 2026-10-29: higher).
  var ic = w.querySelector('.win-icon');
  if (ic) { ic.parentNode.classList.add('slc-iconrow'); ic.parentNode.insertAdjacentHTML('beforeend', "<span id='slcUndoSlot'></span>"); }
  // Closed after a change: the cards read the calendar again for the new slot.
  var shut = function() { w.remove(); _slc.name = ''; if (_slc.applied) { _slc.applied = null; initSlotChangeTab(); } };
  w.onclick = function(e) { if (e.target === w) shut(); };
  w.querySelector('[data-close]').onclick = shut;
  _slcRender();
  _slcLoadLessons();
}
function _slcPad(n) { return (n < 10 ? '0' : '') + n; }

// Their lessons for the 8 weeks (getStudentLessons, the Change appointment
// window's read), by date.
function _slcLoadLessons() {
  var name = _slc.name;
  _slc.lessons = null;
  _slcRender();
  _slcCall('?action=getStudentLessons&name=' + encodeURIComponent(name))
    .then(function(d) {
      if (_slc.name !== name) return;   // closed or another student meanwhile
      if (!d.success) { _slc.lessons = { error: d.message || 'Failed' }; _slcRender(); return; }
      var by = {};
      (d.lessons || []).forEach(function(l) { by[l.date] = l; });
      _slc.lessons = { byDate: by, weeks: d.weeks || 8 };
      _slcRender();
    })
    .catch(function() { if (_slc.name === name) { _slc.lessons = { error: 'No answer from Google.' }; _slcRender(); } });
}

function _slcToday() { return rpmDtpYmd(new Date()); }
function _slcAddDays(ymd, n) { var d = rpmDtpParse(ymd); d.setDate(d.getDate() + n); return rpmDtpYmd(d); }

// 1. A lesson to change: a future one (tomorrow on). The same one again is
// the new day too (same day, new time); a third time lets go.
function _slcCutClick(ymd) {
  if (_slc.applied) return;
  if (_slc.cutDay !== ymd) { _slc.cutDay = ymd; _slc.pickDay = ''; }
  else if (_slc.pickDay !== ymd) _slc.pickDay = ymd;
  else { _slc.cutDay = ''; _slc.pickDay = ''; }
  _slc.date = '';
  _slcReset(2);
  _slcRender();
}
// 2. The new day: in the dimmed lesson's week, tomorrow on (one lesson a
// week); the week after too, for biweekly only (a move to the other week).
function _slcNewDayKind(ymd) {
  if (!_slc.cutDay || ymd <= _slcToday()) return '';
  var mon = _slcMonday(_slc.cutDay);
  if (ymd >= mon && ymd < _slcAddDays(mon, 7)) return 'WB';
  if (ymd >= _slcAddDays(mon, 7) && ymd < _slcAddDays(mon, 14)) return 'B';
  return '';
}
function _slcDayClick(ymd) {
  if (_slc.applied || !_slcNewDayKind(ymd)) return;
  _slc.pickDay = _slc.pickDay === ymd ? '' : ymd;
  _slc.date = '';
  _slcRender();
}
// Undo: W / B, then the new day, then the lesson, one at a time.
function _slcUndo() {
  if (_slc.applied) return;
  if (_slc.date) _slc.date = '';
  else if (_slc.pickDay) _slc.pickDay = '';
  else _slc.cutDay = '';
  _slcReset(2);
  _slcRender();
}

// 3. W or B: the new lessons go on the weeks as real red lessons, and
// Confirm at the bottom opens the next window (user, 2026-10-29: see it first).
function _slcRepeat(type) {
  _slc.type = type;
  _slc.date = _slc.pickDay;
  _slcReset(2);
  _slcRender();
}

// The time, under the weeks (user, 2026-10-29): the shared half-hour dropdown;
// a pick moves the red lessons on the weeks to it.
// The clock's list of half hours, right by the day (Change appointment's, student.js
// _rpmTpOpts / .st-tpop); a pick sets the time and the weeks follow.
function _slcClockOpen(cell) {
  _slcClockClose();
  var panel = cell.closest('.st-win');
  if (!panel) return;
  var pop = document.createElement('div');
  pop.className = 'st-tpop';
  pop.innerHTML = _rpmTpOpts(_dtpMins(_slc.time));
  panel.appendChild(pop);
  var pr = panel.getBoundingClientRect(), cr = cell.getBoundingClientRect();
  var left = cr.right - pr.left + 8;
  if (left + pop.offsetWidth > panel.clientWidth - 8) left = cr.left - pr.left - pop.offsetWidth - 8;
  pop.style.left = Math.max(8, left) + 'px';
  pop.style.top = Math.max(8, cr.top - pr.top + panel.scrollTop + cr.height / 2 - pop.offsetHeight / 2) + 'px';
  var on = pop.querySelector('.rpm-tp-opt.on');
  if (on) pop.scrollTop = on.offsetTop - pop.clientHeight / 2 + on.offsetHeight / 2;
  pop.onclick = function(e) {
    e.stopPropagation();
    var o = e.target.closest('.rpm-tp-opt');
    if (!o) return;
    _slcClockClose();
    _slcTpPick(o.dataset.v);
  };
  setTimeout(function() { document.addEventListener('click', _slcClockClose); }, 0);
}
function _slcClockClose(e) {
  if (e && e.target.closest && e.target.closest('.st-tpop')) return;
  document.querySelectorAll('#slcModal .st-tpop').forEach(function(p) { p.remove(); });
  document.removeEventListener('click', _slcClockClose);
}

function _slcTpPick(v) {
  if (v === _slc.time) return;
  _slc.time = v;
  _slcRender();
}

// Confirm: straight to the Warning! box (Terminate's and the Travel Plan's,
// user 2026-10-29: no window in between), then the change for real: mute,
// new series, old one ended, the check. The weeks reload from Google
// Calendar; a window shows what was done (the email went on its own).
function _slcConfirmAsk() {
  var n = _slcNew();
  if (!n) return;
  var first = _slc.name.split(' ')[0], lastOld = _slcLastOld();
  rpmConfirm({
    title: 'Warning!',
    subtitle: 'Upon activation:',
    message: '→ ' + first + ' is muted for the rest of today: no Secretary activity until the midnight relabel.\n\n' +
      '→ New ' + (_slc.type === 'biweekly' ? 'biweekly' : 'weekly') + ' series from ' + _slcDateLbl(_slc.date) + ' at ' + _slcTimeLbl(n.startMin) + '.\n\n' +
      '→ The old series ends' + (lastOld ? ': ' + first + "'s last lesson on it is " + _slcDateLbl(lastOld) : '') + '.\n\n' +
      '→ ' + first + ' gets the "Your Recurring Slot Has Changed" email.\n\n' +
      '→ This cannot be undone.',
    confirmLabel: 'Change slot',
    icon: WARN_ICON,
    danger: true,
    className: 'tv-golive-dlg'
  }).then(function(ok) { if (ok) _slcConfirm(); });
}

function _slcConfirm() {
  var panel = document.querySelector('#slcModal .st-win'), btn = document.getElementById('slcConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Changing…'; }
  rpmBusy(panel, btn, true, 'Changing');
  var old = _slcOld();   // for the Slot Changes row
  _slcCall('?action=applySlotChange' + _slcParams() +
           (old ? '&oldType=' + old.type + '&oldDay=' + old.dayIdx + '&oldTime=' + old.startMin : ''))
    .then(function(d) {
      rpmBusy(panel, btn, false);
      if (!d.success) { if (btn) { btn.disabled = false; btn.textContent = 'Confirm'; } rpmFail('slcConfirmMsg', d.message || 'Failed', 'left'); return; }
      _slc.applied = d;
      _slc.check = d.check || null;
      _slc.muted = true;
      if (_slc.data.muted.indexOf(_slc.name) === -1) _slc.data.muted.push(_slc.name);
      _slcReset(4);
      _slcLoadLessons();   // the weeks as Google Calendar has them now: the check you can see
      _slcOpenDone();
    })
    .catch(function() { rpmBusy(panel, btn, false); if (btn) { btn.disabled = false; btn.textContent = 'Confirm'; } rpmFail('slcConfirmMsg', 'Connection failed', 'left'); });
}

// After the change: a window with what was done (✓ / ✗).
function _slcOpenDone() {
  _stWin('stTimeModal', inqEsc(_slc.name), 'Slot change', CALENDAR_ICON, "<div id='slcCBody'></div>");
  _slcPaintDone();
}

// The Dropbox tab's look (user, 2026-10-29): a title, a header row, then one
// card per student. Left: name over their slot now. Right: Change, which
// opens the Slot change window.
function _slcRender() {
  var body = document.getElementById('slcBody');
  if (!body || !_slc.data) return;
  var d = _slc.data;
  body.innerHTML = '<div class="db-section">' + _slcTitle('Students') +
    '<div class="db-cards-head"><label class="field-label">' + d.students.length + ' students</label></div>' +
    d.students.map(function(x, i) { return _slcStudentCard(x, i); }).join('') + '</div>' + _slcRecentHtml();
  var win = document.getElementById('slcWin');
  if (win && _slc.name) {
    win.innerHTML = _slcWinHtml();
    // Undo, on the icon's line: one click back at a time (user, 2026-10-29).
    var us = document.getElementById('slcUndoSlot');
    if (us) us.innerHTML = _slc.applied ? '' : "<button class='link-btn' onclick='_slcUndo()'" + (_slc.cutDay ? '' : ' disabled') + " data-tip='Takes back the last click on the weeks.' data-tip-left>Undo</button>";
    _slcDrawWeeks(document.getElementById('slcWeeks'));
  }
  if (_slc.applied && document.getElementById('slcCBody')) _slcPaintDone();
}

function _slcTitle(part) {
  return '<div class="settings-title"><span>Slot change<span class="win-sub"> · ' + part + '</span></span></div>';
}

function _slcStudentCard(x, i) {
  var muted = _slc.data.muted.indexOf(x.name) !== -1;
  return '<div class="db-card db-card-still slc-scard">' +
    '<div class="db-card-l"><span class="db-card-n">' + inqEsc(x.name) + '</span>' +
      x.slots.map(_slcSlotLines).join('') + '</div>' +
    '<div class="db-card-r">' + (muted ? '<span class="db-card-a">Muted</span>' : '') +   // no next-lesson date (user, 2026-10-29)
      '<span class="db-card-btns"><button class="link-btn opens-window" onclick="_slcPick(' + i + ')">Change</button></span></div>' +
  '</div>';
}

// The 8 weeks: Home's strips (student.js _stBuildWeekStrip), our clicks.
// Picked lesson's week on: its lessons dim. The new day: green, W / B corners.
// W or B: the new lessons on the weeks as red lessons at the new time, the
// way the calendar will have them. After the change: the calendar as it is now.
function _slcDrawWeeks(box) {
  if (!box) return;
  var L = _slc.lessons;
  // Still reading: the 8 weeks drawn empty at once with LOADING over them, so
  // the window opens at its size instead of a small Loading box that jumps;
  // solid, not dimmed (user, 2026-10-29).
  if (!L) L = { byDate: {}, weeks: 8, loading: true };
  if (L.error) { box.innerHTML = '<div class="empty-state">Error: ' + inqEsc(L.error) + '</div>'; return; }
  var today = _stToday(), monday = _stMondayOf(today);
  var strips = document.createElement('div');
  strips.className = 'im-rs-strips';
  for (var k = 0; k < L.weeks; k++)
    strips.appendChild(_stBuildWeekStrip(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + k * 7), L.byDate, today, _slc.name));
  box.innerHTML = '';
  box.appendChild(strips);
  if (L.loading) { box.insertAdjacentHTML('beforeend', '<div class="rpm-load-center"><span class="rpm-loading">Loading</span></div>'); return; }

  var n = _slcNew(), newTime = n ? _slcTimeLbl(n.startMin) : '', step = _slc.type === 'biweekly' ? 14 : 7;
  var cut = _slc.cutDay ? _slcMonday(_slc.cutDay) : '', tday = _slcToday(), isNew = {};
  if (n) for (var x = _slc.date, j = 0; j < 30; j++, x = _slcAddDays(x, step)) isNew[x] = true;
  strips.querySelectorAll('button[data-ymd]').forEach(function(c) {
    var ymd = c.dataset.ymd, has = c.dataset.has === '1', kind = _slcNewDayKind(ymd);
    c.onclick = null;
    c.style.cursor = 'default';
    if (_slc.applied) return;
    if (has && ymd > tday) { c.onclick = function() { _slcCutClick(ymd); }; c.style.cursor = 'pointer'; }
    if (!has && kind) { c.onclick = function() { _slcDayClick(ymd); }; c.style.cursor = 'pointer'; }
    if (cut && has && ymd >= cut && ymd > tday) c.classList.add('slc-gone');
    if (ymd === _slc.cutDay) c.classList.add('slc-cut');
    // The old lessons just fade (user, 2026-10-29): no ✕, no line. They aren't
    // cancelled for the student, each one is replaced by a new one.
    if (isNew[ymd]) {   // drawn as a real lesson cell (student.js's look)
      c.classList.remove('slc-gone');
      c.classList.add('slc-new');
      c.style.background = 'rgba(232,70,58,0.18)'; c.style.color = 'var(--accent)'; c.style.border = '1px solid rgba(232,70,58,0.5)';
      var t = c.children[2]; if (t) { t.textContent = newTime; t.style.color = 'var(--accent)'; t.style.opacity = '0.85'; }
      var num = c.children[1]; if (num) { num.style.fontSize = '15px'; num.style.fontWeight = '700'; num.style.color = ''; }
    }
    // The clock (bottom left) on the new day: the time is picked right there
    // (user, 2026-10-29). Once W or B has placed the series it goes, like
    // Change appointment's after the ✓; Undo brings it back.
    if (ymd === _slc.pickDay && !n) {
      if (!n) { var tt = c.children[2]; if (tt) tt.textContent = _slcTimeLbl(_dtpMins(_slc.time)); }
      var ck = document.createElement('span');
      ck.className = 'st-pick-clock';
      ck.innerHTML = ST_CLOCK_ICON;
      ck.dataset.tip = 'Pick the time';
      ck.onclick = function(e) { e.stopPropagation(); _slcClockOpen(c); };
      c.appendChild(ck);
    }
    if (ymd === _slc.pickDay && !n) {
      c.classList.add('st-pick-to');
      kind.split('').forEach(function(k) {
        var b = document.createElement('span');
        b.className = 'slc-wb slc-wb-' + k;
        b.textContent = k;
        b.dataset.tip = k === 'W' ? 'Weekly from this day' : 'Biweekly from this day';
        b.onclick = function(e) { e.stopPropagation(); _slcRepeat(k === 'W' ? 'weekly' : 'biweekly'); };
        c.appendChild(b);
      });
    }
  });
  // One arrow, the first week only: the lesson picked to the first new lesson (user, 2026-10-29).
  if (n && _slc.cutDay) {
    var fromC = strips.querySelector('button[data-ymd="' + _slc.cutDay + '"]'), toC = strips.querySelector('button[data-ymd="' + _slc.date + '"]');
    if (fromC && toC) _stArrowBetween(strips, fromC, toC);
  }
}

// The window: the 8 weeks and the steps under them (user, 2026-10-29: the
// change and Email are in the next window).
function _slcWinHtml() {
  var n = _slcNew();
  // Change appointment's order (user, 2026-10-29): the steps first, then the weeks;
  // the time is the clock on the new day, no Time row.
  return (_slc.applied ? '' : "<div class='im-rs-hint im-rs-hint-top'><div class='im-rs-sec'><div class='im-rs-cap'>To change the slot</div><ol>" +
      "<li>Click the lesson (red) to change</li><li>Click the new day</li><li>Pick the time on its clock (bottom left corner)</li><li>Tap W (weekly) or B (biweekly)</li></ol></div></div>") +
    "<label class='field-label slc-weeks-l'>Next 8 weeks</label><div id='slcWeeks'></div>" +
    // What W / B set, in Change appointment's Moving to look (user, 2026-10-29): blank until then.
    (_slc.applied ? '' : "<div class='im-rs-moved-h'>Switching to</div><div class='im-rs-moved' id='slcSwitch'>" +
      (n ? "<span>" + (_slc.type === 'biweekly' ? 'Biweekly' : 'Weekly') + ' · ' + SLC_DAYS[n.dayIdx] + ' ' + _slcTimeLbl(n.startMin) +
           (n.week ? ' · Week ' + n.week : '') + ' · starting ' + _slcDateLbl(_slc.date) + "</span>" : '') + "</div>") +
    (_slc.applied ? '' :
      // Confirm always at the end, dimmed until W or B is tapped (user, 2026-10-29).
      "<div class='ll-acts st-foot'><span class='ll-state' id='slcConfirmMsg' style='flex:1'></span>" +
        "<button class='link-btn bright opens-window' id='slcConfirmBtn' onclick='_slcConfirmAsk()'" + (n ? '' : ' disabled') +
        " data-tip='Opens the Warning! box.\nThen the lessons change in Google Calendar.' data-tip-left>Confirm</button></div>");
}

// The window after the change: what it did (✓ / ✗, the Email line too, and
// any check that failed).
function _slcPaintDone() {
  var box = document.getElementById('slcCBody'), ap = _slc.applied, ck = _slc.check;
  if (!box || !ap) return;
  var bad = ck ? ck.checks.filter(function(c) { return !c.ok; }) : [];
  box.innerHTML = "<label class='field-label'>Changed</label>" +
    (ap.steps || []).map(function(x) { return '<div class="slc-ck ' + (x.ok ? 'ok' : 'no') + '"><span>' + (x.ok ? '✓' : '✗') + '</span>' + inqEsc(x.label + ': ' + x.text) + '</div>'; }).join('') +
    bad.map(function(c) { return '<div class="slc-ck no"><span>✗</span>' + inqEsc(c.text) + '</div>'; }).join('') +
    (ap.checkError ? '<div class="slc-err">' + inqEsc(ap.checkError) + '</div>' : '');
}

// Their last lesson on the old slot: the last one on the weeks before the
// picked lesson's week, else worked out from the slot (the right Week A/B
// for biweekly). The result after the change reads it from the calendar.
function _slcLastOld() {
  var base = _slc.cutDay || _slc.date;
  if (!base) return '';
  var mon = _slcMonday(base), by = (_slc.lessons && _slc.lessons.byDate) || {};
  var seen = Object.keys(by).filter(function(k) { return k < mon; }).sort();
  if (seen.length) return seen[seen.length - 1];
  var o = _slcOld();
  if (!o) return '';
  var d = rpmDtpParse(mon);
  for (var i = 0; i < 14; i++) {
    d.setDate(d.getDate() - 1);
    if ((d.getDay() + 6) % 7 === o.dayIdx && (o.type !== 'biweekly' || _slcWeekOf(d) === o.week)) return rpmDtpYmd(d);
  }
  return '';
}

// The Monday of a day's week, as yyyy-MM-dd.
function _slcMonday(ymd) {
  var d = rpmDtpParse(ymd);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return rpmDtpYmd(d);
}

function _slcFields(pairs) {
  return '<div class="inq-fields">' + pairs.map(function(x) {
    return '<span class="inq-flabel">' + x[0] + '</span><span class="inq-fval">' + x[1] + '</span>';
  }).join('') + '</div>';
}
function _slcDateLbl(ymd) {
  var d = rpmDtpParse(ymd);
  return d ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] + ', ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getDate() : '';
}
// Recent changes: the same cards, nothing to press. Left: name over old → new;
// right: when the new slot starts.
function _slcRecentHtml() {
  var r = (_slc.data && _slc.data.recent) || [];
  if (!r.length) return '';
  return '<div class="db-section">' + _slcTitle('Recent') +
    '<div class="db-cards-head"><label class="field-label">' + r.length + ' changes</label><label class="field-label">Starting</label></div>' +
    r.map(function(x) {
      return '<div class="db-card db-card-still slc-scard"><div class="db-card-l"><span class="db-card-n">' + inqEsc(x.name) + '</span>' +
        '<span class="db-card-s">' + inqEsc((x.oldSlot ? x.oldSlot + ' → ' : '') + x.newSlot + ' · ' + x.cal) + '</span></div>' +
        '<div class="db-card-r"><span class="db-card-a">' + inqEsc(String(x.starting || '').replace(/, \d{4}$/, '')) + '</span></div></div>';
    }).join('') + '</div>';
}

function _slcCall(q) {
  var url = getScriptUrl();
  if (!url) return Promise.reject(new Error('No script URL'));
  return fetch(url + q).then(function(r) { return r.json(); });
}
function _slcParams() {
  return '&name=' + encodeURIComponent(_slc.name) + '&type=' + _slc.type + '&date=' + encodeURIComponent(_slc.date) + '&time=' + encodeURIComponent(_slc.time) +
         '&from=' + encodeURIComponent(_slc.cutDay || '');
}
function _slcBusy(btn, on) { rpmBusy(btn.closest('.st-win'), btn, on); }

function _slcInjectStyle() {
  if (document.getElementById('slcStyle')) return;
  var st = document.createElement('style');
  st.id = 'slcStyle';
  st.textContent =
    ".slc-scard{border-left-color:var(--warn)}" +
    ".slc-scard.db-card-still:hover:where(:not(:disabled)){border-left-color:var(--warn)}" +
    ".slc-scard .db-card-l{gap:4px}" +
    ".slc-scard .db-card-n+.db-card-s{margin-top:6px}" +   // room between the name and WEEKLY (user, 2026-10-29)
    ".slc-scard .db-card-r .link-btn{height:22px;box-sizing:border-box;text-transform:none;letter-spacing:0;font-size:10px;padding:0 9px}" +
    // The window: Change appointment's (#imRsWin) look; Skip's labels (user, 2026-10-29).
    "#slcModal .field-label{font-family:'DM Mono',monospace;font-size:11.5px;letter-spacing:2.5px;text-transform:uppercase;color:var(--t-faint)}" +
    "#slcModal .field-label.st-gap{margin-top:34px}" +
    "#slcModal .slc-rule{margin:34px 0 0}" +
    // The weeks: a start day can be clicked; new lessons green, removed ones crossed out.
    "#slcWeeks button.slc-can{cursor:pointer}" +
    "#slcModal .st-foot{margin-top:28px}" +
    "#slcWeeks .rpm-load-center{background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.5)}" +   // solid, over the empty weeks
    "#slcModal .st-foot .link-btn:disabled,#slcUndoSlot .link-btn:disabled{opacity:.35;cursor:default}" +   // Confirm until W or B, Undo until a click
    ".slc-iconrow{display:flex;align-items:center;justify-content:space-between}" +
    "#slcModal .slc-weeks-l{margin-top:28px}" +
      "background:var(--surface);color:var(--text);font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.8px;text-transform:uppercase;cursor:pointer}" +
      "background:var(--surface);border:1px solid var(--muted);border-radius:var(--radius-card);box-shadow:0 8px 28px rgba(0,0,0,.6)}" +
      "font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.8px;text-transform:uppercase;cursor:pointer;white-space:nowrap}" +
    "#slcUndoSlot .link-btn{height:22px;box-sizing:border-box;text-transform:none;letter-spacing:0;font-size:10px;padding:0 9px}" +
    "#slcWeeks .slc-gone{opacity:.45;background:transparent !important}" +
    "#slcWeeks .slc-gone div{text-decoration:none}" +   // faded only
    // The lesson picked to change: border and text one dim grey (user, 2026-10-29), Change appointment's picked lesson.
    "#slcWeeks .slc-cut{opacity:1;background:rgba(255,255,255,0.04) !important;border-color:rgba(255,255,255,0.3) !important}" +
    "#slcWeeks .slc-cut div{color:rgba(255,255,255,0.3) !important}" +
    ".slc-wb{position:absolute;top:-7px;width:16px;height:16px;border-radius:50%;background:#1a1a1a;border:1px solid var(--green);color:var(--green);" +
      "font-family:'DM Mono',monospace;font-size:9px;line-height:14px;text-align:center;cursor:pointer;box-sizing:border-box}" +
    ".slc-wb:hover{background:var(--green);color:#111}" +
    ".slc-wb-W{left:-7px}.slc-wb-B{right:-7px}" +
    ".slc-repeats{font-family:'DM Mono',monospace;font-size:11px;color:var(--t-normal);margin-top:14px}" +
    ".slc-warnbox{min-height:20px;margin-top:14px;font-size:11px}" +   // room kept, so the window doesn't grow
    ".slc-done{margin-top:20px}" +
    ".slc-off{opacity:.45}" +
    ".slc-off button,.slc-off a,.slc-off .dtp{pointer-events:none}" +
    ".slc-acts{display:flex;align-items:center;gap:8px;margin-top:12px}" +
    ".slc-ck{display:flex;gap:10px;font-family:'DM Mono',monospace;font-size:12px;line-height:1.5;padding:4px 0;color:var(--text)}" +
    ".slc-ck span{flex:none;width:12px}" +
    ".slc-ck.ok span{color:var(--green)}" +
    ".slc-ck.no{color:#ff5a4d}" +
    ".slc-alert{margin-top:14px;line-height:1.6}" +
    ".slc-err{font-family:'DM Mono',monospace;font-size:11px;color:#ff5a4d}";
  document.head.appendChild(st);
}
