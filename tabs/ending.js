// ─── FINISHED TAB ────────────────────────────────────────────────────────────
// The exit door of the student lifecycle. Pick a student who's stopping lessons,
// review a full snapshot + a review-gate + the exact list of what will be
// deleted, then confirm. Archives them to Eski and cleans them out of every
// active list. Two-step (preview → confirm) because the cleanup is irreversible.
// Backend: getEndingPreview / finishStudent (RPM_Ending.js).

var _enState = {
  roster:  null,   // cached list of student names
  filter:  '',     // current search text
  preview: null    // last loaded preview (so confirm reuses the name)
};

function initEndingTab() {
  var url = getScriptUrl();
  var body = document.getElementById('endingBody');
  if (!url) {
    body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>';
    return;
  }
  _enState.preview = null;
  if (!_enState.roster) _enLoadRoster();
  else _enRenderSearch();
}

function _enLoadRoster() {
  var url = getScriptUrl();
  var body = document.getElementById('endingBody');
  body.innerHTML = '<div class="empty-state">Loading students…</div>';
  fetch(url + '?action=getStudentRoster')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.success) { body.innerHTML = '<div class="empty-state">⚠ ' + (data.message || 'Could not load roster') + '</div>'; return; }
      _enState.roster = data.students || [];
      _enRenderSearch();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not connect.</div>'; });
}

// ── Step 1: pick a student ───────────────────────────────────────────────────
function _enRenderSearch() {
  var body = document.getElementById('endingBody');
  body.innerHTML =
    '<div style="font-size:11px;color:var(--muted);margin-bottom:12px">' +
      'Finishing a student archives them to Eski and removes them from every active list. Pick who\'s stopping.' +
    '</div>' +
    '<input id="enSearch" type="text" placeholder="Search a student…" oninput="_enFilter(this.value)" ' +
      'style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:8px;' +
      'padding:11px 14px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:14px;margin-bottom:12px">' +
    '<div id="enList"></div>' +
    '<hr class="divider" style="margin-top:20px"><button class="refresh-btn" onclick="_enState.roster=null;initEndingTab()">⟳ Reload roster</button>';
  _enRenderList();
  var s = document.getElementById('enSearch');
  if (s) { s.value = _enState.filter; s.focus(); }
}

function _enFilter(v) { _enState.filter = v; _enRenderList(); }

function _enRenderList() {
  var list = document.getElementById('enList');
  if (!list) return;
  var f = (_enState.filter || '').toLowerCase();
  var matches = (_enState.roster || []).filter(function (n) { return n.toLowerCase().indexOf(f) !== -1; });
  if (!matches.length) { list.innerHTML = '<div class="empty-state">No match.</div>'; return; }
  list.innerHTML = matches.map(function (n) {
    var nm = _enEsc(n);
    return '<div onclick="_enLoadPreview(\'' + nm + '\')" ' +
      'style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;cursor:pointer;' +
      'display:flex;align-items:center;justify-content:space-between;padding:13px 16px">' +
      '<span style="font-family:\'Syne\',sans-serif;font-size:16px;color:var(--text)">' + n + '</span>' +
      '<span style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted)">Finish →</span>' +
    '</div>';
  }).join('');
}

// ── Step 2: preview (read-only) ──────────────────────────────────────────────
function _enLoadPreview(name) {
  var url = getScriptUrl();
  var body = document.getElementById('endingBody');
  body.innerHTML = '<div class="empty-state">Gathering ' + name + '’s record…</div>';
  fetch(url + '?action=getEndingPreview&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state">⚠ ' + (d.message || 'Failed') + '</div>' + _enBackBtn(); return; }
      _enState.preview = d;
      _enRenderPreview(d);
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not reach the portal.</div>' + _enBackBtn(); });
}

