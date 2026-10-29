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
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
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
      if (_stState.view === 'search') _stRenderSearch();   // not over a page opened meanwhile
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}


// ─── 1) SEARCH VIEW ─────────────────────────────────────────────────────────

// Quick-open link row (source sheets + Google Calendar) shown at the top of a
// student's page. Small, right-aligned, opens each in a new tab so the portal
// stays put.
function _stMakeLinksBar() {
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;justify-content:flex-end;gap:6px;margin-bottom:14px';
  var btnStyle =
    'padding:4px 10px;font-size:10px;letter-spacing:0.5px;text-decoration:none;white-space:nowrap;' +
    'background:var(--panel);color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer';
  // Student Import deep-links straight to the open student's tab + last filled
  // row when the backend supplied it; otherwise falls back to the whole sheet.
  var importUrl = (_stState.current && _stState.current.importUrl) ||
                  'https://docs.google.com/spreadsheets/d/1GJB4BGETT4zeG1M7AKk48rhLaQw5ZqlImIDBC4ZepW4/edit';
  [['📊 Student Import',  importUrl],
   ['📊 RPM-Counter',     'https://docs.google.com/spreadsheets/d/1n-vZaaIgbs1nBCwrE-dAUNyz3q8LWjkB4uO0BSKTCQc/edit'],
   ['📅 Google Calendar', 'https://calendar.google.com/calendar/u/0/r']].forEach(function(s) {
    var a = document.createElement('a');
    a.href = s[1];
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s[0];
    a.style.cssText = btnStyle;
    bar.appendChild(a);
  });
  return bar;
}

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
  // Narrower than the 300px search box above it, and centered under it.
  results.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:16px;width:220px';
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
  'width:100%;padding:4px 9px;background:var(--panel);color:var(--accent2);' +
  'border:1px solid var(--border);border-radius:4px;cursor:pointer;font-family:inherit;font-size:9px;text-align:left';
var _ST_RESULT_HI =
  'width:100%;padding:4px 9px;background:color-mix(in srgb, var(--accent2) 12%, transparent);color:var(--accent2);' +
  'border:1px solid var(--accent2);border-radius:4px;cursor:pointer;font-family:inherit;font-size:9px;text-align:left';

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
  // Prefix-match the START of the full name only. You always type the first
  // name letter by letter, so "G" → every name starting with G, "Ga" narrows to
  // "Gail Greenwald" — and does NOT match "Jean Gabriel..." just because "Ga"
  // appears mid-name.
  return (_stState.roster || []).filter(function(name) {
    return name.toLowerCase().indexOf(q) === 0;
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

// Section headings inside the detail view — wide-tracked uppercase gray, matching
// the portal's section-label look (e.g. "TERMINATE · ARCHIVE A STUDENT").
var _ST_SECTION_TITLE =
  "font-family:'DM Mono',monospace;font-weight:500;font-size:12px;color:var(--text);" +
  "letter-spacing:3px;text-transform:uppercase;margin-bottom:11px";

function _stOpenStudent(name) {
  var section = document.getElementById('studentBody');
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
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

  // Top: quick-open links to the source sheets + Google Calendar.
  section.appendChild(_stMakeLinksBar());

  // Top: name with lesson # underneath it, back link on the right
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px';
  // Lesson-in-block number only matters on the actual lesson day — off-day it's
  // noise. On a lesson day: plain yellow "Today · Lesson N" text (no pill).
  // Otherwise just tell me when the last lesson was.
  // "Last lesson" date comes from the Counter — the absolute lesson record — since
  // Students Import can lag behind it. Fall back to Import's newest row only if the
  // Counter had no date at all.
  var lastLessonDate = d.counterLastDate ||
    ((d.pastLessons && d.pastLessons.length) ? d.pastLessons[0].date : '');
  var subLine = d.isLessonToday
    ? "<div style='font-size:11px;color:var(--accent2);margin-top:4px;letter-spacing:0.5px'>" +
        "Today · Lesson " + d.lessonInBlock +
        // Today's lesson already in Import → mark it done right on the header line.
        (d.loggedToday ? " <span style='color:var(--green)'>· logged ✓</span>" : "") +
      "</div>"
    : "<div style='font-size:11px;color:var(--muted);margin-top:4px;text-transform:none;letter-spacing:0.5px'>" +
        "(last lesson on: " + (lastLessonDate || '—') + ")" +
      "</div>";
  hdr.innerHTML =
    "<div>" +
      "<div style='font-family:\"Syne\",sans-serif;font-weight:400;font-size:20px;letter-spacing:0.3px'>" + d.name + "</div>" +
      subLine +
    "</div>" +
    "<button id='stBack' data-tip='Closes the student.' style='padding:5px 10px;font-size:15px;line-height:1;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>✕</button>";
  section.appendChild(hdr);
  document.getElementById('stBack').onclick = function() { _stState.view = 'search'; _stRenderSearch(); };

  // Wrong-number warning — raised by the Student Line's "Misplaced" action when
  // this student texted the RPM line by mistake. Shows the offending text; the
  // checkbox clears it once you've reminded them in person. (Built with DOM
  // nodes, not innerHTML, so the student's text can't inject markup.)
  if (d.wrongNumberFlag) {
    var wn = document.createElement('div');
    wn.style.cssText = 'border:1px solid rgba(255,120,60,0.5);background:rgba(255,120,60,0.1);border-radius:6px;padding:12px 14px;margin-bottom:18px';

    var wnTitle = document.createElement('div');
    wnTitle.style.cssText = 'color:#ff7a3c;font-weight:600;font-size:12px;margin-bottom:6px';
    wnTitle.textContent = '⚠ Texted the RPM line by mistake';

    var wnMsg = document.createElement('div');
    wnMsg.style.cssText = 'font-size:12px;color:var(--text);margin-bottom:4px;white-space:pre-wrap';
    wnMsg.textContent = '“' + (d.wrongNumberFlag.text || '') + '”';

    var wnWhen = document.createElement('div');
    wnWhen.style.cssText = 'font-size:10px;color:var(--muted);margin-bottom:10px';
    wnWhen.textContent = d.wrongNumberFlag.flaggedAt || '';

    var wnLbl = document.createElement('label');
    wnLbl.style.cssText = 'display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--text);cursor:pointer;line-height:1.4';
    var wnCb = document.createElement('input');
    wnCb.type = 'checkbox';
    wnCb.style.marginTop = '2px';
    wnLbl.appendChild(wnCb);
    wnLbl.appendChild(document.createTextNode('Remind them: save two contacts (RPM vs personal) & keep chat on personal — tick when done'));

    wn.appendChild(wnTitle); wn.appendChild(wnMsg); wn.appendChild(wnWhen); wn.appendChild(wnLbl);
    section.appendChild(wn);

    wnCb.onchange = function() {
      if (!wnCb.checked) return;
      var url = getScriptUrl(); if (!url) { wnCb.checked = false; return; }
      wnCb.disabled = true;
      fetch(url + '?action=clearWrongNumberFlag&student=' + encodeURIComponent(d.name))
        .then(function(r) { return r.json(); })
        .then(function() { d.wrongNumberFlag = null; wn.remove(); })
        .catch(function() { wnCb.disabled = false; wnCb.checked = false; });
    };
  }

  // PAST section
  var pastLabel = document.createElement('div');
  pastLabel.style.cssText = _ST_SECTION_TITLE;
  pastLabel.textContent = 'Past';
  section.appendChild(pastLabel);

  if (d.pastBlocks && d.pastBlocks.length) {
    // Block view: each block is a card of 4 lesson slots (1-4). Filled slots show
    // subject + date; empty slots are dimmed placeholders so you can see exactly
    // where the student is in the current block. Previous block first, then current.
    d.pastBlocks.forEach(function(blk) {
      var box = document.createElement('div');
      box.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:8px 12px;margin-bottom:10px';

      blk.lessons.forEach(function(p) {
        var row = document.createElement('div');
        // Let long subjects wrap onto multiple lines instead of being clipped;
        // wrapped lines hang-indent under the subject, clear of the "N." number.
        row.style.cssText = 'padding:3px 0 3px 18px;text-indent:-18px;font-size:12px;line-height:1.4;word-break:break-word';
        if (p.trial) {
          // Lesson 1: the trial's What We Did, no date.
          row.innerHTML =
            "<span style='color:var(--muted)'>Trial: </span>" +
            (p.subject
              ? "<span style='color:#8f8f8f'>" + p.subject + "</span>"
              : "<span style='color:var(--muted);font-style:italic'>nothing logged</span>");
        } else if (p.empty) {
          row.innerHTML =
            "<span style='color:var(--border)'>" + p.n + ". </span>" +
            "<span style='color:var(--border)'>—</span>";
        } else {
          row.innerHTML =
            "<span style='color:var(--muted)'>" + p.n + ". </span>" +
            "<span style='color:#8f8f8f'>" + (p.subject || '—') + "</span>" +
            "<span style='color:var(--muted)'> · " + (p.date || '—') + "</span>";
        }
        box.appendChild(row);
      });
      section.appendChild(box);
    });
    // small gap before the next section
    var spacer = document.createElement('div');
    spacer.style.cssText = 'height:6px';
    section.appendChild(spacer);
  } else {
    // Fallback (older backend without pastBlocks): flat last-4 list.
    var pastBox = document.createElement('div');
    pastBox.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:10px 12px;margin-bottom:16px';
    if (d.pastLessons && d.pastLessons.length) {
      d.pastLessons.forEach(function(p, i) {
        var row = document.createElement('div');
        row.style.cssText = 'padding:4px 0 4px 18px;text-indent:-18px;font-size:12px;line-height:1.4;word-break:break-word';
        row.innerHTML =
          "<span style='color:var(--muted)'>" + (i + 1) + ". </span>" +
          "<span style='color:#8f8f8f'>" + (p.subject || '—') + "</span>" +
          "<span style='color:var(--muted)'> · " + (p.date || '—') + "</span>";
        pastBox.appendChild(row);
      });
    } else {
      pastBox.innerHTML = "<div style='font-size:12px;color:var(--muted);padding:4px 0'>None</div>";
    }
    section.appendChild(pastBox);
  }

  // PAYMENT section
  var payLabel = document.createElement('div');
  payLabel.style.cssText = _ST_SECTION_TITLE;
  payLabel.textContent = 'Payment';
  section.appendChild(payLabel);

  var payRow = document.createElement('div');
  payRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--panel);margin-bottom:16px';
  var payColors = { 'Paid': '#8f8f8f', 'Due': '#ffb400', 'Overdue': '#ff5050' };
  var payColor = payColors[d.paymentStatus] || 'var(--muted)';
  payRow.innerHTML =
    "<span style='font-size:12px;color:" + payColor + "'>" + (d.paymentStatus || '—') + "</span>" +
    "<button id='stAuditBtn' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>Audit →</button>";
  section.appendChild(payRow);
  document.getElementById('stAuditBtn').onclick = _stOpenAudit;

  // SUBJECT section
  var subjLabel = document.createElement('div');
  subjLabel.style.cssText = _ST_SECTION_TITLE;
  subjLabel.textContent = 'Subject';
  section.appendChild(subjLabel);

  // Primary action: Log Lesson.
  //  · On the lesson day  → one-click "Log Today's Lesson".
  //  · Off-day (late-log / correcting) → a date stepper that starts at today and
  //    steps ±1 day (▲/▼ buttons or keyboard Up/Down), plus a Log button that
  //    records for the chosen date.
  var _stLogGreen = 'width:100%;padding:10px;font-size:13px;background:color-mix(in srgb, var(--green) 12%, transparent);' +
    'color:var(--green);border:1px solid color-mix(in srgb, var(--green) 40%, transparent);border-radius:6px;cursor:pointer;letter-spacing:0.3px';

  if (d.isLessonToday && d.loggedToday) {
    // Today's lesson is already in Import → a done bar instead of a live log
    // button, so you can't double-log. After an in-session log the page re-fetches
    // detail and lands here automatically, flipping the button to this state.
    var doneBar = document.createElement('div');
    doneBar.textContent = "✓ Lesson Logged";
    doneBar.style.cssText = 'width:100%;padding:10px;font-size:13px;background:color-mix(in srgb, var(--green) 12%, transparent);' +
      'color:var(--green);border:1px solid color-mix(in srgb, var(--green) 40%, transparent);border-radius:6px;text-align:center;' +
      'letter-spacing:0.3px;margin-bottom:18px;box-sizing:border-box';
    section.appendChild(doneBar);
  } else if (d.isLessonToday) {
    // Lesson day → yellow box, matching the yellow "Today" line up top.
    var logBtn = document.createElement('button');
    logBtn.textContent = "📊 Log Today's Lesson";
    logBtn.style.cssText = 'width:100%;padding:10px;font-size:13px;background:color-mix(in srgb, var(--accent2) 14%, transparent);' +
      'color:var(--accent2);border:1px solid color-mix(in srgb, var(--accent2) 50%, transparent);border-radius:6px;cursor:pointer;' +
      'letter-spacing:0.3px;margin-bottom:18px';
    logBtn.onclick = function() { _stLogLessonFor(d.name, _stToday()); };
    section.appendChild(logBtn);
  } else {
    var logWrap = document.createElement('div');
    logWrap.style.cssText = 'margin-bottom:18px';
    var logDate = _stToday();   // adjustable log date, starts at today

    var logBtn2 = document.createElement('button');
    logBtn2.style.cssText = _stLogGreen;
    logBtn2.onclick = function() { _stLogLessonFor(d.name, logDate); };

    // The portal's date picker (rpmDtpHtml), date only (2026-10-06).
    var stepper = document.createElement('div');
    stepper.style.cssText = 'display:flex;justify-content:center;margin-bottom:8px';
    stepper.innerHTML = rpmDtpHtml('stLog', { date: rpmDtpYmd(logDate), noTime: true, onChange: function() {
      logDate = rpmDtpParse(rpmDtpGet('stLog').date) || logDate;
      _stPaintLogDate();
    } });

    function _stPaintLogDate() {
      logBtn2.textContent = '📊 Log Lesson · ' + _stMonDay(logDate);
    }
    _stPaintLogDate();

    logWrap.appendChild(stepper);
    logWrap.appendChild(logBtn2);
    section.appendChild(logWrap);
  }

  // HW section
  var hwLabel = document.createElement('div');
  hwLabel.style.cssText = _ST_SECTION_TITLE;
  hwLabel.textContent = 'HW';
  section.appendChild(hwLabel);

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

  // Drag-and-drop upload straight into the student's shared Dropbox folder. Double height.
  var drop = document.createElement('div');
  drop.id = 'stDropZone';
  drop.dataset.folder = d.name;
  drop.dataset.idle = '⬆ Drag homework files or folders here to upload to ' + d.name + "'s Dropbox";
  drop.textContent = drop.dataset.idle;
  drop.style.cssText = 'margin-bottom:14px;padding:60px 16px;border:1.5px dashed rgba(91,157,255,0.4);border-radius:8px;' +
    'text-align:center;font-size:12px;color:var(--muted);cursor:pointer;transition:border-color .15s,background .15s';
  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  fileInput.onchange = function () { if (fileInput.files.length) _stUploadToDropbox(d.name, fileInput.files, drop); fileInput.value = ''; };
  drop.onclick = function () { fileInput.click(); };
  drop.ondragover = function (ev) { ev.preventDefault(); drop.style.borderColor = '#5b9dff'; drop.style.background = 'rgba(91,157,255,0.08)'; };
  drop.ondragleave = function () { drop.style.borderColor = 'rgba(91,157,255,0.4)'; drop.style.background = 'transparent'; };
  drop.ondrop = function (ev) {
    ev.preventDefault();
    drop.style.borderColor = 'rgba(91,157,255,0.4)'; drop.style.background = 'transparent';
    if (!ev.dataTransfer) return;
    rpmSetLoading(drop, 'Reading');
    collectDroppedFiles(ev.dataTransfer, function (files) {
      if (files.length) _stUploadToDropbox(d.name, files, drop);
      else drop.textContent = drop.dataset.idle;
    });
  };
  section.appendChild(drop);
  section.appendChild(fileInput);

  // Folder picker: the whole folder uploads with its structure kept.
  var folderInput = document.createElement('input');
  folderInput.type = 'file';
  folderInput.multiple = true;
  folderInput.setAttribute('webkitdirectory', '');
  folderInput.style.display = 'none';
  folderInput.onchange = function () {
    var files = Array.prototype.slice.call(folderInput.files).filter(function (f) {
      return !f.webkitRelativePath.split('/').some(function (seg) { return seg.charAt(0) === '.'; });
    });
    if (files.length) _stUploadToDropbox(d.name, files, drop);
    folderInput.value = '';
  };
  var folderBtn = document.createElement('button');
  folderBtn.textContent = '\ud83d\udcc2 Browse folder';
  folderBtn.style.cssText = 'width:100%;margin:-6px 0 14px;padding:9px;font-size:12px;background:transparent;color:var(--text);border:1px solid rgba(91,157,255,0.4);border-radius:6px;cursor:pointer';
  folderBtn.onclick = function () { folderInput.click(); };
  section.appendChild(folderBtn);
  section.appendChild(folderInput);

  // SCHEDULE section
  var schedLabel = document.createElement('div');
  schedLabel.style.cssText = _ST_SECTION_TITLE;
  schedLabel.textContent = 'Schedule';
  section.appendChild(schedLabel);

  // Calendar — all the way at the bottom
  var calBtn = document.createElement('button');
  calBtn.textContent = '📅 Reschedule';
  calBtn.style.cssText = 'width:100%;padding:10px;font-size:13px;background:transparent;color:var(--text);border:1px solid rgba(232,70,58,0.55);border-radius:6px;cursor:pointer;margin-top:6px;letter-spacing:0.3px';
  calBtn.onclick = _stOpenCalendar;
  section.appendChild(calBtn);
}


// ─── 3) AUDIT DRILL-DOWN ────────────────────────────────────────────────────

function _stOpenAudit() {
  var section = document.getElementById('studentBody');
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
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

  // Verdict banner — one glance: is this student clean, or is something off?
  // Problem = Counter dates missing from Import, or an overdue payment.
  var _missing = data.missingFromImport || [];
  var problems = [];
  if (_missing.length) problems.push(_missing.length + ' date' + (_missing.length > 1 ? 's' : '') + ' missing from Import');
  if (data.paymentStatus === 'Overdue') problems.push('payment overdue');
  var hasProblem = problems.length > 0;

  var verdict = document.createElement('div');
  verdict.style.cssText = 'padding:10px 12px;border-radius:6px;margin-bottom:10px;font-size:13px;font-weight:600;border:1px solid ' +
    (hasProblem ? 'rgba(255,180,0,0.5);background:rgba(255,180,0,0.10);color:#ffb400'
                : 'color-mix(in srgb, var(--green) 50%, transparent);background:color-mix(in srgb, var(--green) 10%, transparent);color:var(--green)');
  verdict.textContent = hasProblem ? ('⚠ Needs attention — ' + problems.join(' · ')) : '✓ Looks good — nothing to fix';
  section.appendChild(verdict);

  // Fixes live in the Audit tab — jump straight there.
  var fixBtn = document.createElement('button');
  fixBtn.textContent = hasProblem ? '🔧 Fix in Audit tab →' : 'Open Audit tab →';
  fixBtn.style.cssText = 'width:100%;padding:9px;font-size:12px;border-radius:6px;cursor:pointer;margin-bottom:14px;letter-spacing:0.3px;' +
    (hasProblem ? 'background:rgba(255,180,0,0.14);color:#ffb400;border:1px solid rgba(255,180,0,0.5)'
                : 'background:transparent;color:var(--muted);border:1px solid var(--border)');
  fixBtn.onclick = function() { if (typeof switchTab === 'function') { switchTab('import'); openLessonAudit(); } };   // Logs lives in Students now (2026-10-14)
  section.appendChild(fixBtn);

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

// From another tab (Import's Reschedule button): this student's 8-week
// calendar straight away. Back from it lands on their Home page.
function _stOpenCalendarFor(name) {
  _stState.view = 'detail';
  var section = document.getElementById('studentBody');
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  var url = getScriptUrl(); if (!url) return;
  fetch(url + '?action=getStudentDetail&name=' + encodeURIComponent(name))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>'; return; }
      _stState.current = data;
      _stOpenCalendar();
    });
}

