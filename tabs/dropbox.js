// ─── DROPBOX TAB ─────────────────────────────────────────────────────────────
// Read-only "checking" dashboard: lists every student folder in Dropbox with
// its file count, size, and how long the files have been sitting there. Full
// folders (need attention) float to the top; empty folders collapse out of the
// way. Backend: action=getDropboxFolders (RPM_Dropbox.js).

// Default invite message (editable per student in the create panel).
var DB_INVITE_MSG = "IMPORTANT: Please read the [Dropbox Instructions] sent via email to see how we will be using Dropbox.";

// Student folder list + current sort, so the Students list can re-sort in place
// without re-fetching. Modes: 'az' (default, so a card never jumps when its
// folder fills or empties), 'attention', 'size'.
var _dbFolders = [];
var _dbSort = 'az';
// Who each folder is shared with, by folder name (null until _dbLoadShares
// answers). Read by _dbCard, so it survives re-sorts and re-checks.
var _dbShare = null;

function initDropboxTab() {
  var url = getScriptUrl();
  var body = document.getElementById('dropboxBody');
  if (!url) {
    body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>';
    return;
  }
  body.innerHTML = '<div class="empty-state">Checking Dropbox…</div>';
  fetch(url + '?action=getDropboxFolders')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        body.innerHTML = '<div class="empty-state">⚠ ' + (d.message || 'Could not load Dropbox') + '</div>';
        return;
      }
      renderDropbox(d);
    })
    .catch(function () {
      body.innerHTML = '<div class="empty-state">❌ Could not connect to Dropbox.</div>';
    });
}

function _dbSize(b) {
  if (!b) return '—';
  if (b >= 1073741824) return parseFloat((b / 1073741824).toFixed(2)) + ' GB';
  if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
  if (b >= 1024) return Math.round(b / 1024) + ' KB';
  return b + ' B';
}

// Age → color: <14d fresh (green), 14–29d aging (amber), 30d+ stale (red).
function _dbAgeColor(age) {
  if (age == null) return 'var(--muted)';
  if (age >= 30) return 'var(--accent)';
  if (age >= 14) return 'var(--accent2)';
  return 'var(--green)';
}
function _dbAgeText(age) {
  if (age == null) return '';
  if (age === 0) return 'today';
  if (age === 1) return '1 day';
  return age + ' days';
}

// ── Window panels (2026-10-02) ──────────────────────────────────────────────
// Cards are for people: only the student folders stay cards. Everything else on
// the tab sits in the pop-up windows' frame (.win-panel in styles.css).
function _dbTitle(part, right) {
  return '<div class="settings-title"><span>Dropbox<span class="win-sub"> · ' + part + '</span></span>' + (right || '') + '</div>';
}
function _dbLbl(t) { return '<label class="field-label">' + t + '</label>'; }
function _dbActs(html) {
  return '<div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:16px">' + html + '</div>';
}
function _dbRow(main, side) {
  return '<div class="win-row"><span class="win-row-main">' + main + '</span>' +
    (side ? '<span class="win-row-side">' + side + '</span>' : '') + '</div>';
}

