// ─── TABS / SCHEDNOTES.JS ───────────────────────────────────────────────────
// Notes (user, 2026-11-09, simplified 2026-11-10): anything to remember for later —
// "Ed moves to 7:30-ish in 3 weeks", "bring your capo". Read before deciding on
// next week's alerts. Ways in: ＋ Note on the student page, the Calendar's NOTES view.
// One list: the Calendar's NOTES view (rack button), Done / Not needed on each.
// A note may carry a week (its Monday); a weekly look can read it later.
// Backend: RPM_SchedNotes.js → Counter sheet, "Schedule Notes" tab.

var _snNotes = null;      // [{row, name, note, week, created, from, closed, how}]
var _snErr   = '';
var _snShowClosed = false;
var SN_WORDS = ['won\'t be here', 'will be on vacation', 'need to move'];   // starter words under the note rows (user, 2026-11-10)
var SN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function _snEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function _snPad(n) { return (n < 10 ? '0' : '') + n; }
function _snMonday(off) {
  var d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7 * (off || 0));
  return d;
}
function _snYmd(d) { return d.getFullYear() + '-' + _snPad(d.getMonth() + 1) + '-' + _snPad(d.getDate()); }
function _snParse(ymd) { var p = String(ymd).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
// "Next week · Nov 16"
// A rough week is stored "~2026-11-30" → "About in 3 weeks · Nov 30"
function _snWeekText(ymd) {
  if (!ymd) return 'No week';
  var rough = ymd.charAt(0) === '~', d = _snParse(_snWk(ymd)), n = Math.round((d - _snMonday(0)) / 604800000);
  var rel = n === 0 ? 'This week' : n === 1 ? 'Next week' : n > 1 ? 'In ' + n + ' weeks' : 'Past week';
  return (rough ? 'About ' + rel.toLowerCase() : rel) + ' · ' + SN_MONTHS[d.getMonth()] + ' ' + d.getDate();
}
function _snWk(w) { return String(w || '').replace(/^~/, ''); }

function _snLoad(cb) {
  var url = getScriptUrl();
  if (!url) { _snNotes = _snNotes || []; if (cb) cb(); return; }
  fetch(url + '?action=getSchedNotes')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.success) { _snNotes = d.notes || []; _snErr = ''; }
      else { _snNotes = _snNotes || []; _snErr = d.message || 'not read'; }
      if (cb) cb();
    })
    .catch(function (e) { _snNotes = _snNotes || []; _snErr = (e && e.message) || 'no answer from Google'; if (cb) cb(); });
}

// ── The note window (user, 2026-11-10): just a note. Anything: a schedule
// change, "bring your capo"… No organizing, no weeks to pick. With a student,
// their next 8 weeks show above the note, to look at only (so I understand what
// they're talking about). name given (student page) = locked; Calendar = pick or leave empty.
function _snNewWin(name, from) {
  _snInjectStyle();
  if (typeof _calLoadRoster === 'function') _calLoadRoster();
  var who = name
    ? "<span class='td-wk-name'>" + _snEsc(name) + "</span>"
    : "<input class='rpm-field sn-who' id='snWho' list='snRoster' autocomplete='off' placeholder='Student (optional)'>" +
      "<datalist id='snRoster'>" + (_imRoster || []).map(function (n) { return "<option value='" + _snEsc(n) + "'>"; }).join('') + "</datalist>";
  var win = _stWin('snWin', name ? _snEsc(name) : 'Notes', 'New note', '',
    "<div id='snGrid'></div>" +
    "<div class='sn-form'>" +
      (name ? "" : "<div class='sn-lbl'>Student</div>" + who) +
      "<div class='sn-lbl'>Note</div><textarea class='rpm-field sn-text' id='snText' rows='3' placeholder='Anything: a schedule change, bring your capo…'></textarea>" +
    "</div>" +
    "<div class='im-log-foot im-log-foot-all'><span id='snStatus' class='sn-status'></span>" +
      "<button type='button' class='link-btn amber' id='snSaveBtn' data-tip='Instant.\nAdds it to the Notes list.' data-tip-left>Save note</button></div>");
  win.querySelector('.st-win').classList.add('sn-win');
  win.dataset.from = from || '';
  win.dataset.name = name || '';
  win.querySelector('#snSaveBtn').onclick = function () { _snSave(win, this); };
  var wi = win.querySelector('#snWho');
  if (wi) wi.addEventListener('change', function () { _snGridLoad(win, wi.value.trim()); });
  _snGridLoad(win, name || '');
  setTimeout(function () { var t = win.querySelector(name ? '#snText' : '#snWho'); if (t) t.focus(); }, 30);
}

