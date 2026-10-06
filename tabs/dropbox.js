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

// Student folder list, kept so the Students section can redraw without a fetch.
var _dbFolders = [];

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

function _dbAgeText(age) {
  if (age == null) return '';
  if (age === 0) return 'today';
  if (age === 1) return '1 day';
  return age + ' days';
}

// ── Window panels (2026-10-02) ──────────────────────────────────────────────
// Cards are for people: only the student folders stay cards. Everything else on
// the tab sits in the pop-up windows' frame (.win-panel in styles.css).
function _dbTitle(part, right, first) {
  return '<div class="settings-title"><span>' + (first || 'Dropbox') + '<span class="win-sub"> · ' + part + '</span></span>' + (right || '') + '</div>';
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
    // The tip sits on the checkbox (2026-10-02).
    return '<div class="db-check' + (ok ? ' on' : '') + '"><span class="db-tip" data-tip="' + tip + '"><i class="db-box"></i></span>' + label + '</div>';
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
    '<div class="win-note" style="margin:8px 0 0;line-height:1.2">' + _dbSize(sp.used) + ' of ' + _dbSize(sp.allocated) + '</div>' +   // the usual grey note, like 24 STUDENTS (2026-10-06, was a step dimmer)
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
        var inside = !f || f.empty ? 'Empty' : _dbSize(f.bytes);
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

// ── All files (2026-10-06) ──
// Every folder in one window, A–Z (students, then lesson folders): the folder
// name, then its files the way a card's Files list shows them, names only.
function _dbOpenAllFiles() {
  var cats = (_dbLastData && _dbLastData.categories) || [];
  var folders = _dbFolders.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).concat(cats);
  var html = folders.map(function (f) {
    var items = (f.items || []).map(function (it) { return { name: it.name, path: it.path }; });   // no bytes = names only
    return '<div class="db-all-folder">' +
      '<span class="db-file db-dir">' + DB_FOLDER_GLYPH + '<span style="text-transform:uppercase">' + inqEsc(f.name) + '</span></span>' +
      '<div class="db-all-in">' + (items.length ? _dbDetailsFilesHtml({ items: items }) : '<span class="db-all-empty">Empty</span>') + '</div>' +
    '</div>';
  }).join('');
  _dbCloseAllFiles();
  var overlay = document.createElement('div');
  overlay.id = 'dbAllModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;' +
                          'align-items:center;justify-content:center;padding:18px;overflow:auto';
  overlay.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:460px;width:100%;padding:28px;box-sizing:border-box;max-height:92vh;overflow:auto">' +
      '<div class="settings-title"><span>Dropbox<span class="win-sub"> · All files</span></span>' +
        '<button class="settings-close" onclick="_dbCloseAllFiles()">✕</button></div>' +
      '<div class="win-icon-row">' + DBX_ICON + '</div>' +
      '<div class="db-files db-all">' + html + '</div>' +
    '</div>';
  overlay.addEventListener('click', function (ev) { if (ev.target === overlay) _dbCloseAllFiles(); });
  document.body.appendChild(overlay);
}
function _dbCloseAllFiles() {
  var m = document.getElementById('dbAllModal');
  if (m) m.remove();
}

function _dbCloseFix() {
  var m = document.getElementById('dbFixModal');
  if (m) m.remove();
}

function renderDropbox(d) {
  _dbLastData = d;
  var body = document.getElementById('dropboxBody');
  var html = '';
  _dbFolders = d.folders || [];

  // ── Overview window: storage, audit, refresh ──
  // (The Student folders / Need attention / Empty boxes went 2026-10-02: the
  // space bar says the first, the cards below say the other two.)
  html += '<div class="db-section">' +
    // Refresh sits where a window's ✕ sits: re-reads folders, space and audit.
    _dbTitle('Overview', '<span class="db-ov-acts">' +
      '<button class="link-btn db-files-btn db-all-btn" onclick="_dbOpenAllFiles()" data-tip="Instant.\nOne list of every folder and the files in it.">' + DB_FOLDER_GLYPH + '<span>All files</span></button>' +   // 2026-10-06
      '<button class="win-refresh" onclick="initDropboxTab()" data-tip="Instant.\nRe-reads folders, storage and the audit from Dropbox.\nChanges nothing.">' + REFRESH_ICON + '</button></span>') +
    '<div class="win-icon-row">' + DBX_ICON + '</div>' +
    _dbSpaceHtml(d) +
    _dbAuditHtml(d.audit) +
    '<div id="dbActionStatus"></div>' +
  '</div>';

  // ── Students window: one card each (people), A–Z ──
  html += '<div id="dbStudentsSection">' + _dbStudentsHtml() + '</div>';

  // ── Lesson folders, last on the page (2026-10-03): non-student folders.
  // 2026-10-06: the students' card exactly (blue edge, logo, age, Files, Recover) ──
  if (d.categories && d.categories.length) {
    html += '<div class="db-section" id="dbLessonSection">' + _dbLessonHtml() + '</div>';
  }


  body.innerHTML = html;
  // Sent here from another tab to open one student (Import's Dropbox button).
  if (window._dbOpenAfterLoad) { var n = window._dbOpenAfterLoad; window._dbOpenAfterLoad = null; _dbOpenDetails(n); }
}

