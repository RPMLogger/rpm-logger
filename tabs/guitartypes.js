// ─── TABS / GUITARTYPES.JS ──────────────────────────────────────────────────
// Data ▾ Guitar Types (2026-11-11): which guitar each student plays, in the
// Dashboard look (like Portal Usage). Every student on the Counter roster gets a
// dropdown: Acoustic / Electric / Both. A pick saves at once.
// Backend RPM_GuitarTypes.js: getGuitarTypes, setGuitarType (Counter "Guitar Types" tab).

var _gtData = null;
var GT_TYPES = ['Acoustic', 'Electric', 'Both'];

function _gtUrl() {
  return ((document.getElementById('scriptUrl') || {}).value || localStorage.getItem('scriptUrl') || '').trim();
}
function _gtEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function initGuitarTypesTab() {
  var body = document.getElementById('guitarTypesBody');
  if (!_gtData) body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  else _gtRender();
  var url = _gtUrl();
  if (!url) { if (!_gtData) body.innerHTML = '<div class="empty-state">No script address in Settings.</div>'; return; }
  fetch(url + '?action=getGuitarTypes').then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.success) throw new Error(d && d.message || 'No answer');
    _gtData = d.students || []; _gtRender();
  }).catch(function () {
    if (!_gtData) body.innerHTML = '<div class="empty-state">Couldn\'t load the guitar types.</div>';
  });
}

function _gtRow(l, v, lead) {
  return '<div class="ld-row' + (lead ? ' lead' : '') + '"><span class="ld-l">' + l + '</span><span class="ld-v">' + v + '</span></div>';
}

function _gtRender() {
  var body = document.getElementById('guitarTypesBody');
  if (!body || !_gtData) return;
  var n = { Acoustic: 0, Electric: 0, Both: 0, '': 0 };
  _gtData.forEach(function (s) { n[s.type in n ? s.type : '']++; });
  var count = GT_TYPES.map(function (t) { return _gtRow(t, n[t], true); }).join('') + _gtRow('Not set', n['']);

  var list = _gtData.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (s, i) {
    return '<div class="ld-row"><span class="ld-l">' + _gtEsc(s.name) + '</span><span class="ld-v">' +
      '<span class="gt-drop" data-i="' + _gtData.indexOf(s) + '">' +
        '<button type="button" class="gt-btn' + (s.type ? '' : ' unset') + '" onclick="_gtOpen(event, this)">' +
          '<span>' + (s.type || 'Not set') + '</span><span class="gt-caret">▾</span></button>' +
      '</span></span></div>';
  }).join('');

  body.innerHTML =
    '<div class="inq-dcard ld-card"><div class="ld-title">Count</div>' + count + '</div>' +
    '<div class="inq-dcard ld-card"><div class="ld-title">Students</div>' + (list || '<div class="ld-note">No students on the roster</div>') + '</div>';
}

function _gtClose() {
  document.querySelectorAll('#tab-guitartypes .gt-menu').forEach(function (m) { m.remove(); });
}

function _gtOpen(e, btn) {
  e.stopPropagation();
  var drop = btn.parentNode, had = drop.querySelector('.gt-menu');
  _gtClose();
  if (had) return;
  var s = _gtData[+drop.dataset.i];
  var m = document.createElement('div');
  m.className = 'gt-menu';
  GT_TYPES.forEach(function (t) {
    var o = document.createElement('button');
    o.type = 'button';
    o.textContent = t;
    if (t === s.type) o.className = 'on';
    o.onclick = function (ev) { ev.stopPropagation(); _gtClose(); _gtSet(s, t); };
    m.appendChild(o);
  });
  drop.appendChild(m);
}
document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.gt-drop')) _gtClose(); });

function _gtSet(s, t) {
  if (s.type === t) return;
  var was = s.type;
  s.type = t; _gtRender();
  var url = _gtUrl();
  fetch(url + '?action=setGuitarType&name=' + encodeURIComponent(s.name) + '&type=' + encodeURIComponent(t))
    .then(function (r) { return r.json(); })
    .then(function (d) { if (!d || !d.success) throw new Error(d && d.message || 'No answer'); })
    .catch(function () {
      s.type = was; _gtRender();
      rpmToast('fail', 'Unsuccessful', 'Couldn\'t save ' + s.name + '\'s guitar type');
    });
}
