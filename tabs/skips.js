// ─── TABS / SKIPS.JS ────────────────────────────────────────────────────────
// Who's skipping, this year. View over Skip Logs (the source of truth) —
// skips are normally LOGGED from the Home tab: tap a red lesson day → Skip →
// Student/Teacher. Writes here touch Skip Logs only (no calendar, no email):
// "+ Log skip" adds a row, × on an expanded skip deletes that row.
//
// Each student row shows three counts: Student (they cancelled), Teacher (you
// cancelled), Vacation (travel blocks; per-student only, not in the top totals).
// Every student is listed, sorted by Student count. Tap a row to expand the
// individual skips with date + note.

var _skData = null;      // last payload, so expand/collapse needs no refetch
var _skFormOpen = false; // "+ Log skip" form visible

function initSkipsTab() {
  var section = document.getElementById('skipsBody');
  if (!section) return;
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';

  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + '?action=getSkipsStudents')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + _skEsc(data.message || 'unknown') + '</div>';
        return;
      }
      _skData = data;
      _skRender();
    })
    .catch(function() { section.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

function _skRender() {
  var section = document.getElementById('skipsBody');
  if (!section || !_skData) return;
  section.innerHTML = '';

  var all     = _skData.students || [];
  var totals  = _skData.totals || { student: 0, teacher: 0, vacation: 0 };
  var year    = _skData.year || '';

  // ── Header: title + gray summary; actions on the next line, left; then the
  //    form (if open), a divider, and the student list ──
  var bar = document.createElement('div');
  bar.innerHTML =
    "<div class='section-label' style='font-size:11px;margin-bottom:10px'>Skips</div>" +
    // Same highlight as the Week tab's "Student #" row (.load-row.highlight).
    "<div style='border:1px solid var(--border);border-radius:6px;background:rgba(240,165,0,0.06);padding:10px 12px;margin-bottom:14px;" +
                "text-transform:uppercase;font-size:11px;color:var(--accent2);letter-spacing:1px'>" +
      "Since Jun 2026 · Total: " + (totals.student || 0) + " student · " + (totals.teacher || 0) + " teacher" +
    "</div>";
  var refreshBtn = document.createElement('button');
  refreshBtn.textContent = '⟳ Refresh';
  refreshBtn.style.cssText = 'padding:6px 14px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer;letter-spacing:0.5px;flex:0 0 auto';
  refreshBtn.onclick = initSkipsTab;
  var btns = document.createElement('span');
  btns.style.cssText = 'display:flex;gap:6px;margin-bottom:12px';
  var logBtn = document.createElement('button');
  logBtn.textContent = _skFormOpen ? '− Log skip' : '+ Log skip';
  logBtn.style.cssText = 'padding:6px 14px;font-size:11px;background:transparent;color:#ff7a3c;border:1px solid rgba(255,122,60,0.45);border-radius:4px;cursor:pointer;letter-spacing:0.5px';
  logBtn.onclick = function() { _skFormOpen = !_skFormOpen; _skRender(); };
  btns.appendChild(logBtn);
  btns.appendChild(refreshBtn);
  section.appendChild(bar);
  section.appendChild(btns);

  if (_skFormOpen) section.appendChild(_skLogForm(_skData.students || []));

  var gap = document.createElement('div');
  gap.style.height = '6px';
  section.appendChild(gap);

  if (!all.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'None';
    section.appendChild(empty);
    return;
  }

  // Every student: most Student skips first, ties by total skips (S+T+V),
  // then alphabetical only as a last resort.
  all.slice().sort(function(a, b) {
    return (b.totalStudent - a.totalStudent) || (b.total - a.total) || a.name.localeCompare(b.name);
  }).forEach(function(s) {
    section.appendChild(_skStudentCard(s));
  });
}

// Manual skip form: student · date · Student/Teacher · note → logSkipManual.
function _skLogForm(students) {
  var box = document.createElement('div');
  box.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:12px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center';

  var field = 'padding:6px 8px;font-size:12px;background:transparent;color:inherit;border:1px solid var(--border);border-radius:4px';

  // Custom dropdown (not a native <select>, so it matches the portal instead of
  // the OS menu). sel.value holds the picked name, same as a select would.
  var sel = document.createElement('div');
  sel.value = '';
  sel.style.cssText = 'position:relative;flex:1 1 160px;min-width:0';
  var selBtn = document.createElement('button');
  selBtn.type = 'button';
  selBtn.style.cssText = field + ";width:100%;cursor:pointer;" +
                         'display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left';
  var selList = document.createElement('div');
  selList.hidden = true;
  selList.style.cssText = 'position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:20;max-height:260px;overflow-y:auto;' +
                          'background:#161616;border:1px solid var(--border);border-radius:6px;padding:4px 0;box-shadow:0 8px 24px rgba(0,0,0,0.5);' +
                          'scrollbar-width:thin;scrollbar-color:#333 transparent';
  function paintSel() {
    // Gray placeholder like the unselected Teacher/Vacation buttons; picked name a bit brighter.
    selBtn.style.color = sel.value ? 'rgba(255,255,255,0.62)' : 'var(--muted)';
    selBtn.innerHTML = "<span style='overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>" + _skEsc(sel.value || 'Pick student…') + "</span>" +
                       "<span style='color:var(--muted);font-size:9px;flex:0 0 auto'>▾</span>";
    selList.innerHTML = '';
    students.forEach(function(s) {
      var on = s.name === sel.value;
      // Buttons (not divs) so they get the same default font as Teacher/Vacation.
      var o = document.createElement('button');
      o.type = 'button';
      o.textContent = s.name;
      o.style.cssText = "display:block;width:100%;text-align:left;background:transparent;border:none;padding:7px 12px;font-size:12px;cursor:pointer;color:" +
                        (on ? '#ff7a3c' : 'rgba(255,255,255,0.62)');
      o.onmouseenter = function() { o.style.background = 'rgba(255,255,255,0.05)'; };
      o.onmouseleave = function() { o.style.background = 'transparent'; };
      o.onclick = function() { sel.value = s.name; selList.hidden = true; paintSel(); };
      selList.appendChild(o);
    });
  }
  selBtn.onclick = function(e) { e.stopPropagation(); selList.hidden = !selList.hidden; };
  document.addEventListener('click', function closeSel(e) {
    if (!document.body.contains(sel)) { document.removeEventListener('click', closeSel); return; }
    if (!sel.contains(e.target)) selList.hidden = true;
  });
  paintSel();
  sel.appendChild(selBtn);
  sel.appendChild(selList);

  // Day stepper, the same control as the Trial tab: quiet arrows to the left,
  // the day itself is what you click, then Up/Down. There is no second field
  // here, so nothing walks sideways - see .dt-row in styles.css.
  var day = new Date(); day.setHours(12, 0, 0, 0);
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var dt = document.createElement('span');
  dt.className = 'dt-row';
  dt.style.cssText = 'flex:0 0 auto';
  var seg = document.createElement('span');
  seg.className = 'dt-seg';
  var stack = document.createElement('span');
  stack.className = 'dt-stack';
  var up = document.createElement('button'), down = document.createElement('button');
  var dLabel = document.createElement('button');
  up.className = down.className = 'dt-arrow';
  up.tabIndex = down.tabIndex = -1;
  up.innerHTML = dtArrow(1); down.innerHTML = dtArrow(-1);
  dLabel.className = 'dt-val';
  dLabel.style.cssText = 'min-width:78px';
  function paintDay() { dLabel.textContent = DAYS[day.getDay()] + ', ' + MONTHS[day.getMonth()] + ' ' + day.getDate(); }
  function shiftDay(n) { day.setDate(day.getDate() + n); paintDay(); }
  up.onclick   = function() { shiftDay(1); };
  down.onclick = function() { shiftDay(-1); };
  dLabel.onkeydown = function(e) {
    if (e.key === 'ArrowUp')   { e.preventDefault(); shiftDay(1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); shiftDay(-1); }
  };
  paintDay();
  stack.appendChild(up); stack.appendChild(down);
  seg.appendChild(stack); seg.appendChild(dLabel);
  dt.appendChild(seg);
  function dayValue() {
    return day.getFullYear() + '-' + ('0' + (day.getMonth() + 1)).slice(-2) + '-' + ('0' + day.getDate()).slice(-2);
  }

  var who = 'Student';
  var whoWrap = document.createElement('span');
  whoWrap.style.cssText = 'display:flex;gap:4px;flex:0 0 auto';
  ['Student', 'Teacher', 'Vacation'].forEach(function(w) {
    var b = document.createElement('button');
    b.textContent = w;
    b.dataset.who = w;
    whoWrap.appendChild(b);
  });
  function paintWho() {
    Array.prototype.forEach.call(whoWrap.children, function(b) {
      var c = { Student: '#ff7a3c', Teacher: '#ffb400', Vacation: '#4aa3ff' }[b.dataset.who];
      var on = b.dataset.who === who;
      b.style.cssText = 'padding:6px 12px;font-size:12px;border-radius:4px;cursor:pointer;border:1px solid ' +
        (on ? _skFade(c, 0.6) + ';color:' + c + ';background:' + _skFade(c) : 'var(--border);color:var(--muted);background:transparent');
    });
  }
  whoWrap.onclick = function(e) { if (e.target.dataset.who) { who = e.target.dataset.who; paintWho(); } };
  paintWho();

  var note = document.createElement('input');
  note.type = 'text';
  note.placeholder = 'Note (optional)';
  note.style.cssText = field + ';flex:1 1 160px;min-width:0';

  var save = document.createElement('button');
  save.textContent = 'Save';
  save.style.cssText = 'padding:6px 16px;font-size:12px;font-weight:600;background:#ff7a3c;color:#000;border:none;border-radius:4px;cursor:pointer;flex:0 0 auto';

  var msg = document.createElement('div');
  msg.style.cssText = 'flex:1 1 100%;font-size:11px;color:var(--muted)';
  msg.hidden = true; // only shown for an error, so no empty gap under the form

  save.onclick = function() {
    if (!sel.value) { msg.hidden = false; msg.style.color = '#ff5a5a'; msg.textContent = 'Pick a student.'; return; }
    save.disabled = true; save.textContent = 'Saving…';
    var q = '?action=logSkipManual&name=' + encodeURIComponent(sel.value) + '&date=' + encodeURIComponent(dayValue()) +
            '&who=' + encodeURIComponent(who) + '&note=' + encodeURIComponent(note.value.trim());
    fetch(getScriptUrl() + q)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!d.success) {
          save.disabled = false; save.textContent = 'Save';
          msg.hidden = false; msg.style.color = '#ff5a5a'; msg.textContent = d.message || 'Failed';
          return;
        }
        _skFormOpen = false;
        initSkipsTab();
      })
      .catch(function() {
        save.disabled = false; save.textContent = 'Save';
        msg.hidden = false; msg.style.color = '#ff5a5a'; msg.textContent = 'Connection failed';
      });
  };

  box.appendChild(sel); box.appendChild(dt); box.appendChild(whoWrap);
  box.appendChild(note); box.appendChild(save); box.appendChild(msg);
  return box;
}

