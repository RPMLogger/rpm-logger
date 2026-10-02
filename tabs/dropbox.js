// ─── DROPBOX TAB ─────────────────────────────────────────────────────────────
// Read-only "checking" dashboard: lists every student folder in Dropbox with
// its file count, size, and how long the files have been sitting there. Full
// folders (need attention) float to the top; empty folders collapse out of the
// way. Backend: action=getDropboxFolders (RPM_Dropbox.js).

// Default invite message (editable per student in the create panel).
var DB_INVITE_MSG = "IMPORTANT: Please read the [Dropbox Instructions] sent via email to see how we will be using Dropbox.";
// Default body of the "Dropbox Instructions" email that follows the invite
// (house email: signature + logo, the PDF attached). Editable per student.
var DB_EMAIL_MSG = "Here are the instructions on how to manage OUR SHARED Dropbox folder.";
var DB_PDF_LINK = "https://github.com/RPMLogger/rpm-logger/blob/main/Dropbox%20Instructions%20-%202026.pdf";

// Student folder list + current sort, so the Students list can re-sort in place
// without re-fetching. Modes: 'az' (default, so a card never jumps when its
// folder fills or empties), 'attention', 'size'.
var _dbFolders = [];
var _dbSort = 'az';

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
// needs you. If any line is unticked, a Fix button under the box opens the
// Fix window (_dbOpenFix) - nothing about the problems sits on the page.
var _dbAudit = null;
function _dbAuditHtml(audit) {
  _dbAudit = audit;
  if (!audit) return '';
  var missing = audit.missing || [];
  var orphans = audit.orphans || [];
  var mismatches = audit.mismatches || [];
  var notShared = audit.notShared || [];
  var duplicates = audit.duplicates || [];
  // What each line checks lives in its tooltip (2026-10-02), not in the
  // Fix window.
  function check(label, ok, tip) {
    // The tip sits on the text, not the line: the line's ::before is the box.
    return '<div class="db-check' + (ok ? ' on' : '') + '"><span data-tip="' + tip + '">' + label + '</span></div>';
  }
  var html = '<div class="win-gap">' + _dbLbl('Folder audit') +
    '<div class="db-audit">' +
      check('Every student has a folder', !missing.length, 'Every student in the RPM-Counter has a Dropbox folder.') +
      check('No leftover folders from old students', !orphans.length, 'No folder belongs to someone who is no longer in the RPM-Counter.') +
      check('Folder names match the RPM-Counter', !mismatches.length, 'Each folder is spelled exactly like the student’s name in the RPM-Counter.') +
      check('Every folder is shared', !notShared.length, 'Each student’s folder is shared with them, so they can see their homework.') +
      check('No duplicate folders', !duplicates.length, 'No two folders with nearly the same name, like Huda Ayaz and Huda Ayaz 2.') +
    '</div>';
  // Anything unticked: one Fix button under the list opens the Fix window.
  if (missing.length || orphans.length || mismatches.length || notShared.length || duplicates.length) {
    html += _dbActs('<button class="link-btn" onclick="_dbOpenFix()" data-tip="Opens a window.\nEach unticked line with its fix.">' + REPAIR_ICON + '<span>Fix</span></button>');
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

// ── The Fix window ──────────────────────────────────────────────────────────
// Same frame as the Text window. One section per unticked audit line, in the
// list's order, each with its fix. A fix that works closes the window and
// re-reads the tab; one that fails says so on the window's last line.
function _dbOpenFix() {
  var a = _dbAudit || {};
  var missing = a.missing || [], orphans = a.orphans || [], mismatches = a.mismatches || [],
      notShared = a.notShared || [], duplicates = a.duplicates || [];
  // Title names the problem (2026-10-02): "Fix · Student missing folder".
  // One kind of problem → its name is the title and the section skips its
  // label; several → "Fix · Folder audit" and each section keeps its label.
  var kinds = [missing, orphans, mismatches, notShared, duplicates].filter(function (x) { return x.length; }).length;
  var title = 'Folder audit';
  function sec(label, note, body) {
    if (kinds === 1) title = label;
    var first = !html;
    return '<div' + (first ? '' : ' class="win-gap"') + '>' + (kinds > 1 ? _dbLbl(label) : '') + (note ? '<div class="win-note" style="margin:0 0 8px">' + note + '</div>' : '') + body + '</div>';
  }
  var html = '';
  if (missing.length) {
    html += sec('Missing folder', '',
      missing.map(function (m, i) {
        // Create & share: makes the folder, shares it, Dropbox emails the
        // student an invite carrying the invite message, then the house email
        // (this body + the Dropbox Instructions PDF) follows from you.
        return '<div style="margin-bottom:14px">' +
          _dbLbl('Folder name') + _dbRow(m.name) +   // field grey, like the boxes under it
          '<div style="margin-top:20px">' + _dbLbl('Share with') + '</div>' +
          '<input id="dbCreateEmail-' + i + '" class="rpm-field" type="text" value="' + _dbEsc(m.email || '') + '" placeholder="student email">' +
          '<div style="margin-top:20px">' + _dbLbl('Dropbox invite message') + '</div>' +
          '<textarea id="dbCreateMsg-' + i + '" class="rpm-field" rows="3">' + _dbEsc(DB_INVITE_MSG) + '</textarea>' +
          '<div style="margin-top:20px">' + _dbLbl('Email · Dropbox Instructions') + '</div>' +
          '<textarea id="dbCreateBody-' + i + '" class="rpm-field" rows="3">' + _dbEsc(DB_EMAIL_MSG) + '</textarea>' +
          '<div style="margin-top:20px">' + _dbLbl('Attachments') + '</div>' +
          '<div class="tl-docs"><a class="tl-doc" href="' + DB_PDF_LINK + '" target="_blank" rel="noopener"><span>Dropbox Instructions - 2026.pdf</span>' + OPEN_OUT_ICON + '</a></div>' +
          _dbActs('<button class="link-btn" onclick="_dbPreviewEmail(\'dbCreateBody-' + i + '\',\'dbPreview-' + i + '\')">Preview</button>' +
            '<button class="link-btn bright" onclick="_dbCreateFolder(\'' + _dbEsc(m.name) + '\',' + i + ',this)">' + ROW_ADD_ICON + '<span>Create &amp; share</span></button>') +
          '<div id="dbPreview-' + i + '"></div>' +
        '</div>';
      }).join(''));
  }
  if (orphans.length) {
    html += sec('Leftover folder', '',
      orphans.map(function (n) {
        // What's inside, from the folder list already loaded, so you know
        // what you're deleting before you delete it.
        var f = (_dbFolders || []).filter(function (x) { return x.name === n; })[0];
        var inside = !f || f.empty ? 'Empty' : f.files + ' file' + (f.files === 1 ? '' : 's') + ' · ' + _dbSize(f.bytes);
        return '<div style="margin-bottom:14px">' +
          _dbLbl('Folder name') + _dbRow(n) +
          '<div style="margin-top:20px">' + _dbLbl('Inside') + '</div>' + _dbRow(inside) +
          _dbActs('<button class="link-btn" onclick="openDropboxLocalFolder(\'' + _dbEsc(n) + '\')"><span>Open in Finder</span>' + OPEN_OUT_ICON + '</button>' +
            '<button class="link-btn bright" onclick="_dbDeleteFolder(\'' + _dbEsc(n) + '\',this)" ' +
              'data-tip="Instant.\nUnshares the folder and moves it to Dropbox trash.\nRecoverable from Dropbox for about 30 days." data-tip-wrap data-tip-left>' + TRASH_ICON + '<span>Delete</span></button>') +
        '</div>';
      }).join(''));
  }
  if (mismatches.length) {
    html += sec('Name mismatch', '',
      mismatches.map(function (mm) {
        return '<div style="margin-bottom:14px">' +
          _dbLbl('Dropbox folder') + _dbRow(mm.folder) +
          '<div style="margin-top:20px">' + _dbLbl('RPM-Counter') + '</div>' + _dbRow(mm.roster) +
          _dbActs('<button class="link-btn" onclick="openDropboxLocalFolder(\'' + _dbEsc(mm.folder) + '\')"><span>Open in Finder</span>' + OPEN_OUT_ICON + '</button>' +
            '<button class="link-btn bright" onclick="_dbCorrectFolder(\'' + _dbEsc(mm.folder) + '\',\'' + _dbEsc(mm.roster) + '\',this)" ' +
              'data-tip="Instant.\nRenames the Dropbox folder to the RPM-Counter spelling.\nIts files and sharing stay as they are." data-tip-wrap data-tip-left><span>Rename</span></button>') +
        '</div>';
      }).join(''));
  }
  if (notShared.length) {
    html += sec('Folder not shared', '',
      notShared.map(function (n, k) {
        var em = (a.notSharedEmails || {})[n] || '';
        return '<div style="margin-bottom:14px">' +
          _dbLbl('Folder name') + _dbRow(n) +
          '<div style="margin-top:20px">' + _dbLbl('Share with') + '</div>' +
          '<input id="dbShareEmail-' + k + '" class="rpm-field" type="text" value="' + _dbEsc(em) + '" placeholder="student email">' +
          '<div style="margin-top:20px">' + _dbLbl('Dropbox invite message') + '</div>' +
          '<textarea id="dbShareMsg-' + k + '" class="rpm-field" rows="3">' + _dbEsc(DB_INVITE_MSG) + '</textarea>' +
          '<div style="margin-top:20px">' + _dbLbl('Email · Dropbox Instructions') + '</div>' +
          '<textarea id="dbShareBody-' + k + '" class="rpm-field" rows="3">' + _dbEsc(DB_EMAIL_MSG) + '</textarea>' +
          '<div style="margin-top:20px">' + _dbLbl('Attachments') + '</div>' +
          '<div class="tl-docs"><a class="tl-doc" href="' + DB_PDF_LINK + '" target="_blank" rel="noopener"><span>Dropbox Instructions - 2026.pdf</span>' + OPEN_OUT_ICON + '</a></div>' +
          _dbActs('<button class="link-btn" onclick="openDropboxLocalFolder(\'' + _dbEsc(n) + '\')"><span>Open in Finder</span>' + OPEN_OUT_ICON + '</button>' +
            '<button class="link-btn" onclick="_dbPreviewEmail(\'dbShareBody-' + k + '\',\'dbSharePreview-' + k + '\')">Preview</button>' +
            '<button class="link-btn bright" onclick="_dbShareFolder(\'' + _dbEsc(n) + '\',' + k + ',this)" ' +
              'data-tip="Instant.\nShares the folder with this email.\nDropbox emails them the invite, then the Instructions email follows." data-tip-wrap data-tip-left><span>Share</span></button>') +
          '<div id="dbSharePreview-' + k + '"></div>' +
        '</div>';
      }).join(''));
  }
  if (duplicates.length) {
    // Each folder with who it's shared with: that's how you tell which one
    // the student really uses, or what to ask them. Emails fill in after
    // the window opens (_dbFillDupEmails).
    html += sec('Duplicate folders', '',
      duplicates.map(function (dp, k) {
        function one(n, slot) {
          return _dbLbl('Folder ' + slot) +
            '<div class="win-row"><span class="win-row-main">' + n + '</span>' +
              '<span class="win-row-side" data-dup-email="' + n.replace(/"/g, '&quot;') + '">checking…</span></div>' +
            _dbActs('<button class="link-btn" onclick="openDropboxLocalFolder(\'' + _dbEsc(n) + '\')"><span>Open in Finder</span>' + OPEN_OUT_ICON + '</button>' +
              '<button class="link-btn" onclick="_dbDeleteFolder(\'' + _dbEsc(n) + '\',this)" ' +
                'data-tip="Instant.\nUnshares the folder and moves it to Dropbox trash.\nRecoverable from Dropbox for about 30 days." data-tip-wrap data-tip-left>' + TRASH_ICON + '<span>Delete</span></button>');
        }
        return '<div style="margin-bottom:14px">' + one(dp.a, 1) + '<div style="margin-top:20px">' + one(dp.b, 2) + '</div></div>';
      }).join(''));
  }
  if (!html) return;

  _dbCloseFix();
  var overlay = document.createElement('div');
  overlay.id = 'dbFixModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;' +
                          'align-items:center;justify-content:center;padding:18px;overflow:auto';
  overlay.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:460px;width:100%;padding:28px;box-sizing:border-box;max-height:92vh;overflow:auto">' +
      '<div class="settings-title"><span>Fix<span style="color:var(--muted);font-weight:400"> · ' + title + '</span></span>' +
        '<button class="settings-close" onclick="_dbCloseFix()">✕</button></div>' +
      '<div class="win-icon-row">' + FIX_WIN_ICON + '</div>' +
      html +
      '<div id="dbFixStatus"></div>' +
    '</div>';
  overlay.addEventListener('click', function (ev) { if (ev.target === overlay) _dbCloseFix(); });
  document.body.appendChild(overlay);
  if (duplicates.length) _dbFillDupEmails();
}

// Who each duplicate folder is shared with (one Dropbox call per folder, a
// few seconds), written beside its name in the Fix window.
function _dbFillDupEmails() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getDropboxSharing')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var by = {};
      (d.results || []).forEach(function (r) { by[r.name] = r.sharedWith || []; });
      document.querySelectorAll('#dbFixModal [data-dup-email]').forEach(function (el) {
        var em = by[el.getAttribute('data-dup-email')];
        el.textContent = em && em.length ? em.join(', ') : 'not shared';
      });
    })
    .catch(function () {
      document.querySelectorAll('#dbFixModal [data-dup-email]').forEach(function (el) { el.textContent = '—'; });
    });
}

