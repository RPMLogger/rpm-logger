// ─── TRIAL TAB ───────────────────────────────────────────────────────────────
// Reach out, converse, and book. One door: the booking form below the cards.
//   Door 1  Manual: type First/Middle/Last + email + date + time. The portal
//           creates the RPM - Trial calendar event AND the Students Import tab.
//   Door 2  From calendar: you made the event yourself (email in Guests). The
//           portal lists upcoming RPM - Trial events; tap one to pull it in
//           (creates the Students Import tab). Events already pulled show a ✓.
// Backend: bookTrialManual / getTrialAccepted / getTrialStage (RPM_Trial.js).

function initTrialTab() {
  var url = getScriptUrl();
  var body = document.getElementById('trialBody');
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  // Booking is the exit door of this tab, not its furniture: the form and the
  // calendar list stay hidden until he actually decides to book someone.
  body.innerHTML =
    '<div id="trStrip"></div>' +
    '<div class="section-label" style="margin-bottom:10px">Reach out</div>' +
    '<div id="trAccepted"><div class="empty-state">Loading\u2026</div></div>' +
    '<div id="trBookArea" style="display:none">' +
      '<hr class="divider" style="margin:22px 0 16px">' +
      _trManualFormHtml() + '<div id="trStatus"></div>' +
    '</div>' +
    '';
  _trLoadAccepted();
  _trLoadRate();
}

// The trial price for the draft, read from the Website Rates Archive when the
// tab loads. Fetched here rather than when the composer opens so there is no
// wait at the moment he wants to write.
//
// Left null if it cannot be read. The draft then points at the site instead of
// naming a number, because a stale price in an email is a promise you have to
// honour when they turn up.
var _trTrialRate = null;

function _trLoadRate() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getWebsiteRate&type=Trial')
    .then(function (r) { return r.json(); })
    .then(function (d) { _trTrialRate = (d && d.success && d.rate) ? d.rate : null; })
    .catch(function () { _trTrialRate = null; });
}

// ── Accepted (Yes from Inquiries, not yet booked) ────────────────────────────
function _trLoadAccepted() {
  var url = getScriptUrl();
  var box = document.getElementById('trAccepted');
  if (!box || !url) return;
  fetch(url + '?action=getTrialAccepted')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { box.innerHTML = '<div class="empty-state">⚠ ' + (d.message || 'Could not load') + '</div>'; return; }
      _trAcceptedCache = d.accepted || [];
      if (!d.accepted || !d.accepted.length) {
        box.innerHTML = '<div class="empty-state">No accepted inquiries waiting.</div>';
        // Nobody left in Initiate, so nobody can be waiting on a reply. The
        // thread fetch below is skipped on this path, and the badge kept the
        // count from before the last person moved to Trial.
        _trSetInitiateBadge({});
        _trRenderStrip(null);
        return;
      }
      box.innerHTML = d.accepted.map(_trAcceptedCard).join('');
      _trLoadThreads();
    })
    .catch(function () { box.innerHTML = '<div class="empty-state">❌ Could not load.</div>'; });
}

function _trAcceptedCard(a) {
  // Identical markup to an Inquiries card (same classes, same field renderer),
  // so a student's card doesn't change shape when they cross from Inquiries to
  // Trial. Only the action row differs: Book / send back instead of Yes/No.
  var em = _trEsc(a.email || "");
  return '<div class="inq-dcard accepted">' +
      '<div class="inq-drow"><span class="inq-chan">' + inqEsc(a.channel || "Gmail") + '</span></div>' +
      '<div class="inq-name-line"><span class="inq-name">' + inqEsc(a.name || "\u2014") + '</span></div>' +
      '<div class="inq-fields">' + inqCardFieldsHtml(a) + '</div>' +
      '<div class="fc-thread" id="fcth-' + emailToId(a.email || "") + '"></div>' +
      '<div class="inq-acts">' +
        '<button class="db-mini-btn" onclick="_trReopen(\'' + em + '\',' + (a.col || 0) + ', this)" ' +
          'title="Send back to Inquiries as undecided">\u2190 Inquiries</button>' +
        // For the ones he emailed who never came back. Sending them "back to
        // Inquiries" only parks them there undecided; this removes them.
        '<button class="db-mini-btn" onclick="_trDelete(\'' + em + '\',' + (a.col || 0) + ',\'' + _trEsc(a.name || '') + '\', this)" ' +
          'title="Delete this inquiry for good" style="border-color:var(--accent);color:var(--accent)">Delete</button>' +
        '<button class="db-mini-btn" onclick="_trOpenEmail(\'' + em + '\')" style="border-color:var(--green);color:var(--green)">Email</button>' +
        '<button class="db-mini-btn" onclick="_trBookAccepted(\'' + _trEsc(a.name || "") + '\',\'' + em + '\')">Book \u2192</button>' +
      '</div>' +
    '</div>';
}

// Send an accepted student back to the Inquiries tab. Clears the Decision cell;
// nothing is deleted, so they reappear there as an open card with every field
// intact. For the ones you said Yes to and then never booked.
function _trReopen(email, col, btn) {
  var url = getScriptUrl();
  if (!url || !email) return;
  if (btn) { btn.disabled = true; btn.textContent = "Sending back\u2026"; }
  fetch(url + '?action=reopenInquiry&email=' + encodeURIComponent(email) + '&col=' + encodeURIComponent(col || ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        if (btn) { btn.disabled = false; btn.textContent = "\u2190 Inquiries"; }
        _trStatus('\u26a0 ' + (d.message || 'Could not send back.'), 'var(--accent)');
        return;
      }
      _trLoadAccepted();
      _trStatus('Sent back to Inquiries \u2014 waiting there as an open card.', 'var(--accent2)');
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = "\u2190 Inquiries"; }
      _trStatus('\u274c Could not reach the portal.', 'var(--accent)');
    });
}

// ── First contact composer ───────────────────────────────────────────────────
// Temporary, deliberately dumb: you write the email, this supplies the logo and
// the house formatting and sends it. No canned body — the point of this email is
// that it is written to the person. The SMS below is fixed and gets copied into
// iMessage by hand, because that conversation stays on the personal number.
var _trAcceptedCache = [];

function _trFindAccepted(email) {
  var all = _trAcceptedCache.concat(_trStageCache || []);
  for (var i = 0; i < all.length; i++) {
    if ((all[i].email || "") === email) return all[i];
  }
  return null;
}

function _trSmsText(first) {
  return "Hey " + first + "! This is Bilgehan from RED PICK MUSIC. " +
         "I received your request for a trial lesson and just responded via email.";
}

// Show the email exchange on each card. Gmail is the record, nothing is stored
// here. Incoming messages get a green edge so a reply is obvious at a glance.
// Top strip. ACTIVE = an email exchange exists. WAITING = nobody has written
// to them yet, so they are waiting on him. This is the glance that stops
// someone sitting unnoticed.
// ── Offered times → one-click booking ────────────────────────────────────────
// Parse the times out of HIS OWN sent messages, never out of their reply.
// "Monday generally works, we can try Sep 7" is prose and any parser for it
// would be confidently wrong sometimes. The offered lines are a format he
// controls: "Wed, Sep 2 at 4:30 pm". He reads which one they took and clicks it.
// Year comes from the card's inquiry date, per his rule.
var _trThreadCache = {};
var _TR_MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

function _trYearFromCard(a) {
  var m = /(\d{4})/.exec((a && a.date) || '');
  return m ? parseInt(m[1], 10) : (new Date()).getFullYear();
}

function _trPad(n) { return (n < 10 ? '0' : '') + n; }

// Returns [{label, date:"yyyy-mm-dd", time:"HH:mm"}], in the order offered,
// de-duplicated.
function _trParseOfferedTimes(text, year) {
  var out = [], seen = {};
  var re = /\b(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\.?,?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\s*(?:at|@|,)?\s*(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/gi;
  var m;
  while ((m = re.exec(text || '')) !== null) {
    var mon = _TR_MONTHS[m[1].slice(0, 3).toLowerCase()];
    var day = parseInt(m[2], 10);
    var hr  = parseInt(m[3], 10) % 12;
    var min = parseInt(m[4], 10);
    if (m[5].toLowerCase() === 'p') hr += 12;
    if (mon === undefined || day < 1 || day > 31) continue;
    var iso = year + '-' + _trPad(mon + 1) + '-' + _trPad(day);
    var hhmm = _trPad(hr) + ':' + _trPad(min);
    var key = iso + 'T' + hhmm;
    if (seen[key]) continue;
    seen[key] = true;
    var d = new Date(year, mon, day);
    var dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    var monName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mon];
    var h12 = (hr % 12) || 12;
    out.push({
      label: dayName + ' ' + monName + ' ' + day + ', ' + h12 + ':' + _trPad(min) + ' ' + (hr < 12 ? 'am' : 'pm'),
      date:  iso,
      time:  hhmm
    });
  }
  return out;
}

// Paint the offered times INTO the booking step. They belong next to the date
// and time fields they fill, not under the conversation.
function _trRenderOfferedSlots(email) {
  var box = document.getElementById('trOfferedSlots');
  if (!box) return;
  var a = _trFindAccepted(email);
  var t = _trThreadCache && _trThreadCache[email];
  if (!a || !t || !t.messages) { box.innerHTML = ''; return; }

  var mine = t.messages.filter(function (m) { return m.fromMe; })
                       .map(function (m) { return m.text; }).join('\n');
  var slots = _trParseOfferedTimes(mine, _trYearFromCard(a));
  if (!slots.length) { box.innerHTML = ''; return; }

  box.innerHTML =
    '<div style="margin:2px 0 2px">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">TIMES YOU OFFERED</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        slots.map(function (s) {
          return '<button class="db-mini-btn" onclick="_trPickSlot(\'' + s.date + '\',\'' + s.time + '\')">' +
                   inqEsc(s.label) +
                 '</button>';
        }).join('') +
      '</div>' +
    '</div>';
}

// Chip click just fills date and time; name and email are already in place.
function _trPickSlot(date, time) {
  function set(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
  set('trDate', date);
  set('trTime', time);
  _trDtShow('tr');
  _trStatus('Set to ' + date + ' at ' + time + '. Check it, then Book trial.', 'var(--accent2)');
}

function _trRenderStrip(threads) {
  var el = document.getElementById('trStrip');
  if (!el) return;
  var active = [], waiting = [], bounced = [];
  _trAcceptedCache.forEach(function (a) {
    var t = threads && threads[a.email];
    var first = (a.name || '').split(' ')[0];
    if (t && t.bouncedOn) { bounced.push(first); return; }
    if (t && t.count > 0) active.push(first); else waiting.push(first);
  });
  if (!active.length && !waiting.length && !bounced.length) { el.innerHTML = ''; return; }

  function group(label, names, color) {
    if (!names.length) return '';
    return '<span style="font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:1px;color:' + color + '">' +
             label + ':</span> ' +
           '<span style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text)">' +
             names.map(inqEsc).join(', ') +
           '</span>';
  }
  var parts = [group('ACTIVE', active, 'var(--green)'),
               group('WAITING', waiting, 'var(--accent2)'),
               group('BOUNCED', bounced, 'var(--accent)')]
                .filter(function (x) { return x; });
  el.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;' +
        'padding:11px 14px;margin-bottom:14px;display:flex;gap:22px;flex-wrap:wrap">' +
      parts.join('') +
    '</div>';
}

// The Initiate nav badge: how many people are waiting on a reply FROM HIM.
// Fetched once at portal load, so a reply is visible without opening the tab.
// This is a load-time fetch, not polling; the same call also renders the tab,
// so opening Initiate costs nothing extra.
var _trThreadsPrimed = null;

function _trSetInitiateBadge(threads) {
  var el = document.getElementById('initNavBadge');
  if (!el) return;
  var n = 0;
  Object.keys(threads || {}).forEach(function (em) {
    var t = threads[em];
    if (t && t.stage === 'initiate' && t.theirTurn) n++;
  });
  if (n > 0) { el.textContent = n; el.style.display = 'inline-block'; }
  else       { el.style.display = 'none'; }
}

function refreshInitiateBadge() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getFirstContactThreads')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success || !d.threads) return;
      _trThreadsPrimed = d.threads;      // reused by the tab so it does not refetch
      _trSetInitiateBadge(d.threads);
    })
    .catch(function () {});
}

function _trLoadThreads() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getFirstContactThreads')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success || !d.threads) { _trRenderStrip(null); return; }
      _trThreadCache = d.threads;
      _trSetInitiateBadge(d.threads);
      _trRenderStrip(d.threads);
      Object.keys(d.threads).forEach(function (email) {
        var box = document.getElementById('fcth-' + emailToId(email));
        if (!box) return;
        var t = d.threads[email];
        if (!t.messages || !t.messages.length) { box.innerHTML = ''; return; }
        var id = emailToId(email);
        box.innerHTML =
          '<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:9px">' +
            _trBounceRow(t) +
            t.messages.map(_trMsgRow).join('') +
            (t.threadId
              ? '<div id="fcrp-' + id + '">' +
                  '<button class="db-mini-btn" onclick="_trOpenReply(\'' + id + '\',\'' + t.threadId + '\')">Reply</button>' +
                '</div>'
              : '') +
          '</div>';
      });
    })
    .catch(function () { /* leave the cards alone if Gmail is unreachable */ });
}