function _stOpenCalendar() {
  var section = document.getElementById('studentBody');
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
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
    empty.textContent = 'None';
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
    var weekStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + w * 7);
    strips.appendChild(_stBuildWeekStrip(weekStart, byDate, today, data.student));
  }
  section.appendChild(strips);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:var(--muted);text-align:center;margin-top:12px';
  hint.textContent = 'Tap a lesson day to reschedule or skip it.';
  section.appendChild(hint);
}

var ST_TODAY_MARK = "<span style='font-size:14px;line-height:9px'>⟶</span>";   // under today's date, the long arrow (user, 2026-10-29)

// opts (optional, Import's Reschedule window): passed on to the lesson chooser.
function _stBuildWeekStrip(monday, byDate, today, studentName, opts) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:4px;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:6px';
  for (var i = 0; i < 7; i++) {
    // Calendar days, not 24h steps: a 25-hour day (clocks back, Nov 1) shifted every later day (2026-10-06).
    var d   = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
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
      + (isFirst ? ';color:var(--blue)' : '');   // blue, not the lessons' red; not bold (user, 2026-10-29; was amber)

    var cell = document.createElement('button');
    cell.style.cssText = 'flex:1;padding:6px 4px;border-radius:4px;font-family:inherit;border:1px solid transparent;';
    // Tag every cell with its date + whether it holds a lesson.
    cell.dataset.ymd  = ymd;
    cell.dataset.past = isPast ? '1' : '0';
    cell.dataset.has  = (lesson && !isPast) ? '1' : '0';
    if (lesson && !isPast) {
      cell.style.cssText +=
        'background:rgba(232,70,58,0.18);color:var(--accent);' +
        'border:1px solid rgba(232,70,58,0.5);cursor:pointer';
      cell.innerHTML =
        "<div style='" + topStyle + "'>" + topLabel + "</div>" +
        "<div style='font-size:15px;font-weight:700;line-height:1.3" + (isFirst ? ";color:var(--blue)" : '') + "'>" + d.getDate() + "</div>" +   // the 1st's number blue on a lesson too (user, 2026-10-29)
        "<div style='font-size:9px;line-height:1.2;color:var(--accent);opacity:0.85'>" + lesson.time + "</div>";
      (function(l, c) {
        // The 8-week view picks on the calendar itself (user, 2026-10-26): no Lesson window.
        cell.onclick = opts && opts.pick ? function() { _stPickLesson(c, studentName, l, opts); }
          : function() { _stOpenLessonActions(studentName, l, opts); };
      })(lesson, cell);
    } else if (lesson && isPast) {
      // A lesson already had this week: still shown, dimmed, nothing to tap (user, 2026-10-29).
      cell.style.cssText +=
        'background:rgba(232,70,58,0.18);color:var(--accent);border:1px solid rgba(232,70,58,0.5);opacity:.35;cursor:default';
      cell.innerHTML =
        "<div style='" + topStyle + "'>" + topLabel + "</div>" +
        "<div style='font-size:15px;font-weight:700;line-height:1.3" + (isFirst ? ";color:var(--blue)" : '') + "'>" + d.getDate() + "</div>" +   // the 1st's number blue on a lesson too (user, 2026-10-29)
        "<div style='font-size:9px;line-height:1.2;color:var(--accent);opacity:0.85'>" + lesson.time + "</div>";
    } else {
      var isToday = ymd === _stYmd(today);   // a step brighter than the other days (user, 2026-10-29)
      cell.style.cssText +=
        'background:transparent;color:' + (isPast ? 'rgba(180,180,180,0.2)' : isToday ? 'rgba(215,215,215,0.75)' : 'rgba(180,180,180,0.4)') + ';cursor:default';
      cell.innerHTML =
        "<div style='" + topStyle + "'>" + topLabel + "</div>" +
        "<div style='font-size:13px;line-height:1.3" + (isFirst ? ";color:var(--blue)" : '') + "'>" + d.getDate() + "</div>" +   // the 1st's number blue too
        "<div style='font-size:9px;line-height:1.2'>" + (isToday ? ST_TODAY_MARK : '&nbsp;') + "</div>";   // → under today: the future starts here (user, 2026-10-29)
      if (isToday) cell.dataset.today = '1';
      // With a lesson picked, any later day is where it moves to (user, 2026-10-26).
      if (opts && opts.pick && !isPast) (function(c, y) { c.onclick = function() { _stPickDay(c, y); }; })(cell, ymd);
    }
    row.appendChild(cell);
  }
  return row;
}


// ─── TIME DROPDOWN (user, 2026-10-29) ───────────────────────────────────────
// A time box that opens a list of half hours above it, scrolled to the one
// set; a click picks it. No arrows. First in Change appointment (Reschedule's
// time under the weeks) and Slot change.
//   rpmTimeDropHtml(id, 'HH:mm', { onChange(hhmm), disabled })
//   rpmTimeDropGet(id) -> 'HH:mm' · rpmTimeDropSet(id, 'HH:mm')
var RPM_TP_FROM = 8 * 60, RPM_TP_TO = 22 * 60;   // 8:00 AM to 10:00 PM
var _rpmTp = {};
function _rpmTpLbl(m) { var h = Math.floor(m / 60); return ((h % 12) || 12) + ':' + _stPad2(m % 60) + (h < 12 ? ' AM' : ' PM'); }
function _rpmTpMins(v) { var m = String(v || '').match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; }
function _rpmTpOpts(cur) {
  var out = [];
  for (var m = RPM_TP_FROM; m <= RPM_TP_TO; m += 30) out.push(m);
  if (cur !== null && out.indexOf(cur) === -1) { out.push(cur); out.sort(function(a, b) { return a - b; }); }   // an odd time stays pickable
  return out.map(function(m) {
    return "<button type='button' class='rpm-tp-opt" + (m === cur ? " on" : "") + "' data-v='" + _stPad2(Math.floor(m / 60)) + ':' + _stPad2(m % 60) + "'>" + _rpmTpLbl(m) + "</button>";
  }).join('');
}
function rpmTimeDropHtml(id, v, o) {
  _rpmTpStyle();
  _rpmTp[id] = { v: v || '', o: o || {} };
  var cur = _rpmTpMins(v);
  return "<div class='rpm-tp' id='" + id + "Tp' data-tp='" + id + "'><button type='button' class='rpm-tp-btn'" + (o && o.disabled ? " disabled" : "") + ">" +
    "<span class='rpm-tp-v'>" + (cur === null ? '—' : _rpmTpLbl(cur)) + "</span><span class='rpm-tp-chev'>" + dtArrow(-1) + "</span></button>" +
    "<div class='rpm-tp-list'>" + _rpmTpOpts(cur) + "</div></div>";
}
function rpmTimeDropGet(id) { return (_rpmTp[id] || {}).v || ''; }
function rpmTimeDropSet(id, v) {
  var st = _rpmTp[id], box = document.getElementById(id + 'Tp');
  if (!st) return;
  st.v = v;
  if (!box) return;
  var cur = _rpmTpMins(v);
  box.querySelector('.rpm-tp-v').textContent = cur === null ? '—' : _rpmTpLbl(cur);
  box.querySelector('.rpm-tp-list').innerHTML = _rpmTpOpts(cur);
}
function rpmTimeDropEnable(id, on) {
  var b = document.querySelector('#' + id + 'Tp .rpm-tp-btn');
  if (b) b.disabled = !on;
}
function _rpmTpClose() { document.querySelectorAll('.rpm-tp.open').forEach(function(t) { t.classList.remove('open'); }); }
document.addEventListener('click', function(e) {
  var btn = e.target.closest && e.target.closest('.rpm-tp-btn'), opt = e.target.closest && e.target.closest('.rpm-tp-opt');
  if (opt) {
    var box = opt.closest('.rpm-tp'), id = box.dataset.tp, st = _rpmTp[id];
    _rpmTpClose();
    if (st && opt.dataset.v !== st.v) { rpmTimeDropSet(id, opt.dataset.v); if (st.o.onChange) st.o.onChange(opt.dataset.v); }
    return;
  }
  if (btn) {
    var tp = btn.closest('.rpm-tp'), was = tp.classList.contains('open');
    _rpmTpClose();
    if (!was && !btn.disabled) {
      tp.classList.add('open');
      var on = tp.querySelector('.rpm-tp-opt.on'), list = tp.querySelector('.rpm-tp-list');
      if (on) list.scrollTop = on.offsetTop - list.clientHeight / 2 + on.offsetHeight / 2;
    }
    return;
  }
  _rpmTpClose();
});
function _rpmTpStyle() {
  if (document.getElementById('rpmTpStyle')) return;
  var st = document.createElement('style');
  st.id = 'rpmTpStyle';
  st.textContent =
    ".rpm-tp{position:relative;display:inline-block}" +
    ".rpm-tp-btn{display:flex;align-items:center;gap:14px;height:40px;box-sizing:border-box;padding:0 14px 0 18px;border:2px solid var(--border);border-radius:var(--radius-card);" +
      "background:var(--surface);color:var(--text);font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.8px;text-transform:uppercase;cursor:pointer}" +
    ".rpm-tp-btn:hover:where(:not(:disabled)){border-color:var(--muted)}" +
    ".rpm-tp-btn:disabled{opacity:.35;cursor:default}" +
    ".rpm-tp-chev .dt-ico{width:11px;height:6px;display:block;fill:currentColor;color:var(--muted)}" +
    ".rpm-tp-list{display:none;position:absolute;left:0;bottom:calc(100% + 6px);z-index:5;max-height:220px;overflow:auto;min-width:100%;padding:4px;box-sizing:border-box;" +
      "background:var(--surface);border:1px solid var(--muted);border-radius:var(--radius-card);box-shadow:0 8px 28px rgba(0,0,0,.6)}" +
    ".rpm-tp.open .rpm-tp-list{display:block}" +
    ".rpm-tp-opt{display:block;width:100%;text-align:left;padding:6px 12px;border:none;border-radius:6px;background:transparent;color:var(--t-normal);" +
      "font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.8px;text-transform:uppercase;cursor:pointer;white-space:nowrap}" +
    ".rpm-tp-opt:hover:where(:not(:disabled)){background:rgba(255,255,255,0.08);color:#fff}" +
    ".rpm-tp-opt.on{color:#fff;background:rgba(255,255,255,0.06)}" +
    // The ✕ / ✓ / clock on the days: 16px, styles.css's size (user, 2026-10-29: tried 20, back to 16).
    ".im-rs-strips .st-pick-ok,.im-rs-strips .st-pick-x{border:none;display:flex;align-items:center;justify-content:center}" +   // the icons bring their own circles
    ".st-pick-x .st-x-ico{width:16px;height:16px;display:block}" +
    ".im-rs-strips{position:relative}" +
    // Skipping: the red brush ✕ over the day, the day under it dimmed (user, 2026-10-29; was crossed-out text).
    ".st-skip-mark{position:absolute;left:20%;top:18%;width:60%;height:64%;color:#ed2d24;opacity:.45;pointer-events:none}" +   // quieter: half strength, smaller (user, 2026-10-29)
    ".im-rs-strips.st-decided .st-pick-x,.im-rs-strips.st-decided .st-pick-ok,.im-rs-strips.st-decided .st-pick-clock{display:none}" +
    ".im-rs-iconrow{display:flex;align-items:center;justify-content:space-between}" +
    ".im-rs-undo{height:22px;box-sizing:border-box;text-transform:none;letter-spacing:0;font-size:10px;padding:0 9px}" +
    ".im-rs-undo:disabled{opacity:.35;cursor:default}" +
    // Requested by / Reason / Confirm move under the weeks: the Reschedule window's look, dimmed until the ✓.
    ".im-rs-confirm.st-off{opacity:.35;pointer-events:none}" +
    "#imRsWin .field-label.st-gap{margin-top:34px}" +
    "#imRsWin .st-who{flex-direction:column;align-items:flex-start;gap:12px}" +
    "#imRsWin .st-who .db-check{flex-direction:row-reverse;justify-content:space-between;width:110px}" +
    "#imRsWin .st-foot{margin-top:40px}" +
    // Decided with the ✓: the day moved to looks like a lesson, red (user, 2026-10-29).
    ".im-rs-strips .st-pick-to.st-pick-done{background:rgba(232,70,58,0.18) !important;border-color:rgba(232,70,58,0.5) !important;color:var(--accent) !important}" +
    ".im-rs-strips .st-pick-to.st-pick-done div{color:var(--accent) !important}" +
    ".st-pick-arrow{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;color:rgba(255,255,255,0.18);z-index:3}" +   // fainter than the picked lesson's border (user, 2026-10-29; was green)
    // The lesson picked to change, dimmer: it is going away (user, 2026-10-29). Its ✕ stays bright.
    ".im-rs-strips .st-pick-sel{background:rgba(255,255,255,0.04) !important;border-color:rgba(255,255,255,0.3) !important}" +
    ".im-rs-strips .st-pick-sel div{color:rgba(255,255,255,0.4) !important}" +
    ".im-rs-strips .st-pick-x{color:rgba(255,255,255,0.85)}" +
    ".st-pick-ok .st-check-ico{width:16px;height:16px;display:block}" +
    ".im-rs-strips .st-pick-ok{color:rgba(255,255,255,0.85)}" +   // white (user, 2026-10-29; the clock stays green)
    ".im-rs-strips .st-pick-ok:hover{background:#1a1a1a;color:var(--green)}" +
    // Change appointment: the clock on the day moved to, bottom left (user, 2026-10-29; the ✓ is top right), green like the day.
    ".st-pick-clock{position:absolute;bottom:-7px;left:-7px;width:16px;height:16px;border-radius:50%;background:#1a1a1a;color:var(--green);cursor:pointer;display:flex;align-items:center;justify-content:center}" +
    ".st-pick-clock .st-clock-ico{width:16px;height:16px;display:block}" +
    ".st-pick-clock:hover{color:#fff}" +
    ".st-tpop{position:absolute;z-index:20;max-height:220px;overflow:auto;padding:4px;box-sizing:border-box;background:var(--surface);border:1px solid var(--green);" +
      "border-radius:var(--radius-card);box-shadow:0 8px 28px rgba(0,0,0,.6)}" +
    ".im-rs-moved{min-height:44px;box-sizing:border-box;margin-top:10px;padding:0 16px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;border:1px solid var(--border);border-radius:var(--radius-card);" +
      "font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.8px;text-transform:uppercase;color:var(--text)}" +
    ".im-rs-moved-l{color:var(--t-faint);letter-spacing:2px}" +
    // MOVING TO over the box in the SKIP / RESCHEDULE titles' look; the date centred inside.
    "#imRsWin .im-rs-weeks-l{margin-top:28px}" +   // room where the line above Next 8 weeks was
    ".im-rs-moved-h{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--t-faint);margin-top:22px}" +
    ".im-rs-hint ol{padding-left:34px}" +   // the step numbers a little further in (user, 2026-10-29; was 22px)
    ".im-rs-hint.im-rs-hint-top{margin-top:0}" +   // the steps at the top now
    // SKIP / RESCHEDULE in the To make a change title's look (user, 2026-10-29).
    ".im-rs-hint .im-rs-h{font-family:'DM Mono',monospace;font-size:11px;font-weight:400;letter-spacing:2.5px;text-transform:uppercase;color:var(--t-faint);margin-bottom:10px}" +
    ".im-rs-hint li::marker{color:var(--t-faint)}" +   // the step numbers in the titles' grey (user, 2026-10-29)
    ".im-rs-timerow{display:flex;align-items:center;gap:14px;margin-top:20px}" +
    ".im-rs-timerow .field-label{margin:0 !important;font-family:'DM Mono',monospace;font-size:11.5px;letter-spacing:2.5px;text-transform:uppercase;color:var(--t-faint)}";
  document.head.appendChild(st);
}
function _stHhmm(label) {   // "6:30 PM" -> "18:30"
  var t = _stParseTime(label);
  return _stPad2((t.h12 % 12) + (t.ap === 'PM' ? 12 : 0)) + ':' + _stPad2(t.min);
}


