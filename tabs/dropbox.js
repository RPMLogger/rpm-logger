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

  // ── Folders that have files ──
  if (full.length) {
    full.forEach(function (f) {
      var col = _dbAgeColor(f.ageDays);
      html +=
        '<a href="' + _dbWebUrl(f.name) + '" target="_blank" rel="noopener" ' +
          'style="display:flex;align-items:center;justify-content:space-between;text-decoration:none;' +
          'background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' + col + ';' +
          'border-radius:10px;padding:14px 16px;margin-bottom:10px">' +
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
        '</a>';
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

function _dbToggleEmpty() {
  var list = document.getElementById('dbEmptyList');
  var chev = document.getElementById('dbEmptyChevron');
  if (!list) return;
  var open = list.style.display !== 'none';
  list.style.display = open ? 'none' : 'block';
  if (chev) chev.textContent = open ? '▾' : '▴';
}
