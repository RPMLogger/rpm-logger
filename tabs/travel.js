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
  // Section titles small and white like Dropbox's Storage; only the page title is red (user, 2026-10-23; were all red).
  var head = function (t, right) {   // no numbers (user, 2026-10-19); the steps under it carry them
    return "<div class='db-cx-head tv-sec-head tv-sub-head'><label class='field-label db-cx-t'>" +
      t + "</label>" + (right || '') + "</div>";
  };
  // Two dates in one full-width frame: the first half washed red, the second green.
  var pair = function (a, b) {
    return "<div class='tv-dates'>" +
      "<div id='" + a + "' class='tv-date tv-date-off'></div>" +
      // nothing between the boxes (user, 2026-10-19; the < > chevron tips came off, ⟷ before that)
      "<div id='" + b + "' class='tv-date tv-date-back'></div>" +
    "</div>";
  };
  cal.innerHTML =
    // The page title red with Reset on its line, one icon under it, like Today and Dropbox (user, 2026-10-23; was a grey label).
    "<div class='settings-title tv-page-title'><span>Travel Plan</span><span id='travelResetSlot'></span></div>" +
    "<div class='tv-sec-icon tv-page-icon'>" + SUITCASE_ICON.replace(/class="[^"]*"/, 'class="win-icon"') + "</div>" +
    // Where the trip goes, first; required for Review. Saved with the trip (Travel sheet col Q),
    // shown in Trip History (user, 2026-10-20; was optional, on the review screen).
    // In a box of its own like a Dashboard section: title on the washed band, the field under it (user, 2026-10-23).
    "<div class='tv-box'>" + head('Set vacation place') +
    // A WHERE TO tab before the field, like Leaving on / Back on (user, 2026-10-23; was the placeholder).
    "<div class='tv-box-body'><div class='tv-place-box'><span class='tv-in-label'>Where to</span>" +
    "<input class='tv-place' id='travelPlace' type='text' autocomplete='off' value='" +
      _escapeHtml(_travelState.location || '') + "' oninput='_travelPlaceInput(this.value)'></div></div></div>" +
    "<div class='tv-box'>" + head('Set vacation dates') + "<div class='tv-box-body'>" +   // boxed like Set vacation place (user, 2026-10-23)
    // The steps as a list like the legend's: the number where its circle sits (user, 2026-10-19).
    "<div class='tv-sec-note tv-steps'><span><i>1.</i>Adjust vacation dates</span><span><i>2.</i>Press Lock the dates</span></div>" +
    pair('travelLeavingSlot', 'travelArrivingSlot') +
    "<div class='tv-dates-foot'><button class='link-btn red' id='travelSetBtn' onclick='_travelSetDates()' data-tip='Instant.\nLocks the dates and counts the lessons.\nNothing is sent.' data-tip-left data-tip-wrap></button></div>" +
    "</div></div>" +
    "<div class='tv-box'>" + head('Set buffer') + "<div class='tv-box-body'>" +   // boxed with its calendar (user, 2026-10-23)
    "<div class='tv-buf-top'>" +   // steps left, the calendar's key on the right (user, 2026-10-19)
    "<div class='tv-sec-note tv-steps'><span><i>1.</i>Click on the dates to activate buffer</span><span><i>2.</i>Use keyboard arrows to add buffer days</span></div>" +
    // The calendar's key lives here: first day off, first day teaching and buffer are all set in this section (user, 2026-10-19).
    "<div class='tv-cal-legend tv-buf-key'>" +
      "<span class='lg-t-trip'><i class='lg-trip'></i><b>Vacation dates</b></span>" +   // the grey Leave / Return ring (user, 2026-10-19)
      "<span class='lg-t-off'><i class='lg-off'></i><b>First day off</b></span>" +
      "<span class='lg-t-back'><i class='lg-back'></i><b>First teaching day</b></span>" +   // (user, 2026-10-23; was First day teaching)
    "</div>" +
    "</div>" +
    // The calendar under it still follows the dates above.
    "<div class='tv-cal-cols' id='travelCalMonths'></div>" +
    "</div></div>" +
    "<div class='tv-box'>" + head('Cost analysis') + "<div class='tv-box-body'>" +   // boxed like the rest (user, 2026-10-23)
    "<div id='travelSumTable'></div>" +   // one table: Vacation / Pre buffer / Post buffer / Total (user, 2026-10-19)
    "</div></div>" +
    "<div class='tv-cal-head' id='travelCalHead'></div>";   // Review → last, under the table
  section.appendChild(cal);

  _travelRenderDateSpinner('travelLeavingSlot',  'Leaving on', 'leaving');   // user, 2026-10-19 (was Leave / Return)
  _travelRenderDateSpinner('travelArrivingSlot', 'Back on',    'arriving');
  _travelYearShow();
  _travelRenderCal();
  _travelSetBtn();
  _travelMarkStale();
  _travelSumRender();                 // back from Review: the counts are still right
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
      // Leave pushed onto or past Return: Return goes along, a day after it (user, 2026-10-19; it stayed on today).
      if (stateKey === 'leaving' && s.arriving <= ymd) {
        s.arriving = _travelAddDays(ymd, 1);
        rpmDtpSet('tvarriving', s.arriving);
      }
      s.picked = true;                    // today counts as Leaving once either moves
      _travelDatesMoved();
      _travelShowMonth(ymd);
      _travelRenderCal();
      _travelMarkStale();
    } });
  // The label sits in the box, before the date (2026-10-18; was a row above it).
  var cell = wrap.querySelector('.dtp-cell');
  if (!cell) return;
  cell.insertAdjacentHTML('afterbegin', "<span class='tv-in-label'>" + label + "</span>");   // no → after it (user, 2026-10-19)
  // ▲▼ inside the frame, a short column at the right end (user, 2026-10-23; were over and under the date).
  var col = document.createElement('span');
  col.className = 'tv-chevs';
  wrap.querySelectorAll('.dtp-chev').forEach(function (c) { col.appendChild(c); });
  cell.appendChild(col);
}