function _skStudentCard(s) {
  var card = document.createElement('div');
  card.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);margin-bottom:8px;overflow:hidden';

  var hasSkips = s.total > 0;

  var hdr = document.createElement('div');
  hdr.style.cssText = 'padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px' +
                      (hasSkips ? ';cursor:pointer' : '');
  hdr.innerHTML =
    "<span style='font-weight:600;font-size:11px;color:rgba(255,255,255,0.62);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>" +
      "<span class='sk-caret' style='color:var(--muted);font-size:10px;margin-right:6px;display:inline-block'>▸</span>" +
      _skEsc(s.name) +
    "</span>" +
    "<span style='display:flex;align-items:center;gap:5px;flex:0 0 auto'>" +
      _skChip(s.totalStudent,  '#ff7a3c', 'Skips they cancelled.') +
      _skChip(s.totalTeacher,  '#ffb400', 'Skips you cancelled.') +
      _skChip(s.totalVacation, '#4aa3ff', 'Skips from your travel.') +
    "</span>";
  card.appendChild(hdr);

  if (!hasSkips) return card;

  var body = document.createElement('div');
  body.style.cssText = 'display:none;border-top:1px solid var(--border)';
  (s.skips || []).forEach(function(k) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:8px 12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between;align-items:baseline;gap:10px';
    row.innerHTML =
      "<div style='min-width:0'>" +
        "<span style='font-size:11px;font-weight:600;color:rgba(255,255,255,0.62)'>" + _skEsc(k.date) + "</span>" +
        (k.day ? "<span style='font-size:10px;color:var(--muted);margin-left:6px'>" + _skEsc(k.day) + "</span>" : "") +
        (k.note ? "<div style='font-size:10px;color:var(--muted);margin-top:2px;word-break:break-word'>" + _skEsc(k.note) + "</div>" : "") +
      "</div>" +
      "<span style='display:flex;align-items:center;gap:8px;flex:0 0 auto'>" +
        _skWhoBadge(k.who) +
        "<button class='sk-del' data-tip='Asks first.\nDeletes this skip.' style='background:transparent;border:none;color:var(--muted);font-size:14px;line-height:1;cursor:pointer;padding:2px 4px'>×</button>" +
      "</span>";
    row.querySelector('.sk-del').onclick = function(e) {
      e.stopPropagation();
      var btn = e.currentTarget;
      // Every delete in the portal asks first; this one used to go at once.
      rpmConfirm({
        title: 'Delete this skip?',
        confirmLabel: 'Delete',
        danger: true
      }).then(function (ok) { if (ok) go(); });
      function go() {
      btn.disabled = true; btn.textContent = '…';
      fetch(getScriptUrl() + '?action=deleteSkipLog&row=' + encodeURIComponent(k.row) +
            '&name=' + encodeURIComponent(s.name) + '&date=' + encodeURIComponent(k.date))
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (!d.success) {
            rpmAlert({ title: 'Delete failed', message: d.message || 'The portal did not delete that skip.' });
            btn.disabled = false; btn.textContent = '×'; return;
          }
          initSkipsTab();
        })
        .catch(function() {
          rpmAlert({ title: 'Connection failed', message: 'Could not reach the portal. Check your connection and try again.' });
          btn.disabled = false; btn.textContent = '×';
        });
      }
    };
    body.appendChild(row);
  });
  card.appendChild(body);

  hdr.onclick = function() {
    var open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    var caret = hdr.querySelector('.sk-caret');
    if (caret) caret.textContent = open ? '▸' : '▾';
  };

  return card;
}

