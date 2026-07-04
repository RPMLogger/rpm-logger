// ─── TABS / STUDENT.JS ──────────────────────────────────────────────────────
// Student-focused single-page workspace. The portal's landing tab. What's on
// screen is ONLY ever about the student currently in front of you — never the
// full roster — so glancing students don't see business-wide data.
//
// Three views, all inside this one tab:
//   1) SEARCH  — empty page with a single centered search input; matching
//                student-name buttons appear live as you type.
//   2) DETAIL  — picked student's page: lesson #, past 4 lessons, payment,
//                Audit / Calendar drill-down buttons, Dropbox / Messages
//                external links, "+ Log this lesson" primary action.
//   3) AUDIT   — drill-down audit for this one student.
//   4) CALENDAR — 8-week per-student week strips; tap a red lesson to skip
//                 (uses the same Skip modal flow we built into the old Skips
//                 tab, just nested here per-student).

var _stState = {
  view:     'search',  // 'search' | 'detail' | 'audit' | 'calendar'
  roster:   null,      // cached list of student names
  current:  null,      // current student detail object
  lessons:  null,      // current student's upcoming lessons (calendar view)
  reschedule: null     // { studentName, lesson } while a drag-to-move is active
};

function initStudentTab() {
  _stState.view = 'search';
  if (!_stState.roster) _stLoadRoster(); else _stRenderSearch();
}

function _stLoadRoster() {
  var section = document.getElementById('studentBody');
  if (!section) return;
  section.innerHTML = '<div class="empty-state">Loading...</div>';
  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + '?action=getStudentRoster')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>';
        return;
      }
      _stState.roster = data.students || [];
      _stRenderSearch();
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}


// ─── 1) SEARCH VIEW ─────────────────────────────────────────────────────────

function _stRenderSearch() {
  var section = document.getElementById('studentBody');
  section.innerHTML = '';

  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:56px 0 40px';

  var label = document.createElement('div');
  label.textContent = 'Student Name';
  label.style.cssText = 'font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:14px';
  wrap.appendChild(label);

  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'studentSearch';
  input.autocomplete = 'off';
  input.style.cssText =
    'width:300px;padding:15px 18px;font-size:17px;font-family:inherit;text-align:center;letter-spacing:0.3px;' +
    'background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:12px;outline:none;' +
    'transition:border-color .15s, box-shadow .15s';
  input.onfocus = function() { input.style.borderColor = 'var(--accent)'; input.style.boxShadow = '0 0 0 3px rgba(232,70,58,0.14)'; };
  input.onblur  = function() { input.style.borderColor = 'var(--border)'; input.style.boxShadow = 'none'; };
  wrap.appendChild(input);

  var results = document.createElement('div');
  results.id = 'studentSearchResults';
  results.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:16px;width:300px';
  wrap.appendChild(results);

  section.appendChild(wrap);

  _stState.searchHi = 0;
  input.addEventListener('input', _stUpdateSearchResults);
  // Keyboard: ↓/↑ move the highlight, Enter opens whichever result is highlighted
  // (the top one by default) — so you never have to type all the way to one name.
  input.addEventListener('keydown', function(e) {
    var matches = _stSearchMatches();
    if (!matches.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _stState.searchHi = Math.min(_stState.searchHi + 1, matches.length - 1);
      _stApplyHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _stState.searchHi = Math.max(_stState.searchHi - 1, 0);
      _stApplyHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var i = Math.min(_stState.searchHi, matches.length - 1);
      _stOpenStudent(matches[i]);
    }
  });
  setTimeout(function() { input.focus(); }, 50);
}

// Result-button styles, shared so hover/keyboard highlight stay identical.
var _ST_RESULT_BASE =
  'width:100%;padding:9px 14px;background:var(--panel);color:var(--text);' +
  'border:1px solid var(--border);border-radius:4px;cursor:pointer;font-family:inherit;font-size:13px;text-align:left';
var _ST_RESULT_HI =
  'width:100%;padding:9px 14px;background:rgba(232,70,58,0.12);color:var(--text);' +
  'border:1px solid var(--accent);border-radius:4px;cursor:pointer;font-family:inherit;font-size:13px;text-align:left';

// Paint the highlight onto whichever result index is currently selected.
function _stApplyHighlight() {
  var results = document.getElementById('studentSearchResults');
  if (!results) return;
  var kids = results.children;
  for (var i = 0; i < kids.length; i++) {
    kids[i].style.cssText = (i === _stState.searchHi) ? _ST_RESULT_HI : _ST_RESULT_BASE;
  }
}

