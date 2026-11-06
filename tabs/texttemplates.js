// ─── TABS / TEXTTEMPLATES.JS ─────────────────────────────────────────────────
// Text templates, in the Comms tab (user, 2026-11-05; briefly its own tab).
// Comms ▸ Templates ▾ (left of Others) opens Zoom lesson / No show (tabs/today.js)
// or Optional schedule (here). Pick the student in the window; Use opens their
// conversation with the text in the box; Send goes from there. (No Copy: no more iMessage.)

var TT_ITEMS = [['Zoom lesson', '_tdZmOpen'], ['No show', '_tdNsOpen'], ['Optional schedule', '_ttOsOpen']];
function _ttMenu(e) {
  if (e) e.stopPropagation();
  var list = document.getElementById('cmTplList'); if (!list) return;
  if (!list.hidden) { _ttMenuClose(); return; }
  list.innerHTML = TT_ITEMS.map(function (x) {
    return "<button type='button' class='cash-dd-opt' onclick='_ttMenuClose();" + x[1] + "()'>" + x[0] + "</button>";
  }).join('');
  list.hidden = false;
  setTimeout(function () { document.addEventListener('mousedown', _ttMenuOut); }, 0);
}
function _ttMenuOut(e) { var w = document.getElementById('cmTplWrap'); if (!w || !w.contains(e.target)) _ttMenuClose(); }
function _ttMenuClose() {
  document.removeEventListener('mousedown', _ttMenuOut);
  var list = document.getElementById('cmTplList'); if (list) list.hidden = true;
}

// Each window has a student picker (user, 2026-11-05): today's students as chips,
// Other student ▾ = every student on the Comms line (commsStudents). Before a pick
// the text says "Hi Student!" and To: Student. Use opens that student's
// conversation and puts the text in its text box.
var _ttPk = {};   // window key -> { cb, name, hi }
function _ttFirst(name) { return name ? name.split(/\s+/)[0] : 'Student'; }
function _ttPickHtml(key, cb) {
  _ttPk[key] = { cb: cb, name: '', hi: 0 };
  var chips = (todayStudents || []).map(function (s, i) {
    return '<button class="link-btn" data-pk="' + i + '" onclick="_ttPickToday(\'' + key + '\',' + i + ')">' + inqEsc(s.name) + '</button>';
  }).join('');
  return '<div id="ttPk_' + key + '">' +
    '<div class="td-all-lbl" id="ttTo_' + key + '">To: Student</div>' +
    '<div class="tt-pick">' + chips +
      '<span class="tt-other"><button class="link-btn" data-pk="other" onclick="_ttOtherOpen(\'' + key + '\')">Other student ▾</button>' +
      '<span class="tt-other-panel" hidden><input class="rpm-field" placeholder="Type to find…" autocomplete="off" oninput="_ttPk[\'' + key + '\'].hi=0;_ttOtherRender(\'' + key + '\')" onkeydown="_ttOtherKey(event,\'' + key + '\')">' +
      '<span class="cash-dd-list"></span></span></span>' +
    '</div></div>';
}
function _ttPicked(key, name, which) {
  var box = document.getElementById('ttPk_' + key); if (!box) return;
  box.querySelectorAll('[data-pk]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-pk') == which); });
  var ob = box.querySelector('[data-pk="other"]'); if (ob) ob.textContent = which === 'other' ? name + ' ▾' : 'Other student ▾';
  var to = document.getElementById('ttTo_' + key); if (to) to.textContent = 'To: ' + name;
  var t = (todayStudents || []).filter(function (s) { return s.name === name; })[0];
  _ttPk[key].name = name;
  _ttPk[key].cb(name, t ? _tdTime(t.eventDate) : '');
}
function _ttPickToday(key, i) {
  var s = (todayStudents || [])[i]; if (!s) return;
  _ttOtherClose(key);
  _ttPicked(key, s.name, i);
}
function _ttOtherNames() {
  var src = (typeof commsStudents !== 'undefined' && commsStudents.length) ? commsStudents.map(function (s) { return s.name; }) : (_imRoster || []);
  return src.slice().sort(function (a, b) { return a.localeCompare(b); });
}
function _ttOtherOpen(key) {
  var box = document.getElementById('ttPk_' + key); if (!box) return;
  var pan = box.querySelector('.tt-other-panel');
  if (!pan.hidden) { _ttOtherClose(key); return; }
  pan.hidden = false;
  var inp = pan.querySelector('input'); inp.value = ''; inp.focus();
  _ttPk[key].hi = 0;
  _ttOtherRender(key);
  _ttPk[key].out = function (e) { if (!box.querySelector('.tt-other').contains(e.target)) _ttOtherClose(key); };
  setTimeout(function () { document.addEventListener('mousedown', _ttPk[key].out); }, 0);
}
function _ttOtherClose(key) {
  var box = document.getElementById('ttPk_' + key); if (!box) return;
  box.querySelector('.tt-other-panel').hidden = true;
  if (_ttPk[key] && _ttPk[key].out) document.removeEventListener('mousedown', _ttPk[key].out);
}
function _ttOtherMatches(key) {
  var box = document.getElementById('ttPk_' + key);
  var q = (box ? box.querySelector('.tt-other-panel input').value : '').trim().toLowerCase();
  return _ttOtherNames().filter(function (n) { return !q || n.toLowerCase().indexOf(q) === 0; });
}
function _ttOtherRender(key) {
  var box = document.getElementById('ttPk_' + key); if (!box) return;
  var list = box.querySelector('.tt-other-panel .cash-dd-list'), st = _ttPk[key], m = _ttOtherMatches(key);
  if (st.hi >= m.length) st.hi = 0;
  list.innerHTML = m.map(function (n, i) {
    return "<button type='button' class='cash-dd-opt" + (i === st.hi ? ' hi' : '') + "' onmouseenter='_ttPk[\"" + key + "\"].hi=" + i + ";_ttOtherRender(\"" + key + "\")' onclick='_ttOtherPick(\"" + key + "\"," + _auEsc(JSON.stringify(n)) + ")'>" + inqEsc(n) + "</button>";
  }).join('') || "<div class='cash-dd-opt rpm-none'>No match</div>";
  var hi = list.querySelector('.hi'); if (hi) hi.scrollIntoView({ block: 'nearest' });
}
function _ttOtherKey(e, key) {
  var m = _ttOtherMatches(key), st = _ttPk[key];
  if (e.key === 'Escape') { _ttOtherClose(key); return; }
  if (!m.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); st.hi = Math.min(st.hi + 1, m.length - 1); _ttOtherRender(key); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); st.hi = Math.max(st.hi - 1, 0); _ttOtherRender(key); }
  else if (e.key === 'Enter') { e.preventDefault(); _ttOtherPick(key, m[Math.min(st.hi, m.length - 1)]); }
}
function _ttOtherPick(key, name) { _ttOtherClose(key); _ttPicked(key, name, 'other'); }

