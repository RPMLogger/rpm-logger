// ─── TABS / TRIPHISTORY.JS ──────────────────────────────────────────────────
// Yearly ledger of every trip ever taken. Grouped by year (newest first); each
// year shows its total days off + $ lost, and each trip's location · dates ·
// days · $. Read-only, computed live from the Travel sheet — no archiving, no
// reset. (TEST trips are excluded by the backend.)

function initTripHistoryTab() {
  var section = document.getElementById('triphistoryBody');
  if (!section) return;
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';

  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + '?action=getTripHistory')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>';
        return;
      }
      _thRender(data.years || []);
    })
    .catch(function() { section.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

// 2026-10-29: the Dashboard's look (user): a box per trip under its year's heading.
// The washed band is the trip, TURKIYE (place only, user 2026-10-29); under it one row, the dates left
// then "36 days off" and "$6,650 lost" (user, 2026-10-29: no column names, no Total).
// Show grows the box with the same row for Vacation / Pre buffer / Post buffer, each
// named at the right end, a thicker line under the trip's row. All hidden to start. Trips gone live before
// 2026-10-29 have no breakdown, so no Show. No lessons or students.
function _thRender(years) {
  var section = document.getElementById('triphistoryBody');   // no Refresh: the tab reads the sheet each time it opens (user, 2026-10-29)
  if (!years.length) { section.innerHTML = '<div class="empty-state">None</div>'; return; }

  var money = function(v) { return '$' + (v || 0).toLocaleString(); };
  var dates = function(from, to, d) { return d > 0 && from ? _thDate(from) + (to && to !== from ? ' → ' + _thDate(to) : '') : '–'; };
  var row = function(from, to, d, rev, cls, tail, yr) {
    return "<div class='th-line" + (cls ? ' ' + cls : '') + "'>" +
      "<span>" + dates(from, to, d) + (yr ? "<span class='th-yr'> / " + _thEsc(yr) + "</span>" : '') + "</span><span>" + d + "<span class='th-yr'> " + (Number(d) === 1 ? 'day' : 'days') + " off</span></span>" +
      "<span>" + money(rev) + "<span class='th-yr'> lost</span></span>" + (tail || "<span></span>") + "</div>";
  };
  var tag = function(label) { return "<span class='th-tag'>" + label + "</span>"; };

  var html = "<div class='ld-cards'>";
  years.forEach(function(yr) {
    html += "<div class='th-year'>" + _thEsc(yr.year) + " Trips</div>";   // the year over its boxes, the old table header's font (user, 2026-10-29)
    yr.trips.forEach(function(t, i) {
      var b = t.breakdown, id = 'thDet' + _thEsc(yr.year) + '_' + i;
      var show = b ? "<button class='link-btn th-show' onclick=\"_thToggle(this, '" + id + "')\">Show</button>" : '';
      html += "<div class='inq-dcard ld-card'>" +
        "<div class='ld-title'>" + (t.location ? _thEsc(t.location) : 'No location') + "</div>" +
        row(t.tripStart, _thAddDays(t.tripEnd, -1), t.days, t.revenue, 'th-trip', show, yr.year) +
        (b ? "<div class='th-det' id='" + id + "' hidden>" +
          row(b.leaving, b.backOn, b.vacation.d, b.vacation.rev, 'th-sub th-vac', tag('Vacation')) +
          row(t.tripStart, _thAddDays(b.leaving, -1), b.pre.d, b.pre.rev, 'th-sub th-buf', tag('Pre buffer')) +
          row(_thAddDays(b.backOn, 1), _thAddDays(t.tripEnd, -1), b.post.d, b.post.rev, 'th-sub th-buf', tag('Post buffer')) +
        "</div>" : '') +
        "</div>";
    });
  });
  section.innerHTML = html + "</div>";
}

// Show / Hide one trip's breakdown rows.
function _thToggle(btn, id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.hidden = !el.hidden;
  btn.textContent = el.hidden ? 'Show' : 'Hide';
}

// 2026-07-12 → Jul 12 (the year is the box's title; anything else shown as it came).
function _thDate(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return _thEsc(s);
  var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m[2]) - 1];
  return mon + ' ' + Number(m[3]);
}

// "2026-08-17", -1 → "2026-08-16" (TripEnd is the first day teaching again; the last day off is the day before).
function _thAddDays(s, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return s;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

function _thPlural(n, word) { return n + ' ' + word + (Number(n) === 1 ? '' : 's'); }

function _thEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
