// ─── TABS / TRAVEL.JS  (TRAVEL PLAN) ────────────────────────────────────────
// The "doing" surface. Two screens:
//   1) PLAN   — Leaving + Arriving pickers over a two-month calendar (each
//               follows the other); tap outside the trip to buffer it.
//               Calculate shows the impact ($ / lessons).
//   2) REVIEW — per-student breakdown (before / skip / resume) + the exact text
//               each student will receive. GO LIVE deletes the events, texts the
//               students (TEST → your own phone), and logs the trip.
//
// After GO LIVE everything lives in the TRIP SUMMARY tab (sent status, replies,
// confirmations, history). This tab is only for planning + running a trip.

var _travelState = {
  leaving:   '', arriving:  '',
  firstOff:  '', firstBack: '',
  picked:    false,      // a day picked yet (the pickers start on today)
  datesSet:  false,      // Set pressed on these dates
  location:  '',
  preview:   null,
  // TEST runs the trip on redpickmusic@gmail.com and texts your phone. Its bar
  // came off the tab 2026-10-18; the server still takes test=1, set true here
  // to try a changed flow.
  testMode:  false
};

function _travelTestParam() { return _travelState.testMode ? '&test=1' : ''; }
function _travelTestArgs(o)  { if (_travelState.testMode) o.test = '1'; return o; }

function initTravelTab() {
  _travelRenderPlan();
}


// ─── PLAN SCREEN ────────────────────────────────────────────────────────────

function _travelRenderPlan() {
  var section = document.getElementById('travelBody');
  if (!section) return;
  section.innerHTML = '';
  if (!_travelState.leaving) _travelStartToday();   // the pickers start on today

  // The pickers sit outside the redrawn parts, so stepping them keeps their keys.
  var cal = document.createElement('div');
  cal.className = 'tv-cal';
  // Sections titled like a window's ("1. Log" in the Log window), all red.
  var head = function (t, right) {   // no numbers (user, 2026-10-19); the steps under it carry them
    return "<div class='db-cx-head im-sec-head im-main-head tv-sec-head'><label class='field-label db-cx-t im-main-t'>" +
      t + "</label>" + (right || '') + "</div>";
  };
  // Two dates in one full-width frame: the first half washed red, the second green.
  var pair = function (a, b) {
    return "<div class='tv-dates'>" +
      "<div id='" + a + "' class='tv-date tv-date-off'></div>" +
      // between the boxes: two of the ▲▼ chevron tips turned outwards, < >, no line (user, 2026-10-19; was ⟷)
      "<span class='tv-dates-link' aria-hidden='true'><i class='l'>" + dtArrow(1) + "</i><i class='r'>" + dtArrow(1) + "</i></span>" +
      "<div id='" + b + "' class='tv-date tv-date-back'></div>" +
    "</div>";
  };
  cal.innerHTML =
    head('Set vacation dates', "<span id='travelResetSlot'></span>") +   // Reset top right (user, 2026-10-19)
    // The steps as a list like the legend's: the number where its circle sits (user, 2026-10-19).
    "<div class='tv-sec-note tv-steps'><span><i>1.</i>Adjust vacation dates</span><span><i>2.</i>Press Calculate</span></div>" +
    "<div class='tv-sec-icon'>" + LUGGAGE_ICON.replace(/class="[^"]*"/, 'class="win-icon"') + "</div>" +   // under the how-to line (user, 2026-10-19)
    pair('travelLeavingSlot', 'travelArrivingSlot') +
    "<div class='tv-dates-foot'><button class='link-btn red' id='travelSetBtn' onclick='_travelSetDates()'></button></div>" +
    "<div class='tv-lock-sum' id='travelLockSum'></div>" +   // Lock's own count: the vacation days only
    "<hr class='divider tv-sec-rule'>" +
    head('Set buffer') +
    "<div class='tv-sec-note tv-steps'><span><i>1.</i>Click the day you leave or the day you're back</span><span><i>2.</i>Use ← → to add buffer days</span></div>" +
    // The calendar's key lives here: first day off, first day teaching and buffer are all set in this section (user, 2026-10-19).
    "<div class='tv-cal-legend tv-buf-key'>" +
      "<span><i class='lg-trip'></i>Vacation dates</span>" +   // the grey Leave / Return ring (user, 2026-10-19)
      "<span><i class='lg-off'></i>First day off</span>" +
      "<span><i class='lg-back'></i>First day teaching</span>" +
    "</div>" +
    // The calendar under it still follows the dates above.
    "<div class='tv-cal-cols' id='travelCalMonths'></div>" +
    "<div class='tv-cal-head' id='travelCalHead'></div>" +
    "<div class='tv-lock-sum' id='travelBufSum'></div>";   // what the buffer days cost
  section.appendChild(cal);

  _travelRenderDateSpinner('travelLeavingSlot',  'Leave',  'leaving');
  _travelRenderDateSpinner('travelArrivingSlot', 'Return', 'arriving');
  _travelRenderCal();
  _travelSetBtn();
  _travelMarkStale();
  if (_travelState.datesSet) {        // back from Review: the counts are still right
    _travelLockSum(_travelState.lockSumHtml || '');
    _travelBufSum(_travelState.bufSumHtml || '');
  }
}


