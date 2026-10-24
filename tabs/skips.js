// ─── TABS / SKIPS.JS ────────────────────────────────────────────────────────
// Who's skipping, this year. View over Skip Logs (the source of truth) —
// skips are normally LOGGED from the Home tab: tap a red lesson day → Skip →
// Student/Teacher. Writes here touch Skip Logs only (no calendar, no email):
// "Log skip" adds a row, × on an expanded skip deletes that row.
//
// Each student row shows three counts: Student (they cancelled), Teacher (you
// cancelled), Vacation (travel blocks; per-student only, not in the top totals).
// Every student is listed, sorted by Student count. Tap a row to expand the
// individual skips with date + note.

var _skData = null;      // last payload, so expand/collapse needs no refetch
var _skFormOpen = false; // "Log skip" form visible

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

  // ── Header: Total skips with the actions on its right, the counts under it; then the
  //    form (if open), a divider, and the student list ──
  var bar = document.createElement('div');
  bar.innerHTML =
    // Financial 2's Average expenses look (user 2026-10-22; was an amber box).
    "<div class='f2-icon sk-icon' style='margin-bottom:40px'>" + SKIPS_ICON + "</div>" +   // calendar + person icon under the title (user 2026-10-22)
    // One line (user 2026-10-22): Total skips, the counts, Since Jun 2026,
    // all in Financial 2's number font.
    // No line above it now; right-aligned, sitting on the line just over the cards, like the Dashboard's Load line (user 2026-10-23).
    "<div class='f2-cur' style='margin-bottom:8px;font-size:12px;text-align:right'>Total skips · " +   // smaller than Financial 2's 15px (user 2026-10-23)
      "<span class='f2-hi sk-hi'>" + (totals.student || 0) + " student</span> · " +
      "<span class='f2-hi sk-hi'>" + (totals.teacher || 0) + " teacher</span> · " +
      "Since Jun 2026</div>" +
    "<div style='border-top:1px solid var(--border);margin-bottom:12px'></div>";   // the line under Total skips, the cards close under it (user 2026-10-23; was 24px)
  var btns = document.createElement('span');
  btns.style.cssText = 'display:flex;gap:6px';
  var logBtn = document.createElement('button');
  // The portal's plain button, no + (user 2026-10-22).
  logBtn.className = 'link-btn';
  logBtn.textContent = '＋ Log skip';   // plus sign (user 2026-10-23)
  logBtn.onclick = function() { _skFormOpen = !_skFormOpen; _skRender(); };
  btns.appendChild(logBtn);
  // Log skip up on the SKIPS title line, right (user 2026-10-22); the old one
  // goes first, since every render makes a new button.
  var title = document.querySelector('#tab-skips > .ld-head');
  var oldBtns = title && title.querySelector('.sk-acts');
  if (oldBtns) oldBtns.remove();
  btns.className = 'sk-acts';
  if (title) title.appendChild(btns); else section.appendChild(btns);
  section.appendChild(bar);

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

  // Every student: most Student skips first, ties by Teacher skips, then
  // alphabetical. Vacation doesn't move anyone up (user 2026-10-22).
  all.slice().sort(function(a, b) {
    return (b.totalStudent - a.totalStudent) || (b.totalTeacher - a.totalTeacher) || a.name.localeCompare(b.name);
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

  // The portal's date picker (rpmDtpHtml), date only (2026-10-06).
  var today = new Date();
  var dt = document.createElement('span');
  dt.style.cssText = 'flex:0 0 auto';
  dt.innerHTML = rpmDtpHtml('skDay', { date: rpmDtpYmd(today), noTime: true });
  function dayValue() { return rpmDtpGet('skDay').date; }

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
    save.disabled = true; save.textContent = 'Saving…'; rpmBusy(box, save, true);
    var q = '?action=logSkipManual&name=' + encodeURIComponent(sel.value) + '&date=' + encodeURIComponent(dayValue()) +
            '&who=' + encodeURIComponent(who) + '&note=' + encodeURIComponent(note.value.trim());
    fetch(getScriptUrl() + q)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!d.success) {
          rpmBusy(box, save, false); save.disabled = false; save.textContent = 'Save';
          msg.hidden = false; msg.style.color = '#ff5a5a'; msg.textContent = d.message || 'Failed';
          return;
        }
        _skFormOpen = false;
        initSkipsTab();
      })
      .catch(function() {
        rpmBusy(box, save, false); save.disabled = false; save.textContent = 'Save';
        msg.hidden = false; msg.style.color = '#ff5a5a'; msg.textContent = 'Connection failed';
      });
  };

  box.appendChild(sel); box.appendChild(dt); box.appendChild(whoWrap);
  box.appendChild(note); box.appendChild(save); box.appendChild(msg);
  return box;
}

