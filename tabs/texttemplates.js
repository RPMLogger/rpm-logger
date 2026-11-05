// ─── TABS / TEXTTEMPLATES.JS ─────────────────────────────────────────────────
// Text templates, in the Comms tab (user, 2026-11-05; briefly its own tab).
// Comms ▸ conversation ▸ Templates ▾ opens Zoom lesson / No show (tabs/today.js)
// or Optional schedule (here) for that conversation's student. Use puts the
// text in the Comms text box; Send goes from there. (No Copy: no more iMessage.)

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

// Who the open conversation is with: the student's name (or the texter's), and
// today's lesson time when they are one of today's students.
function _ttWho() {
  var d = typeof commsPaneDetail !== 'undefined' ? commsPaneDetail : null;
  var name = d ? (d.student || d.fromName || '') : '';
  var t = (todayStudents || []).filter(function (s) { return name && s.name === name; })[0];
  return { name: name, time: t ? _tdTime(t.eventDate) : '' };
}
function _ttToHtml() {
  var n = _ttWho().name;
  return n ? '<div class="td-all-lbl" style="margin-bottom:12px">To: ' + inqEsc(n) + '</div>' : '';
}
function _ttUseBtn(id) {
  return '<button class="link-btn" onclick="_ttUse(\'' + id + '\')" data-tip="Instant.\nPuts the text in the Comms text box.\nSend from there.">Use</button>';
}
function _ttUse(id) {
  var el = document.getElementById(id), box = document.getElementById('cmPaneReply');
  if (!el || !box) return;
  box.value = el.innerText.replace(/\n+$/, '');
  var win = el.closest('.im-notes-back'); if (win) win.remove();
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);
}

var _ttOs = { name: '', time: '' };
function _ttOsOpen() {
  _ttOs = _ttWho(); _ttOsVals = [];
  _stWin('ttOsWin', 'Optional schedule', 'Text templates', COMMS_TEXT_ICON,
    _ttToHtml() + '<div id="ttOsOut"></div>' +
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
  var first = _ttOs.name.split(/\s+/)[0];
  var h = parseInt(_ttOs.time, 10), pm = /pm/i.test(_ttOs.time);
  var when = !_ttOs.time ? '' : pm && h >= 5 && h < 12 ? 'tonight' : 'today';   // not a today student: no time (2026-11-05)
  var w = _ttOsOpenings().map(_ttOsWhen);
  var spots = !w.length ? 'I have a few open spots.' :
    w.length === 1 ? 'I have an open spot:\n\n' + w[0] :
    'I have a few open spots:\n\n' + w.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n');
  return 'Hi' + (first ? ' ' + first : '') + '!\n\n' +   // blank lines between the parts (user, 2026-11-05)
    (when ? "We're on for our lesson " + when + ' at ' + _ttOs.time + '.\n\n' : "We're on for our next lesson as planned.\n\n") +
    "That said, in case you'd like to switch, " + spots + '\n\n' +
    'Feel free to keep ' + (when || 'it') + ' or switch to ' + (w.length > 1 ? 'one of the other spots' : w.length ? 'that spot' : 'another spot') + ', but please let me know either way.\n\n' +
    'Thanks!';
}
function _ttOsShow() {
  var out = document.getElementById('ttOsOut'); if (!out) return;
  out.innerHTML = '<div class="en-tpl">' +
    '<div class="ts-thread tv-rv-thread rv-thread"><div id="ttOsText" class="ts-bub tv-rv-bub rv-bub" contenteditable="plaintext-only" spellcheck="false" style="white-space:pre-wrap">' + inqEsc(_ttOsText()) + '</div></div>' +
    '<div class="en-tpl-foot"><span class="en-tpl-btns">' + _ttUseBtn('ttOsText') + '</span></div></div>';
}