// ─── 1. VACATION DATES + 2. BUFFER + TRIP CALENDAR ──────────────────────────
// Leaving on / Back on are the travel days (the portal's date picker,
// rpmDtpHtml, with the year — a trip can run into the new year); Set fixes
// them. The two-month calendar (a trip never runs past two months) follows
// them, sliding to keep the day in view. A calendar tap goes to the open step:
// before Set it picks Leaving then Back on, after Set a tap before you leave
// or after you're back is the buffer — the first day off moves earlier, the
// first day teaching later (2026-10-19; the buffer had its own picker row for
// a day, was the pickers over two Mon–Sun week strips before that).

function _travelRenderDateSpinner(slotId, label, stateKey) {
  var wrap = document.getElementById(slotId);
  if (!wrap) return;
  var id = 'tv' + stateKey;
  wrap.innerHTML =
    rpmDtpHtml(id, { date: _travelState[stateKey], noTime: true, year: true, min: 'today', group: 'travel', onChange: function() {
      var s = _travelState, ymd = rpmDtpGet(id).date;
      s[stateKey] = ymd;
      s.picked = true;                    // today counts as Leaving once either moves
      _travelDatesMoved();
      _travelShowMonth(ymd);
      _travelRenderCal();
      _travelMarkStale();
    } });
  // The label sits in the box, before the date (2026-10-18; was a row above it).
  var cell = wrap.querySelector('.dtp-cell');
  if (!cell) return;
  cell.insertAdjacentHTML('afterbegin', "<span class='tv-in-label'>" + label + "<span class='tv-in-arrow'>→</span></span>");   // pointing at its date
  // ▲▼ over the date, not the middle of the box: shift them half the label's width (user, 2026-10-19).
  var shift = (cell.firstChild.offsetWidth - 6) / 2;   // less the box's 6px right padding
  wrap.querySelectorAll('.dtp-chev').forEach(function (c) { c.style.transform = 'translateX(' + shift + 'px)'; });
}

// The vacation dates moved: Set again, and the buffer starts over at none.
function _travelDatesMoved() {
  var s = _travelState;
  s.datesSet = false;
  s.bufKey = null;
  _travelLockSeq++;                   // a count still on its way is for the old dates: drop it
  _travelLockSum('');
  _travelBufSeq++;
  _travelBufSum('');
  s.firstOff = s.leaving;
  s.firstBack = _travelAddDays(s.arriving, 1);   // the Return day is a day off: teaching starts the day after (user, 2026-10-19)
  _travelSetBtn();
}