// Single source of truth for what the current search query matches — used by
// both the live result render and the Enter-to-pick shortcut so they never drift.
function _stSearchMatches() {
  var el = document.getElementById('studentSearch');
  var q = (el ? el.value : '').trim().toLowerCase();
  if (!q) return [];
  // Match the START of any word in the name, not any substring — so "a" finds
  // "Antonio" only (not every name containing an 'a'), while a last name like
  // "green" still matches "Gail Greenwald".
  return (_stState.roster || []).filter(function(name) {
    return name.toLowerCase().split(/\s+/).some(function(word) {
      return word.indexOf(q) === 0;
    });
  }).slice(0, 8);
}

function _stUpdateSearchResults() {
  var results = document.getElementById('studentSearchResults');
  results.innerHTML = '';
  _stState.searchHi = 0;             // every keystroke re-highlights the top match
  var matches = _stSearchMatches();
  matches.forEach(function(name, idx) {
    var btn = document.createElement('button');
    btn.textContent = name;
    btn.style.cssText = _ST_RESULT_BASE;
    // Hovering a row makes it the active highlight, so mouse and keyboard agree.
    btn.onmouseenter = function() { _stState.searchHi = idx; _stApplyHighlight(); };
    btn.onclick = function() { _stOpenStudent(name); };
    results.appendChild(btn);
  });
  _stApplyHighlight();
}


// ─── 2) STUDENT DETAIL VIEW ─────────────────────────────────────────────────

function _stOpenStudent(name) {
  var section = document.getElementById('studentBody');
  section.innerHTML = '<div class="empty-state">Loading ' + name + '...</div>';
  var url = getScriptUrl(); if (!url) return;
  fetch(url + '?action=getStudentDetail&name=' + encodeURIComponent(name))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>';
        return;
      }
      _stState.current = data;
      _stState.view = 'detail';
      _stRenderDetail();
    });
}

function _stRenderDetail() {
  var section = document.getElementById('studentBody');
  var d = _stState.current;
  section.innerHTML = '';

  // Top: back link + name + lesson #
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px';
  hdr.innerHTML =
    "<div>" +
      "<div style='font-weight:700;font-size:18px;letter-spacing:0.3px'>" + d.name + "</div>" +
      "<div style='font-size:11px;color:var(--muted);margin-top:2px'>Lesson <span style='color:var(--accent);font-weight:600'>" + d.lessonInBlock + "</span> of block</div>" +
    "</div>" +
    "<button id='stBack' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>← Search</button>";
  section.appendChild(hdr);
  document.getElementById('stBack').onclick = function() { _stState.view = 'search'; _stRenderSearch(); };

  // Past lessons
  var pastBox = document.createElement('div');
  pastBox.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:10px 12px;margin-bottom:12px';
  pastBox.innerHTML = "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px'>Past 4 lessons</div>";
  if (d.pastLessons && d.pastLessons.length) {
    d.pastLessons.forEach(function(p) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:12px';
      row.innerHTML =
        "<span style='color:var(--muted);flex-shrink:0;width:90px'>" + (p.date || '—') + "</span>" +
        "<span style='color:var(--text);text-align:right;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>" + (p.subject || '—') + "</span>";
      pastBox.appendChild(row);
    });
  } else {
    pastBox.innerHTML += "<div style='font-size:12px;color:var(--muted);padding:4px 0'>No lessons logged yet</div>";
  }
  section.appendChild(pastBox);

  // Payment + Audit
  var payRow = document.createElement('div');
  payRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--panel);margin-bottom:10px';
  var payColors = { 'Paid': 'var(--green)', 'Due': '#ffb400', 'Overdue': '#ff5050' };
  var payColor = payColors[d.paymentStatus] || 'var(--muted)';
  payRow.innerHTML =
    "<span style='font-size:13px'>Payment: <span style='color:" + payColor + ";font-weight:600'>● " + (d.paymentStatus || '—') + "</span></span>" +
    "<button id='stAuditBtn' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>Audit →</button>";
  section.appendChild(payRow);
  document.getElementById('stAuditBtn').onclick = _stOpenAudit;

  // Calendar
  var calBtn = document.createElement('button');
  calBtn.textContent = '📅 Calendar';
  calBtn.style.cssText = 'width:100%;padding:10px;font-size:13px;background:rgba(91,157,255,0.12);color:#5b9dff;border:1px solid rgba(91,157,255,0.4);border-radius:6px;cursor:pointer;margin-bottom:10px;letter-spacing:0.3px';
  calBtn.onclick = _stOpenCalendar;
  section.appendChild(calBtn);

  // External links: Dropbox + Messages
  var linksRow = document.createElement('div');
  linksRow.style.cssText = 'display:flex;gap:8px;margin-bottom:14px';
  var dropBtn = document.createElement('button');
  dropBtn.innerHTML = '📁 Dropbox';
  dropBtn.style.cssText = 'flex:1;padding:10px;font-size:12px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:6px;cursor:pointer';
  dropBtn.onclick = function() { _stOpenDropbox(d.name); };
  linksRow.appendChild(dropBtn);

  var msgBtn = document.createElement('button');
  msgBtn.innerHTML = '💬 Messages';
  msgBtn.style.cssText = 'flex:1;padding:10px;font-size:12px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:6px;cursor:pointer';
  msgBtn.onclick = _stOpenMessages;
  linksRow.appendChild(msgBtn);
  section.appendChild(linksRow);

  // Drag-and-drop upload straight into the student's shared Dropbox folder.
  var drop = document.createElement('div');
  drop.id = 'stDropZone';
  drop.dataset.folder = d.name;
  drop.dataset.idle = '⬆ Drag homework here to upload to ' + d.name + "'s Dropbox";
  drop.textContent = drop.dataset.idle;
  drop.style.cssText = 'margin-bottom:14px;padding:16px;border:1.5px dashed var(--border);border-radius:8px;' +
    'text-align:center;font-size:12px;color:var(--muted);cursor:pointer;transition:border-color .15s,background .15s';
  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  fileInput.onchange = function () { if (fileInput.files.length) _stUploadToDropbox(d.name, fileInput.files, drop); fileInput.value = ''; };
  drop.onclick = function () { fileInput.click(); };
  drop.ondragover = function (ev) { ev.preventDefault(); drop.style.borderColor = 'var(--accent)'; drop.style.background = 'rgba(232,70,58,0.06)'; };
  drop.ondragleave = function () { drop.style.borderColor = 'var(--border)'; drop.style.background = 'transparent'; };
  drop.ondrop = function (ev) {
    ev.preventDefault();
    drop.style.borderColor = 'var(--border)'; drop.style.background = 'transparent';
    if (ev.dataTransfer && ev.dataTransfer.files.length) _stUploadToDropbox(d.name, ev.dataTransfer.files, drop);
  };
  section.appendChild(drop);
  section.appendChild(fileInput);

  // Primary action: + Log this lesson
  var logBtn = document.createElement('button');
  logBtn.textContent = '+ Log this lesson';
  logBtn.style.cssText = 'width:100%;padding:12px;font-size:14px;background:rgba(232,70,58,0.2);color:var(--accent);border:1px solid var(--accent);border-radius:6px;cursor:pointer;font-weight:600;letter-spacing:0.5px';
  logBtn.onclick = function() { _stLogLessonFor(d.name); };
  section.appendChild(logBtn);
}