function _ttUseBtn(id, key) {
  return '<button class="link-btn" onclick="_ttUse(\'' + id + '\',\'' + key + '\')" data-tip="Instant.\nOpens the student\'s conversation\nwith the text in the text box.">Use</button>';
}
function _ttUse(id, key) {
  var el = document.getElementById(id), name = _ttPk[key] && _ttPk[key].name;
  if (!el) return;
  if (!name) { rpmAlert({ title: 'Pick a student', message: 'Pick who the text is for first.' }); return; }
  var s = (commsStudents || []).filter(function (x) { return x.name === name; })[0];
  if (!s) { rpmAlert({ title: 'No phone number', message: name + ' has no number on the Comms line.' }); return; }
  var text = el.innerText.replace(/\n+$/, ''), k = commsKey(s.number);
  var last = commsMessages.filter(function (m) { return commsKey(m.fromNumber) === k; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })[0];
  var win = el.closest('.im-notes-back'); if (win) win.remove();
  if (typeof switchTab === 'function' && !document.getElementById('tab-comms').classList.contains('active')) switchTab('comms');
  commsPaneOpen(last || { row: 0, source: 'sms', fromNumber: s.number, fromName: s.name, student: s.name, responded: true, blank: true });   // the New text pick's way in
  var box = document.getElementById('cmPaneReply');
  if (!box) return;
  box.value = text;
  box.focus();
  box.setSelectionRange(text.length, text.length);
}