// Slide the two months so this day is on screen.
function _travelShowMonth(ymd) {
  var d = _ymdToDate(ymd), c = _travelState.calMonth;
  if (!d || !c) return;
  var k = (d.getFullYear() - c.getFullYear()) * 12 + d.getMonth() - c.getMonth();
  if (k < 0)      _travelState.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  else if (k > 1) _travelState.calMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

// The days as drawn: Arriving only counts once it is after Leaving.
// Until a day is picked the pickers sit on today, but the calendar shows nothing.
function _travelDays() {
  var s = _travelState;
  if (!s.picked) return { leaving: '', arriving: '', off: '', back: '' };
  var arr = s.arriving > s.leaving ? s.arriving : '';
  return { leaving: s.leaving, arriving: arr, off: s.firstOff, back: arr ? s.firstBack : '' };
}

// Set: the dates are the ones you mean. It opens 2. Buffer; moving a date closes it again.
function _travelSetDates() {
  if (!_travelDays().arriving) return;
  _travelState.datesSet = true;
  _travelSetBtn();
  _travelRenderCal();
  _travelLockCalc();
}

// Lock counts the vacation days (Leaving on up to Back on) once, against the
// calendar, and shows what they cost under the button (2026-10-19). Moving a
// date clears it; the dates are fixed while it counts, so it can't show a
// number for the wrong days (the old every-move scan could).
var _travelLockSeq = 0;

function _travelLockSum(html) {
  _travelState.lockSumHtml = html;
  var el = document.getElementById('travelLockSum');
  if (el) el.innerHTML = html;
}

function _travelLockCalc() {
  var s = _travelState, url = getScriptUrl();
  if (!url) return;
  var mySeq = ++_travelLockSeq;
  _travelLockSum("<span class='tv-cal-muted rpm-loading'>Counting lessons</span>");
  fetch(url + '?action=getTravelPreview&start=' + encodeURIComponent(s.leaving) + '&end=' + encodeURIComponent(_travelAddDays(s.arriving, 1)) + _travelTestParam())   // Leave through Return, both days in
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (mySeq !== _travelLockSeq) return;
      if (!data.success) { _travelLockSum("<span class='tv-cal-muted'>Couldn't count: " + _escapeHtml(data.message || 'unknown') + "</span>"); return; }
      var n = data.totalLessons || 0, d = _daysBetween(s.leaving, s.arriving) + 1;   // Leave and Return both counted
      var days = "<div><span class='tv-lock-n'>" + d + "</span> day" + (d === 1 ? '' : 's') + "</div>";   // days on their own line
      _travelLockSum(days + "<div>" + (n
        ? "<span class='tv-lock-n'>" + n + "</span> lesson" + (n === 1 ? '' : 's') +
          " <span class='tv-cal-muted'>·</span> <span class='tv-lock-n loss'>$" + (data.totalRevenue || 0).toLocaleString() + "</span> revenue loss"
        : "<span style='color:var(--green)'>no lessons</span>") + "</div>");
    })
    .catch(function () {
      if (mySeq === _travelLockSeq) _travelLockSum("<span class='tv-cal-muted'>Connection failed</span>");
    });
}

// Set dims once pressed (done).
function _travelSetBtn() {
  var s = _travelState, b = document.getElementById('travelSetBtn');
  var ok = !!_travelDays().arriving, on = ok && s.datesSet;
  if (b) {
    b.disabled = !ok || on;
    b.classList.toggle('is-done', on);
    var lv = document.getElementById('travelLeavingSlot');
    if (lv) lv.parentNode.classList.toggle('is-locked', on);   // Leave / Return dim with Lock; still there to change (user, 2026-10-19)
    b.innerHTML = LOCK_ICON + (on ? 'Calculated' : 'Calculate');   // locks the dates and counts them (user, 2026-10-19; was Lock, Set the dates before that)
  }
}

function _travelRenderCal() {
  var head = document.getElementById('travelCalHead');
  var months = document.getElementById('travelCalMonths');
  if (!head || !months) return;
  var s = _travelState, t = _travelDays();
  var now = new Date();
  var thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (!s.calMonth) s.calMonth = thisMonth;

  var line;
  if (!t.leaving)       line = "<span class='tv-cal-muted'>Pick the day you leave</span>";
  else if (!t.arriving) line = "<span class='tv-cal-muted'>Now pick the day you arrive back</span>";
  else {
    var n = _daysBetween(t.off, t.back), bb = _daysBetween(t.off, t.leaving), ba = _daysBetween(t.arriving, t.back) - 1;   // after the Return day
    var buf = [];
    if (bb > 0) buf.push(bb + ' before');
    if (ba > 0) buf.push(ba + ' after');
    line = n + " day" + (n === 1 ? '' : 's') + " off" +
           (buf.length ? "<span class='tv-cal-muted'> · buffer " + buf.join(', ') + "</span>" : "");
  }
  head.innerHTML =
    "<div class='tv-cal-hint'>" + line + "</div>" +
    "<div class='tv-cal-btns'>" +
      (t.back && s.datesSet ? "<button class='link-btn bright' id='travelReviewBtn' onclick='_travelGoReview()'>Review →</button>" : "") +
    "</div>";

  var rs = document.getElementById('travelResetSlot');
  if (rs) rs.innerHTML = t.leaving ? "<button class='link-btn' onclick='_travelClear()' data-tip='Reset days' data-tip-left>↺ Reset</button>" : "";

  var second = new Date(s.calMonth.getFullYear(), s.calMonth.getMonth() + 1, 1);
  months.innerHTML =
    _travelMonthHtml(s.calMonth, 'prev', s.calMonth <= thisMonth, t) +
    _travelMonthHtml(second, 'next', false, t);
}

