// ─── TABS / FIXEDCAL.JS ─────────────────────────────────────────────────────
// Fixed Calendar: every student's regular slot laid onto the teaching grid, to
// see open spots at a glance. Backend getFixedCalendar_ (RPM_FixedCal.gs) reads
// 8 weeks of the Weekly + Biweekly calendars and returns one slot per student.
//
// A + B view splits biweekly cells in half (Week A left, Week B right), so a
// matched pair fills the cell and a half-empty slot shows "open" on one side.
// Week A / Week B views show only that fortnight. Week labels are fixed
// (Week A = fortnight of Sep 14 2026) and don't flip each week.
// With no script URL (localhost preview) it shows sample data.

// Teaching grid (see New Students tab). dayIdx 0 = Mon; minutes from midnight.
var FC_GRID = {
  0: [870, 930, 990, 1050],        // Mon 2:30 to 5:30
  1: [1110, 1170, 1230],           // Tue 6:30 to 8:30
  2: [1050, 1110, 1170, 1230],     // Wed 5:30 to 8:30
  3: [1110, 1170, 1230],           // Thu 6:30 to 8:30
  4: [1110, 1170, 1230],           // Fri 6:30 to 8:30
  6: [630, 690, 750, 810]          // Sun 10:30 to 1:30
};
var FC_DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var FC_COLORS = { weekly: '#26a69a', A: '#e91e63', B: '#8e6cf0', pencil: '#ffb400' };

var _fcMode = 'both';   // 'both' | 'A' | 'B'
var _fcData = null;