// ─── PICK ON THE 8-WEEK VIEW (user, 2026-10-26) ─────────────────────────────
// Tap a red lesson day: it lights up (white) with an ✕ on it; ✕ opens Skip.
// Tapping other days marks them green with a ✓, one at a time; that ✓
// opens Reschedule with the day as Move to.
// The same lesson again lets it go. One lesson at a time.
var _stPickSel = null;   // { cell, lesson, name, opts, to }
// The steps under the weeks (user, 2026-10-28). From the Calendar tab the lesson is
// picked already, so it starts at Skip; from the Log window step 1 is picking it.
function _stHowSteps(from) {
  return "<div class='im-rs-sec'><div class='im-rs-h'>SKIP</div><ol start='" + from + "'><li>Tap ✕ on the day</li><li>Who asked, then Confirm skip</li></ol></div>" +
    "<div class='im-rs-sec'><div class='im-rs-h'>RESCHEDULE</div><ol start='" + from + "'><li>Click the day you want to move it to</li><li>Pick the time on its clock (bottom left corner)</li><li>Tap ✓ when it's right</li><li>Who asked, then Confirm move</li></ol></div>";
}
var ST_HOW_PICKED = _stHowSteps(1);
var ST_HOW_PICK   = "<div class='im-rs-sec'><div class='im-rs-cap'>To make a change</div><ol><li>Click on a lesson (red) to change</li></ol></div>" + _stHowSteps(2);
function _stPickHint(html) { var h = document.querySelector('#imRsWin .im-rs-hint'); if (h) h.innerHTML = html; }
// The skip mark laid over a skipped day (om-138.svg, user, 2026-10-29): a red
// brush ✕ across the whole day.
var ST_SKIP_MARK = '<svg class="st-skip-mark" viewBox="0 17 907 987" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="M 893.628906 877.9375 C 876.261719 843.601562 851.199219 814.78125 826.960938 786.914062 C 819.664062 778.519531 812.113281 769.84375 804.996094 761.25 C 793.636719 747.539062 781.742188 733.578125 769.65625 719.753906 C 706.886719 647.972656 638.925781 579.84375 571.886719 513.859375 C 671.65625 380.71875 766.609375 253.125 851.527344 138.820312 C 880.242188 100.164062 887.433594 68.457031 872.898438 44.585938 C 853.828125 13.25 808.632812 13.628906 772.707031 24.4375 C 709.425781 43.464844 661.257812 105.640625 621.082031 162.425781 C 616.132812 169.417969 611.28125 176.375 606.5 183.226562 C 594.015625 201.113281 582.226562 218.007812 570.730469 232.765625 C 527.355469 288.453125 486.890625 341.246094 448.542969 392.128906 C 418.566406 362.050781 388.8125 331.523438 360.003906 300.59375 C 339.328125 278.390625 318.660156 255.398438 298.671875 233.160156 C 267.960938 198.988281 236.199219 163.65625 203.503906 130.179688 C 198.382812 124.9375 191.9375 117.492188 184.476562 108.867188 C 146.136719 64.570312 88.203125 -2.378906 39.089844 26.640625 C 17.148438 39.601562 4.441406 57.0625 1.324219 78.539062 C -4.558594 119.078125 24.722656 173.351562 90.839844 244.457031 C 121.425781 277.351562 151.40625 311.265625 180.40625 344.0625 C 215.8125 384.113281 252.429688 425.53125 290 464.894531 L 348.875 526.578125 C 284.21875 614.910156 216.183594 702.671875 150.292969 787.628906 C 127.855469 816.554688 105.425781 845.476562 83.082031 874.46875 C 70.949219 890.210938 57.203125 908.058594 52.109375 930.363281 C 46.878906 953.28125 53.535156 982.898438 76.382812 995.148438 C 86.507812 1000.574219 97.089844 1003.292969 108.214844 1003.292969 C 130.019531 1003.292969 153.890625 992.832031 180.382812 971.792969 C 267.570312 902.542969 319.296875 848.933594 393.261719 751.160156 C 418.433594 717.886719 443.480469 684.695312 468.367188 651.652344 C 518.835938 704.136719 573.664062 760.070312 635.160156 821.804688 C 664.546875 851.3125 695.605469 882.296875 732.902344 919.320312 C 738.863281 925.234375 745.382812 932.941406 752.28125 941.097656 C 775.304688 968.328125 803.785156 1002.015625 840.128906 1002.011719 C 841.246094 1002.011719 842.375 1001.980469 843.503906 1001.917969 C 873.671875 1000.1875 888.902344 984.382812 896.367188 971.425781 C 912.753906 942.972656 906.796875 903.972656 893.628906 877.9375 Z M 893.628906 877.9375 "/></svg>';