// The vacation dates moved: Set again, and the buffer starts over at none.
function _travelDatesMoved() {
  var s = _travelState;
  s.datesSet = false;
  s.bufKey = null;
  s.bufPicked = { off: false, back: false };
  _travelLockSeq++;                   // a count still on its way is for the old dates: drop it
  _travelBufSeq++;
  s.sum = {};
  _travelSumRender();
  s.firstOff = s.leaving;
  s.firstBack = _travelAddDays(s.arriving, 1);   // the Return day is a day off: teaching starts the day after (user, 2026-10-19)
  _travelSetBtn();
  _travelYearShow();
}

// The year shows in the date boxes only when the trip runs into the next year,
// Dec → Jan (user, 2026-10-19; was always shown).
function _travelYearShow() {
  var s = _travelState, cross = !!s.leaving && !!s.arriving && s.leaving.slice(0, 4) !== s.arriving.slice(0, 4);
  ['tvleaving', 'tvarriving'].forEach(function (id) {
    if (!_rpmDtp[id]) return;
    _rpmDtp[id].o.year = cross;
    rpmDtpPaint(id);
  });
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
  // Next step is the buffer: bring Set buffer to the top of the screen (user, 2026-10-21).
  var bh = [].slice.call(document.querySelectorAll('#travelBody .tv-sec-head')).filter(function (h) { return /set buffer/i.test(h.textContent); })[0];
  if (bh) window.scrollTo({ top: bh.getBoundingClientRect().top + window.pageYOffset - 16, behavior: 'smooth' });
}

// Lock counts the vacation days (Leaving on up to Back on) once, against the
// calendar, and shows what they cost under the button (2026-10-19). Moving a
// date clears it; the dates are fixed while it counts, so it can't show a
// number for the wrong days (the old every-move scan could).
var _travelLockSeq = 0;

// The counts, one table at the bottom of the page (user, 2026-10-19; were a table
// under Calculate and one per buffer side). s.sum holds a row per key: missing =
// not counted yet (—), '…' = counting, {err} = failed, {d, n, rev} = the count.
function _travelSumSet(key, val) {
  var s = _travelState;
  s.sum = s.sum || {};
  s.sum[key] = val;
  _travelSumRender();
}