// The student's next 8 weeks, Change appointment's strips, view only. No student → nothing.
function _snGridLoad(win, name) {
  var box = win.querySelector('#snGrid');
  if (!name) { box.innerHTML = ''; box.className = ''; return; }
  box.className = 'sn-grid';
  var draw = function (byDate, student) {
    var today = _stToday(), monday = _stMondayOf(today);
    var strips = document.createElement('div');
    strips.className = 'im-rs-strips sn-strips';
    for (var k = 0; k < 8; k++) {
      var mon = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + k * 7);
      strips.appendChild(_stBuildWeekStrip(mon, byDate, today, student, { view: true }));
    }
    box.innerHTML = "<label class='field-label sn-weeks-l'>Next 8 weeks</label>";
    box.appendChild(strips);
  };
  draw({}, name);
  var url = getScriptUrl();
  if (!url) return;
  rpmBusy(box, null, true, 'Loading');
  fetch(url + '?action=getStudentLessons&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!document.body.contains(box)) return;
      rpmBusy(box, null, false);
      var byDate = {};
      if (d.success) (d.lessons || []).forEach(function (l) { byDate[l.date] = l; });
      draw(byDate, d.student || name);
    })
    .catch(function () { if (document.body.contains(box)) rpmBusy(box, null, false); });
}

function _snSave(win, btn) {
  var panel = win.querySelector('.st-win');
  var name = win.querySelector('#snWho') ? win.querySelector('#snWho').value.trim() : win.dataset.name;
  var note = win.querySelector('#snText').value.trim();
  if (!note) { rpmFail('snStatus', 'Write the note first.', 'left'); return; }
  var from = win.dataset.from || '';
  var url = getScriptUrl();
  var add = function (row) {
    if (!_snNotes) _snNotes = [];
    _snNotes.push({ row: row, name: name, note: note, week: '', picks: '', created: _snYmd(new Date()), from: from, closed: '', how: '' });
    win.remove();
    _snRefreshView();
  };
  if (!url) { add(-Date.now()); return; }
  rpmBusy(panel, btn, true, 'Saving');
  fetch(url + '?action=addSchedNote&name=' + encodeURIComponent(name) + '&note=' + encodeURIComponent(note) +
        '&week=&picks=&from=' + encodeURIComponent(from))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) throw new Error(d.message || 'not saved');
      add(d.row || -Date.now());
    })
    .catch(function (e) {
      rpmBusy(panel, btn, false);
      rpmFail('snStatus', 'Not saved: ' + (e && e.message && e.message !== 'Failed to fetch' ? e.message : 'no answer from Google.'), 'left');
    });
}

// "Mon Nov 23 · 2:30 PM, Week of Nov 30"
function _snPicksPretty(picks) {
  if (!picks) return '';
  var D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return String(picks).split(/\s*,\s*/).map(function (x) {
    var w = x.match(/^week (\d{4}-\d{2}-\d{2})$/);
    if (w) { var m = _snParse(w[1]); return 'Week of ' + SN_MONTHS[m.getMonth()] + ' ' + m.getDate(); }
    var l = x.match(/^(\d{4}-\d{2}-\d{2})\s*(.*)$/);
    if (l) { var d = _snParse(l[1]); return D[d.getDay()] + ' ' + SN_MONTHS[d.getMonth()] + ' ' + d.getDate() + (l[2] ? ' · ' + l[2] : ''); }
    return x;
  }).join(', ');
}