function _travelMonthHtml(first, navSide, navOff, t) {
  var today = _dateToYmd(new Date()), locked = _travelState.datesSet, sel = _travelState.bufKey;
  // A ring shows once it's picked or moved off its travel day.
  var showOff  = locked && t.off  && (t.off < t.leaving || sel === 'off');
  var showBack = locked && t.back && (t.back > _travelAddDays(t.arriving, 1) || sel === 'back');
  var y = first.getFullYear(), m = first.getMonth();
  var name = first.toLocaleDateString('en-US', { month: 'short' });   // "Oct": no year, the dates above carry it (user, 2026-10-19)
  var html =
    "<div class='tv-cal-month'>" +
      "<div class='tv-cal-title'>" +
        "<button class='tv-cal-nav " + navSide + "'" + (navOff ? " disabled" : "") +
          " onclick='_travelCalStep(" + (navSide === 'prev' ? -1 : 1) + ")'>" + (navSide === 'prev' ? '‹' : '›') + "</button>" +
        name +
      "</div>" +
      "<div class='tv-cal-grid'>";
  ['M','T','W','T','F','S','S'].forEach(function(d) { html += "<div class='tv-cal-dow'>" + d + "</div>"; });
  var lead = (first.getDay() + 6) % 7;                 // Monday-first, like the rest of the portal
  for (var i = 0; i < lead; i++) html += "<div></div>";
  var days = new Date(y, m + 1, 0).getDate();
  for (var d = 1; d <= days; d++) {
    var ymd = _dateToYmd(new Date(y, m, d));
    // The days off are one grey band, the circles' height, trip and buffer
    // alike, and it stops at a circle's
    // edge instead of showing past it. Leave / Return are grey rings; the red
    // first day off and green first day teaching rings show once the dates are
    // locked (user, 2026-10-19; were red washes and stripes).
    var cls = 'tv-cal-day';
    if (ymd < today)                                              cls += ' is-past';
    if (ymd === t.leaving || ymd === t.arriving)                  cls += ' is-travel';
    if (showOff && ymd === t.off)                                 cls += ' is-off'  + (sel === 'off'  ? ' is-sel' : '');
    if (showBack && ymd === t.back)                               cls += ' is-back' + (sel === 'back' ? ' is-sel' : '');
    var dow = new Date(y, m, d).getDay();
    var band = _travelBand(!!_travelSeg(t, showBack, _travelAddDays(ymd, -1), ymd),
                           !!_travelSeg(t, showBack, ymd, _travelAddDays(ymd, 1)),
                           dow === 1 || d === 1, dow === 0 || d === days);   // a row or month starts / ends here
    html += "<button class='" + cls + "'" + (ymd < today ? " disabled" : " onclick=\"_travelPickDay('" + ymd + "')\"") +
            ">" + band + "<span>" + d + "</span></button>";
  }
  return html + "</div></div>";
}

// The band between two neighbouring days: 'trip' (both inside Leave–Return),
// 'buf' (a buffer day on either side), or '' (no band). A buffer after the trip
// runs on into the green ring.
function _travelSeg(t, showBack, a, b) {
  if (!t.arriving) return '';
  var off = function (d) { return d >= t.off && d < t.back; };
  var trip = function (d) { return d >= t.leaving && d <= t.arriving; };
  if (off(a) && off(b)) return trip(a) && trip(b) ? 'trip' : 'buf';
  if (off(a) && b === t.back && showBack && !trip(a)) return 'buf';
  return '';
}

// The band through one day: from its middle (a ring sits there) or its edge,
// out to the next day or to its middle. Where the band runs off a row or a
// month it rounds off instead of stopping square (user, 2026-10-19).
function _travelBand(left, right, rowStart, rowEnd) {
  if (!left && !right) return '';
  var r = (left && rowStart ? '16px' : '0') + ' ' + (right && rowEnd ? '16px' : '0') + ' ' +
          (right && rowEnd ? '16px' : '0') + ' ' + (left && rowStart ? '16px' : '0');
  return "<i class='tv-band' style='left:" + (left ? (rowStart ? '2px' : '0') : '50%') +
         ";right:" + (right ? (rowEnd ? '2px' : '0') : '50%') + ";border-radius:" + r + "'></i>";
}

