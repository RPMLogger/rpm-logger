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

function _dbCloseFix() {
  var m = document.getElementById('dbFixModal');
  if (m) m.remove();
}

function renderDropbox(d) {
  _dbLastData = d;
  var body = document.getElementById('dropboxBody');
  var html = '';

  // ── Overview window: storage, audit, refresh ──
  // (The Student folders / Need attention / Empty boxes went 2026-10-02: the
  // space bar says the first, the cards below say the other two.)
  html += '<div class="db-section">' +
    // Refresh sits where a window's ✕ sits: re-reads folders, space and audit.
    _dbTitle('Overview', '<button class="win-refresh" onclick="initDropboxTab()" data-tip="Instant.\nRe-reads folders, storage and the audit from Dropbox.\nChanges nothing.">' + REFRESH_ICON + '</button>') +
    '<div class="win-icon-row">' + DBX_ICON + '</div>' +
    _dbSpaceHtml(d) +
    _dbAuditHtml(d.audit) +
    '<div id="dbActionStatus"></div>' +
  '</div>';

  // ── Students window: one card each (people), A–Z ──
  _dbFolders = d.folders || [];
  html += '<div id="dbStudentsSection">' + _dbStudentsHtml() + '</div>';

  // ── Lesson folders, last on the page (2026-10-03): non-student folders, as
  // cards like the students' but with a green edge ──
  if (d.categories && d.categories.length) {
    html += '<div class="db-section">' + _dbTitle('Lesson folders') +
      d.categories.map(function (c) { return _dbTeacherRow(c); }).join('') +
    '</div>';
  }


  body.innerHTML = html;
}

