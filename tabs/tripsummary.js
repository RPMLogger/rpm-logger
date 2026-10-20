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
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';

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

  // No Refresh button: the tab re-fetches every time it is opened.
  if (!active.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'None';
    section.appendChild(empty);
  } else {
    active.forEach(function(trip) { section.appendChild(_tsActiveCard(trip)); });
  }
  if (_tsReopenRow) {
    var again = null;
    active.forEach(function (t) { t.students.forEach(function (x) { if (x.row === _tsReopenRow) again = x; }); });
    _tsReopenRow = null;
    if (again) _tsOpenStudent(again);
  }

  // ── clear test data (only when test rows exist, active or past) ──
  var hasTest = active.concat(past || []).some(function(t) { return t.isTest; });
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
  var allConfirmed = trip.confirmed === trip.students.length;
  var testBadge = trip.isTest
    ? " <span style='font-size:9px;background:rgba(255,180,0,0.2);color:#ffb400;padding:1px 6px;border-radius:3px;margin-left:6px'>TEST</span>"
    : "";
  // Archive: the portal's red button with the tray icon, like Go live; dimmed and locked
  // until every student has confirmed (user, 2026-10-20; was a solid yellow button).
  var _archReady = allConfirmed;
  var archLabel = TRAY_IN_ICON + '<span>Archive</span>';
  var tally = document.createElement('span');
  tally.className = 'ts-tally';
  tally.innerHTML = "<button class='link-btn red ts-archive-btn'" +
    (_archReady ? " data-tip='Asks first.\nMoves this trip to Trip History.'" : " disabled data-tip='Locked until every student confirms.'") +
    ">" + archLabel + "</button>";
  var _arch = tally.querySelector('.ts-archive-btn');
  if (_arch && _archReady) _arch.onclick = function() {
    rpmConfirm({
      title: 'Archive this trip?',
      confirmLabel: 'Archive',
      icon: TRAY_IN_ICON
    }).then(function (ok) {
    if (!ok) return;
    var url = getScriptUrl(); if (!url) return;
    _arch.disabled = true; _arch.querySelector('span').textContent = '…';
    callScript(url, 'archiveTrip', { tripStart: trip.tripStart, tripEnd: trip.tripEnd }, function(data) {
      if (data && data.success) {
        addLog('tripsummaryFeed', '✓ Archived ' + trip.tripStart + ' → ' + trip.tripEnd + ' → Trip History', 'success');
        initTripSummaryTab();
      } else {
        addLog('tripsummaryFeed', '❌ ' + (data && data.message ? data.message : 'Archive failed'), 'error');
        _arch.disabled = false; _arch.innerHTML = archLabel;
      }
    });
    });
  };

  // One list per trip (user, 2026-10-20): a row per student like the Terminate list,
  // name left, status badge right; clicking opens the student's card in a window.
  // Needs reply first, then Awaiting, then Confirmed, A–Z within each. The pills box is gone.
  var head = function (t) {
    var h = document.createElement('div');
    h.className = 'db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head';
    h.innerHTML = "<label class='field-label db-cx-t im-main-t'>" + t + "</label>";
    return h;
  };
  var wrap = document.createElement('div');
  var th = head('Confirmations');
  wrap.appendChild(th);
  // How-to steps under the title, Travel Plan's numbered list (user, 2026-10-20).
  var steps = document.createElement('div');
  steps.className = 'tv-sec-note tv-steps ts-steps';
  steps.innerHTML =
    // Two steps, the first with dashed sub-lines (user, 2026-10-20).
    "<span><i>1.</i>Check confirmations</span>" +
    "<span class='ts-sub'><i>-</i>Auto, manual and awaiting</span>" +
    "<span class='ts-sub'><i>-</i>Needs reply: answer in the Text back box</span>" +
    "<span class='ts-sub'><i>-</i>No answer yet: Nudge to text them again</span>" +
    "<span><i>2.</i>When all are confirmed, archive the trip</span>";
  wrap.appendChild(steps);
  tally.classList.add('ts-arch-row');   // Archive under step 2, over the divider (user, 2026-10-20; was on the title line)
  wrap.appendChild(tally);
  var rule = document.createElement('hr');
  rule.className = 'divider ts-rule';   // between the steps and the list (user, 2026-10-20)
  wrap.appendChild(rule);
  var dates = document.createElement('div');
  dates.className = 'ts-trip-dates';
  dates.innerHTML = trip.confirmed + ' / ' + trip.students.length + ' confirmed' + testBadge;   // the tally under the title; the trip dates dropped (user, 2026-10-20)
  wrap.appendChild(dates);

  var rank = function (x) { return _tsNeedsReply(x) ? 0 : (x.confirmedAt ? 2 : 1); };
  var ordered = trip.students.slice().sort(function(a, b) { return (rank(a) - rank(b)) || a.name.localeCompare(b.name); });
  var list = document.createElement('div');
  ordered.forEach(function(s) {
    var r = document.createElement('div');
    r.className = 'ts-row ' + (_tsNeedsReply(s) ? 'ts-row-reply' : (s.confirmedAt ? 'ts-row-ok' : 'ts-row-wait'));   // edge in the status colour (user, 2026-10-20)
    r.innerHTML = "<span class='ts-row-name'>" + _tsEsc(s.name) + "</span>" + _tsStatusPill(s);
    r.onclick = function () { _tsOpenStudent(s); };
    list.appendChild(r);
  });
  wrap.appendChild(list);
  return wrap;
}

