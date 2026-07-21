// ─── TABS / TRIPSUMMARY.JS ──────────────────────────────────────────────────
// The "watch / look back" surface for Travel.
//   • ACTIVE trips (last resume date not yet passed) → full detail: who was
//     texted, who confirmed, replies coming in, reply back inline, manual
//     confirm toggle.
//   • FINISHED trips (last resume date passed) → collapsed one-liner
//     (dates · days · students · $ lost), tap to expand the full record.
// Data is never deleted — the roster + threads live in the Travel sheet forever.

function initTripSummaryTab() {
  var section = document.getElementById('tripsummaryBody');
  if (!section) return;
  section.innerHTML = '<div class="empty-state">Loading…</div>';

  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + '?action=getTripSummary')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || 'unknown') + '</div>';
        return;
      }
      _tsRender(data.active || [], data.past || []);
    })
    .catch(function() { section.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

function _tsRender(active, past) {
  var section = document.getElementById('tripsummaryBody');
  section.innerHTML = '';

  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:10px';
  var refreshBtn = document.createElement('button');
  refreshBtn.textContent = '⟳ Refresh';
  refreshBtn.style.cssText = 'padding:6px 14px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer;letter-spacing:0.5px';
  refreshBtn.onclick = initTripSummaryTab;
  bar.appendChild(refreshBtn);
  section.appendChild(bar);

  if (!active.length && !past.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No trips yet — plan one in the Travel Plan tab';
    section.appendChild(empty);
    return;
  }

  // ── ACTIVE ──
  var aHdr = document.createElement('div');
  aHdr.style.cssText = 'font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px';
  aHdr.textContent = 'Active trips';
  section.appendChild(aHdr);

  if (!active.length) {
    var none = document.createElement('div');
    none.className = 'empty-state';
    none.style.cssText = 'padding:14px;font-size:12px';
    none.textContent = 'No active trips';
    section.appendChild(none);
  } else {
    active.forEach(function(trip) { section.appendChild(_tsActiveCard(trip)); });
  }

  // ── PAST ──
  if (past.length) {
    var pHdr = document.createElement('div');
    pHdr.style.cssText = 'font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin:22px 0 8px';
    pHdr.textContent = 'Past trips';
    section.appendChild(pHdr);
    past.forEach(function(trip) { section.appendChild(_tsPastRow(trip)); });
  }

  // ── clear test data (only when test rows exist) ──
  var hasTest = active.concat(past).some(function(t) { return t.isTest; });
  if (hasTest) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:20px;display:flex;justify-content:center';
    var btn = document.createElement('button');
    btn.textContent = '× Clear test data (Travel + Skip Logs + threads)';
    btn.style.cssText = 'padding:6px 12px;font-size:10px;background:transparent;color:var(--muted);border:1px dashed var(--border);border-radius:4px;cursor:pointer;letter-spacing:0.3px';
    btn.onclick = _tsClearTestData;
    wrap.appendChild(btn);
    section.appendChild(wrap);
  }
}


// ─── ACTIVE TRIP CARD (full detail) ─────────────────────────────────────────

function _tsActiveCard(trip) {
  var card = document.createElement('div');
  card.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden;margin-bottom:14px';

  var allConfirmed = trip.confirmed === trip.students.length;
  var accent = trip.isTest ? '#ffb400' : (allConfirmed ? 'var(--green)' : '#ffb400');

  var hdr = document.createElement('div');
  hdr.style.cssText = 'padding:10px 12px;border-bottom:1px solid var(--border);border-left:3px solid ' + accent;
  var reviewBadge = trip.needsReview
    ? " <span style='font-size:9px;background:rgba(255,120,60,0.2);color:#ff7a3c;padding:1px 6px;border-radius:3px;margin-left:6px'>" + trip.needsReview + " need you</span>"
    : "";
  var testBadge = trip.isTest
    ? " <span style='font-size:9px;background:rgba(255,180,0,0.2);color:#ffb400;padding:1px 6px;border-radius:3px;margin-left:6px'>TEST</span>"
    : "";
  hdr.innerHTML =
    "<div style='display:flex;justify-content:space-between;align-items:center'>" +
      "<span style='font-weight:700;font-size:13px'>" + trip.tripStart + ' → ' + trip.tripEnd + testBadge + reviewBadge + "</span>" +
      "<span style='font-size:11px;color:var(--muted)'>" + trip.confirmed + ' / ' + trip.students.length + " confirmed</span>" +
    "</div>" +
    "<div style='font-size:10px;color:var(--muted);margin-top:3px'>" + _tsPlural(trip.days, 'day') + ' · ' + _tsPlural(trip.lessonCount, 'lesson') + ' · $' + (trip.revenue || 0).toLocaleString() + ' lost</div>';
  card.appendChild(hdr);
  card.appendChild(_tsRosterStrip(trip));

  // Detail rows alphabetical, matching the roster strip above.
  var ordered = trip.students.slice().sort(function(a, b) { return a.name.localeCompare(b.name); });
  ordered.forEach(function(s) { card.appendChild(_tsStudentRow(s, false)); });
  return card;
}

// At-a-glance roster: every student's name, alphabetical, colored by status —
// green = confirmed, orange = replied but needs you, red = not yet confirmed.
function _tsRosterStrip(trip) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:10px 12px;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;gap:6px';
  var sorted = trip.students.slice().sort(function(a, b) { return a.name.localeCompare(b.name); });
  sorted.forEach(function(s) {
    var color, bg, bd;
    if (s.confirmedAt)      { color = 'var(--green)'; bg = 'rgba(0,200,100,0.12)';  bd = 'rgba(0,200,100,0.4)'; }
    else if (s.needsReview) { color = '#ff7a3c';      bg = 'rgba(255,120,60,0.12)'; bd = 'rgba(255,120,60,0.4)'; }
    else                    { color = '#ff6b6b';      bg = 'rgba(255,107,107,0.1)'; bd = 'rgba(255,107,107,0.35)'; }
    var chip = document.createElement('span');
    chip.textContent = s.name;
    chip.style.cssText = 'font-size:11px;padding:3px 8px;border-radius:4px;cursor:pointer;color:' + color + ';background:' + bg + ';border:1px solid ' + bd;
    (function(rowId) { chip.onclick = function() { _tsJumpToStudent(rowId); }; })('ts-row-' + s.row);
    wrap.appendChild(chip);
  });
  return wrap;
}