// One student folder card — click opens the folder in the local Dropbox app.
// Empty folders: a grey dash under the name, a green dash on the right; full ones show size + age.
function _dbCard(f) {
  var open = 'onclick="openDropboxLocalFolder(\'' + _dbEsc(f.name) + '\')" data-tip="Opens elsewhere.\nGoes to the folder in the Dropbox app." ';
  var col = 'var(--accent)';   // every age (and empty dash) in the DROPBOX title's red, 2026-10-03
  // Cards inside the Students window (2026-10-02), two lines.
  // Left: name ↗ over size (a dash if empty). Right: Recover over the age,
  // under the window's SINCE ADDED (a green dash if empty).
  // Edge: the storage bar's steel blue; amber when the folder has files (2026-10-03).
  return '<div class="db-card' + (f.empty ? '' : ' db-card-full') + '" ' + open + '>' +
    '<div class="db-card-l"><span class="db-card-n">' + f.name + '</span>' +
      '<span class="db-card-s">' + (f.empty ? '—' : _dbSize(f.bytes)) + '</span></div>' +
    '<div class="db-card-r"><span class="db-card-btns">' + _dbDetailsBtn(f.name) + _dbRecoverBtn(f.name) + '</span>' +
      '<span class="db-card-a" style="color:' + col + '">' + (f.empty ? '—' : _dbAgeText(f.ageDays)) + '</span></div>' +
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
function _dbDetailsBtn(name) {
  return '<button onclick="event.stopPropagation();_dbOpenDetails(\'' + _dbEsc(name) + '\')" ' +
    'data-tip="Opens a window.\nTheir email, the files in their folder, homework upload and Log lesson." ' +
    'class="link-btn">Details</button>';
}

// ── Student page (2026-10-03) ────────────────────────────────────────────────
// One student's Dropbox on its own page (Back returns to the list), laid out
// like an Initiate card: label column + value column, buttons along the bottom.
// Email the folder is shared with, the files in it now, a homework drop zone
// (same uploader as Home) and Log lesson (the same Log window Home opens).
var _dbDt = null;          // { name, date } of the open page
var _dbSharing = null;     // getDropboxSharing results by folder name, fetched once
var _dbLastData = null;    // last getDropboxFolders reply, so Back redraws without a fetch

// File bullet: the user's om-71 arrow-in circle (2026-10-03; picked over om-72).
var DB_BULLET_ARROW =
  '<svg class="db-bullet" viewBox="0 0 907.5 816.75" width="12" height="12" fill="currentColor" fill-rule="evenodd" aria-hidden="true">' +
  '<path d="M0 362.9h544.2v90.7H0z"/>' +
  '<path d="M417.5 217.5 576.3 376.2c17.7 17.7 17.7 46.4 0 64.1L417.5 599 353.4 534.9 480.1 408.3 353.4 281.6z"/>' +
  '<path d="M498.8 90.8c-123.2 0-230.2 70.2-282.8 173L135.3 222.5C202.9 90.6 340.2.1 498.8.1 724.3.1 907 182.8 907 408.3S724.3 816.4 498.8 816.4c-158.6 0-296-90.5-363.5-222.4l80.7-41.3c52.6 102.8 159.6 173 282.8 173 175.3 0 317.4-142.1 317.4-317.4S674.2 90.8 498.8 90.8z"/></svg>';

function _dbOpenDetails(name) {
  _dbDt = { name: name, date: new Date() };
  _dbRenderDetails();
  window.scrollTo(0, 0);
  _dbDetailsEmail(name);
}

function _dbRenderDetails() {
  var body = document.getElementById('dropboxBody');
  if (!body || !_dbDt) return;
  var name = _dbDt.name;
  var f = _dbFolders.filter(function (x) { return x.name === name; })[0] || { empty: true, items: [] };
  var fields = [
    ['Email', '<span id="dbDtEmail">checking…</span>'],
    ['Since added', f.empty ? '—' : _dbAgeText(f.ageDays)],
    ['Size', f.empty ? '—' : _dbSize(f.bytes)],
    ['Files', '<span id="dbDtFiles">' + _dbDetailsFilesHtml(f) + '</span>']
  ];
  body.innerHTML =
    '<div style="margin-bottom:14px"><button class="link-btn" onclick="_dbCloseDetails()" data-tip="Instant.\nBack to the Dropbox list.">' + ARROW_ICON + '<span>Back</span></button></div>' +
    '<div class="inq-dcard db-page' + (f.empty ? '' : ' db-card-full') + '">' +
      '<div class="inq-drow"><span class="inq-chan">Dropbox</span></div>' +
      '<div class="inq-name-line"><span class="inq-name">' + name + '</span></div>' +
      '<div class="inq-fields">' + fields.map(function (x) {
        return '<span class="inq-flabel">' + x[0] + '</span><span class="inq-fval">' + x[1] + '</span>';
      }).join('') + '</div>' +
      '<div class="inq-acts">' +
        '<span style="margin-right:auto">' + _dbRecoverBtn(name) + '</span>' +
        '<button class="link-btn" onclick="openDropboxLocalFolder(_dbDt.name)" data-tip="Opens elsewhere.\nGoes to the folder in the Dropbox app."><span>Open in Finder</span>' + OPEN_OUT_ICON + '</button>' +
      '</div>' +
      '<div class="inq-acts">' + _dbDetailsLogHtml() + '</div>' +
    '</div>' +
    // Homework upload under the card, as on Home: big drop zone, Browse folder under it.
    '<div style="margin-top:18px">' + _dbDetailsUploadHtml(name) + '</div>';
}

function _dbCloseDetails() {
  _dbDt = null;
  if (_dbLastData) renderDropbox(_dbLastData); else initDropboxTab();
}

// Who the folder is shared with, and the RPM-Counter email beside it when the
// two differ. One sharing check covers every folder, so it runs once per load.
function _dbDetailsEmail(name) {
  function show(r) {
    var el = document.getElementById('dbDtEmail');
    if (!el || !_dbDt || _dbDt.name !== name) return;
    if (!r) { el.textContent = '—'; return; }
    var shared = (r.sharedWith || []).join(', ');
    var html = inqEsc(shared || 'Not shared');
    if (r.expected && r.expected.toLowerCase() !== (shared || '').toLowerCase())
      html += '<br><span style="color:rgba(255,255,255,0.24)">RPM-Counter: ' + inqEsc(r.expected) + '</span>';
    el.innerHTML = html;
  }
  if (_dbSharing) { show(_dbSharing[name]); return; }
  fetch(getScriptUrl() + '?action=getDropboxSharing')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      _dbSharing = {};
      (d.results || []).forEach(function (r) { _dbSharing[r.name] = r; });
      show(_dbSharing[name]);
    })
    .catch(function () { show(null); });
}

// The folder's files, newest first, one per line: bullet, name, size · age.
// Files inside a subfolder sit under that folder's name, indented (needs the
// backend's item.path, portal v314+; without it everything lists flat).
var DB_FOLDER_GLYPH = DBX_ICON.replace('class="win-icon"', 'class="db-bullet"').replace('width="36" height="30"', 'width="14" height="12"');