var _ttOs = { name: '', time: '' };
function _ttOsOpen() {
  _ttOs = { name: '', time: '' }; _ttOsVals = [];
  _stWin('ttOsWin', 'Optional schedule', 'Text templates', COMMS_TEXT_ICON,
    _ttPickHtml('os', function (n, t) { _ttOs.name = n; _ttOs.time = t; _ttOsShow(); }) +
    '<div id="ttOsOut"></div>' +
    '<div class="tt-bottom"><div class="td-all-lbl">Openings</div><div id="ttOsOpen" class="tt-open"></div></div>');   // openings at the bottom (user, 2026-11-05)
  _ttOsOpenPaint();
  _ttOsShow();
}
// Openings (user, 2026-11-05): none = "I have some openings"; each is a day dropdown
// (tomorrow through Sunday) and a time dropdown (half hours, 9 am – 9 pm). Up to 3.
var _ttOsVals = [];
var TT_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function _ttOsDayOpts(sel) {   // tomorrow through Sunday (user, 2026-11-05); on a Sunday, the next week through Sunday
  var o = '', d0 = new Date().getDay(), last = d0 === 0 ? 7 : 7 - d0;
  for (var k = 1; k <= last; k++) {
    var d = new Date(); d.setDate(d.getDate() + k);
    o += '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + TT_DAYS[d.getDay()] + '</option>';
  }
  return o;
}
function _ttOsTimeOpts(sel) {
  var o = '';
  for (var m = 9 * 60; m <= 21 * 60; m += 30) {
    var h = Math.floor(m / 60), t = ((h % 12) || 12) + ':' + (m % 60 ? '30' : '00') + (h < 12 ? ' am' : ' pm');
    o += '<option value="' + t + '"' + (t === sel ? ' selected' : '') + '>' + t + '</option>';
  }
  return o;
}
function _ttOsOpenPaint() {
  var box = document.getElementById('ttOsOpen'); if (!box) return;
  box.innerHTML = _ttOsVals.map(function (v, i) {
    return '<span class="tt-open-row">' +
      '<select class="settings-input" onchange="_ttOsVals[' + i + '].day=+this.value;_ttOsShow()">' + _ttOsDayOpts(v.day) + '</select>' +
      '<select class="settings-input" onchange="_ttOsVals[' + i + '].time=this.value;_ttOsShow()">' + _ttOsTimeOpts(v.time) + '</select>' +
      '<button class="link-btn tt-x" onclick="_ttOsDrop(' + i + ')" data-tip="Instant.\nTakes this opening out." aria-label="Remove">✕</button></span>';
  }).join('') + (_ttOsVals.length < 3 ? '<button class="link-btn" onclick="_ttOsAdd()">+ Opening</button>' : '');
}
function _ttOsOpenings() { return _ttOsVals; }
function _ttOsAdd() {
  var last = _ttOsVals[_ttOsVals.length - 1];
  _ttOsVals.push(last ? { day: Math.min(last.day + 1, new Date().getDay() === 0 ? 7 : 7 - new Date().getDay()), time: last.time } : { day: 1, time: '7:30 pm' });
  _ttOsOpenPaint(); _ttOsShow();
}
function _ttOsDrop(i) { _ttOsVals.splice(i, 1); _ttOsOpenPaint(); _ttOsShow(); }
function _ttOsWhen(v) {   // "Tomorrow at 7:30 PM", "Saturday at 7:30 PM"
  var d = new Date(); d.setDate(d.getDate() + v.day);
  return (v.day === 1 ? 'Tomorrow' : TT_DAYS[d.getDay()]) + ' at ' + v.time.replace(/ (am|pm)$/, function (m, x) { return ' ' + x.toUpperCase(); });
}
// The user's own text, word for word (2026-11-05): openings as a numbered list.
function _ttOsText() {
  var first = _ttFirst(_ttOs.name);
  var h = parseInt(_ttOs.time, 10), pm = /pm/i.test(_ttOs.time);
  var when = !_ttOs.time ? '' : pm && h >= 5 && h < 12 ? 'tonight' : 'today';   // not a today student: no time (2026-11-05)
  var w = _ttOsOpenings().map(_ttOsWhen);
  var spots = !w.length ? 'I have a few open spots.' :
    w.length === 1 ? 'I have an open spot:\n\n' + w[0] :
    'I have a few open spots:\n\n' + w.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n');
  return 'Hi ' + first + '!\n\n' +   // blank lines between the parts (user, 2026-11-05)
    (when ? "We're on for our lesson " + when + ' at ' + _ttOs.time + '.\n\n' : "We're on for our next lesson as planned.\n\n") +
    "That said, in case you'd like to switch, " + spots + '\n\n' +
    'Feel free to keep ' + (when || 'it') + ' or switch to ' + (w.length > 1 ? 'one of the other spots' : w.length ? 'that spot' : 'another spot') + ', but please let me know either way.\n\n' +
    'Thanks!';
}
function _ttOsShow() {
  var out = document.getElementById('ttOsOut'); if (!out) return;
  out.innerHTML = '<div class="en-tpl">' +
    '<div class="ts-thread tv-rv-thread rv-thread"><div id="ttOsText" class="ts-bub tv-rv-bub rv-bub" contenteditable="plaintext-only" spellcheck="false" style="white-space:pre-wrap">' + inqEsc(_ttOsText()) + '</div></div>' +
    '<div class="en-tpl-foot"><span class="en-tpl-btns">' + _ttUseBtn('ttOsText', 'os') + '</span></div></div>';
}