// The ✕ on the picked lesson (om-137.svg, user, 2026-10-29): its own circle,
// the ✓ and clock's look; fill turned into currentColor.
var ST_X_ICON = '<svg class="st-x-ico" viewBox="0 0 1158.75 1158.75" aria-hidden="true"><path fill="currentColor" d="M 579.117188 -0.375 C 569.632812 -0.375 560.152344 -0.140625 550.675781 0.324219 C 541.203125 0.792969 531.746094 1.488281 522.304688 2.417969 C 512.863281 3.351562 503.453125 4.511719 494.070312 5.902344 C 484.6875 7.296875 475.34375 8.917969 466.039062 10.769531 C 456.734375 12.621094 447.484375 14.699219 438.28125 17.003906 C 429.082031 19.308594 419.941406 21.835938 410.863281 24.589844 C 401.785156 27.34375 392.78125 30.320312 383.851562 33.515625 C 374.917969 36.710938 366.070312 40.125 357.308594 43.757812 C 348.542969 47.386719 339.875 51.230469 331.300781 55.285156 C 322.726562 59.34375 314.253906 63.605469 305.890625 68.078125 C 297.523438 72.550781 289.273438 77.226562 281.136719 82.101562 C 273 86.980469 264.988281 92.050781 257.101562 97.324219 C 249.214844 102.59375 241.460938 108.054688 233.84375 113.703125 C 226.222656 119.355469 218.75 125.191406 211.417969 131.207031 C 204.082031 137.226562 196.902344 143.421875 189.875 149.792969 C 182.847656 156.164062 175.980469 162.703125 169.273438 169.410156 C 162.5625 176.117188 156.027344 182.984375 149.65625 190.015625 C 143.285156 197.042969 137.089844 204.222656 131.074219 211.558594 C 125.054688 218.890625 119.222656 226.367188 113.570312 233.984375 C 107.921875 241.605469 102.460938 249.359375 97.191406 257.246094 C 91.921875 265.132812 86.847656 273.144531 81.972656 281.28125 C 77.097656 289.417969 72.421875 297.667969 67.949219 306.035156 C 63.480469 314.402344 59.214844 322.871094 55.160156 331.445312 C 51.105469 340.023438 47.261719 348.691406 43.632812 357.457031 C 40.003906 366.21875 36.589844 375.066406 33.394531 384 C 30.199219 392.929688 27.226562 401.933594 24.472656 411.011719 C 21.71875 420.089844 19.191406 429.230469 16.886719 438.429688 C 14.582031 447.632812 12.503906 456.886719 10.652344 466.1875 C 8.800781 475.492188 7.179688 484.835938 5.789062 494.21875 C 4.398438 503.601562 3.238281 513.015625 2.308594 522.453125 C 1.378906 531.894531 0.679688 541.351562 0.214844 550.828125 C -0.25 560.300781 -0.480469 569.78125 -0.480469 579.265625 C -0.480469 588.753906 -0.25 598.234375 0.21875 607.707031 C 0.683594 617.179688 1.378906 626.640625 2.3125 636.078125 C 3.242188 645.519531 4.402344 654.929688 5.792969 664.3125 C 7.183594 673.695312 8.808594 683.039062 10.65625 692.34375 C 12.507812 701.648438 14.585938 710.898438 16.890625 720.101562 C 19.195312 729.300781 21.726562 738.441406 24.480469 747.519531 C 27.234375 756.597656 30.207031 765.601562 33.402344 774.53125 C 36.597656 783.460938 40.011719 792.308594 43.640625 801.074219 C 47.273438 809.835938 51.117188 818.507812 55.171875 827.082031 C 59.226562 835.65625 63.492188 844.125 67.960938 852.492188 C 72.433594 860.859375 77.109375 869.109375 81.984375 877.246094 C 86.863281 885.382812 91.9375 893.394531 97.207031 901.28125 C 102.476562 909.167969 107.9375 916.921875 113.585938 924.539062 C 119.238281 932.15625 125.074219 939.632812 131.089844 946.964844 C 137.109375 954.296875 143.300781 961.480469 149.671875 968.507812 C 156.042969 975.535156 162.582031 982.402344 169.289062 989.109375 C 175.996094 995.820312 182.867188 1002.359375 189.894531 1008.726562 C 196.921875 1015.097656 204.101562 1021.292969 211.4375 1027.308594 C 218.769531 1033.328125 226.246094 1039.160156 233.863281 1044.8125 C 241.484375 1050.460938 249.234375 1055.921875 257.125 1061.191406 C 265.011719 1066.460938 273.023438 1071.535156 281.160156 1076.414062 C 289.296875 1081.289062 297.546875 1085.964844 305.914062 1090.433594 C 314.277344 1094.90625 322.75 1099.167969 331.324219 1103.226562 C 339.898438 1107.28125 348.566406 1111.125 357.332031 1114.753906 C 366.097656 1118.382812 374.945312 1121.796875 383.875 1124.992188 C 392.804688 1128.1875 401.8125 1131.164062 410.886719 1133.914062 C 419.964844 1136.667969 429.105469 1139.199219 438.308594 1141.503906 C 447.507812 1143.808594 456.761719 1145.886719 466.066406 1147.738281 C 475.367188 1149.585938 484.710938 1151.207031 494.09375 1152.601562 C 503.476562 1153.992188 512.890625 1155.152344 522.328125 1156.082031 C 531.769531 1157.011719 541.226562 1157.710938 550.703125 1158.175781 C 560.175781 1158.640625 569.65625 1158.875 579.140625 1158.875 C 588.628906 1158.875 598.109375 1158.640625 607.582031 1158.175781 C 617.058594 1157.710938 626.515625 1157.011719 635.957031 1156.082031 C 645.394531 1155.152344 654.808594 1153.992188 664.191406 1152.597656 C 673.574219 1151.207031 682.917969 1149.585938 692.222656 1147.734375 C 701.527344 1145.882812 710.777344 1143.804688 719.980469 1141.5 C 729.183594 1139.195312 738.320312 1136.667969 747.398438 1133.914062 C 756.476562 1131.160156 765.480469 1128.183594 774.414062 1124.988281 C 783.34375 1121.792969 792.191406 1118.378906 800.957031 1114.75 C 809.71875 1111.121094 818.390625 1107.277344 826.964844 1103.222656 C 835.539062 1099.164062 844.011719 1094.902344 852.375 1090.429688 C 860.742188 1085.957031 868.992188 1081.285156 877.128906 1076.40625 C 885.265625 1071.53125 893.277344 1066.457031 901.164062 1061.1875 C 909.050781 1055.917969 916.804688 1050.457031 924.425781 1044.804688 C 932.042969 1039.152344 939.519531 1033.320312 946.851562 1027.300781 C 954.183594 1021.285156 961.367188 1015.089844 968.394531 1008.71875 C 975.421875 1002.347656 982.292969 995.808594 989 989.101562 C 995.707031 982.394531 1002.246094 975.527344 1008.617188 968.5 C 1014.984375 961.46875 1021.179688 954.289062 1027.199219 946.957031 C 1033.214844 939.625 1039.050781 932.148438 1044.699219 924.527344 C 1050.351562 916.910156 1055.8125 909.15625 1061.082031 901.269531 C 1066.351562 893.382812 1071.425781 885.371094 1076.300781 877.234375 C 1081.179688 869.097656 1085.855469 860.847656 1090.324219 852.480469 C 1094.796875 844.113281 1099.0625 835.644531 1103.117188 827.070312 C 1107.171875 818.492188 1111.015625 809.824219 1114.644531 801.058594 C 1118.273438 792.296875 1121.6875 783.449219 1124.882812 774.515625 C 1128.078125 765.585938 1131.054688 756.582031 1133.808594 747.503906 C 1136.5625 738.425781 1139.089844 729.289062 1141.394531 720.085938 C 1143.699219 710.882812 1145.777344 701.632812 1147.628906 692.328125 C 1149.480469 683.023438 1151.101562 673.679688 1152.492188 664.296875 C 1153.882812 654.914062 1155.046875 645.503906 1155.976562 636.0625 C 1156.90625 626.621094 1157.601562 617.164062 1158.066406 607.691406 C 1158.535156 598.214844 1158.765625 588.734375 1158.765625 579.25 C 1158.753906 569.765625 1158.511719 560.289062 1158.035156 550.816406 C 1157.5625 541.347656 1156.851562 531.894531 1155.914062 522.457031 C 1154.976562 513.019531 1153.804688 503.613281 1152.40625 494.234375 C 1151.003906 484.851562 1149.375 475.515625 1147.515625 466.214844 C 1145.660156 456.914062 1143.574219 447.667969 1141.261719 438.46875 C 1138.949219 429.273438 1136.414062 420.136719 1133.65625 411.0625 C 1130.894531 401.992188 1127.917969 392.992188 1124.714844 384.066406 C 1121.515625 375.136719 1118.097656 366.296875 1114.464844 357.535156 C 1110.828125 348.777344 1106.980469 340.113281 1102.921875 331.542969 C 1098.863281 322.96875 1094.597656 314.503906 1090.125 306.144531 C 1085.648438 297.78125 1080.972656 289.535156 1076.09375 281.402344 C 1071.214844 273.269531 1066.140625 265.261719 1060.871094 257.378906 C 1055.597656 249.496094 1050.136719 241.746094 1044.488281 234.128906 C 1038.835938 226.515625 1033.003906 219.042969 1026.984375 211.710938 C 1020.96875 204.382812 1014.773438 197.203125 1008.40625 190.179688 C 1002.035156 183.152344 995.5 176.289062 988.792969 169.582031 C 982.085938 162.875 975.222656 156.339844 968.195312 149.96875 C 961.167969 143.601562 953.988281 137.410156 946.660156 131.390625 C 939.332031 125.375 931.855469 119.539062 924.242188 113.890625 C 916.625 108.238281 908.875 102.777344 900.992188 97.507812 C 893.109375 92.238281 885.101562 87.164062 876.96875 82.285156 C 868.835938 77.40625 860.589844 72.730469 852.226562 68.257812 C 843.863281 63.785156 835.398438 59.515625 826.828125 55.457031 C 818.257812 51.398438 809.59375 47.554688 800.832031 43.917969 C 792.074219 40.285156 783.230469 36.867188 774.304688 33.667969 C 765.375 30.46875 756.375 27.488281 747.304688 24.730469 C 738.230469 21.96875 729.09375 19.433594 719.898438 17.125 C 710.699219 14.8125 701.453125 12.726562 692.152344 10.871094 C 682.851562 9.011719 673.515625 7.382812 664.132812 5.984375 C 654.753906 4.582031 645.347656 3.414062 635.910156 2.476562 C 626.472656 1.535156 617.019531 0.828125 607.546875 0.355469 C 598.078125 -0.121094 588.601562 -0.363281 579.117188 -0.375 Z M 579.117188 1106.453125 C 570.488281 1106.453125 561.867188 1106.242188 553.25 1105.816406 C 544.632812 1105.394531 536.027344 1104.757812 527.441406 1103.910156 C 518.855469 1103.066406 510.296875 1102.007812 501.761719 1100.742188 C 493.226562 1099.476562 484.726562 1098 476.265625 1096.316406 C 467.804688 1094.632812 459.386719 1092.742188 451.019531 1090.648438 C 442.648438 1088.550781 434.335938 1086.25 426.082031 1083.746094 C 417.824219 1081.238281 409.632812 1078.535156 401.511719 1075.625 C 393.386719 1072.71875 385.339844 1069.613281 377.367188 1066.3125 C 369.398438 1063.011719 361.511719 1059.515625 353.714844 1055.824219 C 345.914062 1052.136719 338.210938 1048.257812 330.601562 1044.191406 C 322.992188 1040.121094 315.488281 1035.871094 308.085938 1031.433594 C 300.6875 1027 293.398438 1022.382812 286.226562 1017.589844 C 279.050781 1012.796875 272 1007.828125 265.070312 1002.691406 C 258.140625 997.550781 251.339844 992.242188 244.671875 986.769531 C 238.003906 981.296875 231.472656 975.660156 225.078125 969.867188 C 218.6875 964.074219 212.4375 958.125 206.339844 952.023438 C 200.238281 945.921875 194.289062 939.675781 188.496094 933.28125 C 182.703125 926.890625 177.070312 920.355469 171.597656 913.6875 C 166.121094 907.019531 160.816406 900.21875 155.675781 893.289062 C 150.539062 886.359375 145.570312 879.304688 140.777344 872.132812 C 135.984375 864.957031 131.371094 857.667969 126.933594 850.269531 C 122.5 842.867188 118.25 835.363281 114.183594 827.753906 C 110.113281 820.144531 106.238281 812.441406 102.546875 804.640625 C 98.859375 796.839844 95.363281 788.957031 92.0625 780.984375 C 88.761719 773.011719 85.65625 764.964844 82.75 756.839844 C 79.84375 748.71875 77.140625 740.527344 74.636719 732.269531 C 72.132812 724.015625 69.832031 715.699219 67.734375 707.332031 C 65.636719 698.960938 63.75 690.546875 62.066406 682.085938 C 60.382812 673.621094 58.910156 665.125 57.644531 656.589844 C 56.378906 648.054688 55.320312 639.492188 54.476562 630.90625 C 53.632812 622.320312 52.996094 613.71875 52.574219 605.101562 C 52.152344 596.484375 51.9375 587.859375 51.941406 579.234375 C 51.941406 570.605469 52.152344 561.980469 52.574219 553.363281 C 53 544.746094 53.632812 536.144531 54.480469 527.558594 C 55.324219 518.972656 56.382812 510.410156 57.648438 501.875 C 58.914062 493.34375 60.390625 484.84375 62.074219 476.382812 C 63.757812 467.917969 65.644531 459.503906 67.742188 451.132812 C 69.839844 442.765625 72.140625 434.453125 74.644531 426.195312 C 77.148438 417.941406 79.855469 409.75 82.761719 401.625 C 85.667969 393.503906 88.773438 385.457031 92.078125 377.484375 C 95.378906 369.511719 98.875 361.628906 102.5625 353.828125 C 106.253906 346.027344 110.128906 338.324219 114.199219 330.714844 C 118.265625 323.105469 122.515625 315.601562 126.953125 308.199219 C 131.390625 300.800781 136.003906 293.511719 140.796875 286.339844 C 145.589844 279.167969 150.558594 272.113281 155.699219 265.183594 C 160.835938 258.253906 166.144531 251.453125 171.617188 244.785156 C 177.089844 238.117188 182.726562 231.585938 188.519531 225.191406 C 194.3125 218.800781 200.261719 212.550781 206.363281 206.453125 C 212.464844 200.351562 218.710938 194.402344 225.105469 188.609375 C 231.496094 182.816406 238.027344 177.183594 244.699219 171.707031 C 251.367188 166.234375 258.167969 160.929688 265.097656 155.789062 C 272.027344 150.648438 279.082031 145.683594 286.253906 140.890625 C 293.429688 136.097656 300.714844 131.480469 308.117188 127.046875 C 315.515625 122.609375 323.023438 118.359375 330.632812 114.292969 C 338.238281 110.226562 345.945312 106.347656 353.746094 102.660156 C 361.542969 98.96875 369.429688 95.476562 377.402344 92.171875 C 385.371094 88.871094 393.417969 85.769531 401.542969 82.863281 C 409.667969 79.953125 417.855469 77.25 426.113281 74.746094 C 434.371094 72.242188 442.683594 69.941406 451.050781 67.84375 C 459.421875 65.746094 467.835938 63.859375 476.300781 62.175781 C 484.761719 60.492188 493.261719 59.015625 501.796875 57.75 C 510.328125 56.484375 518.890625 55.429688 527.476562 54.585938 C 536.0625 53.738281 544.664062 53.105469 553.28125 52.679688 C 561.902344 52.257812 570.523438 52.046875 579.152344 52.046875 C 587.777344 52.046875 596.402344 52.257812 605.019531 52.683594 C 613.636719 53.105469 622.238281 53.742188 630.824219 54.585938 C 639.410156 55.433594 647.972656 56.488281 656.507812 57.753906 C 665.042969 59.019531 673.539062 60.496094 682.003906 62.179688 C 690.464844 63.863281 698.878906 65.75 707.25 67.847656 C 715.617188 69.945312 723.933594 72.246094 732.1875 74.75 C 740.445312 77.253906 748.632812 79.960938 756.757812 82.867188 C 764.882812 85.773438 772.929688 88.878906 780.902344 92.179688 C 788.871094 95.480469 796.757812 98.976562 804.554688 102.667969 C 812.355469 106.355469 820.058594 110.234375 827.667969 114.300781 C 835.277344 118.367188 842.785156 122.621094 850.183594 127.054688 C 857.585938 131.492188 864.871094 136.105469 872.046875 140.898438 C 879.21875 145.691406 886.269531 150.660156 893.199219 155.800781 C 900.132812 160.9375 906.929688 166.246094 913.601562 171.71875 C 920.269531 177.191406 926.800781 182.828125 933.195312 188.621094 C 939.585938 194.414062 945.832031 200.363281 951.933594 206.464844 C 958.035156 212.566406 963.984375 218.8125 969.777344 225.203125 C 975.570312 231.597656 981.203125 238.128906 986.679688 244.796875 C 992.152344 251.46875 997.457031 258.269531 1002.597656 265.199219 C 1007.738281 272.128906 1012.703125 279.179688 1017.496094 286.355469 C 1022.289062 293.527344 1026.90625 300.816406 1031.339844 308.214844 C 1035.777344 315.617188 1040.027344 323.121094 1044.09375 330.730469 C 1048.164062 338.339844 1052.039062 346.042969 1055.730469 353.84375 C 1059.417969 361.644531 1062.914062 369.527344 1066.214844 377.5 C 1069.515625 385.472656 1072.621094 393.519531 1075.527344 401.640625 C 1078.433594 409.765625 1081.140625 417.957031 1083.644531 426.210938 C 1086.148438 434.46875 1088.449219 442.78125 1090.546875 451.152344 C 1092.640625 459.519531 1094.53125 467.9375 1096.214844 476.398438 C 1097.898438 484.859375 1099.375 493.359375 1100.640625 501.894531 C 1101.90625 510.429688 1102.960938 518.988281 1103.808594 527.574219 C 1104.652344 536.160156 1105.285156 544.765625 1105.710938 553.382812 C 1106.132812 562 1106.34375 570.621094 1106.34375 579.25 C 1106.335938 587.875 1106.113281 596.496094 1105.683594 605.109375 C 1105.25 613.726562 1104.605469 622.324219 1103.753906 630.90625 C 1102.898438 639.492188 1101.835938 648.046875 1100.558594 656.578125 C 1099.285156 665.109375 1097.804688 673.605469 1096.113281 682.0625 C 1094.425781 690.523438 1092.527344 698.933594 1090.425781 707.300781 C 1088.324219 715.664062 1086.015625 723.972656 1083.507812 732.226562 C 1080.996094 740.476562 1078.285156 748.664062 1075.375 756.785156 C 1072.464844 764.902344 1069.355469 772.945312 1066.050781 780.914062 C 1062.746094 788.882812 1059.246094 796.761719 1055.554688 804.558594 C 1051.863281 812.355469 1047.980469 820.054688 1043.914062 827.660156 C 1039.84375 835.265625 1035.589844 842.765625 1031.152344 850.164062 C 1026.714844 857.558594 1022.097656 864.84375 1017.304688 872.011719 C 1012.511719 879.183594 1007.542969 886.234375 1002.402344 893.160156 C 997.265625 900.085938 991.957031 906.882812 986.484375 913.550781 C 981.011719 920.21875 975.378906 926.746094 969.585938 933.136719 C 963.792969 939.527344 957.84375 945.773438 951.746094 951.871094 C 945.644531 957.96875 939.402344 963.917969 933.011719 969.710938 C 926.617188 975.503906 920.089844 981.136719 913.421875 986.609375 C 906.753906 992.082031 899.957031 997.386719 893.03125 1002.527344 C 886.105469 1007.664062 879.054688 1012.632812 871.882812 1017.425781 C 864.714844 1022.21875 857.429688 1026.835938 850.03125 1031.273438 C 842.636719 1035.710938 835.132812 1039.960938 827.527344 1044.03125 C 819.921875 1048.101562 812.222656 1051.980469 804.425781 1055.671875 C 796.632812 1059.363281 788.75 1062.863281 780.78125 1066.167969 C 772.816406 1069.472656 764.773438 1072.582031 756.652344 1075.492188 C 748.53125 1078.402344 740.347656 1081.113281 732.09375 1083.621094 C 723.839844 1086.132812 715.53125 1088.4375 707.167969 1090.539062 C 698.800781 1092.640625 690.390625 1094.539062 681.929688 1096.226562 C 673.472656 1097.917969 664.976562 1099.398438 656.445312 1100.671875 C 647.914062 1101.945312 639.359375 1103.007812 630.773438 1103.863281 C 622.191406 1104.714844 613.59375 1105.359375 604.976562 1105.789062 C 596.363281 1106.222656 587.742188 1106.445312 579.117188 1106.453125 Z M 579.117188 1106.453125  M 790.386719 367.980469 C 789.78125 367.371094 789.144531 366.796875 788.480469 366.253906 C 787.820312 365.707031 787.128906 365.195312 786.417969 364.71875 C 785.703125 364.242188 784.96875 363.800781 784.210938 363.398438 C 783.453125 362.992188 782.679688 362.625 781.886719 362.296875 C 781.09375 361.96875 780.285156 361.679688 779.464844 361.429688 C 778.640625 361.179688 777.8125 360.972656 776.96875 360.804688 C 776.125 360.636719 775.277344 360.511719 774.425781 360.425781 C 773.570312 360.34375 772.714844 360.300781 771.855469 360.300781 C 770.996094 360.300781 770.140625 360.34375 769.285156 360.425781 C 768.433594 360.511719 767.585938 360.636719 766.742188 360.804688 C 765.902344 360.972656 765.070312 361.179688 764.246094 361.429688 C 763.425781 361.679688 762.617188 361.96875 761.824219 362.296875 C 761.03125 362.625 760.257812 362.992188 759.5 363.398438 C 758.742188 363.800781 758.007812 364.242188 757.296875 364.71875 C 756.582031 365.195312 755.894531 365.707031 755.230469 366.25 C 754.566406 366.796875 753.929688 367.371094 753.324219 367.980469 L 579.128906 542.183594 L 404.933594 367.980469 C 404.328125 367.371094 403.691406 366.796875 403.03125 366.253906 C 402.367188 365.707031 401.675781 365.199219 400.964844 364.71875 C 400.25 364.242188 399.515625 363.804688 398.757812 363.398438 C 398 362.992188 397.226562 362.628906 396.433594 362.296875 C 395.640625 361.96875 394.832031 361.679688 394.011719 361.433594 C 393.191406 361.183594 392.359375 360.976562 391.515625 360.808594 C 390.675781 360.640625 389.828125 360.515625 388.972656 360.429688 C 388.117188 360.347656 387.261719 360.304688 386.402344 360.304688 C 385.546875 360.304688 384.6875 360.347656 383.835938 360.429688 C 382.980469 360.515625 382.132812 360.640625 381.289062 360.808594 C 380.449219 360.976562 379.617188 361.183594 378.796875 361.433594 C 377.976562 361.679688 377.167969 361.96875 376.375 362.296875 C 375.582031 362.628906 374.804688 362.992188 374.050781 363.398438 C 373.292969 363.804688 372.558594 364.242188 371.84375 364.71875 C 371.128906 365.199219 370.441406 365.707031 369.777344 366.253906 C 369.113281 366.796875 368.480469 367.371094 367.871094 367.980469 C 367.265625 368.585938 366.691406 369.222656 366.144531 369.886719 C 365.601562 370.550781 365.089844 371.238281 364.613281 371.953125 C 364.136719 372.664062 363.695312 373.398438 363.289062 374.15625 C 362.886719 374.914062 362.519531 375.6875 362.191406 376.480469 C 361.863281 377.273438 361.574219 378.082031 361.324219 378.902344 C 361.074219 379.726562 360.867188 380.558594 360.699219 381.398438 C 360.53125 382.242188 360.40625 383.089844 360.324219 383.941406 C 360.238281 384.796875 360.195312 385.652344 360.195312 386.511719 C 360.195312 387.371094 360.238281 388.226562 360.324219 389.082031 C 360.40625 389.933594 360.53125 390.78125 360.699219 391.625 C 360.867188 392.464844 361.074219 393.296875 361.324219 394.121094 C 361.574219 394.941406 361.863281 395.746094 362.191406 396.539062 C 362.519531 397.332031 362.886719 398.109375 363.289062 398.867188 C 363.695312 399.621094 364.136719 400.359375 364.613281 401.070312 C 365.089844 401.785156 365.601562 402.472656 366.144531 403.136719 C 366.691406 403.800781 367.265625 404.4375 367.871094 405.042969 L 542.066406 579.25 L 367.871094 753.457031 C 367.265625 754.0625 366.691406 754.699219 366.144531 755.363281 C 365.601562 756.027344 365.089844 756.714844 364.613281 757.429688 C 364.136719 758.140625 363.695312 758.878906 363.289062 759.632812 C 362.886719 760.390625 362.519531 761.167969 362.191406 761.960938 C 361.863281 762.753906 361.574219 763.558594 361.324219 764.378906 C 361.074219 765.203125 360.867188 766.035156 360.699219 766.875 C 360.53125 767.71875 360.40625 768.566406 360.324219 769.417969 C 360.238281 770.273438 360.195312 771.128906 360.195312 771.988281 C 360.195312 772.847656 360.238281 773.703125 360.324219 774.558594 C 360.40625 775.410156 360.53125 776.257812 360.699219 777.101562 C 360.867188 777.941406 361.074219 778.773438 361.324219 779.597656 C 361.574219 780.417969 361.863281 781.226562 362.191406 782.019531 C 362.519531 782.8125 362.886719 783.585938 363.289062 784.34375 C 363.695312 785.101562 364.136719 785.835938 364.613281 786.546875 C 365.089844 787.261719 365.601562 787.949219 366.144531 788.613281 C 366.691406 789.277344 367.265625 789.914062 367.871094 790.519531 C 368.480469 791.128906 369.113281 791.703125 369.777344 792.246094 C 370.441406 792.792969 371.128906 793.300781 371.84375 793.78125 C 372.558594 794.257812 373.292969 794.695312 374.050781 795.101562 C 374.804688 795.507812 375.582031 795.871094 376.375 796.203125 C 377.167969 796.53125 377.976562 796.820312 378.796875 797.066406 C 379.617188 797.316406 380.449219 797.523438 381.289062 797.691406 C 382.132812 797.859375 382.980469 797.984375 383.835938 798.070312 C 384.6875 798.152344 385.546875 798.195312 386.402344 798.195312 C 387.261719 798.195312 388.117188 798.152344 388.972656 798.070312 C 389.828125 797.984375 390.675781 797.859375 391.515625 797.691406 C 392.359375 797.523438 393.191406 797.316406 394.011719 797.066406 C 394.832031 796.820312 395.640625 796.53125 396.433594 796.203125 C 397.226562 795.871094 398 795.507812 398.757812 795.101562 C 399.515625 794.695312 400.25 794.257812 400.964844 793.78125 C 401.675781 793.300781 402.367188 792.792969 403.03125 792.246094 C 403.691406 791.703125 404.328125 791.128906 404.933594 790.519531 L 579.128906 616.316406 L 753.324219 790.519531 C 753.929688 791.128906 754.566406 791.703125 755.230469 792.246094 C 755.894531 792.792969 756.582031 793.300781 757.296875 793.78125 C 758.007812 794.257812 758.746094 794.695312 759.5 795.101562 C 760.257812 795.507812 761.035156 795.871094 761.828125 796.203125 C 762.621094 796.53125 763.425781 796.820312 764.25 797.066406 C 765.070312 797.316406 765.902344 797.523438 766.742188 797.691406 C 767.585938 797.859375 768.433594 797.984375 769.285156 798.070312 C 770.140625 798.152344 770.996094 798.195312 771.855469 798.195312 C 772.714844 798.195312 773.570312 798.152344 774.425781 798.070312 C 775.277344 797.984375 776.125 797.859375 776.96875 797.691406 C 777.808594 797.523438 778.640625 797.316406 779.464844 797.066406 C 780.285156 796.820312 781.09375 796.53125 781.886719 796.203125 C 782.679688 795.871094 783.453125 795.507812 784.210938 795.101562 C 784.96875 794.695312 785.703125 794.257812 786.414062 793.78125 C 787.128906 793.300781 787.816406 792.792969 788.480469 792.246094 C 789.144531 791.703125 789.78125 791.128906 790.386719 790.519531 C 790.996094 789.914062 791.570312 789.277344 792.113281 788.613281 C 792.660156 787.949219 793.167969 787.261719 793.648438 786.546875 C 794.125 785.835938 794.5625 785.101562 794.96875 784.34375 C 795.375 783.585938 795.738281 782.8125 796.070312 782.019531 C 796.398438 781.226562 796.6875 780.417969 796.933594 779.597656 C 797.183594 778.773438 797.390625 777.941406 797.558594 777.101562 C 797.726562 776.257812 797.851562 775.410156 797.9375 774.558594 C 798.019531 773.703125 798.0625 772.847656 798.0625 771.988281 C 798.0625 771.128906 798.019531 770.273438 797.9375 769.417969 C 797.851562 768.566406 797.726562 767.71875 797.558594 766.875 C 797.390625 766.035156 797.183594 765.203125 796.933594 764.378906 C 796.6875 763.558594 796.398438 762.753906 796.066406 761.960938 C 795.738281 761.167969 795.375 760.390625 794.96875 759.632812 C 794.5625 758.878906 794.125 758.140625 793.644531 757.429688 C 793.167969 756.714844 792.660156 756.027344 792.113281 755.363281 C 791.570312 754.699219 790.996094 754.0625 790.386719 753.457031 L 616.191406 579.25 L 790.386719 405.042969 C 790.996094 404.4375 791.570312 403.800781 792.113281 403.136719 C 792.660156 402.472656 793.171875 401.785156 793.648438 401.070312 C 794.125 400.359375 794.566406 399.625 794.96875 398.867188 C 795.375 398.109375 795.742188 397.335938 796.070312 396.542969 C 796.398438 395.75 796.6875 394.941406 796.9375 394.121094 C 797.1875 393.296875 797.394531 392.464844 797.5625 391.625 C 797.730469 390.78125 797.855469 389.933594 797.941406 389.082031 C 798.023438 388.226562 798.066406 387.371094 798.066406 386.511719 C 798.066406 385.652344 798.023438 384.796875 797.941406 383.941406 C 797.855469 383.089844 797.730469 382.238281 797.5625 381.398438 C 797.394531 380.554688 797.1875 379.722656 796.9375 378.902344 C 796.6875 378.082031 796.398438 377.273438 796.070312 376.480469 C 795.742188 375.6875 795.375 374.914062 794.96875 374.15625 C 794.566406 373.398438 794.125 372.664062 793.648438 371.949219 C 793.171875 371.238281 792.660156 370.546875 792.113281 369.886719 C 791.570312 369.222656 790.996094 368.585938 790.386719 367.980469 Z M 790.386719 367.980469 "/></svg>';