function _tsStatusPill(s) {
  if (s.confirmedAt)  return "<span style='font-size:10px;color:var(--green);border:1px solid rgba(0,200,100,0.4);background:rgba(0,200,100,0.12);border-radius:4px;padding:2px 7px'>✓ Confirmed</span>";
  if (s.needsReview)  return "<span style='font-size:10px;color:#ff7a3c;border:1px solid rgba(255,120,60,0.4);background:rgba(255,120,60,0.12);border-radius:4px;padding:2px 7px'>⚠ Needs you</span>";
  if (s.messageSentAt) return "<span style='font-size:10px;color:var(--muted);border:1px solid var(--border);border-radius:4px;padding:2px 7px'>Sent · awaiting</span>";
  return "<span style='font-size:10px;color:#ff6b6b;border:1px solid rgba(255,107,107,0.4);border-radius:4px;padding:2px 7px'>Not sent</span>";
}

function _tsStudentRow(s, readOnly) {
  var row = document.createElement('div');
  if (s.row) row.id = 'ts-row-' + s.row; // jump target for the roster chips
  row.style.cssText = 'padding:10px 12px;border-top:1px solid rgba(255,255,255,0.04)';

  var head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px';
  head.innerHTML =
    "<div style='font-weight:600;font-size:13px'>" + _tsEsc(s.name) + "</div>" +
    "<div>" + _tsStatusPill(s) + "</div>";
  row.appendChild(head);

  var meta = document.createElement('div');
  meta.style.cssText = 'font-size:10px;color:var(--muted);margin-top:2px';
  meta.innerHTML = 'Skip: ' + _tsEsc(s.skipDates || '—') + ' · Resume: ' + _tsEsc(s.firstBack || '—');
  row.appendChild(meta);

  // Thread (inbound + outbound texts)
  if (s.thread && s.thread.length) {
    var thread = document.createElement('div');
    thread.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:4px';
    s.thread.forEach(function(m) {
      var out = m.dir === 'out';
      var bubble = document.createElement('div');
      bubble.style.cssText =
        'max-width:85%;font-size:11px;line-height:1.4;padding:6px 9px;border-radius:8px;white-space:pre-wrap;' +
        (out
          ? 'align-self:flex-end;background:rgba(232,70,58,0.15);border:1px solid rgba(232,70,58,0.3);color:var(--text)'
          : 'align-self:flex-start;background:var(--bg);border:1px solid var(--border);color:var(--text)');
      bubble.innerHTML = _tsEsc(m.body) +
        "<div style='font-size:8px;color:var(--muted);margin-top:2px'>" + (out ? 'you' : 'them') + ' · ' + _tsEsc(m.ts) + "</div>";
      thread.appendChild(bubble);
    });
    row.appendChild(thread);
  } else if (s.replyText) {
    // Fallback if only the latest reply is stored (older rows without threads).
    var rep = document.createElement('div');
    rep.style.cssText = 'margin-top:8px;font-size:11px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:6px 9px';
    rep.innerHTML = _tsEsc(s.replyText) + "<div style='font-size:8px;color:var(--muted);margin-top:2px'>them · " + _tsEsc(s.replyAt) + "</div>";
    row.appendChild(rep);
  }

  if (readOnly) return row;

  // Actions: reply box + manual confirm toggle
  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:6px;margin-top:8px;align-items:center';

  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = s.phone ? 'Text ' + _tsFirst(s.name) + '…' : 'No phone on file';
  input.disabled = !s.phone;
  input.style.cssText = 'flex:1;min-width:0;padding:7px 9px;font-size:12px;font-family:inherit;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)';

  var sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.disabled = !s.phone;
  sendBtn.style.cssText = 'flex:0 0 auto;padding:7px 12px;font-size:11px;background:rgba(232,70,58,0.15);color:var(--accent);border:1px solid rgba(232,70,58,0.4);border-radius:4px;cursor:pointer';
  sendBtn.onclick = function() {
    var body = input.value.trim();
    if (!body) return;
    var url = getScriptUrl(); if (!url) return;
    sendBtn.disabled = true; sendBtn.textContent = '…';
    callScript(url, 'sendTravelReply', { row: s.row, body: body }, function(data) {
      if (data && data.success) {
        addLog('tripsummaryFeed', '✓ Texted ' + s.name, 'success');
        initTripSummaryTab();
      } else {
        addLog('tripsummaryFeed', '❌ ' + (data && data.message ? data.message : 'Send failed'), 'error');
        sendBtn.disabled = false; sendBtn.textContent = 'Send';
      }
    });
  };
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendBtn.onclick(); });

  var confirmBtn = document.createElement('button');
  var isC = !!s.confirmedAt;
  confirmBtn.textContent = isC ? '✓' : 'Confirm';
  confirmBtn.title = isC ? 'Confirmed — click to undo' : 'Mark confirmed manually';
  confirmBtn.style.cssText = 'flex:0 0 auto;padding:7px 10px;font-size:11px;border-radius:4px;cursor:pointer;' +
    (isC ? 'background:rgba(0,200,100,0.15);color:var(--green);border:1px solid rgba(0,200,100,0.4)'
         : 'background:transparent;color:var(--muted);border:1px solid var(--border)');
  confirmBtn.onclick = function() {
    var url = getScriptUrl(); if (!url) return;
    confirmBtn.disabled = true; confirmBtn.textContent = '…';
    callScript(url, isC ? 'clearTravelConfirmed' : 'markTravelConfirmed', { row: s.row }, function() {
      initTripSummaryTab();
    });
  };

  actions.appendChild(input);
  actions.appendChild(sendBtn);

  // Nudge: pre-fill a friendly follow-up asking an unconfirmed student to reply Y.
  if (!s.confirmedAt) {
    var nudgeBtn = document.createElement('button');
    nudgeBtn.textContent = 'Nudge';
    nudgeBtn.title = 'Pre-fill a follow-up asking them to confirm';
    nudgeBtn.disabled = !s.phone;
    nudgeBtn.style.cssText = 'flex:0 0 auto;padding:7px 10px;font-size:11px;background:transparent;color:#ffb400;border:1px solid rgba(255,180,0,0.4);border-radius:4px;cursor:pointer';
    nudgeBtn.onclick = function() {
      input.value = "Hi " + _tsFirst(s.name) + " — quick follow-up: we'll resume your lessons on " +
        (s.firstBack || '') + ". Please reply Y to confirm. (If the resume date doesn't work for you, " +
        "please let me know at least a week in advance.)";
      input.focus();
    };
    actions.appendChild(nudgeBtn);
  }

  actions.appendChild(confirmBtn);
  row.appendChild(actions);
  return row;
}