function _travelSumRender() {
  var el = document.getElementById('travelSumTable');
  if (!el) return;
  var m = _travelState.sum || {}, errs = [];
  var ok = function (v) { return v && typeof v === 'object' && !v.err; };
  // One card, like the Students tab's, a line per row (user, 2026-10-19; was a table, then a card per row): name left, numbers right.
  var cells = function (v) {
    if (v === '…' || !ok(v)) {
      if (v && v.err) errs.push(v.err);
      // Counting: the portal's spinner in each cell, so it's clearly working (user, 2026-10-20; was …).
      var ph = v === '…' ? "<span class='tv-sum-none'><i class='rpm-loading tv-sum-spin'></i></span>"
                         : "<span class='tv-sum-none'>–</span>";   // en dash, shorter (user, 2026-10-20)
      return ph + ph + ph;
    }
    return "<span>" + v.d + "</span><span>" + v.n + "</span><span>$" + (v.rev || 0).toLocaleString() + "</span>";
  };
  var row = function (label, v, cls) { return "<div class='tv-sum-row" + (cls ? ' ' + cls : '') + "'><span class='tv-sum-name'>" + label + "</span>" + cells(v) + "</div>"; };
  var total;   // the trip plus whatever buffer is counted
  if (ok(m.trip)) {
    total = { d: 0, n: 0, rev: 0 };
    [m.trip, m.pre, m.post].forEach(function (v) { if (ok(v)) { total.d += v.d; total.n += v.n; total.rev += v.rev || 0; } });
  } else if (m.trip === '…') total = '…';
  el.innerHTML =
    "<div class='tv-sum-card'>" +
      "<div class='tv-sum-row tv-sum-cols'><span></span><span>Days</span><span>Lessons</span><span>Loss</span></div>" +   // Revenue dropped, fits the narrow table (user 2026-10-23)
      // Total first, then Vacation, then the buffers (user, 2026-10-20; Total was last)
      row('Total', total, 'tv-sum-total') + row('Vacation', m.trip) + row('Pre buffer', m.pre, 'tv-sum-buf') + row('Post buffer', m.post, 'tv-sum-buf') +
    "</div>" +
    (errs.length ? "<div class='tv-cal-muted tv-sum-err'>Couldn't count: " + _escapeHtml(errs[0]) + "</div>" : "");
}

function _travelLockCalc() {
  var s = _travelState, url = getScriptUrl();
  if (!url) return;
  var mySeq = ++_travelLockSeq;
  _travelSumSet('trip', '…');
  fetch(url + '?action=getTravelPreview&start=' + encodeURIComponent(s.leaving) + '&end=' + encodeURIComponent(_travelAddDays(s.arriving, 1)) + _travelTestParam())   // Leave through Return, both days in
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (mySeq !== _travelLockSeq) return;
      if (!data.success) { _travelSumSet('trip', { err: data.message || 'unknown' }); return; }
      _travelSumSet('trip', { d: _daysBetween(s.leaving, s.arriving) + 1, n: data.totalLessons || 0, rev: data.totalRevenue || 0 });   // Leave and Return both counted
    })
    .catch(function () {
      if (mySeq === _travelLockSeq) _travelSumSet('trip', { err: 'connection failed' });
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
    b.innerHTML = LOCK_ICON + (on ? 'Dates locked' : 'Lock the dates');   // red (user, 2026-10-23; was amber Calculate / Calculated, Lock and Set the dates before that)
  }
}

// Review waits for Calculate, both rings clicked and a vacation place (user, 2026-10-20).
function _travelReviewReady() {
  var s = _travelState, t = _travelDays();
  return !!(t.back && s.datesSet && s.bufPicked && s.bufPicked.off && s.bufPicked.back && (s.location || '').trim());
}

function _travelPlaceInput(v) {
  _travelState.location = v;
  var btn = document.getElementById('travelReviewBtn');
  if (btn) btn.disabled = !_travelReviewReady();
}