// One student folder card — click opens the folder in the local Dropbox app.
// Empty folders: a grey dash under the name, a green dash on the right; full ones show size + age.
function _dbCard(f) {
  // The card itself does nothing (2026-10-06); Details and Recover are the
  // only ways in. The age is in the edge's blue (was the title's red).
  // Cards inside the Students window (2026-10-02), two lines.
  // Left: name ↗ over size (a dash if empty). Right: Recover over the age,
  // under the window's SINCE ADDED (a green dash if empty).
  // Edge: the storage bar's steel blue (amber for full folders went 2026-10-03).
  var open = _dbOpenCard === f.name;
  return '<div class="db-card db-card-still' + (open ? ' db-card-open' : '') + '">' +
    '<div class="db-card-l"><span class="db-card-n">' + f.name + '</span>' +
      '<span class="db-card-s">' + (f.empty ? '—' : _dbSize(f.bytes)) + '</span>' +
      '<span class="db-card-rec">' + _dbRecoverBtn(f.name) + '</span></div>' +   // Recover, grey, under the size (2026-10-06)
    // Age on the name line, the buttons under it on the size line (2026-10-06, swapped).
    // Open in Finder: the Dropbox folder icon on top of the right side, across from the name (2026-10-06, was ↗ after the name).
    '<div class="db-card-r">' + _dbFinderBtn(f.name) + '<span class="db-card-a">' + (f.empty ? 'Empty' : _dbAgeText(f.ageDays)) + '</span>' +   // empty folder says Empty, not a dash (2026-10-06)
      '<span class="db-card-btns">' + _dbDetailsBtn(f.name) + '</span></div>' +
    (open ? _dbCardOpenHtml(f) : '') +
  '</div>';
}

// Small "Recover" button for a student card. stopPropagation so it doesn't also
// trigger the card's open-in-Dropbox click. Present on every student card.
function _dbRecoverBtn(name) {
  return '<button onclick="event.stopPropagation();_dbRecoverFolder(\'' + _dbEsc(name) + '\',this)" ' +
    'data-tip="Asks first.\nRestores this student’s deleted files from the last 30 days.\nResets their 14-day copy window.\nEmails them." ' +
    'class="link-btn">↺ Recover</button>';
}

// "Details" button: opens the student's Dropbox window (below). stopPropagation
// so the card's open-in-Finder click doesn't fire too.
// Open in Finder: the Dropbox logo (DBX_LOGO), no button box,
// top of the card's right side (2026-10-06).
function _dbFinderBtn(name) {
  return '<span role="button" tabindex="0" class="db-finder" onclick="event.stopPropagation();openDropboxLocalFolder(\'' + _dbEsc(name) + '\')" ' +
    'data-tip="Opens elsewhere.\nGoes to the folder in the Dropbox app.">' + DBX_LOGO + '</span>';
}
function _dbDetailsBtn(name) {
  var open = _dbOpenCard === name;
  return '<button onclick="event.stopPropagation();_dbToggleFiles(\'' + _dbEsc(name) + '\')" ' +
    'data-tip="Instant.\n' + (open ? 'Closes the card.' : 'Opens the card: their email and the files in their folder.') + '" ' +
    'class="link-btn blue db-files-btn' + (open ? ' pressed' : '') + '">' + DB_FOLDER_GLYPH + '<span>Files</span></button>';   // blue, with the open-folder icon (2026-10-06)
}