// Audit: a plain list in one field box (2026-10-02), the Trial checklist's box
// in front of each line: ticked + grey when it passes, empty + white when it
// needs you. Whatever failed is listed under it, a grey note + a row per name.
function _dbAuditHtml(audit) {
  if (!audit) return '';
  var missing = audit.missing || [];
  var orphans = audit.orphans || [];
  var mismatches = audit.mismatches || [];
  var notShared = audit.notShared || [];
  var duplicates = audit.duplicates || [];
  function check(label, ok) {
    return '<div class="db-check' + (ok ? ' on' : '') + '">' + label + '</div>';
  }
  var html = '<div class="win-gap">' + _dbLbl('Folder audit') +
    '<div class="db-audit">' +
      check('Every student has a folder', !missing.length) +
      check('No leftover folders from old students', !orphans.length) +
      check('Folder names match the Counter', !mismatches.length) +
      check('Every folder is shared', !notShared.length) +
      check('No duplicate folders', !duplicates.length) +
    '</div>';
  if (missing.length || orphans.length || mismatches.length || notShared.length || duplicates.length) html += '<div style="height:12px"></div>';

  function s(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  if (mismatches.length) {
    html += '<div class="win-note">' + s(mismatches.length, 'spelling mismatch', 'spelling mismatches') +
      ' · the Dropbox name doesn’t match the Counter sheet</div>' +
      mismatches.map(function (mm) {
        return _dbRow('<b>' + mm.folder + '</b> → ' + mm.roster,
          '<button class="link-btn" onclick="_dbCorrectFolder(\'' + _dbEsc(mm.folder) + '\',\'' + _dbEsc(mm.roster) + '\',this)">Rename</button>');
      }).join('');
  }
  if (missing.length) {
    html += '<div class="win-note">' + s(missing.length, 'student', 'students') +
      ' missing a folder · create one and share it</div>' +
      missing.map(function (m, i) {
        var nm = _dbEsc(m.name);
        return _dbRow('<b>' + m.name + '</b>', '<button class="link-btn" onclick="_dbShowCreate(' + i + ')">' + ROW_ADD_ICON + '<span>Create folder</span></button>') +
          '<div id="dbCreate-' + i + '" style="display:none;margin:4px 0 14px">' +
            _dbLbl('Share with') +
            '<input id="dbCreateEmail-' + i + '" class="rpm-field" type="text" value="' + _dbEsc(m.email || '') + '" placeholder="student email">' +
            '<div style="margin-top:12px">' + _dbLbl('Invite message') + '</div>' +
            '<textarea id="dbCreateMsg-' + i + '" class="rpm-field" rows="3">' + _dbEsc(DB_INVITE_MSG) + '</textarea>' +
            _dbActs('<button class="link-btn bright" onclick="_dbCreateFolder(\'' + nm + '\',' + i + ',this)">Create &amp; share</button>') +
          '</div>';
      }).join('');
  }
  if (notShared.length) {
    html += '<div class="win-note">' + s(notShared.length, 'folder', 'folders') +
      ' not shared · the student can’t see their homework</div>' +
      notShared.map(function (n) { return _dbRow('<b>' + n + '</b>'); }).join('');
  }
  if (orphans.length) {
    html += '<div class="win-note">' + s(orphans.length, 'folder', 'folders') +
      ' with no student · Delete moves it to Dropbox trash (~30 days)</div>' +
      orphans.map(function (n) {
        return _dbRow('<b>' + n + '</b>',
          '<button class="link-btn" onclick="_dbDeleteFolder(\'' + _dbEsc(n) + '\',this)">' + TRASH_ICON + '<span>Delete</span></button>');
      }).join('');
  }
  if (duplicates.length) {
    html += '<div class="win-note">' + s(duplicates.length, 'possible duplicate', 'possible duplicates') +
      ' · one may be a stray</div>' +
      duplicates.map(function (dp) { return _dbRow('<b>' + dp.a + '</b> ↔ <b>' + dp.b + '</b>'); }).join('');
  }
  return html + '</div>';
}

// The whole Dropbox account, like Dropbox's own Plan page: one bar, used |
// free, "Using X of Y" under it. d.space = { used,
// allocated } in bytes from the backend (users/get_space_usage); nothing shows
// until it is there. "Your files" is everything that isn't a student folder.
function _dbSpaceHtml(d) {
  var sp = d.space;
  if (!sp || !sp.allocated) return '';
  var student = Math.min(d.totalBytes || 0, sp.used);
  var mine = Math.max(sp.used - student, 0);
  var w = sp.used ? Math.max(sp.used / sp.allocated * 100, 0.6) : 0;   // a sliver stays visible
  // One colour for everything used (2026-10-02); the split is in the hover.
  return '<div>' + _dbLbl('Storage') +
    '<div class="db-bar"><span class="db-bar-used" style="width:' + w + '%" ' +
      'data-tip="Your files · ' + _dbSize(mine) + '\nStudent folders · ' + _dbSize(student) + '"></span></div>' +
    '<div class="win-note" style="margin:8px 0 0;color:rgba(255,255,255,.3)">Using ' + _dbSize(sp.used) + ' of ' + _dbSize(sp.allocated) + '</div>' +   // a step dimmer than the usual grey note
  '</div>';
}

function renderDropbox(d) {
  var body = document.getElementById('dropboxBody');
  var html = '';

  // ── Overview window: storage, audit, refresh ──
  // (The Student folders / Need attention / Empty boxes went 2026-10-02: the
  // space bar says the first, the cards below say the other two.)
  html += '<div class="win-panel">' +
    // Refresh sits where a window's ✕ sits: re-reads folders, space and audit.
    _dbTitle('Overview', '<button class="win-refresh" onclick="initDropboxTab()" data-tip="Instant.\nRe-reads folders, storage and the audit from Dropbox.\nChanges nothing.">' + REFRESH_ICON + '</button>') +
    '<div class="win-icon-row">' + DBX_ICON + '</div>' +
    _dbSpaceHtml(d) +
    _dbAuditHtml(d.audit) +
    '<div id="dbActionStatus"></div>' +
  '</div>';

  // ── Teacher window: non-student folders (Video Lessons, AAA-*) ──
  if (d.categories && d.categories.length) {
    html += '<div class="win-panel">' + _dbTitle('Teacher folders') +
      d.categories.map(function (c) { return _dbTeacherRow(c); }).join('') +
    '</div>';
  }

  // ── Students: one card each (people), sortable in place ──
  _dbFolders = d.folders || [];
  html += '<div id="dbStudentsSection">' + _dbStudentsHtml() + '</div>';

  body.innerHTML = html;
  _dbLoadShares();
}

// One student folder card — click opens the folder in the local Dropbox app.
// Empty folders show a green "EMPTY" badge; full ones show file count + age.
function _dbCard(f) {
  var open = 'onclick="openDropboxLocalFolder(\'' + _dbEsc(f.name) + '\')" data-tip="Opens elsewhere.\nGoes to the folder in the Dropbox app." ';
  var col = f.empty ? 'var(--green)' : _dbAgeColor(f.ageDays);
  var chrome = 'style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' + col + ';' +
    'border-radius:10px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:14px 16px"';
  // The out arrow after the name: the whole card is a link out of the portal.
  var name = '<div style="font-family:\'Syne\',sans-serif;font-size:16px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + f.name + '<span class="out-ico">' + OPEN_OUT_ICON + '</span>' + _dbShareTag(f.name) + '</div>';
  if (f.empty) {
    return '<div ' + open + chrome + '>' +
      '<div style="min-width:0">' + name +
        '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);margin-top:3px">Empty</div>' +
      '</div>' +
      '<div style="flex-shrink:0;margin-left:12px;text-align:right">' +
        '<div style="display:inline-block;font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:1px;' +
          'color:var(--green);border:1px solid var(--green);border-radius:6px;padding:3px 9px">EMPTY</div>' +
        '<div>' + _dbRecoverBtn(f.name) + '</div>' +
      '</div>' +
    '</div>';
  }
  return '<div ' + open + chrome + '>' +
    '<div style="min-width:0">' + name +
      '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);margin-top:3px">' +
        f.files + ' file' + (f.files === 1 ? '' : 's') + ' · ' + _dbSize(f.bytes) +
      '</div>' +
    '</div>' +
    '<div style="text-align:right;flex-shrink:0;margin-left:12px">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:13px;font-weight:500;color:' + col + '">' + _dbAgeText(f.ageDays) + '</div>' +
      '<div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:3px">since added</div>' +
      _dbRecoverBtn(f.name) +
    '</div>' +
  '</div>';
}

// The address the folder is shared with, beside the student's name: what to
// tell a student who says nothing shows up in their Dropbox. Fills in a few
// seconds after the cards draw (_dbLoadShares); blank if shared with no one.
function _dbShareTag(name) {
  var r = _dbShare && _dbShare[name];
  if (!r || !r.sharedWith || !r.sharedWith.length) return '';
  return '<span style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);margin-left:12px">' + r.sharedWith.join(', ') + '</span>';
}

// Small "Recover" button for a student card. stopPropagation so it doesn't also
// trigger the card's open-in-Dropbox click. Present on every student card.
function _dbRecoverBtn(name) {
  return '<button onclick="event.stopPropagation();_dbRecoverFolder(\'' + _dbEsc(name) + '\',this)" ' +
    'data-tip="Asks first.\nRestores this student’s deleted files from the last 30 days.\nResets their 14-day copy window.\nEmails them." ' +
    'style="margin-top:7px;font-family:\'DM Mono\',monospace;font-size:10px;background:transparent;color:var(--muted);' +
    'border:1px solid var(--border);border-radius:6px;padding:3px 9px;cursor:pointer;white-space:nowrap">↺ Recover</button>';
}

// A teacher (non-student) folder: one row in the Teacher window, file count +
// size at its right end, no age/cleanup signal. Click opens it locally.
function _dbTeacherRow(c) {
  return '<div class="win-row opens" onclick="openDropboxLocalFolder(\'' + _dbEsc(c.name) + '\')" data-tip="Opens elsewhere.\nGoes to the folder in the Dropbox app.">' +
    '<span class="win-row-main"><b>' + c.name + '</b></span>' +
    '<span class="win-row-side">' + c.files + ' file' + (c.files === 1 ? '' : 's') + ' · ' + _dbSize(c.bytes) + OPEN_OUT_ICON + '</span>' +
  '</div>';
}

// ── Students list: sortable in place ────────────────────────────────────────
// Returns the Students header (with sort pills) + the cards in the current order.
function _dbStudentsHtml() {
  var sorted = _dbSortFolders(_dbFolders.slice(), _dbSort);
  var header =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;margin-bottom:10px">' +
      '<span class="section-label" style="margin:0">Students</span>' +
      '<span class="sort-opts">' + _dbPill('az', 'A–Z') + _dbPill('attention', 'Attention') + _dbPill('size', 'Size') + '</span>' +
    '</div>';
  var cards = sorted.length
    ? sorted.map(function (f) { return _dbCard(f); }).join('')
    : '<div class="empty-state">None</div>';
  return header + cards;
}

// Sort a copy of the student folders by the chosen mode.
function _dbSortFolders(arr, mode) {
  if (mode === 'az') {
    arr.sort(function (a, b) { return a.name.localeCompare(b.name); });
  } else if (mode === 'size') {
    arr.sort(function (a, b) { return (b.bytes || 0) - (a.bytes || 0) || a.name.localeCompare(b.name); });
  } else { // 'attention': folders with files first (oldest first), then empty
    arr.sort(function (a, b) {
      if (a.empty !== b.empty) return a.empty ? 1 : -1;
      if (!a.empty && !b.empty) return (b.ageDays || 0) - (a.ageDays || 0);
      return a.name.localeCompare(b.name);
    });
  }
  return arr;
}

// One sort choice: label + the Trial checklist's box, ticked on the order in use.
function _dbPill(mode, label) {
  return '<button class="sort-opt' + (_dbSort === mode ? ' on' : '') + '" onclick="_dbSetSort(\'' + mode + '\')">' + label + '</button>';
}

// Switch sort and re-render just the Students section (no re-fetch).
function _dbSetSort(mode) {
  _dbSort = mode;
  var sec = document.getElementById('dbStudentsSection');
  if (sec) sec.innerHTML = _dbStudentsHtml();
}

// Escape a string for safe use inside a single-quoted onclick attribute.
function _dbEsc(s) {
  return (s || '').toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Quiet inline status under the Overview window's fields (no popups): a grey
// line, red only when something failed.
function _dbStatus(msg, color) {
  var st = document.getElementById('dbActionStatus');
  if (!st) return;
  st.innerHTML = msg ? '<div class="win-note" style="margin:12px 0 0;color:' +
    (color === 'var(--accent)' ? 'var(--accent)' : 'var(--muted)') + '">' + msg + '</div>' : '';
}

// A button doing its job: dim, locked, its label swapped for "…ing…"; put back
// exactly as it was (icon and all) if the job fails.
function _dbBusy(btn, label) {
  if (!btn) return;
  btn._dbHtml = btn.innerHTML; btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'wait';
  btn.innerHTML = '<span>' + label + '</span>';
}
function _dbUnbusy(btn) {
  if (!btn || btn._dbHtml == null) return;
  btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; btn.innerHTML = btn._dbHtml;
}

// Generic write call: GET an action, refresh the tab on success, inline error otherwise.
// On failure the button passed as `btn` (if any) comes back as it was.
function _dbAction(params, btn) {
  var url = getScriptUrl();
  if (!url) return;
  _dbStatus('Working…');
  var qs = Object.keys(params).map(function (k) {
    return k + '=' + encodeURIComponent(params[k]);
  }).join('&');
  fetch(url + '?' + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.success) { initDropboxTab(); }
      else { _dbStatus('⚠ ' + (d.message || 'Failed'), 'var(--accent)'); _dbUnbusy(btn); }
    })
    .catch(function () { _dbStatus('❌ Could not reach the portal.', 'var(--accent)'); _dbUnbusy(btn); });
}