// ── Notes band on the Schedule window (user, 2026-11-10) ───────────────────
// Across the top of the Calendar's Schedule window (tabs/calendar.js
// _calSchedView): a box to write a new note. Entry only, no list (user, 2026-11-10).
// ＋ Note on the Lessons student page opens that window with the box ready.
function _snBandHtml(from) {
  return "<div class='sn-band' id='snBand' data-from='" + _snEsc(from || 'Calendar') + "'>" +
    // The Log window's rows (user, 2026-11-10): Enter or ＋ adds a row; the rows are the note's lines.
    "<div class='sn-band-new'><div class='sn-band-l'><div class='ll-wrap'><div class='ll-rows' id='snBandRows'><textarea rows='1' class='rpm-field ll-row active'></textarea></div></div>" +
    // Starter words under the rows, the Log lesson's look (user, 2026-11-10)
    "<div class='sn-band-foot'><div class='sn-words' onmousedown='event.preventDefault()' onclick='if(event.target.classList.contains(\"sn-word\"))_imPillPut(document.getElementById(\"snBandRows\"),event.target.textContent)'>" +
      SN_WORDS.map(function (t, i, a) { return "<span class='sn-word-grp'><button type='button' class='sn-word'>" + t + "</button>" + (i < a.length - 1 ? "<span class='sn-word-sep'>–</span>" : "") + "</span>"; }).join('') + "</div>" +
    "<button type='button' class='ll-add' data-tip='Instant.\nAdds a row. Enter does too.\nEach row is a line of the note.' onclick='llAddRow(document.getElementById(\"snBandRows\"))'>" + llAddInner() + "</button></div></div>" +
    "</div>" +
    "<div id='snBandStatus' class='sn-status'></div>" +
    // bottom bar: Show schedule left (Take note), Save note right (user, 2026-11-10)
    "<div class='sn-band-bar'><span class='sn-bar-l'></span><button type='button' class='link-btn amber' onclick='_snBandSave(this)' data-tip='Instant.\nAdds them to the Notes list.\n⌘ Enter does too.' data-tip-left>Save note</button></div></div>";
}
function _snBandInit(name) {
  _snInjectStyle();
  var el = document.getElementById('snBand');
  if (!el) return;
  el.dataset.name = name;
  // One plain background above the divider (user, 2026-11-10): the window's two-column
  // shading starts under the notes. --sv-top = the divider's height in the window.
  var win = el.closest('.st-win');
  var mark = function () {
    if (!win.isConnected) return;
    var t = el.getBoundingClientRect().bottom - win.getBoundingClientRect().top - win.clientTop + win.scrollTop;
    win.style.setProperty('--sv-top', Math.round(t) + 'px');
    var side = win.querySelector('.cal-sv-side');   // Take note: List view under the divider, never over the note
    if (side && win.classList.contains('sv-note')) side.style.top = el.offsetHeight + 'px';
  };
  if (window.ResizeObserver) new ResizeObserver(mark).observe(el);
  var rows = document.getElementById('snBandRows');
  llWire(rows, function (i) { llRows(rows).forEach(function (r, j) { r.classList.toggle('active', j === i); }); }, null,
    function () { _snBandSave(el.querySelector('.sn-band-bar > .link-btn')); });
  mark();
}
function _snBandRender() {}   // the band only writes notes now (user, 2026-11-10); kept so the old calls stay harmless
function _snBandSave(btn) {
  // Rows saved together are ONE note, one line per row (user, 2026-11-10); a line break between them.
  var el = document.getElementById('snBand'), rows = document.getElementById('snBandRows');
  var name = el.dataset.name || '', from = el.dataset.from || '';
  var note = llValues(rows).filter(Boolean).join('\n');
  if (!note) { rpmFail('snBandStatus', 'Write the note first.', 'left'); return; }
  var add = function (row) {
    if (!_snNotes) _snNotes = [];
    _snNotes.push({ row: row, name: name, note: note, week: '', picks: '', created: _snYmd(new Date()), from: from, closed: '', how: '' });
    llReset(rows);
    document.getElementById('snBandStatus').innerHTML = '';
    _snRefreshView();
  };
  var url = getScriptUrl();
  if (!url) { add(-Date.now()); return; }
  rpmBusy(el, btn, true, 'Saving');
  fetch(url + '?action=addSchedNote&name=' + encodeURIComponent(name) + '&note=' + encodeURIComponent(note) + '&week=&picks=&from=' + encodeURIComponent(from))
    .then(function (r) { return r.json(); })
    .then(function (d) { if (!d.success) throw new Error(d.message || 'not saved'); rpmBusy(el, btn, false); add(d.row || -Date.now()); })
    .catch(function (e) {
      rpmBusy(el, btn, false);
      rpmFail('snBandStatus', 'Not saved: ' + (e && e.message && e.message !== 'Failed to fetch' ? e.message : 'no answer from Google.'), 'left');
    });
}

// ── The NOTES view (Calendar, rack button NOTES) ────────────────────────────

function _snRefreshView() {
  var host = document.getElementById('calNotesHost');
  if (host && host.offsetParent !== null) _snRender(host);
  _snBandRender();
  _snTabRender();
}

