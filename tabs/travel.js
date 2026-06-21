// ─── TABS / TRAVEL.JS ───────────────────────────────────────────────────────
// Travel Agent — vacation planner. Three screens:
//   1) DASHBOARD — list of past + active trips with per-student confirm status,
//      "+ Plan New Trip" button at top. This is the landing view.
//   2) PREVIEW — date pickers, live impact summary (lessons / students / $).
//   3) REVIEW — per-student breakdown with skip dates + first lesson back,
//      "GO LIVE" deletes the events and writes to the Travel sheet.
//
// Going live triggers Secretary's hourly auto-cancellation email; we don't
// duplicate that path. Confirmations are marked manually in v1.

var _travelState = {
  start: '',
  end:   '',
  preview: null
};

function initTravelTab() {
  _travelLoadDashboard();
}

function _travelLoadDashboard() {
  var section = document.getElementById('travelBody');
  if (!section) return;
  section.innerHTML = '<div class="empty-state">Loading...</div>';

  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + '?action=getTravelStatus')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>';
        return;
      }
      _travelRenderDashboard(data.trips || []);
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function _travelRenderDashboard(trips) {
  var section = document.getElementById('travelBody');
  section.innerHTML = '';

  var newBtn = document.createElement('button');
  newBtn.textContent = '+ Plan New Trip';
  newBtn.style.cssText = 'width:100%;padding:10px 18px;font-size:13px;background:rgba(180,40,40,0.18);color:#ff6b6b;border:1px solid rgba(180,40,40,0.45);border-radius:6px;cursor:pointer;letter-spacing:0.5px;margin-bottom:14px';
  newBtn.onclick = _travelRenderPreview;
  section.appendChild(newBtn);

  if (!trips.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No trips planned yet';
    section.appendChild(empty);
    return;
  }

  trips.forEach(function(trip) {
    var card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden;margin-bottom:14px';

    var hdr = document.createElement('div');
    var allConfirmed = trip.confirmed === trip.students.length;
    hdr.style.cssText =
      'padding:10px 12px;display:flex;justify-content:space-between;align-items:center;' +
      'border-bottom:1px solid var(--border);border-left:3px solid ' +
      (allConfirmed ? 'var(--green)' : '#ffb400');
    hdr.innerHTML =
      "<span style='font-weight:700;font-size:13px'>" + trip.tripStart + ' → ' + trip.tripEnd + '</span>' +
      "<span style='font-size:11px;color:var(--muted)'>" + trip.confirmed + ' / ' + trip.students.length + ' confirmed</span>';
    card.appendChild(hdr);

    trip.students.forEach(function(s) {
      card.appendChild(_travelStudentRow(s));
    });

    section.appendChild(card);
  });
}

function _travelStudentRow(s) {
  var row = document.createElement('div');
  var isConfirmed = !!s.confirmedAt;
  row.style.cssText = 'padding:8px 12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between;align-items:center;gap:10px';

  var left = document.createElement('div');
  left.style.cssText = 'flex:1;min-width:0';
  left.innerHTML =
    "<div style='font-weight:600;font-size:13px'>" + s.name + '</div>' +
    "<div style='font-size:10px;color:var(--muted);margin-top:2px'>" +
      'Skip: ' + (s.skipDates || '—') + " · Resume: " + (s.firstBack || '—') + '</div>';
  row.appendChild(left);

  var btn = document.createElement('button');
  if (isConfirmed) {
    btn.textContent = '✓ ' + s.confirmedAt;
    btn.style.cssText = 'padding:6px 10px;font-size:10px;background:rgba(0,200,100,0.15);color:var(--green);border:1px solid rgba(0,200,100,0.4);border-radius:4px;cursor:pointer;flex-shrink:0';
    btn.title = 'Click to undo';
  } else {
    btn.textContent = 'Mark Confirmed';
    btn.style.cssText = 'padding:6px 10px;font-size:10px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer;flex-shrink:0';
  }
  btn.onclick = function() {
    var url = getScriptUrl(); if (!url) return;
    var action = isConfirmed ? 'clearTravelConfirmed' : 'markTravelConfirmed';
    btn.disabled = true; btn.textContent = '…';
    callScript(url, action, { row: s.row }, function() {
      _travelLoadDashboard();
    });
  };
  row.appendChild(btn);
  return row;
}