// A tap goes to the open step: the vacation dates until Set, the buffer after.
function _travelPickDay(ymd) {
  var s = _travelState, t = _travelDays();
  if (!s.datesSet) {
    if (!t.leaving || t.arriving || ymd <= t.leaving) {    // a new Leaving (Back on waits on the same day)
      s.leaving = s.arriving = ymd;
      s.picked = true;
    } else s.arriving = ymd;                               // Back on
    rpmDtpSet('tvleaving',  s.leaving);
    rpmDtpSet('tvarriving', s.arriving);
    _travelDatesMoved();
  } else {
    if (ymd < t.leaving)        s.firstOff  = ymd;         // buffer before
    else if (ymd > t.arriving)  s.firstBack = ymd;         // buffer after: the tapped day is the first day teaching
    else if (ymd !== t.arriving && ymd !== t.leaving) return;   // inside the trip: already off
    // The ring this click belongs to takes the ← → keys: the Leave day (or a day
    // before it) the red first day off, the Return day (or a day after) the green
    // first day teaching (user, 2026-10-19).
    s.bufKey = ymd <= t.leaving ? 'off' : 'back';
    _rpmDtpLetGo();                                        // the keys leave the date boxes
    _travelRenderCal();
    _travelMarkStale();
    _travelBufCalcSoon();
    return;
  }
  _travelRenderCal();
  _travelMarkStale();
}

function _travelCalStep(n) {
  var c = _travelState.calMonth;
  _travelState.calMonth = new Date(c.getFullYear(), c.getMonth() + n, 1);
  _travelRenderCal();
}

// Every picker back on today, nothing picked, nothing set.
function _travelStartToday() {
  var s = _travelState;
  s.leaving = s.arriving = s.firstOff = s.firstBack = _dateToYmd(new Date());
  s.picked = false;
  s.datesSet = false;
  s.bufKey = null;
}

function _travelClear() {
  var s = _travelState;
  _travelStartToday();
  s.preview = null;
  rpmDtpSet('tvleaving', s.leaving);
  rpmDtpSet('tvarriving', s.arriving);
  _travelDatesMoved();
  _travelRenderCal();
  _travelMarkStale();
}

// No scan on a date move. Calculate (the Lock) counts the vacation days once;
// after it, each buffer tap counts only the buffer days, before and after, a
// small range each time (user, 2026-10-19: was one manual Calculate for the
// whole trip; the old every-move scan showed wrong numbers). A sequence token
// per count keeps only the newest answer. Review counts the whole trip once,
// first day off up to first day teaching, for the per-student texts.
var _travelPreviewSeq = 0, _travelBufSeq = 0;

// Called on every date change — drops the trip's full count.
function _travelMarkStale() {
  _travelState.preview = null;
  _travelPreviewSeq++;               // invalidate anything in flight
}

// ← → on the picked ring: a day earlier or later. The first day off stays on or
// before the day you leave (and not in the past); the first day teaching stays
// after the day you're back.
function _travelBufStep(dir) {
  var s = _travelState;
  if (!s.datesSet || !s.bufKey) return;
  if (s.bufKey === 'off') {
    var v = _travelAddDays(s.firstOff, dir);
    if (v > s.leaving || v < _dateToYmd(new Date())) return;
    s.firstOff = v;
    _travelShowMonth(v);
  } else {
    var w = _travelAddDays(s.firstBack, dir);
    if (w <= s.arriving) return;
    s.firstBack = w;
    _travelShowMonth(w);
  }
  _travelRenderCal();
  _travelMarkStale();
  _travelBufCalcSoon();
}

// Count once the keys rest: stepping a few days is one count, not one per day.
var _travelBufTimer = null;
function _travelBufCalcSoon() {
  clearTimeout(_travelBufTimer);
  _travelBufSeq++;                    // an older count must not paint over the new days
  _travelBufSum("<span class='tv-cal-muted'>…</span>");
  _travelBufTimer = setTimeout(_travelBufCalc, 700);
}