function _trOpenReply(id, threadId) {
  var box = document.getElementById('fcrp-' + id);
  if (!box) return;
  // ⚠️ NO SINGLE QUOTES IN HERE. This string is dropped into a single-quoted
  // style attribute, so a quoted font name ended the attribute early and every
  // declaration after font-family was thrown away as junk attributes. That is
  // why the subject rendered in Arial and the body in monospace: neither was
  // styled at all, both were browser defaults. CSS accepts an unquoted family
  // name, so there is no reason to quote it.
  //
  // Arial on purpose, for both. It is proportional, which suits prose better
  // than a monospace grid, and it is close to what Gmail will actually render,
  // so the composer looks like the email it produces.
  var inp = "box-sizing:border-box;width:100%;background:var(--bg);border:1px solid var(--border);" +
            "border-radius:8px;padding:9px 12px;color:rgba(255,255,255,.62);" +
            "font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6";
  box.innerHTML =
    '<textarea id="fcrpb-' + id + '" rows="5" placeholder="Reply in this thread…" style="' + inp + ';line-height:1.55;resize:vertical"></textarea>' +
    '<div id="fcrps-' + id + '"></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button class="db-mini-btn" onclick="_trCancelReply(\'' + id + '\',\'' + threadId + '\')">Cancel</button>' +
      '<button class="db-mini-btn" id="fcrpbtn-' + id + '" onclick="_trSendReply(\'' + id + '\',\'' + threadId + '\')" style="border-color:var(--green);color:var(--green)">Send reply</button>' +
    '</div>';
  var ta = document.getElementById('fcrpb-' + id);
  if (ta) ta.focus();
}

function _trCancelReply(id, threadId) {
  var box = document.getElementById('fcrp-' + id);
  if (box) box.innerHTML = '<button class="db-mini-btn" onclick="_trOpenReply(\'' + id + '\',\'' + threadId + '\')">Reply</button>';
}

function _trSendReply(id, threadId) {
  var url = getScriptUrl();
  var ta  = document.getElementById('fcrpb-' + id);
  var st  = document.getElementById('fcrps-' + id);
  var btn = document.getElementById('fcrpbtn-' + id);
  if (!url || !ta) return;
  var body = ta.value || '';
  if (!body.trim()) {
    if (st) st.innerHTML = '<div style="color:var(--accent);font-family:\'DM Mono\',monospace;font-size:11px;margin-top:6px">Write something first.</div>';
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  fetch(url + '?action=replyFirstContact&threadId=' + encodeURIComponent(threadId) +
        '&body=' + encodeURIComponent(body))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        if (btn) { btn.disabled = false; btn.textContent = 'Send reply'; }
        if (st) st.innerHTML = '<div style="color:var(--accent);font-family:\'DM Mono\',monospace;font-size:11px;margin-top:6px">⚠ ' + (d.message || 'Could not send') + '</div>';
        return;
      }
      _trRefreshThreads();   // redraw so the reply appears in the thread
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Send reply'; }
      if (st) st.innerHTML = '<div style="color:var(--accent);font-family:\'DM Mono\',monospace;font-size:11px;margin-top:6px">❌ Could not reach the portal.</div>';
    });
}

// A delivery failure is the one state that looks identical to "they just have
// not answered yet". Say it plainly, at the top of the thread.
function _trBounceRow(t) {
  if (!t || !t.bouncedOn) return '';
  return '<div style="border-left:2px solid var(--accent);padding:0 0 0 9px;margin-bottom:10px">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--accent)">' +
        '⚠ Mail to this address bounced on ' + inqEsc(t.bouncedOn) + '. Check the spelling.' +
      '</div>' +
    '</div>';
}

function _trMsgRow(m) {
  var mine = !!m.fromMe;
  var who  = mine ? 'You' : 'Them';
  var edge = mine ? 'var(--border)' : 'var(--green)';
  return '<div style="border-left:2px solid ' + edge + ';padding:0 0 0 9px;margin-bottom:8px">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted)">' +
        inqEsc(who) + ' · ' + inqEsc(m.date) + ' ' + inqEsc(m.time) +
      '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:11px;line-height:1.5;color:rgba(255,255,255,.62);margin-top:2px;white-space:pre-wrap">' +
        inqEsc(m.text) +
      '</div>' +
    '</div>';
}

function _trPhonePretty(raw) {
  var d = (raw || "").toString().replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  if (d.length !== 10) return (raw || "").toString();
  return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
}

function _trCopyPhone(btn, digits) {
  var was  = btn.textContent;
  var done = function () { btn.textContent = "Copied \u2713"; setTimeout(function () { btn.textContent = was; }, 1600); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(digits).then(done, done);
  } else { done(); }
}


// ── The first-contact draft ──────────────────────────────────────────────────
// Lifted from the three he actually sent (Cathy Sep 1, Gene Sep 1, Daniyal
// Sep 2). Those were about 70% identical: the same thanks line, the same
// beginner line, the same overbooked paragraph word for word, the same price
// and details lines. He was retyping all of it, which is why the wording drifted
// between them ("reach your goal" / "achieve your goal").
//
// So the letter arrives written and he edits it like any email: add, cut,
// reorder. It is a starting point, not a form.
//
// Deliberately NO placeholder text anywhere. No [write here], no {TIMES}. A
// placeholder is a thing that gets sent by accident, which is exactly how a
// student once received an email containing the literal text {FORM LINK}. The
// slots are blank lines instead, and the cursor lands on the personal one.
function _trDraftHead(first) {
  return "Hi " + first + "!\n\n" +
         "Thanks for your inquiry. I can definitely help you reach your goal.\n";
}

function _trDraftTail() {
  var price = _trTrialRate
    ? "The trial lesson is $" + _trTrialRate + ", and the ongoing rates are on the site at redpickmusic.com/lessons."
    : "The trial lesson price and the ongoing rates are on the site at redpickmusic.com/lessons.";
  return "\nBeing a beginner is totally okay.\n\n" +
         "I have been overbooked since the beginning of this year, but finally some spots are about to open, " +
         "so your request came at a really good time. Spots fill up very quickly, so if you can make it, " +
         "let's have a trial lesson to meet and play.\n\n" +
         "Do you own a guitar?\n\n" +
         "Can you make any of these times for a trial lesson?\n\n" +
         "\n\n" +
         price + "\n\n" +
         "Once we set a time, you'll automatically receive an email with all the details: " +
         "the address, how to get in, parking and transit, rates, and payment options.\n\n" +
         "Looking forward to meeting you!";
}

function _trOpenEmail(email) {
  var a = _trFindAccepted(email);
  if (!a) return;
  var first = (a.name || "").split(" ")[0];
  var head  = _trDraftHead(first);
  var body  = head + _trDraftTail();
  var sms   = _trSmsText(first);
  var phoneDigits = (a.phone || "").toString().replace(/\D/g, "");
  var phonePretty = _trPhonePretty(a.phone);

  // Same style as the composer. See the note there: no single quotes in this
  // string, and Arial because these boxes hold prose, not code.
  var inp = "box-sizing:border-box;width:100%;background:var(--bg);border:1px solid var(--border);" +
            "border-radius:8px;padding:9px 12px;color:rgba(255,255,255,.62);" +
            "font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6";

  var overlay = document.createElement("div");
  overlay.id = "trFcModal";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;" +
                          "align-items:center;justify-content:center;padding:18px;overflow:auto";
  overlay.innerHTML =
    "<div style='background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:600px;width:100%;padding:18px;box-sizing:border-box;max-height:92vh;overflow:auto'>" +
      "<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:12px'>" +
        "<div class='section-label' style='margin-bottom:0'>Compose &middot; " + inqEsc(a.name || "") + "</div>" +
        "<button onclick='_trCloseEmail()' style='background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer'>✕</button>" +
      "</div>" +
      "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--muted);margin-bottom:8px'>To: " + inqEsc(email) + "</div>" +
      "<input id='trFcSubject' value='About your trial lesson request' style='" + inp + ";margin-bottom:8px'>" +
      "<textarea id='trFcBody' rows='16' style='" + inp + ";line-height:1.55;resize:vertical'>" + inqEsc(body) + "</textarea>" +
      "<div id='trFcStatus'></div>" +
      "<div style='display:flex;gap:8px;margin-top:12px'>" +
        "<button class='db-mini-btn' id='trFcPrevBtn' onclick='_trPreviewEmail()'>Preview</button>" +
        "<button class='db-mini-btn' id='trFcSendBtn' onclick='_trSendEmail()' " +
          "style='border-color:var(--green);color:var(--green)'>Send</button>" +
      "</div>" +
      "<div id='trFcPreview'></div>" +
      "<hr class='divider' style='margin:18px 0 12px'>" +
      "<div class='section-label' style='margin-bottom:6px'>Then text them</div>" +
      "<textarea id='trFcSms' rows='3' readonly style='" + inp + ";line-height:1.55;resize:vertical'>" + inqEsc(sms) + "</textarea>" +
      "<button onclick='_trCopySms(this)' style='width:100%;margin-top:8px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:11px;font-family:\"DM Mono\",monospace;font-size:12px;cursor:pointer'>Copy for iMessage</button>" +
      (phoneDigits
        ? "<div style='display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap'>" +
            // The number and the copy action are one thing, not a label with a
            // button beside it. Tap what you can read.
            "<button class='db-mini-btn' onclick='_trCopyPhone(this,\"" + phoneDigits + "\")'>" +
              "Copy Phone #: " + inqEsc(phonePretty) + "</button>" +
            "<a class='db-mini-btn' href='sms:" + phoneDigits + "' style='text-decoration:none'>Open Messages</a>" +
          "</div>"
        : "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--accent);margin-top:10px'>No phone number on file for this inquiry.</div>") +
    "</div>";
  overlay.addEventListener("click", function (ev) { if (ev.target === overlay) _trCloseEmail(); });
  document.body.appendChild(overlay);
  overlay._email = email;

  var ta = document.getElementById("trFcBody");
  if (ta) {
    ta.focus();
    // The blank line after the thanks line: the one part only he can write.
    var at = head.length;
    ta.setSelectionRange(at, at);
    ta.scrollTop = 0;
  }
}

function _trCloseEmail() {
  var m = document.getElementById("trFcModal");
  if (m) m.remove();
}

function _trCopySms(btn) {
  var ta = document.getElementById("trFcSms");
  if (!ta) return;
  var done = function () { btn.textContent = "Copied ✓"; setTimeout(function () { btn.textContent = "Copy for iMessage"; }, 1600); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); document.execCommand("copy"); done(); });
  } else { ta.select(); document.execCommand("copy"); done(); }
}

// Render exactly what will be sent (logo shown as a placeholder — the real one
// is a cid: attachment that only resolves inside the email itself).
function _trPreviewEmail() {
  var url = getScriptUrl();
  var body = (document.getElementById("trFcBody") || {}).value || "";
  var box = document.getElementById("trFcPreview");
  if (!url || !box) return;
  box.innerHTML = "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--muted);margin-top:12px'>Rendering…</div>";
  fetch(url + "?action=previewFirstContact&body=" + encodeURIComponent(body))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { box.innerHTML = "<div style='color:var(--accent);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:12px'>⚠ " + (d.message || "Could not render") + "</div>"; return; }
      var html = d.html.replace(/<img[^>]*cid:logo[^>]*>/i,
        "<div style=\"width:80px;height:80px;border:1px dashed #bbb;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font:10px/1.2 monospace;color:#888\">LOGO</div>");
      box.innerHTML =
        "<div style='margin-top:14px'>" +
          "<div class='section-label' style='margin-bottom:6px'>Preview</div>" +
          "<div style='background:#fff;color:#111;border:1px solid var(--border);border-radius:10px;padding:22px;" +
              "font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5'>" + html + "</div>" +
        "</div>";
    })
    .catch(function () { box.innerHTML = "<div style='color:var(--accent);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:12px'>❌ Could not reach the portal.</div>"; });
}

function _trSendEmail() {
  var overlay = document.getElementById("trFcModal");
  var url = getScriptUrl();
  if (!overlay || !url) return;
  var email   = overlay._email;
  var subject = (document.getElementById("trFcSubject") || {}).value || "";
  var body    = (document.getElementById("trFcBody") || {}).value || "";
  var st      = document.getElementById("trFcStatus");
  var btn     = document.getElementById("trFcSendBtn");

  if (!body.trim()) {
    if (st) st.innerHTML = "<div style='color:var(--accent);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:8px'>Write something first.</div>";
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
  if (st) st.innerHTML = "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--accent2);margin-top:8px'>Sending…</div>";

  // col so the "Email Sent" stamp lands on THIS inquiry, not the first column
  // that happens to share the address.
  var card = _trFindAccepted(email);
  fetch(url + "?action=sendFirstContact" +
        "&email="   + encodeURIComponent(email) +
        "&col="     + encodeURIComponent((card && card.col) || "") +
        "&subject=" + encodeURIComponent(subject) +
        "&body="    + encodeURIComponent(body))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        if (btn) { btn.disabled = false; btn.textContent = "Send"; }
        if (st) st.innerHTML = "<div style='color:var(--accent);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:8px'>⚠ " + (d.message || "Could not send") + "</div>";
        return;
      }
      if (st) st.innerHTML = "<div style='color:var(--green);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:8px'>✓ Sent. Now copy the text below into iMessage.</div>";
      if (btn) btn.textContent = "Sent ✓";
      _trLoadAccepted();
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = "Send"; }
      if (st) st.innerHTML = "<div style='color:var(--accent);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:8px'>❌ Could not reach the portal.</div>";
    });
}

