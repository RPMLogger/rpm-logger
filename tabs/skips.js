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
var _skOpenName = null;   // the open card's name, kept across re-renders
var _skFormOpen = false; // the name whose card shows the Log form (user 2026-11-24: a Log button on every card), or false
var _skDensity = null;   // name lower → { pct, had, owed } | null, from getDensityAll (RPM_Density.js)
// Four sorts (user 2026-11-24), Reviews' 4-stop switch: A–Z, Density (lowest first),
// Skips, Reschedules (most in the last 3 months first, like the pills).
// Three letters each, all A–Z's length (user 2026-11-24); the full name on hover (SK_SORT_TIPS).
var SK_SORTS = [['alpha', 'A–Z'], ['density', 'DEN'], ['skips', 'SKP'], ['resched', 'RES']];
var SK_SORT_TIPS = ['Sort by name.', 'Sort by Density.\nLowest first.', 'Sort by skips.\nMost in the last 3 months first.', 'Sort by reschedules.\nMost in the last 3 months first.'];
function _skSortKey() { try { return localStorage.getItem('skSort') || 'skips'; } catch (e) { return 'skips'; } }
function _skSetSort(k) { try { localStorage.setItem('skSort', k); } catch (e) {} _skRender(); }

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
      _skDensity = null;
      _skRender();
      _skLoadDensity();
    })
    .catch(function() { section.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

function _skRender() {
  var section = document.getElementById('skipsBody');
  if (!section || !_skData) return;
  section.innerHTML = '';

  var all     = _skData.students || [];
  var year    = _skData.year || '';

  // ── Header: Total skips with the actions on its right, the counts under it; then the
  //    form (if open), a divider, and the student list ──
  var bar = document.createElement('div');
  bar.style.position = 'relative';   // the sort switch sits in its top-right corner (user 2026-11-24)
  bar.innerHTML =
    // Financial 2's Average expenses look (user 2026-10-22; was an amber box).
    "<div class='f2-icon sk-icon' style='margin-bottom:40px'>" + SKIPS_ICON + "</div>" +   // calendar + person icon under the title (user 2026-10-22)
    // Total skips / Reschedules line deleted (user 2026-11-24: all-time totals don't mean anything).
    // How-to as numbered steps, Financial's Expenses look (user 2026-11-24).
    "<div class='tv-sec-note tv-steps f2-howto sk-howto'><span><i>1.</i>Open a card, press Log to add a skip</span>" +
      "<span><i>2.</i>Open a card, hover a row, then × to delete it</span></div>" +
    rpmStopSwitch(SK_SORTS, _skSortKey(), '_skSetSort', 'sk-sorts ms-flat') +
    "";   // the divider above the cards removed (user 2026-11-24)
  var btns = document.createElement('span');
  btns.style.cssText = 'display:flex;gap:6px';
  var logBtn = document.createElement('button');
  // The portal's plain button, no + (user 2026-10-22).
  logBtn.className = 'link-btn';
  logBtn.textContent = '＋ Log manual skip';   // plus sign (user 2026-10-23); "manual" added (user 2026-11-24)
  logBtn.onclick = function() { _skFormOpen = !_skFormOpen; _skRender(); };
  // No page-level Log button now: every card has its own ＋ Log (user 2026-11-24).
  // Log skip up on the SKIPS title line, right (user 2026-10-22); the old one
  // goes first, since every render makes a new button.
  var title = document.querySelector('#tab-skips > .ld-head');
  var oldBtns = title && title.querySelector('.sk-acts');
  if (oldBtns) oldBtns.remove();
  btns.className = 'sk-acts';
  if (title) title.appendChild(btns); else section.appendChild(btns);
  section.appendChild(bar);
  // The tip on the word, not the button: the portal's tooltip uses ::before, which is the button's bulb.
  bar.querySelectorAll('.sk-sorts .slide-lbl').forEach(function(l, i) { l.innerHTML = "<span data-tip='" + SK_SORT_TIPS[i].replace(/'/g, '&#39;') + "'>" + l.innerHTML + "</span>"; });


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

  // The picked sort; ties alphabetical. Density lowest first (the ones skipping most);
  // a name with no Density yet goes last.
  var key = _skSortKey();
  var dn = function(s) { var d = _skDensity && _skDensity[String(s.name).toLowerCase()]; return d ? d.pct : 999; };
  all.slice().sort(function(a, b) {
    var c = 0;
    if (key === 'density') c = dn(a) - dn(b);
    else if (key === 'skips') c = _skRecent(b).skips - _skRecent(a).skips;
    else if (key === 'resched') c = _skRecent(b).resched - _skRecent(a).resched;
    return c || a.name.localeCompare(b.name);
  }).forEach(function(s) {
    section.appendChild(_skStudentCard(s));
  });
}

// ＋ Log on an open card (user 2026-11-24): a small window with the log form, the student already picked.
// Save logs it, refreshes the cards behind and closes the window (the card stays open, so the new date shows); ✕ closes without saving.
function _skLogWin(name) {
  var w = _stWin('skLogWin', _skEsc(name), 'Log skip', typeof CALENDAR_ICON === 'string' ? CALENDAR_ICON : '', "<div id='skLogWinBody'></div>");
  var f = _skLogForm(_skData.students || [], name, function() {
    // Save closes the window; the card behind stays open and shows the new row (user 2026-11-24). ✕ closes without saving.
    _skRefresh(function() { w.remove(); });
  });
  f.classList.add('sk-win-form');
  // The window style (user 2026-11-24): a field-label header over each part, the note full width,
  // Save alone at the bottom after a gap, like the Skip / Reschedule windows.
  var lab = function(t) { var l = document.createElement('label'); l.className = 'field-label sk-win-lab'; l.innerHTML = t; return l; };
  var dt = f.querySelector('.dtp') && f.querySelector('.dtp').parentNode;
  var who = f.querySelector('.sk-who-row'), note = f.querySelector('input.rpm-field'), save = f.querySelector('.sk-save');
  var foot = document.createElement('div'); foot.className = 'll-acts st-foot sk-win-foot'; foot.appendChild(save);
  f.insertBefore(lab('Day'), dt);
  f.insertBefore(lab('Asked by'), who);
  f.insertBefore(lab("Note <span class='st-opt'>(optional)</span>"), note);   // Note (optional), like Skip / Reschedule's Reason (user 2026-11-24)
  note.placeholder = '';   // the header says it; no text in the box (user 2026-11-24)
  f.appendChild(foot);
  w.querySelector('#skLogWinBody').appendChild(f);
}
function _skRefresh(done) {
  fetch(getScriptUrl() + '?action=getSkipsStudents').then(function(r) { return r.json(); }).then(function(d) {
    if (d && d.success) { _skData = d; _skRender(); }
    if (done) done();
  }).catch(function() { if (done) done(); });
}

// Manual skip form: student · date · Student/Teacher · note → logSkipManual.
function _skLogForm(students, preset, onSaved) {
  var box = document.createElement('div');
  box.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:12px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center';

  var field = 'padding:6px 8px';   /* look comes from .rpm-field (Day 4 entry boxes, 2026-11-19) */

  // Custom dropdown (not a native <select>, so it matches the portal instead of
  // the OS menu). sel.value holds the picked name, same as a select would.
  var sel = document.createElement('div');
  sel.value = preset || '';
  sel.style.cssText = 'position:relative;flex:1 1 160px;min-width:0';
  var selBtn = document.createElement('button');
  selBtn.type = 'button';
  selBtn.className = 'rpm-field';
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
    selBtn.innerHTML = "<span style='overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>" + _skEsc(sel.value || '') + "</span>" +
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
  dt.innerHTML = rpmDtpHtml('skDay', { date: rpmDtpYmd(today), noTime: true, label: '' });   // no DAY label (user 2026-11-24)
  function dayValue() { return rpmDtpGet('skDay').date; }

  var who = 'Student';
  var whoWrap = document.createElement('span');
  whoWrap.className = 'st-reasons sk-who-row';   // its own line under the day, with a gap (user 2026-11-24)
  ['Student', 'Teacher', 'Vacation'].forEach(function(w) {
    var b = document.createElement('button');
    b.textContent = w;
    b.dataset.who = w;
    whoWrap.appendChild(b);
  });
  function paintWho() {
    // The portal's plain buttons, the picked one lit (user 2026-11-24; were orange / amber / blue fills).
    Array.prototype.forEach.call(whoWrap.children, function(b) {
      b.type = 'button';
      b.className = 'im-pill sk-who' + (b.dataset.who === who ? ' on' : '');   // the Log lesson keyword pills (user 2026-11-24)
    });
  }
  whoWrap.onclick = function(e) { if (e.target.dataset.who) { who = e.target.dataset.who; paintWho(); } };
  paintWho();

  var note = document.createElement('input');
  note.type = 'text';
  note.placeholder = 'Note (optional)';
  note.className = 'rpm-field';
  note.style.cssText = field + ';flex:1 1 160px;min-width:0';

  var save = document.createElement('button');
  save.textContent = 'Save';
  save.className = 'link-btn bright sk-save';   // the portal's main button (user 2026-11-24; was a solid orange block)

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
        if (onSaved) { onSaved(); return; }
        initSkipsTab();
      })
      .catch(function() {
        rpmBusy(box, save, false); save.disabled = false; save.textContent = 'Save';
        msg.hidden = false; msg.style.color = '#ff5a5a'; msg.textContent = 'Connection failed';
      });
  };

  if (preset) { box.style.margin = '0 0 14px'; } else box.appendChild(sel);   // from a card: the student is that card's
  box.appendChild(dt); box.appendChild(whoWrap);
  box.appendChild(note); box.appendChild(save); box.appendChild(msg);
  return box;
}

// Availability's card look (2026-10-22): name left, the counts and the
// arrow right; a card opens in place, one open at a time.
function _skStudentCard(s) {
  var card = document.createElement('div');
  card.className = 'en-card sk-card';

  var hasSkips = s.total > 0 || (s.resched || []).length > 0;   // reschedules open the card too (2026-10-31)

  var hdr = document.createElement('div');
  hdr.className = 'en-card-head' + (hasSkips ? '' : ' sk-none');
  // Density beside the name, a bare percentage (user 2026-10-24); it fills in
  // once getDensityAll answers.
  // The counts on their own line under the name (user, 2026-11-22; were beside it and cut long names' Density),
  // like the Dropbox cards' size line.
  hdr.innerHTML =
    "<span class='sk-n'>" +
      "<span class='en-card-n'>" + _skEsc(s.name) + _skDensitySpan(s.name) + "</span>" +
      "<span class='sk-counts" + (s.totalStudent || s.totalTeacher || (s.resched || []).length ? "" : " av-never") + "' data-tip='SKP = skips, RES = reschedules.\nLast 3 months.\nOpen the card for all.'>" + _skCounts(s) + "</span>" +
    "</span>" +
    "<span class='en-card-r'><span class='en-card-a sk-caret'>Show</span></span>";
  card.appendChild(hdr);
  // Every card opens now (user 2026-11-24): the ＋ Log button sits at the top of the open card.

  var body = document.createElement('div');
  body.className = 'en-card-body';
  body.style.display = 'none';
  // ＋ Log under the name, only while the card is open (user 2026-11-24).
  var logBtn = document.createElement('button');
  logBtn.type = 'button';
  logBtn.className = 'link-btn opens-window sk-log';
  logBtn.setAttribute('data-tip', 'Opens a window.\nLogs a skip for this student.');
  logBtn.setAttribute('data-tip-left', '');
  logBtn.textContent = '＋ Log';
  logBtn.onclick = function(e) { e.stopPropagation(); _skLogWin(s.name); };
  hdr.querySelector('.sk-n').appendChild(logBtn);   // under the name, where the pills are on a closed card (user 2026-11-24)
  // One group per who (Student, Teacher, Vacation), newest first. A note the
  // row above already showed (the same trip) is not repeated.
  var groups = {};
  (s.skips || []).forEach(function(k) { (groups[k.who] = groups[k.who] || []).push(k); });
  var order = ['Student', 'Teacher', 'Vacation'];
  Object.keys(groups).forEach(function(w) { if (order.indexOf(w) < 0) order.push(w); });
  // Always the same five sections, in this order (user 2026-11-24): Skips Student / Teacher / Vacation,
  // Reschedules Student / Teacher. An empty one shows its header with 0, dimmed.
  // Every section but Skips · Student opens folded behind Show / Hide (user 2026-11-24; was Vacation only).
  var fold = function(grp) {
    var rows = document.createElement('div');
    rows.className = 'sk-main-box';   // opens in the same box as Student skips (user 2026-11-24)
    rows.style.display = 'none';
    var more = document.createElement('button');
    more.className = 'link-btn sk-more';
    more.textContent = 'Show';
    more.onclick = function(e) {
      e.stopPropagation();
      var open = rows.style.display === 'none';
      rows.style.display = open ? '' : 'none';
      more.textContent = open ? 'Hide' : 'Show';
    };
    grp.firstChild.appendChild(more);
    grp.appendChild(rows);
    return rows;
  };
  var emptyGrp = function(t) {
    var g = document.createElement('div');
    g.className = 'sk-group sk-group-empty';
    g.innerHTML = "<div class='sk-group-h sk-hi'>" + t + "</div>";
    body.appendChild(g);
  };
  order.forEach(function(w) {
    var list = groups[w];
    if (!list) { emptyGrp(_skEsc(w) + " skips · <span class='sk-gn" + (w === 'Student' ? " sk-gn-on" : "") + "'>0</span>"); if (w === 'Student') body.lastChild.classList.add('sk-group-main'); return; }
    list.sort(function(x, y) { return (Date.parse(y.date) || 0) - (Date.parse(x.date) || 0); });
    var grp = document.createElement('div');
    grp.className = 'sk-group';
    // Every group heading amber, the totals' colour (user 2026-10-22).
    // Count first: "1 skip · Student", "5 skips · Vacation" (user 2026-10-23).
    grp.innerHTML = "<div class='sk-group-h sk-hi'>" + _skEsc(w) + " skips · <span class='sk-gn" + (w === 'Student' ? " sk-gn-on" : "") + "'>" + list.length + "</span></div>";   // "STUDENT SKIPS · 4", the portal's middle dot (user 2026-11-24)
    // Vacation (my trips, never against them) folds away behind Show (user 2026-10-24).
    if (w === 'Student') grp.classList.add('sk-group-main');   // its own bordered box (user 2026-11-24)
    var rows = w === 'Student' ? grp : fold(grp);
    if (w === 'Vacation') {
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
  // Reschedules after the skips (user, 2026-10-31; were only in the Students page's Data box):
  // "2 reschedules · Student", each row the lesson it moved and where to, with the reason.
  ['Student', 'Teacher'].forEach(function(w) {
    var list = (s.resched || []).filter(function(r) { return r.who === w; });
    if (!list.length) { emptyGrp(w + " reschedules · <span class='sk-gn" + (w === 'Student' ? " sk-gn-on" : "") + "'>0</span>"); return; }
    var grp = document.createElement('div');
    grp.className = 'sk-group';
    grp.innerHTML = "<div class='sk-group-h sk-hi'>" + w + " reschedules · <span class='sk-gn" + (w === 'Student' ? " sk-gn-on" : "") + "'>" + list.length + "</span></div>";
    var rrows = fold(grp);
    list.forEach(function(r) { rrows.appendChild(_skReschRow(s, r)); });
    body.appendChild(grp);
  });
  // Student skips in the Reviews Dashboard look (user 2026-11-24): the title above, the rows in their own box.
  var main = body.querySelector('.sk-group-main');
  if (main) {
    var box = document.createElement('div');
    box.className = 'sk-main-box';
    main.querySelectorAll(':scope > .sk-row').forEach(function(r) { box.appendChild(r); });
    if (box.children.length) main.appendChild(box);
  }
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'link-btn sk-close';
  closeBtn.textContent = 'Close';
  closeBtn.onclick = function(e) { e.stopPropagation(); card._skToggle(false); };
  body.appendChild(closeBtn);   // Close at the foot of an open card (user 2026-11-25)
  card.appendChild(body);

  card._skToggle = function(open) {
    if (open) _skOpenName = s.name; else if (_skOpenName === s.name) _skOpenName = null;
    body.style.display = open ? 'block' : 'none';
    card.classList.toggle('open', open);
    hdr.querySelector('.sk-caret').textContent = open ? 'Hide' : 'Show';
    // Open card: the counts go, the group headings already show them (user 2026-10-23).
    hdr.querySelector('.sk-counts').style.display = open ? 'none' : '';   // ＋ Log takes their place
  };
  hdr.onclick = function() {
    var open = body.style.display === 'none';
    // Opening one closes whichever other card is open.
    if (open) document.querySelectorAll('#skipsBody .sk-card.open').forEach(function(c) {
      if (c !== card && c._skToggle) c._skToggle(false);
    });
    card._skToggle(open);
  };

  if (_skOpenName === s.name) card._skToggle(true);   // stays open after a log (user 2026-11-24)
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

// Everyone's Density in one call (RPM_Density.js), then each name's % is
// filled in place. Kept across re-renders (Log skip, delete) until the tab reloads.
function _skLoadDensity() {
  fetch(getScriptUrl() + '?action=getDensityAll')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d || !d.success) return;
      _skDensity = d.density || {};
      if (_skSortKey() === 'density') { _skRender(); return; }   // the order needs it
      document.querySelectorAll('#skipsBody [data-sk-dn]').forEach(function(el) {
        el.outerHTML = _skDensitySpan(el.getAttribute('data-sk-dn'));
      });
    })
    .catch(function() {});
}

function _skDensitySpan(name) {
  var k = String(name).toLowerCase(), dn = _skDensity && _skDensity[k];
  return "<span class='sk-dn' data-sk-dn='" + _skEsc(k) + "'" +
    (dn ? " data-tip='" + dn.had + " of " + dn.owed + " lessons since " + (dn.from || 'Jul 8, 2026') + ".\nTeacher and vacation skips don&#39;t count against them.'>" + dn.pct + "%" : ">") +
    "</span>";
}

// The last 3 months, by lesson date, upcoming logged ones included (user 2026-11-24: a long
// count loses the sense; Density is the long view). Vacation skips don't count.
function _skRecent(s) {
  var from = new Date(); from.setHours(0, 0, 0, 0); from.setMonth(from.getMonth() - 3);
  var recent = function(d) { var t = Date.parse(d); return !isNaN(t) && t >= from.getTime(); };
  return {
    skips:   (s.skips || []).filter(function(k) { return k.who !== 'Vacation' && recent(k.date); }).length,
    resched: (s.resched || []).filter(function(r) { return recent(r.date); }).length
  };
}

// The student's two counts, each named, each its own pill (user 2026-11-24: "student/teacher"
// beside "reschedules" read as one kind). The Student/Teacher split stays inside the card.
// Last 3 months only (_skRecent); the open card still lists everything.
function _skCounts(s) {
  var r = _skRecent(s), parts = [];
  // Short, the sort buttons' letters (user 2026-11-24: "skips / reschedules" read weird): "5 SKP", "4 RES".
  if (r.skips) parts.push(r.skips + ' SKP');
  if (r.resched) parts.push(r.resched + ' RES');
  // Neither: just a dash (user 2026-10-22). Vacation-only cards still open.
  return parts.length ? parts.map(function(t) { return "<span class='sk-pill'>" + t + "</span>"; }).join('') : '—';
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
    "<span class='sk-note'>" + (note ? '· ' + _skEsc(note) : '') + "</span>" +   // a dot before the note, like the reschedule rows (user 2026-11-24)
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

// One reschedule (2026-10-31): the lesson's date, day + time, → where it went, the reason.
// × (shown on hover, like a skip's) deletes the row, for moves made by mistake (user, 2026-11-21).
function _skReschRow(s, r) {
  var year = String(new Date().getFullYear()), strip = new RegExp('\\s' + year + '$');
  var row = document.createElement('div');
  row.className = 'sk-row';
  row.innerHTML =
    "<span class='sk-date'>" + _skEsc(String(r.date || '').replace(strip, '')) + "</span>" +
    "<span class='sk-when'>" + _skEsc(r.day || '') + "</span>" +
    "<span class='sk-note'>→ " + _skEsc(String(r.toDate || '').replace(strip, '')) + (r.toDay ? ' · ' + _skEsc(r.toDay) : '') +
      (r.note ? ' · ' + _skEsc(toSentenceCase(String(r.note))) : '') + "</span>" +
    "<button class='sk-del' data-tip='Asks first.\nDeletes this reschedule.'>×</button>";
  row.querySelector('.sk-del').onclick = function(e) {
    e.stopPropagation();
    var btn = e.currentTarget;
    rpmConfirm({
      title: 'Delete this reschedule?',
      confirmLabel: 'Delete',
      icon: TRASH_ICON,
      danger: true
    }).then(function (ok) { if (ok) go(); });
    function go() {
      btn.disabled = true; btn.textContent = '…';
      fetch(getScriptUrl() + '?action=deleteReschedLog&row=' + encodeURIComponent(r.row) +
            '&name=' + encodeURIComponent(s.name) + '&date=' + encodeURIComponent(r.date))
        .then(function(x) { return x.json(); })
        .then(function(d) {
          if (!d.success) {
            rpmAlert({ title: 'Delete failed', message: d.message || 'The portal did not delete that reschedule.' });
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