function _dbDetailsFilesHtml(f) {
  var items = (f && f.items) || [];
  if (!items.length) return 'Empty';
  function line(it, indent) {
    var age = it.modified ? Math.floor((Date.now() - new Date(it.modified).getTime()) / 86400000) : null;
    return '<span class="db-file"' + (indent ? ' style="padding-left:20px"' : '') + '>' + DB_BULLET_ARROW +
      '<span>' + inqEsc(it.name) + '</span>' +
      '<span style="color:rgba(255,255,255,0.24)">' + _dbSize(it.bytes) + (age == null ? '' : ' · ' + _dbAgeText(age)) + '</span></span>';
  }
  // Group by the folder a file sits in, in order of each folder's newest file.
  var groups = [], byDir = {};
  items.forEach(function (it) {
    var p = it.path || it.name, cut = p.lastIndexOf('/');
    var dir = cut > 0 ? p.slice(0, cut) : '';
    if (!byDir[dir]) { byDir[dir] = { dir: dir, items: [] }; groups.push(byDir[dir]); }
    byDir[dir].items.push(it);
  });
  return groups.map(function (g) {
    if (!g.dir) return g.items.map(function (it) { return line(it, false); }).join('');
    return '<span class="db-file">' + DB_FOLDER_GLYPH + '<span>' + inqEsc(g.dir) + '</span></span>' +
      g.items.map(function (it) { return line(it, true); }).join('');
  }).join('');
}

// Drop zone + Browse folder, the Home tab's look (student.js).
function _dbDetailsUploadHtml(name) {
  var idle = '⬆ Drag homework files or folders here to upload to ' + inqEsc(name) + '’s Dropbox';
  return '<div id="dbDtDrop" data-idle="' + idle + '" onclick="document.getElementById(\'dbDtFileIn\').click()" ' +
      'ondragover="event.preventDefault();this.style.borderColor=\'#5b9dff\';this.style.background=\'rgba(91,157,255,0.08)\'" ' +
      'ondragleave="this.style.borderColor=\'rgba(91,157,255,0.4)\';this.style.background=\'transparent\'" ' +
      'ondrop="_dbDetailsDrop(event)" ' +
      'style="padding:60px 16px;border:1.5px dashed rgba(91,157,255,0.4);border-radius:8px;text-align:center;' +
      'font-family:\'DM Mono\',monospace;font-size:12px;color:var(--muted);cursor:pointer;transition:border-color .15s,background .15s">' + idle + '</div>' +
    '<button onclick="document.getElementById(\'dbDtFolderIn\').click()" data-tip="Opens a file picker.\nUploads a whole folder, subfolders kept." ' +
      'style="width:100%;margin-top:8px;padding:9px;font-size:12px;background:transparent;color:var(--text);border:1px solid rgba(91,157,255,0.4);border-radius:6px;cursor:pointer">📂 Browse folder</button>' +
    '<input type="file" id="dbDtFileIn" multiple style="display:none" onchange="_dbDetailsPicked(this, false)">' +
    '<input type="file" id="dbDtFolderIn" multiple webkitdirectory style="display:none" onchange="_dbDetailsPicked(this, true)">';
}

function _dbDetailsDrop(ev) {
  ev.preventDefault();
  var zone = document.getElementById('dbDtDrop');
  if (!zone || !ev.dataTransfer) return;
  zone.style.borderColor = 'rgba(91,157,255,0.4)'; zone.style.background = 'transparent';
  zone.textContent = 'Reading…';
  collectDroppedFiles(ev.dataTransfer, function (files) {
    if (files.length) _dbDetailsUpload(files); else zone.textContent = zone.dataset.idle;
  });
}

function _dbDetailsPicked(input, isFolder) {
  var files = Array.prototype.slice.call(input.files || []);
  if (isFolder) files = files.filter(function (f) {
    return !f.webkitRelativePath.split('/').some(function (seg) { return seg.charAt(0) === '.'; });
  });
  input.value = '';
  if (files.length) _dbDetailsUpload(files);
}

