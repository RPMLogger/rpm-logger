// ─── FINISHED TAB ────────────────────────────────────────────────────────────
// The exit door of the student lifecycle. Pick a student who's stopping lessons,
// review the snapshot, then confirm in the Warning! popup, which lists exactly
// what will be deleted. Archives them to Eski and cleans them out of every
// active list. Two-step (preview → confirm) because the cleanup is irreversible.
// The goodbye review follow-up lives on the Reviews tab (tabs/reviews.js).
// Backend: getEndingPreview / finishStudent (RPM_Ending.js).

var _enState = {
  roster:   null,  // cached list of student names
  previews: {},    // name → getEndingPreview answer, loaded when its card first opens
  gone:     []     // terminated this visit (left out of the list until Reload)
};

function initEndingTab() {
  var url = getScriptUrl();
  var body = document.getElementById('endingBody');
  if (!url) {
    body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>';
    return;
  }
  if (!_enState.roster) _enLoadRoster();
  else _enRenderSearch();
}

function _enLoadRoster() {
  var url = getScriptUrl();
  var body = document.getElementById('endingBody');
  body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + '?action=getStudentRoster')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.success) { body.innerHTML = '<div class="empty-state">⚠ ' + (data.message || 'Could not load roster') + '</div>'; return; }
      _enState.roster = data.students || [];
      _enState.previews = {};
      _enState.gone = [];
      _enRenderSearch();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not connect.</div>'; });
}

// ── The list: one card per student, opened in place (2026-10-21) ─────────────
// Only the names load with the page. Clicking a card's name opens it and loads
// that student's numbers (getEndingPreview) the first time; any number of
// cards can be open at once, and an opened card reopens instantly until the
// tab reloads. Each open card has its own Terminate & archive ▸.
function _enRenderSearch() {
  var body = document.getElementById('endingBody');
  body.innerHTML =
    '<div id="enList" style="margin-top:32px"></div>' +
    '<div class="en-reload"><button class="link-btn" onclick="_enState.roster=null;initEndingTab()" data-tip="Instant.\nReloads the student list.">Reload</button></div>';
  var list = document.getElementById('enList');
  var roster = _enState.roster || [];
  var gone = _enState.gone || [];
  if (!roster.length) { list.innerHTML = '<div class="empty-state">None</div>'; return; }
  // Cards keep their roster index as their id (the open cards' buttons point
  // at it), so a terminated student is skipped here, never spliced out.
  list.innerHTML = roster.map(function (n, i) {
    if (gone.indexOf(n) !== -1) return '';
    return '<div class="en-card" id="enC-' + i + '">' +
      '<div class="en-card-head" onclick="_enToggle(' + i + ')">' +
        '<span class="en-card-n">' + _enEscHtml(n) + '</span>' +
        '<span class="en-card-a" id="enA-' + i + '">▾</span>' +
      '</div>' +
      '<div class="en-card-body" id="enB-' + i + '" style="display:none"></div>' +
    '</div>';
  }).join('');
}

function _enToggle(i) {
  var card = document.getElementById('enC-' + i), box = document.getElementById('enB-' + i), arrow = document.getElementById('enA-' + i);
  if (!card || !box) return;
  var open = box.style.display === 'none';
  box.style.display = open ? 'block' : 'none';
  card.classList.toggle('open', open);
  if (arrow) arrow.textContent = open ? '▴' : '▾';
  if (open && !box.innerHTML) _enLoadCard(i);
}

function _enLoadCard(i) {
  var name = (_enState.roster || [])[i];
  var box = document.getElementById('enB-' + i);
  if (!name || !box) return;
  if (_enState.previews[name]) { _enRenderCard(i, _enState.previews[name]); return; }
  box.innerHTML = '<div class="empty-state rpm-loading">Gathering data</div>';   // the portal's spinning ring
  fetch(getScriptUrl() + '?action=getEndingPreview&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { box.innerHTML = '<div class="en-note warn">⚠ ' + _enEscHtml(d.message || 'Failed') + '</div>'; return; }
      _enState.previews[name] = d;
      _enRenderCard(i, d);
    })
    .catch(function () { box.innerHTML = '<div class="en-note warn">❌ Could not reach the portal.</div>'; });
}