function _snOpenView(host) {
  _snInjectStyle();
  if (_snNotes) _snRender(host);
  else host.innerHTML = "<div class='sn-wrap'><div class='empty-state rpm-loading'>Reading schedule notes</div></div>";
  _snLoad(function () { _snRender(host); });
}

function _snRender(host) {
  host = host || document.getElementById('calNotesHost');
  if (!host) return;
  var all = (_snNotes || []).slice();
  var open = all.filter(function (n) { return !n.closed; });
  var closed = all.filter(function (n) { return n.closed; });
  open.sort(function (a, b) { return b.row - a.row; });   // newest on top, no week groups (user, 2026-11-10: just notes)
  var html = "<div class='sn-wrap'><div class='sn-head'><span class='sn-title'>Notes</span><span class='sn-count'>" + open.length + " open</span>" +
    "<button class='link-btn red opens-window' onclick='_snNewWin(\"\",\"Calendar\")' data-tip='Opens a window.\nAnything to remember for later.' data-tip-left>＋ New note</button></div>";
  if (_snErr) html += "<div class='sn-err'>Couldn't read the list: " + _snEsc(_snErr) + "</div>";
  if (!open.length) html += "<div class='empty-state'>No open notes.</div>";
  open.forEach(function (n) { html += _snItem(n, false); });
  if (closed.length) {
    html += "<button class='link-btn sn-closed-btn' onclick='_snShowClosed=!_snShowClosed;_snRender()'>" + (_snShowClosed ? 'Hide' : 'Show') + " closed (" + closed.length + ")</button>";
    if (_snShowClosed) closed.slice().reverse().forEach(function (n) { html += _snItem(n, true); });
  }
  host.innerHTML = html + "</div>";
}

function _snItem(n, closed) {
  var meta = [n.from ? 'From ' + n.from : '', n.created ? 'added ' + n.created : ''].filter(Boolean).join(' · ');
  return "<div class='sn-item" + (closed ? " closed" : "") + "'>" +
    "<div class='sn-main'><span class='sn-name'>" + _snEsc(n.name || '—') + "</span><span class='sn-note'>" + _snEsc(n.note) + "</span>" +
      (n.picks ? "<span class='sn-picks'>" + _snEsc((String(n.week).charAt(0) === '~' ? 'About: ' : '') + _snPicksPretty(n.picks)) + "</span>" : "") +
      "<span class='sn-meta'>" + _snEsc(meta) + (closed ? ' · ' + _snEsc(n.how + ' ' + n.closed) : '') + "</span></div>" +
    (closed ? "" :
      "<div class='sn-acts'><button class='link-btn bright' onclick='_snCloseNote(" + n.row + ",\"Done\",this)' data-tip='Instant.\nIt was taken care of.' data-tip-left>Done</button>" +
      "<button class='link-btn' onclick='_snCloseNote(" + n.row + ",\"Not needed\",this)' data-tip='Instant.\nIt did not happen after all.' data-tip-left>Not needed</button></div>") +
  "</div>";
}

function _snCloseNote(row, how, btn) {
  var n = (_snNotes || []).filter(function (x) { return x.row === row; })[0];
  if (!n) return;
  var item = btn.closest('.sn-item');
  var url = getScriptUrl();
  var done = function () { n.closed = _snYmd(new Date()); n.how = how; _snRender(); _snBandRender(); };
  if (!url || row < 0) { done(); return; }
  rpmBusy(item, btn, true, false);
  fetch(url + '?action=closeSchedNote&row=' + row + '&how=' + encodeURIComponent(how) + '&note=' + encodeURIComponent(n.note))
    .then(function (r) { return r.json(); })
    .then(function (d) { if (!d.success) throw new Error(d.message || 'not saved'); done(); })
    .catch(function (e) {
      rpmBusy(item, btn, false);
      rpmToast('fail', 'Unsuccessful', 'Not saved: ' + ((e && e.message && e.message !== 'Failed to fetch') ? e.message : 'no answer from Google.'));
    });
}