// ─── 3) AUDIT DRILL-DOWN ────────────────────────────────────────────────────

function _stOpenAudit() {
  var section = document.getElementById('studentBody');
  section.innerHTML = '<div class="empty-state">Loading audit...</div>';
  var url = getScriptUrl(); if (!url) return;
  fetch(url + '?action=getStudentAudit&name=' + encodeURIComponent(_stState.current.name))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>';
        return;
      }
      _stState.view = 'audit';
      _stRenderAudit(data);
    });
}

function _stRenderAudit(data) {
  var section = document.getElementById('studentBody');
  section.innerHTML = '';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px';
  hdr.innerHTML =
    "<div>" +
      "<div style='font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>Audit</div>" +
      "<div style='font-weight:700;font-size:15px;margin-top:2px'>" + data.name + "</div>" +
    "</div>" +
    "<button id='stBackToDetail' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>← Back</button>";
  section.appendChild(hdr);
  document.getElementById('stBackToDetail').onclick = function() { _stState.view = 'detail'; _stRenderDetail(); };

  // Payment
  var payBox = document.createElement('div');
  payBox.style.cssText = 'padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--panel);margin-bottom:10px';
  var colors = { 'Paid': 'var(--green)', 'Due': '#ffb400', 'Overdue': '#ff5050' };
  var color = colors[data.paymentStatus] || 'var(--muted)';
  payBox.innerHTML =
    "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Payment</div>" +
    "<div style='font-size:14px;color:" + color + ";font-weight:600'>● " + (data.paymentStatus || '—') + "</div>";
  section.appendChild(payBox);

  // Sync check: only flags Counter dates absent from Import. Import naturally
  // has more entries (full history vs active block), so we don't surface that
  // as a problem.
  var missing = data.missingFromImport || [];
  var syncBox = document.createElement('div');
  syncBox.style.cssText = 'padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--panel);margin-bottom:10px';
  if (!missing.length) {
    syncBox.innerHTML =
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Counter ↔ Import</div>" +
      "<div style='font-size:13px;color:var(--green);font-weight:600'>✓ All Counter dates present in Import</div>";
  } else {
    syncBox.innerHTML =
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Missing from Import</div>" +
      missing.map(function(d) {
        return "<div style='font-size:13px;color:#ffb400;font-weight:600'>● " + d + "</div>";
      }).join('');
  }
  section.appendChild(syncBox);

  // Reference view: raw recent dates from each source, collapsed by default.
  var datesBox = document.createElement('div');
  datesBox.style.cssText = 'padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--panel);margin-bottom:10px';
  datesBox.innerHTML =
    "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px'>Last 12 lesson dates <span style=\"text-transform:none;letter-spacing:0;color:var(--muted);opacity:0.7\">(reference)</span></div>" +
    "<div style='display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px'>" +
      "<div>" +
        "<div style='color:var(--muted);margin-bottom:4px;letter-spacing:0.3px'>COUNTER</div>" +
        (data.counterDates.length ? data.counterDates.map(function(d) { return "<div>" + d + "</div>"; }).join('') : "<div style='color:var(--muted)'>—</div>") +
      "</div>" +
      "<div>" +
        "<div style='color:var(--muted);margin-bottom:4px;letter-spacing:0.3px'>IMPORT</div>" +
        (data.importDates.length ? data.importDates.map(function(d) { return "<div>" + d + "</div>"; }).join('') : "<div style='color:var(--muted)'>—</div>") +
      "</div>" +
    "</div>";
  section.appendChild(datesBox);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:var(--muted);padding:0 4px';
  hint.textContent = 'Import is the full lesson history; Counter is just the active block. Extra entries in Import are normal.';
  section.appendChild(hint);
}