// A student's card in the portal window (_stWin, the Log window's look) (user, 2026-10-20).
var _tsReopenRow = null;   // after Send / Manual confirm the list reloads, then this card opens again
function _tsOpenStudent(s) {
  var w = _stWin('tsStuWin', _tsEsc(s.name), 'Trip confirmation', null, '');
  var panel = w.querySelector('.st-win');
  var c = _tsStudentRow(s, false);
  c.className = 'ts-card ts-win-card';
  c.style.cssText = '';
  // The window title has the name: Skip / Resume take its place, the status stays top right.
  var nm = c.querySelector('.inq-name'), hd = nm.parentElement, meta = hd.nextElementSibling;
  nm.remove();
  meta.style.marginTop = '0';
  hd.insertBefore(meta, hd.firstChild);
  hd.style.alignItems = 'flex-start';
  panel.appendChild(c);
  var t = c.querySelector('.ts-thread'); if (t) t.scrollTop = t.scrollHeight;
}

// Reload the list; reopen this student's window once it's drawn.
function _tsRefresh(row) {
  var w = document.getElementById('tsStuWin'); if (w) w.remove();
  _tsReopenRow = row || null;
  initTripSummaryTab();
}

// Needs reply = they sent something that isn't a Y and it's still the last text: once
// you text back it's Awaiting again (user, 2026-10-20; the sheet flag stays until a Y).
function _tsNeedsReply(s) {
  if (!s.needsReview || s.confirmedAt) return false;
  var t = s.thread || [];
  return !t.length || t[t.length - 1].dir === 'in';
}

function _tsStatusPill(s) {
  // Small caps tags at Trial's strength (user, 2026-10-20; were filled pills).
  // Tinted boxes like Payments' Venmo / Zelle badges, so a status never looks like a button (user, 2026-10-20).
  var tag = function (c, t, bg) { return "<span class='ts-tag' style='color:" + c + ";background:" + (bg || "color-mix(in srgb, " + c + " 15%, transparent)") + "'>" + t + "</span>"; };
  if (s.confirmedAt)   return tag('var(--green)', 'Confirmed');
  if (_tsNeedsReply(s)) return tag('var(--warn)', 'Needs reply');   // (user, 2026-10-20; was Needs you)
  if (s.messageSentAt) return tag('var(--muted)', 'Awaiting', 'rgba(240,237,232,0.07)');   // the grey key badge on Travel Plan
  return tag('#ff5a4d', 'Not sent');
}

