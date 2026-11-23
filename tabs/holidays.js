// ─── TABS / HOLIDAYS.JS ──────────────────────────────────────────────────────
// Holidays Alerts: one list, two views (static, no backend calls).
//   By type       — three boxes: General (by impact), Personal, Derin's school
//                   2026–27 (real dates, by season); each group a sub-heading inside its box.
//   Chronological — the next 12 months from today, one box per month, each row
//                   its real date (school items without one sit at a rough "~").
// The view picked is remembered in this browser only.

var HOL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var HOL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                  'August', 'September', 'October', 'November', 'December'];

// Date rules: each returns the day in year y.
function _holFixed(m, d) { return function (y) { return new Date(y, m - 1, d); }; }
function _holNth(n, wd, m) {   // nth weekday of the month (wd 0 = Sun)
  return function (y) { var x = new Date(y, m - 1, 1); x.setDate(1 + (wd - x.getDay() + 7) % 7 + (n - 1) * 7); return x; };
}
function _holLast(wd, m) {     // last weekday of the month
  return function (y) { var x = new Date(y, m, 0); x.setDate(x.getDate() - (x.getDay() - wd + 7) % 7); return x; };
}
var _holThanks = _holNth(4, 4, 11);
function _holOnce(y0, m, d) {   // one exact date: only in year y0, nothing in other years
  return function (y) { return y === y0 ? new Date(y0, m - 1, d) : null; };
}

// box = the By type box a group sits in, sub = its heading there (none = no heading).
// n name · w when (By type) · s note after it · at date rule.
// One format everywhere: value · note, the note darker, short months (user 2026-10-24).
// Chronological: approx = the rough left label for a date that is only a guess;
// days = a run of days (left label Mon 23 – Fri 27); note = after the group tag;
// same = a Derin closure on a general holiday, folded into that row there.
var HOL_GROUPS = [
  { box: 'General', sub: 'Very high impact', tag: 'very high', items: [
    { n: "New Year's Day",   w: 'Jan 1',                s: 'long wknd sometimes', at: _holFixed(1, 1) },
    { n: 'Memorial Day',     w: 'Last Monday in May',   s: 'long wknd',           at: _holLast(1, 5) },
    { n: 'Independence Day', w: 'Jul 4',                s: 'long wknd sometimes', at: _holFixed(7, 4) },
    { n: 'Labor Day',        w: '1st Monday in Sep',    s: 'long wknd',           at: _holNth(1, 1, 9) },
    { n: 'Thanksgiving',     w: '4th Thursday in Nov',  s: 'often 4-day',         at: _holThanks },
    { n: 'Christmas Eve',    w: 'Dec 24',               s: 'long wknd often',     at: _holFixed(12, 24) },
    { n: 'Christmas Day',    w: 'Dec 25',               s: 'long wknd sometimes', at: _holFixed(12, 25) },
    { n: "New Year's Eve",   w: 'Dec 31',               s: 'long wknd often',     at: _holFixed(12, 31) }
  ]},
  { box: 'General', sub: 'Moderate impact', tag: 'moderate', items: [
    { n: 'Martin Luther King Jr. Day',         w: '3rd Monday in Jan', s: 'long wknd', at: _holNth(3, 1, 1) },
    { n: "Presidents' Day",                    w: '3rd Monday in Feb', s: 'long wknd', at: _holNth(3, 1, 2) },
    { n: "Indigenous Peoples' Day", w: '2nd Monday in Oct', s: 'long wknd', at: _holNth(2, 1, 10) }
  ]},
  { box: 'Personal', tag: 'personal', items: [
    { n: 'Wedding anniversary', w: 'Mar 31', at: _holFixed(3, 31) },
    { n: "Derin's birthday",    w: 'Jul 17', at: _holFixed(7, 17) },
    { n: "Yeliz's birthday",    w: 'Aug 9',  at: _holFixed(8, 9) },
    { n: 'My birthday',         w: 'Sep 22', at: _holFixed(9, 22) },
    { n: 'Halloween',           w: 'Oct 31', at: _holFixed(10, 31) }
  ]},
  // Derin's school: the real Hudson Montessori 2026–27 calendar (user, 2026-11-20; replaces the ~ guesses).
  // One-off dates (_holOnce) only show in their own year, so this needs the new school calendar each summer.
  { box: 'Derin (School 2026/27)', sub: 'Fall', tag: 'Derin', items: [
    { n: 'Labor Day',                  w: 'Mon Sep 7',              s: 'closed', same: 'Labor Day' },
    { n: "Indigenous Peoples' Day",    w: 'Mon Oct 12',             s: 'closed', same: "Indigenous Peoples' Day" },
    { n: 'Staff Development Day',      w: 'Fri Nov 6',              s: 'closed', at: _holOnce(2026, 11, 6), note: 'closed' },
    { n: 'Parent-Teacher Conferences', w: 'Thu Nov 12 – Fri Nov 13', s: '12:00 dismissal Thu, closed Fri', at: _holOnce(2026, 11, 12), days: 2, note: 'half day, then closed' },
    { n: 'Thanksgiving Break',         w: 'Wed Nov 25 – Fri Nov 27', s: 'closed · back Mon Nov 30', at: _holOnce(2026, 11, 25), days: 3, note: 'closed' }
  ]},
  { box: 'Derin (School 2026/27)', sub: 'Winter', tag: 'Derin', items: [
    { n: '3 PM dismissal',             w: 'Fri Dec 11',             s: 'no aftercare', at: _holOnce(2026, 12, 11) },
    { n: 'Holiday Cheer Day',          w: 'Fri Dec 18',             s: '12:00 dismissal · no aftercare', at: _holOnce(2026, 12, 18), note: 'half day' },
    { n: 'Winter Break',               w: 'Mon Dec 21 – Fri Jan 1', s: 'closed · back Mon Jan 4', at: _holOnce(2026, 12, 21), days: 12, note: 'closed' },
    { n: 'Martin Luther King Jr. Day', w: 'Mon Jan 18',             s: 'closed', same: 'Martin Luther King Jr. Day' },
    { n: 'Half day',                   w: 'Fri Jan 22',             s: '12:00 dismissal · no aftercare', at: _holOnce(2027, 1, 22), note: 'half day' },
    { n: "Presidents' Day",            w: 'Mon Feb 15',             s: 'closed', same: "Presidents' Day" }
  ]},
  { box: 'Derin (School 2026/27)', sub: 'Spring', tag: 'Derin', items: [
    { n: 'Parent-Teacher Conferences', w: 'Thu Mar 18 – Fri Mar 19', s: '12:00 dismissal Thu, closed Fri', at: _holOnce(2027, 3, 18), days: 2, note: 'half day, then closed' },
    { n: 'Spring Break',               w: 'Fri Mar 26 – Fri Apr 2', s: 'closed · back Mon Apr 5', at: _holOnce(2027, 3, 26), days: 8, note: 'closed' },
    { n: 'Half day',                   w: 'Fri Apr 30',             s: '12:00 dismissal · no aftercare', at: _holOnce(2027, 4, 30), note: 'half day' },
    { n: 'Memorial Day',               w: 'Mon May 31',             s: 'closed', same: 'Memorial Day' },
    { n: 'Last day of school',         w: 'Tue Jun 15',             s: '12:00 dismissal', at: _holOnce(2027, 6, 15), note: 'half day' },
    { n: 'Juneteenth',                 w: 'Fri Jun 18',             s: 'closed', at: _holOnce(2027, 6, 18), note: 'closed' }
  ]},
  { box: 'Derin (School 2026/27)', sub: 'Summer camp', tag: 'Derin', items: [
    { n: 'Summer camp starts',         w: 'Tue Jun 22',             s: 'session 1', at: _holOnce(2027, 6, 22) },
    { n: 'Independence Day observed',  w: 'Mon Jul 5',              s: 'camp closed', at: _holOnce(2027, 7, 5), note: 'camp closed' },
    { n: 'Summer camp ends',           w: 'Fri Aug 13',             s: '', at: _holOnce(2027, 8, 13) }
  ]}
];

