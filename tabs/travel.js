// ─── TABS / TRAVEL.JS ───────────────────────────────────────────────────────
// Travel Agent — vacation planner. Three screens:
//   1) DASHBOARD — list of past + active trips with per-student confirm status,
//      "+ Plan New Trip" button at top. This is the landing view.
//   2) PREVIEW — Leaving + Arriving inputs anchor two Mon-Sun day strips;
//      tap any day to extend the buffer (before-leaving or after-arriving).
//      Live impact (lessons / students / $ loss) updates instantly on every tap.
//   3) REVIEW — per-student breakdown with skip dates + first lesson back,
//      "GO LIVE" deletes the events and writes to the Travel sheet.
//
// Going live triggers Secretary's hourly auto-cancellation email; we don't
// duplicate that path. Confirmations are marked manually in v1.

var _travelState = {
  leaving:   '', // yyyy-mm-dd — the hard travel date (departure)
  arriving:  '', // yyyy-mm-dd — the hard travel date (return)
  firstOff:  '', // yyyy-mm-dd — first day off teaching; defaults to leaving, can be earlier
  firstBack: '', // yyyy-mm-dd — first day back teaching; defaults to arriving, can be later
  preview:   null
};

function initTravelTab() {
  _travelLoadDashboard();
}


// ─── DASHBOARD ──────────────────────────────────────────────────────────────

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

  // Pre-fill leaving/arriving with today so the year is already set —
  // user just nudges the month/day from there.
  if (!_travelState.leaving) {
    var today = _dateToYmd(new Date());
    _travelState.leaving   = today;
    _travelState.arriving  = today;
    _travelState.firstOff  = today;
    _travelState.firstBack = today;
  }

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
  hdr.innerHTML =
    "<div style='font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px'>Plan a Trip</div>" +
    "<button id='travelBackToDash' style='padding:6px 12px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer'>← Dashboard</button>";
  section.appendChild(hdr);
  document.getElementById('travelBackToDash').onclick = _travelLoadDashboard;

  // Leaving + Arriving inputs (the hard travel dates)
  var inputs = document.createElement('div');
  inputs.style.cssText = 'display:flex;gap:10px;margin-bottom:10px';
  inputs.innerHTML =
    "<div style='flex:1'>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Leaving</div>" +
      "<input type='date' id='travelLeaving' value='" + (_travelState.leaving || '') + "' style='width:100%;padding:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;font-family:inherit;font-size:13px'>" +
    "</div>" +
    "<div style='flex:1'>" +
      "<div style='font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px'>Arriving</div>" +
      "<input type='date' id='travelArriving' value='" + (_travelState.arriving || '') + "' style='width:100%;padding:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;font-family:inherit;font-size:13px'>" +
    "</div>";
  section.appendChild(inputs);

  // Mon-Sun day strips for buffer selection
  var leavingWeek = document.createElement('div');
  leavingWeek.id = 'travelLeavingWeek';
  leavingWeek.style.cssText = 'margin-bottom:8px';
  section.appendChild(leavingWeek);

  var arrivingWeek = document.createElement('div');
  arrivingWeek.id = 'travelArrivingWeek';
  arrivingWeek.style.cssText = 'margin-bottom:14px';
  section.appendChild(arrivingWeek);

  // Live impact summary
  var summary = document.createElement('div');
  summary.id = 'travelSummary';
  summary.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:14px;background:var(--panel)';
  summary.innerHTML = "<div class='empty-state'>Pick leaving + arriving dates to see impact</div>";
  section.appendChild(summary);

  document.getElementById('travelLeaving').addEventListener('change', function() {
    _travelState.leaving  = this.value;
    _travelState.firstOff = this.value; // reset to zero buffer on new pick
    _travelRebuildWeeks();
    _travelFetchPreview();
  });
  document.getElementById('travelArriving').addEventListener('change', function() {
    _travelState.arriving  = this.value;
    _travelState.firstBack = this.value;
    _travelRebuildWeeks();
    _travelFetchPreview();
  });

  if (_travelState.leaving && _travelState.arriving) {
    _travelRebuildWeeks();
    _travelFetchPreview();
  }
}

function _travelRebuildWeeks() {
  _renderWeekStrip('travelLeavingWeek',  'First day off  (tap to buffer earlier)',
                   _travelState.leaving,  _travelState.firstOff,  'before');
  _renderWeekStrip('travelArrivingWeek', 'First day back  (tap to buffer later)',
                   _travelState.arriving, _travelState.firstBack, 'after');
}