function _enRenderPreview(d) {
  var s = d.snapshot || {};
  var body = document.getElementById('endingBody');
  var html = '';

  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
    '<div style="font-family:\'Syne\',sans-serif;font-size:22px;color:var(--text)">' + d.name + '</div>' +
    '<button class="refresh-btn" style="width:auto;margin:0;padding:6px 12px" onclick="_enRenderSearch()">← back</button>' +
  '</div>';

  // ── Review gate ──
  if (d.reviewGate && d.reviewGate.needsAsk) {
    html += '<div style="border-left:3px solid var(--accent);background:var(--surface2);border:1px solid var(--border);' +
      'border-radius:10px;padding:12px 16px;margin-bottom:16px">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:15px;color:var(--text)">⭐ No review yet' +
        (d.reviewGate.askedWhen ? ' · asked ' + _enEsc(d.reviewGate.askedWhen) : ' · never asked') + '</div>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:4px">This is your last clean moment to ask. Send a request before you archive them.</div>' +
    '</div>';
  } else if (d.reviewGate) {
    html += '<div style="border-left:3px solid var(--green);padding:2px 0 2px 14px;margin-bottom:16px;' +
      'font-family:\'DM Mono\',monospace;font-size:12px;color:var(--muted)"><span style="color:var(--green)">✓</span> Already left a review</div>';
  }

  // ── Snapshot card (what gets saved to Eski) ──
  html += '<div class="section-label" style="margin-bottom:8px">Snapshot → Eski</div>';
  html += '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:6px 16px;margin-bottom:18px">';
  var sk = s.skips || {};
  [
    ['Email', s.email], ['Phone', s.phone],
    ['Gender / Age', [s.gender, s.age].filter(Boolean).join(' · ')],
    ['City', s.city], ['Level', s.level],
    ['Started', s.startDate], ['Last lesson', s.lastLesson],
    ['Lifetime', s.lifetime], ['Total lessons', s.totalLessons],
    ['Paid checks', s.paidChecks], ['Frequency', s.frequency],
    ['Skips (S/T/V)', (sk.student || 0) + ' / ' + (sk.teacher || 0) + ' / ' + (sk.vacation || 0)]
  ].forEach(function (row) {
    html += '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--border)">' +
      '<span style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">' + row[0] + '</span>' +
      '<span style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text);text-align:right">' +
        (row[1] === '' || row[1] == null ? '—' : _enEsc(String(row[1]))) + '</span>' +
    '</div>';
  });
  html += '</div>';

  // ── What will be deleted ──
  html += '<div class="section-label" style="margin-bottom:8px">Then deletes</div>';
  html += '<div style="border-left:3px solid var(--accent);padding:2px 0 2px 14px;margin-bottom:18px">' +
    (d.willDelete || []).map(function (line) {
      var warn = line.indexOf('⚠') === 0;
      return '<div style="font-family:\'DM Mono\',monospace;font-size:12px;padding:3px 0;color:' +
        (warn ? 'var(--accent)' : 'var(--text)') + '">' + _enEsc(line) + '</div>';
    }).join('') +
  '</div>';

  // ── Inline status + confirm ──
  html += '<div id="enActionStatus"></div>';
  html += '<button id="enConfirmBtn" onclick="_enConfirmFinish()" ' +
    'style="width:100%;box-sizing:border-box;background:var(--accent);color:#fff;border:none;border-radius:10px;' +
    'padding:14px;font-family:\'Syne\',sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px">' +
    '⚑ Finish & Archive ' + d.name + '</button>';
  html += '<div style="font-size:10px;color:var(--muted);text-align:center">Archives first, then deletes. Cannot be undone.</div>';

  body.innerHTML = html;
}

// ── Step 3: confirm (destructive) ────────────────────────────────────────────
function _enConfirmFinish() {
  var d = _enState.preview;
  if (!d || !d.name) return;
  var url = getScriptUrl();
  var btn = document.getElementById('enConfirmBtn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'wait'; btn.textContent = 'Archiving & cleaning up…'; }
  _enStatus('Working… archiving then deleting.', 'var(--accent2)');
  fetch(url + '?action=finishStudent&confirm=1&name=' + encodeURIComponent(d.name))
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.success) {
        _enStatus('⚠ ' + (res.message || 'Failed — nothing may have been deleted.'), 'var(--accent)');
        if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = 'pointer'; btn.textContent = '⚑ Finish & Archive ' + d.name; }
        return;
      }
      _enRenderDone(res);
    })
    .catch(function () {
      _enStatus('❌ Could not reach the portal.', 'var(--accent)');
      if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = 'pointer'; btn.textContent = '⚑ Finish & Archive ' + d.name; }
    });
}

function _enRenderDone(res) {
  // The finished student is gone — drop them from the cached roster.
  if (_enState.roster) _enState.roster = _enState.roster.filter(function (n) { return n !== res.name; });
  var body = document.getElementById('endingBody');
  var html = '<div style="font-family:\'Syne\',sans-serif;font-size:22px;color:var(--text);margin-bottom:4px">✓ ' + res.name + ' finished</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:16px">Archived to Eski as "' + _enEsc(res.archivedAs || res.name) + '"</div>';
  html += '<div style="border-left:3px solid var(--green);padding:2px 0 2px 14px;margin-bottom:18px">' +
    (res.steps || []).map(function (st) {
      return '<div style="font-family:\'DM Mono\',monospace;font-size:12px;padding:3px 0;color:var(--text)">' +
        '<span style="color:var(--green)">✓</span> ' + _enEsc(st) + '</div>';
    }).join('') +
  '</div>';
  html += '<button class="refresh-btn" onclick="_enRenderSearch()">← Finish another student</button>';
  body.innerHTML = html;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function _enStatus(msg, color) {
  var st = document.getElementById('enActionStatus');
  if (!st) return;
  st.innerHTML = msg ? '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' +
    (color || 'var(--muted)') + ';border-radius:8px;padding:10px 14px;margin-bottom:12px;' +
    'font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text)">' + msg + '</div>' : '';
}

function _enBackBtn() {
  return '<button class="refresh-btn" style="margin-top:14px" onclick="_enRenderSearch()">← back</button>';
}

function _enEsc(s) {
  return (s || '').toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