// The ✓ on the day moved to (om-136.svg, user, 2026-10-29): its own circle and a
// longer tick, set apart from the clock; fill turned into currentColor.
var ST_CHECK_ICON = '<svg class="st-check-ico" viewBox="0 0 907.5 907.5" aria-hidden="true"><path fill="currentColor" d="M 726.894531 264.324219 C 727.425781 264.796875 727.929688 265.292969 728.414062 265.816406 C 728.894531 266.335938 729.347656 266.878906 729.777344 267.445312 C 730.207031 268.007812 730.609375 268.59375 730.980469 269.195312 C 731.351562 269.800781 731.695312 270.421875 732.007812 271.058594 C 732.320312 271.695312 732.601562 272.34375 732.851562 273.007812 C 733.101562 273.671875 733.320312 274.347656 733.503906 275.03125 C 733.6875 275.71875 733.839844 276.410156 733.957031 277.109375 C 734.074219 277.808594 734.160156 278.511719 734.210938 279.21875 C 734.257812 279.925781 734.273438 280.636719 734.257812 281.34375 C 734.238281 282.054688 734.183594 282.761719 734.097656 283.464844 C 734.011719 284.167969 733.890625 284.867188 733.734375 285.558594 C 733.582031 286.25 733.394531 286.933594 733.175781 287.609375 C 732.953125 288.285156 732.703125 288.945312 732.417969 289.59375 C 732.132812 290.246094 731.816406 290.878906 731.472656 291.5 C 731.125 292.117188 730.75 292.71875 730.347656 293.304688 C 729.945312 293.886719 729.511719 294.449219 729.054688 294.992188 L 376.1875 705.300781 C 375.175781 706.476562 374.042969 707.53125 372.796875 708.457031 C 371.550781 709.386719 370.21875 710.167969 368.800781 710.800781 C 367.382812 711.4375 365.914062 711.910156 364.390625 712.21875 C 362.867188 712.53125 361.332031 712.671875 359.777344 712.644531 C 358.207031 712.644531 356.65625 712.472656 355.121094 712.128906 C 353.589844 711.785156 352.113281 711.277344 350.695312 710.605469 C 349.273438 709.933594 347.945312 709.113281 346.710938 708.144531 C 345.472656 707.175781 344.359375 706.085938 343.363281 704.867188 L 177.945312 510.511719 C 177.484375 509.976562 177.046875 509.421875 176.640625 508.847656 C 176.234375 508.269531 175.859375 507.675781 175.511719 507.058594 C 175.164062 506.445312 174.851562 505.816406 174.566406 505.171875 C 174.28125 504.523438 174.03125 503.867188 173.8125 503.195312 C 173.59375 502.523438 173.410156 501.84375 173.261719 501.15625 C 173.113281 500.464844 172.996094 499.769531 172.914062 499.070312 C 172.835938 498.367188 172.789062 497.664062 172.78125 496.960938 C 172.769531 496.253906 172.792969 495.550781 172.855469 494.847656 C 172.914062 494.144531 173.011719 493.445312 173.140625 492.753906 C 173.269531 492.058594 173.433594 491.375 173.632812 490.699219 C 173.832031 490.019531 174.0625 489.355469 174.328125 488.703125 C 174.59375 488.046875 174.890625 487.410156 175.21875 486.785156 C 175.550781 486.160156 175.910156 485.554688 176.296875 484.964844 C 176.6875 484.378906 177.105469 483.8125 177.550781 483.265625 C 178 482.71875 178.472656 482.195312 178.96875 481.695312 C 179.46875 481.199219 179.992188 480.726562 180.535156 480.277344 C 181.070312 479.816406 181.625 479.382812 182.199219 478.976562 C 182.777344 478.570312 183.375 478.191406 183.988281 477.847656 C 184.601562 477.5 185.230469 477.183594 185.878906 476.898438 C 186.523438 476.617188 187.183594 476.363281 187.851562 476.148438 C 188.523438 475.929688 189.203125 475.746094 189.894531 475.59375 C 190.582031 475.445312 191.277344 475.328125 191.976562 475.25 C 192.679688 475.167969 193.382812 475.125 194.085938 475.113281 C 194.792969 475.101562 195.496094 475.128906 196.199219 475.1875 C 196.902344 475.25 197.601562 475.34375 198.292969 475.472656 C 198.988281 475.605469 199.671875 475.769531 200.351562 475.96875 C 201.027344 476.164062 201.691406 476.398438 202.347656 476.664062 C 203 476.925781 203.640625 477.222656 204.261719 477.554688 C 204.886719 477.882812 205.492188 478.242188 206.082031 478.632812 C 206.667969 479.019531 207.234375 479.4375 207.78125 479.886719 C 208.328125 480.332031 208.851562 480.804688 209.351562 481.304688 C 209.851562 481.800781 210.324219 482.324219 210.769531 482.871094 L 359.777344 657.792969 L 696.230469 266.484375 C 696.703125 265.957031 697.199219 265.449219 697.71875 264.96875 C 698.242188 264.488281 698.785156 264.03125 699.347656 263.601562 C 699.914062 263.171875 700.5 262.773438 701.101562 262.398438 C 701.707031 262.027344 702.324219 261.683594 702.960938 261.371094 C 703.597656 261.058594 704.25 260.777344 704.914062 260.527344 C 705.578125 260.277344 706.25 260.0625 706.9375 259.875 C 707.621094 259.691406 708.3125 259.539062 709.011719 259.421875 C 709.714844 259.304688 710.417969 259.222656 711.125 259.171875 C 711.832031 259.121094 712.539062 259.105469 713.25 259.125 C 713.957031 259.144531 714.664062 259.195312 715.371094 259.28125 C 716.074219 259.371094 716.769531 259.492188 717.464844 259.644531 C 718.15625 259.800781 718.839844 259.988281 719.515625 260.207031 C 720.1875 260.425781 720.851562 260.679688 721.5 260.964844 C 722.148438 261.25 722.785156 261.5625 723.402344 261.910156 C 724.023438 262.253906 724.625 262.628906 725.207031 263.03125 C 725.792969 263.4375 726.355469 263.867188 726.894531 264.324219 Z M 907 453.5 C 907 460.921875 906.816406 468.339844 906.453125 475.753906 C 906.089844 483.164062 905.542969 490.566406 904.816406 497.949219 C 904.089844 505.335938 903.179688 512.699219 902.089844 520.042969 C 901.003906 527.382812 899.734375 534.695312 898.285156 541.972656 C 896.839844 549.253906 895.210938 556.492188 893.410156 563.691406 C 891.605469 570.890625 889.628906 578.042969 887.472656 585.144531 C 885.316406 592.246094 882.992188 599.292969 880.492188 606.28125 C 877.988281 613.269531 875.320312 620.191406 872.480469 627.046875 C 869.640625 633.902344 866.632812 640.6875 863.460938 647.394531 C 860.285156 654.105469 856.949219 660.734375 853.453125 667.277344 C 849.953125 673.824219 846.296875 680.28125 842.480469 686.644531 C 838.664062 693.011719 834.695312 699.28125 830.570312 705.453125 C 826.449219 711.621094 822.175781 717.6875 817.753906 723.648438 C 813.332031 729.609375 808.769531 735.460938 804.058594 741.199219 C 799.351562 746.933594 794.503906 752.554688 789.519531 758.050781 C 784.539062 763.550781 779.421875 768.925781 774.171875 774.171875 C 768.925781 779.421875 763.550781 784.539062 758.050781 789.519531 C 752.554688 794.503906 746.933594 799.351562 741.199219 804.058594 C 735.460938 808.769531 729.609375 813.332031 723.648438 817.753906 C 717.6875 822.175781 711.621094 826.449219 705.453125 830.570312 C 699.28125 834.695312 693.011719 838.664062 686.644531 842.480469 C 680.28125 846.296875 673.824219 849.953125 667.277344 853.453125 C 660.734375 856.949219 654.105469 860.285156 647.394531 863.460938 C 640.6875 866.632812 633.902344 869.640625 627.046875 872.480469 C 620.191406 875.320312 613.269531 877.988281 606.28125 880.492188 C 599.292969 882.992188 592.246094 885.316406 585.144531 887.472656 C 578.042969 889.628906 570.890625 891.605469 563.691406 893.410156 C 556.492188 895.210938 549.253906 896.839844 541.972656 898.285156 C 534.695312 899.734375 527.382812 901.003906 520.042969 902.089844 C 512.699219 903.179688 505.335938 904.089844 497.949219 904.816406 C 490.566406 905.542969 483.164062 906.089844 475.753906 906.453125 C 468.339844 906.816406 460.921875 907 453.5 907 C 446.078125 907 438.660156 906.816406 431.246094 906.453125 C 423.835938 906.089844 416.433594 905.542969 409.050781 904.816406 C 401.664062 904.089844 394.300781 903.179688 386.957031 902.089844 C 379.617188 901.003906 372.304688 899.734375 365.027344 898.285156 C 357.746094 896.839844 350.507812 895.210938 343.308594 893.410156 C 336.109375 891.605469 328.957031 889.628906 321.855469 887.472656 C 314.753906 885.316406 307.707031 882.992188 300.71875 880.492188 C 293.734375 877.988281 286.808594 875.320312 279.953125 872.480469 C 273.097656 869.640625 266.3125 866.632812 259.605469 863.460938 C 252.894531 860.285156 246.265625 856.949219 239.722656 853.453125 C 233.175781 849.953125 226.71875 846.296875 220.355469 842.480469 C 213.988281 838.664062 207.71875 834.695312 201.550781 830.570312 C 195.378906 826.449219 189.3125 822.175781 183.351562 817.753906 C 177.390625 813.332031 171.539062 808.769531 165.800781 804.058594 C 160.066406 799.351562 154.449219 794.503906 148.949219 789.519531 C 143.449219 784.539062 138.074219 779.421875 132.828125 774.171875 C 127.578125 768.925781 122.460938 763.550781 117.480469 758.050781 C 112.496094 752.554688 107.648438 746.933594 102.941406 741.199219 C 98.230469 735.460938 93.667969 729.609375 89.246094 723.648438 C 84.824219 717.6875 80.550781 711.621094 76.429688 705.453125 C 72.304688 699.28125 68.335938 693.011719 64.519531 686.644531 C 60.703125 680.28125 57.046875 673.824219 53.546875 667.277344 C 50.050781 660.734375 46.714844 654.105469 43.539062 647.394531 C 40.367188 640.6875 37.359375 633.902344 34.519531 627.046875 C 31.679688 620.191406 29.011719 613.269531 26.507812 606.28125 C 24.007812 599.292969 21.683594 592.246094 19.527344 585.144531 C 17.375 578.042969 15.394531 570.890625 13.589844 563.691406 C 11.789062 556.492188 10.160156 549.253906 8.714844 541.972656 C 7.265625 534.695312 5.996094 527.382812 4.910156 520.042969 C 3.820312 512.699219 2.910156 505.335938 2.183594 497.949219 C 1.457031 490.566406 0.910156 483.164062 0.546875 475.753906 C 0.183594 468.339844 0 460.921875 0 453.5 C 0 446.078125 0.183594 438.660156 0.546875 431.246094 C 0.910156 423.835938 1.457031 416.433594 2.183594 409.050781 C 2.910156 401.664062 3.820312 394.300781 4.910156 386.957031 C 5.996094 379.617188 7.265625 372.304688 8.714844 365.027344 C 10.160156 357.746094 11.789062 350.507812 13.589844 343.308594 C 15.394531 336.109375 17.375 328.957031 19.527344 321.855469 C 21.683594 314.753906 24.007812 307.707031 26.507812 300.71875 C 29.011719 293.734375 31.679688 286.808594 34.519531 279.953125 C 37.359375 273.097656 40.367188 266.3125 43.539062 259.605469 C 46.714844 252.894531 50.050781 246.265625 53.546875 239.722656 C 57.046875 233.175781 60.703125 226.71875 64.519531 220.355469 C 68.335938 213.988281 72.304688 207.71875 76.429688 201.550781 C 80.550781 195.378906 84.824219 189.3125 89.246094 183.351562 C 93.667969 177.390625 98.230469 171.539062 102.941406 165.800781 C 107.648438 160.066406 112.496094 154.445312 117.480469 148.949219 C 122.460938 143.449219 127.578125 138.074219 132.828125 132.828125 C 138.074219 127.578125 143.449219 122.460938 148.949219 117.480469 C 154.449219 112.496094 160.066406 107.648438 165.800781 102.941406 C 171.539062 98.230469 177.390625 93.667969 183.351562 89.246094 C 189.3125 84.824219 195.378906 80.550781 201.550781 76.429688 C 207.71875 72.304688 213.988281 68.335938 220.355469 64.519531 C 226.71875 60.703125 233.175781 57.046875 239.722656 53.546875 C 246.265625 50.050781 252.894531 46.714844 259.605469 43.539062 C 266.3125 40.367188 273.097656 37.359375 279.953125 34.519531 C 286.808594 31.679688 293.734375 29.011719 300.71875 26.507812 C 307.707031 24.007812 314.753906 21.683594 321.855469 19.527344 C 328.957031 17.375 336.109375 15.394531 343.308594 13.589844 C 350.507812 11.789062 357.746094 10.160156 365.027344 8.714844 C 372.304688 7.265625 379.617188 5.996094 386.957031 4.910156 C 394.300781 3.820312 401.664062 2.910156 409.050781 2.183594 C 416.433594 1.457031 423.835938 0.910156 431.246094 0.546875 C 438.660156 0.183594 446.078125 0 453.5 0 C 460.921875 0.0078125 468.335938 0.195312 475.746094 0.566406 C 483.15625 0.9375 490.554688 1.488281 497.9375 2.222656 C 505.320312 2.957031 512.683594 3.871094 520.019531 4.964844 C 527.359375 6.058594 534.667969 7.332031 541.945312 8.785156 C 549.21875 10.238281 556.457031 11.867188 563.652344 13.675781 C 570.847656 15.484375 577.996094 17.464844 585.097656 19.625 C 592.195312 21.78125 599.238281 24.113281 606.222656 26.617188 C 613.207031 29.121094 620.125 31.792969 626.980469 34.636719 C 633.832031 37.480469 640.613281 40.488281 647.320312 43.664062 C 654.027344 46.839844 660.652344 50.175781 667.191406 53.675781 C 673.734375 57.175781 680.1875 60.835938 686.550781 64.652344 C 692.914062 68.46875 699.179688 72.4375 705.347656 76.5625 C 711.519531 80.683594 717.582031 84.957031 723.539062 89.378906 C 729.5 93.800781 735.347656 98.363281 741.082031 103.070312 C 746.816406 107.78125 752.433594 112.625 757.929688 117.609375 C 763.429688 122.589844 768.800781 127.707031 774.046875 132.953125 C 779.292969 138.199219 784.410156 143.570312 789.390625 149.070312 C 794.375 154.566406 799.21875 160.183594 803.929688 165.917969 C 808.636719 171.652344 813.199219 177.5 817.621094 183.460938 C 822.042969 189.417969 826.316406 195.484375 830.4375 201.652344 C 834.5625 207.820312 838.53125 214.085938 842.347656 220.449219 C 846.164062 226.8125 849.824219 233.265625 853.324219 239.808594 C 856.824219 246.347656 860.160156 252.972656 863.335938 259.679688 C 866.511719 266.386719 869.519531 273.167969 872.363281 280.019531 C 875.207031 286.875 877.878906 293.792969 880.382812 300.777344 C 882.886719 307.761719 885.21875 314.804688 887.375 321.902344 C 889.535156 329.003906 891.515625 336.152344 893.324219 343.347656 C 895.132812 350.542969 896.761719 357.78125 898.214844 365.054688 C 899.667969 372.332031 900.941406 379.640625 902.035156 386.980469 C 903.128906 394.316406 904.042969 401.679688 904.777344 409.0625 C 905.511719 416.445312 906.0625 423.84375 906.433594 431.253906 C 906.804688 438.664062 906.992188 446.082031 907 453.5 Z M 863.808594 453.5 C 863.808594 446.785156 863.644531 440.074219 863.316406 433.367188 C 862.984375 426.660156 862.492188 419.964844 861.832031 413.28125 C 861.175781 406.601562 860.355469 399.9375 859.367188 393.296875 C 858.382812 386.652344 857.234375 380.039062 855.925781 373.453125 C 854.617188 366.867188 853.144531 360.316406 851.511719 353.804688 C 849.882812 347.289062 848.089844 340.820312 846.140625 334.394531 C 844.191406 327.96875 842.085938 321.59375 839.824219 315.269531 C 837.5625 308.949219 835.144531 302.683594 832.578125 296.480469 C 830.007812 290.277344 827.285156 284.140625 824.414062 278.070312 C 821.542969 272 818.527344 266.003906 815.359375 260.082031 C 812.195312 254.160156 808.886719 248.320312 805.433594 242.558594 C 801.980469 236.800781 798.390625 231.128906 794.660156 225.542969 C 790.929688 219.960938 787.0625 214.472656 783.0625 209.078125 C 779.0625 203.683594 774.933594 198.394531 770.671875 193.203125 C 766.414062 188.011719 762.027344 182.929688 757.519531 177.953125 C 753.011719 172.976562 748.382812 168.117188 743.632812 163.367188 C 738.882812 158.617188 734.023438 153.992188 729.046875 149.480469 C 724.070312 144.972656 718.988281 140.585938 713.796875 136.328125 C 708.605469 132.066406 703.316406 127.9375 697.921875 123.9375 C 692.527344 119.9375 687.039062 116.070312 681.457031 112.339844 C 675.871094 108.609375 670.199219 105.019531 664.441406 101.566406 C 658.683594 98.113281 652.839844 94.804688 646.917969 91.640625 C 640.996094 88.472656 635 85.457031 628.929688 82.585938 C 622.859375 79.714844 616.722656 76.992188 610.519531 74.421875 C 604.316406 71.855469 598.050781 69.4375 591.730469 67.175781 C 585.40625 64.914062 579.03125 62.808594 572.605469 60.859375 C 566.179688 58.910156 559.710938 57.117188 553.195312 55.488281 C 546.683594 53.855469 540.132812 52.382812 533.546875 51.074219 C 526.960938 49.765625 520.347656 48.617188 513.703125 47.632812 C 507.0625 46.644531 500.398438 45.824219 493.71875 45.167969 C 487.035156 44.507812 480.339844 44.015625 473.632812 43.683594 C 466.925781 43.355469 460.214844 43.191406 453.5 43.191406 C 446.785156 43.191406 440.074219 43.355469 433.367188 43.683594 C 426.660156 44.015625 419.964844 44.507812 413.28125 45.167969 C 406.601562 45.824219 399.9375 46.644531 393.296875 47.632812 C 386.652344 48.617188 380.039062 49.765625 373.453125 51.074219 C 366.867188 52.382812 360.316406 53.855469 353.804688 55.488281 C 347.289062 57.117188 340.820312 58.910156 334.394531 60.859375 C 327.96875 62.808594 321.59375 64.914062 315.269531 67.175781 C 308.949219 69.4375 302.683594 71.855469 296.480469 74.421875 C 290.277344 76.992188 284.140625 79.714844 278.070312 82.585938 C 272 85.457031 266.003906 88.472656 260.082031 91.640625 C 254.160156 94.804688 248.320312 98.113281 242.558594 101.566406 C 236.800781 105.019531 231.128906 108.609375 225.542969 112.339844 C 219.960938 116.070312 214.472656 119.9375 209.078125 123.9375 C 203.683594 127.9375 198.394531 132.066406 193.203125 136.328125 C 188.011719 140.585938 182.929688 144.972656 177.953125 149.480469 C 172.976562 153.992188 168.117188 158.617188 163.367188 163.367188 C 158.621094 168.117188 153.992188 172.976562 149.480469 177.953125 C 144.972656 182.929688 140.585938 188.011719 136.328125 193.203125 C 132.066406 198.394531 127.9375 203.683594 123.9375 209.078125 C 119.9375 214.472656 116.070312 219.960938 112.339844 225.542969 C 108.609375 231.128906 105.019531 236.800781 101.566406 242.558594 C 98.113281 248.320312 94.804688 254.160156 91.640625 260.082031 C 88.472656 266.003906 85.457031 272 82.585938 278.070312 C 79.714844 284.140625 76.992188 290.277344 74.421875 296.480469 C 71.855469 302.683594 69.4375 308.949219 67.175781 315.269531 C 64.914062 321.59375 62.808594 327.96875 60.859375 334.394531 C 58.910156 340.820312 57.117188 347.289062 55.488281 353.804688 C 53.855469 360.316406 52.382812 366.867188 51.074219 373.453125 C 49.765625 380.039062 48.617188 386.652344 47.632812 393.296875 C 46.644531 399.9375 45.824219 406.601562 45.167969 413.28125 C 44.507812 419.964844 44.015625 426.660156 43.683594 433.367188 C 43.355469 440.074219 43.191406 446.785156 43.191406 453.5 C 43.191406 460.214844 43.355469 466.925781 43.683594 473.632812 C 44.015625 480.339844 44.507812 487.035156 45.167969 493.71875 C 45.824219 500.398438 46.644531 507.0625 47.632812 513.703125 C 48.617188 520.347656 49.765625 526.960938 51.074219 533.546875 C 52.382812 540.132812 53.855469 546.683594 55.488281 553.195312 C 57.117188 559.710938 58.910156 566.179688 60.859375 572.605469 C 62.808594 579.03125 64.914062 585.40625 67.175781 591.730469 C 69.4375 598.050781 71.855469 604.316406 74.421875 610.519531 C 76.992188 616.722656 79.714844 622.859375 82.585938 628.929688 C 85.457031 635 88.472656 640.996094 91.640625 646.917969 C 94.804688 652.839844 98.113281 658.683594 101.566406 664.441406 C 105.019531 670.199219 108.609375 675.871094 112.339844 681.457031 C 116.070312 687.039062 119.9375 692.527344 123.9375 697.921875 C 127.9375 703.316406 132.066406 708.605469 136.328125 713.796875 C 140.585938 718.988281 144.972656 724.070312 149.480469 729.046875 C 153.992188 734.023438 158.621094 738.882812 163.367188 743.632812 C 168.117188 748.382812 172.976562 753.011719 177.953125 757.519531 C 182.929688 762.027344 188.011719 766.414062 193.203125 770.671875 C 198.394531 774.933594 203.683594 779.0625 209.078125 783.0625 C 214.472656 787.0625 219.960938 790.929688 225.542969 794.660156 C 231.128906 798.390625 236.800781 801.980469 242.558594 805.433594 C 248.320312 808.886719 254.160156 812.195312 260.082031 815.359375 C 266.003906 818.527344 272 821.542969 278.070312 824.414062 C 284.140625 827.285156 290.277344 830.007812 296.480469 832.578125 C 302.683594 835.144531 308.949219 837.5625 315.269531 839.824219 C 321.59375 842.085938 327.96875 844.191406 334.394531 846.140625 C 340.820312 848.089844 347.289062 849.882812 353.804688 851.511719 C 360.316406 853.144531 366.867188 854.617188 373.453125 855.925781 C 380.039062 857.234375 386.652344 858.382812 393.296875 859.367188 C 399.9375 860.355469 406.601562 861.175781 413.28125 861.832031 C 419.964844 862.492188 426.660156 862.984375 433.367188 863.316406 C 440.074219 863.644531 446.785156 863.808594 453.5 863.808594 C 460.214844 863.800781 466.921875 863.632812 473.625 863.296875 C 480.332031 862.960938 487.023438 862.457031 493.703125 861.792969 C 500.382812 861.128906 507.042969 860.304688 513.683594 859.3125 C 520.324219 858.320312 526.933594 857.167969 533.515625 855.855469 C 540.101562 854.539062 546.648438 853.0625 553.160156 851.429688 C 559.667969 849.792969 566.136719 847.996094 572.558594 846.046875 C 578.980469 844.09375 585.351562 841.984375 591.671875 839.71875 C 597.992188 837.453125 604.25 835.035156 610.453125 832.460938 C 616.652344 829.890625 622.785156 827.167969 628.855469 824.292969 C 634.921875 821.421875 640.914062 818.402344 646.832031 815.234375 C 652.753906 812.066406 658.589844 808.757812 664.347656 805.304688 C 670.105469 801.851562 675.773438 798.257812 681.355469 794.527344 C 686.933594 790.796875 692.421875 786.929688 697.8125 782.929688 C 703.203125 778.929688 708.492188 774.800781 713.683594 770.542969 C 718.871094 766.28125 723.953125 761.898438 728.925781 757.390625 C 733.898438 752.882812 738.757812 748.253906 743.507812 743.507812 C 748.253906 738.757812 752.882812 733.898438 757.390625 728.925781 C 761.898438 723.953125 766.28125 718.871094 770.542969 713.683594 C 774.800781 708.492188 778.929688 703.203125 782.929688 697.8125 C 786.929688 692.421875 790.796875 686.933594 794.527344 681.355469 C 798.257812 675.773438 801.851562 670.105469 805.304688 664.347656 C 808.757812 658.589844 812.066406 652.753906 815.234375 646.832031 C 818.402344 640.914062 821.421875 634.921875 824.292969 628.855469 C 827.167969 622.785156 829.890625 616.652344 832.460938 610.453125 C 835.035156 604.25 837.453125 597.992188 839.71875 591.671875 C 841.984375 585.351562 844.09375 578.980469 846.046875 572.558594 C 847.996094 566.136719 849.792969 559.667969 851.429688 553.160156 C 853.0625 546.648438 854.539062 540.101562 855.855469 533.515625 C 857.167969 526.933594 858.320312 520.324219 859.3125 513.683594 C 860.304688 507.042969 861.128906 500.382812 861.792969 493.703125 C 862.457031 487.023438 862.960938 480.332031 863.296875 473.625 C 863.632812 466.921875 863.800781 460.214844 863.808594 453.5 Z M 863.808594 453.5 "/></svg>';