// The booking half is hidden until it is wanted.
function _trShowBookArea(scroll) {
  var area = document.getElementById('trBookArea');
  var tog  = document.getElementById('trBookToggle');
  if (!area) return;
  area.style.display = '';
  if (tog) tog.style.display = 'none';
  var sb = document.getElementById('trOfferedSlots');
  if (sb && scroll) sb.innerHTML = '';   // opened manually: no card, no offers
  if (scroll) {
    var f = document.getElementById('trFirst');
    if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Prefill the manual booking form from an accepted card + scroll to it.
function _trBookAccepted(name, email) {
  _trShowBookArea(false);
  var parts = (name || '').split(' ');
  var first = parts.shift() || '';
  var last = parts.pop() || '';
  var middle = parts.join(' ');
  function set(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
  set('trFirst', first); set('trMiddle', middle); set('trLast', last); set('trEmail', email);
  set('trDate', ''); set('trTime', '');
  _trDtShow('tr');
  _trRenderOfferedSlots(email);
  var f = document.getElementById('trFirst');
  if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.focus(); }
  _trStatus('Filled in ' + name + ' — pick a date + time, then Book trial.', 'var(--accent2)');
}

// ── Door 1: manual booking form ──────────────────────────────────────────────
function _trManualFormHtml(p) {
  p = p || 'tr';
  function inp(id, ph, type) {
    return '<input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + ph + '" ' +
      'style="box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:8px;' +
      'padding:11px 14px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:14px">';
  }
  return '<div class="section-label" style="margin-bottom:10px">Book a trial</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">' +
      '<div style="display:flex;gap:8px">' +
        '<span style="flex:1">' + inp(p + 'First', 'First') + '</span>' +
        '<span style="flex:1">' + inp(p + 'Middle', 'Middle (optional)') + '</span>' +
        '<span style="flex:1">' + inp(p + 'Last', 'Last') + '</span>' +
      '</div>' +
      inp(p + 'Email', 'student email (goes in calendar Guests)', 'email') +
      inp(p + 'Phone', 'phone (for reminder texts)', 'tel') +
      '<div id="' + p + 'OfferedSlots"></div>' +
      _trDtHtml(p) +
    '</div>' +
    '<button id="' + p + 'BookBtn" onclick="_trBook(\'' + p + '\')" ' +
      'style="width:100%;box-sizing:border-box;background:var(--accent);color:#fff;border:none;border-radius:10px;' +
      'padding:13px;font-family:\'Syne\',sans-serif;font-size:15px;font-weight:700;cursor:pointer">＋ Book trial</button>';
}

function _trBook(p) {
  p = p || 'tr';
  var url = getScriptUrl();
  var first = _trVal(p + 'First'), middle = _trVal(p + 'Middle'), last = _trVal(p + 'Last');
  var email = _trVal(p + 'Email'), date = _trVal(p + 'Date'), time = _trVal(p + 'Time');
  var phone = _trVal(p + 'Phone');
  // All four are required. Without an email the calendar event has no guest,
  // so Secretary sends no confirmation and they arrive knowing nothing.
  if (!first)                    { _trStatus('Enter at least a first name.', 'var(--accent)', p); return; }
  if (!email)                    { _trStatus('Email is required, otherwise they never get the confirmation.', 'var(--accent)', p); return; }
  if (email.indexOf('@') === -1) { _trStatus('That email looks off.', 'var(--accent)', p); return; }
  if (!date || !time)            { _trStatus('Pick a date and time.', 'var(--accent)', p); return; }
  var btn = document.getElementById(p + 'BookBtn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'wait'; btn.textContent = 'Booking…'; }
  _trStatus('Creating the calendar event…', 'var(--accent2)', p);
  var qs = 'action=bookTrialManual' +
    '&first=' + encodeURIComponent(first) + '&middle=' + encodeURIComponent(middle) +
    '&last=' + encodeURIComponent(last) + '&email=' + encodeURIComponent(email) +
    '&phone=' + encodeURIComponent(phone) +
    '&date=' + encodeURIComponent(date) + '&time=' + encodeURIComponent(time);
  fetch(url + '?' + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      _trRestoreBook(p);
      if (!d.success) { _trStatus('⚠ ' + (d.message || 'Failed'), 'var(--accent)', p); return; }
      // No tab is created any more: a booked trial is not a student yet.
      _trStatus('✓ Booked ' + d.name + ' — ' + d.dateLabel +
                (d.cardMade ? ' · card created, they are in the Trial tab now'
                            : ' · they are in the Trial tab now'), 'var(--green)', p);
      ['First','Middle','Last','Email','Phone','Date','Time'].forEach(function (f) { var el = document.getElementById(p + f); if (el) el.value = ''; });
      _trDtShow(p);
      var sb = document.getElementById(p + 'OfferedSlots'); if (sb) sb.innerHTML = '';
      if (p === 'tr') _trLoadAccepted(); else initTrialStageTab();
    })
    .catch(function () { _trRestoreBook(p); _trStatus('❌ Could not reach the portal.', 'var(--accent)', p); });
}

function _trRestoreBook(p) {
  var btn = document.getElementById((p || 'tr') + 'BookBtn');
  if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = 'pointer'; btn.textContent = '＋ Book trial'; }
}

// ── Trial date/time stepper ─────────────────────────────────────────────────
// ◀ Sun, Sep 13 ▶   ▲ 10:30 PM ▼   (day steps ±1, time steps ±15 min)
// The real values live in hidden inputs p+'Date' (yyyy-MM-dd) and p+'Time'
// (HH:mm), so _trBook, _trPickSlot and the reset keep reading/writing them as
// before. A blank value shows as tomorrow at 5:00 PM.
var _TR_DT_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var _TR_DT_DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function _trDtPad(n) { return (n < 10 ? '0' : '') + n; }
function _trDtYmd(d) { return d.getFullYear() + '-' + _trDtPad(d.getMonth() + 1) + '-' + _trDtPad(d.getDate()); }

function _trDtDefault() {
  var d = new Date(); d.setDate(d.getDate() + 1);
  return { date: _trDtYmd(d), time: '17:00' };
}

function _trDtHtml(p) {
  var def = _trDtDefault();
  var btn = function (fn, n, txt) {
    return '<button type="button" onclick="' + fn + '(\'' + p + '\',' + n + ')" ' +
      'style="background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);' +
      'min-width:38px;padding:9px 0;font-size:13px;cursor:pointer">' + txt + '</button>';
  };
  var lbl = 'style="font-family:\'DM Mono\',monospace;font-size:15px;color:var(--text);text-align:center"';
  return '<input type="hidden" id="' + p + 'Date" value="' + def.date + '">' +
    '<input type="hidden" id="' + p + 'Time" value="' + def.time + '">' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
      btn('_trDtStepDate', -1, '\u25c0') +
      '<span id="' + p + 'DateLbl" ' + lbl.replace('text-align:center', 'text-align:center;min-width:130px') + '>' + _trDtDateLabel(def.date) + '</span>' +
      btn('_trDtStepDate', 1, '\u25b6') +
      '<span style="width:18px"></span>' +
      btn('_trDtStepTime', 15, '\u25b2') +
      '<span id="' + p + 'TimeLbl" ' + lbl.replace('text-align:center', 'text-align:center;min-width:90px') + '>' + _trDtTimeLabel(def.time) + '</span>' +
      btn('_trDtStepTime', -15, '\u25bc') +
    '</div>';
}

function _trDtParseDate(v) {
  var m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function _trDtMins(v) {
  var m = String(v || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? (+m[1] * 60 + +m[2]) : null;
}
function _trDtDateLabel(v) {
  var d = _trDtParseDate(v);
  return d ? _TR_DT_DAY[d.getDay()] + ', ' + _TR_DT_MON[d.getMonth()] + ' ' + d.getDate() : '\u2014';
}
function _trDtTimeLabel(v) {
  var t = _trDtMins(v);
  if (t === null) return '\u2014';
  var h = Math.floor(t / 60), mi = t % 60;
  return ((h % 12) || 12) + ':' + _trDtPad(mi) + (h < 12 ? ' AM' : ' PM');
}

// Fill blanks with the default and redraw both labels.
function _trDtShow(p) {
  var di = document.getElementById(p + 'Date'), ti = document.getElementById(p + 'Time');
  if (!di || !ti) return;
  var def = _trDtDefault();
  if (!_trDtParseDate(di.value)) di.value = def.date;
  if (_trDtMins(ti.value) === null) ti.value = def.time;
  var dl = document.getElementById(p + 'DateLbl'), tl = document.getElementById(p + 'TimeLbl');
  if (dl) dl.textContent = _trDtDateLabel(di.value);
  if (tl) tl.textContent = _trDtTimeLabel(ti.value);
}

function _trDtStepDate(p, n) {
  _trDtShow(p);
  var di = document.getElementById(p + 'Date');
  var d = _trDtParseDate(di.value);
  d.setDate(d.getDate() + n);
  di.value = _trDtYmd(d);
  _trDtShow(p);
}

// Snaps to the 15-minute grid, stays within the same day.
function _trDtStepTime(p, n) {
  _trDtShow(p);
  var ti = document.getElementById(p + 'Time');
  var t = _trDtMins(ti.value);
  t = Math.round(t / 15) * 15 + n;
  t = Math.max(0, Math.min(23 * 60 + 45, t));
  ti.value = _trDtPad(Math.floor(t / 60)) + ':' + _trDtPad(t % 60);
  _trDtShow(p);
}

// ── helpers ──────────────────────────────────────────────────────────────────
function _trVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function _trStatus(msg, color, p) {
  var st = document.getElementById((p || 'tr') + 'Status');
  if (!st) return;
  st.innerHTML = msg ? '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' +
    (color || 'var(--muted)') + ';border-radius:8px;padding:10px 14px;margin-top:10px;' +
    'font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text)">' + msg + '</div>' : '';
}
function _trEsc(s) {
  return (s || '').toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}


// ─── TRIAL STAGE TAB ─────────────────────────────────────────────────────────
// Booked, and not yet a student. Same card and same conversation as Initiate,
// carried across untouched; only the booked slot is added. Nothing is copied,
// the card is rebuilt from the same inquiry archive and the thread is read from
// Gmail, so there is no second copy of anything to drift.
var _trStageCache = [];
var _trStageLoaded = false;   // has the booked list arrived yet?

function initTrialStageTab() {
  var url = getScriptUrl();
  var body = document.getElementById('trialStageBody');
  if (!body) return;
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  body.innerHTML = '<div class="empty-state">Loading…</div>';

  // Payments go first and run in parallel. Reading the booked list means
  // reading the inquiry archive and the calendar, which is slow, and the
  // payments are the thing to see before clicking on anyone.
  _trLoadPayments();

  fetch(url + '?action=getTrialStage')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state">⚠ ' + (d.message || 'Could not load') + '</div>'; return; }
      _trStageCache = d.booked || [];
      _trStageLoaded = true;
      // The payments list is already on screen by now, drawn without matches.
      // Now that we know who is booked, redraw just those notes.
      _trPayRender();
      if (!_trStageCache.length) { body.innerHTML = '<div class="empty-state">No booked trials.</div>' + _trStageBookHtml(); return; }
      body.innerHTML = _trStageCache.map(_trStageCard).join('') + _trStageBookHtml();
      _trPaintPaid();
      _trLoadStageThreads();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not load.</div>'; });
}

function _trStageCard(a) {
  var when = a.trialDateLabel || '';
  return '<div class="inq-dcard accepted" style="border-left-color:var(--accent)" id="trcard-' + emailToId(a.email || '') + '">' +
      '<div class="inq-name-line"><span class="inq-name">' + inqEsc(a.name || '—') + '</span></div>' +
      // "TRIAL - Sun, Sep 13 - 11:15 AM" on its own line, then a divider.
      (when
        ? '<div style="font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:1px;margin-top:4px;color:' +
            (a.trialPast ? 'var(--muted)' : 'var(--green)') + '">' +
            'TRIAL - ' + inqEsc(when.replace(/^(\w{3})\s+/, '$1, ').replace(/\s+·\s+/, ' - ')) +
          '</div>'
        : '') +
      '<hr class="divider" style="margin:10px 0 0">' +
      '<div id="trpaid-' + emailToId(a.email || '') + '"></div>' +
      _trStepsHtml(a) +
      '<hr class="divider" style="margin:0 0 10px">' +
      '<div class="inq-fields">' + inqCardFieldsHtml(a) + '</div>' +
      '<div class="fc-thread" id="fcth-' + emailToId(a.email || '') + '"></div>' +
      _trActionsHtml(a) +
    '</div>';
}

// ── The checklist ────────────────────────────────────────────────────────────
// Two lists of step buttons at the top of each card. Each opens its own small
// window; a done step just gets a check mark. Make student (red, bottom of the
// card) only works once the six decision steps on the left are done.
//   Left, the decision:
//   Info        Save pressed in the Info window (boxes may stay empty)
//   Dropbox     folder created + shared with their Dropbox email
//   Frequency   Weekly / Biweekly
//   Pick a time the first regular lesson, date + time, in the future
//   Payment     ticks when the trial payment is found (or Paid on the row); window shows it
//   Terms       sent, then DONE only when the acknowledgment form is back
//   Right, the lesson itself (never required):
//   Log lesson  What We Did, typed or dictated
//   Send HW     drop files into their Dropbox folder
// Everything is read from and saved to the Trial Lessons row.
// Backend: getTrialRecord / saveTrialRecord (RPM_TrialSheet.gs),
// trialDropbox / previewTrialTerms / sendTrialTerms (RPM_TrialLesson.gs).
var _TR_INFO = [
  { key: 'city',         label: 'City' },
  { key: 'schoolJob',    label: 'School / Job' },
  { key: 'guitar',       label: 'Guitar' },
  { key: 'availability', label: 'Availability', multi: true },
  { key: 'goals',        label: 'Goals / Styles', multi: true }   // one box; saves to the Goals column
];

// Left: the path to a decision (all needed for Make student).
// Right: the lesson itself, separate, never required.
var _TR_STEPS = [
  { key: 'info',  label: 'Info' },
  { key: 'dbx',   label: 'Dropbox' },
  { key: 'freq',  label: 'Frequency' },
  { key: 'time',  label: 'Pick a time' },
  { key: 'pay',   label: 'Payment' },                   // trial payment; the window shows what was found
  { key: 'terms', label: 'Terms' },
  { key: 'log',   label: 'Log lesson', lesson: true },
  { key: 'hw',    label: 'Send HW',    lesson: true }
];

function _trFilled(v) { return !!String(v == null ? '' : v).trim(); }

// "2026-09-20 14:30" → Date, or null.
function _trFirstLessonDate(v) {
  var m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
}

function _trFirstLessonLabel(v) {
  var d = _trFirstLessonDate(v);
  if (!d) return '';
  var h = d.getHours(), mi = d.getMinutes();
  return _MS_DAYS[d.getDay()] + ', ' + _MS_MONTHS[d.getMonth()] + ' ' + d.getDate() +
         ' at ' + ((h % 12) || 12) + ':' + _msPad(mi) + (h < 12 ? ' AM' : ' PM');
}

// { info, dbx, log, freq, time, terms: true/false, termsSent, ready, missing[] }
function _trStepState(a) {
  var s = a.lesson || {};
  var st = {
    info:  s.infoDone === true || String(s.infoDone || '').toUpperCase() === 'TRUE',
    dbx:   !!s.dropboxMade,
    log:   _trFilled(s.whatWeDid),
    hw:    false,
    freq:  /^(weekly|biweekly)$/i.test(String(s.frequency || '').trim()),
    time:  (function () { var d = _trFirstLessonDate(s.firstLesson); return !!d && d > new Date(); })(),
    pay:   s.paid === true || String(s.paid || '').toUpperCase() === 'TRUE' || !!_trTrialPayFor(a.email),
    terms: !!s.termsBack,
    termsSent: !!s.termsSent
  };
  st.missing = _TR_STEPS.filter(function (x) { return !x.lesson && !st[x.key]; }).map(function (x) { return x.label; });
  st.ready = !st.missing.length;
  return st;
}

var _TR_CAPS = 'color:rgba(255,255,255,0.62);text-transform:uppercase;letter-spacing:1px;font-size:10px;padding:5px 9px';

// The step lists, at the top of the card: decision steps on the left, lesson
// steps on the right. Every box looks the same; done just gets a check mark.
function _trStepsHtml(a) {
  var id = emailToId(a.email || '');
  var em = _trEsc(a.email || '');
  var st = _trStepState(a);
  function col(list) {
    return '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:5px">' +
      list.map(function (x, i) {
        var done = st[x.key];
        var wait = x.key === 'terms' && !done && st.termsSent;
        var c = x.lesson ? '#4a9eff' : '#ff7a3c';
        return '<button class="db-mini-btn" style="min-width:120px;text-align:left;' + _TR_CAPS + ';font-size:9px;padding:3px 8px;color:' + c + ';background:' + _skFade(c) + ';border-color:rgba(255,255,255,0.2)' +
                   (x.noWindow ? ';cursor:default' : '') + '" ' +
                 (wait ? 'title="Terms sent, waiting for the form to come back" ' : '') +
                 (x.noWindow ? 'tabindex="-1"' : 'onclick="_tlOpen(\'' + em + '\',\'' + x.key + '\')"') + '>' +
                 (i + 1) + '. ' + x.label + (done ? ' ✓' : '') + (wait ? ' (sent)' : '') +
               '</button>';
      }).join('') + '</div>';
  }
  return '<div id="trsteps-' + id + '" style="display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;margin:10px 0 12px">' +
      col(_TR_STEPS.filter(function (x) { return !x.lesson; })) +
      col(_TR_STEPS.filter(function (x) { return x.lesson; })) +
    '</div>';
}

// Make student + Not continuing, at the bottom of the card. Make student is
// red; it only works once the five decision steps are done.
function _trActionsHtml(a) {
  var id = emailToId(a.email || '');
  var em = _trEsc(a.email || '');
  var st = _trStepState(a);
  var small = _TR_CAPS + ';font-size:9px;padding:3px 8px;border-color:rgba(255,255,255,0.2)';
  var red = 'min-width:120px;' + small + ';color:#ff5a4d;background:' + _skFade('#ff5a4d');
  var make = st.ready
    ? '<button class="db-mini-btn" style="' + red + '" onclick="_msOpen(\'' + em + '\')">Confirm as student</button>'
    : '<button class="db-mini-btn" disabled style="' + red + ';opacity:.6;cursor:not-allowed" ' +
        'title="Still needed: ' + _msAttr(st.missing.join(', ')) + '">Confirm as student</button>';
  return '<div id="tracts-' + id + '" style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
        make +
        '<span style="flex:1"></span>' +
        '<button class="db-mini-btn" id="trnobtn-' + id + '" style="' + small + ';color:var(--muted);background:rgba(255,255,255,0.05)" ' +
          'onclick="_trNotContinuing(\'' + id + '\',\'' + em + '\',\'' + _trEsc(a.name || '') + '\')">Dismiss</button>' +
      '</div>' +
    '</div>';
}

var _tl = null;   // { card, step, rec, busy }

function _tlOpen(email, step) {
  var a = _trStageCache.filter(function (x) { return (x.email || '') === email; })[0];
  if (!a) return;
  _tl = { card: a, step: step || 'info', rec: null, busy: false };

  var ov = document.getElementById('tlOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'settings-overlay';
    ov.id = 'tlOverlay';
    ov.innerHTML = '<div class="settings-modal" id="tlModal" style="max-width:600px;max-height:90vh;overflow-y:auto"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) _tlClose(); });
    document.body.appendChild(ov);
  }
  ov.classList.add('open');
  document.getElementById('tlModal').innerHTML = _tlTitle() + '<div class="empty-state">Loading…</div>';

  var url = getScriptUrl();
  if (!url) { _tl.rec = {}; _tlRender(); return; }
  fetch(url + '?action=getTrialRecord&email=' + encodeURIComponent(email))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!_tl) return;
      // A trial with no row yet is not an error: the row is written when the
      // Trial tab loads, so this only happens on a very fresh booking.
      _tl.rec = (d && d.success && d.record) || {};
      if (d && !d.success) _tl.loadError = d.message || d.error || 'Could not load';
      _tlSyncCard();
      _tlRender();
    })
    .catch(function () { if (_tl) { _tl.rec = {}; _tl.loadError = 'Could not load the record'; _tlRender(); } });
}