// Mismatch: rename the Dropbox folder to match the Counter sheet (no popup).
function _dbCorrectFolder(folderName, counterName, btn) {
  _dbBusy(btn, 'Renaming…');
  _dbAction({ action: 'renameDropboxFolder', from: folderName, to: counterName }, btn);
}

// Recover: put back a student's recently-deleted files (last 30 days), give them a
// fresh 14-day window, and email them. Reports the count inline rather than doing a
// silent refresh, so you can see how many came back.
function _dbRecoverFolder(name, btn) {
  var url = getScriptUrl();
  if (!url) return;
  rpmConfirm({
    title: 'Recover files?',
    confirmLabel: 'Recover',
    icon: REDO_ICON
  }).then(function (ok) { if (ok) _dbRecoverGo(name, btn, url); });
}

function _dbRecoverGo(name, btn, url) {
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'wait'; btn.textContent = 'Recovering…'; }
  _dbStatus('Recovering ' + name + '’s deleted files…', 'var(--accent2)');
  fetch(url + '?action=restoreDropboxFolder&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; btn.textContent = '↺ Recover'; }
      if (!d.success) { _dbStatus('⚠ ' + (d.message || 'Recover failed'), 'var(--accent)'); return; }
      if (d.restored > 0) {
        _dbStatus('✓ Put ' + d.restored + ' file' + (d.restored === 1 ? '' : 's') + ' back for ' + name + ' — fresh 14-day window, email sent.', 'var(--green)');
        setTimeout(initDropboxTab, 2400);
      } else {
        _dbStatus('Nothing to recover for ' + name + ' — no deleted files in the last 30 days.', 'var(--muted)');
      }
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; btn.textContent = '↺ Recover'; }
      _dbStatus('❌ Could not reach the portal.', 'var(--accent)');
    });
}