// The open card: the stats grid (what gets saved to the Lifetime & Review
// summary), then the Go live row at its foot.
function _enRenderCard(i, d) {
  var box = document.getElementById('enB-' + i);
  if (!box) return;
  var s = d.snapshot || {};
  var html = '<div class="inq-fields en-fields">';
  var sk = s.skips || {}, rs = s.resched || {};
  // The Lifetime & Review chart's columns, so what you see here is what
  // lands in the chart (the card keeps its own order, user 2026-10-22).
  // Blank values show as a dash.
  var rateNum = String(s.finalRate == null ? '' : s.finalRate).replace(/[^0-9.]/g, '');
  var dn = s.density;
  var rows = [
    ['Start Date', s.startDate], ['End Date', s.endDate], ['Lifetime', s.lifetime],
    ['# of Lessons', s.totalLessons],
    ['Skips (S)', sk.student || 0], ['Skips (T)', sk.teacher || 0], ['Skips (V)', sk.vacation || 0],
    ['Density', dn ? dn.pct + '%' : ''],
    ['Reschedules (S)', rs.student || 0], ['Reschedules (T)', rs.teacher || 0]
  ];
  // Left a review / Asked when show only when there's one, so a yes stands
  // out (user 2026-10-22). The summary row gets both columns either way.
  if (s.leftReview) rows.push(['Left a review', 'Yes']);
  if (s.askedWhen) rows.push(['Asked when', s.askedWhen]);
  rows.push(['# of Payments', s.paidChecks], ['Final Rate', rateNum ? '$' + rateNum : '']);
  // Amber: the values that say how long and how steadily they came.
  var AMBER = ['Start Date', 'Lifetime', 'Density'];
  // Gaps split the groups: dates, lessons, skips, density, reschedules,
  // review, payments.
  var GAP = ['# of Lessons', 'Skips (S)', 'Density', 'Reschedules (S)', s.leftReview ? 'Left a review' : 'Asked when', '# of Payments'];
  rows.map(function (row) {
    return [row[0], (row[1] === '' || row[1] == null) ? '—' : row[1]];
  }).forEach(function (row) {
    // The Inquiries card's field grid: dim label, value beside it.
    if (GAP.indexOf(row[0]) !== -1) html += '<span class="en-fgap"></span>';
    var tip = row[0] === 'Density'
      ? ' data-tip="' + (dn ? dn.had + ' of ' + dn.owed + ' lessons since Jul 8, 2026.\n' : 'Nothing to measure yet.\n') +
        'Teacher and vacation skips don\'t count against them."'
      : '';
    html += '<span class="inq-flabel">' + row[0] + '</span><span class="inq-fval' +
      (AMBER.indexOf(row[0]) !== -1 ? ' en-amber' : '') + '"' + tip + '>' + _enEscHtml(String(row[1])) + '</span>';
  });
  html += '</div>';
  // Travel's Go live row: what it does left, the red button right.
  html += '<div id="enS-' + i + '"></div>' +
    '<div class="en-foot en-card-foot">' +
      '<span class="en-foot-note">Archives first, then deletes. Cannot be undone.</span>' +
      '<button id="enGo-' + i + '" class="link-btn red en-go opens-window" onclick="_enAskFinish(' + i + ')" data-tip-wrap ' +
        'data-tip="Asks first.\nArchives them to Eski, then deletes them from every active list.\nCannot be undone.">' + _enGoLabel() + '</button>' +
    '</div>';
  box.innerHTML = html;
}