function _snInjectStyle() {
  if (document.getElementById('snStyle')) return;
  var st = document.createElement('style');
  st.id = 'snStyle';
  st.textContent =
    ".sn-form{display:grid;grid-template-columns:90px minmax(0,1fr);gap:12px 14px;align-items:start;width:440px;max-width:100%;margin-bottom:18px}" +
    ".sn-lbl{color:var(--muted);font-size:13px;padding-top:6px}" +
    ".sn-text{width:100%;resize:vertical;min-height:70px;box-sizing:border-box}.sn-who{width:100%;box-sizing:border-box}" +
    ".sn-win{width:min(760px,calc(100vw - 40px))}.sn-win .sn-form{width:100%}" +
    ".sn-weeks-l{display:block;margin-top:6px}.sn-hint{color:var(--muted);font-size:12px;margin:4px 0 2px}" +
        ".sn-grid{margin-bottom:18px}.sn-strips button{cursor:default!important}" +
    ".sn-picks{color:var(--t-normal);font-size:12px}" +
    ".sn-status{margin-right:auto}" +
    ".sn-wrap{max-width:820px;margin:0 auto;padding:4px 0 40px}" +
    ".sn-head{display:flex;align-items:baseline;gap:14px;margin-bottom:18px}" +
    ".sn-title{font-size:18px;color:var(--t-normal,#ddd)}.sn-count{color:var(--muted);font-size:13px;margin-right:auto}" +
    ".sn-group{color:var(--muted);font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:22px 0 8px}" +
    ".sn-item{position:relative;display:flex;align-items:center;gap:16px;padding:12px 16px;margin-bottom:8px;background:var(--surface2,#161616);border:1px solid #2a2a2a;border-radius:6px}" +
    ".sn-item.closed{opacity:.55}" +
    ".sn-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}" +
    ".sn-name{font-weight:600}.sn-note{white-space:pre-wrap}.sn-meta{color:var(--muted);font-size:12px}" +
    ".sn-acts{display:flex;gap:12px;flex:none}" +
    ".sn-band{position:relative;z-index:2;grid-column:1/-1;margin:0;padding:4px 0 26px}" +
    ".sn-band::after{content:'';position:absolute;left:-24px;right:-24px;bottom:0;height:1px;background:color-mix(in srgb,#ffffff 11%,transparent)}" +   // a divider across the whole window under the notes, no box (user, 2026-11-10)
    ".st-win.cal-sv-win:has(.sn-band){background-image:linear-gradient(to bottom,#151515 var(--sv-top,0px),transparent var(--sv-top,0px)),linear-gradient(to right,transparent calc(100% - 250px),color-mix(in srgb,#ffffff 11%,transparent) calc(100% - 250px),color-mix(in srgb,#ffffff 11%,transparent) calc(100% - 249px),rgba(0,0,0,.22) calc(100% - 249px))}" +   // the columns' shading + line start under the notes
        ".st-win.cal-sv-win.sv-note>.settings-title{margin-right:0}" +   // Take note: ✕ at the top right, Show schedule left of it (user, 2026-11-10)
    ".st-win.cal-sv-win.sv-closed .cal-sv-main,.st-win.cal-sv-win.sv-closed .cal-sv-side{display:none}" +
    ".st-win.cal-sv-win.sv-closed{background-image:none!important}" +
    ".sn-band-bar{display:flex;justify-content:space-between;align-items:center;margin-top:22px}" +
    ".st-win.cal-sv-win.sv-closed .sn-band{padding-bottom:0}.st-win.cal-sv-win.sv-closed .sn-band::after{display:none}" +   // closed: no divider or strip under the note (user, 2026-11-10)   // closed: no column shading or line
        ".sn-band-new{display:flex;gap:14px;align-items:flex-end;margin-top:4px}.sn-band-l{flex:1;min-width:0}.sn-band-l .ll-row.rpm-field{padding-right:12px}.sn-band-l .ll-rows .ll-row.active{outline:none}.sn-band-foot{display:flex;align-items:flex-start;gap:12px}.sn-band-foot .ll-add{display:flex;margin-left:auto;margin-right:24px;color:#555}" +
    ".sn-words{display:flex;flex-wrap:wrap;row-gap:4px;align-items:baseline;margin-top:10px;flex:1;min-width:0}.sn-word-grp{display:inline-flex;align-items:center;white-space:nowrap}" +
    ".sn-word{border:none;background:none;padding:2px 0;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--t-faint);cursor:pointer}.sn-word:hover{color:var(--t-text)}" +
    ".sn-word-sep{font-family:'DM Mono',monospace;font-size:9px;color:color-mix(in srgb,var(--t-faint) 60%,transparent);margin:0 8px}" +
    ".sn-tab-name{text-transform:uppercase}#snotesContent .tdo-row+.tdo-row{margin-top:22px}" +
    ".sn-closed-btn{margin-top:20px}.sn-err{color:var(--muted);margin-bottom:10px}";
  document.head.appendChild(st);
}


