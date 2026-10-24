// ─── TABS / HOLIDAYS.JS ──────────────────────────────────────────────────────
// Holidays Alerts: one list, two views (static, no backend calls).
//   By type       — three boxes: General (by impact), Personal, Derin's school
//                   calendar (by season); each group a sub-heading inside its box.
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
    { n: "Columbus / Indigenous Peoples' Day", w: '2nd Monday in Oct', s: 'long wknd', at: _holNth(2, 1, 10) }
  ]},
  { box: 'Personal', tag: 'personal', items: [
    { n: 'Wedding anniversary', w: 'Mar 31', at: _holFixed(3, 31) },
    { n: "Derin's birthday",    w: 'Jul 17', at: _holFixed(7, 17) },
    { n: "Yeliz's birthday",    w: 'Aug 9',  at: _holFixed(8, 9) },
    { n: 'My birthday',         w: 'Sep 22', at: _holFixed(9, 22) },
    { n: 'Halloween',           w: 'Oct 31', at: _holFixed(10, 31) }
  ]},
  { box: 'Derin · School calendar', sub: 'Fall', tag: 'Derin', items: [
    { n: 'Labor Day',                  w: 'Early Sep', s: 'closed', same: 'Labor Day' },
    { n: 'PD / In-Service Days',       w: 'Sep &amp; Oct', s: 'a couple of Friday closures', at: _holFixed(9, 15), approx: '~ Sep–Oct' },
    { n: 'Parent-Teacher Conferences', w: 'Late Oct or early Nov', s: 'two-day closure', at: _holFixed(10, 29), approx: '~ Late Oct', note: '2 days' },
    { n: 'Thanksgiving Break',         w: 'Week of Thanksgiving', s: 'closed a full week',
      at: function (y) { var t = _holThanks(y); t.setDate(t.getDate() - 3); return t; }, days: 5, note: 'closed all week' }
  ]},
  { box: 'Derin · School calendar', sub: 'Winter', tag: 'Derin', items: [
    { n: 'Winter Holiday Break',       w: "Christmas to New Year's", s: 'closed ~2 weeks', at: _holFixed(12, 21), approx: '~ Late Dec', note: '~2 weeks' },
    { n: 'Martin Luther King Jr. Day', w: '3rd Monday in Jan', s: 'closed', same: 'Martin Luther King Jr. Day' },
    { n: "Presidents' Day",            w: 'Mid-Feb', s: 'closed', same: "Presidents' Day" },
    { n: 'Parent-Teacher Conferences', w: 'Late Feb', s: 'two-day closure', at: _holFixed(2, 22), approx: '~ Late Feb', note: '2 days' }
  ]},
  { box: 'Derin · School calendar', sub: 'Spring', tag: 'Derin', items: [
    { n: 'Spring Break', w: 'Late Mar', s: 'closed ~1 week', at: _holFixed(3, 23), approx: '~ Late Mar', note: '~1 week' },
    { n: 'PD Days',      w: 'Apr &amp; May', s: 'a couple of scattered days', at: _holFixed(4, 15), approx: '~ Apr–May' },
    { n: 'Memorial Day', w: 'Late May', s: 'closed · end of the school year', same: 'Memorial Day' }
  ]}
];

function _holView() { try { return localStorage.getItem('holView') || 'type'; } catch (e) { return 'type'; } }

function initHolidaysTab() { _holRender(_holView()); }

function _holSetView(v) {
  try { localStorage.setItem('holView', v); } catch (e) {}
  _holRender(v);
}

function _holRender(v) {
  var body = document.getElementById('holBody');
  if (!body) return;
  document.querySelectorAll('#holViews .link-btn').forEach(function (b) { b.classList.toggle('lit', b.dataset.view === v); });
  body.innerHTML = v === 'chrono' ? _holChronoHtml() : _holTypeHtml();
}

function _holRow(l, v, sub) {
  return '<div class="ld-row"><span class="ld-l">' + l + '</span>' +
         '<span class="ld-v">' + v + (sub ? '<span class="hol-note"> · ' + sub + '</span>' : '') + '</span></div>';
}
function _holCard(title, rows) {
  return '<div class="inq-dcard ld-card"><div class="ld-title">' + title + '</div>' + rows + '</div>';
}

function _holTypeHtml() {
  var boxes = [];
  HOL_GROUPS.forEach(function (g) {
    var b = boxes.length && boxes[boxes.length - 1].h === g.box ? boxes[boxes.length - 1] : null;
    if (!b) { b = { h: g.box, rows: '' }; boxes.push(b); }
    b.rows += (g.sub ? '<div class="hol-sub">' + g.sub + '</div>' : '') +
              g.items.map(function (i) { return _holRow(i.n, i.w, i.s); }).join('');
  });
  return '<div class="ld-cards">' + boxes.map(function (b) { return _holCard(b.h, b.rows); }).join('') + '</div>';
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
        var last = new Date(d); if (i.days) last.setDate(d.getDate() + i.days - 1);
        if (last < start || d >= end) return;
        var tag = g.tag + (i.note ? ' · ' + i.note : '') + (derinOff[i.n] && g.tag !== 'Derin' ? ' · Derin closed' : '');
        out.push({ d: d, last: last, i: i, tag: tag });
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
  return '<div class="ld-cards hol-chrono">' + byMonth.map(function (m) {
    return _holCard(HOL_MONTHS[m.d.getMonth()] + ' ' + m.d.getFullYear(), m.rows.map(function (e) {
      var day = function (x) { return HOL_DAYS[x.getDay()] + ' ' + x.getDate(); };
      var l = e.i.approx || (e.i.days ? day(e.d) + ' – ' + day(e.last) : day(e.d));
      return _holRow(l, e.i.n, e.tag);
    }).join(''));
  }).join('') + '</div>';
}