// Availability's card look (2026-10-22): name left, the counts and the
// arrow right; a card opens in place, one open at a time.
function _skStudentCard(s) {
  var card = document.createElement('div');
  card.className = 'en-card sk-card';

  // Every card opens, so a student with no skips still shows Density (user 2026-10-24).
  var hdr = document.createElement('div');
  hdr.className = 'en-card-head';
  hdr.innerHTML =
    "<span class='en-card-n'>" + _skEsc(s.name) + "</span>" +
    "<span class='en-card-r'>" +
      "<span class='sk-counts" + (s.totalStudent || s.totalTeacher ? "" : " av-never") + "'>" + _skCounts(s) + "</span>" +
      "<span class='en-card-a sk-caret'>▾</span>" +
    "</span>";
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'en-card-body';
  body.style.display = 'none';
  // One group per who (Student, Teacher, Vacation), newest first. A note the
  // row above already showed (the same trip) is not repeated.
  var groups = {};
  (s.skips || []).forEach(function(k) { (groups[k.who] = groups[k.who] || []).push(k); });
  // Density first, above the skip lists (user 2026-10-24). Terminate's number,
  // from its read-only preview (getEndingPreview), fetched the first time the
  // card opens.
  var dens = document.createElement('div');
  dens.className = 'sk-group';
  dens.innerHTML = "<div class='sk-group-h sk-hi'>Density</div>";
  body.appendChild(dens);
  var order = ['Student', 'Teacher', 'Vacation'];
  Object.keys(groups).forEach(function(w) { if (order.indexOf(w) < 0) order.push(w); });
  order.forEach(function(w) {
    var list = groups[w];
    if (!list) return;
    list.sort(function(x, y) { return (Date.parse(y.date) || 0) - (Date.parse(x.date) || 0); });
    var grp = document.createElement('div');
    grp.className = 'sk-group';
    // Every group heading amber, the totals' colour (user 2026-10-22).
    // Count first: "1 skip · Student", "5 skips · Vacation" (user 2026-10-23).
    grp.innerHTML = "<div class='sk-group-h sk-hi'>" + list.length + (list.length === 1 ? " skip" : " skips") + " · " + _skEsc(w) + "</div>";
    // Vacation (my trips, never against them) folds away behind Show (user 2026-10-24).
    var rows = grp;
    if (w === 'Vacation') {
      rows = document.createElement('div');
      rows.style.display = 'none';
      var more = document.createElement('button');
      more.className = 'link-btn sk-more';   // the portal's plain button, like Log skip (user 2026-10-24)
      more.textContent = 'Show';
      more.onclick = function(e) {
        e.stopPropagation();
        var open = rows.style.display === 'none';
        rows.style.display = open ? '' : 'none';
        more.textContent = open ? 'Hide' : 'Show';
      };
      grp.firstChild.appendChild(more);
      grp.appendChild(rows);
      // Inside, one block per trip (its "Travel <from> → <to>" note), newest
      // trip first; the trip is the block's heading, so rows carry no note.
      var trips = [], byTrip = {};
      list.forEach(function(k) {
        var t = String(k.note || '');
        if (!byTrip[t]) { byTrip[t] = []; trips.push(t); }
        byTrip[t].push(k);
      });
      trips.forEach(function(t) {
        var h = document.createElement('div');
        h.className = 'sk-trip-h';
        h.textContent = _skTripLabel(t) + ' · ' + byTrip[t].length + (byTrip[t].length === 1 ? ' lesson' : ' lessons');
        rows.appendChild(h);
        var box = document.createElement('div');
        byTrip[t].forEach(function(k) { box.appendChild(_skRow(s, k, '')); });
        rows.appendChild(box);
      });
      body.appendChild(grp);
      return;
    }
    var lastNote = null;
    list.forEach(function(k) {
      var note = k.note && k.note !== lastNote ? toSentenceCase(String(k.note)) : '';
      lastNote = k.note;
      rows.appendChild(_skRow(s, k, note));
    });
    body.appendChild(grp);
  });
  card.appendChild(body);

  card._skToggle = function(open) {
    if (open && !dens._loaded) { dens._loaded = true; _skLoadDensity(s.name, dens); }
    body.style.display = open ? 'block' : 'none';
    card.classList.toggle('open', open);
    hdr.querySelector('.sk-caret').textContent = open ? '▴' : '▾';
    // Open card: the counts go, the group headings already show them (user 2026-10-23).
    hdr.querySelector('.sk-counts').style.visibility = open ? 'hidden' : '';
  };
  hdr.onclick = function() {
    var open = body.style.display === 'none';
    // Opening one closes whichever other card is open.
    if (open) document.querySelectorAll('#skipsBody .sk-card.open').forEach(function(c) {
      if (c !== card && c._skToggle) c._skToggle(false);
    });
    card._skToggle(open);
  };

  return card;
}