// ─── 4) CALENDAR DRILL-DOWN (per-student 8-week strips) ─────────────────────

function _stOpenCalendar() {
  _stState.reschedule = null; // never resume a stale drag on a fresh load
  var section = document.getElementById('studentBody');
  section.innerHTML = '<div class="empty-state">Loading calendar...</div>';
  var url = getScriptUrl(); if (!url) return;
  fetch(url + '?action=getStudentLessons&name=' + encodeURIComponent(_stState.current.name))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>';
        return;
      }
      _stState.view = 'calendar';
      _stState.lessons = data;
      _stRenderCalendar();
    });
}

function _stRenderCalendar() {
  var section = document.getElementById('studentBody');
  var data = _stState.lessons;
  section.innerHTML = '';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px';
  hdr.innerHTML =
    "<div>" +
      "<div style='font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>Next 8 weeks</div>" +
      "<div style='font-weight:700;font-size:15px;margin-top:2px'>" + data.student + "</div>" +
    "</div>" +
    "<button id='stCalBack' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>← Back</button>";
  section.appendChild(hdr);
  document.getElementById('stCalBack').onclick = function() { _stState.view = 'detail'; _stRenderDetail(); };

  if (!data.lessons || !data.lessons.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No upcoming lessons in the next 8 weeks';
    section.appendChild(empty);
    return;
  }

  var byDate = {};
  data.lessons.forEach(function(l) { byDate[l.date] = l; });

  var weeks = data.weeks || 8;
  var today = _stToday();
  var monday = _stMondayOf(today);

  var strips = document.createElement('div');
  strips.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  for (var w = 0; w < weeks; w++) {
    var weekStart = new Date(monday.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    strips.appendChild(_stBuildWeekStrip(weekStart, byDate, today, data.student));
  }
  section.appendChild(strips);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:var(--muted);text-align:center;margin-top:12px';
  hint.textContent = _stState.reschedule
    ? 'Drag the highlighted lesson onto a new day.'
    : 'Tap a lesson day to reschedule or skip it.';
  section.appendChild(hint);

  if (_stState.reschedule) _stEnableRescheduleDrag(section);
}

function _stBuildWeekStrip(monday, byDate, today, studentName) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:4px;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:6px';
  for (var i = 0; i < 7; i++) {
    var d   = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
    var ymd = _stYmd(d);
    var lesson = byDate[ymd];
    var isPast = d < today;
    var dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];

    // On the 1st of a month, show the month abbreviation instead of the
    // weekday so the start of each month is visible at a glance.
    var isFirst = d.getDate() === 1;
    var topLabel = isFirst
      ? ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]
      : dayName.toUpperCase();
    var topStyle = 'font-size:9px;line-height:1;letter-spacing:0.5px'
      + (isFirst ? ';color:var(--accent);font-weight:700' : '');

    var cell = document.createElement('button');
    cell.style.cssText = 'flex:1;padding:6px 4px;border-radius:4px;font-family:inherit;border:1px solid transparent;';
    // Tag every cell with its date + whether it holds a lesson, so the
    // reschedule drag can find drop targets and skip past/lesson days.
    cell.dataset.ymd  = ymd;
    cell.dataset.past = isPast ? '1' : '0';
    cell.dataset.has  = (lesson && !isPast) ? '1' : '0';
    if (lesson && !isPast) {
      cell.style.cssText +=
        'background:rgba(232,70,58,0.18);color:var(--accent);' +
        'border:1px solid rgba(232,70,58,0.5);cursor:pointer';
      cell.innerHTML =
        "<div style='" + topStyle + "'>" + topLabel + "</div>" +
        "<div style='font-size:15px;font-weight:700;line-height:1.3'>" + d.getDate() + "</div>" +
        "<div style='font-size:9px;line-height:1.2;color:var(--accent);opacity:0.85'>" + lesson.time + "</div>";
      (function(l) {
        cell.onclick = function() { _stOpenLessonActions(studentName, l); };
      })(lesson);
    } else {
      cell.style.cssText +=
        'background:transparent;color:' + (isPast ? 'rgba(180,180,180,0.2)' : 'rgba(180,180,180,0.4)') + ';cursor:default';
      cell.innerHTML =
        "<div style='" + topStyle + "'>" + topLabel + "</div>" +
        "<div style='font-size:13px;line-height:1.3'>" + d.getDate() + "</div>" +
        "<div style='font-size:9px;line-height:1.2'>&nbsp;</div>";
    }
    row.appendChild(cell);
  }
  return row;
}