function initFixedCalTab() {
  _fcInjectStyle();
  var body = document.getElementById('fcBody');
  if (!body) return;
  if (!_fcData) body.innerHTML = '<div class="empty-state">Reading 8 weeks of lessons...</div>';

  var url = (document.getElementById('scriptUrl').value || '').trim();
  if (!url) { _fcData = _fcSample(); _fcRender('Sample data · no data connected'); return; }

  fetch(url + '?action=getFixedCalendar')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { body.innerHTML = '<div class="empty-state">Error: ' + _fcEsc(data.message || 'backend not deployed yet') + '</div>'; return; }
      _fcData = data;
      _fcRender();
    })
    .catch(function() { body.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

function _fcSetMode(m) { _fcMode = m; _fcRender(); }

// ── Build cells ─────────────────────────────────────────────────────────────

function _fcCells(students, pencilled) {
  var cells = {}; // "dayIdx|min" -> { weekly:[], A:[], B:[] }
  function cellOf(s) {
    var k = s.dayIdx + '|' + s.startMin;
    return cells[k] || (cells[k] = { weekly: [], A: [], B: [] });
  }
  students.forEach(function(s) {
    var c = cellOf(s);
    if (s.type === 'weekly') c.weekly.push(s); else c[s.week === 'B' ? 'B' : 'A'].push(s);
  });
  // Pencilled trials go in after real students. A biweekly pencil takes
  // whichever half is free (A if both are).
  (pencilled || []).forEach(function(p) {
    var c = cellOf(p);
    var s = { name: p.name, type: p.frequency, dayIdx: p.dayIdx, startMin: p.startMin, pencil: true, trialDate: p.trialDate, odd: [] };
    if (s.type === 'weekly') { c.weekly.push(s); return; }
    s.week = (!c.A.length || c.B.length) ? 'A' : 'B';
    c[s.week].push(s);
  });
  return cells;
}

function _fcInGrid(d, m) { return (FC_GRID[d] || []).indexOf(m) !== -1; }

function _fcRender(statusMsg) {
  var body = document.getElementById('fcBody');
  if (!body || !_fcData) return;
  var students  = _fcData.students || [];
  var pencilled = _fcData.pencilled || [];
  var cells = _fcCells(students, pencilled);
  var everyone = students.concat(pencilled);

  // Rows: grid times plus any time a student actually sits at.
  var mins = {};
  Object.keys(FC_GRID).forEach(function(d) { FC_GRID[d].forEach(function(m) { mins[m] = true; }); });
  everyone.forEach(function(s) { mins[s.startMin] = true; });
  var rows = Object.keys(mins).map(Number).sort(function(a, b) { return a - b; });

  // Columns: Mon-Sun, Saturday only if someone is on it.
  var days = [0, 1, 2, 3, 4, 5, 6].filter(function(d) {
    return FC_GRID[d] || everyone.some(function(s) { return s.dayIdx === d; });
  });

  // Counts don't depend on the view.
  var open = 0, half = 0, paired = 0, weekly = 0, biweekly = 0;
  students.forEach(function(s) { s.type === 'weekly' ? weekly++ : biweekly++; });
  days.forEach(function(d) {
    rows.forEach(function(m) {
      var c = cells[d + '|' + m];
      if (!c) { if (_fcInGrid(d, m)) open++; return; }
      if (c.weekly.length) return;
      if (c.A.length && c.B.length) paired++; else half++;
    });
  });

  var html =
    "<div class='fc-bar'>" +
      "<button class='fc-btn" + (_fcMode === 'both' ? ' on' : '') + "' onclick=\"_fcSetMode('both')\">A + B</button>" +
      "<button class='fc-btn" + (_fcMode === 'A' ? ' on' : '') + "' onclick=\"_fcSetMode('A')\">Week A</button>" +
      "<button class='fc-btn" + (_fcMode === 'B' ? ' on' : '') + "' onclick=\"_fcSetMode('B')\">Week B</button>" +
      "<span class='fc-this'>This week is <b style='color:" + FC_COLORS[_fcData.thisWeek] + "'>Week " + _fcData.thisWeek + "</b></span>" +
      "<span class='fc-legend'>" +
        "<i style='background:" + FC_COLORS.weekly + "'></i>Weekly" +
        "<i style='background:" + FC_COLORS.A + "'></i>Biweekly A" +
        "<i style='background:" + FC_COLORS.B + "'></i>Biweekly B" +
        "<i class='pen'></i>Pencilled" +
        "<i class='open'></i>Open" +
      "</span>" +
      "<span class='fc-status'>" + _fcEsc(statusMsg || (weekly + ' weekly · ' + biweekly + ' biweekly · next ' + (_fcData.weeks || 8) + ' weeks')) + "</span>" +
      "<button class='fc-btn' onclick='initFixedCalTab()'>⟳</button>" +
    "</div>" +
    "<div class='fc-sum'>" +
      "<span><b class='g'>" + open + "</b> open</span>" +
      "<span><b>" + half + "</b> half-open <em>(biweekly only)</em></span>" +
      "<span><b>" + paired + "</b> paired</span>" +
      "<span><b class='p'>" + pencilled.length + "</b> pencilled</span>" +
    "</div>" +
    "<div class='fc-wrap'><table class='fc-table'><thead><tr><th></th>";
  days.forEach(function(d) { html += "<th>" + FC_DAYS[d].toUpperCase() + "</th>"; });
  html += "</tr></thead><tbody>";

  rows.forEach(function(m) {
    html += "<tr><td class='fc-time'>" + _fcTime(m) + "</td>";
    days.forEach(function(d) {
      var c = cells[d + '|' + m], inGrid = _fcInGrid(d, m);
      if (!c && !inGrid) { html += "<td class='fc-off'></td>"; return; }
      html += "<td><div class='fc-cell'>" + _fcCellHtml(c, inGrid) + "</div></td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table></div>";

  var odd = students.filter(function(s) { return s.odd && s.odd.length; });
  if (odd.length) {
    html += "<div class='fc-notes'><div class='fc-notes-h'>Not always in their slot</div>";
    odd.forEach(function(s) {
      html += "<div>⚠ <b>" + _fcEsc(s.name) + "</b> <span>" + _fcEsc(s.odd.join(' · ')) + "</span></div>";
    });
    html += "</div>";
  }

  body.innerHTML = html;
}

function _fcCellHtml(c, inGrid) {
  if (!c) return _fcOpen();
  var offGrid = !inGrid;

  // Weekly holds the whole slot. More than one student here is a clash.
  if (c.weekly.length) {
    var all = c.weekly.concat(c.A, c.B);
    return all.map(function(s) {
      return _fcBlock(s, s.type === 'weekly' ? FC_COLORS.weekly : FC_COLORS[s.week], offGrid, all.length > 1);
    }).join('');
  }

  var clash = c.A.length > 1 || c.B.length > 1;
  function side(w) {
    return c[w].length
      ? c[w].map(function(s) { return _fcBlock(s, FC_COLORS[w], offGrid, clash); }).join('')
      : _fcOpen(w);
  }
  if (_fcMode === 'both') return "<div class='fc-half'>" + side('A') + "</div><div class='fc-half'>" + side('B') + "</div>";
  return side(_fcMode);
}

function _fcBlock(s, color, offGrid, clash) {
  if (s.pencil) color = FC_COLORS.pencil;
  // Same format as every portal tooltip: capitalised clauses, comma-separated.
  var tip = s.name + ', ' + (s.type === 'weekly' ? 'Weekly' : 'Biweekly Week ' + s.week) +
            (s.pencil
              ? ', Pencilled in for the trial phase' + (s.trialDate ? ', Trial ' + s.trialDate : '')
              : ', ' + s.count + ' lessons in range, Next ' + s.next) +
            (s.odd && s.odd.length ? ', Off slot ' + s.odd.join(' / ') : '') +
            (offGrid ? ', Outside the teaching grid' : '') +
            (clash ? ', More than one student in this slot' : '');
  return "<div class='fc-blk" + (clash ? ' clash' : '') + (s.pencil ? ' pen' : '') + "' data-tip='" + _fcEsc(tip) + "' " +
           "style='border-left-color:" + color + ";background:" + color + "26'>" +
           (s.pencil ? '✎ ' : '') + _fcEsc(s.name) +
           (s.pencil ? "<span class='pl'>pencilled</span>" : '') +
           (s.odd && s.odd.length ? " <span class='w'>⚠</span>" : '') +
           (offGrid ? "<span class='og'>off grid</span>" : '') +
         "</div>";
}

function _fcOpen(w) { return "<div class='fc-open'>open" + (w ? ' ' + w : '') + "</div>"; }

// ── Helpers ─────────────────────────────────────────────────────────────────

function _fcTime(m) {
  var h = Math.floor(m / 60), mm = m % 60;
  return ((h % 12) || 12) + ':' + (mm < 10 ? '0' : '') + mm + (h >= 12 ? 'pm' : 'am');
}

function _fcEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function _fcSample() {
  function w(n, d, m) { return { name: n, type: 'weekly', dayIdx: d, startMin: m, week: '', count: 8, next: '2026-09-14', odd: [] }; }
  function b(n, d, m, wk) { return { name: n, type: 'biweekly', dayIdx: d, startMin: m, week: wk, count: 4, next: '2026-09-14', odd: [] }; }
  return {
    weeks: 8, thisWeek: 'B',
    students: [
      w('Gene Chou', 0, 810), w('Ed Sheehan', 0, 870), w('Gail Greenwald', 0, 930), b('Jean Gabriel Fransisco', 0, 990, 'B'),
      b('Yaxu Bai', 1, 1110, 'B'), w('Christian Sakai', 1, 1170), b('Jiayi He', 1, 1230, 'A'),
      b('Jordan Stern', 2, 1050, 'A'), b('Stef Carapezza', 2, 1110, 'A'), b('Glen Paulin', 2, 1110, 'B'), b('Charlotte Kang', 2, 1170, 'B'),
      b('Jose Nieto', 3, 1170, 'A'), b('Jiashu Chen', 3, 1170, 'B'), w('Siena Stanislaus', 3, 1230),
      w('Ellen Lucas', 4, 1110), w('Tianyi Cao', 4, 1170),
      b('Flora Tsai', 6, 630, 'A'), b('Antonio Moreno', 6, 690, 'A'), b('Surbhi Singhal', 6, 690, 'B'),
      w('Gulnara Shigabutdinova', 6, 750), w('Cathy Sun', 6, 810)
    ],
    pencilled: [
      { name: 'Daniyal Jafarey', dayIdx: 2, startMin: 1230, frequency: 'weekly', trialDate: '2026-09-09' },
      { name: 'Guangyan Cai', dayIdx: 6, startMin: 870, frequency: 'weekly', trialDate: '2026-09-13' }
    ]
  };
}

function _fcInjectStyle() {
  if (document.getElementById('fcStyle')) return;
  var st = document.createElement('style');
  st.id = 'fcStyle';
  st.textContent =
    // Same breakout as the Calendar tab so all days fit on desktop.
    "#fcBody{width:min(1200px,calc(100vw - 40px));position:relative;left:50%;transform:translateX(-50%)}" +
    ".fc-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}" +
    ".fc-btn{padding:6px 12px;font-size:12px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-family:inherit}" +
    ".fc-btn:hover{border-color:#555}" +
    ".fc-btn.on{border-color:var(--accent);color:var(--accent)}" +
    ".fc-this{font-size:12px;color:var(--muted);margin-left:6px}" +
    ".fc-legend{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted);margin-left:8px}" +
    ".fc-legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-left:6px}" +
    ".fc-legend i.open{border:1px dashed var(--green)}" +
    ".fc-legend i.pen{border:1px dashed #ffb400}" +
    ".fc-sum b.p{color:#ffb400}" +
    ".fc-blk.pen{border:1px dashed rgba(255,180,0,.7);border-left:3px solid #ffb400}" +
    ".fc-blk .pl{font-size:9px;color:#ffb400;letter-spacing:.3px}" +
    ".fc-status{font-size:11px;color:var(--muted);margin-left:auto}" +
    ".fc-sum{display:flex;gap:18px;font-size:12px;color:var(--muted);margin-bottom:10px}" +
    ".fc-sum b{color:var(--text);font-size:15px;font-weight:600;margin-right:3px}" +
    ".fc-sum b.g{color:var(--green)}" +
    ".fc-sum em{font-style:normal;font-size:10px}" +
    ".fc-wrap{border:1px solid var(--border);border-radius:8px;background:var(--surface);overflow-x:auto}" +
    ".fc-table{width:100%;min-width:760px;border-collapse:collapse;table-layout:fixed}" +
    ".fc-table th{padding:8px 4px;font-size:10px;color:var(--muted);letter-spacing:1px;font-weight:500;border-bottom:1px solid var(--border)}" +
    ".fc-table th:first-child{width:62px}" +
    ".fc-table td{border-top:1px solid var(--border);border-left:1px solid var(--border);height:46px;padding:3px;vertical-align:middle}" +
    ".fc-table td.fc-time{border-left:none;font-size:10px;color:var(--muted);text-align:right;padding-right:8px;white-space:nowrap}" +
    ".fc-table td.fc-off{background:rgba(0,0,0,.35)}" +
    ".fc-cell{display:flex;gap:3px;height:100%}" +
    ".fc-half{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}" +
    ".fc-cell>.fc-blk,.fc-cell>.fc-open{flex:1}" +
    ".fc-blk{flex:1;min-width:0;border-left:3px solid;border-radius:4px;padding:3px 6px;font-size:11px;line-height:1.2;color:var(--text);overflow:hidden;display:flex;flex-direction:column;justify-content:center;cursor:default}" +
    ".fc-blk.clash{outline:1px solid var(--accent)}" +
    ".fc-blk .w{color:#ffb400;font-size:10px}" +
    ".fc-blk .og{font-size:9px;color:#ffb400;letter-spacing:.3px}" +
    ".fc-open{flex:1;min-width:0;border:1px dashed rgba(46,204,113,.55);border-radius:4px;color:var(--green);font-size:10px;display:flex;align-items:center;justify-content:center;letter-spacing:.3px}" +
    ".fc-notes{margin-top:12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);padding:8px 12px;font-size:12px;line-height:1.7}" +
    ".fc-notes-h{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}" +
    ".fc-notes span{color:var(--muted);font-size:11px}";
  document.head.appendChild(st);
}
