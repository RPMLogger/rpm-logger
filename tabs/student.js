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
  lessons:  null       // current student's upcoming lessons (calendar view)
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
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:60px 0 40px';

  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'studentSearch';
  input.placeholder = 'Type a name…';
  input.autocomplete = 'off';
  input.style.cssText =
    'width:280px;padding:12px 16px;font-size:16px;font-family:inherit;' +
    'background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;outline:none';
  wrap.appendChild(input);

  var results = document.createElement('div');
  results.id = 'studentSearchResults';
  results.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:14px;width:280px';
  wrap.appendChild(results);

  section.appendChild(wrap);

  input.addEventListener('input', _stUpdateSearchResults);
  setTimeout(function() { input.focus(); }, 50);
}

function _stUpdateSearchResults() {
  var q = (document.getElementById('studentSearch').value || '').trim().toLowerCase();
  var results = document.getElementById('studentSearchResults');
  results.innerHTML = '';
  if (!q) return;
  var matches = (_stState.roster || []).filter(function(name) {
    return name.toLowerCase().indexOf(q) !== -1;
  }).slice(0, 8);
  matches.forEach(function(name) {
    var btn = document.createElement('button');
    btn.textContent = name;
    btn.style.cssText =
      'width:100%;padding:9px 14px;background:var(--panel);color:var(--text);' +
      'border:1px solid var(--border);border-radius:4px;cursor:pointer;font-family:inherit;font-size:13px;text-align:left';
    btn.onmouseenter = function() { btn.style.background = 'rgba(232,70,58,0.12)'; btn.style.borderColor = 'var(--accent)'; };
    btn.onmouseleave = function() { btn.style.background = 'var(--panel)'; btn.style.borderColor = 'var(--border)'; };
    btn.onclick = function() { _stOpenStudent(name); };
    results.appendChild(btn);
  });
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
  hint.textContent = 'Tap a red lesson day to mark it as skipped.';
  section.appendChild(hint);
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

    var cell = document.createElement('button');
    cell.style.cssText = 'flex:1;padding:6px 4px;border-radius:4px;font-family:inherit;border:1px solid transparent;';
    if (lesson && !isPast) {
      cell.style.cssText +=
        'background:rgba(232,70,58,0.18);color:var(--accent);' +
        'border:1px solid rgba(232,70,58,0.5);cursor:pointer';
      cell.innerHTML =
        "<div style='font-size:9px;line-height:1;letter-spacing:0.5px'>" + dayName.toUpperCase() + "</div>" +
        "<div style='font-size:15px;font-weight:700;line-height:1.3'>" + d.getDate() + "</div>" +
        "<div style='font-size:9px;line-height:1.2;color:var(--accent);opacity:0.85'>" + lesson.time + "</div>";
      (function(l) {
        cell.onclick = function() { _stOpenSkipModal(studentName, l); };
      })(lesson);
    } else {
      cell.style.cssText +=
        'background:transparent;color:' + (isPast ? 'rgba(180,180,180,0.2)' : 'rgba(180,180,180,0.4)') + ';cursor:default';
      cell.innerHTML =
        "<div style='font-size:9px;line-height:1;letter-spacing:0.5px'>" + dayName.toUpperCase() + "</div>" +
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
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var box = document.createElement('div');
  box.style.cssText = 'background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:18px;max-width:420px;width:100%';
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


// ─── EXTERNAL LINKS ─────────────────────────────────────────────────────────

function _stOpenDropbox(studentName) {
  // Two-channel approach: copy name to clipboard AND fire the macOS Shortcut
  // URL. The Shortcut reads the clipboard and opens that Finder folder. If the
  // Shortcut isn't set up, the clipboard still has the path so the user can
  // paste it into Finder's Cmd+Shift+G.
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(studentName);
    } else {
      var ta = document.createElement('textarea');
      ta.value = studentName;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  } catch (e) {}
  window.location.href = 'shortcuts://run-shortcut?name=Open%20Student%20Folder';
  addLog('studentFeed', '📁 Opening ' + studentName + ' folder…', 'info');
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