// The sheet row is the truth: copy what it says onto the card so the
// checklist matches it, even if the tab was loaded a while ago.
function _tlSyncCard() {
  var rec = _tl.rec || {}, patch = {};
  if (!rec.row) return;
  ['first', 'last', 'goals', 'availability', 'guitar', 'whatWeDid', 'firstLesson', 'frequency',
   'pencilledSpot', 'phone', 'city', 'schoolJob', 'interests', 'dropboxEmail', 'sentDate', 'returnDate']
    .forEach(function (k) { patch[k] = rec[k] || ''; });
  patch.dropboxMade = String(rec.dropboxMade || '').toUpperCase() === 'TRUE';
  patch.termsSent   = String(rec.termsSent || '').toUpperCase() === 'TRUE';
  patch.termsBack   = String(rec.termsBack || '').toUpperCase() === 'TRUE';
  patch.infoDone    = String(rec.infoDone || '').toUpperCase() === 'TRUE';
  patch.paid        = String(rec.paid || '').toUpperCase() === 'TRUE';
  _tlMark(patch);
}

function _tlClose() {
  if (_tl && _tl.busy) return;     // never close mid-send
  if (_tlMicRec) { try { _tlMicRec.stop(); } catch (e) {} }
  var ov = document.getElementById('tlOverlay');
  if (ov) ov.classList.remove('open');
  _tl = null;
}

function _tlTitle() {
  var a = _tl.card;
  var step = _TR_STEPS.filter(function (x) { return x.key === _tl.step; })[0];
  return '<div class="settings-title"><span>' + inqEsc(a.name || '') +
      (step ? '<span style="color:var(--muted);font-weight:400"> · ' + step.label + '</span>' : '') +
      '</span><button class="settings-close" onclick="_tlClose()">✕</button></div>';
}

function _tlSection(title) {
  return '<div style="font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:1.5px;color:var(--blue);' +
    'border-top:1px solid var(--border);padding-top:12px;margin:14px 0 8px">' + title + '</div>';
}

function _tlMsg(id) {
  return '<div id="' + id + '" style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);margin-top:6px;min-height:14px"></div>';
}

function _tlRender() {
  if (!_tl) return;
  var a = _tl.card, s = a.lesson || {};
  var body = { info: _tlInfoHtml, dbx: _tlDbxHtml, log: _tlLogHtml, hw: _tlHwHtml,
               freq: _tlFreqHtml, time: _tlTimeHtml, pay: _tlPayHtml, terms: _tlTermsHtml }[_tl.step] || _tlInfoHtml;
  document.getElementById('tlModal').innerHTML =
    _tlTitle() +
    (_tl.loadError ? '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--accent);margin-bottom:8px">⚠ ' + inqEsc(_tl.loadError) + '</div>' : '') +
    body(a, s) +
    '<div style="display:flex;justify-content:flex-end;margin-top:16px">' +
      (_tl.step === 'info'
        ? '<button class="db-mini-btn" id="tlInfoSave" style="padding:7px 20px;border-color:var(--green);color:var(--green)" onclick="_tlSaveInfo()">Save</button>'
        : _tl.step === 'freq'
        ? '<button class="db-mini-btn" id="tlFreqSave" style="padding:7px 20px;border-color:var(--green);color:var(--green)" onclick="_tlSaveFreq()">Save</button>'
        : '<button class="db-mini-btn" style="padding:7px 20px" onclick="_tlClose()">Done</button>') +
    '</div>';
}