// The clock on the day moved to (om-135.svg, user, 2026-10-29: hands that
// don't read as a check mark; was om-134), its fill turned into currentColor so it takes the day's green.
var ST_CLOCK_ICON = '<svg class="st-clock-ico" viewBox="0 0 907.5 907.5" aria-hidden="true"><path fill="currentColor" d="M 453.480469 0 C 333.21875 0 217.859375 47.78125 132.820312 132.824219 C 47.78125 217.863281 0 333.21875 0 453.484375 C 0 573.75 47.78125 689.105469 132.820312 774.144531 C 217.859375 859.183594 333.21875 906.964844 453.480469 906.964844 C 573.746094 906.964844 689.105469 859.183594 774.144531 774.144531 C 859.183594 689.105469 906.964844 573.75 906.964844 453.484375 C 906.964844 333.21875 859.183594 217.863281 774.144531 132.824219 C 689.105469 47.78125 573.746094 0 453.480469 0 Z M 453.480469 35.789062 C 564.269531 35.789062 670.5 79.792969 748.835938 158.128906 C 827.171875 236.46875 871.175781 342.699219 871.175781 453.484375 C 871.175781 564.269531 827.171875 670.5 748.835938 748.835938 C 670.5 827.175781 564.269531 871.175781 453.480469 871.175781 C 342.695312 871.175781 236.464844 827.175781 158.128906 748.835938 C 79.789062 670.5 35.789062 564.269531 35.789062 453.484375 C 35.789062 342.699219 79.789062 236.46875 158.128906 158.128906 C 236.464844 79.792969 342.695312 35.789062 453.480469 35.789062 Z M 453.480469 35.789062  M 478.136719 453.484375 C 478.136719 454.289062 478.097656 455.097656 478.015625 455.898438 C 477.9375 456.703125 477.820312 457.5 477.660156 458.292969 C 477.503906 459.085938 477.308594 459.867188 477.074219 460.640625 C 476.839844 461.414062 476.566406 462.171875 476.257812 462.917969 C 475.949219 463.664062 475.601562 464.394531 475.222656 465.105469 C 474.84375 465.816406 474.429688 466.507812 473.980469 467.179688 C 473.53125 467.851562 473.050781 468.5 472.539062 469.125 C 472.027344 469.746094 471.484375 470.34375 470.914062 470.917969 C 470.34375 471.488281 469.746094 472.027344 469.121094 472.542969 C 468.496094 473.054688 467.847656 473.535156 467.175781 473.980469 C 466.503906 474.429688 465.8125 474.84375 465.101562 475.226562 C 464.390625 475.605469 463.660156 475.953125 462.914062 476.261719 C 462.167969 476.570312 461.410156 476.839844 460.636719 477.074219 C 459.863281 477.308594 459.082031 477.503906 458.292969 477.664062 C 457.5 477.820312 456.703125 477.9375 455.898438 478.019531 C 455.09375 478.097656 454.289062 478.136719 453.480469 478.136719 C 452.675781 478.136719 451.871094 478.097656 451.066406 478.019531 C 450.261719 477.9375 449.464844 477.820312 448.671875 477.664062 C 447.878906 477.503906 447.097656 477.308594 446.324219 477.074219 C 445.550781 476.839844 444.789062 476.570312 444.046875 476.261719 C 443.300781 475.953125 442.570312 475.605469 441.859375 475.226562 C 441.148438 474.84375 440.457031 474.429688 439.78125 473.980469 C 439.113281 473.535156 438.464844 473.054688 437.839844 472.539062 C 437.214844 472.027344 436.617188 471.488281 436.046875 470.917969 C 435.476562 470.34375 434.9375 469.746094 434.421875 469.125 C 433.910156 468.5 433.429688 467.851562 432.980469 467.179688 C 432.53125 466.507812 432.117188 465.816406 431.738281 465.105469 C 431.355469 464.394531 431.011719 463.664062 430.703125 462.917969 C 430.394531 462.171875 430.121094 461.414062 429.890625 460.640625 C 429.65625 459.867188 429.457031 459.085938 429.300781 458.292969 C 429.144531 457.5 429.027344 456.703125 428.949219 455.898438 C 428.867188 455.097656 428.828125 454.289062 428.828125 453.484375 C 428.828125 452.675781 428.867188 451.871094 428.949219 451.066406 C 429.027344 450.261719 429.144531 449.464844 429.300781 448.675781 C 429.460938 447.882812 429.65625 447.097656 429.890625 446.328125 C 430.125 445.554688 430.394531 444.792969 430.707031 444.046875 C 431.015625 443.300781 431.359375 442.574219 431.742188 441.859375 C 432.121094 441.148438 432.535156 440.457031 432.984375 439.785156 C 433.429688 439.113281 433.914062 438.464844 434.425781 437.84375 C 434.9375 437.21875 435.476562 436.621094 436.050781 436.050781 C 436.617188 435.480469 437.21875 434.9375 437.84375 434.425781 C 438.464844 433.914062 439.113281 433.433594 439.785156 432.984375 C 440.457031 432.535156 441.148438 432.121094 441.863281 431.738281 C 442.574219 431.359375 443.304688 431.015625 444.046875 430.707031 C 444.792969 430.398438 445.550781 430.125 446.324219 429.890625 C 447.097656 429.65625 447.878906 429.460938 448.671875 429.304688 C 449.464844 429.144531 450.265625 429.027344 451.066406 428.949219 C 451.871094 428.867188 452.675781 428.828125 453.480469 428.828125 C 454.289062 428.828125 455.09375 428.867188 455.898438 428.949219 C 456.703125 429.027344 457.5 429.144531 458.292969 429.304688 C 459.082031 429.460938 459.867188 429.65625 460.636719 429.890625 C 461.410156 430.125 462.171875 430.398438 462.917969 430.707031 C 463.664062 431.015625 464.390625 431.359375 465.105469 431.742188 C 465.816406 432.121094 466.507812 432.535156 467.179688 432.984375 C 467.851562 433.433594 468.5 433.914062 469.125 434.425781 C 469.746094 434.9375 470.34375 435.480469 470.914062 436.050781 C 471.488281 436.621094 472.027344 437.21875 472.542969 437.84375 C 473.054688 438.46875 473.53125 439.113281 473.980469 439.785156 C 474.429688 440.457031 474.84375 441.148438 475.222656 441.859375 C 475.605469 442.574219 475.949219 443.300781 476.257812 444.050781 C 476.566406 444.792969 476.839844 445.554688 477.074219 446.328125 C 477.308594 447.097656 477.503906 447.882812 477.660156 448.675781 C 477.820312 449.464844 477.9375 450.261719 478.015625 451.066406 C 478.097656 451.871094 478.136719 452.675781 478.136719 453.484375 Z M 478.136719 453.484375  M 517.179688 720.230469 C 508.601562 722.253906 500.070312 716.980469 498.046875 708.40625 L 438.359375 455.660156 C 436.335938 447.085938 441.609375 438.550781 450.183594 436.527344 C 458.757812 434.503906 467.289062 439.773438 469.316406 448.347656 L 529 701.097656 C 531.023438 709.671875 525.753906 718.203125 517.179688 720.230469 Z M 517.179688 720.230469  M 199.394531 290.347656 C 203.390625 284.015625 213.285156 283.023438 221.585938 288.121094 L 467.640625 439.25 C 475.941406 444.347656 479.40625 453.546875 475.410156 459.878906 C 471.417969 466.207031 461.519531 467.199219 453.21875 462.101562 L 207.164062 310.972656 C 198.867188 305.875 195.398438 296.675781 199.394531 290.347656 Z M 199.394531 290.347656 "/></svg>';