// ─── PAST TRIP (collapsed, expandable) ──────────────────────────────────────

function _tsPastRow(trip) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);margin-bottom:10px;overflow:hidden';

  var head = document.createElement('button');
  head.style.cssText = 'width:100%;text-align:left;padding:10px 12px;background:transparent;border:none;color:var(--text);cursor:pointer;font-family:inherit;display:flex;justify-content:space-between;align-items:center;gap:10px';
  var testBadge = trip.isTest ? " <span style='font-size:9px;background:rgba(255,180,0,0.2);color:#ffb400;padding:1px 6px;border-radius:3px'>TEST</span>" : "";
  head.innerHTML =
    "<span style='font-size:12px'><span style='color:var(--muted);margin-right:6px'>▸</span><b>" + trip.tripStart + ' → ' + trip.tripEnd + "</b>" + testBadge + "</span>" +
    "<span style='font-size:11px;color:var(--muted)'>" + _tsPlural(trip.days, 'day') + ' · ' + _tsPlural(trip.students.length, 'student') + ' · $' + (trip.revenue || 0).toLocaleString() + " lost</span>";
  wrap.appendChild(head);

  var body = document.createElement('div');
  body.style.cssText = 'display:none;border-top:1px solid var(--border)';
  var built = false;
  head.onclick = function() {
    var open = body.style.display === 'none';
    body.style.display = open ? 'block' : 'none';
    head.querySelector('span span').textContent = open ? '▾' : '▸';
    if (open && !built) {
      built = true;
      body.innerHTML =
        "<div style='padding:8px 12px;font-size:10px;color:var(--muted)'>" +
          trip.confirmed + ' / ' + trip.students.length + ' confirmed · ' + trip.lessonCount + ' lessons' +
        "</div>";
      trip.students.forEach(function(s) { body.appendChild(_tsStudentRow(s, true)); });
    }
  };
  wrap.appendChild(body);
  return wrap;
}