// ── A student's files, opened inside their card (2026-10-06) ──
var _dbOpenCard = null;    // name of the card that's open, or null
var _dbSharing = null;     // getDropboxSharing results by folder name, fetched once
var _dbLastData = null;    // last getDropboxFolders reply

// File bullet: the user's om-71 arrow-in circle (2026-10-03; picked over om-72).
var DB_BULLET_ARROW =
  '<svg class="db-bullet" viewBox="0 0 907.5 816.75" width="12" height="12" fill="currentColor" fill-rule="evenodd" aria-hidden="true">' +
  '<path d="M0 362.9h544.2v90.7H0z"/>' +
  '<path d="M417.5 217.5 576.3 376.2c17.7 17.7 17.7 46.4 0 64.1L417.5 599 353.4 534.9 480.1 408.3 353.4 281.6z"/>' +
  '<path d="M498.8 90.8c-123.2 0-230.2 70.2-282.8 173L135.3 222.5C202.9 90.6 340.2.1 498.8.1 724.3.1 907 182.8 907 408.3S724.3 816.4 498.8 816.4c-158.6 0-296-90.5-363.5-222.4l80.7-41.3c52.6 102.8 159.6 173 282.8 173 175.3 0 317.4-142.1 317.4-317.4S674.2 90.8 498.8 90.8z"/></svg>';

// Trying the user's om-73 plain right arrow as the bullet (2026-10-03).
var DB_BULLET_RIGHT =
  '<svg class="db-bullet" viewBox="0 0 907.5 690" width="12" height="10" fill="currentColor" aria-hidden="true">' +
  '<path d="M886.4 294.9 612.7 21.4C599.4 8.2 581.7.8 563 .8s-36.4 7.4-49.7 20.6c-13.3 13.3-20.7 31-20.7 49.7s7.4 36.4 20.7 49.7l153.5 153.5H70.4C31.6 274.3 0 305.9 0 344.6s31.6 70.3 70.4 70.3h596.4L513.2 568.4c-13.3 13.3-20.6 31-20.6 49.7s7.3 36.4 20.6 49.7c13.3 13.3 31 20.6 49.7 20.6s36.4-7.3 49.7-20.6l273.2-273c13.4-13 20.9-30.6 20.9-49.7.2-19.1-7-36.7-20.4-50.2z"/></svg>';

// Trying the user's om-75 page outline as the file bullet (2026-10-03): page
// for files, folder glyph for folders.
var DB_BULLET_PAGE =
  '<svg class="db-bullet" viewBox="0 0 907.5 1134" width="10" height="12" fill="currentColor" fill-rule="evenodd" aria-hidden="true">' +
  '<path d="M557.6 9.6H143A143 143 0 0 0 0 152.6v828.8a143 143 0 0 0 143 143h621a143 143 0 0 0 143-143V358.9a37 37 0 0 0-10.9-26.3L583.9 20.5a37 37 0 0 0-26.3-10.9z' +
  'M594.8 136.5 780.1 321.7H594.8z' +
  'M764 1050.1H143a68.6 68.6 0 0 1-68.7-68.7V152.6A68.6 68.6 0 0 1 143 83.9h377.4v275a37.2 37.2 0 0 0 37.2 37.2h275.1v585.3a68.6 68.6 0 0 1-68.7 68.7z"/></svg>';

// Files opens the card in place (2026-10-06, was a separate student page):
// Email / Since added / Size, then the files (Open in Finder is the icon on
// the card's button row). One card open
// at a time; Files again closes it. Other tabs open a card through here
// (Import's Dropbox button, via window._dbOpenAfterLoad).
function _dbOpenDetails(name) {
  _dbOpenCard = name;
  _dbRedrawStudents();
  var el = document.getElementById('dbCx');
  if (el && el.parentNode) el.parentNode.scrollIntoView({ block: 'start' });
  _dbCardEmail(name);
}
function _dbToggleFiles(name) {
  if (_dbOpenCard === name) { _dbOpenCard = null; _dbRedrawStudents(); return; }
  _dbOpenDetails(name);
}
function _dbRedrawStudents() {
  var sec = document.getElementById('dbStudentsSection');
  if (sec) sec.innerHTML = _dbStudentsHtml();
  var les = document.getElementById('dbLessonSection');   // lesson folders open the same way
  if (les) les.innerHTML = _dbLessonHtml();
}