// "Travel 2026-07-12 → 2026-08-17" → "Trip Jul 12 → Aug 17, 2026". Any other
// note shows as it is; none → "Trip".
function _skTripLabel(note) {
  var m = String(note).match(/(\d{4})-(\d{2})-(\d{2})\s*→\s*(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return note ? toSentenceCase(note) : 'Trip';
  var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var a = mo[+m[2] - 1] + ' ' + (+m[3]) + (m[1] !== m[4] ? ', ' + m[1] : '');
  return 'Trip ' + a + ' → ' + mo[+m[5] - 1] + ' ' + (+m[6]) + ', ' + m[4];
}

// "92%  11 of 12 lessons  since Jul 8, 2026": lessons had ÷ what their slot
// should have given, teacher and vacation skips excused (RPM_Ending _enDensity).
function _skLoadDensity(name, grp) {
  var row = document.createElement('div');
  row.className = 'sk-row';
  row.innerHTML = "<span class='rpm-loading is-inline'>Gathering data</span>";
  grp.appendChild(row);
  fetch(getScriptUrl() + '?action=getEndingPreview&name=' + encodeURIComponent(name))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var dn = d && d.success && d.snapshot && d.snapshot.density;
      row.innerHTML = dn
        ? "<span class='sk-date sk-hi'>" + dn.pct + "%</span>" +
          "<span class='sk-when'>" + dn.had + " of " + dn.owed + " lessons</span>" +
          "<span class='sk-note'>since Jul 8, 2026</span>"
        : "<span class='sk-note'>" + (d && d.success ? 'Nothing to measure yet' : 'Could not load') + "</span>";
    })
    .catch(function() { row.innerHTML = "<span class='sk-note'>Could not load</span>"; });
}

// Head counts as plain text in Travel Plan's "Skipping 5 lessons" font (user 2026-10-22): "5 student · 1 teacher".
function _skCounts(s) {
  var parts = [];
  if (s.totalStudent)  parts.push(s.totalStudent + ' student');
  if (s.totalTeacher)  parts.push(s.totalTeacher + ' teacher');
  // Vacation skips only show inside the card (user 2026-10-22: least important).
  // No student/teacher skips: just a dash (user 2026-10-22). Vacation-only
  // cards still open.
  return parts.length ? parts.join(' · ') : '—';
}

// One skip: date, day + time, note, and × (shown on hover) to delete it.
function _skRow(s, k, note) {
  var year = String(new Date().getFullYear());
  var date = String(k.date || '').replace(new RegExp('\\s' + year + '$'), '');
  var row = document.createElement('div');
  row.className = 'sk-row';
  row.innerHTML =
    "<span class='sk-date'>" + _skEsc(date) + "</span>" +
    "<span class='sk-when'>" + _skEsc(k.day || '') + "</span>" +
    "<span class='sk-note'>" + _skEsc(note) + "</span>" +
    "<button class='sk-del' data-tip='Asks first.\nDeletes this skip.'>×</button>";
  row.querySelector('.sk-del').onclick = function(e) {
    e.stopPropagation();
    var btn = e.currentTarget;
    // Every delete in the portal asks first; this one used to go at once.
    rpmConfirm({
      title: 'Delete this skip?',
      confirmLabel: 'Delete',
      icon: TRASH_ICON,
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
  return row;
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