// ─── CLEAR TEST DATA ────────────────────────────────────────────────────────

function _tsClearTestData() {
  if (!confirm('Delete all TEST trip rows, [TEST] Skip Logs, and their threads?\n\nReal data is untouched. This cannot be undone.')) return;
  var url = getScriptUrl(); if (!url) return;
  callScript(url, 'clearTravelTestData', {}, function(data) {
    if (data && data.success) {
      addLog('tripsummaryFeed', '✓ Cleared ' + data.travelDeleted + ' rows · ' + data.logsDeleted + ' skips · ' + (data.threadsDeleted || 0) + ' thread msgs', 'success');
      initTripSummaryTab();
    } else {
      addLog('tripsummaryFeed', '❌ ' + (data && data.message ? data.message : 'Clear failed'), 'error');
    }
  });
}


// ─── HELPERS ────────────────────────────────────────────────────────────────

// Scroll a student's detail row into view when their roster chip is tapped,
// with a brief highlight flash so it's clear where you landed.
function _tsJumpToStudent(rowId) {
  var el = document.getElementById(rowId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  var prev = el.style.background;
  el.style.transition = 'background 0.3s';
  el.style.background = 'rgba(232,70,58,0.14)';
  setTimeout(function() { el.style.background = prev || ''; }, 1100);
}

function _tsFirst(name) { return String(name || '').trim().split(/\s+/)[0] || ''; }

function _tsPlural(n, word) { return n + ' ' + word + (Number(n) === 1 ? '' : 's'); }

function _tsEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