// A count chip. Zero counts stay in place but dimmed, so the three columns
// line up down the list instead of jumping around.
function _skChip(n, color, title) {
  var on = Number(n) > 0;
  return "<span data-tip='" + _skEsc(title) + "' style='min-width:18px;text-align:center;font-size:9px;font-weight:600;padding:2px 5px;border-radius:3px;" +
         (on ? "color:" + color + ";background:" + _skFade(color) + ";border:1px solid " + _skFade(color, 0.45)
             : "color:var(--border);background:transparent;border:1px solid transparent") +
         "'>" + (n || 0) + "</span>";
}

function _skWhoBadge(who) {
  var map = {
    'Student':  '#ff7a3c',
    'Teacher':  '#ffb400',
    'Vacation': '#4aa3ff'
  };
  var c = map[who] || 'var(--muted)';
  return "<span style='flex:0 0 auto;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:" + c +
         ";border:1px solid " + _skFade(c, 0.4) + ";background:" + _skFade(c) + ";border-radius:3px;padding:2px 6px'>" +
         _skEsc(who) + "</span>";
}

// Hex → rgba at low alpha, for chip backgrounds. Non-hex passes through.
function _skFade(hex, a) {
  a = a || 0.14;
  if (String(hex).charAt(0) !== '#') return 'transparent';
  var r = parseInt(hex.substr(1, 2), 16),
      g = parseInt(hex.substr(3, 2), 16),
      b = parseInt(hex.substr(5, 2), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function _skPlural(n, word) { return n + ' ' + word + (Number(n) === 1 ? '' : 's'); }

function _skEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