// ── 1 · Info ──
// Same size and gray as the card's fields. Nothing saves until Save, and any
// box can stay empty: Save is what marks Info done.
function _tlInfoHtml(a, s) {
  var rec = _tl.rec || {};
  function val(k) {
    var v = rec[k] || s[k] || '';
    if (!v && (k === 'city' || k === 'availability')) v = a[k] || '';
    if (!v && k === 'goals') v = a.interests || '';
    return v;
  }
  var box = 'box-sizing:border-box;width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;' +
            'padding:7px 9px;color:rgba(255,255,255,0.5);font-family:\'DM Mono\',monospace;font-size:10.5px;line-height:1.5;resize:vertical';
  return _TR_INFO.map(function (f) {
    var v = inqEsc(val(f.key));
    return '<div style="margin-bottom:9px">' +
        '<div style="font-family:\'DM Mono\',monospace;font-size:10.5px;color:rgba(255,255,255,0.82);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">' + f.label + '</div>' +
        (f.multi
          ? '<textarea id="tli-' + f.key + '" rows="3" style="' + box + '">' + v + '</textarea>'
          : '<input id="tli-' + f.key + '" type="text" value="' + v.replace(/"/g, '&quot;') + '" style="' + box + '">') +
      '</div>';
  }).join('') +
  _tlMsg('tlInfoMsg');
}

function _tlSaveInfo() {
  if (!_tl || _tl.busy) return;
  var fields = { infoDone: 'true' };
  _TR_INFO.forEach(function (f) {
    var el = document.getElementById('tli-' + f.key);
    if (el) fields[f.key] = el.value.trim();
  });
  var btn = document.getElementById('tlInfoSave');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  _tlSaveFields(fields, 'tlInfoMsg', function () { _tlClose(); });
  // A failed save leaves the window open with the message; let him retry.
  setTimeout(function () { var b = document.getElementById('tlInfoSave'); if (b && _tl) { b.disabled = false; b.textContent = 'Save'; } }, 8000);
}

// ── 2 · Dropbox ──
function _tlDbxHtml(a, s) {
  var rec = _tl.rec || {};
  var made = !!s.dropboxMade;
  var dbxEmail = rec.dropboxEmail || s.dropboxEmail || a.email || '';
  // The folder name is shown, not editable: Send HW and Make Student both
  // expect the folder to be exactly the student's full name.
  return '<label class="settings-label">Dropbox email</label>' +
    '<input class="settings-input" id="tlDbxEmail" style="margin:0 0 12px" value="' + _msAttr(dbxEmail) + '"' + (made ? ' disabled' : '') + '>' +
    '<label class="settings-label">Folder</label>' +
    '<input class="settings-input" style="margin:0 0 14px" value="' + _msAttr(a.name || '') + '" readonly>' +
    '<button class="btn-settings-load" id="tlDbxBtn" style="margin:0;padding:12px' +
      (made ? ';border-color:var(--green);color:var(--green)' : ';border-color:var(--blue);color:var(--blue)') + '"' +
      (made ? ' disabled' : '') + ' onclick="_tlDropbox()">' +
      (made ? 'Folder made ✓' : 'Create & share') + '</button>' +
    _tlMsg('tlDbxMsg');
}

// ── 3 · Log lesson ──
function _tlLogHtml(a, s) {
  var rec = _tl.rec || {};
  var v = rec.whatWeDid || s.whatWeDid || '';
  // Enter logs it (and closes); Shift+Enter is a new line.
  return '<textarea id="tlWhat" rows="7" onblur="_tlSaveWhat()" placeholder="Type, or press the mic and talk" ' +
      'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();_tlLogWhat();}" ' +
      'style="box-sizing:border-box;width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;' +
      'padding:10px 12px;color:rgba(255,255,255,.62);font-family:\'DM Mono\',monospace;font-size:13px;line-height:1.55;resize:vertical">' +
      inqEsc(v) + '</textarea>' +
    '<div style="display:flex;gap:8px;align-items:center;margin-top:8px">' +
      '<button class="btn-settings-load" id="tlMicBtn" style="margin:0;width:auto;padding-left:18px;padding-right:18px" onclick="_tlMic()">🎙 Mic</button>' +
      '<button class="btn-settings-load" id="tlLogBtn" style="margin:0;width:auto;padding-left:22px;padding-right:22px;border-color:var(--green);color:var(--green)" onclick="_tlLogWhat()">Log</button>' +
      '<span id="tlMicState" style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted)"></span>' +
    '</div>' +
    _tlMsg('tlWhatMsg');
}

var _tlMicRec = null;

function _tlMic() {
  if (_tlMicRec) { try { _tlMicRec.stop(); } catch (e) {} return; }
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { _tlSetMsg('tlWhatMsg', '⚠ Speech not supported here. Use Chrome.', 'var(--accent)'); return; }
  var ta = document.getElementById('tlWhat');
  if (!ta) return;
  var base = ta.value.replace(/\s+$/, '');
  var finals = '';
  var r = new Rec();
  r.lang = 'en-US'; r.continuous = true; r.interimResults = true;

  function join(interim) {
    return [base, (finals + ' ' + (interim || '')).replace(/\s+/g, ' ').trim()]
      .filter(function (x) { return x; }).join(base && /[.!?]$/.test(base) ? ' ' : (base ? ' ' : ''));
  }
  r.onstart = function () {
    var b = document.getElementById('tlMicBtn');
    if (b) { b.textContent = '■ Stop'; b.style.borderColor = 'var(--accent)'; b.style.color = 'var(--accent)'; }
    var st = document.getElementById('tlMicState');
    if (st) { st.textContent = '🔴 recording…'; st.style.color = 'var(--accent)'; }
    try { playBeep(880, 100); } catch (e) {}
  };
  r.onresult = function (ev) {
    var interim = '';
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) finals += ' ' + ev.results[i][0].transcript;
      else interim += ev.results[i][0].transcript;
    }
    var t = document.getElementById('tlWhat');
    if (t) t.value = join(interim);
  };
  r.onend = function () {
    _tlMicRec = null;
    var t = document.getElementById('tlWhat');
    if (t) t.value = join('');
    var b = document.getElementById('tlMicBtn');
    if (b) { b.textContent = '🎙 Mic'; b.style.borderColor = ''; b.style.color = ''; }
    var st = document.getElementById('tlMicState');
    if (st) { st.textContent = 'review & edit'; st.style.color = 'var(--muted)'; }
    try { playBeep(440, 80, 0.15); } catch (e) {}
    if (_tl && _tl.logAfterMic) { _tl.logAfterMic = false; _tlLogWhat(); }
    else _tlSaveWhat();
  };
  r.onerror = function (e) {
    if (e.error === 'no-speech') return;
    _tlSetMsg('tlWhatMsg', '⚠ Mic: ' + e.error, 'var(--accent)');
  };
  _tlMicRec = r;
  r.start();
}

function _tlSaveWhat(force) {
  var url = getScriptUrl();
  var ta = document.getElementById('tlWhat');
  if (!url || !_tl || !ta) return;
  if (_tlMicRec && !force) return;             // saved when the mic stops
  var v = ta.value.trim();
  if (!force && ta.getAttribute('data-last') === v) return;
  if (!force && v === String((_tl.rec || {}).whatWeDid || '').trim()) return;
  _tlSaveFields({ whatWeDid: v }, 'tlWhatMsg', function () { ta.setAttribute('data-last', v); });
}

// Log: save What We Did and close. If the mic is still on, stop it first and
// log once the last words are in.
function _tlLogWhat() {
  var ta = document.getElementById('tlWhat');
  if (!_tl || !ta) return;
  if (_tlMicRec) { _tl.logAfterMic = true; try { _tlMicRec.stop(); } catch (e) {} return; }
  var v = ta.value.trim();
  if (!v) { _tlSetMsg('tlWhatMsg', 'Nothing to log yet.', 'var(--accent)'); return; }
  var btn = document.getElementById('tlLogBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Logging…'; }
  _tlSaveFields({ whatWeDid: v }, 'tlWhatMsg', function () { _tlClose(); });
  setTimeout(function () { var b = document.getElementById('tlLogBtn'); if (b && _tl) { b.disabled = false; b.textContent = 'Log'; } }, 8000);
}

// ── + · Send HW ──
function _tlHwHtml(a, s) {
  if (!s.dropboxMade) {
    return '<div class="empty-state" style="padding:22px 10px">Make their Dropbox folder first.<br><br>' +
      '<button class="db-mini-btn" onclick="_tl.step=\'dbx\';_tlRender()">Go to Dropbox →</button></div>';
  }
  return '<div id="tlUpload">' + _tlUploadHtml(a.name) + '</div>';
}

// ── 4 · Frequency ──
// Tapping only picks; tapping the picked one again un-picks it. Save writes
// it (blank included, to reset) and closes. Closing without Save keeps
// whatever was saved before.
function _tlFreqCur() {
  return String(_tl.freqPick !== undefined ? _tl.freqPick : ((_tl.card.lesson || {}).frequency || ''));
}

function _tlFreqHtml(a, s) {
  var f = _tlFreqCur().toLowerCase();
  function pick(v) {
    var on = f === v.toLowerCase();
    return '<button class="db-mini-btn" style="padding:8px 22px;' +
      (on ? 'border-color:var(--green);color:var(--green)' : 'border-color:var(--muted);color:var(--muted)') +
      '" onclick="_tlSetFreq(\'' + v + '\')">' + (on ? '✓ ' : '') + v + '</button>';
  }
  return '<div style="display:flex;gap:8px">' + pick('Weekly') + pick('Biweekly') + '</div>' +
    _tlMsg('tlFreqMsg');
}

function _tlSetFreq(v) {
  if (!_tl) return;
  _tl.freqPick = _tlFreqCur().toLowerCase() === v.toLowerCase() ? '' : v;
  _tlRender();
}

function _tlSaveFreq() {
  if (!_tl) return;
  var v = _tlFreqCur();
  var btn = document.getElementById('tlFreqSave');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }
  _tlSaveFields({ frequency: v }, 'tlFreqMsg', function () { _tlClose(); });
}

// ── 5 · Pick a time (first lesson) ──
// Arrows only move the choice; nothing is saved until Set. Saves First Lesson
// ("2026-09-20 14:30") and Pencilled Spot ("Sun 2:30 PM"), which the Fixed
// Calendar reads to draw the pencilled slot. Time steps in half hours.
function _tlTimeState() {
  if (_tl.when) return _tl.when;
  var s = _tl.card.lesson || {};
  var d = _trFirstLessonDate(s.firstLesson);
  if (d) {
    _tl.when = { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), mins: d.getHours() * 60 + d.getMinutes() };
  } else {
    var def = _msDefaultStart(_tl.card);
    _tl.when = { date: def.date, mins: Math.round(def.mins / 30) * 30 };
  }
  return _tl.when;
}

function _tlTimeValue() {
  var w = _tlTimeState(), d = w.date;
  return d.getFullYear() + '-' + _msPad(d.getMonth() + 1) + '-' + _msPad(d.getDate()) + ' ' +
         _msPad(Math.floor(w.mins / 60)) + ':' + _msPad(w.mins % 60);
}

function _tlTimeHtml(a, s) {
  var w = _tlTimeState();
  var v = _tlTimeValue();
  var saved = String(s.firstLesson || '') === v;
  var past = _trFirstLessonDate(v) <= new Date();
  var arrow = function (fn, n, txt) {
    return '<button class="db-mini-btn" style="padding:6px 10px" onclick="' + fn + '(' + n + ')">' + txt + '</button>';
  };
  var h = Math.floor(w.mins / 60), mi = w.mins % 60, d = w.date;
  var txt = 'style="font-family:\'DM Mono\',monospace;font-size:12px;color:rgba(255,255,255,0.62);text-align:center;';
  return '<label class="settings-label">First regular lesson</label>' +
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
      arrow('_tlStepDay', -1, '◀') +
      '<span ' + txt + 'min-width:92px">' + _MS_DAYS[d.getDay()] + ', ' + _MS_MONTHS[d.getMonth()] + ' ' + d.getDate() + '</span>' +
      arrow('_tlStepDay', 1, '▶') +
      '<span style="width:14px"></span>' +
      arrow('_tlStepMins', -30, '◀') +
      '<span ' + txt + 'min-width:70px">' + ((h % 12) || 12) + ':' + _msPad(mi) + (h < 12 ? ' AM' : ' PM') + '</span>' +
      arrow('_tlStepMins', 30, '▶') +
    '</div>' +
    (past ? '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--accent);margin-top:8px">⚠ That is in the past.</div>' : '') +
    '<div style="margin-top:12px">' +
      (saved
        ? '<span style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--green)">✓ Set: ' + inqEsc(_trFirstLessonLabel(v)) + '</span>'
        : '<button class="db-mini-btn" style="padding:7px 20px;border-color:var(--blue);color:var(--blue)"' + (past ? ' disabled' : '') +
            ' onclick="_tlSaveTime()">Set ' + inqEsc(_trFirstLessonLabel(v)) + '</button>') +
    '</div>' +
    _tlMsg('tlTimeMsg');
}

function _tlStepDay(n)  { if (!_tl) return; var w = _tlTimeState(); w.date.setDate(w.date.getDate() + n); _tlRender(); }
function _tlStepMins(n) {
  if (!_tl) return;
  var w = _tlTimeState();
  w.mins = Math.min(23 * 60 + 30, Math.max(0, Math.round(w.mins / 30) * 30 + n));
  _tlRender();
}

function _tlSaveTime() {
  if (!_tl) return;
  var w = _tlTimeState();
  var v = _tlTimeValue();
  if (_trFirstLessonDate(v) <= new Date()) return;
  var spot = _tlSpotStr(w.date.getDay(), w.mins);
  _tlMark({ firstLesson: v, pencilledSpot: spot });
  _tlRender();
  _tlSaveFields({ firstLesson: v, pencilledSpot: spot }, 'tlTimeMsg');
}

function _tlSpotStr(day, mins) {
  var h = Math.floor(mins / 60), mi = mins % 60;
  return _MS_DAYS[day] + ' ' + ((h % 12) || 12) + ':' + _msPad(mi) + (h < 12 ? ' AM' : ' PM');
}

// "Tue 5:30 PM" → { day, mins }, or null.
function _tlParseSpot(str) {
  var m = String(str || '').match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\w*\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  var day = _MS_DAYS.map(function (d) { return d.toLowerCase(); }).indexOf(m[1].toLowerCase());
  var h = +m[2] % 12 + (m[4].toUpperCase() === 'PM' ? 12 : 0);
  return { day: day, mins: h * 60 + +m[3] };
}