// The clock opens the half hours right by the day (user, 2026-10-29): a list
// laid over the window next to the day, scrolled to the time set; a pick sets
// it on the day and closes the list.
function _stClockOpen(cell) {
  _stClockClose();
  var s = _stPickSel, panel = cell.closest('.st-win');
  if (!s || !panel) return;
  var cur = _rpmTpMins(s.time), pop = document.createElement('div');
  pop.className = 'st-tpop';
  pop.innerHTML = _rpmTpOpts(cur);
  panel.appendChild(pop);
  var pr = panel.getBoundingClientRect(), cr = cell.getBoundingClientRect();
  var left = cr.right - pr.left + 8;
  if (left + pop.offsetWidth > panel.clientWidth - 8) left = cr.left - pr.left - pop.offsetWidth - 8;   // no room on the right: the left side
  pop.style.left = Math.max(8, left) + 'px';
  pop.style.top = Math.max(8, cr.top - pr.top + panel.scrollTop + cr.height / 2 - pop.offsetHeight / 2) + 'px';
  var on = pop.querySelector('.rpm-tp-opt.on');
  if (on) pop.scrollTop = on.offsetTop - pop.clientHeight / 2 + on.offsetHeight / 2;
  pop.onclick = function(e) {
    e.stopPropagation();
    var o = e.target.closest('.rpm-tp-opt');
    if (!o) return;
    _stClockClose();
    if (o.dataset.v !== s.time) { s.time = o.dataset.v; _stPickTimeShown(); }
  };
  setTimeout(function() { document.addEventListener('click', _stClockClose); }, 0);
}
function _stClockClose(e) {
  if (e && e.target.closest && e.target.closest('.st-tpop')) return;
  document.querySelectorAll('.st-tpop').forEach(function(p) { p.remove(); });
  document.removeEventListener('click', _stClockClose);
}

// An arrow from the lesson being moved to the day it moves to (user, 2026-10-29),
// laid over the weeks: straight along a row, a curve down or up to another week.
function _stPickArrow() {
  var old = document.querySelector('.st-pick-arrow');
  if (old) old.remove();
  var s = _stPickSel, wrap = s && s.to && s.cell.closest('.im-rs-strips');
  if (!wrap) return;
  _stArrowBetween(wrap, s.cell, s.to);
}
// The arrow itself, from one day to another on the same strips (Slot change uses it too).
function _stArrowBetween(wrap, from, to) {
  var wr = wrap.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  var ax = a.left + a.width / 2 - wr.left, ay = a.top + a.height / 2 - wr.top, bx = b.left + b.width / 2 - wr.left, by = b.top + b.height / 2 - wr.top;
  var d, gap = 4;
  if (Math.abs(ay - by) < 4) {   // the same week: edge to edge
    var r = bx > ax;
    var x1 = r ? a.right - wr.left + gap : a.left - wr.left - gap, x2 = r ? b.left - wr.left - gap : b.right - wr.left + gap;
    d = 'M' + x1 + ' ' + ay + ' L' + x2 + ' ' + by;
  } else {   // another week: from the lesson's bottom (or top) to the day's top (or bottom)
    var down = by > ay;
    var y1 = down ? a.bottom - wr.top + gap : a.top - wr.top - gap, y2 = down ? b.top - wr.top - gap : b.bottom - wr.top + gap;
    var mid = (y1 + y2) / 2;
    d = 'M' + ax + ' ' + y1 + ' C' + ax + ' ' + mid + ' ' + bx + ' ' + mid + ' ' + bx + ' ' + y2;
  }
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'st-pick-arrow');
  svg.setAttribute('width', wr.width); svg.setAttribute('height', wr.height);
  svg.innerHTML = "<defs><marker id='stArrowHead' viewBox='0 0 10 10' refX='8' refY='5' markerUnits='userSpaceOnUse' markerWidth='17.5' markerHeight='17.5' orient='auto-start-reverse'>" +
    "<path d='M0 0 L10 5 L0 10 z' fill='currentColor'/></marker></defs>" +
    "<path d='" + d + "' fill='none' stroke='currentColor' stroke-width='4' marker-end='url(#stArrowHead)'/>";   // thicker (user, 2026-10-29; was 1.5, then 2.5)
  wrap.appendChild(svg);
}

// The day moved to shows the lesson's time on it (2026-10-29), back to blank when let go.
function _stPickToClear(s) {
  if (!s || !s.to) return;
  s.to.classList.remove('st-pick-to', 'st-pick-done');
  var o = s.to.querySelector('.st-pick-ok'); if (o) o.remove();
  var ck = s.to.querySelector('.st-pick-clock'); if (ck) ck.remove();
  _stClockClose();
  var ar = document.querySelector('.st-pick-arrow'); if (ar) ar.remove();
  var t = s.to.children[2]; if (t) t.innerHTML = s.to.dataset.today ? ST_TODAY_MARK : '&nbsp;';
  s.to = null;
}
// The time on the day moved to: the picked lesson's, until the clock changes it.
// Any change un-decides the move: the arrow and the box clear till the ✓ again.
function _stPickTimeShown() {
  var s = _stPickSel, t = s && s.to && s.to.children[2];
  if (t) t.textContent = _rpmTpLbl(_rpmTpMins(s.time));
  _stPickMovedClear();
}
// Undo and Reschedule follow what's picked (user, 2026-10-29).
var _stPickWho = 'Student';
function _stPickButtons() {
  var s = _stPickSel, u = document.getElementById('imRsUndo'), c = document.getElementById('imRsConfirm');
  if (u) u.disabled = !s;
  if (c) c.classList.toggle('st-off', !(s && s.done));
}
// Undo: the ✓, then the day moved to, then the lesson, one at a time.
function _stPickUndo() {
  var s = _stPickSel;
  if (!s) return;
  if (s.done) _stPickMovedClear();
  else if (s.to) _stPickToClear(s);
  else _stPickClear();
  _stPickButtons();
}
// Confirm move, under the weeks: the Reschedule window's call, the day and time as decided.
function _stPickConfirm(btn) {
  var s = _stPickSel, url = getScriptUrl();
  if (!s || !s.done || !url) return;
  var panel = btn.closest('.st-win'), opts = s.opts || {};
  var note = (document.getElementById('imRsNote') || {}).value ? document.getElementById('imRsNote').value.trim() : '';
  if (s.skip) {   // the Skip window's call (markSkip)
    btn.textContent = 'Skipping…'; btn.disabled = true; rpmBusy(panel, btn, true);
    _stCall(url, 'markSkip', { name: s.name, date: s.lesson.date, id: s.lesson.id || '', start: s.lesson.stamp || '', who: _stPickWho, note: note },
      function(data) { rpmBusy(panel, btn, false); if (opts.onDone) opts.onDone(data, 'Skipped'); },
      function(msg) {
        rpmBusy(panel, btn, false); btn.textContent = 'Confirm skip'; btn.disabled = false;
        rpmFail('imRsState', msg);
        if (opts.onFail) opts.onFail(msg);
      });
    return;
  }
  btn.textContent = 'Moving…'; btn.disabled = true; rpmBusy(panel, btn, true);
  _stCall(url, 'rescheduleLesson', {
    name: s.name, date: s.lesson.date, id: s.lesson.id || '', start: s.lesson.stamp || '',
    newDate: s.done.ymd, time: s.done.time,
    who: _stPickWho, note: note
  }, function(data) {
    rpmBusy(panel, btn, false);
    if (opts.onDone) opts.onDone(data, 'Rescheduled');
  }, function(msg) {
    rpmBusy(panel, btn, false); btn.textContent = 'Confirm move'; btn.disabled = false;
    rpmFail('imRsState', msg);
    if (opts.onFail) opts.onFail(msg);
  });
}

// The ✕ in Change appointment (user, 2026-10-29): the lesson is crossed out,
// the box says SKIPPING and its day, and Requested by / Reason / Confirm skip
// wake up under it. Undo takes it back.
function _stPickSkip() {
  var s = _stPickSel, mv = document.getElementById('imRsMoved');
  if (!s || !mv) return;
  _stPickToClear(s);
  s.skip = true;
  s.done = { skip: true };
  s.cell.classList.add('st-pick-skip');
  s.cell.insertAdjacentHTML('beforeend', ST_SKIP_MARK);   // the red ✕ over the day (user, 2026-10-29)
  var wrap = s.cell.closest('.im-rs-strips'); if (wrap) wrap.classList.add('st-decided');
  _stPickHead('Skipping');
  mv.innerHTML = "<span>" + _dtpDateLabel(s.lesson.date) + ' · ' + s.lesson.time + "</span>";
  var b = document.getElementById('imRsConfirmBtn'); if (b) { b.textContent = 'Confirm skip'; b.dataset.tip = 'Removes this one lesson from the calendar\nand logs it to Skip Logs.'; }
  _stPickButtons();
  var c = document.getElementById('imRsConfirm'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'end' });
}
// The box's title and the confirm button, back to a move (after an undo).
function _stPickHead(t) { var h = document.querySelector('#imRsWin .im-rs-moved-h'); if (h) h.textContent = t; }

// The ✓ (user, 2026-10-29): "this is the place". The arrow draws and the box
// under the weeks says the move.
function _stPickDecide() {
  var s = _stPickSel, mv = document.getElementById('imRsMoved');
  if (!s || !s.to || !mv) return;
  s.done = { ymd: s.to.dataset.ymd, time: s.time };
  mv.innerHTML = "<span>" + _dtpDateLabel(s.done.ymd) + ' · ' + _rpmTpLbl(_rpmTpMins(s.time)) + "</span>";   // the date; MOVING TO is the title over the box (user, 2026-10-29)
  s.to.classList.add('st-pick-done');   // decided: the day turns into a red lesson (user, 2026-10-29)
  var wrap = s.cell.closest('.im-rs-strips'); if (wrap) wrap.classList.add('st-decided');   // and the ✕ / clock / ✓ go: just "moved from here to here"
  _stPickArrow();
  _stPickButtons();
  var c = document.getElementById('imRsConfirm'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'end' });   // the rest is under the weeks
}
function _stPickMovedClear() {
  var mv = document.getElementById('imRsMoved'); if (mv) mv.innerHTML = '';
  _stPickHead('Moving to');
  var b = document.getElementById('imRsConfirmBtn'); if (b) { b.textContent = 'Confirm move'; b.dataset.tip = 'Moves only this lesson in Google Calendar\nand logs it to Reschedule Logs.'; }
  if (_stPickSel && _stPickSel.skip) {
    _stPickSel.skip = false; _stPickSel.cell.classList.remove('st-pick-skip');
    var mk = _stPickSel.cell.querySelector('.st-skip-mark'); if (mk) mk.remove();
  }
  var ar = document.querySelector('.st-pick-arrow'); if (ar) ar.remove();
  document.querySelectorAll('.im-rs-strips.st-decided').forEach(function(w) { w.classList.remove('st-decided'); });
  if (_stPickSel) { _stPickSel.done = null; if (_stPickSel.to) _stPickSel.to.classList.remove('st-pick-done'); }
  _stPickButtons();
}
function _stPickClear() {
  _stPickMovedClear();
  var s = _stPickSel;
  if (s) {
    s.cell.classList.remove('st-pick-sel');
    var x = s.cell.querySelector('.st-pick-x'); if (x) x.remove();
    _stPickToClear(s);
  }
  _stPickSel = null;
  _stPickButtons();
}
function _stPickLesson(cell, name, lesson, opts) {
  var same = _stPickSel && _stPickSel.cell === cell;
  _stPickClear();
  if (same) { _stPickHint(ST_HOW_PICK); return; }   // let go: picking a lesson is step 1 again
  _stPickSel = { cell: cell, lesson: lesson, name: name, opts: opts, to: null, time: _stHhmm(lesson.time) };
  _stPickButtons();
  cell.classList.add('st-pick-sel');
  var x = document.createElement('span');
  x.className = 'st-pick-x';
  x.innerHTML = ST_X_ICON;   // the drawn circle and ✕ (user, 2026-10-29; was the ✕ character)
  x.dataset.tip = 'Skip this lesson';
  x.onclick = function(e) {
    e.stopPropagation();
    var s = _stPickSel;
    if (!s) return;
    if (document.getElementById('imRsMoved')) { _stPickSkip(); return; }   // Change appointment: the skip is decided right here (user, 2026-10-29)
    _stOpenSkipModal(s.name, s.lesson, s.opts);
  };
  cell.appendChild(x);
}
function _stPickDay(cell, ymd) {
  var s = _stPickSel;
  if (!s || cell === s.cell || s.skip) return;   // skipping: Undo first to move it instead
  // Try as many days as you like (user, 2026-10-26): the last one tapped is green with a ✓; the ✓ opens Reschedule.
  // The ✓ step is back (user, 2026-10-28, after a day straight to Reschedule).
  _stPickToClear(s);
  _stPickMovedClear();
  s.to = cell;
  cell.classList.add('st-pick-to');
  // Change appointment (user, 2026-10-29): the time is picked with the clock on the day, shown on it.
  var mv = document.getElementById('imRsMoved');
  if (mv) {
    _stPickTimeShown();
    var ck = document.createElement('span');
    ck.className = 'st-pick-clock';
    ck.innerHTML = ST_CLOCK_ICON;
    ck.dataset.tip = 'Pick the time';
    ck.onclick = function(e) { e.stopPropagation(); _stClockOpen(cell); };
    cell.appendChild(ck);
    var dn = document.createElement('span');
    dn.className = 'st-pick-ok';
    dn.innerHTML = ST_CHECK_ICON;
    dn.dataset.tip = 'This is the place';
    dn.onclick = function(e) { e.stopPropagation(); _stPickDecide(); };
    cell.appendChild(dn);
    return;
  }
  var ok = document.createElement('span');
  ok.className = 'st-pick-ok';
  ok.innerHTML = ST_CHECK_ICON;   // the drawn circle and tick (user, 2026-10-29; was the ✓ character)
  ok.dataset.tip = 'Move it to this day, then pick the time';   // the portal's rounded tip, not the browser's (user, 2026-10-28)
  ok.onclick = function(e) {
    e.stopPropagation();
    var t = _stPickSel;
    if (!t) return;
    _stOpenTimeConfirm(t.name, t.lesson, ymd, t.opts);
  };
  cell.appendChild(ok);
}

