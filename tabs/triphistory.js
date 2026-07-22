// ─── TABS / TRIPHISTORY.JS ──────────────────────────────────────────────────
// Yearly ledger of every trip ever taken. Grouped by year (newest first); each
// year shows its total days off + $ lost, and each trip's location · dates ·
// days · $. Read-only, computed live from the Travel sheet — no archiving, no
// reset. (TEST trips are excluded by the backend.)

function initTripHistoryTab() {
  var section = document.getElementById('triphistoryBody');
  if (!section) return;
  section.innerHTML = '<div class="empty-state">Loading…</div>';

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

function _thRender(years) {
  var section = document.getElementById('triphistoryBody');
  section.innerHTML = '';

  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:10px';
  var refreshBtn = document.createElement('button');
  refreshBtn.textContent = '⟳ Refresh';
  refreshBtn.style.cssText = 'padding:6px 14px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer;letter-spacing:0.5px';
  refreshBtn.onclick = initTripHistoryTab;
  bar.appendChild(refreshBtn);
  section.appendChild(bar);

  if (!years.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No trips on record yet';
    section.appendChild(empty);
    return;
  }

  years.forEach(function(yr) {
    var card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden;margin-bottom:14px';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'padding:10px 12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center';
    hdr.innerHTML =
      "<span style='font-weight:700;font-size:15px'>" + _thEsc(yr.year) + "</span>" +
      "<span style='font-size:13px;color:#ff6b6b;font-weight:700'>$" + (yr.totalRevenue || 0).toLocaleString() + " lost</span>";
    card.appendChild(hdr);

    var sub = document.createElement('div');
    sub.style.cssText = 'padding:5px 12px 8px;font-size:10px;color:var(--muted)';
    sub.textContent = _thPlural(yr.trips.length, 'trip') + ' · ' + _thPlural(yr.totalDays, 'day') + ' off · ' + _thPlural(yr.totalLessons, 'lesson') + ' skipped';
    card.appendChild(sub);

    yr.trips.forEach(function(t) {
      var row = document.createElement('div');
      row.style.cssText = 'padding:9px 12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between;align-items:baseline;gap:10px';
      var name = t.location
        ? "<span style='font-weight:600;font-size:13px'>" + _thEsc(t.location) + "</span>"
        : "<span style='font-size:13px;color:var(--muted);font-style:italic'>No location</span>";
      row.innerHTML =
        "<div style='min-width:0'>" + name +
          "<div style='font-size:10px;color:var(--muted);margin-top:2px'>" +
            _thEsc(t.tripStart) + ' → ' + _thEsc(t.tripEnd) + ' · ' + _thPlural(t.days, 'day') + ' · ' + _thPlural(t.students, 'student') +
          "</div>" +
        "</div>" +
        "<span style='font-size:13px;color:#ff6b6b;font-weight:600;flex:0 0 auto'>$" + (t.revenue || 0).toLocaleString() + "</span>";
      card.appendChild(row);
    });

    section.appendChild(card);
  });
}

function _thPlural(n, word) { return n + ' ' + word + (Number(n) === 1 ? '' : 's'); }

function _thEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