window.addEventListener('keydown', function (e) {
  var s = _travelState;
  if (!s.bufKey || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
  var tab = document.getElementById('tab-travel');
  if (!tab || !tab.classList.contains('active') || !document.getElementById('travelCalMonths')) return;
  var tg = e.target, tag = tg && tg.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
  if (typeof _rpmDtpActive !== 'undefined' && _rpmDtpActive) return;   // a date box has the keys
  e.preventDefault();
  if (e.key === 'Escape') { s.bufKey = null; _travelRenderCal(); return; }
  _travelBufStep(e.key === 'ArrowLeft' ? -1 : 1);
});

function _travelBufSum(html) {
  _travelState.bufSumHtml = html;
  var el = document.getElementById('travelBufSum');
  if (el) el.innerHTML = html;
}

function _travelPreviewUrl(start, end) {
  return getScriptUrl() + '?action=getTravelPreview&start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end) + _travelTestParam();
}

function _travelBufCalc() {
  var s = _travelState;
  if (!getScriptUrl()) return;
  var ranges = [];   // each side on its own line (user, 2026-10-19): Pre buffer, Post buffer
  if (s.firstOff < s.leaving)   ranges.push(['Pre buffer',  s.firstOff, s.leaving]);    // before you leave
  var dayAfter = _travelAddDays(s.arriving, 1);
  if (s.firstBack > dayAfter)   ranges.push(['Post buffer', dayAfter, s.firstBack]);    // after you're back
  var mySeq = ++_travelBufSeq;
  if (!ranges.length) { _travelBufSum(''); return; }
  _travelBufSum("<span class='tv-cal-muted rpm-loading'>Counting buffer</span>");
  Promise.all(ranges.map(function (r) { return fetch(_travelPreviewUrl(r[1], r[2])).then(function (x) { return x.json(); }); }))
    .then(function (res) {
      if (mySeq !== _travelBufSeq) return;
      var bad = res.filter(function (d) { return !d.success; })[0];
      if (bad) { _travelBufSum("<span class='tv-cal-muted'>Couldn't count: " + _escapeHtml(bad.message || 'unknown') + "</span>"); return; }
      _travelBufSum(ranges.map(function (r, i) {
        var d = res[i], days = _daysBetween(r[1], r[2]), n = d.totalLessons || 0;
        return "<div>" + r[0] + ": <span class='tv-lock-n'>" + days + "</span> day" + (days === 1 ? '' : 's') +
          " <span class='tv-cal-muted'>·</span> " + (n
            ? "<span class='tv-lock-n'>" + n + "</span> lesson" + (n === 1 ? '' : 's') +
              " <span class='tv-cal-muted'>·</span> <span class='tv-lock-n loss'>$" + (d.totalRevenue || 0).toLocaleString() + "</span>"
            : "<span style='color:var(--green)'>no lessons</span>") + "</div>";
      }).join(''));
    })
    .catch(function () { if (mySeq === _travelBufSeq) _travelBufSum("<span class='tv-cal-muted'>Connection failed</span>"); });
}

// Review: count the whole trip once (first day off up to first day teaching) and open the texts.
function _travelGoReview() {
  var s = _travelState, btn = document.getElementById('travelReviewBtn');
  if (!s.firstOff || !s.firstBack || s.firstOff >= s.firstBack || !getScriptUrl()) return;
  var mySeq = ++_travelPreviewSeq;
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  fetch(_travelPreviewUrl(s.firstOff, s.firstBack))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (mySeq !== _travelPreviewSeq) return;   // a date changed while it loaded → drop it
      if (!data.success) throw new Error(data.message || 'unknown');
      if (!data.totalLessons) { if (btn) { btn.disabled = false; btn.textContent = 'No lessons to cancel'; } return; }
      s.preview = data;
      _travelRenderReview();
    })
    .catch(function (e) {
      if (mySeq !== _travelPreviewSeq) return;
      if (btn) { btn.disabled = false; btn.textContent = 'Review →'; }
      addLog('travelFeed', '❌ ' + (e && e.message ? e.message : 'Connection failed'), 'error');
    });
}


// ─── REVIEW SCREEN ──────────────────────────────────────────────────────────