function _travelRenderCal() {
  var head = document.getElementById('travelCalHead');
  var months = document.getElementById('travelCalMonths');
  if (!head || !months) return;
  var s = _travelState, t = _travelDays();
  var now = new Date();
  var thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (!s.calMonth) s.calMonth = thisMonth;

  head.innerHTML =
    "<div class='tv-cal-hint'></div>" +   // no hint line (user, 2026-10-19: was "Pick the day you leave" / the days-off count)
    "<div class='tv-cal-btns'>" +
      // Always shown; dimmed until Calculate is pressed and both rings, red and green, are clicked
      // (no buffer is fine, but it's said by clicking) (user, 2026-10-19; was hidden till Calculate).
      "<button class='link-btn amber' id='travelReviewBtn' onclick='_travelGoReview()' data-tip='Opens the next page.\nEach student&#39;s dates and text.\nNothing is sent yet.' data-tip-left data-tip-wrap" +
        (_travelReviewReady() ? "" : " disabled") + ">Review texts →</button>" +   // (user, 2026-10-21; was Review →)
    "</div>";

  var rs = document.getElementById('travelResetSlot');
  // Always there, left of Calculate; dimmed until a day is picked (user, 2026-10-20).
  if (rs) rs.innerHTML = "<button class='link-btn' onclick='_travelClear()' data-tip='Instant.\nBoth dates back to today.\nClears the buffer and the counts.' data-tip-left data-tip-wrap" + (t.leaving ? "" : " disabled") + ">↺ Reset</button>";

  var second = new Date(s.calMonth.getFullYear(), s.calMonth.getMonth() + 1, 1);
  months.innerHTML =
    _travelMonthHtml(s.calMonth, 'prev', s.calMonth <= thisMonth, t) +
    _travelMonthHtml(second, 'next', false, t);
}