// Upload, then re-read Dropbox so the Files list and the cards behind show it.
function _dbDetailsUpload(files) {
  if (!_dbDt) return;
  var name = _dbDt.name;
  uploadFilesToDropbox(name, files, {
    onProgress: function (fn, i, total) {
      var z = document.getElementById('dbDtDrop');
      if (z) z.textContent = 'Uploading ' + (i + 1) + '/' + total + ': ' + fn + ' …';
    },
    onDone: function (ok, fail, total) {
      var z = document.getElementById('dbDtDrop');
      if (z) {
        z.textContent = (fail ? '⚠ ' : '✓ ') + ok + '/' + total + ' uploaded' + (fail ? ', ' + fail + ' failed' : '') + ' · click to add more';
        z.style.color = fail ? 'var(--accent)' : 'var(--green)';
        setTimeout(function () {
          var z2 = document.getElementById('dbDtDrop');
          if (z2) { z2.textContent = z2.dataset.idle; z2.style.color = 'var(--muted)'; }
        }, 8000);
      }
      if (ok) _dbDetailsRefresh(name);
    }
  });
}

function _dbDetailsRefresh(name) {
  fetch(getScriptUrl() + '?action=getDropboxFolders')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) return;
      _dbLastData = d;
      _dbFolders = d.folders || [];
      if (_dbDt && _dbDt.name === name) { _dbRenderDetails(); _dbDetailsEmail(name); }
    })
    .catch(function () {});
}

// Log lesson: a date (today, ‹ › to step a day) and the same Log window Home
// opens (openLogFresh, lessons.js), which opens on top of this one.
function _dbDetailsLogHtml() {
  return '<button class="link-btn" onclick="_dbDetailsShift(-1)" data-tip="Instant.\nOne day earlier.">‹</button>' +
    '<span id="dbDtDate" style="min-width:150px;text-align:center;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--text)">' + _dbDetailsDateText() + '</span>' +
    '<button class="link-btn" onclick="_dbDetailsShift(1)" data-tip="Instant.\nOne day later.">›</button>' +
    '<button class="link-btn bright opens-window" onclick="_dbDetailsLog()" data-tip="Opens a window.\nThe Log lesson window for this date.">' + LOG_ICON + '<span>Log lesson</span></button>';
}

function _dbDetailsDateText() {
  var d = _dbDt.date, t = new Date();
  var txt = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return d.toDateString() === t.toDateString() ? 'Today · ' + txt : txt;
}

function _dbDetailsShift(n) {
  if (!_dbDt) return;
  _dbDt.date = new Date(_dbDt.date.getFullYear(), _dbDt.date.getMonth(), _dbDt.date.getDate() + n);
  var el = document.getElementById('dbDtDate');
  if (el) el.textContent = _dbDetailsDateText();
}

function _dbDetailsLog() {
  if (!_dbDt || typeof openLogFresh !== 'function') return;
  // yyyy/MM/dd: slashes parse in local time on the backend (see _stLogLessonFor).
  var d = _dbDt.date, m = d.getMonth() + 1, dd = d.getDate();
  var eventDate = d.getFullYear() + '/' + (m < 10 ? '0' + m : m) + '/' + (dd < 10 ? '0' + dd : dd);
  window._auditFixActive = false;
  openLogFresh({ name: _dbDt.name, eventDate: eventDate, calType: 'regular' }, undefined);
}

// A lesson (non-student) folder: a card like a student's, green edge, name
// over its size (a dash if empty), no age or Recover. Click opens it locally.
function _dbTeacherRow(c) {
  return '<div class="db-card db-card-lesson" onclick="openDropboxLocalFolder(\'' + _dbEsc(c.name) + '\')" data-tip="Opens elsewhere.\nGoes to the folder in the Dropbox app.">' +
    '<div class="db-card-l"><span class="db-card-n">' + c.name + '</span>' +
      '<span class="db-card-s">' + (c.bytes ? _dbSize(c.bytes) : '—') + '</span></div>' +
  '</div>';
}

// ── Students list ───────────────────────────────────────────────────────────
// Anyone whose files came in today on top, then everyone A–Z (2026-10-03).
// SINCE ADDED heads the column of ages on the right, across from STUDENTS,
// instead of sitting on every card.
function _dbStudentsHtml() {
  function today(f) { return !f.empty && f.ageDays === 0 ? 0 : 1; }
  var sorted = _dbFolders.slice().sort(function (a, b) { return today(a) - today(b) || a.name.localeCompare(b.name); });
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