// Orphan: unshare + delete the folder (one click; goes to Dropbox trash).
function _dbDeleteFolder(folderName, btn) {
  _dbBusy(btn, 'Deleting…');
  _dbAction({ action: 'deleteDropboxFolder', name: folderName }, btn);
}

// Missing: reveal the email field for a student.
function _dbShowCreate(i) {
  var el = document.getElementById('dbCreate-' + i);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// Missing: create the folder and share it with the entered email (no popup).
function _dbCreateFolder(name, i, btn) {
  var input = document.getElementById('dbCreateEmail-' + i);
  var msgEl = document.getElementById('dbCreateMsg-' + i);
  var email = input ? input.value.trim() : '';
  var message = msgEl ? msgEl.value.trim() : '';
  if (!email || email.indexOf('@') === -1) { _dbStatus('Enter a valid email to share the folder with.', 'var(--accent)'); return; }
  _dbBusy(btn, 'Creating…');
  _dbAction({ action: 'createDropboxFolder', name: name, email: email, message: message }, btn);
}

// Who each folder is shared with (one Dropbox call per folder, so a few
// seconds): fetched quietly after the tab draws, then the student cards redraw
// with the address beside each name. A failure just leaves the names bare.
function _dbLoadShares() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getDropboxSharing')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) return;
      _dbShare = {};
      (d.results || []).forEach(function (r) { _dbShare[r.name] = r; });
      var sec = document.getElementById('dbStudentsSection');
      if (sec) sec.innerHTML = _dbStudentsHtml();
    })
    .catch(function () {});
}
