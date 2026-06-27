// ─── DROPBOX TAB ─────────────────────────────────────────────────────────────
// Read-only "checking" dashboard: lists every student folder in Dropbox with
// its file count, size, and how long the files have been sitting there. Full
// folders (need attention) float to the top; empty folders collapse out of the
// way. Backend: action=getDropboxFolders (RPM_Dropbox.js).

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

// Open a folder on the Dropbox website in a new tab.
function _dbWebUrl(name) {
  return 'https://www.dropbox.com/home/' + encodeURIComponent(name);
}

// "Oct 16" style short date from an ISO string.
function _dbShortDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return M[d.getMonth()] + ' ' + d.getDate();
}

// Pick an icon by file extension.
function _dbIcon(name) {
  var ext = (name.split('.').pop() || '').toLowerCase();
  if (['mp3','wav','m4a','aac','flac','aiff'].indexOf(ext) !== -1) return '🎵';
  if (['mp4','mov','avi','m4v','mkv'].indexOf(ext) !== -1) return '🎬';
  if (['jpg','jpeg','png','gif','heic','webp'].indexOf(ext) !== -1) return '🖼️';
  if (ext === 'pdf') return '📕';
  return '📄';
}

// Toggle a folder's inline file list open/closed.
function _dbToggleFolder(idx) {
  var panel = document.getElementById('dbFiles-' + idx);
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
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
    return html + '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid var(--green);' +
      'border-radius:10px;padding:13px 16px;margin-bottom:18px;font-family:\'DM Mono\',monospace;font-size:12px;color:var(--muted)">' +
      '<span style="color:var(--green)">✓</span> Every student has a folder · no leftover folders</div>';
  }

  function block(title, names, color, sub) {
    return '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' + color + ';' +
      'border-radius:10px;padding:13px 16px;margin-bottom:10px">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:14px;color:var(--text)">' + title + '</div>' +
      '<div style="font-size:10px;color:var(--muted);margin:3px 0 8px">' + sub + '</div>' +
      names.map(function (n) {
        return '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text);padding:3px 0">' + n + '</div>';
      }).join('') +
    '</div>';
  }

  if (mismatches.length) {
    html += '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid var(--blue);' +
      'border-radius:10px;padding:13px 16px;margin-bottom:10px">' +
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
    html += '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid var(--accent);' +
      'border-radius:10px;padding:13px 16px;margin-bottom:10px">' +
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
            '<button class="db-mini-btn" onclick="_dbCreateFolder(\'' + nm + '\',' + i + ')">Create &amp; share →</button>' +
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
    html += '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid var(--accent2);' +
      'border-radius:10px;padding:13px 16px;margin-bottom:10px">' +
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

  // ── Summary bar ──
  html +=
    '<div style="display:flex;gap:10px;margin-bottom:18px">' +
      '<div style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;text-align:center">' +
        '<div style="font-size:24px;font-weight:800;color:var(--text);line-height:1">' + _dbSize(d.totalBytes) + '</div>' +
        '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-top:5px">in shared folders</div>' +
      '</div>' +
      '<div style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;text-align:center">' +
        '<div style="font-size:24px;font-weight:800;color:' + (d.nonEmpty ? 'var(--accent)' : 'var(--green)') + ';line-height:1">' + d.nonEmpty + '</div>' +
        '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-top:5px">need attention</div>' +
      '</div>' +
    '</div>';

  // ── Inline status (no popups) ──
  html += '<div id="dbActionStatus"></div>';

  // ── Audit: roster vs folders ──
  html += _dbAuditHtml(d.audit);

  // ── On-demand sharing-recipient check ──
  html += '<button class="refresh-btn" style="margin-bottom:14px" onclick="_dbCheckSharing()">🔗 Check who folders are shared with</button>';
  html += '<div id="dbSharingResult" style="margin-bottom:8px"></div>';

  // ── Folders that have files ──
  if (full.length) {
    full.forEach(function (f, idx) {
      var col = _dbAgeColor(f.ageDays);
      // Clickable header row — toggles the file list below it (stays in portal).
      html +=
        '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' + col + ';' +
          'border-radius:10px;margin-bottom:10px;overflow:hidden">' +
          '<div onclick="_dbToggleFolder(' + idx + ')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:14px 16px">' +
            '<div style="min-width:0">' +
              '<div style="font-family:\'Syne\',sans-serif;font-size:16px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + f.name + '</div>' +
              '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);margin-top:3px">' +
                f.files + ' file' + (f.files === 1 ? '' : 's') + ' · ' + _dbSize(f.bytes) +
              '</div>' +
            '</div>' +
            '<div style="text-align:right;flex-shrink:0;margin-left:12px">' +
              '<div style="font-family:\'DM Mono\',monospace;font-size:13px;font-weight:500;color:' + col + '">' + _dbAgeText(f.ageDays) + '</div>' +
              '<div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:3px">since added</div>' +
            '</div>' +
          '</div>' +
          // Inline file list (hidden until tapped).
          '<div id="dbFiles-' + idx + '" style="display:none;border-top:1px solid var(--border);padding:8px 16px 12px">' +
            (f.items || []).map(function (it) {
              return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-family:\'DM Mono\',monospace;font-size:12px">' +
                '<span style="min-width:0;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
                  _dbIcon(it.name) + ' ' + it.name +
                '</span>' +
                '<span style="flex-shrink:0;margin-left:12px;color:var(--muted)">' + _dbSize(it.bytes) + ' · ' + _dbShortDate(it.modified) + '</span>' +
              '</div>';
            }).join('') +
            '<a href="' + _dbWebUrl(f.name) + '" target="_blank" rel="noopener" ' +
              'style="display:inline-block;margin-top:8px;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--blue);text-decoration:none">Open in Dropbox ↗</a>' +
          '</div>' +
        '</div>';
    });
  } else {
    html += '<div class="empty-state" style="color:var(--green)">🟢 All folders are empty — nothing to clean up.</div>';
  }

  // ── Empty folders (collapsed) ──
  if (empty.length) {
    html +=
      '<div onclick="_dbToggleEmpty()" style="cursor:pointer;display:flex;align-items:center;gap:8px;' +
        'margin-top:18px;padding:12px 16px;background:transparent;border:1px dashed var(--border);border-radius:10px;color:var(--muted);font-size:12px">' +
        '<span style="color:var(--green)">🟢</span>' +
        '<span id="dbEmptyToggleLabel">' + empty.length + ' empty folder' + (empty.length === 1 ? '' : 's') + ' — all clear</span>' +
        '<span style="margin-left:auto" id="dbEmptyChevron">▾</span>' +
      '</div>' +
      '<div id="dbEmptyList" style="display:none;padding:6px 4px 0">' +
        empty.map(function (f) {
          return '<a href="' + _dbWebUrl(f.name) + '" target="_blank" rel="noopener" ' +
            'style="display:block;text-decoration:none;font-family:\'DM Mono\',monospace;font-size:12px;' +
            'color:var(--muted);padding:6px 12px">' + f.name + '</a>';
        }).join('') +
      '</div>';
  }

  // ── Refresh ──
  html += '<hr class="divider" style="margin-top:22px"><button class="refresh-btn" onclick="initDropboxTab()">⟳ Re-check Dropbox</button>';

  body.innerHTML = html;
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
function _dbAction(params) {
  var url = getScriptUrl();
  if (!url) return;
  _dbStatus('Working…', 'var(--accent2)');
  var qs = Object.keys(params).map(function (k) {
    return k + '=' + encodeURIComponent(params[k]);
  }).join('&');
  fetch(url + '?' + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.success) { initDropboxTab(); }
      else { _dbStatus('⚠ ' + (d.message || 'Failed'), 'var(--accent)'); }
    })
    .catch(function () { _dbStatus('❌ Could not reach the portal.', 'var(--accent)'); });
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
function _dbCreateFolder(name, i) {
  var input = document.getElementById('dbCreateEmail-' + i);
  var email = input ? input.value.trim() : '';
  if (!email || email.indexOf('@') === -1) { _dbStatus('Enter a valid email to share the folder with.', 'var(--accent)'); return; }
  _dbAction({ action: 'createDropboxFolder', name: name, email: email });
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
    box.innerHTML = '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid var(--green);' +
      'border-radius:10px;padding:13px 16px;font-family:\'DM Mono\',monospace;font-size:12px;color:var(--muted)">' +
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
    html += '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' + L.c + ';' +
      'border-radius:10px;padding:12px 16px;margin-bottom:8px">' +
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

function _dbToggleEmpty() {
  var list = document.getElementById('dbEmptyList');
  var chev = document.getElementById('dbEmptyChevron');
  if (!list) return;
  var open = list.style.display !== 'none';
  list.style.display = open ? 'none' : 'block';
  if (chev) chev.textContent = open ? '▾' : '▴';
}