// One Mon-Sun strip of clickable day pills. `mode === 'before'` means days
// AFTER the anchor are disabled (you can only buffer earlier, not later);
// 'after' means days BEFORE the anchor are disabled.
function _renderWeekStrip(wrapId, label, anchorYmd, selectedYmd, mode) {
  var wrap = document.getElementById(wrapId);
  wrap.innerHTML = '';
  if (!anchorYmd) return;

  var lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px';
  lbl.textContent = label;
  wrap.appendChild(lbl);

  var pillRow = document.createElement('div');
  pillRow.style.cssText = 'display:flex;gap:4px;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:6px';

  var anchor = _ymdToDate(anchorYmd);
  var monday = _mondayOfWeek(anchor);

  for (var i = 0; i < 7; i++) {
    var d        = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
    var ymd      = _dateToYmd(d);
    var enabled  = mode === 'before' ? (d <= anchor) : (d >= anchor);
    var selected = ymd === selectedYmd;
    var isAnchor = ymd === anchorYmd;
    var dayName  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];

    var btn = document.createElement('button');
    btn.innerHTML =
      "<div style='font-size:9px;line-height:1;letter-spacing:0.5px'>" + dayName.toUpperCase() + "</div>" +
      "<div style='font-size:15px;font-weight:600;line-height:1.3'>" + d.getDate() + "</div>";
    btn.style.cssText =
      'flex:1;padding:6px 4px;border-radius:4px;font-family:inherit;' +
      'border:1px solid ' + (selected ? 'var(--accent)' : 'transparent') + ';' +
      'background:' + (selected ? 'rgba(232,70,58,0.18)' : 'transparent') + ';' +
      'color:' + (enabled ? (selected ? 'var(--accent)' : 'var(--text)') : 'rgba(180,180,180,0.25)') + ';' +
      'cursor:' + (enabled ? 'pointer' : 'default') + ';' +
      'opacity:' + (enabled ? '1' : '0.5') + ';' +
      (isAnchor && !selected ? 'box-shadow:inset 0 -2px 0 var(--muted);' : '');

    if (enabled) {
      (function(ymdCap) {
        btn.onclick = function() {
          if (mode === 'before') _travelState.firstOff  = ymdCap;
          else                   _travelState.firstBack = ymdCap;
          _travelRebuildWeeks();
          _travelFetchPreview();
        };
      })(ymd);
    }
    pillRow.appendChild(btn);
  }
  wrap.appendChild(pillRow);
}

function _travelFetchPreview() {
  var off  = _travelState.firstOff;
  var back = _travelState.firstBack;
  if (!off || !back) return;
  if (off >= back) {
    document.getElementById('travelSummary').innerHTML =
      "<div class='empty-state' style='color:#ffb400'>First day off must be before first day back</div>";
    return;
  }
  document.getElementById('travelSummary').innerHTML = "<div class='empty-state'>Scanning calendar…</div>";

  var url = getScriptUrl(); if (!url) return;
  fetch(url + '?action=getTravelPreview&start=' + encodeURIComponent(off) + '&end=' + encodeURIComponent(back))
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
  var bufferBefore = _daysBetween(_travelState.firstOff,  _travelState.leaving);
  var bufferAfter  = _daysBetween(_travelState.arriving, _travelState.firstBack);
  var bufferTxt    = '';
  if (bufferBefore > 0 || bufferAfter > 0) {
    var parts = [];
    if (bufferBefore > 0) parts.push('+' + bufferBefore + ' day' + (bufferBefore === 1 ? '' : 's') + ' before');
    if (bufferAfter  > 0) parts.push('+' + bufferAfter  + ' day' + (bufferAfter  === 1 ? '' : 's') + ' after');
    bufferTxt = "<div style='text-align:center;font-size:10px;color:var(--muted);margin-bottom:10px;letter-spacing:0.5px;text-transform:uppercase'>Buffer: " + parts.join(' · ') + "</div>";
  }

  if (!data.totalLessons) {
    box.innerHTML = bufferTxt + "<div class='empty-state' style='color:var(--green)'>No lessons in this range — you're clear to go</div>";
    return;
  }

  var rev = '$' + (data.totalRevenue || 0).toLocaleString();
  var warn = data.missingRate && data.missingRate.length
    ? "<div style='margin-top:10px;padding:8px;background:rgba(255,180,0,0.1);border:1px solid rgba(255,180,0,0.3);border-radius:4px;font-size:11px;color:#ffb400'>" +
        "⚠ No rate found for: " + data.missingRate.join(', ') + " — counted as $0 for now" +
      "</div>"
    : "";

  box.innerHTML = bufferTxt +
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
      "<div style='font-size:13px;font-weight:600'>" + _travelState.firstOff + ' → ' + _travelState.firstBack + "</div>" +
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
  callScript(url, 'executeTravel', { start: _travelState.firstOff, end: _travelState.firstBack }, function(data) {
    if (data && data.success) {
      addLog('travelFeed', '✓ Deleted ' + data.deleted + ' events · logged ' + data.studentsLogged + ' students', 'success');
      _travelState.leaving = ''; _travelState.arriving = '';
      _travelState.firstOff = ''; _travelState.firstBack = '';
      _travelState.preview = null;
      _travelLoadDashboard();
    } else {
      addLog('travelFeed', '❌ ' + (data && data.message ? data.message : 'Execute failed'), 'error');
      _travelRenderReview();
    }
  });
}


// ─── DATE HELPERS ───────────────────────────────────────────────────────────

function _ymdToDate(s) {
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

function _dateToYmd(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

function _mondayOfWeek(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x;
}

function _daysBetween(earlierYmd, laterYmd) {
  if (!earlierYmd || !laterYmd) return 0;
  var a = _ymdToDate(earlierYmd);
  var b = _ymdToDate(laterYmd);
  if (!a || !b) return 0;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