// ─── PREVIEW SCREEN ─────────────────────────────────────────────────────────

function _travelRenderPreview() {
  var section = document.getElementById('travelBody');
  section.innerHTML = '';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
  hdr.innerHTML =
    "<div style='font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>Plan a Trip</div>" +
    "<button id='travelBackToDash' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>← Dashboard</button>";
  section.appendChild(hdr);
  document.getElementById('travelBackToDash').onclick = _travelLoadDashboard;

  var inputs = document.createElement('div');
  inputs.style.cssText = 'display:flex;gap:10px;margin-bottom:12px';
  inputs.innerHTML =
    "<div style='flex:1'>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Trip Start (first day off)</div>" +
      "<input type='date' id='travelStart' value='" + (_travelState.start || '') + "' style='width:100%;padding:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;font-family:inherit;font-size:13px'>" +
    "</div>" +
    "<div style='flex:1'>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Trip End (first day back)</div>" +
      "<input type='date' id='travelEnd' value='" + (_travelState.end || '') + "' style='width:100%;padding:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;font-family:inherit;font-size:13px'>" +
    "</div>";
  section.appendChild(inputs);

  var summary = document.createElement('div');
  summary.id = 'travelSummary';
  summary.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:14px;background:var(--panel)';
  summary.innerHTML = "<div class='empty-state'>Enter both dates to see impact</div>";
  section.appendChild(summary);

  document.getElementById('travelStart').addEventListener('change', _travelFetchPreview);
  document.getElementById('travelEnd').addEventListener('change', _travelFetchPreview);

  if (_travelState.start && _travelState.end) _travelFetchPreview();
}

function _travelFetchPreview() {
  var start = document.getElementById('travelStart').value;
  var end   = document.getElementById('travelEnd').value;
  if (!start || !end) return;
  if (start >= end) {
    document.getElementById('travelSummary').innerHTML =
      "<div class='empty-state' style='color:#ffb400'>Trip End must be after Trip Start</div>";
    return;
  }
  _travelState.start = start;
  _travelState.end   = end;
  document.getElementById('travelSummary').innerHTML = "<div class='empty-state'>Scanning calendar…</div>";

  var url = getScriptUrl(); if (!url) return;
  fetch(url + '?action=getTravelPreview&start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        document.getElementById('travelSummary').innerHTML =
          "<div class='empty-state'>Error: " + (data.message || 'unknown') + "</div>";
        return;
      }
      _travelState.preview = data;
      _travelRenderSummary(data);
    })
    .catch(function() {
      document.getElementById('travelSummary').innerHTML =
        "<div class='empty-state'>Connection failed</div>";
    });
}

function _travelRenderSummary(data) {
  var box = document.getElementById('travelSummary');
  if (!data.totalLessons) {
    box.innerHTML = "<div class='empty-state' style='color:var(--green)'>No lessons in this range — you're clear to go</div>";
    return;
  }

  var rev = '$' + (data.totalRevenue || 0).toLocaleString();
  var warn = data.missingRate && data.missingRate.length
    ? "<div style='margin-top:10px;padding:8px;background:rgba(255,180,0,0.1);border:1px solid rgba(255,180,0,0.3);border-radius:4px;font-size:11px;color:#ffb400'>" +
        "⚠ No rate found for: " + data.missingRate.join(', ') + " — counted as $0 for now" +
      "</div>"
    : "";

  box.innerHTML =
    "<div style='display:flex;gap:18px;align-items:center;justify-content:space-around;text-align:center'>" +
      "<div><div style='font-size:24px;font-weight:700;color:var(--text)'>" + data.totalLessons + "</div>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>lessons</div></div>" +
      "<div><div style='font-size:24px;font-weight:700;color:var(--text)'>" + data.totalStudents + "</div>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>students</div></div>" +
      "<div><div style='font-size:24px;font-weight:700;color:#ff6b6b'>" + rev + "</div>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>revenue loss</div></div>" +
    "</div>" + warn +
    "<button id='travelNextBtn' style='width:100%;margin-top:14px;padding:10px;font-size:13px;background:rgba(232,70,58,0.15);color:var(--accent);border:1px solid rgba(232,70,58,0.4);border-radius:4px;cursor:pointer;letter-spacing:0.5px'>NEXT — per-student breakdown →</button>";

  document.getElementById('travelNextBtn').onclick = _travelRenderReview;
}