// The open card's lower half.
function _dbCardOpenHtml(f) {
  var fields = [
    ['Email', '<span id="dbCxEmail">' + _dbEmailHtml(f.name) + '</span>'],
    ['Since added', f.empty ? '—' : _dbAgeText(f.ageDays)],
    ['Size', f.empty ? '—' : _dbSize(f.bytes)]
  ];
  return '<div class="db-cx" id="dbCx" onclick="event.stopPropagation()">' +
    '<div class="db-cx-head"><label class="field-label db-cx-t">Info</label></div>' +
    '<div class="inq-fields" style="margin-top:8px">' + fields.map(function (x) {
      return '<span class="inq-flabel">' + x[0] + '</span><span class="inq-fval">' + x[1] + '</span>';
    }).join('') + '</div>' +
    '<hr class="divider" style="margin:18px 0 14px">' +
    '<label class="field-label db-cx-t">Files</label>' +   // Info / Files: the section-heading type (2026-10-06)
    '<div class="db-files db-files-in">' + _dbDetailsFilesHtml(f) + '</div>' +
  '</div>';
}

// Who the folder is shared with, and the RPM-Counter email beside it when the
// two differ. One sharing check covers every folder, so it runs once per load.
function _dbEmailHtml(name) {
  if (!_dbSharing) return 'checking…';
  var r = _dbSharing[name];
  if (!r) return '—';
  var shared = (r.sharedWith || []).join(', ');
  var html = inqEsc(shared || 'Not shared');
  if (r.expected && r.expected.toLowerCase() !== (shared || '').toLowerCase())
    html += '<br><span style="color:rgba(255,255,255,0.24)">RPM-Counter: ' + inqEsc(r.expected) + '</span>';
  return html;
}
function _dbCardEmail(name) {
  if (_dbSharing) return;
  fetch(getScriptUrl() + '?action=getDropboxSharing')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      _dbSharing = {};
      (d.results || []).forEach(function (r) { _dbSharing[r.name] = r; });
      var el = document.getElementById('dbCxEmail');
      if (el && _dbOpenCard) el.innerHTML = _dbEmailHtml(_dbOpenCard);
    })
    .catch(function () { var el = document.getElementById('dbCxEmail'); if (el) el.textContent = '—'; });
}

// The folder's files, newest first, one per line: bullet, name, size · age.
// Files inside a subfolder sit under that folder's name, indented (needs the
// backend's item.path, portal v314+; without it everything lists flat).
// Folder lines: the user's om-74 open-folder outline (2026-10-03), same line
// weight as the om-75 page on the file lines.
var DB_FOLDER_GLYPH =
  '<svg class="db-bullet" viewBox="0 0 907.5 721.5" width="15" height="12" fill="currentColor" aria-hidden="true">' +
  '<path d="M894.1 233.8c-9.6-13-24.6-20.5-40.8-20.5h-80.7v-60.9c0-33.6-27.3-60.9-60.9-60.9H345.1L269.8 6.8C266.1 2.4 260.5 0 254.7 0H61.7C28.1 0 .8 27.3.8 60.9v599.2c0 33.6 27.3 60.9 60.9 60.9h668c22.4 0 42-14.4 48.5-35.9l123.6-406.2c4.8-15.6 1.9-32-7.7-45.1z' +
  'M41.4 60.9c0-11.2 9.2-20.3 20.3-20.3h183.8l75.2 84.6c3.8 4.4 9.3 6.8 15.1 6.8h375.7c11.2 0 20.3 9.1 20.3 20.3v60.9H185.8c-22.4 0-42 14.4-48.5 35.9L41.4 564.2z' +
  'M863 267 739.3 673.2c-1.3 4.3-5.2 7.2-9.6 7.2H62.3c-4.5 0-7-2.5-8.1-4.1-1.2-1.6-2.9-4.8-1.6-9L176.2 261.1c1.3-4.4 5.2-7.2 9.6-7.2h667.4c4.5 0 7 2.5 8.1 4.1 1.2 1.6 2.9 4.8 1.6 9z"/></svg>';