function _tsStudentRow(s, readOnly) {
  var row = document.createElement('div');
  if (s.row) row.id = 'ts-row-' + s.row; // jump target for the roster chips
  row.style.cssText = 'padding:10px 12px;border-top:1px solid rgba(255,255,255,0.04)';

  var head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px';
  head.innerHTML =
    "<span class='inq-name'>" + _tsEsc(s.name) + "</span>" +   // the Trial card's name (user, 2026-10-20)
    "<div class='ts-tag-wrap'>" + _tsStatusPill(s) + "</div>";
  row.appendChild(head);

  var meta = document.createElement('div');
  meta.style.cssText = 'font-size:10px;color:var(--muted);margin-top:6px';   // a little off the name (user, 2026-10-20; was 2px)
  meta.innerHTML = 'SKIP: ' + _tsEsc(s.skipDates || '—') + '<br>RESUME: ' + _tsEsc(String(s.firstBack || '—').replace(/,\s*(\d{1,2}:\d{2}\s*[AP]M)\s*$/i, ' - $1').replace(/^([A-Z][a-z]{2}) /, '$1, '));   // "Sun, Dec 13 - 11:30 AM": a dash before the time (user, 2026-10-20)   // labels in caps (user, 2026-10-20)   // Resume on its own line (user, 2026-10-20)
  meta.style.lineHeight = '1.7';
  row.appendChild(meta);

  // Thread (inbound + outbound texts) in a fixed-height dark box, so every card is the
  // same size; it scrolls, opened at the newest (user, 2026-10-20; grew with the thread).
  var thread = document.createElement('div');
  thread.className = 'ts-thread';
  var msgs = (s.thread && s.thread.length) ? s.thread
    : (s.replyText ? [{ dir: 'in', body: s.replyText, ts: s.replyAt }] : []);   // older rows: only the latest reply stored
  if (!msgs.length) thread.innerHTML = "<div class='ts-thread-none'>No reply yet</div>";
  // A centred time line like Messages, before the first text and after any hour-long gap;
  // no you / them line in the bubbles (user, 2026-10-20). ts is "yyyy-MM-dd HH:mm".
  var tsDate = function (t) { var x = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return x ? new Date(+x[1], x[2] - 1, +x[3], +x[4], +x[5]) : null; };
  var tsShow = function (d, raw) {
    if (!d) return _tsEsc(raw || '');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  var prevAt = null;
  msgs.forEach(function(m) {
    var out = m.dir === 'out';
    var at = tsDate(m.ts);
    if (m.ts && (!prevAt || !at || at - prevAt > 60 * 60 * 1000)) {
      var stamp = document.createElement('div');
      stamp.className = 'ts-stamp';
      stamp.innerHTML = tsShow(at, m.ts);
      thread.appendChild(stamp);
    }
    prevAt = at || prevAt;
    var bubble = document.createElement('div');
    bubble.style.cssText =
      'max-width:85%;font-size:11px;line-height:1.4;padding:6px 9px;border-radius:8px;white-space:pre-wrap;' +
      (out ? 'align-self:flex-end;' : 'align-self:flex-start;');   // blue, both sides (user, 2026-10-20; was neutral)
    bubble.className = 'ts-bub' + (out ? '' : ' ts-bub-in');   // yours blue, theirs grey, like Messages (user, 2026-10-20)
    bubble.innerHTML = _tsEsc(m.body);
    thread.appendChild(bubble);
  });
  // Small grey titles over the thread and the text box, like the review cards' (user, 2026-10-20).
  var lbl = function (t) { var l = document.createElement('label'); l.className = 'field-label ts-lbl'; l.textContent = t; return l; };
  // The hand-and-phone (om-100) on its own line over THREAD, bigger (user, 2026-10-20).
  var thIcon = document.createElement('div');
  thIcon.className = 'ts-th-icon';
  thIcon.innerHTML = PHONE_ICON.replace('class="win-icon"', 'class="ts-lbl-icon"');
  row.appendChild(thIcon);
  row.appendChild(lbl('Thread'));
  row.appendChild(thread);
  setTimeout(function () { thread.scrollTop = thread.scrollHeight; }, 0);

  if (readOnly || s.confirmedAt) return row;   // confirmed: just the thread, no Text back (user, 2026-10-20)

  // Actions: reply box (multi-line, auto-growing) on top, buttons below.
  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:8px';

  var input = document.createElement('textarea');
  input.rows = 1;
  input.placeholder = s.phone ? 'Text ' + _tsFirst(s.name) + '…' : 'No phone on file';
  input.disabled = !s.phone;
  input.style.cssText = 'width:100%;box-sizing:border-box;resize:none;overflow:hidden;min-height:36px;' +
    'padding:8px 9px;font-size:12px;line-height:1.5;font-family:inherit;background:var(--bg);' +
    'border:1.5px dashed color-mix(in srgb, var(--blue) 28%, transparent);border-radius:8px;color:var(--text)';   // dashed dim blue like the thread box (user, 2026-10-20)
  function _tsAutoGrow() { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; }
  input.addEventListener('input', _tsAutoGrow);

  var btnRow = document.createElement('div');
  btnRow.className = 'inq-acts';   // portal buttons on the right, like Trial's (user, 2026-10-20)
  btnRow.style.marginTop = '6px';

  var sendBtn = document.createElement('button');
  sendBtn.innerHTML = SEND_ICON + '<span>Send</span>';
  sendBtn.disabled = !s.phone;
  sendBtn.className = 'link-btn bright';
  sendBtn.style.cssText = 'display:inline-flex;align-items:center;gap:7px';
  sendBtn.onclick = function() {
    var body = input.value.trim();
    if (!body) return;
    var url = getScriptUrl(); if (!url) return;
    sendBtn.disabled = true; sendBtn.textContent = '…';
    callScript(url, 'sendTravelReply', { row: s.row, body: body }, function(data) {
      if (data && data.success) {
        addLog('tripsummaryFeed', '✓ Texted ' + s.name, 'success');
        _tsRefresh(s.row);
      } else {
        addLog('tripsummaryFeed', '❌ ' + (data && data.message ? data.message : 'Send failed'), 'error');
        sendBtn.disabled = false; sendBtn.innerHTML = SEND_ICON + '<span>Send</span>';
      }
    });
  };
  // Enter sends; Shift+Enter for a new line.
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.onclick(); }
  });

  var confirmBtn = document.createElement('button');
  var isC = !!s.confirmedAt;
  confirmBtn.textContent = isC ? '✓ Confirmed' : 'Manual confirm';   // marks it without a text (user, 2026-10-20; was Confirm)
  confirmBtn.title = isC ? 'Confirmed — click to undo' : 'Mark confirmed manually';
  confirmBtn.className = 'link-btn' + (isC ? ' green' : '');
  confirmBtn.onclick = function() {
    var url = getScriptUrl(); if (!url) return;
    confirmBtn.disabled = true; confirmBtn.textContent = '…';
    callScript(url, isC ? 'clearTravelConfirmed' : 'markTravelConfirmed', { row: s.row }, function() {
      _tsRefresh(s.row);
    });
  };


  // Nudge: pre-fill a friendly follow-up asking an unconfirmed student to reply Y.
  if (!s.confirmedAt) {
    var nudgeBtn = document.createElement('button');
    nudgeBtn.textContent = 'Nudge';
    nudgeBtn.title = 'Pre-fill a follow-up asking them to confirm';
    nudgeBtn.disabled = !s.phone || _tsNeedsReply(s);   // a reply waiting on you: no nudge (user, 2026-10-20)
    nudgeBtn.className = 'link-btn amber';
    nudgeBtn.style.cssText = 'order:-1;margin-right:auto';   // bottom left, Send stays right (user, 2026-10-20)
    nudgeBtn.onclick = function() {
      input.value =
        "Hi " + _tsFirst(s.name) + "!\n\n" +
        "Quick follow-up on my earlier note.\n\n" +
        "We'll resume on " + _tsResumePretty(s.firstBack) + ".\n\n" +
        "Please REPLY to THIS MESSAGE with Y to confirm.\n\n" +
        "(Please let me know at least a week in advance if you have a scheduling conflict.)";
      input.focus();
      _tsAutoGrow();
    };
    btnRow.appendChild(nudgeBtn);
  }

  // Confirmed cards: no button, the CONFIRMED tag says it (user, 2026-10-20; was ✓ Confirmed, click to undo).
  // Manual confirm sits under the status tag, top right (user, 2026-10-20; was with Send / Nudge).
  if (!isC) {
    confirmBtn.classList.add('ts-manual');
    // Off while a reply is waiting on you: answer it first (user, 2026-10-20).
    if (_tsNeedsReply(s)) { confirmBtn.disabled = true; confirmBtn.title = 'Reply first'; }
    head.querySelector('.ts-tag-wrap').appendChild(confirmBtn);
  }
  actions.appendChild(lbl('Text back'));   // (user, 2026-10-20; was Text)
  // Send back under the box, the portal's paper-plane Send (user, 2026-10-20; was briefly inside the box).
  btnRow.insertBefore(sendBtn, btnRow.firstChild);
  actions.appendChild(input);
  actions.appendChild(btnRow);   // kept even when empty (confirmed), so every card is the same size
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
  rpmConfirm({
    title: 'Delete all TEST data?',
    message: 'Removes TEST trip rows, [TEST] Skip Logs and their threads. Real data is untouched. This cannot be undone.',
    confirmLabel: 'Delete test data',
    danger: true
  }).then(function (ok) { if (ok) _tsClearTestDataGo(); });
}

function _tsClearTestDataGo() {
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

function _tsFirst(name) { return String(name || '').trim().split(/\s+/)[0] || ''; }

// "Sun Aug 30, 10:30 AM" -> "Sun, Aug 30 at 10:30 AM" (match the travel text format)
function _tsResumePretty(fb) {
  var parts = String(fb || '').split(', ');
  if (parts.length < 2) return String(fb || '');
  var dp = parts[0].replace(/^(\S+)\s+/, '$1, ');
  return dp + ' at ' + parts.slice(1).join(', ');
}

function _tsPlural(n, word) { return n + ' ' + word + (Number(n) === 1 ? '' : 's'); }

function _tsEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