function _travelMonthHtml(first, navSide, navOff, t) {
  var today = _dateToYmd(new Date()), locked = _travelState.datesSet, sel = _travelState.bufKey;
  // The red and green rings show as soon as Calculate is pressed, on their
  // starting days (first day off = Leaving on, first day teaching = the day after
  // Back on) (user, 2026-10-20; they waited for a click before).
  var showOff  = locked && !!t.off;
  var showBack = locked && !!t.back;
  var y = first.getFullYear(), m = first.getMonth();
  var name = first.toLocaleDateString('en-US', { month: 'short' });   // "Oct": short, no year, the dates above carry it (user, 2026-10-19; full names tried and dropped)
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
    // Nothing picked yet: the rings sit on the pickers' day, today, so they're always there (user, 2026-10-20).
    else if (!_travelState.picked && (ymd === _travelState.leaving || ymd === _travelState.arriving)) cls += ' is-travel';
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
    s.bufPicked[s.bufKey] = true;                          // its ring stays once clicked: zero buffer is a choice too
    _travelShowMonth(s.bufKey === 'off' ? s.firstOff : s.firstBack);   // the green ring can fall in the next month
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
  s.bufPicked = { off: false, back: false };
  s.sum = {};
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
  _travelSumSet(_travelState.bufKey === 'back' ? 'post' : 'pre', '…');   // the side being moved
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

function _travelPreviewUrl(start, end) {
  return getScriptUrl() + '?action=getTravelPreview&start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end) + _travelTestParam();
}

function _travelBufCalc() {
  var s = _travelState;
  if (!getScriptUrl()) return;
  // Each side the rings have been clicked on: none yet = — , no days = 0, days = counted.
  var dayAfter = _travelAddDays(s.arriving, 1);
  var sides = [['pre',  s.bufPicked.off,  s.firstOff, s.leaving],     // before you leave
               ['post', s.bufPicked.back, dayAfter,   s.firstBack]];  // after you're back
  var mySeq = ++_travelBufSeq;
  sides.forEach(function (sd) {
    var key = sd[0], picked = sd[1], from = sd[2], to = sd[3];
    if (from >= to) { _travelSumSet(key, picked ? { d: 0, n: 0, rev: 0 } : undefined); return; }
    _travelSumSet(key, '…');
    fetch(_travelPreviewUrl(from, to)).then(function (x) { return x.json(); })
      .then(function (d) {
        if (mySeq !== _travelBufSeq) return;
        _travelSumSet(key, d.success ? { d: _daysBetween(from, to), n: d.totalLessons || 0, rev: d.totalRevenue || 0 } : { err: d.message || 'unknown' });
      })
      .catch(function () { if (mySeq === _travelBufSeq) _travelSumSet(key, { err: 'connection failed' }); });
  });
}

// Dim the plan (everything but the Review row) and block clicks while Review texts loads.
function _travelPlanDim(on) {
  var c = document.querySelector('#travelBody .tv-cal');
  if (!c) return;
  if (on && document.activeElement) document.activeElement.blur();   // a focused button would glow through the dim
  c.classList.toggle('tv-loading', !!on);
  // Everything dims, Review's button too, and "Gathering data…" sits mid-screen (user, 2026-10-23; the button had its own spinner).
  var msg = c.querySelector('.rpm-load-center');
  if (on && !msg) c.insertAdjacentHTML('beforeend', "<div class='rpm-load-center rpm-keep'><span class='rpm-loading'>Gathering data…</span></div>");
  else if (!on && msg) msg.remove();
}

// Review: count the whole trip once (first day off up to first day teaching) and open the texts.
function _travelGoReview() {
  var s = _travelState, btn = document.getElementById('travelReviewBtn');
  if (!s.firstOff || !s.firstBack || s.firstOff >= s.firstBack || !getScriptUrl()) return;
  var mySeq = ++_travelPreviewSeq;
  if (btn) btn.disabled = true;   // dims with the page; the spinner is mid-screen now (user, 2026-10-23)
  _travelPlanDim(true);   // the page steps back while it gathers the texts (user, 2026-10-21)
  fetch(_travelPreviewUrl(s.firstOff, s.firstBack))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (mySeq !== _travelPreviewSeq) return;   // a date changed while it loaded → drop it
      if (!data.success) throw new Error(data.message || 'unknown');
      if (!data.totalLessons) { _travelPlanDim(false); if (btn) { btn.disabled = false; btn.classList.remove('tv-busy'); btn.textContent = 'No lessons to cancel'; } return; }
      s.preview = data;
      _travelRenderReview();
    })
    .catch(function (e) {
      if (mySeq !== _travelPreviewSeq) return;
      if (btn) { btn.disabled = false; btn.classList.remove('tv-busy'); btn.textContent = 'Review texts →'; }
      _travelPlanDim(false);
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
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px';
  // No dates / lessons / loss line: reaching Review means the trip is decided (user, 2026-10-20).
  // A red title like the plan screen's sections, the phone (om-99) under it (user, 2026-10-20).
  hdr.innerHTML =
    "<div class='tv-cal' style='background:none;border:0;padding:0;margin:0;flex:1'>" +
      "<div class='db-cx-head im-sec-head im-main-head tv-sec-head'><label class='field-label db-cx-t im-main-t'>Dates and texts</label></div>" +
      "<div class='tv-sec-icon tv-icon-top'>" + PHONE_ICON.replace('class="win-icon"', 'class="win-icon" style="height:42px;width:auto"') + "</div>" +
      // Steps left, the date cells' key right, like Set buffer's (user, 2026-10-20; the cells had labels on top).
      "<div class='tv-buf-top tv-rv-top'>" +   // key under the steps (user, 2026-10-21; was on the right)
        "<div class='tv-sec-note tv-steps'><span><i>1.</i>Check each student's lessons, dates and text</span><span><i>2.</i>Press Go live to send</span></div>" +
        "<div class='tv-rv-key'>" +
          "<span><i class='tv-c-before'></i>Lesson</span>" +   // green = a lesson, red = none; Before and Resume both green (user, 2026-10-20)
          "<span><i class='tv-c-skip'></i>Skip</span>" +
          "<span><i class='tv-c-resume'></i>Resume</span>" +   // Resume's grey wash in the key too (user, 2026-10-21)
        "</div>" +
      "</div>" +
    "</div>" +
    "<button id='travelBackToPrev' class='link-btn' data-tip='Back to the plan.\nDates and buffer stay as set.' data-tip-left data-tip-wrap>← Back</button>";
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

  // One card per student, the Inquiries / Initiate card (user, 2026-10-20; was rows in one box).
  var list = document.createElement('div');
  list.style.cssText = 'margin-bottom:14px';

  data.students.forEach(function(s) {
    var f = function (k, v, style) { return "<span class='inq-flabel'>" + k + "</span><span class='inq-fval'" + (style ? " style='" + style + "'" : '') + ">" + v + "</span>"; };
    var card = document.createElement('div');
    card.className = 'inq-dcard accepted tv-rv-card';   // dimmed red edge, like Trip Summary's (user, 2026-10-21)
    card.style.marginBottom = '20px';   // more room between cards (user, 2026-10-20)
    card.innerHTML =
      // The money on the right, the lesson count under it (user, 2026-10-20; was "1 × $110 = $110" top left).
      "<div style='display:flex;justify-content:space-between;align-items:flex-start;gap:12px'>" +
        "<div class='inq-name-line' style='margin-top:0'><span class='inq-name'>" + _escapeHtml(s.name) + "</span></div>" +
        "<div style='text-align:right;font-family:\"DM Mono\",monospace;line-height:1.4'>" +
          // Just the count, no money, in the old first line's font (user, 2026-10-20; was "2 × $95 = $190" over "2 LESSONS").
          "<div style='font-size:13px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px'>Skipping " + s.lessonCount + " lesson" + (s.lessonCount === 1 ? '' : 's') + "</div>" +
        "</div>" +
      "</div>" +
      // Two sections per card, 1. Dates then 2. Text message: Bebas like the red title, in grey (user, 2026-10-20).
      // 1. Schedule, then its calendar-grid icon (om-102) under it (user, 2026-10-21).
      "<label class='field-label' style='color:rgba(255,255,255,.5);margin:22px 0 0'>1. Schedule</label>" +   // (user, 2026-10-21; was Dates)
      "<div class='ts-th-icon' style='margin:14px 0 18px'>" + SCHEDULE_ICON.replace(/class="[^"]*"/, 'class="ts-lbl-icon tv-rv-cal-icon"') + "</div>" +   // om-102 calendar grid (user, 2026-10-21)   // title, then its icon (user, 2026-10-21)
      // One row of date cells, left to right, like the Counter grid on Payments Audit (user, 2026-10-20; was Before / Skip / Resume lines).
      "<div class='tv-rv-dates'>" +
        // Each group stays together, so a wrap moves the whole group (user, 2026-10-21).
        // The group's word over its first box, → over the ones after it (user, 2026-10-21).
        [(s.beforeDates || []).map(function (d, i) { return _travelDateCell(i ? '→' : 'Before', d, 'tv-c-before'); }).join(''),
         s.skipDates.map(function (d, i) { return _travelDateCell(i ? '→' : 'Skip', d, 'tv-c-skip'); }).join(''),
         _travelDateCell('Resume', String(s.firstBack || '').replace(/,\s*\d{1,2}:\d{2}\s*[AP]M\s*$/i, ''), 'tv-c-resume')]   // date only; the time is in the line under the box (user, 2026-10-21)
          .filter(Boolean)
          .map(function (g) { return "<span class='tv-rv-group'>" + g + "</span>"; })   // no › between groups (user, 2026-10-21)
          .join('') +
      "</div>" +
      // Under the box, right, in the SKIPPING N LESSONS style: when they're back, with the time (user, 2026-10-21).
      "<div class='tv-rv-resume'>Resume on: <span class='tv-rv-resume-d'>" + _escapeHtml(_travelResumeLine(s.firstBack)) + "</span></div>" +   // the date in normal case (user, 2026-10-21)
      // Read-only, so the card's own colour, not the black of a box you type in; dashed blue like the Dropbox drop zone (user, 2026-10-20).
      // The header above the box, not inside it (user, 2026-10-20).
      "<hr class='divider' style='margin:32px 0 0'>" +   // a line between Dates and Text message (user, 2026-10-20)
      // 2. Text message, then the hand-and-phone under it (user, 2026-10-21).
      "<label class='field-label' style='color:rgba(255,255,255,.5);margin:32px 0 6px'>2. Text message</label>" +
      // The number it goes to, under the title, then the phone icon, then the text (user, 2026-10-21).
      "<div style='font-family:\"DM Mono\",monospace;font-size:10.5px;color:" + (s.phone ? "rgba(255,255,255,.5)" : "#ff6b6b") + "'>" +
        (s.phone ? _escapeHtml(s.phone) : '⚠ No number on file — will NOT be texted') + "</div>" +
      "<div class='ts-th-icon' style='margin:14px 0 18px'>" + PHONE_ICON.replace('class="win-icon"', 'class="ts-lbl-icon"') + "</div>" +
      // The text as it will look in Trip Summary's thread: a blue bubble on the right in the
      // dashed box; no time, it isn't sent yet (user, 2026-10-21; was plain text in the box).
      "<div class='ts-thread tv-rv-thread'>" +
        "<div class='ts-bub tv-rv-bub'>" + _escapeHtml(s.smsText || '') + "</div>" +
      "</div>";
    list.appendChild(card);
  });
  section.appendChild(list);

  // Location is set on the plan screen now (Set vacation place, required); executeTravel sends _travelState.location.

  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:16px';   // one row: what it does left, Go live right (user, 2026-10-21; was stacked)   // even with the line → divider gap (user, 2026-10-21; was 14px)   // the steps, then Go live, then what it does (user, 2026-10-20)

  // No ← Back here: the one at the top is enough; only Go live (user, 2026-10-20).

  var go = document.createElement('button');
  // The button says only Go live; what it does is the line beside it (user, 2026-10-20).
  var what = document.createElement('span');
  what.style.cssText = 'font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px';   // left of the button
  what.textContent = _travelState.testMode
    ? 'Texts YOU ×' + data.totalStudents + ' (test) · deletes ' + _travelPlural(data.totalLessons, 'lesson') + ' from calendar'
    : 'Texts ' + _travelPlural(data.totalStudents, 'student') + ' · deletes ' + _travelPlural(data.totalLessons, 'lesson') + ' from calendar';   // texts first (user, 2026-10-20); 1 student / 1 lesson (2026-10-21)
  actions.appendChild(what);
  // The portal's button (link-btn, red like Trial's danger ones) with the warning sign (om-101) (user, 2026-10-20).
  go.className = 'link-btn red opens-window';   // ▸: a popup asks first (portal rule, 2026-10-21)
  go.style.cssText = 'font-size:11px;padding:8px 16px;gap:8px;flex:none';   // a touch smaller, the same as Activate in its popup (user, 2026-10-21; was 12px, 9px 20px)
  go.classList.add('tv-golive-btn');   // red wash (user, 2026-10-21)
  go.innerHTML = WARN_ICON.replace('width="13" height="12"', 'width="14" height="13"') + '<span>' + (_travelState.testMode ? 'Go live (test)' : 'Go live') + '</span>';
  go.onclick = function() {
    // Warning / Upon activation: what Go live does, an arrow per point (user, 2026-10-21; were dashes) (user, 2026-10-21; was "Delete N lessons across N students?").
    var nL = data.totalLessons, nS = data.totalStudents;
    rpmConfirm({
      title: 'Warning!',
      subtitle: 'Upon activation:',   // small grey line under it (user, 2026-10-21)
      message:
        '→ ' + nL + ' lesson' + (nL === 1 ? '' : 's') + ' across ' + nS + ' student' + (nS === 1 ? '' : 's') + ' will be deleted from the calendar.\n\n' +
        '→ ' + (_travelState.testMode ? 'The texts go to YOUR phone (test): ' : 'Each student is texted ') +
          'their last lesson before the trip, the skipped dates and the day they resume.\n\n' +
        '→ On its next hourly run, Secretary sees the cancelled lessons and emails each student about them.',
      confirmLabel: 'Activate',
      icon: WARN_ICON,   // the warning sign on Activate (user, 2026-10-21)
      danger: true,
      className: 'tv-golive-dlg'   // bigger, both buttons red (user, 2026-10-21)
    }).then(function (ok) {
      if (!ok) return;
      go.disabled = true; go.classList.add('tv-busy'); go.classList.remove('opens-window'); go.innerHTML = "<span class='rpm-loading'>Working</span>";   // spinner while it deletes and texts (user, 2026-10-20)
      _travelExecute();
    });
  };
  go.setAttribute('data-tip', 'Asks first.\nDeletes the skipped lessons from the calendar.\nTexts each student their message.\nSecretary emails them within the hour.');
  go.setAttribute('data-tip-wrap', '');
  actions.appendChild(go);
  // The Texts line + Go live under the header, full width so Go live lines up with the cards' right edge (user, 2026-10-21).
  var top = hdr.querySelector('.tv-cal'), steps = top.querySelector('.tv-buf-top');
  steps.style.marginBottom = '0';
  actions.style.marginTop = '28px';   // room under the legend (user, 2026-10-21; was 6px)
  section.insertBefore(actions, list);
  // A divider line before the cards and one after them (user, 2026-10-20).
  var hrTop = document.createElement('hr'); hrTop.className = 'divider'; hrTop.style.margin = '20px 0 24px';   // 20 over it = Go live → line (user, 2026-10-21)
  var hrEnd = document.createElement('hr'); hrEnd.className = 'divider'; hrEnd.style.margin = '24px 0';
  section.insertBefore(hrTop, list);
  section.appendChild(hrEnd);
}

// "Mon Dec 8, 5:00 PM" -> "Mon, Dec 8 at 5:00 PM".
function _travelResumeLine(fb) {
  return String(fb || '').replace(/^([A-Za-z]{3}),?\s+/, '$1, ').replace(/,\s*(\d{1,2}:\d{2}\s*[AP]M)\s*$/i, ' at $1');
}

// "1 student" / "2 students".
function _travelPlural(n, word) { return n + ' ' + word + (Number(n) === 1 ? '' : 's'); }

// A date cell for the review cards, the weekday dropped ("Sun Nov 8" → "Nov 8").
function _travelDateCell(label, d, cls) {
  var txt = String(d || '').replace(/^[A-Za-z]{3},?\s+/, '');
  // Every cell's word over it again: Before / Skip / Resume (user, 2026-10-20).
  return "<div class='tv-rv-dcell'><span" + (label === '→' ? " class='tv-rv-arr'" : '') + ">" + label + "</span><b class='" + cls + "'>" + _escapeHtml(txt) + "</b></div>";
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
      var st = _travelState;   // what the Trip is live screen shows, kept before the plan is cleared
      var snap = { place: st.location, leaving: st.leaving, arriving: st.arriving, revenue: st.preview ? st.preview.totalRevenue : null };
      _travelState.leaving = _travelState.arriving = _travelState.firstOff = _travelState.firstBack = '';
      _travelState.location = '';
      _travelState.preview = null;
      _travelRenderDone(data, snap);
    } else {
      addLog('travelFeed', '❌ ' + (data && data.message ? data.message : 'Execute failed'), 'error');
      _travelRenderReview();
    }
  });
}

