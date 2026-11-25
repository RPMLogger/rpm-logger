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
  var hd = document.getElementById('tripsummaryHead'); if (hd) hd.innerHTML = '';
  if (typeof TD_BOLTS === 'string') document.querySelectorAll('#tab-tripsummary > .ts-box').forEach(function (b) {
    if (!b.querySelector(':scope > .td-bolt')) b.insertAdjacentHTML('afterbegin', TD_BOLTS);   // four screws, like Reviews' boxes
  });

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
  tally.innerHTML = "<button class='link-btn ts-archive-btn opens-window'" +   // ▸: asks first
    (_archReady ? " data-tip='Asks first.\nMoves this trip to Past Trips.'" : " disabled data-tip='Locked.\nUntil every student is confirmed.'") + " data-tip-wrap" +
    ">" + archLabel + "</button>";
  var _arch = tally.querySelector('.ts-archive-btn');
  if (_arch && _archReady) _arch.onclick = function() {
    rpmConfirm({
      title: 'Archive this trip?',
      subtitle: 'Upon activation',   // says what happens, like Recover (2026-11-24)
      message: '→ Moves this trip to Past Trips.\n\n→ Nothing is sent to anyone.',
      confirmLabel: 'Archive',
      icon: TRAY_IN_ICON,
      className: 'tv-golive-dlg'
    }).then(function (ok) {
    if (!ok) return;
    var url = getScriptUrl(); if (!url) return;
    _arch.disabled = true; _arch.querySelector('span').textContent = '…';
    callScript(url, 'archiveTrip', { tripStart: trip.tripStart, tripEnd: trip.tripEnd }, function(data) {
      if (data && data.success) {
        addLog('tripsummaryFeed', '✓ Archived ' + trip.tripStart + ' → ' + trip.tripEnd + ' → Past Trips', 'success');
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
  // Title box (user, 2026-11-24): CONFIRMATIONS, the steps and Archive go up into the first box.
  var top = document.getElementById('tripsummaryHead') || wrap;
  top.innerHTML = '';
  var th = head('Confirmations');
  top.appendChild(th);
  // How-to steps under the title, Travel Plan's numbered list (user, 2026-10-20).
  var steps = document.createElement('div');
  steps.className = 'tv-sec-note tv-steps ts-steps';
  steps.innerHTML =
    // Two steps, the first with dashed sub-lines (user, 2026-10-20).
    "<span><i>1.</i>Check confirmations</span>" +
    "<span class='ts-sub'><i>-</i>Auto, manual & awaiting</span>" +
    "<span class='ts-sub'><i>-</i>Needs reply: answer them in Comms, then Manual confirm</span>" +
    "<span class='ts-sub'><i>-</i>No answer yet: Nudge sends a short reminder</span>" +
    "<span><i>2.</i>When all are confirmed, archive the trip</span>";
  top.appendChild(steps);
  tally.classList.add('ts-arch-row');   // Archive under step 2, over the divider (user, 2026-10-20; was on the title line)
  top.appendChild(tally);   // the divider is gone: STATUS is its own box now
  var dates = document.createElement('div');
  dates.className = 'ts-trip-dates';
  dates.innerHTML = trip.confirmed + ' / ' + trip.students.length + ' confirmed' + testBadge;   // the tally under the title; the trip dates dropped (user, 2026-10-20)
  wrap.appendChild(dates);

  var rank = function (x) { return _tsNeedsReply(x) ? 0 : (x.confirmedAt ? 2 : 1); };
  var ordered = trip.students.slice().sort(function(a, b) { return (rank(a) - rank(b)) || a.name.localeCompare(b.name); });
  var list = document.createElement('div');
  ordered.forEach(function(s) {
    var r = document.createElement('div');
    r.className = 'en-card ts-row ' + (_tsNeedsReply(s) ? 'ts-row-reply' : (s.confirmedAt ? 'ts-row-ok' : 'ts-row-wait'));
    list.appendChild(_tsCardFill(r, s));
  });
  wrap.appendChild(list);
  return wrap;
}

// The card IS the whole thing now (user, 2026-11-24): every trip text lives in Comms, so no window,
// no thread. Name + Skip / Resume left; status right (check mark, or a small AWAITING / NEEDS REPLY),
// with Nudge (Awaiting only, sends at once) and Manual confirm under it.
function _tsCardFill(r, s) {
  var resume = String(s.firstBack || '—').replace(/,\s*(\d{1,2}:\d{2}\s*[AP]M)\s*$/i, ' - $1').replace(/^([A-Z][a-z]{2}) /, '$1, ');
  // Two lines (user, 2026-11-24): name left, status right; then Nudge / Manual confirm left, Skip / Resume right.
  r.innerHTML =
    "<div class='ts-c-top'><span class='ts-row-name'>" + _tsEsc(s.name) + "</span>" +
      (s.confirmedAt ? "<span class='ts-row-ok-ico' data-tip='Confirmed'>" + PAID_CHECK_ICON.replace('width="13" height="13"', 'width="15" height="15"') + "</span>" : _tsStatusPill(s)) + "</div>" +
    "<div class='ts-c-bot'><div class='ts-c-btns'></div>" +
      "<div class='ts-facts'><div><label class='field-label ts-lbl'>Skip</label><div class='ts-fact'>" + _tsEsc(s.skipDates || '—') + "</div></div>" +
      "<div><label class='field-label ts-lbl'>Resume</label><div class='ts-fact'>" + _tsEsc(resume) + "</div></div></div></div>";
  if (s.confirmedAt) return r;
  var btns = r.querySelector('.ts-c-btns');
  var url = getScriptUrl();
  if (!_tsNeedsReply(s) && s.phone) {
    var nm = String(s.notes || '').match(/Nudged (\d{4})-(\d{2})-(\d{2})/);
    var nb = document.createElement('button');
    nb.className = 'link-btn';
    nb.textContent = nm ? 'Nudged ' + new Date(+nm[1], nm[2] - 1, +nm[3]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Nudge';
    nb.setAttribute('data-tip', 'Asks first.\nTexts them a short reminder to read the trip text and reply Y.\nShows in Comms.');
    nb.setAttribute('data-tip-wrap', '');
    nb.onclick = function () {
      if (!url) return;
      // Asks first, the Skips delete window's plain look (user, 2026-11-24)
      rpmConfirm({ title: 'Nudge ' + _tsFirst(s.name) + '?', confirmLabel: 'Nudge', className: 'tv-golive-dlg' })   /* red edge like the Skips delete window (user, 2026-11-24) */.then(function (ok) { if (ok) go(); });
    };
    function go() {
      nb.disabled = true; nb.textContent = '…';
      callScript(url, 'nudgeTravel', { row: s.row }, function (d) {
        if (d && d.success) initTripSummaryTab();
        else { addLog('tripsummaryFeed', '❌ ' + (d && d.message ? d.message : 'Nudge failed'), 'error'); nb.disabled = false; nb.textContent = 'Nudge'; }
      });
    }
    btns.appendChild(nb);
  }
  var mb = document.createElement('button');
  mb.className = 'link-btn';
  mb.textContent = 'Manual confirm';
  mb.setAttribute('data-tip', 'Instant.\nMarks them confirmed.\nNothing is sent.');
  mb.setAttribute('data-tip-wrap', '');
  mb.onclick = function () {
    if (!url) return;
    mb.disabled = true; mb.textContent = '…';
    callScript(url, 'markTravelConfirmed', { row: s.row }, function () { initTripSummaryTab(); });
  };
  btns.appendChild(mb);
  return r;
}

// (2026-11-24: no longer opened; trip texts live in Comms.) A student's card in the portal window (_stWin, the Log window's look) (user, 2026-10-20).
var _tsReopenRow = null;   // after Send / Manual confirm the list reloads, then this card opens again
function _tsOpenStudent(s) {
  var w = _stWin('tsStuWin', _tsEsc(s.name), 'Trip confirmation', null, '');   // no icons in windows (user, 2026-11-20); the phone over THREAD is gone too
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
  var t = c.querySelector('.ts-msgs'); if (t) t.scrollTop = t.scrollHeight;
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
  return !!s.needsReview && !s.confirmedAt;   // a reply that isn't Y: Needs reply until Manual confirm (user, 2026-11-24)
}

function _tsStatusPill(s) {
  // Small caps tags at Trial's strength (user, 2026-10-20; were filled pills).
  // Tinted boxes like Payments' Venmo / Zelle badges, so a status never looks like a button (user, 2026-10-20).
  var tag = function (c, t, bg) { return "<span class='ts-tag' style='color:" + c + ";background:" + (bg || "color-mix(in srgb, " + c + " 15%, transparent)") + "'>" + t + "</span>"; };
  if (s.confirmedAt)   return tag('var(--green)', 'Confirmed');
  if (_tsNeedsReply(s)) return tag('var(--warn)', 'Needs reply');   // (user, 2026-10-20; was Needs you)
  if (s.messageSentAt) return tag('var(--accent)', 'Awaiting');   // red (user, 2026-11-24; was the grey key badge)
  return tag('var(--accent)', 'Not sent');
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
  meta.className = 'ts-facts';   // labels above, no colons (2026-11-24; was "SKIP: …<br>RESUME: …")
  meta.innerHTML = "<div><label class='field-label ts-lbl'>Skip</label><div class='ts-fact'>" + _tsEsc(s.skipDates || '—') + "</div></div>" +
    "<div><label class='field-label ts-lbl'>Resume</label><div class='ts-fact'>" + _tsEsc(String(s.firstBack || '—').replace(/,\s*(\d{1,2}:\d{2}\s*[AP]M)\s*$/i, ' - $1').replace(/^([A-Z][a-z]{2}) /, '$1, ')) + "</div></div>";   // "Sun, Dec 13 - 11:30 AM": a dash before the time (user, 2026-10-20)   // labels in caps (user, 2026-10-20)   // Resume on its own line (user, 2026-10-20)
  row.appendChild(meta);

  // Thread (inbound + outbound texts) in a fixed-height dark box, so every card is the
  // same size; it scrolls, opened at the newest (user, 2026-10-20; grew with the thread).
  // The Initiate Thread look (user, 2026-11-24): full-width bands, a TEXTS title row, the bubbles on
  // a lighter band, then COMPOSE TEXT with the plain entry box and Reply.
  var thread = document.createElement('div');
  thread.className = 'ts-msgs';
  var bubs = document.createElement('div');
  bubs.className = 'tr-bubs';
  thread.appendChild(bubs);
  var msgs = (s.thread && s.thread.length) ? s.thread
    : (s.replyText ? [{ dir: 'in', body: s.replyText, ts: s.replyAt }] : []);   // older rows: only the latest reply stored
  if (!msgs.length) thread.innerHTML = "<div class='tr-none'>No texts yet</div>";
  // A centred time line like Messages, before the first text and after any hour-long gap;
  // no you / them line in the bubbles (user, 2026-10-20). ts is "yyyy-MM-dd HH:mm".
  var tsDate = function (t) { var x = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/); return x ? new Date(+x[1], x[2] - 1, +x[3], +x[4], +x[5]) : null; };
  var tsShow = function (d, raw) {
    if (!d) return _tsEsc(raw || '');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +   // "Nov 13 5:32 PM", Initiate's stamp
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  var prevAt = null;
  msgs.forEach(function(m) {
    var out = m.dir === 'out';
    var at = tsDate(m.ts);
    if (m.ts && (!prevAt || !at || at - prevAt > 60 * 60 * 1000)) {
      var stamp = document.createElement('div');
      stamp.className = 'cm-stamp tr-stamp';
      stamp.innerHTML = tsShow(at, m.ts);
      bubs.appendChild(stamp);
    }
    prevAt = at || prevAt;
    var bubble = document.createElement('div');
    bubble.className = 'cm-msg ' + (out ? 'out' : 'in') + ' tr-bub';   // Initiate's bubbles: yours blue right, theirs grey left
    bubble.innerHTML = "<div class='tr-bub-txt'>" + _tsEsc(m.body) + "</div>";
    bubs.appendChild(bubble);
  });
  // Small grey titles over the thread and the text box, like the review cards' (user, 2026-10-20).
  var lbl = function (t) { var l = document.createElement('label'); l.className = 'field-label ts-lbl'; l.textContent = t; return l; };
  // The hand-and-phone (om-100) on its own line over THREAD, bigger (user, 2026-10-20).
  var thHead = document.createElement('div');
  thHead.className = 'ts-band-head';
  thHead.appendChild(lbl('Texts'));
  row.appendChild(thHead);
  row.appendChild(thread);
  setTimeout(function () { thread.scrollTop = thread.scrollHeight; }, 0);

  if (readOnly || s.confirmedAt) return row;   // confirmed: just the thread, no Text back (user, 2026-10-20)

  // Actions: reply box (multi-line, auto-growing) on top, buttons below.
  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-direction:column;gap:6px';

  // The editable blue bubble, like every other text composer (2026-11-24; was a dashed blue textarea).
  // Initiate's COMPOSE TEXT: the plain entry box (user, 2026-11-24; the bubble composer tried first).
  var input = document.createElement('textarea');
  input.rows = 4;
  input.className = 'rpm-field';
  input.disabled = !s.phone;
  var box = input;
  function _tsAutoGrow() {}

  var btnRow = document.createElement('div');
  btnRow.className = 'inq-acts';   // portal buttons on the right, like Trial's (user, 2026-10-20)
  btnRow.style.marginTop = '6px';

  var sendBtn = document.createElement('button');
  sendBtn.innerHTML = REPLY_ICON + '<span>Reply</span>';   // texts Reply, like Trial's threads; the plane is emails only (2026-11-24)
  sendBtn.disabled = !s.phone;
  sendBtn.setAttribute('data-tip', 'Instant.\nTexts them what is in the box.\nShows in the thread.');
  sendBtn.setAttribute('data-tip-left', ''); sendBtn.setAttribute('data-tip-wrap', '');
  sendBtn.className = 'link-btn bright';
  sendBtn.style.cssText = 'display:inline-flex;align-items:center;gap:7px';
  sendBtn.onclick = function() {
    var body = (input.value || '').trim();
    if (!body) return;
    var url = getScriptUrl(); if (!url) return;
    sendBtn.disabled = true; sendBtn.textContent = '…';
    callScript(url, 'sendTravelReply', { row: s.row, body: body }, function(data) {
      if (data && data.success) {
        addLog('tripsummaryFeed', '✓ Texted ' + s.name, 'success');
        _tsRefresh(s.row);
      } else {
        addLog('tripsummaryFeed', '❌ ' + (data && data.message ? data.message : 'Send failed'), 'error');
        sendBtn.disabled = false; sendBtn.innerHTML = REPLY_ICON + '<span>Reply</span>';
      }
    });
  };
  // Enter = new line, ⌘Enter sends, like the Comms reply (user, 2026-11-20; was Enter sends, Shift+Enter new line).
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendBtn.onclick(); }
  });

  var confirmBtn = document.createElement('button');
  var isC = !!s.confirmedAt;
  confirmBtn.textContent = isC ? '✓ Confirmed' : 'Manual confirm';   // marks it without a text (user, 2026-10-20; was Confirm)
  confirmBtn.setAttribute('data-tip', 'Instant.\nMarks them confirmed.\nNothing is sent.');
  confirmBtn.setAttribute('data-tip-left', ''); confirmBtn.setAttribute('data-tip-wrap', '');
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
    nudgeBtn.setAttribute('data-tip', _tsNeedsReply(s) ? 'Locked.\nAnswer their reply first.'
      : 'Instant.\nFills the box with a follow-up asking them to confirm.\nNothing sends until you press Reply.');
    nudgeBtn.setAttribute('data-tip-wrap', '');
    nudgeBtn.disabled = !s.phone || _tsNeedsReply(s);   // a reply waiting on you: no nudge (user, 2026-10-20)
    nudgeBtn.className = 'link-btn amber ts-nudge';
    nudgeBtn.style.cssText = 'order:-1;margin-right:auto';   // bottom left, Send stays right (user, 2026-10-20)
    nudgeBtn.onclick = function() {
      input.value =
        "Hi " + _tsFirst(s.name) + "!\n\n" +
        "Quick follow-up on my earlier note.\n\n" +
        "We'll resume on " + _tsResumePretty(s.firstBack) + ".\n\n" +
        "Please REPLY to THIS MESSAGE with Y to confirm.\n\n" +
        "(Please let me know AT LEAST A WEEK IN ADVANCE if you have a scheduling conflict.)";
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
    if (_tsNeedsReply(s)) { confirmBtn.disabled = true; confirmBtn.setAttribute('data-tip', 'Locked.\nAnswer their reply first.'); }
    head.querySelector('.ts-tag-wrap').appendChild(confirmBtn);
  }
  actions.className = 'ts-band-reply';
  actions.appendChild(lbl('Compose text'));   // (user, 2026-10-20; was Text)
  // Send back under the box, the portal's paper-plane Send (user, 2026-10-20; was briefly inside the box).
  btnRow.insertBefore(sendBtn, btnRow.firstChild);
  actions.appendChild(box);
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