function _dbDetailsFilesHtml(f) {
  var items = (f && f.items) || [];
  if (!items.length) return 'Empty';
  function line(it, indent) {
    var age = it.modified ? Math.floor((Date.now() - new Date(it.modified).getTime()) / 86400000) : null;
    return '<span class="db-file"' + (indent ? ' style="padding-left:' + (20 * indent) + 'px"' : '') + '>' + DB_BULLET_PAGE +
      '<span>' + inqEsc(it.name) + '</span>' +
      (it.bytes == null ? '' :   // HW log lines: names only (the file may be gone)
        '<span style="color:rgba(255,255,255,0.24)">' + _dbSize(it.bytes) + (age == null ? '' : ' · ' + _dbAgeText(age)) + '</span>') + '</span>';
  }
  // Group by the top folder a file sits in (usually "HW - OCT 4"), in
  // order of each folder's newest file; inside it, the lesson's own folders
  // get their own heading, one step further in (2026-10-04).
  function dirOf(it) { var p = it.path || it.name, cut = p.lastIndexOf('/'); return cut > 0 ? p.slice(0, cut) : ''; }
  function head(name, indent, gap) {   // gap: a little room above a subfolder that follows another
    return '<span class="db-file db-dir' + (gap ? ' db-subgap' : '') + '"' + (indent ? ' style="padding-left:20px"' : '') + '>' + DB_FOLDER_GLYPH +
      '<span style="text-transform:uppercase">' + inqEsc(name) + '</span></span>';   // folder names in caps
  }
  var groups = [], byTop = {};
  items.forEach(function (it) {
    var dir = dirOf(it), cut = dir.indexOf('/');
    var top = cut > 0 ? dir.slice(0, cut) : dir, sub = cut > 0 ? dir.slice(cut + 1) : '';
    if (!byTop[top]) { byTop[top] = { top: top, subs: [], bySub: {} }; groups.push(byTop[top]); }
    var g = byTop[top];
    if (!g.bySub[sub]) { g.bySub[sub] = []; g.subs.push(sub); }
    g.bySub[sub].push(it);
  });
  // Inside a folder, files and subfolders by name (01, 02, 03 … as numbers,
  // 2026-10-06; was upload order).
  function byName(a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }); }
  function sorted(list) { return list.slice().sort(function (a, b) { return byName(a.name, b.name); }); }
  // Each group in its own block, a gap between groups.
  return groups.map(function (g) {
    if (!g.top) return '<span class="db-group">' + sorted(g.bySub['']).map(function (it) { return line(it, 0); }).join('') + '</span>';
    // Loose files in the top folder first, then each subfolder (by name), a
    // small gap between subfolders (2026-10-06).
    var subs = g.subs.slice().sort(function (a, b) { return (a ? 1 : 0) - (b ? 1 : 0) || byName(a, b); });
    return '<span class="db-group">' + head(g.top, false) + subs.map(function (sub, i) {
      return (sub ? head(sub, true, i > 0) : '') + sorted(g.bySub[sub]).map(function (it) { return line(it, sub ? 2 : 1); }).join('');
    }).join('') + '</span>';
  }).join('');
}

// Lesson (non-student) folders: the student card itself (2026-10-06, was a
// green-edged name + size card). Older backends send no empty/ageDays/items,
// so empty falls back to "no bytes".
function _dbLessonHtml() {
  var cats = (_dbLastData && _dbLastData.categories) || [];
  return _dbTitle('Lesson folders') + cats.map(function (c) {
    return _dbCard({ name: c.name, bytes: c.bytes, empty: c.empty != null ? c.empty : !c.bytes,
      ageDays: c.ageDays, items: c.items });
  }).join('');
}

// ── Students list ───────────────────────────────────────────────────────────
// Everyone A–Z, one look for all (2026-10-05: today-first order removed).
// SINCE ADDED heads the column of ages on the right, across from STUDENTS,
// instead of sitting on every card.
function _dbStudentsHtml() {
  var sorted = _dbFolders.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  var header =
    '<div class="db-cards-head">' +   // lines up with the cards' name and Recover
      _dbLbl(sorted.length + ' students') + _dbLbl('Since added') +
    '</div>';
  var cards = sorted.length
    ? sorted.map(function (f) { return _dbCard(f); }).join('')
    : _dbRow('None');
  // No window frame (2026-10-02), like every section on this tab: the
  // window's title and header, then the cards straight on the page.
  return '<div class="db-section">' + _dbTitle('Students') + header + cards + '</div>';
}

function _dbKey(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }

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
