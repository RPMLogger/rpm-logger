// ─── DROPBOX TAB ─────────────────────────────────────────────────────────────
// Read-only "checking" dashboard: lists every student folder in Dropbox with
// its file count, size, and how long the files have been sitting there. Full
// folders (need attention) float to the top; empty folders collapse out of the
// way. Backend: action=getDropboxFolders (RPM_Dropbox.js).

// Default invite message (editable per student in the create panel).
var DB_INVITE_MSG = "IMPORTANT: Please read the [Dropbox Instructions] sent via email to see how we will be using Dropbox.";

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

// Audit block: students missing a folder, and folders with no student.
function _dbAuditHtml(audit) {
  if (!audit) return '';
  var missing = audit.missing || [];
  var orphans = audit.orphans || [];
  var mismatches = audit.mismatches || [];
  var notShared = audit.notShared || [];
  var duplicates = audit.duplicates || [];
  var html = '<div class="section-label" style="margin-top:4px;margin-bottom:10px">Folder Audit</div>';

  if (!missing.length && !orphans.length && !mismatches.length && !notShared.length && !duplicates.length) {
    return html + '<div style="border-left:3px solid var(--green);padding:2px 0 2px 14px;margin-bottom:18px;font-family:\'DM Mono\',monospace;font-size:12px;color:var(--muted)">' +
      '<span style="color:var(--green)">✓</span> Every student has a folder · no leftover folders</div>';
  }

  function block(title, names, color, sub) {
    return '<div style="border-left:3px solid ' + color + ';padding:2px 0 10px 14px;margin-bottom:14px">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:14px;color:var(--text)">' + title + '</div>' +
      '<div style="font-size:10px;color:var(--muted);margin:3px 0 8px">' + sub + '</div>' +
      names.map(function (n) {
        return '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text);padding:3px 0">' + n + '</div>';
      }).join('') +
    '</div>';
  }

  if (mismatches.length) {
    html += '<div style="border-left:3px solid var(--blue);padding:2px 0 10px 14px;margin-bottom:14px">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:14px;color:var(--text)">🔤 ' + mismatches.length +
        ' spelling mismatch' + (mismatches.length === 1 ? '' : 'es') + '</div>' +
      '<div style="font-size:10px;color:var(--muted);margin:3px 0 8px">Dropbox folder name doesn\'t match the Counter sheet — correct the folder</div>' +
      mismatches.map(function (mm) {
        var r = _dbEsc(mm.roster), f = _dbEsc(mm.folder);
        return '<div style="padding:6px 0">' +
          '<div style="font-family:\'DM Mono\',monospace;font-size:12px">' +
            '<span style="color:var(--muted)">Counter:</span> <span style="color:var(--text)">' + mm.roster + '</span>' +
            '<span style="color:var(--muted)"> · Dropbox:</span> <span style="color:var(--text)">' + mm.folder + '</span>' +
          '</div>' +
          '<div style="margin-top:6px">' +
            '<button class="db-mini-btn" onclick="_dbCorrectFolder(\'' + f + '\',\'' + r + '\')">✓ Correct folder → "' + mm.roster + '"</button>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }
  if (missing.length) {
    html += '<div style="border-left:3px solid var(--accent);padding:2px 0 10px 14px;margin-bottom:14px">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:14px;color:var(--text)">⚠ ' + missing.length +
        ' student' + (missing.length === 1 ? '' : 's') + ' missing a folder</div>' +
      '<div style="font-size:10px;color:var(--muted);margin:3px 0 8px">In your roster but no Dropbox folder — create one and share it</div>' +
      missing.map(function (m, i) {
        var nm = _dbEsc(m.name);
        return '<div style="padding:6px 0;border-top:1px solid var(--border)">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
            '<span style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text)">' + m.name + '</span>' +
            '<button class="db-mini-btn" onclick="_dbShowCreate(' + i + ')">＋ Create folder</button>' +
          '</div>' +
          '<div id="dbCreate-' + i + '" style="display:none;margin-top:6px">' +
            '<input id="dbCreateEmail-' + i + '" type="text" value="' + _dbEsc(m.email || '') + '" placeholder="student email to share with" ' +
              'style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:6px;' +
              'padding:7px 10px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:12px;margin-bottom:6px">' +
            '<textarea id="dbCreateMsg-' + i + '" rows="3" placeholder="invite message" ' +
              'style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:6px;' +
              'padding:7px 10px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:12px;margin-bottom:6px;resize:vertical">' +
              _dbEsc(DB_INVITE_MSG) + '</textarea>' +
            '<button class="db-mini-btn" onclick="_dbCreateFolder(\'' + nm + '\',' + i + ',this)">Create &amp; share →</button>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }
  if (notShared.length) {
    html += block('🔒 ' + notShared.length + ' folder' + (notShared.length === 1 ? '' : 's') + ' not shared',
      notShared, 'var(--accent)', 'Folder exists but isn\'t shared — the student can\'t see their homework');
  }
  if (orphans.length) {
    html += block('🗑 ' + orphans.length + ' folder' + (orphans.length === 1 ? '' : 's') + ' with no student',
      orphans, 'var(--accent2)', 'Dropbox folder but not in roster — likely former students');
  }
  if (duplicates.length) {
    html += '<div style="border-left:3px solid var(--accent2);padding:2px 0 10px 14px;margin-bottom:14px">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:14px;color:var(--text)">👯 ' + duplicates.length +
        ' possible duplicate' + (duplicates.length === 1 ? '' : 's') + '</div>' +
      '<div style="font-size:10px;color:var(--muted);margin:3px 0 8px">Two folders with near-identical names — one may be a stray</div>' +
      duplicates.map(function (dp) {
        return '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text);padding:4px 0">' +
          dp.a + ' <span style="color:var(--muted)">↔</span> ' + dp.b + '</div>';
      }).join('') +
    '</div>';
  }
  return html + '<div style="height:8px"></div>';
}

function renderDropbox(d) {
  var body = document.getElementById('dropboxBody');
  var full = d.folders.filter(function (f) { return !f.empty; });
  var empty = d.folders.filter(function (f) { return f.empty; });
  var html = '';

  // ── Analysis ──
  html += '<div class="section-label" style="margin-top:4px;margin-bottom:10px">Analysis</div>';
  function _dbStat(val, color, label) {
    return '<div style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;text-align:center">' +
      '<div style="font-size:24px;font-weight:800;color:' + color + ';line-height:1">' + val + '</div>' +
      '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-top:5px">' + label + '</div>' +
    '</div>';
  }
  html +=
    '<div style="display:flex;gap:10px;margin-bottom:18px">' +
      _dbStat(_dbSize(d.totalBytes), 'var(--text)', 'in shared folders') +
      _dbStat(d.nonEmpty, d.nonEmpty ? 'var(--accent)' : 'var(--green)', 'need attention') +
      _dbStat(empty.length, 'var(--green)', 'empty') +
    '</div>';

  // ── Inline status (no popups) ──
  html += '<div id="dbActionStatus"></div>';

  // ── Audit: roster vs folders ──
  html += _dbAuditHtml(d.audit);

  // ── On-demand sharing-recipient check ──
  html += '<button class="refresh-btn" style="margin-bottom:14px" onclick="_dbCheckSharing()">🔗 Check who folders are shared with</button>';
  html += '<div id="dbSharingResult" style="margin-bottom:8px"></div>';

  // ── Students: one card each (folders with files first, then empty) ──
  html += '<div class="section-label" style="margin-top:8px;margin-bottom:10px">Students</div>';
  if (d.folders.length) {
    full.forEach(function (f) { html += _dbCard(f); });
    empty.forEach(function (f) { html += _dbCard(f); });
  } else {
    html += '<div class="empty-state">No student folders found.</div>';
  }

  // ── Other folders (non-student categories: Video Lessons, AAA-*) ──
  // Not cards — just a flat name + size row, click opens the folder locally.
  if (d.categories && d.categories.length) {
    html += '<div class="section-label" style="margin-top:20px;margin-bottom:10px">Other folders</div>';
    d.categories.forEach(function (c) {
      html += '<div onclick="openDropboxLocalFolder(\'' + _dbEsc(c.name) + '\')" title="Open in Dropbox app" ' +
        'style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;' +
        'padding:8px 0 8px 14px;border-left:3px solid var(--muted);margin-bottom:8px">' +
        '<span style="font-family:\'DM Mono\',monospace;font-size:13px;color:var(--text)">' + c.name + '</span>' +
        '<span style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--muted)">' + _dbSize(c.bytes) + '</span>' +
      '</div>';
    });
  }

  // ── Refresh ──
  html += '<hr class="divider" style="margin-top:22px"><button class="refresh-btn" onclick="initDropboxTab()">⟳ Re-check Dropbox</button>';

  body.innerHTML = html;
}

// One student folder card — click opens the folder in the local Dropbox app.
// Empty folders show a green "EMPTY" badge; full ones show file count + age.
function _dbCard(f) {
  var open = 'onclick="openDropboxLocalFolder(\'' + _dbEsc(f.name) + '\')" title="Open in Dropbox app" ';
  var col = f.empty ? 'var(--green)' : _dbAgeColor(f.ageDays);
  var chrome = 'style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' + col + ';' +
    'border-radius:10px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:14px 16px"';
  var name = '<div style="font-family:\'Syne\',sans-serif;font-size:16px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + f.name + '</div>';
  if (f.empty) {
    return '<div ' + open + chrome + '>' +
      '<div style="min-width:0">' + name +
        '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);margin-top:3px">Empty</div>' +
      '</div>' +
      '<div style="flex-shrink:0;margin-left:12px;font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:1px;' +
        'color:var(--green);border:1px solid var(--green);border-radius:6px;padding:3px 9px">EMPTY</div>' +
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
    '</div>' +
  '</div>';
}

// Escape a string for safe use inside a single-quoted onclick attribute.
function _dbEsc(s) {
  return (s || '').toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Quiet inline status (no popups).
function _dbStatus(msg, color) {
  var st = document.getElementById('dbActionStatus');
  if (!st) return;
  st.innerHTML = msg ? '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' +
    (color || 'var(--muted)') + ';border-radius:8px;padding:10px 14px;margin-bottom:12px;' +
    'font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text)">' + msg + '</div>' : '';
}

// Generic write call: POST an action, refresh the tab on success, inline error otherwise.
// On failure, re-enable the button passed as `btn` (if any) so it isn't stuck on "Working…".
function _dbAction(params, btn) {
  var url = getScriptUrl();
  if (!url) return;
  _dbStatus('Working…', 'var(--accent2)');
  function _restore(label) {
    if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; btn.textContent = label; }
  }
  var qs = Object.keys(params).map(function (k) {
    return k + '=' + encodeURIComponent(params[k]);
  }).join('&');
  fetch(url + '?' + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.success) { initDropboxTab(); }
      else { _dbStatus('⚠ ' + (d.message || 'Failed'), 'var(--accent)'); _restore('Create & share →'); }
    })
    .catch(function () { _dbStatus('❌ Could not reach the portal.', 'var(--accent)'); _restore('Create & share →'); });
}

// Mismatch: rename the Dropbox folder to match the Counter sheet (no popup).
function _dbCorrectFolder(folderName, counterName) {
  _dbAction({ action: 'renameDropboxFolder', from: folderName, to: counterName });
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
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'wait'; btn.textContent = 'Working…'; }
  _dbAction({ action: 'createDropboxFolder', name: name, email: email, message: message }, btn);
}

// On-demand: check who each folder is actually shared with vs the email on file.
function _dbCheckSharing() {
  var url = getScriptUrl();
  var box = document.getElementById('dbSharingResult');
  if (!url || !box) return;
  box.innerHTML = '<div class="empty-state">Checking who each folder is shared with… (a few seconds)</div>';
  fetch(url + '?action=getDropboxSharing')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { box.innerHTML = '<div class="empty-state">⚠ ' + (d.message || 'failed') + '</div>'; return; }
      _dbRenderSharing(d, box);
    })
    .catch(function () { box.innerHTML = '<div class="empty-state">❌ Could not check sharing.</div>'; });
}

function _dbRenderSharing(d, box) {
  var problems = d.problems || [];
  if (!problems.length) {
    box.innerHTML = '<div style="border-left:3px solid var(--green);padding:2px 0 2px 14px;font-family:\'DM Mono\',monospace;font-size:12px;color:var(--muted)">' +
      '<span style="color:var(--green)">✓</span> All ' + d.total + ' folders shared with the student on file</div>';
    return;
  }
  var labels = {
    notshared:    { c: 'var(--accent)',  t: 'NOT shared with anyone — student can\'t access' },
    wrong:        { c: 'var(--accent2)', t: 'shared with a different address than on file — likely their other email, worth a glance' },
    noEmailOnFile:{ c: 'var(--muted)',   t: 'no email on file to compare' }
  };
  var rank = { notshared: 0, wrong: 1, noEmailOnFile: 2 };
  problems = problems.slice().sort(function (a, b) {
    return (rank[a.status] || 9) - (rank[b.status] || 9);
  });
  var html = '';
  problems.forEach(function (p) {
    var L = labels[p.status] || { c: 'var(--accent2)', t: p.status };
    html += '<div style="border-left:3px solid ' + L.c + ';padding:2px 0 10px 14px;margin-bottom:12px">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:15px;color:var(--text)">' + p.name + '</div>' +
      '<div style="font-size:10px;color:var(--muted);margin:2px 0 6px">' + L.t + '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text)">' +
        '<span style="color:var(--muted)">On file:</span> ' + (p.expected || '—') + '<br>' +
        '<span style="color:var(--muted)">Shared with:</span> ' + (p.sharedWith && p.sharedWith.length ? p.sharedWith.join(', ') : '(nobody)') +
      '</div>' +
    '</div>';
  });
  box.innerHTML = '<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:4px 0 8px">' +
    problems.length + ' to review · ' + d.okCount + ' ok</div>' + html;
}