// "Trip is live" in the plan screen's look: one card, red title + icon, steps,
// a summary table like Cost analysis, Trip Summary → bottom right (Plan another dropped, user 2026-10-20) (user, 2026-10-20; was a green box).
function _travelRenderDone(data, snap) {
  snap = snap || {};
  var section = document.getElementById('travelBody');
  section.innerHTML = '';

  var day = function (ymd) {   // TUE, OCT 20, the date boxes' style; the year only if the trip crosses one
    var d = _ymdToDate(ymd); if (!d) return '–';
    var o = { weekday: 'short', month: 'short', day: 'numeric' };
    if (snap.leaving && snap.arriving && snap.leaving.slice(0, 4) !== snap.arriving.slice(0, 4)) o.year = 'numeric';
    return d.toLocaleDateString('en-US', o).toUpperCase();
  };
  var row = function (label, val, cls) {
    return "<div class='tv-sum-row" + (cls ? ' ' + cls : '') + "'><span class='tv-sum-name'>" + label + "</span><span>" + val + "</span></div>";
  };
  var texted = data.textsSent + ' / ' + data.studentsLogged + (data.isTest ? ' (test)' : '');
  var rows =
    row('Place', _escapeHtml(snap.place || '–')) +
    row('Leaving on', day(snap.leaving)) +
    row('Back on', day(snap.arriving)) +
    row('Lessons deleted', data.deleted) +
    row('Students texted', texted) +
    (snap.revenue != null ? row('Revenue loss', '$' + Number(snap.revenue).toLocaleString(), 'tv-sum-total') : '') +
    (data.textsFailed ? row('Texts failed', data.textsFailed, 'tv-live-bad') : '') +
    ((data.noPhone && data.noPhone.length) ? row('No phone', _escapeHtml(data.noPhone.join(', ')), 'tv-live-warn') : '');

  var card = document.createElement('div');
  card.className = 'tv-cal tv-live';
  card.innerHTML =
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head'><label class='field-label db-cx-t im-main-t'>Trip is live</label></div>" +
    "<div class='tv-sec-icon tv-icon-top'>" + LIVE_ICON + "</div>" +
    "<div class='tv-sec-note tv-steps'><span><i>1.</i>Check replies and confirmations in Trip Summary</span></div>" +   // step 2 (Secretary's email) dropped (user, 2026-10-20)
    "<div class='tv-live-table'><div class='tv-sum-card'>" + rows + "</div></div>" +
    "<div class='tv-dates-foot'>" +
      "<button class='link-btn amber' id='travelToSummary' data-tip='Opens Trip Summary.\nReplies and confirmations come in there.' data-tip-left data-tip-wrap>Trip Summary →</button>" +
    "</div>";
  section.appendChild(card);
  document.getElementById('travelToSummary').onclick = function () { if (typeof switchTab === 'function') switchTab('tripsummary'); };
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