function _travelRenderReview() {
  var data = _travelState.preview;
  if (!data) return _travelRenderPlan();

  var section = document.getElementById('travelBody');
  section.innerHTML = '';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
  hdr.innerHTML =
    "<div>" +
      "<div style='font-size:13px;font-weight:600'>" + _travelState.firstOff + ' → ' + _travelState.firstBack + "</div>" +
      "<div style='font-size:11px;color:var(--muted)'>" +
        data.totalLessons + ' lessons · $' + (data.totalRevenue || 0).toLocaleString() + ' loss' +
      "</div>" +
    "</div>" +
    "<button id='travelBackToPrev' class='link-btn'>← Back</button>";
  section.appendChild(hdr);
  document.getElementById('travelBackToPrev').onclick = _travelRenderPlan;

  var noPhone = data.students.filter(function(s) { return !s.phone; }).map(function(s) { return s.name; });
  if (noPhone.length) {
    var warn = document.createElement('div');
    warn.style.cssText = 'border:1px solid rgba(255,107,107,0.5);background:rgba(255,107,107,0.1);color:#ff6b6b;border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.5';
    warn.innerHTML = "<b>⚠ " + noPhone.length + " student" + (noPhone.length === 1 ? '' : 's') +
      " with no number on file — will NOT be texted:</b><br>" + _escapeHtml(noPhone.join(', ')) +
      "<br><span style='color:var(--muted)'>Add a number in the Inquiries sheet, or text them by hand.</span>";
    section.appendChild(warn);
  }

  var list = document.createElement('div');
  list.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden;margin-bottom:14px';

  data.students.forEach(function(s, i) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:10px 12px;' + (i > 0 ? 'border-top:1px solid rgba(255,255,255,0.04);' : '');
    var beforeLine = (s.beforeDates && s.beforeDates.length)
      ? "<div style='font-size:11px;color:#5b9dff;margin-bottom:2px'>Before: " + s.beforeDates.join(', ') + "</div>"
      : '';
    var phoneLine = s.phone
      ? "<div style='font-size:11px;color:var(--muted);margin-bottom:2px'>📱 " + _escapeHtml(s.phone) + "</div>"
      : "<div style='font-size:11px;color:#ff6b6b;margin-bottom:2px;font-weight:600'>⚠ No number on file — will NOT be texted</div>";
    row.innerHTML =
      "<div style='display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px'>" +
        "<span style='font-weight:600;font-size:13px'>" + s.name + "</span>" +
        "<span style='font-size:11px;color:var(--muted)'>" + s.lessonCount + " × $" + s.rate + " = $" + s.revenueLoss + "</span>" +
      "</div>" +
      phoneLine +
      beforeLine +
      "<div style='font-size:11px;color:#ffa500;margin-bottom:2px'>Skip: " + s.skipDates.join(', ') + "</div>" +
      "<div style='font-size:11px;color:var(--green);margin-bottom:6px'>Resume: " + s.firstBack + "</div>" +
      "<div style='font-size:11px;color:var(--muted);background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:8px;line-height:1.5;white-space:pre-wrap'>" +
        "<span style='display:block;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin-bottom:3px'>📱 Text they'll get</span>" +
        _escapeHtml(s.smsText || '') +
      "</div>";
    list.appendChild(row);
  });
  section.appendChild(list);

  // Location (optional) — stored on the trip, shown in Trip History.
  var locWrap = document.createElement('div');
  locWrap.style.cssText = 'margin-bottom:12px';
  locWrap.innerHTML = "<label style='display:block;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Location (optional — shows in Trip History)</label>";
  var locInput = document.createElement('input');
  locInput.type = 'text';
  locInput.placeholder = 'e.g. Turkey';
  locInput.value = _travelState.location || '';
  locInput.style.cssText = 'width:100%;box-sizing:border-box;padding:9px 10px;font-size:13px;font-family:inherit;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)';
  locInput.oninput = function() { _travelState.location = locInput.value; };
  locWrap.appendChild(locInput);
  section.appendChild(locWrap);

  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px';

  var back = document.createElement('button');
  back.textContent = '← Back';
  back.style.cssText = 'flex:0 0 auto;padding:12px 18px;font-size:13px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer;letter-spacing:0.5px';
  back.onclick = _travelRenderPlan;
  actions.appendChild(back);

  var go = document.createElement('button');
  var goLabel = _travelState.testMode
    ? 'GO (TEST) — delete ' + data.totalLessons + ' · text YOU ×' + data.totalStudents
    : 'GO LIVE — delete ' + data.totalLessons + ' · text ' + data.totalStudents + ' students';
  go.textContent = goLabel;
  go.style.cssText = 'flex:1;padding:12px;font-size:12px;background:rgba(232,70,58,0.25);color:var(--accent);border:1px solid var(--accent);border-radius:4px;cursor:pointer;letter-spacing:0.5px;font-weight:600';
  go.onclick = function() {
    var who = _travelState.testMode
      ? 'Texts go to YOUR phone (test).'
      : 'Each student will be TEXTED their trip message now.';
    rpmConfirm({
      title: 'Delete ' + data.totalLessons + ' lessons across ' + data.totalStudents + ' students?',
      message: who + '\n\nSecretary also emails on its next hourly run.',
      confirmLabel: 'Delete and text',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      go.disabled = true; go.textContent = 'Working…';
      _travelExecute();
    });
  };
  actions.appendChild(go);
  section.appendChild(actions);
}