// ── 5 · Payment ──
// Read only: the trial payment matched from Zelle / Venmo, or Paid on the row.
function _tlPayHtml(a, s) {
  var p = _trTrialPayFor(a.email);
  var line = function (txt, color) {
    return '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:' + color + '">' + txt + '</div>';
  };
  if (p) {
    var date = String(p.date || '').replace(/,?\s*\d{4}$/, '');
    return line('✓ ' + inqEsc(p.method || '') + ' ' + inqEsc(p.amount || '') + ' · ' + inqEsc(date), 'var(--green)');
  }
  if (s.paid === true || String(s.paid || '').toUpperCase() === 'TRUE') return line('✓ Paid (ticked on the Trial row)', 'var(--green)');
  return line('No trial payment found yet.', 'var(--muted)');
}

// ── 6 · Terms ──
function _tlTermsHtml(a, s) {
  var rec = _tl.rec || {};
  var sent = !!s.termsSent, back = !!s.termsBack;
  return '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button class="btn-settings-load" id="tlSendBtn" style="margin:0;width:auto;flex:none;padding-left:18px;padding-right:18px;border-color:var(--green);color:var(--green)" onclick="_tlSend()">' +
        (sent ? 'Send again' : 'Send terms') + '</button>' +
      '<button class="btn-settings-load" id="tlPrevBtn" style="margin:0;width:auto;flex:none;padding-left:16px;padding-right:16px" onclick="_tlPreview()">Preview email</button>' +
    '</div>' +
    '<div style="margin-top:14px;font-family:\'DM Mono\',monospace;font-size:12px;line-height:1.9">' +
      '<div style="color:' + (sent ? 'var(--green)' : 'var(--muted)') + '">' +
        (sent ? '✓ Sent ' + inqEsc(rec.sentDate || s.sentDate || '') : '· Not sent yet') + '</div>' +
      '<div style="color:' + (back ? 'var(--green)' : (sent ? 'var(--accent2)' : 'var(--muted)')) + '">' +
        (back ? '✓ Form back ' + inqEsc(rec.returnDate || s.returnDate || '')
              : '· Form not back yet (ticks itself when the Trial tab loads)') + '</div>' +
    '</div>' +
    _tlMsg('tlTermsMsg') +
    '<div id="tlPreview"></div>';
}

// One save call for any Trial Lessons fields. saveTrialRecord_ only writes the
// keys it is sent, so nothing else on the row can be clobbered.
function _tlSaveFields(fields, msgId, onOk) {
  var url = getScriptUrl();
  if (!url || !_tl) return;
  var email = _tl.card.email || '';
  _tlSetMsg(msgId, 'Saving…');
  var qs = Object.keys(fields).map(function (k) { return '&' + k + '=' + encodeURIComponent(fields[k]); }).join('');
  fetch(url + '?action=saveTrialRecord&email=' + encodeURIComponent(email) + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { _tlSetMsg(msgId, '⚠ ' + (d.message || 'Not saved'), 'var(--accent)'); return; }
      if (d.skipped && d.skipped.length) { _tlSetMsg(msgId, '⚠ No column on the sheet: ' + d.skipped.join(', '), 'var(--accent)'); return; }
      if (_tl && _tl.rec) Object.keys(fields).forEach(function (k) { _tl.rec[k] = fields[k]; });
      _tlMarkEmail(email, fields);
      _tlSetMsg(msgId, 'Saved ✓', 'var(--green)');
      if (onOk) onOk();
    })
    .catch(function () { _tlSetMsg(msgId, '❌ Not saved', 'var(--accent)'); });
}


// ── Upload into the trial's Dropbox folder ───────────────────────────────────
// Same as the Home drop zone: files or whole folders (subfolders kept, hidden
// files skipped), via uploadFilesToDropbox / collectDroppedFiles (core/api.js).
// Shown once the folder exists. No "new homework" email: that only goes to
// students on the Counter, which a trial person is not.
function _tlUploadHtml(folder) {
  var idle = '\u2b06 Drag homework files or folders here, or click to pick files';
  return '<div id="tlDrop" data-folder="' + _msAttr(folder) + '" data-idle="' + _msAttr(idle) + '" ' +
      'onclick="document.getElementById(\'tlFileIn\').click()" ' +
      'ondragover="event.preventDefault();this.style.borderColor=\'#5b9dff\';this.style.background=\'rgba(91,157,255,0.08)\'" ' +
      'ondragleave="this.style.borderColor=\'rgba(91,157,255,0.4)\';this.style.background=\'transparent\'" ' +
      'ondrop="_tlDrop(event)" ' +
      'style="margin-top:10px;padding:34px 12px;border:1.5px dashed rgba(91,157,255,0.4);border-radius:8px;text-align:center;' +
      'font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);cursor:pointer">' + inqEsc(idle) + '</div>' +
    '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button class="btn-settings-load" style="margin:0;flex:1" onclick="openDropboxLocalFolder(document.getElementById(\'tlDrop\').dataset.folder)" ' +
        'title="Opens their synced Dropbox folder in Finder. Drag as many folders in as you like; Dropbox uploads them.">\ud83d\udcc1 Open in Finder</button>' +
      '<button class="btn-settings-load" style="margin:0;flex:1" onclick="document.getElementById(\'tlFolderIn\').click()">\ud83d\udcc2 Browse folder</button>' +
    '</div>' +
    '<input type="file" id="tlFileIn" multiple style="display:none" onchange="_tlPicked(this, false)">' +
    '<input type="file" id="tlFolderIn" multiple webkitdirectory style="display:none" onchange="_tlPicked(this, true)">';
}

function _tlDrop(ev) {
  ev.preventDefault();
  var zone = document.getElementById('tlDrop');
  if (!zone || !ev.dataTransfer) return;
  zone.style.borderColor = 'rgba(91,157,255,0.4)'; zone.style.background = 'transparent';
  zone.textContent = 'Reading\u2026';
  collectDroppedFiles(ev.dataTransfer, function (files) {
    if (files.length) _tlUpload(files); else zone.textContent = zone.dataset.idle;
  });
}

function _tlPicked(input, isFolder) {
  var files = Array.prototype.slice.call(input.files || []);
  if (isFolder) files = files.filter(function (f) {
    return !f.webkitRelativePath.split('/').some(function (seg) { return seg.charAt(0) === '.'; });
  });
  input.value = '';
  if (files.length) _tlUpload(files);
}

function _tlUpload(files) {
  var zone = document.getElementById('tlDrop');
  if (!zone) return;
  var folder = zone.dataset.folder;
  uploadFilesToDropbox(folder, files, {
    onProgress: function (name, i, total) {
      var z = document.getElementById('tlDrop');
      if (z) z.textContent = 'Uploading ' + (i + 1) + '/' + total + ': ' + name + ' \u2026';
    },
    onDone: function (ok, fail, total) {
      var z = document.getElementById('tlDrop');
      if (!z) return;
      z.textContent = (fail ? '\u26a0 ' : '\u2713 ') + ok + '/' + total + ' uploaded to ' + folder +
        (fail ? ', ' + fail + ' failed' : '') + ' \u00b7 click to add more';
      z.style.color = fail ? 'var(--accent)' : 'var(--green)';
      setTimeout(function () {
        var z2 = document.getElementById('tlDrop');
        if (z2) { z2.textContent = z2.dataset.idle; z2.style.color = 'var(--muted)'; }
      }, 8000);
    }
  });
}

function _tlSetMsg(elId, txt, color) {
  var el = document.getElementById(elId);
  if (el) { el.textContent = txt; el.style.color = color || 'var(--muted)'; }
}

// Keep the card's checklist in step with what just happened in the window.
function _tlMark(patch) {
  var a = _tl && _tl.card;
  if (a) _tlMarkEmail(a.email, patch);
}

// Same, by email, so a save that lands after the window closed still counts.
function _tlMarkEmail(email, patch) {
  var a = (_trStageCache || []).filter(function (x) { return (x.email || '') === email; })[0];
  if (!a) return;
  a.lesson = a.lesson || {};
  Object.keys(patch).forEach(function (k) { a.lesson[k] = patch[k]; });
  var old = document.getElementById('trsteps-' + emailToId(a.email || ''));
  if (old) old.outerHTML = _trStepsHtml(a);
  var acts = document.getElementById('tracts-' + emailToId(a.email || ''));
  if (acts) acts.outerHTML = _trActionsHtml(a);
}

function _tlDropbox() {
  var url = getScriptUrl();
  if (!url || !_tl || _tl.busy) return;
  var a = _tl.card;
  var dbx = document.getElementById('tlDbxEmail').value.trim();
  var btn = document.getElementById('tlDbxBtn');
  if (dbx.indexOf('@') === -1) { _tlSetMsg('tlDbxMsg', '\u26a0 That does not look like an email.', 'var(--accent)'); return; }
  _tl.busy = true; btn.disabled = true; btn.textContent = 'Creating\u2026';
  btn.style.borderColor = 'var(--accent2)'; btn.style.color = 'var(--accent2)'; btn.style.animation = 'pulse 1.6s infinite';
  _tlSetMsg('tlDbxMsg', 'Creating the folder and sharing it with ' + dbx + '. Wait here, this window stays open until it is done.', 'var(--accent2)');
  fetch(url + '?action=trialDropbox&email=' + encodeURIComponent(a.email || '') +
        '&name=' + encodeURIComponent(a.name || '') + '&dropboxEmail=' + encodeURIComponent(dbx))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!_tl) return;
      _tl.busy = false;
      btn.style.animation = '';
      if (!d.success) {
        btn.disabled = false; btn.textContent = 'Create & share';
        btn.style.borderColor = 'var(--blue)'; btn.style.color = 'var(--blue)';
        _tlSetMsg('tlDbxMsg', '\u26a0 ' + (d.message || 'Not created'), 'var(--accent)');
        return;
      }
      btn.textContent = 'Folder made \u2713'; btn.style.borderColor = 'var(--green)'; btn.style.color = 'var(--green)';
      document.getElementById('tlDbxEmail').disabled = true;
      _tl.rec = _tl.rec || {}; _tl.rec.dropboxEmail = dbx; _tl.rec.dropboxMade = 'TRUE';
      _tlMark({ dropboxMade: true, dropboxEmail: dbx });
      var up = document.getElementById('tlUpload');
      if (up) up.innerHTML = _tlUploadHtml(a.name);
      _tlSetMsg('tlDbxMsg', 'Shared "' + d.name + '" with ' + dbx + '. Dropbox sent them the invite.' +
        (d.stamped ? '' : ' (Could not tick Dropbox Made on the sheet.)'), 'var(--green)');
    })
    .catch(function () {
      if (!_tl) return;
      _tl.busy = false; btn.disabled = false; btn.textContent = 'Create & share';
      btn.style.animation = ''; btn.style.borderColor = 'var(--blue)'; btn.style.color = 'var(--blue)';
      _tlSetMsg('tlDbxMsg', '\u274c No answer. Check the Dropbox tab before trying again: it may have gone through.', 'var(--accent)');
    });
}

function _tlPreview() {
  var url = getScriptUrl();
  if (!url || !_tl) return;
  var box = document.getElementById('tlPreview');
  box.innerHTML = '<div class="empty-state">Loading preview\u2026</div>';
  fetch(url + '?action=previewTrialTerms&name=' + encodeURIComponent(_tl.card.name || ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!_tl) return;
      if (!d.success) { box.innerHTML = '<div class="empty-state">\u26a0 ' + inqEsc(d.message || 'No preview') + '</div>'; return; }
      box.innerHTML = _tlPreviewHtml(d.subject, d.html, _tl.card.email);
    })
    .catch(function () { box.innerHTML = '<div class="empty-state">\u274c Could not load the preview.</div>'; });
}

// The email on a white card, the way a mail client shows it. The logo is a
// cid: reference that only exists in the real email, so it becomes a box.
function _tlPreviewHtml(subject, html, to) {
  var body = String(html || '').replace(/<img [^>]*cid:logo[^>]*>/,
    '<div style="width:80px;height:80px;border:1px dashed #bbb;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999">logo</div>');
  return '<div style="margin-top:12px;border:1px solid var(--border);border-radius:10px;overflow:hidden">' +
      '<div style="padding:9px 12px;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);border-bottom:1px solid var(--border)">' +
        'To: ' + inqEsc(to || '') + '<br>Subject: <span style="color:var(--text)">' + inqEsc(subject || '') + '</span></div>' +
      '<div style="background:#fff;color:#222;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">' + body + '</div>' +
    '</div>';
}

