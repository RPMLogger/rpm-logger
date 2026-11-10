// ─── TABS / HOME.JS ─────────────────────────────────────────────────────────
// Home (2026-10-24): the opening page. A student-name box over the big buttons;
// names show as you type (the old Student tab's search, tabs/student.js), and a
// pick opens that student's card on the Students tab. Shares the Students tab's
// roster (_imRoster, tabs/import.js), read once.

var _hmHi = 0;   // highlighted result, 0 = the top one

function initHomeTab() {
  var input = document.getElementById('homeSearch');
  if (!input) return;
  if (!_imRoster) {
    var url = getScriptUrl();
    if (url) fetch(url + '?action=getStudentRoster')
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.success && !_imRoster) { _imRoster = d.students || []; _hmRender(); } })
      .catch(function () {});
  }
  setTimeout(function () { input.focus(); }, 50);
}

// The shared name list, same as the Calendar's (user, 2026-11-10): a click shows
// everyone A-Z, typing keeps the names that start with it; up/down light one,
// Enter opens it, Esc closes. Not opened on the auto-focus when Home loads.
function _hmMatches() {
  var el = document.getElementById('homeSearch');
  var q = (el ? el.value : '').trim().toLowerCase();
  return (_imRoster || []).filter(function (n) { return !q || n.toLowerCase().indexOf(q) === 0; });
}

function _hmOpen() {
  var list = document.getElementById('homeResults');
  if (!list || !list.hidden) return;
  list.hidden = false;
  _hmHi = 0;
  _hmRender();
  setTimeout(function () { document.addEventListener('mousedown', _hmOutside); }, 0);
}

function _hmClose() {
  var list = document.getElementById('homeResults');
  document.removeEventListener('mousedown', _hmOutside);
  if (list) { list.hidden = true; list.innerHTML = ''; }
}

function _hmOutside(e) {
  var box = document.querySelector('.home-search');
  if (!box || !box.contains(e.target)) _hmClose();
}

function _hmRender() {
  var list = document.getElementById('homeResults');
  if (!list || list.hidden) return;
  var m = _hmMatches();
  if (_hmHi >= m.length) _hmHi = 0;
  list.innerHTML = !_imRoster ? "<div class='cash-dd-opt'>Loading…</div>" :
    m.map(function (n, i) {
      return "<button type='button' class='cash-dd-opt" + (i === _hmHi ? ' hi' : '') + "' onmouseenter='_hmHover(" + i + ")' onclick='_hmPick(" + _auEsc(JSON.stringify(n)) + ")'>" + inqEsc(n) + "</button>";
    }).join('');
  var hi = list.querySelector('.hi');
  if (hi) hi.scrollIntoView({ block: 'nearest' });
}

function _hmInput() { _hmOpen(); _hmHi = 0; _hmRender(); }

// Hover only moves the highlight (redrawing under the mouse ate the click on the Calendar)
function _hmHover(i) {
  _hmHi = i;
  var opts = document.querySelectorAll('#homeResults .cash-dd-opt');
  for (var k = 0; k < opts.length; k++) opts[k].classList.toggle('hi', k === i);
}

function _hmKey(e) {
  var m = _hmMatches();
  if (e.key === 'Escape') { e.target.value = ''; _hmClose(); return; }
  if (!m.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _hmOpen(); _hmHi = Math.min(_hmHi + 1, m.length - 1); _hmRender(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _hmHi = Math.max(_hmHi - 1, 0); _hmRender(); }
  else if (e.key === 'Enter') { e.preventDefault(); _hmPick(m[Math.min(_hmHi, m.length - 1)]); }
}

function _hmPick(name) {
  document.getElementById('homeSearch').value = '';
  _hmClose();
  switchTab('import');
  _imOpenStudent(name);
}