function _travelExecute() {
  var url = getScriptUrl(); if (!url) return;
  callScript(url, 'executeTravel', _travelTestArgs({ start: _travelState.firstOff, end: _travelState.firstBack, location: _travelState.location || '' }), function(data) {
    if (data && data.success) {
      var noPhone = (data.noPhone && data.noPhone.length) ? ' · ⚠ no phone: ' + data.noPhone.join(', ') : '';
      var failed  = data.textsFailed ? ' · ' + data.textsFailed + ' failed' : '';
      addLog('travelFeed',
        '✓ Deleted ' + data.deleted + ' · texted ' + data.textsSent + '/' + data.studentsLogged +
        (data.skipsLogged != null ? ' · ' + data.skipsLogged + ' skips logged' : '') + failed + noPhone,
        'success');
      _travelState.leaving = _travelState.arriving = _travelState.firstOff = _travelState.firstBack = '';
      _travelState.location = '';
      _travelState.preview = null;
      _travelRenderDone(data);
    } else {
      addLog('travelFeed', '❌ ' + (data && data.message ? data.message : 'Execute failed'), 'error');
      _travelRenderReview();
    }
  });
}

function _travelRenderDone(data) {
  var section = document.getElementById('travelBody');
  section.innerHTML = '';

  var card = document.createElement('div');
  card.style.cssText = 'border:1px solid var(--green);border-radius:6px;background:rgba(0,200,100,0.08);padding:18px;text-align:center;margin-bottom:14px';
  card.innerHTML =
    "<div style='font-size:15px;font-weight:700;color:var(--green);margin-bottom:8px'>✓ Trip is live</div>" +
    "<div style='font-size:12px;color:var(--text);line-height:1.6'>" +
      data.deleted + " lessons cancelled<br>" +
      data.textsSent + " / " + data.studentsLogged + " students texted" +
      (data.isTest ? " <span style='color:#ffb400'>(to your phone — test)</span>" : "") +
      (data.textsFailed ? "<br><span style='color:#ff6b6b'>" + data.textsFailed + " texts failed</span>" : "") +
      ((data.noPhone && data.noPhone.length) ? "<br><span style='color:#ffb400'>No phone on file: " + data.noPhone.join(', ') + "</span>" : "") +
    "</div>";
  section.appendChild(card);

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px';
  var summaryBtn = document.createElement('button');
  summaryBtn.textContent = 'View in Trip Summary →';
  summaryBtn.style.cssText = 'flex:1;padding:12px;font-size:13px;background:rgba(232,70,58,0.15);color:var(--accent);border:1px solid rgba(232,70,58,0.4);border-radius:4px;cursor:pointer;letter-spacing:0.5px';
  summaryBtn.onclick = function() { if (typeof switchTab === 'function') switchTab('tripsummary'); };
  btns.appendChild(summaryBtn);

  var planBtn = document.createElement('button');
  planBtn.textContent = 'Plan another';
  planBtn.style.cssText = 'flex:0 0 auto;padding:12px 18px;font-size:13px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer';
  planBtn.onclick = _travelRenderPlan;
  btns.appendChild(planBtn);
  section.appendChild(btns);
}


// ─── DATE HELPERS ───────────────────────────────────────────────────────────

function _travelAddDays(ymd, n) {
  var d = _ymdToDate(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + n);
  return _dateToYmd(d);
}

function _ymdToDate(s) {
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

function _dateToYmd(d) {
  var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

function _mondayOfWeek(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

function _daysBetween(earlierYmd, laterYmd) {
  if (!earlierYmd || !laterYmd) return 0;
  var a = _ymdToDate(earlierYmd), b = _ymdToDate(laterYmd);
  if (!a || !b) return 0;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function _escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