// ─── REVIEW SCREEN ──────────────────────────────────────────────────────────

function _travelRenderReview() {
  var data = _travelState.preview;
  if (!data) return _travelRenderPreview();

  var section = document.getElementById('travelBody');
  section.innerHTML = '';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
  hdr.innerHTML =
    "<div>" +
      "<div style='font-size:13px;font-weight:600'>" + _travelState.start + ' → ' + _travelState.end + "</div>" +
      "<div style='font-size:11px;color:var(--muted)'>" +
        data.totalLessons + ' lessons · ' + data.totalStudents + ' students · $' + (data.totalRevenue || 0).toLocaleString() + ' loss' +
      "</div>" +
    "</div>" +
    "<button id='travelBackToPrev' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>← Back</button>";
  section.appendChild(hdr);
  document.getElementById('travelBackToPrev').onclick = _travelRenderPreview;

  var list = document.createElement('div');
  list.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden;margin-bottom:14px';

  data.students.forEach(function(s, i) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:10px 12px;' + (i > 0 ? 'border-top:1px solid rgba(255,255,255,0.04);' : '');
    row.innerHTML =
      "<div style='display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px'>" +
        "<span style='font-weight:600;font-size:13px'>" + s.name + "</span>" +
        "<span style='font-size:11px;color:var(--muted)'>" +
          s.lessonCount + " × $" + s.rate + " = $" + s.revenueLoss +
        "</span>" +
      "</div>" +
      "<div style='font-size:11px;color:#ffa500;margin-bottom:2px'>Skip: " + s.skipDates.join(', ') + "</div>" +
      "<div style='font-size:11px;color:var(--green)'>Resume: " + s.firstBack + "</div>";
    list.appendChild(row);
  });
  section.appendChild(list);

  var go = document.createElement('button');
  go.textContent = 'GO LIVE — delete ' + data.totalLessons + ' lessons';
  go.style.cssText = 'width:100%;padding:12px;font-size:13px;background:rgba(232,70,58,0.25);color:var(--accent);border:1px solid var(--accent);border-radius:4px;cursor:pointer;letter-spacing:0.5px;font-weight:600';
  go.onclick = function() {
    var msg = 'Delete ' + data.totalLessons + ' lessons across ' +
      data.totalStudents + ' students?\n\nSecretary will auto-send cancellation emails on its next hourly run.';
    if (!confirm(msg)) return;
    go.disabled = true; go.textContent = 'Deleting…';
    _travelExecute();
  };
  section.appendChild(go);
}

function _travelExecute() {
  var url = getScriptUrl(); if (!url) return;
  callScript(url, 'executeTravel', { start: _travelState.start, end: _travelState.end }, function(data) {
    if (data && data.success) {
      addLog('travelFeed', '✓ Deleted ' + data.deleted + ' events · logged ' + data.studentsLogged + ' students', 'success');
      _travelState.start = ''; _travelState.end = ''; _travelState.preview = null;
      _travelLoadDashboard();
    } else {
      addLog('travelFeed', '❌ ' + (data && data.message ? data.message : 'Execute failed'), 'error');
      _travelRenderReview();
    }
  });
}