function _holView() { try { return localStorage.getItem('holView') || 'type'; } catch (e) { return 'type'; } }

function initHolidaysTab() {
  _holStyle();
  _holRender(_holView());
}

function _holSetView(v) {
  try { localStorage.setItem('holView', v); } catch (e) {}
  _holRender(v);
}

function _holRender(v) {
  var body = document.getElementById('holBody');
  if (!body) return;
  document.querySelectorAll('#holViews [data-view]').forEach(function (b) { b.classList.toggle('lit', b.dataset.view === v); });
  body.innerHTML = v === 'chrono' ? _holChronoHtml() : _holTypeHtml();
}

function _holRow(l, v, sub) {
  return '<div class="ld-row"><span class="ld-l">' + l + '</span>' +
         '<span class="ld-v">' + v + (sub ? '<span class="hol-note"> · ' + sub + '</span>' : '') + '</span></div>';
}
// Archive's look (user, 2026-11-22): each group its own box with a red "Holidays · …"
// title; inside, a heading above each card (Very high impact, Fall …, or the month)
// in the Log window's label face, the card holding only the rows.
function _holBox(title, inner) {
  var bolts = typeof TD_BOLTS === 'string' ? TD_BOLTS : '';
  return '<div class="td-wk-box hol-box">' + bolts +
    '<div class="settings-title td-wk-title hol-era"><span>Holidays<span class="win-sub"> · ' + title + '</span></span></div>' +
    '<div class="ld-cards">' + inner + '</div></div>';
}
function _holCard(head, rows) {
  return '<div class="hol-group">' + (head ? '<div class="hol-yhead">' + head + '</div>' : '') +
    '<div class="ld-card hol-card">' + rows + '</div></div>';
}

