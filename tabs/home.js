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

// Prefix of the full name only, like the old search: "Ga" → "Gail Greenwald", not "Jean Gabriel".
function _hmMatches() {
  var el = document.getElementById('homeSearch');
  var q = (el ? el.value : '').trim().toLowerCase();
  if (!q) return [];
  return (_imRoster || []).filter(function (n) { return n.toLowerCase().indexOf(q) === 0; }).slice(0, 8);
}

function _hmRender() {
  var box = document.getElementById('homeResults');
  if (!box) return;
  var m = _hmMatches();
  if (_hmHi >= m.length) _hmHi = 0;
  box.innerHTML = m.map(function (n, i) {
    return '<button class="home-res' + (i === _hmHi ? ' hi' : '') + '" onmouseenter="_hmHover(' + i + ')" onclick="_hmPick(' + _auEsc(JSON.stringify(n)) + ')">' + inqEsc(n) + '</button>';
  }).join('');
}

function _hmInput() { _hmHi = 0; _hmRender(); }
function _hmHover(i) { _hmHi = i; _hmRender(); }

// ↓/↑ move the highlight, Enter opens it, Esc clears the box.
function _hmKey(e) {
  var m = _hmMatches();
  if (e.key === 'Escape') { e.target.value = ''; _hmInput(); return; }
  if (!m.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _hmHi = Math.min(_hmHi + 1, m.length - 1); _hmRender(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _hmHi = Math.max(_hmHi - 1, 0); _hmRender(); }
  else if (e.key === 'Enter') { e.preventDefault(); _hmPick(m[Math.min(_hmHi, m.length - 1)]); }
}

function _hmPick(name) {
  document.getElementById('homeSearch').value = '';
  _hmInput();
  switchTab('import');
  _imOpenStudent(name);
}