// ─── SKIP MODAL (reused from former Skips tab pattern) ──────────────────────

function _stOpenSkipModal(studentName, lesson) {
  var existing = document.getElementById('stSkipModal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'stSkipModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var box = document.createElement('div');
  box.style.cssText = 'background:#141414;border:1px solid var(--border);border-radius:8px;padding:18px;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.6)';
  overlay.appendChild(box);
  box.innerHTML =
    "<div style='font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Mark Skip</div>" +
    "<div style='font-weight:700;font-size:14px;margin-bottom:2px'>" + studentName + "</div>" +
    "<div style='font-size:12px;color:var(--muted);margin-bottom:14px'>" + lesson.dateLabel + " · " + lesson.time + "</div>" +

    "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px'>Who initiated?</div>" +
    "<div style='display:flex;gap:6px;margin-bottom:12px' id='stWhoRow'>" +
      "<button data-who='Student' class='stWhoBtn' style='flex:1;padding:8px;font-size:12px;background:rgba(91,157,255,0.18);color:#5b9dff;border:1px solid rgba(91,157,255,0.6);border-radius:4px;cursor:pointer;font-weight:600'>Student</button>" +
      "<button data-who='Teacher' class='stWhoBtn' style='flex:1;padding:8px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>Teacher</button>" +
    "</div>" +

    "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Note (optional)</div>" +
    "<input id='stSkipNote' type='text' placeholder='reason or context' " +
      "style='width:100%;padding:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;font-family:inherit;font-size:12px;margin-bottom:14px'>" +

    "<div style='display:flex;gap:8px'>" +
      "<button id='stSkipCancel' style='flex:0 0 auto;padding:10px 16px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>Cancel</button>" +
      "<button id='stSkipConfirm' style='flex:1;padding:10px;font-size:12px;background:rgba(232,70,58,0.25);color:var(--accent);border:1px solid var(--accent);border-radius:4px;cursor:pointer;font-weight:600;letter-spacing:0.5px'>Confirm Skip</button>" +
    "</div>";

  document.body.appendChild(overlay);

  var selectedWho = 'Student';
  var whoBtns = overlay.querySelectorAll('.stWhoBtn');
  whoBtns.forEach(function(btn) {
    btn.onclick = function() {
      selectedWho = btn.dataset.who;
      whoBtns.forEach(function(b) {
        if (b.dataset.who === selectedWho) {
          var color = selectedWho === 'Student' ? '91,157,255' : '255,165,0';
          var hex   = selectedWho === 'Student' ? '#5b9dff'    : '#ffa500';
          b.style.cssText = 'flex:1;padding:8px;font-size:12px;background:rgba(' + color + ',0.18);color:' + hex + ';border:1px solid rgba(' + color + ',0.6);border-radius:4px;cursor:pointer;font-weight:600';
        } else {
          b.style.cssText = 'flex:1;padding:8px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer';
        }
      });
    };
  });

  document.getElementById('stSkipCancel').onclick = function() { overlay.remove(); };
  document.getElementById('stSkipConfirm').onclick = function() {
    var note = document.getElementById('stSkipNote').value.trim();
    var btn  = document.getElementById('stSkipConfirm');
    btn.disabled = true; btn.textContent = '…';
    var url = getScriptUrl(); if (!url) return;
    callScript(url, 'markSkip', {
      name: studentName, date: lesson.date, who: selectedWho, note: note
    }, function(data) {
      if (data && data.success) {
        overlay.remove();
        _stOpenCalendar();   // refresh the strip; the skipped lesson drops off
      } else {
        var b = document.getElementById('stSkipConfirm');
        if (b) { b.disabled = false; b.textContent = 'Confirm Skip'; }
        addLog('studentFeed', '❌ ' + (data && data.message ? data.message : 'Skip failed'), 'error');
      }
    });
  };
}


// ─── LESSON ACTIONS (Reschedule / Skip chooser) ─────────────────────────────
// Tapping a red lesson day opens this chooser first. Skip → the existing skip
// modal (unchanged). Reschedule → drag-to-move mode within the 8-week grid.

function _stOpenLessonActions(studentName, lesson) {
  var existing = document.getElementById('stActionModal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'stActionModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var box = document.createElement('div');
  box.style.cssText = 'background:#141414;border:1px solid var(--border);border-radius:8px;padding:18px;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.6)';
  box.innerHTML =
    "<div style='font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Lesson</div>" +
    "<div style='font-weight:700;font-size:14px;margin-bottom:2px'>" + studentName + "</div>" +
    "<div style='font-size:12px;color:var(--muted);margin-bottom:16px'>" + lesson.dateLabel + " · " + lesson.time + "</div>" +
    "<div style='display:flex;gap:8px;margin-bottom:8px'>" +
      "<button id='stActReschedule' style='flex:1;padding:12px;font-size:13px;background:rgba(91,157,255,0.16);color:#5b9dff;border:1px solid rgba(91,157,255,0.55);border-radius:5px;cursor:pointer;font-weight:600;letter-spacing:0.5px'>Reschedule</button>" +
      "<button id='stActSkip' style='flex:1;padding:12px;font-size:13px;background:rgba(232,70,58,0.16);color:var(--accent);border:1px solid rgba(232,70,58,0.55);border-radius:5px;cursor:pointer;font-weight:600;letter-spacing:0.5px'>Skip</button>" +
    "</div>" +
    "<button id='stActCancel' style='width:100%;padding:9px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:5px;cursor:pointer'>Cancel</button>";
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document.getElementById('stActCancel').onclick     = function() { overlay.remove(); };
  document.getElementById('stActSkip').onclick       = function() { overlay.remove(); _stOpenSkipModal(studentName, lesson); };
  document.getElementById('stActReschedule').onclick = function() { overlay.remove(); _stBeginReschedule(studentName, lesson); };
}


// ─── RESCHEDULE (drag a lesson to a new day, within the visible 8 weeks) ─────

function _stBeginReschedule(studentName, lesson) {
  _stState.reschedule = { studentName: studentName, lesson: lesson };
  _stRenderCalendar();
}

function _stCancelReschedule() {
  _stState.reschedule = null;
  _stRenderCalendar();
}

// Called from _stRenderCalendar when a reschedule is in progress. Adds the
// banner and wires pointer-drag from the source lesson cell onto any other
// (non-past) day cell in the grid.
function _stEnableRescheduleDrag(section) {
  var rs      = _stState.reschedule;
  var lesson  = rs.lesson;
  var srcCell = section.querySelector('[data-ymd="' + lesson.date + '"]');

  // Banner at the top of the calendar.
  var banner = document.createElement('div');
  banner.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(91,157,255,0.12);border:1px solid rgba(91,157,255,0.45);border-radius:6px;padding:10px 12px;margin-bottom:12px';
  banner.innerHTML =
    "<div style='font-size:12px;color:#9ec3ff;line-height:1.4'>Drag <b>" + rs.studentName + "</b>'s lesson (" + lesson.dateLabel + ") to a new day.</div>" +
    "<button id='stRsCancel' style='flex:0 0 auto;padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>Cancel</button>";
  section.insertBefore(banner, section.children[1] || null);
  banner.querySelector('#stRsCancel').onclick = _stCancelReschedule;

  if (!srcCell) return;

  // Highlight the source cell as "the one being moved".
  srcCell.style.outline = '2px dashed #5b9dff';
  srcCell.style.outlineOffset = '1px';
  srcCell.style.touchAction = 'none';

  var ghost = null, lastTarget = null, dragging = false;

  function clearTarget() {
    if (lastTarget) { lastTarget.style.boxShadow = ''; lastTarget.style.background = lastTarget.dataset.bg || ''; }
    lastTarget = null;
  }

  function targetUnder(x, y) {
    var el = document.elementFromPoint(x, y);
    if (!el) return null;
    var cell = el.closest ? el.closest('[data-ymd]') : null;
    if (!cell || !section.contains(cell)) return null;
    if (cell === srcCell) return null;
    if (cell.dataset.past === '1') return null; // can't move into the past
    return cell;
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    if (ghost) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
    var t = targetUnder(e.clientX, e.clientY);
    if (t !== lastTarget) {
      clearTarget();
      if (t) {
        if (!t.dataset.bg) t.dataset.bg = t.style.background || '';
        t.style.boxShadow = 'inset 0 0 0 2px #5b9dff';
        t.style.background = 'rgba(91,157,255,0.14)';
        lastTarget = t;
      }
    }
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointerup', onUp, true);
    if (ghost) { ghost.remove(); ghost = null; }
    var t = lastTarget;
    clearTarget();
    if (t) _stOpenTimeConfirm(rs.studentName, lesson, t.dataset.ymd);
  }

  srcCell.addEventListener('pointerdown', function(e) {
    e.preventDefault();
    dragging = true;
    ghost = document.createElement('div');
    ghost.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;transform:translate(-50%,-50%);z-index:9999;pointer-events:none;background:rgba(91,157,255,0.95);color:#06203f;font-weight:700;font-size:12px;padding:6px 10px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.5)';
    ghost.textContent = rs.studentName.split(' ')[0] + ' · ' + lesson.time;
    document.body.appendChild(ghost);
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
  });
}

// After a drop, confirm the new day and let the user adjust the time
// (prefilled from the original lesson). Confirm → backend move → refresh.
function _stOpenTimeConfirm(studentName, lesson, newYmd) {
  var t = _stParseTime(lesson.time); // { h12, min, ap }
  var state = { h12: t.h12, min: t.min, ap: t.ap };

  var parts = newYmd.split('-');
  var nd = new Date(parseInt(parts[0],10), parseInt(parts[1],10) - 1, parseInt(parts[2],10));
  var dayLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][nd.getDay()] + ' ' +
                 ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][nd.getMonth()] + ' ' + nd.getDate();

  var overlay = document.createElement('div');
  overlay.id = 'stTimeModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var box = document.createElement('div');
  box.style.cssText = 'background:#141414;border:1px solid var(--border);border-radius:8px;padding:18px;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.6)';
  function spinSeg(id, val) {
    return "<div style='display:flex;flex-direction:column;align-items:center;gap:4px'>" +
      "<button data-spin='" + id + "' data-dir='1' style='width:42px;padding:4px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>▲</button>" +
      "<div id='stSeg_" + id + "' style='font-size:20px;font-weight:700;min-width:42px;text-align:center'>" + val + "</div>" +
      "<button data-spin='" + id + "' data-dir='-1' style='width:42px;padding:4px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>▼</button>" +
    "</div>";
  }
  box.innerHTML =
    "<div style='font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Reschedule</div>" +
    "<div style='font-weight:700;font-size:14px;margin-bottom:2px'>" + studentName + "</div>" +
    "<div style='font-size:12px;color:var(--muted);margin-bottom:14px'>Move to <b style='color:#5b9dff'>" + dayLabel + "</b></div>" +
    "<div style='display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px'>" +
      spinSeg('h', state.h12) +
      "<div style='font-size:20px;font-weight:700;color:var(--muted)'>:</div>" +
      spinSeg('m', _stPad2(state.min)) +
      spinSeg('ap', state.ap) +
    "</div>" +
    "<div style='display:flex;gap:8px'>" +
      "<button id='stTimeCancel' style='flex:0 0 auto;padding:10px 16px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>Cancel</button>" +
      "<button id='stTimeConfirm' style='flex:1;padding:10px;font-size:12px;background:rgba(91,157,255,0.22);color:#5b9dff;border:1px solid #5b9dff;border-radius:4px;cursor:pointer;font-weight:600;letter-spacing:0.5px'>Confirm Move</button>" +
    "</div>";
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function redraw() {
    document.getElementById('stSeg_h').textContent  = state.h12;
    document.getElementById('stSeg_m').textContent  = _stPad2(state.min);
    document.getElementById('stSeg_ap').textContent = state.ap;
  }
  box.querySelectorAll('[data-spin]').forEach(function(btn) {
    btn.onclick = function() {
      var seg = btn.dataset.spin, dir = parseInt(btn.dataset.dir, 10);
      if (seg === 'h')  { state.h12 = ((state.h12 - 1 + dir + 12) % 12) + 1; }
      if (seg === 'm')  { state.min = (state.min + dir * 5 + 60) % 60; }
      if (seg === 'ap') { state.ap  = state.ap === 'AM' ? 'PM' : 'AM'; }
      redraw();
    };
  });

  document.getElementById('stTimeCancel').onclick = function() { overlay.remove(); };
  document.getElementById('stTimeConfirm').onclick = function() {
    var btn = document.getElementById('stTimeConfirm');
    btn.disabled = true; btn.textContent = '…';
    var h24 = (state.h12 % 12) + (state.ap === 'PM' ? 12 : 0);
    var hhmm = _stPad2(h24) + ':' + _stPad2(state.min);
    var url = getScriptUrl(); if (!url) { overlay.remove(); return; }
    callScript(url, 'rescheduleLesson', {
      name: studentName, date: lesson.date, newDate: newYmd, time: hhmm
    }, function(data) {
      if (data && data.success) {
        overlay.remove();
        _stState.reschedule = null;
        addLog('studentFeed', '📅 ' + studentName + ' moved to ' + data.newLabel + ' · ' + data.newTime, 'success');
        _stOpenCalendar(); // refresh — lesson now sits on the new day
      } else {
        var b = document.getElementById('stTimeConfirm');
        if (b) { b.disabled = false; b.textContent = 'Confirm Move'; }
        addLog('studentFeed', '❌ ' + (data && data.message ? data.message : 'Reschedule failed'), 'error');
      }
    });
  };
}

