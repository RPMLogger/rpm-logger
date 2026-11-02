// ─── TABS / GOALS.JS ────────────────────────────────────────────────────────
// Goals (2026-11-02): the Goal button on a student's Lessons page opens a
// window: the starting point (their inquiry's Level, Interests, Message and
// their tab's GOALS / INTERESTS), then a check-in every 3 months, the same five
// questions each time, newest first. Kept in "Goal Check-ins" (Counter sheet,
// RPM_Goals.js). Due 90 days after the last check-in, or after their start
// date when there is none: the Goal button turns red and the Today tab pops up
// the list once a day.

var GL_QS = [
  ['goals',   'Goals for the next 3 months'],
  ['feel',    'How do you feel about your playing?'],
  ['done',    'What did we achieve?'],
  ['notDone', "What didn't we achieve, and why?"],
  ['notes',   'Notes']
];
var _glDue = null;     // student key → { from, since, checked } once getGoalsDue is in
var _glDueBusy = false;
var _glCur = null;     // the open window's getGoals answer

function _glKey(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function _glDay(ymd) {
  var p = String(ymd || '').split('-');
  return p.length === 3 ? MONTHS[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0] : (ymd || '');
}

// Who is due (one read; done() after it). Redraws the open student page so its button colours.
function glDueLoad(done) {
  if (_glDueBusy) return;
  _glDueBusy = true;
  fetch(getScriptUrl() + '?action=getGoalsDue')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) return;
      _glDue = {};
      (d.due || []).forEach(function (x) { _glDue[_glKey(x.name)] = x; });
    })
    .catch(function () {})
    .then(function () {
      _glDueBusy = false;
      _glPaintBtns();
      if (done) done();
    });
}

// The Goal button on the student page's name card, red when a check-in is due.
function glBtnHtml(name) {
  if (!_glDue && !_glDueBusy) glDueLoad();
  var due = _glDue && _glDue[_glKey(name)];
  return '<button class="link-btn gl-btn opens-window' + (due ? ' gl-due' : '') + '" data-gl="' + _auEsc(name) + '" onclick="glOpen(' + _auEsc(JSON.stringify(name)) + ')" data-tip="Opens a window.\n' +
    (due ? 'Check-in due: ' + (due.checked ? 'last one ' : 'started ') + due.since + ' days ago.' : 'Goals and the 3-month check-ins.') + '" data-tip-left data-tip-wrap>Goal</button>';
}
function _glPaintBtns() {
  document.querySelectorAll('.gl-btn[data-gl]').forEach(function (b) { b.classList.toggle('gl-due', !!(_glDue && _glDue[_glKey(b.dataset.gl)])); });
}

// ── The window ──
function glOpen(name) {
  _glCur = null;
  var w = _stWin('glWin', inqEsc(name), 'Goals', '', '<div class="empty-state rpm-loading">Loading</div>');
  w.querySelector('.st-win').classList.add('gl-win');
  fetch(getScriptUrl() + '?action=getGoals&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!document.getElementById('glWin')) return;
      if (!d.success) { _glBody('<div class="empty-state" id="glFail"></div>'); rpmFail('glFail', d.message || 'unknown', 'center'); return; }
      _glCur = d;
      _glRender();
    })
    .catch(function () { _glBody('<div class="empty-state" id="glFail"></div>'); rpmFail('glFail', 'No answer from Google.', 'center'); });
}
function _glPanel() { var w = document.getElementById('glWin'); return w && w.querySelector('.st-win'); }
function _glBody(html) {
  var p = _glPanel();
  if (!p) return;
  [].slice.call(p.children, 1).forEach(function (el) { el.remove(); });   // keep the title row
  p.insertAdjacentHTML('beforeend', html);
}

function _glRender(editRow) {
  var d = _glCur;
  if (!d) return;
  var inq = d.inquiry || {}, pr = d.profile || {};
  var start = [
    ['Asked',     inq.date ? inq.date : ''],
    ['Level',     inq.level],
    ['Interests', inq.interests || pr.interests],
    ['Message',   inq.message],
    ['Goals',     pr.goals],
    ['Started',   d.startDate ? _glDay(d.startDate) : '']
  ].filter(function (f) { return f[1] && String(f[1]).trim(); });
  var startHtml = start.length
    ? '<div class="inq-fields">' + start.map(function (f) { return '<span class="inq-flabel">' + f[0] + '</span><span class="inq-fval">' + inqEsc(f[1]) + '</span>'; }).join('') + '</div>'
    : '<div class="gl-none">Nothing from their inquiry or tab</div>';

  // When it is due: "Due now" in red, else "Next Feb 1, 2027" in grey.
  var next = '';
  if (d.from) {
    var p = d.from.split('-'), nx = new Date(+p[0], +p[1] - 1, +p[2] + 90);
    next = d.due ? '<span class="gl-next gl-next-due">Check-in due</span>'
                 : '<span class="gl-next">Next ' + MONTHS[nx.getMonth()] + ' ' + nx.getDate() + ', ' + nx.getFullYear() + '</span>';
  }
  var adding = editRow === 0;
  var list = (d.checkins || []).map(function (c) {
    return editRow === c.row ? _glFormHtml(c) : _glCheckinHtml(c);
  }).join('');

  _glBody(
    _imSub('Starting point', '', ' gl-start', startHtml) +
    '<div class="db-cx-head im-sub-head gl-head"><label class="field-label db-cx-t im-sub-t">Check-ins</label>' + next +
      (adding || editRow ? '' : '<button class="link-btn gl-add" onclick="_glRender(0)" data-tip="Instant.\nThe five questions, dated today." data-tip-left>＋ New check-in</button>') + '</div>' +
    (adding ? _glFormHtml(null) : '') +
    (list || (adding ? '' : '<div class="db-panel im-list gl-none">No check-ins yet</div>'))
  );
  var first = _glPanel().querySelector('.gl-form textarea');
  if (first) { first.focus(); _glPanel().querySelectorAll('.gl-form textarea').forEach(_glGrow); }
}

