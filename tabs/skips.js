// ─── TABS / SKIPS.JS ────────────────────────────────────────────────────────
// Per-student skip tracker. Two screens:
//   1) LIST — every student with this-year totals (S / T). Tap one to drill in.
//   2) STUDENT — next 8 weeks rendered as Mon-Sun strips. Lesson days are red
//      tappable cells; tap to open a modal that captures Student/Teacher + note,
//      then deletes the calendar event and writes to the Skips + Skip Logs tabs.
//
// Secretary's hourly auto-cancellation email fires after deletion (same as
// Travel Agent), so the student gets "Your Lesson Is Cancelled" automatically.

var _skipsState = {
  view: 'list',          // 'list' or 'student'
  students: null,
  year: null,
  selectedStudent: null,
  studentLessons: null
};

function initSkipsTab() {
  _skipsLoadList();
}


// ─── LIST SCREEN ────────────────────────────────────────────────────────────

function _skipsLoadList() {
  var section = document.getElementById('skipsBody');
  if (!section) return;
  section.innerHTML = '<div class="empty-state">Loading...</div>';

  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + '?action=getSkipsStudents')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>';
        return;
      }
      _skipsState.view     = 'list';
      _skipsState.students = data.students || [];
      _skipsState.year     = data.year;
      _skipsRenderList();
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function _skipsRenderList() {
  var section = document.getElementById('skipsBody');
  section.innerHTML = '';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px';
  hdr.innerHTML =
    "<div style='font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>Tap a student</div>" +
    "<div style='font-size:11px;color:var(--muted)'>(S) / (T) totals · " + _skipsState.year + "</div>";
  section.appendChild(hdr);

  if (!_skipsState.students.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No students in the Skips tab';
    section.appendChild(empty);
    return;
  }

  var list = document.createElement('div');
  list.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden';

  _skipsState.students.forEach(function(s, i) {
    var row = document.createElement('button');
    row.style.cssText =
      'width:100%;padding:10px 12px;background:transparent;color:var(--text);border:none;font-family:inherit;text-align:left;cursor:pointer;' +
      'display:flex;justify-content:space-between;align-items:center;gap:10px;' +
      (i > 0 ? 'border-top:1px solid rgba(255,255,255,0.04);' : '');

    var totals = '';
    if (s.totalStudent || s.totalTeacher) {
      totals =
        "<span style='font-size:11px;color:var(--muted)'>" +
          (s.totalStudent ? "<span style='color:#5b9dff'>S " + s.totalStudent + "</span>" : '') +
          (s.totalStudent && s.totalTeacher ? " · " : '') +
          (s.totalTeacher ? "<span style='color:#ffa500'>T " + s.totalTeacher + "</span>" : '') +
        "</span>";
    } else {
      totals = "<span style='font-size:11px;color:var(--muted)'>—</span>";
    }
    row.innerHTML = "<span style='font-weight:600;font-size:13px'>" + s.name + "</span>" + totals;
    row.onclick = function() { _skipsOpenStudent(s.name); };
    list.appendChild(row);
  });
  section.appendChild(list);
}


// ─── STUDENT DETAIL SCREEN ──────────────────────────────────────────────────

function _skipsOpenStudent(name) {
  var section = document.getElementById('skipsBody');
  section.innerHTML = '<div class="empty-state">Loading ' + name + '...</div>';
  _skipsState.selectedStudent = name;

  var url = getScriptUrl(); if (!url) return;
  fetch(url + '?action=getStudentLessons&name=' + encodeURIComponent(name))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>';
        return;
      }
      _skipsState.view           = 'student';
      _skipsState.studentLessons = data;
      _skipsRenderStudent();
    });
}