// ─── SKIP MODAL (reused from former Skips tab pattern) ──────────────────────

// opts (optional, used by the Calendar tab): onDone(data) / onFail(msg) replace
// the Home-strip refresh + feed log.
// Reason pills (user, 2026-10-26): under the Reason box in the Skip and
// Reschedule windows, the Log window's pill look. One tap fills Reason; another
// pill swaps it, or joins it after text typed by hand.
// The down arrow between Move from and Move to (om-126.svg, user, 2026-10-27; replaced om-125), black fill stripped.
var ST_MOVE_ARROW = '<svg class="st-move-ico" viewBox="0 0 605.25 1209.75" aria-hidden="true"><path fill="currentColor" d="M 301.875 0.628906 C 281.046875 0.628906 264.140625 17.546875 264.140625 38.386719 L 264.140625 992.746094 L 56.449219 874.035156 C 40.050781 864.621094 19.21875 868.851562 7.75 883.902344 C 2.566406 890.699219 0 898.753906 0 906.808594 C 0 916.476562 3.722656 926.191406 11.019531 933.492188 L 275.160156 1197.796875 C 289.902344 1212.546875 313.800781 1212.546875 328.542969 1197.796875 L 592.683594 933.492188 C 606.117188 920.101562 607.476562 898.90625 596.003906 883.855469 C 584.53125 868.800781 563.703125 864.574219 547.300781 873.988281 L 339.609375 992.746094 L 339.609375 38.386719 C 339.609375 17.546875 322.707031 0.628906 301.875 0.628906 Z M 301.875 0.628906 "/></svg>';
var ST_REASONS = ['Away', 'Vacation', 'Gig', 'Personal', 'Not stated', 'Work', 'Mistake'];   // Mistake: moved by mistake, or put back after one (user, 2026-10-29)
function _stReasonPills(id) {
  return "<div class='st-reasons' id='" + id + "'>" + ST_REASONS.map(function(r) {
    return "<button type='button' class='im-pill'>" + r + "</button>";
  }).join('') + "</div>";
}
function _stWireReasons(w, id, inputId) {
  var box = w.querySelector('#' + id), inp = w.querySelector('#' + inputId);
  if (!box || !inp) return;
  function mark() {
    Array.prototype.forEach.call(box.children, function(b) { b.classList.toggle('on', inp.value.split(/\s*,\s*/).indexOf(b.textContent) >= 0); });
  }
  box.onclick = function(e) {
    var b = e.target.closest('.im-pill');
    if (!b) return;
    var v = inp.value.trim();
    inp.value = !v || ST_REASONS.indexOf(v) >= 0 ? b.textContent : v + ', ' + b.textContent;
    mark();
  };
  inp.addEventListener('input', mark);
}

function _stOpenSkipModal(studentName, lesson, opts) {
  opts = opts || {};
  var who = 'Student';
  var w = _stWin('stSkipModal', studentName, 'Skip', CALENDAR_ICON,
    // The lesson in the Reschedule window's dark box, date and time boxes (user, 2026-10-28; was a plain line).
    "<div class='st-move-group'><div class='st-move-inner'><label class='field-label'>Skip</label>" +
      "<div class='st-from'><span class='st-big st-box'>" + _stDayLabel(lesson) + "</span><span class='st-big st-box'>" + lesson.time + "</span></div></div></div>" +
    "<label class='field-label st-gap'>Requested by</label>" + _stWhoSeg('stSkipWho', who) +
    "<label class='field-label st-gap'>Reason (optional)</label>" +
    "<input id='stSkipNote' type='text' class='rpm-field' autocomplete='off' style='width:100%'>" + _stReasonPills('stSkipReasons') +
    "<div class='ll-acts st-foot'><span class='ll-state' id='stSkipState' style='flex:1'></span>" +
      "<button class='link-btn bright' id='stSkipConfirm' data-tip='Removes this one lesson from the calendar\nand logs it to Skip Logs.' data-tip-left>Confirm skip</button></div>");
  _stWireWho(w, 'stSkipWho', function(v) { who = v; });
  _stWireReasons(w, 'stSkipReasons', 'stSkipNote');

  document.getElementById('stSkipConfirm').onclick = function() {
    var btn = this, panel = w.querySelector('.st-win');
    var url = getScriptUrl(); if (!url) return;
    btn.textContent = 'Skipping…'; btn.disabled = true; rpmBusy(panel, btn, true);
    _stCall(url, 'markSkip', { name: studentName, date: lesson.date, id: lesson.id || '', start: lesson.stamp || '',
                              who: who, note: document.getElementById('stSkipNote').value.trim() },
      function(data) {
        w.remove();
        if (opts.onDone) { opts.onDone(data, 'Skipped'); return; }
        _stOpenCalendar();   // refresh the strip; the skipped lesson drops off
      },
      function(msg) {
        rpmBusy(panel, btn, false); btn.textContent = 'Confirm skip'; btn.disabled = false;
        rpmFail('stSkipState', msg);
        if (opts.onFail) opts.onFail(msg);
      });
  };
}


// ─── LESSON ACTIONS (Reschedule / Skip chooser) ─────────────────────────────
// Tapping a red lesson day opens this chooser first. Skip → the existing skip
// modal (unchanged). Reschedule → drag-to-move mode within the 8-week grid.

function _stOpenLessonActions(studentName, lesson, opts) {
  // Dragged on the Calendar tab (2026-10-05): where it was dropped, and
  // anyone it would overlap. Reschedule starts from that day and time.
  var to = opts && opts.to;
  var w = _stWin('stActionModal', studentName, 'Lesson', CALENDAR_ICON,
    "<div class='st-when'>" + _stDayLabel(lesson) + " · " + lesson.time + "</div>" +
    (to ? "<div class='st-when' style='color:var(--blue)'>Dropped on " + to.label + "</div>" : "") +
    (to && to.overlaps && to.overlaps.length ? "<div class='st-when' style='color:var(--warn)'>Overlaps " + to.overlaps.join(', ') + "</div>" : "") +
    "<div class='ll-acts st-foot' style='justify-content:flex-end'>" +
      "<button class='link-btn opens-window' id='stActSkip' data-tip='Opens a window.\nTakes this one lesson off the calendar.'>Skip</button>" +
      "<button class='link-btn opens-window' id='stActReschedule' data-tip='Opens a window.\nMoves this one lesson to another day or time.' data-tip-left>Reschedule</button>" +
    "</div>");
  document.getElementById('stActSkip').onclick = function() { w.remove(); _stOpenSkipModal(studentName, lesson, opts); };
  document.getElementById('stActReschedule').onclick = function() {
    w.remove();
    // Straight to the Reschedule window, which moves the day itself (2026-10-05:
    // Home's drag-onto-a-day step went; a Calendar drop starts at its spot).
    if (opts && opts.fromCalendar) _stOpenTimeConfirm(studentName, lesson, (to && to.ymd) || lesson.date,
      { dayChange: true, startTime: to && to.time, onDone: opts.onDone, onFail: opts.onFail });
    else _stOpenTimeConfirm(studentName, lesson, lesson.date,
      opts && opts.onDone ? { onDone: opts.onDone, onFail: opts.onFail } : undefined);
  };
}


// ─── RESCHEDULE ──────────────────────────────────────────────────────────────

// The Reschedule window: pick the new day and time (prefilled from the
// original lesson, or a Calendar drop). Confirm → backend move → refresh.
// opts (optional, used by the Calendar tab): startTime prefills a dropped
// time; onDone(data) / onFail(msg) replace the Home-strip refresh + feed log.
// The day can always move; it never goes into the past.
// Window look (2026-10-05): the portal's date/time picker (rpmDtpHtml), the
// Trial windows' Student / Teacher choice, dim + dots while saving, a red
// Unsuccessful badge on failure.
function _stOpenTimeConfirm(studentName, lesson, newYmd, opts) {
  opts = opts || {};
  var t = _stParseTime(opts.startTime || lesson.time); // { h12, min, ap }; a Calendar drop starts at its new time
  var mins = ((t.h12 % 12) + (t.ap === 'PM' ? 12 : 0)) * 60 + t.min;
  var who = 'Student';
  var w = _stWin('stTimeModal', studentName, 'Reschedule', CALENDAR_ICON,
    // Move from: the lesson as it is; Move to: the picker (2026-10-06).
    // The two dates and the arrow in one centred, bordered box (user, 2026-10-27).
    "<label class='field-label'>Move the lesson</label>" +   // above the box, like Next 8 weeks (user, 2026-10-28)
    "<div class='st-move-group'><div class='st-move-inner'>" +
    "<label class='field-label'>From</label>" +   // just From / To (user, 2026-10-27; were Move from / Move to)
    // Plain text, the Skip window's line: it's fixed, not a picker (user, 2026-10-26; was the picker's boxes).
    // In the picker's caps and bigger, the first thing seen (user, 2026-10-27).
    // A thin divider between the day and the time, not a dot (user, 2026-10-27).
    // Date and time in their own boxes (user, 2026-10-27; were one box with a divider).
    "<div class='st-from'><span class='st-big st-box'>" + _stDayLabel(lesson) + "</span><span class='st-big st-box'>" + lesson.time + "</span></div>" +
    // A down arrow between the two, centred on the dates (user, 2026-10-27).
    // Two arrows, one under the date and one under the time (user, 2026-10-27).
    "<div class='st-move-arrow'><span>" + ST_MOVE_ARROW + "</span><span>" + ST_MOVE_ARROW + "</span></div>" +
    "<label class='field-label st-gap st-to-lab'>To</label>" +
    // Picked on the 8-week view: the day is written in, only the time moves (user, 2026-10-26).
    // The Calendar tab keeps its day arrows (a tap there has no day picked yet).
    // Picked: one box like Move from, "TUE, NOV 3 · 5:30 PM", the arrows at its end (user, 2026-10-27).
    // Day and time both picked on the weeks (user, 2026-10-29): two fixed boxes, like From.
    (opts.fixedTime ? "<div class='st-to'><span class='st-big st-box st-to-day'>" + _dtpDateLabel(newYmd) + "</span><span class='st-big st-box st-to-day'>" + _rpmTpLbl(_rpmTpMins(opts.fixedTime)) + "</span></div>" :
    (opts.pick ? "<div class='st-to'><span class='st-big st-box st-to-day'>" + _dtpDateLabel(newYmd) + "</span>" : '') +
    rpmDtpHtml('stRs', { date: newYmd, time: _stPad2(Math.floor(mins / 60)) + ':' + _stPad2(mins % 60), min: 'today', keys: true, fixedDate: !!opts.pick, timeLabel: opts.pick ? '' : undefined }) +   // no TIME tab beside the day (user, 2026-10-27)
    (opts.pick ? '</div>' : '')) +
    "</div></div>" +
    "<label class='field-label st-gap'>Requested by</label>" + _stWhoSeg('stRsWho', who) +
    "<label class='field-label st-gap'>Reason (optional)</label>" +
    "<input id='stRsNote' type='text' class='rpm-field' autocomplete='off' style='width:100%'>" + _stReasonPills('stRsReasons') +
    "<div class='ll-acts st-foot'><span class='ll-state' id='stRsState' style='flex:1'></span>" +
      "<button class='link-btn bright' id='stTimeConfirm' data-tip='Moves only this lesson in Google Calendar\nand logs it to Reschedule Logs.' data-tip-left>Confirm move</button></div>");
  // Each arrow centred under its From box (date, time).
  var fb = w.querySelectorAll('.st-move-group .st-from .st-box'), as = w.querySelectorAll('.st-move-arrow > span');
  for (var ai = 0; ai < as.length && ai < fb.length; ai++) as[ai].style.width = fb[ai].offsetWidth + 'px';
  _stWireWho(w, 'stRsWho', function(v) { who = v; });
  _stWireReasons(w, 'stRsReasons', 'stRsNote');

  document.getElementById('stTimeConfirm').onclick = function() {
    var btn = this, panel = w.querySelector('.st-win');
    var url = getScriptUrl(); if (!url) return;
    var when = opts.fixedTime ? { date: newYmd, time: opts.fixedTime } : rpmDtpGet('stRs');
    btn.textContent = 'Moving…'; btn.disabled = true; rpmBusy(panel, btn, true);
    _stCall(url, 'rescheduleLesson', {
      name: studentName, date: lesson.date, id: lesson.id || '', start: lesson.stamp || '',
      newDate: when.date, time: when.time,
      who: who, note: document.getElementById('stRsNote').value.trim()
    }, function(data) {
      w.remove();
      if (opts.onDone) { opts.onDone(data, 'Rescheduled'); return; }
      _stOpenCalendar(); // refresh — lesson now sits on the new day
    }, function(msg) {
      rpmBusy(panel, btn, false); btn.textContent = 'Confirm move'; btn.disabled = false;
      rpmFail('stRsState', msg);
      if (opts.onFail) opts.onFail(msg);
    });
  };
}

// "Sun, Oct 18" (2026-10-06): the picker's day label, with the comma the
// backend's "Sun Oct 18" lacks.
function _stDayLabel(lesson) {
  return rpmDtpParse(lesson.date) ? _dtpDateLabel(lesson.date) : lesson.dateLabel;
}

// ── Window helpers for Skip / Lesson / Reschedule (2026-10-05) ──
// The Log window's look: red name + grey part, ✕ to close, icon under it.
function _stWin(id, name, part, icon, body) {
  var old = document.getElementById(id);
  if (old) old.remove();
  var back = document.createElement('div');
  back.id = id;
  back.className = 'im-notes-back';
  back.onclick = function(e) { if (e.target === back) back.remove(); };
  back.innerHTML = "<div class='log-panel active st-win'>" +
    "<div class='settings-title'><span>" + name + "<span class='win-sub'> · " + part + "</span></span>" +
      "<button class='settings-close' data-close>✕</button></div>" +
    (icon ? "<div style='margin:4px 0 18px'>" + icon.replace(/class="[^"]*"/, 'class="win-icon"') + "</div>" : "") +
    body + "</div>";
  document.body.appendChild(back);
  back.querySelector('[data-close]').onclick = function() { back.remove(); };
  return back;
}

// Student / Teacher as a plain pick-one (2026-10-05): the portal's tick-box
// line (.db-check, the Dropbox audit's), normal case, not buttons.
function _stWhoSeg(id, on) {
  return "<div class='st-who' id='" + id + "'>" + ['Student', 'Teacher'].map(function(v) {
    return "<span class='db-check" + (v === on ? " on" : "") + "' data-who='" + v + "' role='radio' tabindex='0'><i class='db-box'></i>" + v + "</span>";
  }).join('') + "</div>";
}
function _stWireWho(w, id, set) {
  var opts = w.querySelectorAll('#' + id + ' .db-check');
  opts.forEach(function(b) {
    b.onclick = function() { opts.forEach(function(o) { o.classList.toggle('on', o === b); }); set(b.dataset.who); };
    b.onkeydown = function(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); b.onclick(); } };
  });
}

// GET the backend; ok(data) on success, fail(message) on anything else.
function _stCall(url, action, params, ok, fail) {
  var q = url + '?action=' + action;
  for (var k in params) q += '&' + k + '=' + encodeURIComponent(params[k]);
  fetch(q).then(function(r) { return r.json(); }).then(function(d) {
    if (d && d.success) ok(d); else fail(d && d.message ? d.message : 'Not saved');
  }).catch(function() { fail('No answer from Google. Check the calendar before trying again.'); });
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
      rpmSetLoading(zone, 'Uploading ' + (i + 1) + '/' + total + ': ' + name);
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

function _stLogLessonFor(name, dateObj) {
  // openLogFresh from lessons.js expects { name, eventDate, calType }.
  // Pass the chosen date as yyyy/MM/dd — SLASHES parse in LOCAL time on the
  // backend's new Date(), avoiding the ISO-UTC day-roll. Empty string → the
  // backend falls back to "today".
  var eventDate = '';
  if (dateObj) {
    var y = dateObj.getFullYear(), m = dateObj.getMonth() + 1, dd = dateObj.getDate();
    eventDate = y + '/' + (m < 10 ? '0' + m : m) + '/' + (dd < 10 ? '0' + dd : dd);
  }
  window._auditFixActive = false;
  // Flag so submitLog re-fetches this student's detail after a successful log,
  // refreshing the Past section (and lesson #/payment) to the post-log state —
  // you keep working on this page after logging, so it should show the lesson
  // you just entered, not the view from before.
  window._stLogActive = name;
  if (typeof _floatLogPanel === 'function') _floatLogPanel();
  if (typeof openLogFresh === 'function') {
    openLogFresh({ name: name, eventDate: eventDate, calType: 'regular' }, undefined);
  } else {
    addLog('studentFeed', '❌ Log function not available', 'error');
  }
}


// ─── DATE HELPERS ───────────────────────────────────────────────────────────

function _stToday() {
  var n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

// "Jul 6" — short month + day, for the log-date stepper.
function _stMonDay(d) {
  var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return mon + ' ' + d.getDate();
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