function _holTypeHtml() {
  var boxes = [];
  HOL_GROUPS.forEach(function (g) {
    var b = boxes.length && boxes[boxes.length - 1].h === g.box ? boxes[boxes.length - 1] : null;
    if (!b) { b = { h: g.box, cards: '' }; boxes.push(b); }
    b.cards += _holCard(g.sub || '', g.items.map(function (i) { return _holRow(i.n, i.w, i.s); }).join(''));
  });
  return boxes.map(function (b) { return _holBox(b.h, b.cards); }).join('');
}

// Every dated item in [today, today + 1 year), soonest first.
function _holUpcoming() {
  var now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var end = new Date(start); end.setFullYear(end.getFullYear() + 1);
  var derinOff = {};   // general holidays Derin's school is also closed on
  HOL_GROUPS.forEach(function (g) { g.items.forEach(function (i) { if (i.same) derinOff[i.same] = 1; }); });
  var out = [];
  HOL_GROUPS.forEach(function (g) {
    g.items.forEach(function (i) {
      if (!i.at) return;
      [start.getFullYear(), start.getFullYear() + 1].forEach(function (y) {
        var d = i.at(y);
        if (!d) return;   // a one-off date from another year
        var last = new Date(d); if (i.days) last.setDate(d.getDate() + i.days - 1);
        if (last < start || d >= end) return;
        var tag = g.tag + (i.note ? ' · ' + i.note : '') + (derinOff[i.n] && g.tag !== 'Derin' ? ' · Derin closed' : '');
        out.push({ d: d, last: last, i: i, tag: tag, g: g });
      });
    });
  });
  return out.sort(function (a, b) { return a.d - b.d; });
}

function _holChronoHtml() {
  var byMonth = [], key = null;
  _holUpcoming().forEach(function (e) {
    var k = e.d.getFullYear() * 12 + e.d.getMonth();
    if (k !== key) { byMonth.push({ d: e.d, rows: [] }); key = k; }
    byMonth[byMonth.length - 1].rows.push(e);
  });
  return _holBox('Next 12 months', byMonth.map(function (m) {
    return _holCard(HOL_MONTHS[m.d.getMonth()] + ' ' + m.d.getFullYear(), m.rows.map(function (e) {
      var day = function (x) { return HOL_DAYS[x.getDay()] + ' ' + x.getDate(); };
      // A run into the next month names that month at the end: "Mon 21 – Fri Jan 1" (user, 2026-11-22; was "Fri 1").
      var end = e.last && e.last.getMonth() !== e.d.getMonth()
        ? HOL_DAYS[e.last.getDay()] + ' ' + HOL_MONTHS[e.last.getMonth()].slice(0, 3) + ' ' + e.last.getDate()
        : e.last && day(e.last);
      var l = e.i.approx || (e.i.days ? day(e.d) + ' – ' + end : day(e.d));
      return _holRow(l, e.i.n, e.tag);
    }).join(''));
  }).join('')).replace('class="td-wk-box hol-box"', 'class="td-wk-box hol-box hol-chrono"');
}

// The tab's own look, kept here (2026-11-22), copied from Archive's.
function _holStyle() {
  if (document.getElementById('holStyle')) return;
  var css =
    '#tab-holidays > #holTop { margin-top: 0; }' +
    // The 1U head box = Comms' TWILIO box: 75 tall (60 on screen), title centred, a screw each side (2026-11-22)
    '#tab-holidays .hol-headbox { position: relative; box-sizing: border-box; height: 112.5px; padding-top: 28px; padding-bottom: 0; }' +   // 2U (90 on screen) so the icon fits under the title (user, 2026-11-22)
    '#tab-holidays .hol-headbox .td-wk-title { margin-bottom: 0; }' +
    '#tab-holidays .hol-head-icon { margin: 10px 0 0; line-height: 0; }' +
    // Right side (user, 2026-11-22): the vents on top, the view switch under them, the pair centred top to bottom.
    '#tab-holidays .hol-right { position: absolute; right: 44px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; gap: 14px; }' +
    '#tab-holidays .hol-right { align-items: stretch; }' +
    '#tab-holidays .hol-vents { pointer-events: none; justify-content: space-between; }' +   // as wide as the switch under it (user, 2026-11-22)
    '#tab-holidays .hol-views { display: inline-flex; gap: 8px; margin: 0; }' +
    '#tab-holidays .hol-era { margin-bottom: 36px; }' +
    '#tab-holidays .hol-box .ld-cards { margin-bottom: 0; }' +
    '#tab-holidays .hol-group + .hol-group { margin-top: 30px; }' +
    '#tab-holidays .hol-yhead { margin: 0 0 16px 2px; font-family: "DM Mono", monospace; font-size: 11px; letter-spacing: 2px; line-height: 1.2; text-transform: uppercase; color: var(--t-normal); text-shadow: 0 -1px 0 rgba(0,0,0,.85), 0 1px 0 rgba(255,255,255,.07); }' +
    '#tab-holidays .hol-card { margin: 0 64px 0 28px; padding: 17px 18px; }' +
    '#tab-holidays .hol-card .ld-l { color: var(--t-normal); }';   // the names as readable as the dates (were the faint label grey)
  var st = document.createElement('style');
  st.id = 'holStyle';
  st.textContent = css;
  document.head.appendChild(st);
}
