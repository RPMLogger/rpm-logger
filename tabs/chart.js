// ─── TABS / CHART.JS ────────────────────────────────────────────────────────
// Students Import, mirrored into the portal. Backend getImportChart_
// (RPM_Chart.gs) walks every student tab and returns its lesson log.
//
// One row per student, one cell per logged lesson, left to right in the order
// they were logged, exactly the way the tab reads. Paid blocks are green,
// unpaid are plain. Click any cell for that lesson's subject and notes.
//
// Rows are wide (a long-running student has 100+ lessons), so the grid keeps
// the student column pinned and scrolls horizontally, landing on the most
// recent lessons because that is the end you actually look at.
// With no script URL (localhost preview) it shows sample data.

var _chData   = null;
var _chFilter = '';
var _chOrder  = 'new';   // 'new' = most recent first · 'old' = as logged
var _chPick   = null;    // { si, li } currently opened cell

function initChartTab() {
  _chInjectStyle();
  var body = document.getElementById('chartBody');
  if (!body) return;
  if (!_chData) body.innerHTML = '<div class="empty-state">Reading every student tab...</div>';

  var url = (document.getElementById('scriptUrl').value || '').trim();
  if (!url) { _chData = _chSample(); _chRender('Sample data · no data connected'); return; }
  if (_chData) { _chRender(); return; }

  fetch(url + '?action=getImportChart')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        body.innerHTML = '<div class="empty-state">Error: ' + _chEsc(data.message || 'backend not deployed yet') + '</div>';
        return;
      }
      _chData = data;
      _chRender();
    })
    .catch(function() { body.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

function _chRefresh() { _chData = null; _chPick = null; initChartTab(); }

function _chSetOrder(o) { _chOrder = o; _chPick = null; _chRender(); }

// Filtering hides rows instead of re-rendering. A full roster is thousands of
// cells, and rebuilding all of them on every keystroke made typing crawl.
function _chSetFilter(v) {
  _chFilter = (v || '').toLowerCase().trim();
  var shownStudents = 0, shownLessons = 0;
  document.querySelectorAll('#chartBody tbody tr').forEach(function(tr) {
    var hit = !_chFilter || (tr.getAttribute('data-name') || '').indexOf(_chFilter) !== -1;
    tr.style.display = hit ? '' : 'none';
    if (hit) { shownStudents++; shownLessons += parseInt(tr.getAttribute('data-count'), 10) || 0; }
  });
  var all = (_chData && _chData.students) || [];
  var a = document.getElementById('chCountStudents');
  var b = document.getElementById('chCountLessons');
  var e = document.getElementById('chEmpty');
  if (a) a.innerHTML = '<b>' + shownStudents + '</b>' + (_chFilter ? ' of ' + all.length : '') + ' <em>students</em>';
  if (b) b.innerHTML = '<b>' + shownLessons + '</b> <em>lessons</em>';
  if (e) e.style.display = shownStudents ? 'none' : '';
}

// ── Render ──────────────────────────────────────────────────────────────────

function _chRender(status) {
  var body = document.getElementById('chartBody');
  if (!body || !_chData) return;

  // Every student is always in the DOM; the filter only hides rows.
  var all  = _chData.students || [];
  var list = all;

  var shownLessons = _chData.totalLessons || 0;

  var h = '';

  // Toolbar.
  h += '<div class="ch-bar">';
  h += '<input class="ch-search" id="chSearch" type="text" placeholder="Filter students" ' +
       'value="' + _chEsc(_chFilter) + '" oninput="_chSetFilter(this.value)">';
  h += '<button class="ch-btn' + (_chOrder === 'old' ? ' on' : '') + '" onclick="_chSetOrder(\'old\')">As logged</button>';
  h += '<button class="ch-btn' + (_chOrder === 'new' ? ' on' : '') + '" onclick="_chSetOrder(\'new\')">Newest first</button>';
  h += '<button class="ch-btn" onclick="_chRefresh()">Refresh</button>';
  if (_chData.sheetId) {
    h += '<a class="ch-btn" target="_blank" rel="noopener" href="https://docs.google.com/spreadsheets/d/' +
         _chEsc(_chData.sheetId) + '/edit">Open sheet &#8599;</a>';
  }
  h += '<span class="ch-status">' + _chEsc(status || (_chData.pulled ? 'Pulled ' + _chData.pulled : '')) + '</span>';
  h += '</div>';

  // Summary line.
  h += '<div class="ch-sum">';
  h += '<span id="chCountStudents"><b>' + list.length + '</b>' + (_chFilter ? ' of ' + all.length : '') + ' <em>students</em></span>';
  h += '<span id="chCountLessons"><b>' + shownLessons + '</b> <em>lessons</em></span>';
  h += '<span><b>' + (_chData.maxLessons || 0) + '</b> <em>longest log</em></span>';
  h += '<span class="ch-legend"><i class="paid"></i> paid block <i class="unpaid"></i> unpaid</span>';
  h += '</div>';

  if (!list.length) {
    h += '<div class="empty-state">No lessons found</div>';
    body.innerHTML = h;
    return;
  }

  // Grid.
  var cols = _chData.maxLessons || 0;
  h += '<div class="ch-wrap" id="chWrap"><table class="ch-table"><thead><tr>';
  h += '<th class="ch-nameh">Student</th>';
  for (var c = 0; c < cols; c++) {
    h += '<th>' + (_chOrder === 'new' ? (c === 0 ? 'Last' : '-' + c) : (c + 1)) + '</th>';
  }
  h += '</tr></thead><tbody>';

  list.forEach(function(s) {
    var si = all.indexOf(s);
    var lessons = _chOrder === 'new' ? s.lessons.slice().reverse() : s.lessons;
    h += '<tr data-name="' + _chEsc(s.name.toLowerCase()) + '" data-count="' + s.count + '">';
    h += '<td class="ch-name"><div class="in"><span class="n">' + _chEsc(s.name) + '</span>' + 
           '<span class="c">' + s.count + '</span></div></td>';
    for (var c = 0; c < cols; c++) {
      var L = lessons[c];
      if (!L) { h += '<td class="ch-cell empty"></td>'; continue; }
      var li = _chOrder === 'new' ? (s.lessons.length - 1 - c) : c;
      var on = (_chPick && _chPick.si === si && _chPick.li === li) ? ' on' : '';
      h += '<td class="ch-cell' + (L.paid ? ' paid' : '') + on + '" ' +
           'onclick="_chPickCell(' + si + ',' + li + ')" ' +
           'title="' + _chEsc(s.name + ' · ' + L.date + (L.yr ? " '" + L.yr : '')) + '">' +
           '<span class="d">' + _chEsc(L.date) + (L.yr ? '<i>&#8217;' + _chEsc(L.yr) + '</i>' : '') + '</span>' +
           (L.note ? '<span class="dot"></span>' : '') +
           '</td>';
    }
    h += '</tr>';
  });

  h += '</tbody></table></div>';
  h += '<div class="empty-state" id="chEmpty" style="display:none">No student matches that</div>';

  // Detail strip for the picked cell.
  h += '<div class="ch-detail" id="chDetail">' + _chDetailHtml(all) + '</div>';

  body.innerHTML = h;

  // Newest first is the default: students have wildly different lesson counts,
  // so aligning by lesson 1 leaves the right-hand end of the grid empty for
  // everyone but the longest-running student. Newest first lines every
  // student's latest lesson up in the first column. As logged mirrors the tab
  // instead, and starts where the tab does, at lesson 1.
  var wrap = document.getElementById('chWrap');
  if (wrap) wrap.scrollLeft = 0;

  if (_chFilter) _chSetFilter(_chFilter);
}

function _chDetailHtml(all) {
  if (!_chPick) return '<span class="ch-hint">Click a lesson for its subject and notes</span>';
  var s = all[_chPick.si];
  if (!s) return '';
  var L = s.lessons[_chPick.li];
  if (!L) return '';

  var h = '';
  h += '<div class="ch-dh">' + _chEsc(s.name) +
       '<span>lesson ' + _chEsc(L.num || String(_chPick.li + 1)) + ' &middot; ' + _chEsc(L.date) +
       (L.yr ? ' &#8217;' + _chEsc(L.yr) : '') +
       ' &middot; row ' + L.row + '</span></div>';
  h += '<div class="ch-dl"><span class="k">Subject</span>' +
       (L.subj ? _chEsc(L.subj) : '<em>blank</em>') + '</div>';
  h += '<div class="ch-dl"><span class="k">Paid</span>' +
       (L.paid ? '<b class="g">yes</b>' + (L.pdate ? ' &middot; ' + _chEsc(L.pdate) : '')
               : '<b class="r">not this block</b>') + '</div>';
  h += '<div class="ch-dl"><span class="k">Notes</span>' +
       (L.note ? _chEsc(L.note) : '<em>none</em>') + '</div>';
  return h;
}

function _chPickCell(si, li) {
  if (_chPick && _chPick.si === si && _chPick.li === li) _chPick = null;
  else _chPick = { si: si, li: li };

  // Repaint only the cells and the strip, so the scroll position survives.
  var all = (_chData && _chData.students) || [];
  var det = document.getElementById('chDetail');
  if (det) det.innerHTML = _chDetailHtml(all);
  document.querySelectorAll('#chartBody .ch-cell.on').forEach(function(td) { td.classList.remove('on'); });
  if (_chPick) {
    var sel = document.querySelector('#chartBody .ch-cell[onclick="_chPickCell(' + si + ',' + li + ')"]');
    if (sel) sel.classList.add('on');
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function _chEsc(s) {
  return (s === null || s === undefined ? '' : String(s))
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _chSample() {
  function log(name, n, start) {
    var lessons = [];
    var d = new Date(start);
    for (var i = 0; i < n; i++) {
      lessons.push({
        row:   12 + i,
        date:  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getDate(),
        yr:    String(d.getFullYear()).slice(2),
        subj:  ['Scales', 'Blues in A', 'Chord voicings', 'Song work'][i % 4],
        paid:  Math.floor(i / 4) % 3 !== 2,
        pdate: '',
        note:  i % 5 === 0 ? 'Worked on timing, slow the metronome next week.' : '',
        num:   String(i + 1)
      });
      d.setDate(d.getDate() + 7);
    }
    return { tab: name.toUpperCase(), name: name, gid: 0, count: n,
             first: lessons[0].date, last: lessons[n - 1].date, lessons: lessons };
  }
  var students = [log('Ava Reed', 34, '2026-01-06'), log('Ben Hall', 12, '2026-06-01'),
                  log('Cora Diaz', 47, '2025-09-08'), log('Dev Patel', 8, '2026-07-20')];
  var max = 0, tot = 0;
  students.forEach(function(s) { tot += s.count; if (s.count > max) max = s.count; });
  return { success: true, sheetId: '', students: students, maxLessons: max,
           totalLessons: tot, pulled: '' };
}

function _chInjectStyle() {
  if (document.getElementById('chStyle')) return;
  var st = document.createElement('style');
  st.id = 'chStyle';
  st.textContent =
    // Same breakout as the Calendar tabs so a long log has room on desktop.
    "#chartBody{width:min(1400px,calc(100vw - 40px));position:relative;left:50%;transform:translateX(-50%)}" +
    ".ch-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}" +
    ".ch-btn{padding:6px 12px;font-size:12px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block}" +
    ".ch-btn:hover{border-color:#555}" +
    ".ch-btn.on{border-color:var(--accent);color:var(--accent)}" +
    ".ch-search{padding:6px 10px;font-size:12px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:4px;font-family:inherit;width:190px}" +
    ".ch-search:focus{outline:none;border-color:var(--accent)}" +
    ".ch-status{font-size:11px;color:var(--muted);margin-left:auto}" +
    ".ch-sum{display:flex;gap:18px;align-items:center;font-size:12px;color:var(--muted);margin-bottom:10px;flex-wrap:wrap}" +
    ".ch-sum b{color:var(--text);font-size:15px;font-weight:600;margin-right:3px}" +
    ".ch-sum em{font-style:normal;font-size:10px}" +
    ".ch-legend{display:flex;align-items:center;gap:6px;font-size:10px;margin-left:auto}" +
    ".ch-legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-left:6px}" +
    ".ch-legend i.paid{background:rgba(46,204,113,.22);border-left:2px solid var(--green)}" +
    ".ch-legend i.unpaid{background:var(--surface2);border-left:2px solid var(--border)}" +
    ".ch-wrap{border:1px solid var(--border);border-radius:8px;background:var(--surface);overflow:auto;max-height:62vh}" +
    ".ch-table{border-collapse:separate;border-spacing:0;font-size:11px}" +
    ".ch-table th{position:sticky;top:0;z-index:2;background:var(--surface2);padding:6px 4px;font-size:9px;color:var(--muted);letter-spacing:1px;font-weight:500;border-bottom:1px solid var(--border);min-width:62px}" +
    ".ch-table th.ch-nameh{left:0;z-index:4;text-align:left;padding-left:12px;width:170px;min-width:170px;border-right:1px solid var(--border)}" +
    ".ch-table td{border-bottom:1px solid var(--border)}" +
    ".ch-table td.ch-name{position:sticky;left:0;z-index:2;background:var(--surface);padding:0 12px;white-space:nowrap;border-right:1px solid var(--border);width:170px;min-width:170px;height:30px}" +
    ".ch-name .in{display:flex;align-items:center;justify-content:space-between;gap:10px;height:30px}" +
    ".ch-name .n{color:var(--text);font-size:12px}" +
    ".ch-name .c{color:var(--muted);font-size:10px}" +
    ".ch-table td.ch-cell{position:relative;height:30px;min-width:78px;padding:0 6px;color:var(--muted);background:var(--surface2);border-left:2px solid var(--border);cursor:pointer;white-space:nowrap;text-align:center}" +
    ".ch-table td.ch-cell.paid{background:rgba(46,204,113,.10);border-left-color:var(--green);color:var(--text)}" +
    ".ch-table td.ch-cell.empty{background:transparent;border-left-color:transparent;cursor:default}" +
    ".ch-cell:not(.empty):hover{outline:1px solid #555}" +
    ".ch-cell.on{outline:2px solid var(--accent);outline-offset:-2px;color:var(--text)}" +
    ".ch-cell .d{font-size:10px}" +
    ".ch-cell .d i{font-style:normal;opacity:.55;margin-left:2px}" +
    ".ch-cell .dot{position:absolute;top:4px;right:4px;width:4px;height:4px;border-radius:50%;background:var(--accent2)}" +
    ".ch-detail{margin-top:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--panel);padding:var(--pad-card);font-size:12px;line-height:1.7;min-height:52px}" +
    ".ch-hint{color:var(--muted);font-size:11px}" +
    ".ch-dh{font-size:14px;color:var(--text);margin-bottom:6px}" +
    ".ch-dh span{font-size:11px;color:var(--muted);margin-left:8px}" +
    ".ch-dl{display:flex;gap:10px}" +
    ".ch-dl .k{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.5px;min-width:64px;flex:none;padding-top:3px}" +
    ".ch-dl em{color:var(--muted);font-style:normal}" +
    ".ch-dl b.g{color:var(--green);font-weight:500}" +
    ".ch-dl b.r{color:var(--warn);font-weight:500}";
  document.head.appendChild(st);
}