// The "Dropbox Instructions" email as it will look: the house shell around
// whatever is in the box now (previewFirstContact wraps any body), on the
// same white card the Trial windows use (_tlPreviewHtml, trial.js).
function _dbPreviewEmail(bodyId, boxId) {
  var url = getScriptUrl();
  var box = document.getElementById(boxId);
  var bodyEl = document.getElementById(bodyId);
  if (!url || !box || !bodyEl) return;
  box.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + '?action=previewFirstContact&body=' + encodeURIComponent(bodyEl.value))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { box.innerHTML = _dbRow('⚠ ' + (d.message || 'No preview')); return; }
      box.innerHTML = _tlPreviewHtml('Dropbox Instructions', d.html) +
        '<div class="win-note" style="margin:6px 0 0">+ Dropbox Instructions - 2026.pdf attached</div>';
    })
    .catch(function () { box.innerHTML = _dbRow('❌ Could not reach Google'); });
}

function _dbCloseFix() {
  var m = document.getElementById('dbFixModal');
  if (m) m.remove();
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
}

// One student folder card — click opens the folder in the local Dropbox app.
// Empty folders show a green "EMPTY" badge; full ones show file count + age.
function _dbCard(f) {
  var open = 'onclick="openDropboxLocalFolder(\'' + _dbEsc(f.name) + '\')" data-tip="Opens elsewhere.\nGoes to the folder in the Dropbox app." ';
  var col = f.empty ? 'var(--green)' : _dbAgeColor(f.ageDays);
  var chrome = 'style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' + col + ';' +
    'border-radius:10px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:14px 16px"';
  // The out arrow after the name: the whole card is a link out of the portal.
  var name = '<div style="font-family:\'Syne\',sans-serif;font-size:16px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + f.name + '<span class="out-ico">' + OPEN_OUT_ICON + '</span></div>';
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
  var st = document.getElementById('dbFixStatus') || document.getElementById('dbActionStatus');
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
      if (d.success) { _dbCloseFix(); initDropboxTab(); }
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

// Not shared: share the existing folder with the email in the Fix window;
// Dropbox sends the invite, then the Instructions email follows.
function _dbShareFolder(name, k, btn) {
  var input = document.getElementById('dbShareEmail-' + k);
  var msgEl = document.getElementById('dbShareMsg-' + k);
  var email = input ? input.value.trim() : '';
  if (!email || email.indexOf('@') === -1) { _dbStatus('Enter a valid email to share the folder with.', 'var(--accent)'); return; }
  _dbBusy(btn, 'Sharing…');
  var bodyEl = document.getElementById('dbShareBody-' + k);
  _dbAction({ action: 'shareDropboxFolder', name: name, email: email, message: msgEl ? msgEl.value.trim() : '',
              emailBody: bodyEl ? bodyEl.value.trim() : '' }, btn);
}

// Missing: create the folder and share it with the entered email (no popup).
function _dbCreateFolder(name, i, btn) {
  var input = document.getElementById('dbCreateEmail-' + i);
  var msgEl = document.getElementById('dbCreateMsg-' + i);
  var bodyEl = document.getElementById('dbCreateBody-' + i);
  var email = input ? input.value.trim() : '';
  var message = msgEl ? msgEl.value.trim() : '';
  if (!email || email.indexOf('@') === -1) { _dbStatus('Enter a valid email to share the folder with.', 'var(--accent)'); return; }
  _dbBusy(btn, 'Creating…');
  _dbAction({ action: 'createDropboxFolder', name: name, email: email, message: message,
              emailBody: bodyEl ? bodyEl.value.trim() : '' }, btn);
}


// ─── DROPBOX ▾ TEMPLATES ────────────────────────────────────────────────────
// A static reading tab (like Secretary ▾ Templates, no backend calls): every
// email the Dropbox side sends, for a sample student, each in its own window
// on the same white card as the Fix window's Preview. The wording is copied
// from RPM_Dropbox.gs on Oct 2 2026 - change it here too if it changes there.
var DBX_TEMPLATES = [
  { name: 'Dropbox invite', from: 'Dropbox',
    when: 'Create & share or Share, in the Fix window. Dropbox writes and sends this one; your invite message is the note inside it.',
    note: DB_INVITE_MSG },
  { name: 'Dropbox Instructions', subject: 'Dropbox Instructions', attach: 'Dropbox Instructions - 2026.pdf',
    when: 'Right after the Dropbox invite (Create & share, Share). The text can be edited in the Fix window each time.',
    body: DB_EMAIL_MSG },
  { name: 'New homework', subject: 'New Homework in Your Dropbox — Copy Within 14 Days',
    when: 'Automatically, when the daily clean finds a new file in a student’s folder.',
    body: 'Hi Sam Lee,\n\nI just added new homework to our shared Dropbox folder. Please copy it to your device within 14 days — after that it’s cleared out automatically.' },
  { name: 'Files put back', subject: 'I’ve Put Your Dropbox Files Back — Please Copy Them Within 14 Days',
    when: 'After Recover on a student card puts files back (only if something came back).',
    body: 'Hi Sam Lee,\n\nI’ve put your homework files back in our shared Dropbox folder this time. Please make sure you copy them to your device within 14 days — after that they’ll be cleared out again automatically.\n\nThanks!' },
  { name: 'Clean-out warning', subject: 'Heads Up — I’m Clearing Out Our Dropbox Folder',
    when: 'One time only, run by hand from the script editor before auto-clean started. Already sent; kept here for the record.',
    body: 'Hi Sam Lee,\n\nI’m starting to automatically tidy up our shared Dropbox folder. Starting July 1, anything older than 15 days will be cleared out. If there’s something in there you want to keep, please download it to your device before then.\n\nGoing forward I’ll email you whenever I add new homework.' }
];

function initDropboxTemplatesTab() {
  var box = document.getElementById('dbxTemplatesBody');
  if (!box || box.dataset.done) return;
  box.innerHTML = DBX_TEMPLATES.map(function (t) {
    return '<div class="win-panel">' +
      '<div class="settings-title"><span>Email<span class="win-sub"> · ' + t.name + '</span></span></div>' +
      '<div class="win-icon-row">' + EMAIL_WIN_ICON + '</div>' +
      _dbLbl('Goes out') + '<div class="field-text" style="margin-bottom:20px">' + t.when + '</div>' +
      (t.from === 'Dropbox'
        ? _dbLbl('Invite message') + '<div class="win-row"><span>' + inqEsc(t.note) + '</span></div>'   // wraps: the whole message, not cut off
        : _dbLbl('Preview') + _tlPreviewHtml(t.subject, _dbHouseHtml(t.body)) +
          (t.attach ? '<div class="win-note" style="margin:6px 0 0">+ ' + t.attach + ' attached</div>' : '')) +
    '</div>';
  }).join('');
  box.dataset.done = '1';
}

// The house email built here from plain text, the way rpmSendHouseEmail_
// does it (paragraphs on blank lines, then name / RED PICK MUSIC / logo), so
// this tab needs no call to Google. _tlPreviewHtml turns the logo into a box.
function _dbHouseHtml(text) {
  var paras = String(text).split(/\n\s*\n/).map(function (p) {
    return "<p style='margin:0 0 14px 0;'>" + inqEsc(p).replace(/\n/g, '<br>') + '</p>';
  }).join('');
  return paras + "<p style='margin:18px 0 0 0;'>Bilgehan Tuncer<br>RED PICK MUSIC</p>" +
    "<div style='margin-top:8px'><img src='cid:logo' alt='Red Pick Music'></div>";
}