// ── Student Notes tab (user, 2026-11-10) ────────────────────────────────────
// Calendar ▾ Student Notes: every note from the Schedule Notes tab, in the
// Notes / To-Do look (box, pen, numbered notebook rows, newest first).
// × closes one (Closed + "Done" on the sheet); closed ones in their own box, hidden.
var _snTabClosedShown = false;
function initStudentNotesTab() {
  var host = document.getElementById('snotesContent');
  if (!host) return;
  _snInjectStyle();
  if (host.dataset.built !== '1') {
    host.innerHTML =
      '<div class="td-wk-box tdo-box">' + TD_BOLTS + '<div class="settings-title td-wk-title"><span>Student Notes</span></div>' +
        '<div class="td-wk-icon">' + PEN_ICON + '</div>' +
        '<div id="snTabList"></div></div>' +
      '<div id="snTabClosedWrap"></div>';
    host.dataset.built = '1';
  }
  _snTabClosedShown = false;
  if (!_snNotes) document.getElementById('snTabList').innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  else _snTabRender();
  _snLoad(_snTabRender);
}
function _snTabRender() {
  var list = document.getElementById('snTabList');
  if (!list) return;
  var all = (_snNotes || []).slice().sort(function (a, b) { return b.row - a.row; });   // newest first
  var open = all.filter(function (n) { return !n.closed; }), closed = all.filter(function (n) { return n.closed; });
  list.innerHTML = _snErr && !all.length ? '<div class="empty-state">Couldn\'t read the notes: ' + _snEsc(_snErr) + '</div>'
    : !open.length ? '<div class="empty-state tdo-none">None</div>'
    : open.map(function (n, i) { return _snTabRow(n, i + 1); }).join('');
  var wrap = document.getElementById('snTabClosedWrap');
  if (!closed.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<div class="td-wk-box tdo-box tdo-done' + (_snTabClosedShown ? '' : ' tdo-done-hidden') + '">' + TD_BOLTS +
    '<div class="settings-title td-wk-title"><span>Closed</span><span class="tdo-title-btns"><button class="link-btn" onclick="_snTabClosedShown=!_snTabClosedShown;_snTabRender()">' + (_snTabClosedShown ? 'Hide' : 'Show') + '</button></span></div>' +
    '<div class="tdo-done-list"' + (_snTabClosedShown ? '' : ' style="display:none"') + '>' + closed.map(function (n, i) { return _snTabRow(n, i + 1, true); }).join('') + '</div></div>';
}
function _snTabRow(n, num, closed) {
  var day = function (ymd) { if (!ymd) return ''; var d = _snParse(ymd); return SN_MONTHS[d.getMonth()] + ' ' + d.getDate(); };
  return '<div class="tdo-row"><div class="tdo-num">' + num + '.</div>' +
    '<div class="tdo-text">' + (n.name ? '<span class="sn-tab-name">' + _snEsc(n.name) + '</span>\n' : '') + _snEsc(n.note) + '</div>' +
    '<div class="tdo-date">' + _snEsc(day(closed ? n.closed : n.created)) + '</div>' +
    (closed ? '' : '<button class="tdo-del" onclick="_snTabClose(' + n.row + ',this)" data-tip="Instant.\nCloses the note.">×</button>') + '</div>';
}
function _snTabClose(row, btn) {
  var n = (_snNotes || []).filter(function (x) { return x.row === row; })[0];
  if (!n) return;
  var url = getScriptUrl();
  var done = function () { n.closed = _snYmd(new Date()); n.how = 'Done'; _snTabRender(); };
  if (!url || row < 0) { done(); return; }
  btn.disabled = true;
  fetch(url + '?action=closeSchedNote&row=' + row + '&how=Done&note=' + encodeURIComponent(n.note))
    .then(function (r) { return r.json(); })
    .then(function (d) { if (!d.success) throw new Error(d.message || 'not saved'); done(); })
    .catch(function (e) {
      btn.disabled = false;
      rpmToast('fail', 'Unsuccessful', 'Not closed: ' + ((e && e.message && e.message !== 'Failed to fetch') ? e.message : 'no answer from Google.'));
    });
}