function _glCheckinHtml(c) {
  return '<div class="db-panel im-list gl-card">' +
    '<div class="gl-card-head"><span class="gl-date">' + _glDay(c.date) + '</span>' +
      '<button class="link-btn gl-edit" onclick="_glRender(' + c.row + ')" data-tip="Instant.\nEdit this check-in." data-tip-left>Edit</button></div>' +
    GL_QS.map(function (q) {
      var v = String(c[q[0]] || '').trim();
      return '<div class="gl-q">' + q[1] + '</div><div class="gl-a' + (v ? '' : ' gl-a-empty') + '">' + (v ? inqEsc(v) : '—') + '</div>';
    }).join('') +
  '</div>';
}

// c = the check-in being edited, or null for a new one (dated today).
function _glFormHtml(c) {
  return '<div class="db-panel im-list gl-card gl-form" data-row="' + (c ? c.row : '') + '">' +
    '<div class="gl-card-head"><span class="gl-date">' + (c ? _glDay(c.date) : 'Today') + '</span></div>' +
    GL_QS.map(function (q) {
      return '<label class="gl-q" for="glF_' + q[0] + '">' + q[1] + '</label>' +
        '<textarea id="glF_' + q[0] + '" rows="2" class="rpm-field gl-field" oninput="_glGrow(this)">' + (c ? inqEsc(c[q[0]] || '') : '') + '</textarea>';
    }).join('') +
    '<div class="gl-acts"><button class="link-btn" onclick="_glRender()">Cancel</button>' +
      '<button class="link-btn gl-save" onclick="_glSave(this)" data-tip="Saves it to Goal Check-ins.">Save</button></div>' +
  '</div>';
}
function _glGrow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

function _glSave(btn) {
  var form = btn.closest('.gl-form'), panel = _glPanel(), d = _glCur;
  var params = { name: d.name };
  GL_QS.forEach(function (q) { params[q[0]] = form.querySelector('#glF_' + q[0]).value.trim(); });
  if (!GL_QS.some(function (q) { return params[q[0]]; })) { rpmToast('fail', 'Unsuccessful', 'Nothing written.'); return; }
  if (form.dataset.row) params.row = form.dataset.row;
  rpmBusy(panel, btn, true, 'Saving');
  _stCall(getScriptUrl(), 'saveGoal', params, function (r) {
    rpmBusy(panel, btn, false);
    var row = form.dataset.row ? +form.dataset.row : r.row;
    var c = { row: row, date: _tdYmd(), name: d.name };
    if (form.dataset.row) c = (d.checkins || []).filter(function (x) { return x.row === row; })[0] || c;
    GL_QS.forEach(function (q) { c[q[0]] = params[q[0]]; });
    if (!form.dataset.row) {
      d.checkins = [c].concat(d.checkins || []);
      d.from = c.date; d.due = false;
      if (_glDue) delete _glDue[_glKey(d.name)];
      _glPaintBtns();
    }
    _glRender();
  }, function (why) {
    rpmBusy(panel, btn, false);
    rpmToast('fail', 'Unsuccessful', why);
  });
}

// ── Today tab reminder: once a day, who is due (like the holiday pop-up) ──
var _glTodayDay = null;
function glDueCheck() {
  var day = _tdYmd();
  if (_glTodayDay === day) return;
  _glTodayDay = day;
  try { if (localStorage.getItem('glDueShown') === day) return; } catch (e) {}
  glDueLoad(function () {
    if (_tdYmd() !== day || !_glDue) return;
    var due = Object.keys(_glDue).map(function (k) { return _glDue[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (!due.length) return;
    if (document.querySelector('.rpm-dlg')) { _glTodayDay = null; setTimeout(glDueCheck, 1500); return; }   // the holiday pop-up first
    try { localStorage.setItem('glDueShown', day); } catch (e) {}
    rpmAlert({ title: 'Goal check-ins due', message: ' ', confirmLabel: 'OK', className: 'gl-due-dlg' });
    var box = document.querySelector('.rpm-dlg.gl-due-dlg');
    if (!box) return;
    box.querySelector('.rpm-dlg-msg').innerHTML = due.map(function (x) {
      return '<button class="link-btn gl-due-name" data-n="' + _auEsc(x.name) + '">' + inqEsc(x.name) + '</button>' +
        '<div class="gl-due-sub">' + (x.checked ? 'Last check-in ' : 'Started ') + x.since + ' days ago</div>';
    }).join('');
    box.querySelectorAll('.gl-due-name').forEach(function (b) {
      b.onclick = function () { var c = box.querySelector('.rpm-dlg-btn'); if (c) c.click(); glOpen(b.dataset.n); };
    });
    var ok = box.querySelector('.rpm-dlg-btn');
    if (ok) { ok.className = 'link-btn'; ok.blur(); }
  });
}