// ── Confirm (destructive) ────────────────────────────────────────────────────
// Travel's Go live popup: Warning! / Upon activation:, an arrow per point,
// both buttons red. Nothing runs until Terminate is pressed in it.
function _enAskFinish(i) {
  var d = _enState.previews[(_enState.roster || [])[i]];
  if (!d || !d.name) return;
  // The backend's exact step list (getEndingPreview willDelete), an arrow per
  // step; the dates line (↳) stays under its lessons line. It lives only here,
  // not on the page (user, 2026-10-21).
  var msg = '';
  (d.willDelete || []).forEach(function (line) {
    if (line.trim().indexOf('↳') === 0) msg += '\n' + line.trim();
    else msg += (msg ? '\n\n' : '') + (line.indexOf('⚠') === 0 ? line : '→ ' + line);
  });
  rpmConfirm({
    title: 'Warning!',
    subtitle: 'Upon activation:',
    message: msg + '\n\n→ This cannot be undone.',
    confirmLabel: 'Terminate',
    icon: WARN_ICON,
    danger: true,
    className: 'tv-golive-dlg'
  }).then(function (ok) { if (ok) _enConfirmFinish(i); });
}

function _enConfirmFinish(i) {
  var d = _enState.previews[(_enState.roster || [])[i]];
  if (!d || !d.name) return;
  var btn = document.getElementById('enGo-' + i);
  function reset() { if (btn) { btn.disabled = false; btn.classList.remove('tv-busy'); btn.classList.add('opens-window'); btn.innerHTML = _enGoLabel(); } }
  if (btn) { btn.disabled = true; btn.classList.add('tv-busy'); btn.classList.remove('opens-window'); btn.innerHTML = "<span class='rpm-loading'>Working</span>"; }   // Go live's spinner
  _enStatus(i, "<span class='rpm-loading is-inline'>Archiving then deleting</span>", 'var(--accent2)');
  fetch(getScriptUrl() + '?action=finishStudent&confirm=1&name=' + encodeURIComponent(d.name))
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.success) { _enStatus(i, '⚠ ' + (res.message || 'Failed — nothing may have been deleted.'), 'var(--accent)'); reset(); return; }
      _enRenderDone(i, res);
    })
    .catch(function () { _enStatus(i, '❌ Could not reach the portal.', 'var(--accent)'); reset(); });
}

// The card turns into the result: green edge when every step went through,
// red when one didn't. The student leaves the list on the next reload.
function _enRenderDone(i, res) {
  var card = document.getElementById('enC-' + i), box = document.getElementById('enB-' + i);
  if (!card || !box) return;
  // A step that failed must NOT read as a success. Everything used to render
  // with a green tick, so "Dropbox folder NOT deleted" looked identical to a
  // completed step and slipped past unnoticed.
  var failed = (res.steps || []).filter(function (st) { return st.indexOf('⚠') === 0; });
  card.classList.add(failed.length ? 'bad' : 'ok', 'done');
  var head = card.querySelector('.en-card-n');
  if (head) head.textContent = res.name + ' terminated';
  box.innerHTML =
    '<div class="en-scard-sub">Archived to Eski as "' + _enEscHtml(res.archivedAs || res.name) + '"</div>' +
    (res.steps || []).map(function (st) {
      var bad = st.indexOf('⚠') === 0;
      return '<div class="en-line' + (bad ? ' warn' : '') + '">' +
        (bad ? '' : '<span class="en-tick">✓</span> ') + _enEscHtml(st) + '</div>';
    }).join('') +
    (failed.length ? '<div class="en-note warn">' + failed.length + ' step' + (failed.length > 1 ? 's' : '') +
      ' did not complete. The archive and the sheet cleanup still went through; finish the flagged item by hand.</div>' : '');
  // The terminated student is gone: reopening the tab leaves them out, and
  // Reload fetches a roster without them anyway.
  delete _enState.previews[res.name];
  _enState.gone = (_enState.gone || []).concat([res.name]);
}

// ── helpers ──────────────────────────────────────────────────────────────────
// The Terminate button's face: Travel's Go live warning sign + the words.
function _enGoLabel() {
  return WARN_ICON.replace('width="13" height="12"', 'width="14" height="13"') + '<span>Terminate &amp; archive</span>';
}

function _enStatus(i, msg, color) {
  var st = document.getElementById('enS-' + i);
  if (!st) return;
  st.innerHTML = msg ? '<div class="en-status" style="border-left-color:' + (color || 'var(--muted)') + '">' + msg + '</div>' : '';
}

// Escape for HTML text / textarea content — only the markup-significant chars,
// so apostrophes and quotes stay literal (fixes the stray backslashes).
function _enEscHtml(s) {
  return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