function _tlSend() {
  var url = getScriptUrl();
  if (!url || !_tl || _tl.busy) return;
  var a = _tl.card;
  var btn = document.getElementById('tlSendBtn');
  _tl.busy = true; btn.disabled = true; btn.textContent = 'Sending\u2026';
  _tlSetMsg('tlTermsMsg', 'Sending to ' + (a.email || '') + '\u2026');
  fetch(url + '?action=sendTrialTerms&email=' + encodeURIComponent(a.email || '') + '&name=' + encodeURIComponent(a.name || ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!_tl) return;
      _tl.busy = false; btn.disabled = false;
      if (!d.success) {
        btn.textContent = 'Send terms';
        _tlSetMsg('tlTermsMsg', '\u26a0 ' + (d.message || 'Not sent'), 'var(--accent)');
        return;
      }
      btn.textContent = 'Send again';
      _tl.rec = _tl.rec || {}; _tl.rec.termsSent = 'TRUE'; _tl.rec.sentDate = d.sentDate;
      _tlMark({ termsSent: true, sentDate: d.sentDate });
      _tlSetMsg('tlTermsMsg', 'Sent to ' + (a.email || '') + ' \u00b7 ' + d.sentDate +
        (d.stamped ? '' : ' (Could not tick Terms Sent on the sheet.)'), 'var(--green)');
    })
    .catch(function () {
      if (!_tl) return;
      _tl.busy = false; btn.disabled = false; btn.textContent = 'Send terms';
      _tlSetMsg('tlTermsMsg', '\u274c No answer. Check Sent mail before sending again.', 'var(--accent)');
    });
}

function _trFieldHtml(id, email, f, val) {
  var multi = (f.key === 'notes' || f.key === 'goals' || f.key === 'availability');
  var common = 'id="trf-' + id + '-' + f.key + '" ' +
    'onblur="_trSaveField(\'' + id + '\',\'' + _trEsc(email) + '\',\'' + f.key + '\',this)" ' +
    'style="box-sizing:border-box;width:100%;background:var(--bg);border:1px solid var(--border);' +
    'border-radius:8px;padding:9px 11px;color:rgba(255,255,255,.62);font-family:\'DM Mono\',monospace;font-size:13px;line-height:1.5;resize:vertical"';
  return '<div style="margin-bottom:7px">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:9px;letter-spacing:1px;' +
        'text-transform:uppercase;color:var(--muted);margin-bottom:3px">' + f.label + '</div>' +
      (multi
        ? '<textarea rows="2" ' + common + '>' + inqEsc(val) + '</textarea>'
        : '<input type="text" value="' + inqEsc(val).replace(/"/g, '&quot;') + '" ' + common + '>') +
    '</div>';
}

// One field, one write. saveTrialRecord_ only touches the keys it is sent, so
// nothing else on the row can be clobbered by a save from here.
function _trSaveField(id, email, key, el) {
  var url = getScriptUrl();
  var msg = document.getElementById('trrecmsg-' + id);
  if (!url || !email) return;
  var val = (el && el.value != null) ? el.value : '';
  if (el && el.getAttribute('data-last') === val) return;   // nothing changed
  if (msg) { msg.textContent = 'Saving\u2026'; msg.style.color = 'var(--muted)'; }

  fetch(url + '?action=saveTrialRecord&email=' + encodeURIComponent(email) +
        '&' + key + '=' + encodeURIComponent(val))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        if (msg) { msg.textContent = '\u26a0 ' + (d.message || d.error || 'Not saved'); msg.style.color = 'var(--accent)'; }
        return;
      }
      if (el) el.setAttribute('data-last', val);
      if (_tl && _tl.rec) _tl.rec[key] = val;
      var patch = {}; patch[key] = val;
      _tlMarkEmail(email, patch);
      if (msg) { msg.textContent = 'Saved \u2713'; msg.style.color = 'var(--green)'; }
    })
    .catch(function () {
      if (msg) { msg.textContent = '\u274c Not saved'; msg.style.color = 'var(--accent)'; }
    });
}

// ── Trial outcome: Unsuccessful by hand ──────────────────────────────────────
// Writes Outcome = Unsuccessful on their Trial Lessons row and takes the card
// off the tab. The row stays on the sheet as the record. Successful is never
// set here: that comes from Make Student (or them being on the Counter).
// Manual only: there is no automatic Unsuccessful, no day limit.
function _trNotContinuing(id, email, name) {
  var url = getScriptUrl();
  if (!url || !email) return;
  if (!confirm('Dismiss ' + (name || email) + '?\n\nOutcome becomes Unsuccessful and the card leaves the Trial tab.')) return;
  var btn = document.getElementById('trnobtn-' + id);
  if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }

  fetch(url + '?action=closeTrial&email=' + encodeURIComponent(email) + '&outcome=Unsuccessful')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        if (btn) { btn.disabled = false; btn.textContent = '\u26a0 Not saved, retry'; }
        return;
      }
      _trDropStageCard(email);
    })
    .catch(function () { if (btn) { btn.disabled = false; btn.textContent = '\u26a0 Not saved, retry'; } });
}

// Take one person off the Trial tab (outcome settled): cache, card, payments.
function _trDropStageCard(email) {
  _trStageCache = _trStageCache.filter(function (a) { return (a.email || '') !== email; });
  var card = document.getElementById('trcard-' + emailToId(email || ''));
  if (card) card.remove();
  _trPayRender();
  var body = document.getElementById('trialStageBody');
  if (body && !_trStageCache.length) body.innerHTML = '<div class="empty-state">No booked trials.</div>' + _trStageBookHtml();
}

// After a reply lands, redraw whichever stage is on screen.
function _trRefreshThreads() {
  var trial = document.getElementById('tab-trial');
  if (trial && trial.classList.contains('active')) { _trLoadStageThreads(); return; }
  _trLoadThreads();
}

// Same reader as Initiate; it returns both stages in one payload.
function _trLoadStageThreads() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getFirstContactThreads')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success || !d.threads) return;
      _trStageCache.forEach(function (a) {
        var id  = emailToId(a.email || '');
        var box = document.getElementById('fcth-' + id);
        if (!box) return;
        var t = d.threads[a.email];
        var hasThread = !!(t && t.messages && t.messages.length && t.threadId);
        var msgs = (t && t.messages) || [];
        box.innerHTML =
          '<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:9px">' +
            // A bounce is never hidden. It is the one thing on this card that
            // means something is broken right now.
            _trBounceRow(t) +
            _trThreadSummary(id, msgs) +
            '<div id="fcmsg-' + id + '" style="display:none">' +
              msgs.map(_trMsgRow).join('') +
              // Reply sits inside the opened thread: nobody replies unread.
              (hasThread
                ? '<div id="fcrp-' + id + '">' +
                    '<button class="db-mini-btn" onclick="_trOpenReply(\'' + id + '\',\'' + t.threadId + '\')">Reply</button>' +
                  '</div>'
                : '') +
            '</div>' +
            (hasThread
              ? ''
              // No thread to reply into (booked without an email exchange), so
              // fall back to the composer, which starts one.
              : '<button class="db-mini-btn" onclick="_trOpenEmail(\'' + _trEsc(a.email || '') + '\')" style="border-color:var(--green);color:var(--green)">Email</button>') +
          '</div>';
      });
    })
    .catch(function () { /* leave the cards alone */ });
}

// Booking someone by hand belongs here, not in Initiate. Initiate is for people
// who inquired, and booking one of them is driven from their card. This is the
// other case: a trial that never came through the form. Own id prefix ("ts") so
// its fields cannot collide with Initiate's, since both panels live in the DOM.
function _trStageBookHtml() {
  return '<div id="tsBookToggle" style="margin-top:18px">' +
      '<button class="db-mini-btn" style="width:100%;padding:11px;text-transform:uppercase;letter-spacing:1px" onclick="_tsShowBook()">Book a trial manually</button>' +
    '</div>' +
    '<div id="tsBookArea" style="display:none">' +
      '<hr class="divider" style="margin:22px 0 16px">' +
      _trManualFormHtml('ts') + '<div id="tsStatus"></div>' +
    '</div>';
}

function _tsShowBook() {
  var area = document.getElementById('tsBookArea');
  var tog  = document.getElementById('tsBookToggle');
  if (area) area.style.display = '';
  if (tog)  tog.style.display = 'none';
  var f = document.getElementById('tsFirst');
  if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.focus(); }
}


// ─── TRIAL PAYMENTS ──────────────────────────────────────────────────────────
// Top of the tab, before any student is clicked, because a payment can arrive
// from someone you have not thought about yet. A per-student view only answers
// questions you already knew to ask.
//
// The filter is the trial rate, read from the rates chart, so a price change
// carries itself. There is no fallback rate on purpose: if the rate cannot be
// read we say so instead of filtering for the wrong number and looking empty.
var _trPayCache = [];
var _trPayOk    = false;   // did the payments call actually succeed?

function _trLoadPayments() {
  var url  = getScriptUrl();
  var body = document.getElementById('trialPayBody');
  var rlab = document.getElementById('trialPayRate');
  if (!body) return;
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  body.innerHTML = '<div class="empty-state">Loading…</div>';

  fetch(url + '?action=getTrialPayments')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      _trPayCache = [];
      _trPayOk    = false;
      if (!d.success) {
        if (rlab) rlab.textContent = '';
        // d.error catches a missing router line, which otherwise reads as a
        // vague "could not load" and sends you looking in the wrong place.
        body.innerHTML = '<div class="empty-state">⚠ ' + inqEsc(d.message || d.error || 'Could not load') + '</div>';
        return;
      }
      if (rlab) rlab.textContent = '$' + d.rate;
      _trPayCache = d.payments || [];
      _trPayOk    = true;
      _trPayRender();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not load.</div>'; });
}

// Drawn twice: once as soon as the payments land, then again when the booked
// list arrives and the match notes can be filled in.
function _trPayRender() {
  var body = document.getElementById('trialPayBody');
  if (!body) return;
  // Never draw over a failure. The booked list arriving is not news about the
  // payments, and redrawing here once turned "could not load" into the much
  // worse "No trial payments waiting", which reads as "nobody has paid".
  if (!_trPayOk) return;
  if (!_trPayCache.length) { body.innerHTML = '<div class="empty-state">No trial payments waiting.</div>'; _trPaintPaid(); return; }
  body.innerHTML = _trPayCache.map(_trPayCard).join('');
  _trPaintPaid();
}

// The trial payment (flagged by the backend) for one person, if it is still in
// the incoming list.
function _trTrialPayFor(email) {
  var e = (email || '').toLowerCase();
  return (_trPayCache || []).filter(function (p) { return p.trial && (p.trial.email || '').toLowerCase() === e; })[0] || null;
}

// Payments arrived: redraw each card's checklist (Payment step).
function _trPaintPaid() {
  // The payment itself now lives in the Payment step's window; this only
  // refreshes the checklist once the payments list has arrived.
  (_trStageCache || []).forEach(function (a) { _tlMarkEmail(a.email, {}); });
}

// Which booked trial does this payment look like? Full name first, then first
// name, the same order getIncomingPayments uses against the student sheets.
//
// A miss is not a failure, it is the interesting case: the name on the bank
// account is often the person's actual name, and the inquiry form has whatever
// they introduced themselves as. Seeing both before the lesson gives you
// something to ask them about in the first three minutes.
function _trPayMatch(name) {
  var n = (name || '').toLowerCase().trim();
  if (!n) return null;
  var first = n.split(' ')[0];
  var byFull = null, byFirst = null;
  (_trStageCache || []).forEach(function (a) {
    var an = (a.name || '').toLowerCase().trim();
    if (!an) return;
    if (an === n) byFull = a;
    else if (!byFirst && an.split(' ')[0] === first) byFirst = a;
  });
  return byFull || byFirst;
}

function _trPayCard(p) {
  // Until the booked list has loaded there is nothing to match against, and
  // claiming "not one of your booked trials" then would be a lie that corrects
  // itself a second later. Say nothing instead.
  var hit  = _trStageLoaded ? _trPayMatch(p.name) : null;
  var note = p.trial
    ? '<div class="incoming-nomatch" style="color:var(--green)">\u2192 ' + inqEsc(p.trial.name) + ' \u00b7 trial paid \u2713</div>'
    : !_trStageLoaded ? ''
    : hit
      ? '<div class="incoming-nomatch" style="color:var(--green)">→ ' + inqEsc(hit.name) + '</div>'
      : '<div class="incoming-nomatch">⚠ Not one of your booked trials</div>';
  return '<div class="incoming-card">' +
      '<div class="incoming-left">' +
        '<div class="incoming-name">' + inqEsc(p.name || '—') + '</div>' +
        '<div class="incoming-meta">' +
          '<span class="incoming-method ' + inqEsc((p.method || '').toLowerCase()) + '">' + inqEsc(p.method || '') + '</span>' +
          '<span class="incoming-amount">' + inqEsc(p.amount || '') + '</span>' +
          '<span class="incoming-date">' + inqEsc(p.date || '') + '</span>' +
        '</div>' +
        note +
      '</div>' +
    '</div>';
}


// ── Collapsed thread ─────────────────────────────────────────────────────────
// On the Trial tab they are already booked, so the exchange is background, not
// the job. It collapses to one line and opens when he wants to read it back,
// which in practice is just before the lesson.
//
// The one fact worth keeping visible is WHO WROTE LAST. That is the difference
// between waiting on them and them waiting on you, and it is the thing that let
// someone sit unnoticed for seven weeks before any of this existed.
//
// Initiate is deliberately left expanded: that tab IS the conversation.
function _trThreadSummary(id, msgs) {
  if (!msgs.length) {
    return '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);margin-bottom:8px">' +
        'No email exchange yet.' +
      '</div>';
  }
  var last = msgs[msgs.length - 1];
  var who  = last.fromMe ? 'last from you' : 'last from them';
  return '<div id="fcsum-' + id + '" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">' +
      '<button class="db-mini-btn" id="fctog-' + id + '" onclick="_trToggleThread(\'' + id + '\')">Show</button>' +
      '<span style="font-family:\'DM Mono\',monospace;font-size:10px;color:' +
        (last.fromMe ? 'var(--muted)' : 'var(--green)') + '">' +
        msgs.length + (msgs.length === 1 ? ' message' : ' messages') + ' \u00b7 ' + who +
      '</span>' +
    '</div>';
}