function _stParseTime(s) {
  // "3:30 PM" -> { h12:3, min:30, ap:'PM' }. Falls back to 3:00 PM.
  var m = String(s || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return { h12: 3, min: 0, ap: 'PM' };
  return { h12: parseInt(m[1], 10), min: parseInt(m[2], 10), ap: m[3].toUpperCase() };
}

function _stPad2(n) { n = parseInt(n, 10); return n < 10 ? '0' + n : '' + n; }


// ─── EXTERNAL LINKS ─────────────────────────────────────────────────────────

function _stOpenDropbox(studentName) {
  openDropboxLocalFolder(studentName);
  addLog('studentFeed', '📁 Opening ' + studentName + ' folder…', 'info');
}

// Upload dropped/picked files into the student's shared Dropbox folder, showing
// per-file progress in the drop zone. Heavy lifting is in uploadFilesToDropbox.
function _stUploadToDropbox(folderName, fileList, zone) {
  uploadFilesToDropbox(folderName, fileList, {
    onProgress: function (name, i, total) {
      zone.textContent = 'Uploading ' + (i + 1) + '/' + total + ': ' + name + ' …';
    },
    onDone: function (ok, fail, total) {
      zone.textContent = (fail ? '⚠ ' : '✓ ') + ok + '/' + total + ' uploaded' +
        (fail ? ' — ' + fail + ' failed' : '') + ' · click to add more';
      addLog('studentFeed', '📁 ' + ok + '/' + total + ' file(s) → ' + folderName + ' Dropbox', fail ? 'warn' : 'success');
      setTimeout(function () { if (zone) zone.textContent = zone.dataset.idle; }, 6000);
    }
  });
}

function _stOpenMessages() {
  // Open Messages.app. Tries the standard URL scheme first; on most macOS
  // setups this is enough. Long-term we can wire a Shortcut for guaranteed.
  window.location.href = 'messages://';
  addLog('studentFeed', '💬 Opening Messages…', 'info');
}


// ─── LOG LESSON (reuses the existing Lessons modal pattern) ─────────────────
// We piggyback on the lesson-log infrastructure that already exists in lessons.js
// by populating the `activeStudent` and calling openLogFresh.

function _stLogLessonFor(name) {
  // openLogFresh from lessons.js expects { name, eventDate, calType }
  // We don't have a calendar eventDate handy here, so we pass an empty string
  // and the existing logLesson backend will fall back to "today" for the date.
  window._auditFixActive = false;
  if (typeof _floatLogPanel === 'function') _floatLogPanel();
  if (typeof openLogFresh === 'function') {
    openLogFresh({ name: name, eventDate: '', calType: 'regular' }, undefined);
  } else {
    addLog('studentFeed', '❌ Log function not available', 'error');
  }
}


// ─── DATE HELPERS ───────────────────────────────────────────────────────────

function _stToday() {
  var n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function _stMondayOf(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

function _stYmd(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}