function _skipsRenderStudent() {
  var section = document.getElementById('skipsBody');
  section.innerHTML = '';

  var data = _skipsState.studentLessons;
  var name = _skipsState.selectedStudent;

  // Look up this student's summary row from the cached list for the totals header.
  var summary = (_skipsState.students || []).filter(function(s) {
    return s.name.toLowerCase() === name.toLowerCase();
  })[0];

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
  var totalsLine = summary
    ? ("<div style='font-size:11px;color:var(--muted);margin-top:2px'>" +
        _skipsState.year + " · " +
        "<span style='color:#5b9dff'>Student " + summary.totalStudent + "</span> · " +
        "<span style='color:#ffa500'>Teacher " + summary.totalTeacher + "</span>" +
       "</div>")
    : '';
  hdr.innerHTML =
    "<div>" +
      "<div style='font-weight:700;font-size:14px'>" + name + "</div>" +
      totalsLine +
    "</div>" +
    "<button id='skipsBackBtn' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>← Students</button>";
  section.appendChild(hdr);
  document.getElementById('skipsBackBtn').onclick = _skipsLoadList;

  if (!data.lessons.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No upcoming lessons in the next 8 weeks';
    section.appendChild(empty);
    return;
  }

  // Build a lookup: yyyy-mm-dd -> lesson
  var byDate = {};
  data.lessons.forEach(function(l) { byDate[l.date] = l; });

  // Render N week strips starting from the Monday of this week.
  var weeks = data.weeks || 8;
  var today = _skNow();
  var monday = _skMondayOf(today);

  var stripWrap = document.createElement('div');
  stripWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px';

  for (var w = 0; w < weeks; w++) {
    var weekStart = new Date(monday.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    stripWrap.appendChild(_skipsBuildWeekStrip(weekStart, byDate, today, name));
  }
  section.appendChild(stripWrap);
}

function _skipsBuildWeekStrip(monday, byDate, today, studentName) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:4px;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:6px';

  for (var i = 0; i < 7; i++) {
    var d   = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
    var ymd = _skYmd(d);
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
        cell.onclick = function() { _skipsOpenModal(studentName, l); };
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


// ─── MARK SKIP MODAL ────────────────────────────────────────────────────────

function _skipsOpenModal(studentName, lesson) {
  // Close any existing modal first
  var existing = document.getElementById('skipsModal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'skipsModal';
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
    "<div style='display:flex;gap:6px;margin-bottom:12px' id='skipsWhoRow'>" +
      "<button data-who='Student' class='skipsWhoBtn' style='flex:1;padding:8px;font-size:12px;background:rgba(91,157,255,0.18);color:#5b9dff;border:1px solid rgba(91,157,255,0.6);border-radius:4px;cursor:pointer;font-weight:600'>Student</button>" +
      "<button data-who='Teacher' class='skipsWhoBtn' style='flex:1;padding:8px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>Teacher</button>" +
    "</div>" +

    "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Note (optional)</div>" +
    "<input id='skipsNote' type='text' placeholder='reason or context' " +
      "style='width:100%;padding:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;font-family:inherit;font-size:12px;margin-bottom:14px'>" +

    "<div style='display:flex;gap:8px'>" +
      "<button id='skipsCancel' style='flex:0 0 auto;padding:10px 16px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>Cancel</button>" +
      "<button id='skipsConfirm' style='flex:1;padding:10px;font-size:12px;background:rgba(232,70,58,0.25);color:var(--accent);border:1px solid var(--accent);border-radius:4px;cursor:pointer;font-weight:600;letter-spacing:0.5px'>Confirm Skip</button>" +
    "</div>";

  document.body.appendChild(overlay);

  var selectedWho = 'Student';
  var whoBtns = overlay.querySelectorAll('.skipsWhoBtn');
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

  document.getElementById('skipsCancel').onclick = function() { overlay.remove(); };
  document.getElementById('skipsConfirm').onclick = function() {
    var note = document.getElementById('skipsNote').value.trim();
    var btn  = document.getElementById('skipsConfirm');
    btn.disabled = true; btn.textContent = '…';
    _skipsSubmitMark(studentName, lesson.date, selectedWho, note, overlay);
  };

  setTimeout(function() {
    var noteInp = document.getElementById('skipsNote');
    if (noteInp) noteInp.focus();
  }, 50);
}

function _skipsSubmitMark(studentName, lessonYmd, who, note, overlay) {
  var url = getScriptUrl(); if (!url) return;
  callScript(url, 'markSkip', {
    name: studentName, date: lessonYmd, who: who, note: note
  }, function(data) {
    if (data && data.success) {
      addLog('skipsFeed', '✓ ' + studentName + ' · ' + data.lessonDay + ' · ' + data.who, 'success');
      overlay.remove();
      // Reload list (to pick up updated totals) then re-open the student view.
      var url2 = getScriptUrl();
      fetch(url2 + '?action=getSkipsStudents')
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.success) {
            _skipsState.students = d.students || [];
            _skipsState.year     = d.year;
          }
          _skipsOpenStudent(studentName);
        })
        .catch(function() { _skipsOpenStudent(studentName); });
    } else {
      addLog('skipsFeed', '❌ ' + (data && data.message ? data.message : 'Failed'), 'error');
      var b = document.getElementById('skipsConfirm');
      if (b) { b.disabled = false; b.textContent = 'Confirm Skip'; }
    }
  });
}


// ─── DATE HELPERS ───────────────────────────────────────────────────────────

function _skNow() {
  var n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function _skMondayOf(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
}

function _skYmd(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}
