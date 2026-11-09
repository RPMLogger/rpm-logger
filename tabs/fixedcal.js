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
// The Calendar tab's colours (user, 2026-11-07): weekly blue, biweekly pink (A) + a violet B, all oklch(0.63 0.19 hue)
var FC_COLORS = { weekly: 'oklch(0.5 0.15 255)', A: 'oklch(0.5 0.15 350)', B: 'oklch(0.5 0.15 300)', pencil: 'oklch(0.63 0.19 70)' };

var _fcMode = 'both';   // 'both' | 'A' | 'B'
var _fcData = null;

function initFixedCalTab() {
  _fcInjectStyle();
  var body = document.getElementById('fcBody');
  if (!body) return;
  if (!_fcData) body.innerHTML = '<div class="empty-state rpm-loading">Reading 8 weeks of lessons</div>';

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

// One big fake knob in place of the two small ones (user, 2026-11-07): a 0–10 scale round a dark knob,
// like a compressor's main knob. It rises through both layers of the rack. Decoration only.
function _fcBigKnob() {
  var c = 52, svg = "<svg width='104' height='104' viewBox='0 0 104 104'>";
  for (var i = 0; i <= 20; i++) {   // ticks every half step, longer on the numbers
    var a = (-135 + i * 13.5) * Math.PI / 180, r1 = i % 2 ? 37 : 35, r2 = 40;
    svg += "<line x1='" + (c + r1 * Math.sin(a)).toFixed(1) + "' y1='" + (c - r1 * Math.cos(a)).toFixed(1) + "' x2='" + (c + r2 * Math.sin(a)).toFixed(1) + "' y2='" + (c - r2 * Math.cos(a)).toFixed(1) + "'/>";
    if (i % 2 === 0) svg += "<text x='" + (c + 47 * Math.sin(a)).toFixed(1) + "' y='" + (c - 47 * Math.cos(a) + 3).toFixed(1) + "'>" + (i / 2) + "</text>";
  }
  return "<span class='fc-bigknob'>" + svg + "</svg><span class='fc-bk'></span></span>";
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
  var open = 0, half = 0, weekly = 0, biweekly = 0, wkA = 0, wkB = 0;
  var spots = [], halves = [];   // the open spots themselves, for the rack's screen (user, 2026-11-09)
  students.forEach(function(s) {
    if (s.type === 'weekly') { weekly++; return; }
    biweekly++;
    s.week === 'B' ? wkB++ : wkA++;   // A vs B balance (was the Biweekly tab, 2026-10-01)
  });
  days.forEach(function(d) {
    rows.forEach(function(m) {
      var c = cells[d + '|' + m];
      if (!c) { if (_fcInGrid(d, m)) { open++; spots.push({ d: d, m: m }); } return; }
      if (c.weekly.length) return;
      if (!(c.A.length && c.B.length)) { half++; halves.push({ d: d, m: m, free: c.A.length ? 'B' : 'A' }); }
    });
  });

  // Two rack units like the Calendar tab's (user, 2026-11-07): the view switches, this week's LCD,
  // the legend and ⟳ on top; the counts as amber displays underneath. Uses the Calendar's .cr parts.
  var bolts =
    "<span class='cr-bolt' style='left:8px;top:10px'></span><span class='cr-bolt' style='left:8px;bottom:10px'></span>" +
    "<span class='cr-bolt' style='right:8px;top:10px'></span><span class='cr-bolt' style='right:8px;bottom:10px'></span>";
  function pb(mode, cap) {
    return "<span class='cr-col'><button class='cr-pb" + (_fcMode === mode ? " lit" : "") + "' onclick=\"_fcSetMode('" + mode + "')\"></button><span class='cr-cap'>" + cap + "</span></span>";
  }
  // The counts: a slim screen on top (numbers), captions printed on the rack under it, like a pedal's labels (user, 2026-11-07)
  // Two screens (user, 2026-11-07): what's free (open + half-open = total), then everything else
  _fcSpots = spots.concat(halves); if (_fcSpotI >= _fcSpots.length) _fcSpotI = 0;
  var titles = ['Free slots', 'Load'];   // a title strip over each screen (user, 2026-11-07)
  var groups = [
    [[open, 'Open'], [half, 'Half-open', 'Biweekly slots with one week free.']],   // Total open removed (user, 2026-11-09)
    // A / B balance moved up to the top rack as a meter (user, 2026-11-09)
    // Booked (Pencilled / Weekly / Biweekly) removed (user, 2026-11-09)
    [[weekly + wkA, 'Week A', 'Lessons in a Week A: weekly ' + weekly + ' + biweekly A ' + wkA + '.'], [weekly + wkB, 'Week B', 'Lessons in a Week B: weekly ' + weekly + ' + biweekly B ' + wkB + '.']]   // was Av weekly load (user, 2026-11-09)   // its own screen (user, 2026-11-09)
  ];
  // A / B balance (user, 2026-11-09): the Calendar's W / B meter, A over B, each bar its share of the biweeklies; in the top rack
  // Biweekly A / B (user, 2026-11-09; was the W / B style meter): BIWEEKLY on the rack, Week A / Week B in a screen like the Load one
  var abHtml = "<span class='fc-vert'><span class='fc-vcaps'><span class='cr-cap'>Biweekly</span></span>" +
    "<span class='fc-vscreen fc-vwide'>" + [['Week A', wkA], ['Week B', wkB]].map(function(m) { return "<span><small>" + m[0] + "</small><b>" + m[1] + "</b></span>"; }).join('') + "</span></span>";
  // Vertical (user, 2026-11-09): one small screen, a row per count, caption left and number right
  // Vertical (user, 2026-11-09): captions printed on the rack on the left, a slim screen of numbers on the right
  // Av weekly load its own unit beside Open / Half-open (user, 2026-11-09)
  var vertHtml = groups.map(function(g, gi) {
    var caps = function(cls) { return "<span class='fc-vcaps" + cls + "'>" + g.map(function(x) { return "<span class='cr-cap'" + (x[2] ? " data-tip='" + _fcEsc(x[2]) + "'" : "") + ">" + x[1] + "</span>"; }).join('') + "</span>"; };
    var screen = "<span class='fc-vscreen'>" + g.map(function(x) { return "<b>" + x[0] + "</b>"; }).join('') + "</span>";
    // the load unit: LOAD on the left, Week A / Week B inside the screen beside their numbers (user, 2026-11-09)
    var loadScreen = "<span class='fc-vscreen fc-vwide'>" + g.map(function(x) { return "<span" + (x[2] ? " data-tip='" + _fcEsc(x[2]) + "'" : "") + "><small>" + x[1] + "</small><b>" + x[0] + "</b></span>"; }).join('') + "</span>";
    if (gi === 0) return _fcSpotsHtml();   // the open spots, one at a time, Thanksgiving style (user, 2026-11-09; were the Open / Half-open counts)
    return "<span class='fc-vert'>" + (gi === 1 ? "<span class='fc-vcaps'><span class='cr-cap'>Load</span></span>" + loadScreen : caps('') + screen) + "</span>";
  }).join('');
  var screenHtml = "<span class='fc-screens'>" + groups.map(function(g, gi) {
    var cols = "grid-template-columns:repeat(" + g.length + ",1fr)";
    return "<span class='fc-meters' style='flex:" + g.length + "'>" +
      // no title strips: the rack is the others' 75px, the captions say it (user, 2026-11-09)
      ("<span class='fc-screen' style='" + cols + "'>" + g.map(function(x) { return "<b" + (x[2] ? " data-tip='" + _fcEsc(x[2]) + "'" : "") + ">" + x[0] + "</b>"; }).join('') + "</span>") +
      ("<span class='fc-caps' style='" + cols + "'>" + g.map(function(x) { return "<span class='cr-cap'>" + x[1] + "</span>"; }).join('') + "</span>") +
    "</span>";
  }).join('') + "</span>";
  var html =
    "<div class='cal-bar cr'>"   // the counts rack on top (user, 2026-11-07)
     + bolts +
      // one rack, two layers (user, 2026-11-07; were two rack units)
      "<div class='cr-row'>" +
        // the knobs + grille in a fixed-width block in both layers, so the buttons line up with the screens under them (user, 2026-11-07)
        // Three columns sized like the three screens below, so THIS WEEK sits right over A / B BALANCE (user, 2026-11-07)
        "<span class='fc-screens fc-top'><span class='fc-tgrp' style='flex:3'>" +
        "<span class='cr-pair fc-modes'>" + pb('both', 'A + B') + pb('A', 'Week A') + pb('B', 'Week B') + "</span>" +   // Reload removed: the tab's ⟳ does the same (user, 2026-11-09)   // push buttons again: easier than the slide switch (user, 2026-11-07)
        "</span><span class='fc-tgrp' style='flex:2'>" +
        "<div class='cr-lcd'>WEEK " + _fcEsc(_fcData.thisWeek) + "<small>THIS WEEK</small></div>" +
        "</span><span class='fc-tgrp fc-tgrp3' style='flex:3'>" +
        _fcBigKnob() +   // the knob and the key swapped (user, 2026-11-09)
        "</span></span>" +
        // a 160px block on the right of both layers keeps the screens as short as they were (user, 2026-11-07); the key sits in it
        "<span class='fc-right fc-knobspot'>" + abHtml +   // the key moved to the counts rack, A / B balance here (user, 2026-11-09)
        "</span>" +
      "</div>" +
    "</div>" +
    // split into two rack units like the Calendar's (user, 2026-11-09; was one rack, two layers)
    "<div class='cal-bar cr fc-rack2'>" + bolts +
      "<div class='cr-row fc-countrow'>" +
        "<span class='fc-screens fc-vpair'>" + vertHtml + "</span>" + "<span class='fc-right'>" +   // was screenHtml (the wide screens)
        "<span class='cr-legend fc-legend2'>" +   // the key where the knob was (user, 2026-11-07)
          "<span><i style='background:color-mix(in oklab, " + FC_COLORS.weekly + " 55%, #1a1a1a);box-shadow:none'></i>Weekly</span>" +
          "<span><i style='background:color-mix(in oklab, " + FC_COLORS.A + " 55%, #1a1a1a);box-shadow:none'></i>Biweekly A</span>" +
          "<span><i style='background:color-mix(in oklab, " + FC_COLORS.B + " 55%, #1a1a1a);box-shadow:none'></i>Biweekly B</span>" +
          "<span><i class='pen'></i>Pencilled</span>" +
        "</span>" +
        "</span>" +
      "</div>" +
    "</div>" +
    (statusMsg ? "<div class='cal-status'>" + _fcEsc(statusMsg) + "</div>" : "") +
    "";

  // The week grid built exactly like the Calendar tab's (user, 2026-11-07): its own classes
  // (.cal-wrap/.cal-inner/.cal-head/.cal-body/.cal-ev), screws, hours on the half hour, lessons as
  // one-hour cards placed by time, side by side when they share a slot. All seven days, no dates.
  var hourPx = CAL_HOUR_PX, top0 = CAL_DAY_START;
  html +=
    "<div class='cal-wrap'><div class='cal-inner'>" +
      "<span class='cr-bolt' style='left:8px;top:10px'></span><span class='cr-bolt' style='left:8px;bottom:10px'></span>" +
      "<span class='cr-bolt' style='right:8px;top:10px'></span><span class='cr-bolt' style='right:8px;bottom:10px'></span>" +
      "<div class='cal-head'><div></div>";
  for (var d = 0; d < 7; d++) html += "<div>" + FC_DAYS[d].toUpperCase() + "<b>&nbsp;</b></div>";
  html += "</div><div class='cal-body' style='height:" + ((CAL_DAY_END - top0) / 60 * hourPx) + "px'><div class='cal-gutter'>";
  for (var hm = top0; hm <= CAL_DAY_END; hm += 30) {
    if (hm % 60 === 30) html += "<div class='cal-hr' style='top:" + ((hm - top0) / 60 * hourPx) + "px'>" + _fcTime(hm) + "</div>";
  }
  html += "</div>";
  for (var c = 0; c < 7; c++) {
    html += "<div class='cal-col'>";
    rows.forEach(function(m) {
      var lanes = _fcLanes(cells[c + '|' + m], _fcInGrid(c, m));
      var top = (m - top0) / 60 * hourPx;
      lanes.forEach(function(item, i) {
        var pos = "top:" + top + "px;height:" + (hourPx - 2) + "px" + (lanes.length > 1
          ? ";left:calc((100% - 3px) * " + i + " / " + lanes.length + " + 3px);width:calc((100% - 3px) / " + lanes.length + " - 3px);right:auto" : "");
        html += item.open ? _fcOpen(item.week, pos) : _fcBlock(item.s, item.color, item.offGrid, item.clash, m, pos);
      });
    });
    html += "</div>";
  }
  for (var l = top0 + 30; l < CAL_DAY_END; l += 30) {
    html += "<div class='cal-line" + (l % 60 === 30 ? '' : ' half') + "' style='top:" + ((l - top0) / 60 * hourPx) + "px'></div>";
  }
  html += "</div></div></div>";


  body.innerHTML = html;
}

// One slot's cards, left to right: weekly fills it; A + B view puts Week A then Week B side by side;
// an empty half (or an empty teaching slot) is an "open" card.
function _fcLanes(c, inGrid) {
  if (!c) return inGrid ? [{ open: true, week: '' }] : [];
  var offGrid = !inGrid;
  if (c.weekly.length) {
    var all = c.weekly.concat(c.A, c.B);
    return all.map(function(s) {
      return { s: s, color: s.type === 'weekly' ? FC_COLORS.weekly : FC_COLORS[s.week], offGrid: offGrid, clash: all.length > 1 };
    });
  }
  var clash = c.A.length > 1 || c.B.length > 1;
  function side(w) {
    return c[w].length
      ? c[w].map(function(s) { return { s: s, color: FC_COLORS[w], offGrid: offGrid, clash: clash }; })
      : [{ open: true, week: w }];
  }
  return _fcMode === 'both' ? side('A').concat(side('B')) : side(_fcMode);
}

function _fcBlock(s, color, offGrid, clash, m, pos) {
  if (s.pencil) color = FC_COLORS.pencil;
  // Same format as every portal tooltip: capitalised clauses, comma-separated.
  var tip = s.name + '.\n' + (s.type === 'weekly' ? 'Weekly' : 'Biweekly Week ' + s.week) + '.' +
            (s.pencil
              ? '\nPencilled in for the Trial phase.' + (s.trialDate ? '\nTrial ' + s.trialDate + '.' : '')
              : '\n' + s.count + ' lessons in range.\nNext ' + s.next + '.') +
            (offGrid ? '\nOutside the teaching grid.' : '') +
            (clash ? '\nMore than one student in this slot.' : '');
  return "<div class='cal-ev fc-ev" + (clash ? ' clash' : '') + (s.pencil ? ' pen' : '') + "' data-tip='" + _fcEsc(tip) + "' " +
           "style='" + pos + ";background-color:color-mix(in oklab, " + color + " 24%, #1a1a1a)'>" +
           "<div class='n'>" + _fcEsc(s.name) + "</div>" +
           "<div class='t'>" + _fcTime(m) + (s.pencil ? ' · pencilled' : '') + (offGrid ? ' · off grid' : '') + "</div>" +
         "</div>";
}

function _fcOpen(w, pos) { return "<div class='fc-open' style='" + pos + "'>open" + (w ? ' ' + w : '') + "</div>"; }

// ── Helpers ─────────────────────────────────────────────────────────────────

// The open spots screen (user, 2026-11-09): fully open first, then half-open; ‹ › step through them like the Thanksgiving screen.
var _fcSpots = [], _fcSpotI = 0;
function _fcSpotText() {
  var n = _fcSpots.length;
  if (!n) return "NO OPEN SPOTS<small>EVERY SLOT TAKEN</small>";
  var sp = _fcSpots[_fcSpotI];
  return FC_DAYS[sp.d].toUpperCase() + " " + _fcTime(sp.m) + "<small>" + (sp.free ? "WEEK " + sp.free + " FREE" : "OPEN") + " \u00b7 " + (_fcSpotI + 1) + " OF " + n + "</small>";
}
// Listed (user, 2026-11-09): every spot at once in one amber screen, two per column under its kind (OPEN / WEEK A FREE / WEEK B FREE).
// More than 5 columns would be too wide: then the ‹ › screen above.
function _fcSpotsHtml() {
  // Separate screens (user, 2026-11-09): fully open (captioned OPEN on the rack), half-open (HALF-OPEN, columns headed by the free week)
  var full = _fcSpots.filter(function(sp) { return !sp.free; });
  var halves = _fcSpots.filter(function(sp) { return sp.free; });   // which week is free not shown (user, 2026-11-09: "week not important")
  var halfCols = [];
  for (var j = 0; j < halves.length; j += 2) halfCols.push({ items: halves.slice(j, j + 2) });
  var fullCols = [];
  for (var i = 0; i < full.length; i += 2) fullCols.push({ items: full.slice(i, i + 2) });
  if (_fcSpots.length && fullCols.length + halfCols.length <= 5) {
    var scr = function(cols, cls, tip) {
      return "<span class='fc-slist" + cls + "' data-tip='" + tip + "'>" + cols.map(function(c) {
        return "<span>" + (c.head ? "<small>" + c.head + "</small>" : "") + c.items.map(function(sp) { return "<b>" + FC_DAYS[sp.d].toUpperCase() + "<i>" + _fcTime(sp.m) + "</i></b>"; }).join('') + "</span>";
      }).join('') + "</span>";
    };   // the day like the Load screen's 18, the time small like its WEEK A (user, 2026-11-09)
    var unit = function(cap, html) { return "<span class='fc-vert'><span class='fc-vcaps'><span class='cr-cap'>" + cap + "</span></span>" + html + "</span>"; };
    return (fullCols.length ? unit('Full open', scr(fullCols, ' fc-sfull', 'Fully open: any student.')) : '') +
           (halfCols.length ? unit('Half-open', scr(halfCols, ' fc-sfull', 'Half-open: biweekly only.')) : '');
  }
  var many = _fcSpots.length > 1;
  return "<span class='fc-spots'>" +
    "<button class='cr-btn' onclick='_fcSpot(-1)' aria-label='Previous open spot'" + (many ? "" : " disabled") + ">\u2039</button>" +
    "<span class='fc-slcd' id='fcSpotLcd' data-tip='Open = any student.\nWeek A / B free = biweekly only.'>" + _fcSpotText() + "</span>" +
    "<button class='cr-btn' onclick='_fcSpot(1)' aria-label='Next open spot'" + (many ? "" : " disabled") + ">\u203a</button></span>";
}
function _fcSpot(step) {
  var n = _fcSpots.length; if (!n) return;
  _fcSpotI = (_fcSpotI + step + n) % n;
  var el = document.getElementById('fcSpotLcd'); if (el) el.innerHTML = _fcSpotText();
}

function _fcTime(m) {
  var h = Math.floor(m / 60), mm = m % 60;
  return ((h % 12) || 12) + ':' + (mm < 10 ? '0' : '') + mm + (h >= 12 ? ' PM' : ' AM');
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
  if (typeof _calInjectStyle === 'function') _calInjectStyle();   // the rack parts (.cr-*) live in the Calendar tab's styles
  if (document.getElementById('fcStyle')) return;
  var st = document.createElement('style');
  st.id = 'fcStyle';
  st.textContent =
    // Same breakout as the Calendar tab so all days fit on desktop.
    "#fcBody{width:min(1200px,calc(100vw - 40px));position:relative;left:50%;transform:translateX(-50%)}" +
    ".fc-bigknob{position:relative;flex:none;width:104px;height:104px;zoom:.62}" +   // drawn at 104px, shown smaller so it fits the top layer
    ".fc-bigknob svg{position:absolute;left:0;top:0;stroke:#3a3a3a;stroke-width:1.2;font:8px 'DM Mono',monospace;fill:#5e5e5e;text-anchor:middle}" +
    ".fc-bigknob svg text{stroke:none}" +
    ".fc-bk{position:absolute;left:22px;top:22px;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 40% 30%,#3e3e3e,#1a1a1a 60%,#0c0c0c);box-shadow:0 4px 8px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.08)}" +
    ".fc-bk:after{content:'';position:absolute;left:29px;top:6px;width:2px;height:14px;border-radius:1px;background:#6e6e6e}" +
    ".fc-left{flex:none;width:160px;display:flex;align-items:center;gap:10px}.fc-modes{margin-left:-4px}" +
    ".fc-top{align-items:center}.fc-tgrp{min-width:0;display:flex;align-items:center}.fc-tgrp .cr-lcd{flex:1;min-width:0}.fc-tgrp3{justify-content:space-between}.fc-tgrp3>.fc-legend2{margin:0 auto}.fc-right{flex:none;width:260px;margin-left:14px;display:flex;justify-content:center}" +
    // full size again, centred on both layers (user, 2026-11-07): 100% = the top layer, + 16px gap + the 66px bottom layer
    ".fc-knobspot{position:relative;align-self:stretch}.fc-knobspot .fc-bigknob{zoom:1;position:absolute;left:50%;margin-left:-52px;top:calc((100% + 82px) / 2 - 52px)}.fc-rl{margin-left:10px}" +
    ".fc-screens{flex:1;margin-left:0;display:flex;gap:18px}" +
    ".fc-meters{min-width:0;display:flex;flex-direction:column;gap:5px}" +
    ".cr-row.fc-countrow{height:56px}"   /* the top rack's row: both racks 75px (user, 2026-11-09; was 84) */ +
    ".fc-title{align-self:center;padding:0 10px;height:15px;display:flex;align-items:center;justify-content:center;background:none;box-shadow:none;font:600 8px 'DM Mono',monospace;letter-spacing:2.5px;text-transform:uppercase;color:#6e6e6e}" +   // title text like the WEEK A caption, wider spacing (user, 2026-11-07)
    ".fc-screen,.fc-caps{display:grid;text-align:center}" +
    // the screen made like the THIS WEEK display: dark glass, inset shadow, the LCD green
    ".fc-screen{height:26px;align-items:center;border-radius:3px;background:#0a0c0a;border:1px solid #222;box-shadow:inset 0 2px 6px rgba(0,0,0,.8)}" +
    ".fc-screen b{font:500 12px 'DM Mono',monospace;letter-spacing:2px;color:oklch(.65 .16 29);text-shadow:0 0 5px oklch(.63 .19 29 / .35)}" +
    // the A / B meter: the Calendar's .cr-lr bars, green, in the slim screen (user, 2026-11-09)
    "#fcBody .fc-vert{flex:none;align-self:center;display:flex;align-items:center;gap:10px}#fcBody .fc-vert *{white-space:nowrap}" +   // vertical counts (user, 2026-11-09)
    "#fcBody .fc-spots{display:flex;align-items:center;gap:10px}" +   // the open spots screen (user, 2026-11-09)
    "#fcBody .fc-slcd{width:190px;height:36px;box-sizing:border-box;padding:0 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.25;border-radius:3px;background:#1b1006;border:1px solid #000;box-shadow:inset 0 2px 5px rgba(0,0,0,.9);font:10px 'DM Mono',monospace;letter-spacing:2px;color:oklch(.58 .09 70);text-shadow:0 0 4px oklch(.6 .12 60 / .18);white-space:nowrap}" +
    "#fcBody .fc-slcd small{font-size:8.5px;letter-spacing:1.5px;opacity:.75}" +
    "#fcBody .fc-slist{height:52px;box-sizing:border-box;padding:0 12px;display:flex;align-items:center;gap:16px;border-radius:3px;background:#0a0c0a;border:1px solid #000;box-shadow:inset 0 2px 5px rgba(0,0,0,.9);font:10px/14px 'DM Mono',monospace;letter-spacing:1.5px;color:oklch(.72 .08 145);text-shadow:0 0 5px oklch(.63 .19 145 / .35);white-space:nowrap}   /* WEEK A's green (user, 2026-11-09; was amber) */" +   // the listed spots (user, 2026-11-09)
    "#fcBody .fc-slist>span{display:flex;flex-direction:column;align-self:flex-start;padding-top:4px}#fcBody .fc-slist.fc-sfull>span{align-self:center;padding-top:0}#fcBody .fc-slist small{font-size:8px;opacity:.6}#fcBody .fc-slist b{font-weight:400;font-size:11px;display:flex;align-items:center;justify-content:space-between;gap:6px}#fcBody .fc-slist b i{font-style:normal;font-size:8px;opacity:.75}" +
    "#fcBody .fc-screens.fc-vpair{justify-content:center;align-items:center;gap:20px}" +
    "#fcBody .fc-vcaps,#fcBody .fc-vscreen{display:flex;flex-direction:column;justify-content:center;gap:2px}" +
    "#fcBody .fc-vcaps{align-items:flex-end}#fcBody .fc-vscreen.fc-vwide{width:auto;align-items:stretch;background:#1b1006}#fcBody .fc-vscreen.fc-vwide b{color:oklch(.58 .09 70);text-shadow:0 0 4px oklch(.6 .12 60 / .18)}#fcBody .fc-vwide>span{display:flex;align-items:center;justify-content:space-between;gap:12px}#fcBody .fc-vwide small{font:500 8px/14px 'DM Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;color:oklch(.58 .09 70);opacity:.75;text-shadow:0 0 4px oklch(.6 .12 60 / .18)}   /* the Thanksgiving screen's amber (user, 2026-11-09) */#fcBody .fc-vcaps .cr-cap{line-height:14px}" +
    "#fcBody .fc-vscreen{width:46px;box-sizing:border-box;padding:6px 10px;align-items:flex-end;border-radius:3px;background:#0a0c0a;border:1px solid #000;box-shadow:inset 0 4px 8px rgba(0,0,0,1),inset 0 -1px 0 rgba(255,255,255,.04),0 -1px 0 rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.11)}" +
    "#fcBody .fc-vscreen b{line-height:14px;font:500 11px/14px 'DM Mono',monospace;letter-spacing:1px;color:oklch(.65 .16 29);text-shadow:0 0 5px oklch(.63 .19 29 / .35)}" +
    "#fcBody .fc-screen.fc-ab{align-self:center;width:80px;height:26px;box-sizing:border-box;grid-template-columns:7px 1fr;align-content:center;gap:3px 4px;padding:0 6px}" +   // the Calendar's exact size (user, 2026-11-09)
    "#fcBody .fc-ab b{font:500 7px 'DM Mono',monospace;letter-spacing:0;color:oklch(.72 .08 145 / .75);text-shadow:0 0 6px oklch(.63 .19 145 / .4)}" +
    "#fcBody .fc-ab i{display:block;height:5px;border-radius:1px;background:repeating-linear-gradient(90deg,transparent 0 5px,#0a0c0a 5px 6px),linear-gradient(90deg,oklch(.72 .08 145) 0 var(--v),oklch(.28 .04 145) var(--v));box-shadow:0 0 5px oklch(.63 .19 145 / .25)}" +
    ".fc-legend2 i.pen{background:color-mix(in oklab, oklch(0.63 0.19 70) 55%, #1a1a1a);box-shadow:none}   /* toned down, no glow (user, 2026-11-07) */" +
    // on top of the Calendar's .cal-ev: nothing to drag here
    "#fcBody .cr-kn:after{background:#6e6e6e}" +
    // the selected button lit red like the Calendar tab's (user, 2026-11-09; was greyish white from 2026-11-07); its caption brighter
    "#fcBody .cr-col:has(.cr-pb.lit) .cr-cap{color:#a8a8a8}" +
    "#fcBody .cr-row+.cr-row{border-top:none}" +
    // even space above, between and below the two layers (user, 2026-11-07): rows as tall as their contents, 16px gaps
    "#fcBody .cal-bar{padding:16px 0;display:flex;flex-direction:column;gap:16px}#fcBody .cal-bar .cr-row{height:auto}" +
    // the thin double border (a dark ring + an outer line), as on the Calendar's racks and cab (user, 2026-11-07)
    "#fcBody .cal-bar,#fcBody .cal-inner{box-shadow:0 0 0 2px #1e1e1e,0 0 0 3px #2c2c2c}" +
    "#fcBody .cal-wrap{padding:3px;margin:0 -3px}" +   // room for the cab's ring inside the scroller (it clips)   // no line between the rack's two layers (user, 2026-11-07)
    // The rack the Home rack's width + double ring, like the Calendar's racks (user, 2026-11-09): knob block 260 → 110px, tighter gaps so it fits. Delete to undo.
    "html body #fcBody>.cal-bar.cr{width:min(752px,calc(100% - 8px));margin-left:auto;margin-right:auto;box-shadow:0 0 0 4px #1e1e1e,0 0 0 5px #2c2c2c;background-color:var(--rpm-box-bg,var(--box))}" +
    "#fcBody .cal-bar>.cr-row{padding:0 24px}#fcBody .fc-right{width:110px;margin-left:12px}#fcBody .fc-screens{gap:12px}" +
    "html body #fcBody>.cal-bar.cr{margin-bottom:12px}html body #fcBody>.cal-bar.cr.fc-rack2{margin-top:0;margin-bottom:53px}" +   // the two racks 2px apart; last rack → week grid 48px between the rings, as on the Calendar (user, 2026-11-09)
    // two racks (user, 2026-11-09): the top one the Home rack's height (56px row), the knob in it, smaller; the counts rack as tall as its screens
    "html body #fcBody .cal-bar{padding:8.5px 0;gap:0}html body #fcBody .cal-bar>.cr-row{height:56px}" +
    "#tab-fixedcal>.tab-refresh{top:22.5px;right:-44px}" +
    "#fcBody .cal-bar .cr-pb{width:16px;height:16px;border-radius:2.5px}" +   // push buttons the Home rack's size (user, 2026-11-09; were 22)   // ↻ just outside the top rack's right side, as on the Calendar
    "#fcBody .fc-right.fc-knobspot{display:flex;justify-content:flex-end}#fcBody .fc-knobspot{align-self:center}#fcBody .fc-tgrp3>.fc-bigknob{margin:0 auto;zoom:.55}" +   // the knob centred where the key was, sized to the rack (user, 2026-11-09)
    // the Home rack's face (grain) and its two small screws, one each side, centred (user, 2026-11-09; were four big corner screws)
    "html body #fcBody>.cal-bar.cr{background-image:var(--rpm-box-grain)}" +
    "#fcBody .cal-bar>.cr-bolt{top:calc(50% - 5.5px)!important;bottom:auto!important;width:11px;height:11px;box-shadow:none;background:radial-gradient(circle at 40% 35%,#2a2a2a,#121212 70%,#080808)}" +
    "#fcBody .cal-bar>.cr-bolt[style*='left']{left:12px!important}#fcBody .cal-bar>.cr-bolt[style*='right']{right:12px!important}" +
    "#fcBody .cal-bar>.cr-bolt:before,#fcBody .cal-bar>.cr-bolt:after{left:2.5px;right:2.5px;top:5px;height:1px;border-radius:0;background:#000}" +   // last rack → week grid: 48px between the rings, as on the Calendar (user, 2026-11-09)
    // Screens sunk into the panel (user, 2026-11-07): black rim, deep shadow from the top, a light lip along the bottom edge
    "#fcBody .cr-lcd,#fcBody .fc-screen{border:1px solid #000;box-shadow:inset 0 3px 9px rgba(0,0,0,.95),inset 0 -1px 0 rgba(255,255,255,.03),0 -1px 0 rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.08)}" +
    "#fcBody .fc-screen{height:30px;box-shadow:inset 0 4px 8px rgba(0,0,0,1),inset 0 -1px 0 rgba(255,255,255,.04),0 -1px 0 rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.11)}" +   // the slim screens sunk as deep as THIS WEEK (user, 2026-11-07)   // knob pointers dimmed to the ticks' grey (user, 2026-11-07)
    ".cal-ev.fc-ev{cursor:default;background-image:none;box-shadow:none;border-color:transparent}" +   // flat: just the colour, no button shading (user, 2026-11-07)
    ".cal-ev.fc-ev .n{color:var(--t-normal)}" +   // names dialled back to the time's grey (user, 2026-11-07)
    ".cal-ev.fc-ev.clash{outline:1px solid var(--accent)}" +
    ".cal-ev.fc-ev.pen{border:1px dashed oklch(0.63 0.19 70 / .7)}" +
    // Open: the rack's LCD green, a dashed outline, placed like a lesson card
    ".fc-open{position:absolute;left:3px;right:3px;z-index:1;box-sizing:border-box;border:1px dashed oklch(.72 .08 145 / .45);border-radius:4px;color:oklch(.72 .08 145);font:9px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:1.2px;display:flex;align-items:center;justify-content:center}";
  document.head.appendChild(st);
}