function _trToggleThread(id) {
  var box = document.getElementById('fcmsg-' + id);
  var btn = document.getElementById('fctog-' + id);
  if (!box) return;
  var open = box.style.display !== 'none';
  box.style.display = open ? 'none' : '';
  if (btn) btn.textContent = open ? 'Show' : 'Hide';
}


// Delete an Initiate card for good. Separate from "\u2190 Inquiries", which only
// clears the decision and parks them back in the undecided list: this is for
// the ones he wrote to who never replied and are not coming back.
//
// Confirmed, because it removes the whole inquiry column and there is no undo.
function _trDelete(email, col, name, btn) {
  var url = getScriptUrl();
  if (!url || !email) return;
  if (!confirm('Delete ' + (name || email) + ' for good?\n\nThe inquiry is removed from the archive. This cannot be undone.')) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Deleting\u2026'; }
  fetch(url + '?action=deleteInquiryRow&email=' + encodeURIComponent(email) +
        '&col=' + encodeURIComponent(col || ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        if (btn) { btn.disabled = false; btn.textContent = 'Delete'; }
        _trStatus('\u26a0 ' + (d.message || 'Could not delete.'), 'var(--accent)');
        return;
      }
      _trLoadAccepted();
      _trStatus('Deleted.', 'var(--muted)');
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Delete'; }
      _trStatus('\u274c Could not reach the portal.', 'var(--accent)');
    });
}


// ─── MAKE STUDENT ────────────────────────────────────────────────────────────
// Opens only once every checklist step is done, so everything it needs was
// already decided on the card: name, frequency, first lesson (Trial Lessons
// row), phone and availability (same row, inquiry as fallback). All that is
// left here is the rate and the welcome text, then one button.
//
// While it runs the window is locked and says so; when it ends it says Done
// (or which step failed) in big letters, and stays open until closed.
// Backend: makeStudent (RPM_MakeStudent.gs).
var _ms = null;
var _msRates = null;   // { weekly: 110, biweekly: 120 }

var _MS_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var _MS_DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function _msOpen(email) {
  var a = _trStageCache.filter(function (x) { return (x.email || '') === email; })[0];
  if (!a) return;
  var st = _trStepState(a);
  if (!st.ready) return;
  var s = a.lesson || {};
  _ms = {
    card: a,
    name: [s.first, s.last].filter(_trFilled).join(' ').trim() || a.name || '',
    cadence: String(s.frequency || '').toLowerCase() === 'biweekly' ? 'biweekly' : 'weekly',
    start: _trFirstLessonDate(s.firstLesson),
    rateEdited: false, busy: false, done: false
  };

  var ov = document.getElementById('msOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'settings-overlay';
    ov.id = 'msOverlay';
    ov.innerHTML = '<div class="settings-modal" id="msModal" style="max-width:520px"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) _msClose(); });
    document.body.appendChild(ov);
  }
  ov.classList.add('open');
  _msRenderForm();
  _msLoadRates();
}

function _msClose() {
  if (_ms && _ms.busy) return;     // never close mid-write
  var ov = document.getElementById('msOverlay');
  if (ov) ov.classList.remove('open');
  _ms = null;
}

// Default first lesson for Pick a time: the pencilled spot if one was picked
// (next date on that weekday, at that time), otherwise the trial's weekday and
// time one week later, moved forward a week at a time until it is in the future.
function _msDefaultStart(a) {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var date;
  var sp = _tlParseSpot(a.lesson && a.lesson.pencilledSpot);
  if (sp) {
    date = new Date(today); date.setDate(date.getDate() + 1);
    while (date.getDay() !== sp.day) date.setDate(date.getDate() + 1);
    return { date: date, mins: sp.mins };
  }
  var m = String(a.trialDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    date = new Date(+m[1], +m[2] - 1, +m[3] + 7);
    while (date <= today) date.setDate(date.getDate() + 7);
  } else {
    date = new Date(today); date.setDate(date.getDate() + 7);
  }
  var t = String(a.trialTime || '').match(/^(\d{1,2}):(\d{2})$/);
  return { date: date, mins: t ? (+t[1] * 60 + +t[2]) : 17 * 60 };
}

function _msLbl(t) { return '<label class="settings-label" style="margin-top:6px">' + t + '</label>'; }
function _msAttr(v) { return inqEsc(v == null ? '' : String(v)).replace(/"/g, '&quot;'); }
function _msPad(n) { return (n < 10 ? '0' : '') + n; }

function _msWhenLabel() {
  var d = _ms.start;
  if (!d) return '';
  var h = d.getHours(), mi = d.getMinutes();
  return _MS_DAYS[d.getDay()] + ', ' + _MS_MONTHS[d.getMonth()] + ' ' + d.getDate() +
         ' at ' + ((h % 12) || 12) + ':' + _msPad(mi) + (h < 12 ? ' AM' : ' PM');
}

function _msRenderForm() {
  var a = _ms.card;
  var rate = (_msRates && _msRates[_ms.cadence]) || '';
  var tp = _trTrialPayFor(a.email);
  var row = function (k, v, color) {
    return '<div style="display:flex;gap:12px;padding:5px 0;font-family:\'DM Mono\',monospace;font-size:13px">' +
      '<span style="width:110px;flex:none;color:var(--muted);font-size:11px;letter-spacing:1px;text-transform:uppercase;padding-top:2px">' + k + '</span>' +
      '<span style="color:' + (color || 'var(--text)') + '">' + v + '</span></div>';
  };
  document.getElementById('msModal').innerHTML =
    '<div class="settings-title">Confirm as student<button class="settings-close" id="msX" onclick="_msClose()">✕</button></div>' +

    '<div style="font-family:\'Syne\',sans-serif;font-size:22px;font-weight:700;color:var(--text);margin:2px 0 10px">' + inqEsc(_ms.name) + '</div>' +
    '<div style="border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:8px 0;margin-bottom:14px">' +
      row('Schedule', _ms.cadence === 'biweekly' ? 'Biweekly' : 'Weekly') +
      row('First lesson', inqEsc(_msWhenLabel())) +
      row('Trial', tp
        ? 'Paid ✓ · ' + inqEsc(tp.method || '') + ' ' + inqEsc(tp.amount || '') + ' · ' + inqEsc(tp.date || '')
        : 'No trial payment found', tp ? 'var(--green)' : 'var(--muted)') +
    '</div>' +

    _msLbl('Rate ($ per lesson)') +
    '<input class="settings-input" id="msRate" inputmode="decimal" value="' + _msAttr(rate) + '" oninput="_ms.rateEdited=true">' +
    '<div id="msRateHint" style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);margin:-6px 0 10px"></div>' +

    '<label style="display:block;font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text);margin:4px 0 16px">' +
      '<input type="checkbox" id="msText" checked> Send welcome text</label>' +

    '<button id="msGoBtn" onclick="_msMake()" ' +
      'style="width:100%;box-sizing:border-box;background:var(--green);color:#0b0b0b;border:none;border-radius:10px;padding:15px;' +
      'font-family:\'Syne\',sans-serif;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px">' +
      'Confirm as student</button>' +
    '<div id="msResult"></div>';
  _msRateHint();
}

function _msRateHint() {
  var el = document.getElementById('msRateHint');
  if (!el) return;
  el.textContent = _msRates
    ? 'Website: weekly $' + (_msRates.weekly || '?') + ' · biweekly $' + (_msRates.biweekly || '?')
    : 'Loading website rates…';
}

function _msLoadRates() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getWebsiteRates')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) return;
      _msRates = {};
      (d.rates || []).forEach(function (r) {
        var t = String(r.type || '').toLowerCase();
        if (t === 'weekly' || t === 'biweekly') _msRates[t] = r.rate;
      });
      if (!_ms) return;
      var el = document.getElementById('msRate');
      if (el && !_ms.rateEdited && _msRates[_ms.cadence]) el.value = _msRates[_ms.cadence];
      _msRateHint();
    })
    .catch(function () {});
}

function _msQuery() {
  var a = _ms.card, s = a.lesson || {}, d = _ms.start;
  var q = {
    name: _ms.name,
    email: a.email || '',
    cadence: _ms.cadence,
    date: d.getFullYear() + '-' + _msPad(d.getMonth() + 1) + '-' + _msPad(d.getDate()),
    time: _msPad(d.getHours()) + ':' + _msPad(d.getMinutes()),
    rate: document.getElementById('msRate').value,
    // The Trial Lessons row first (edited at the lesson), the inquiry second.
    phone: s.phone || a.phone || '',
    availability: s.availability || a.availability || '',
    sendText: document.getElementById('msText').checked ? '1' : '0'
  };
  return Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
}

function _msLine(t, color) {
  return '<div style="font-family:\'DM Mono\',monospace;font-size:12px;line-height:1.5;margin-bottom:3px;color:' +
    (color || 'var(--text)') + '">' + inqEsc(t) + '</div>';
}

function _msSteps(steps) {
  return (steps || []).map(function (st) {
    var bad = st.indexOf('⚠') === 0;
    return _msLine((bad ? '' : '✓ ') + st, bad ? 'var(--accent)' : 'var(--muted)');
  }).join('');
}

// Locks every control in the window while the write runs.
function _msLock(on) {
  ['msRate', 'msText', 'msGoBtn'].forEach(function (id) { var el = document.getElementById(id); if (el) el.disabled = on; });
  var x = document.getElementById('msX');
  if (x) x.style.visibility = on ? 'hidden' : '';
}

function _msMake() {
  var url = getScriptUrl();
  if (!url || !_ms || _ms.busy) return;
  var rate = parseFloat(String(document.getElementById('msRate').value || '').replace(/[^0-9.]/g, ''));
  var res = document.getElementById('msResult');
  if (!isFinite(rate) || rate <= 0) { res.innerHTML = '<div style="margin-top:10px">' + _msLine('⚠ Enter the rate first.', 'var(--accent)') + '</div>'; return; }

  var email = _ms.card.email || '';
  var qs = _msQuery();
  _ms.busy = true;
  _msLock(true);
  var go = document.getElementById('msGoBtn');
  go.style.cursor = 'wait'; go.style.opacity = '0.85';
  go.innerHTML = '<span class="ms-spin"></span>Confirming…';
  res.innerHTML =
    '<div style="margin-top:12px;padding:12px 14px;border:1px solid var(--accent2);border-radius:10px;text-align:center;' +
      'font-family:\'DM Mono\',monospace;font-size:12px;color:var(--accent2);animation:pulse 1.6s infinite">' +
      'Working. This takes about half a minute.<br>Don’t close this window.</div>';

  fetch(url + '?action=makeStudent&confirm=1&' + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!_ms) return;
      _ms.busy = false;
      if (!d.success) {
        _msLock(false);
        go.style.cursor = 'pointer'; go.style.opacity = '';
        go.textContent = 'Try again';
        res.innerHTML = _msBanner(false, 'Not done', d.message || 'Something went wrong.') + _msSteps(d.steps);
        return;
      }
      _ms.done = true;
      var warns = (d.steps || []).filter(function (st) { return st.indexOf('⚠') === 0; }).length;
      document.getElementById('msModal').innerHTML =
        '<div class="settings-title">Confirm as student<button class="settings-close" onclick="_msClose()">✕</button></div>' +
        _msBanner(true, 'Done', d.name + ' is a student' + (d.id ? ' (id ' + d.id + ')' : '') + '.' +
                  (warns ? ' ' + warns + ' step' + (warns === 1 ? '' : 's') + ' need a look, see below.' : '')) +
        '<div style="margin-top:12px">' + _msSteps(d.steps) + '</div>' +
        '<button class="btn-settings-load" style="margin-top:14px" onclick="_msClose()">Close</button>';
      _trDropStageCard(email);
    })
    .catch(function () {
      if (!_ms) return;
      _ms.busy = false;
      _msLock(false);
      go.style.cursor = 'pointer'; go.style.opacity = '';
      go.textContent = 'Confirm as student';
      res.innerHTML = _msBanner(false, 'No answer', 'The server did not reply. Check the Counter before trying again: it may have gone through.');
    });
}

function _msBanner(ok, big, small) {
  var c = ok ? 'var(--green)' : 'var(--accent)';
  return '<div style="margin-top:12px;padding:18px 14px;border:1.5px solid ' + c + ';border-radius:12px;text-align:center;' +
      'background:' + (ok ? 'rgba(76,175,80,0.10)' : 'rgba(232,70,58,0.08)') + '">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:28px;font-weight:800;color:' + c + '">' + (ok ? '✓ ' : '⚠ ') + inqEsc(big) + '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text);margin-top:6px">' + inqEsc(small) + '</div>' +
    '</div>';
}
