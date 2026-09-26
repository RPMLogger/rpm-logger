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
    // 12px on top of the label's own 16, so the first card doesn't hug the title.
    // Padding, not margin: a margin would collapse into the label's.
    '<div id="trAccepted" style="padding-top:12px"><div class="empty-state rpm-loading">Loading</div></div>' +
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
        box.innerHTML = '<div class="empty-state">None</div>';
        // Nobody left in Initiate, so nobody can be waiting on a reply. The
        // thread fetch below is skipped on this path, and the badge kept the
        // count from before the last person moved to Trial.
        _trSetInitiateBadge({});
        return;
      }
      box.innerHTML = d.accepted.map(_trAcceptedCard).join('');
      _trLoadThreads();
    })
    .catch(function () { box.innerHTML = '<div class="empty-state">❌ Could not load.</div>'; });
}

var _TR_BACK_LABEL = 'Move to Inquiries';

function _trAcceptedCard(a) {
  // Identical markup to an Inquiries card (same classes, same field renderer),
  // so a student's card doesn't change shape when they cross from Inquiries to
  // Trial. Only the action row differs: Book / send back instead of Yes/No.
  var em = _trEsc(a.email || "");
  return '<div class="inq-dcard accepted">' +
      '<div class="inq-drow"><span class="inq-chan">' + inqEsc(a.channel || "Gmail") + '</span></div>' +
      '<div class="inq-name-line"><span class="inq-name">' + inqEsc(a.name || "\u2014") + '</span>' +
        '<span class="fc-newmsg" id="fcnm-' + emailToId(a.email || "") + '"></span></div>' +
      '<div class="inq-fields">' + inqCardFieldsHtml(a) + '</div>' +
      '<div class="fc-thread" id="fcth-' + emailToId(a.email || "") + '"></div>' +
      '<div class="inq-acts">' +
        // Send-back sits bottom left, away from Email/Book, so it is never the
        // button your hand is already on. Link-button face (.link-btn, like
        // Inquiry Archive): Email amber (your move), Book in the
        // composer Send button's brighter grey (.bright).
        '<button class="link-btn tr-back-btn opens-window" onclick="_trReopenAsk(\'' + em + '\',' + (a.col || 0) + ', this)" ' +
          'data-tip="Asks first.\nCard goes back to Inquiries undecided.\nNothing is sent.\n(Not in Email list.)" data-tip-wrap>' + _TR_BACK_LABEL + '</button>' +
        // No Delete here (removed 2026-09-24): deleting a real person shrinks
        // the inquiry counts and loses their history. Someone who went quiet
        // goes Move to Inquiries, then No reply. Test inquiries: delete the column
        // in the sheet by hand.
        '<button class="link-btn amber opens-window" onclick="_trOpenEmail(\'' + em + '\')" ' +
          'data-tip="Opens a window.\nFirst-contact email draft.\nNothing sends until you press Send.\n(Not in Email list.)" data-tip-wrap>' + ENVELOPE_ICON + '<span>Email</span></button>' +
        '<button class="link-btn bright opens-window" onclick="_trBookAccepted(\'' + _trEsc(a.name || "") + '\',\'' + em + '\')" ' +
          'data-tip="Opens a window.\nBooking with their name and email.\nYou pick the date and time.\nCard moves to Trial once booked.\n(Not in Email list.)" data-tip-wrap data-tip-left>' + CALENDAR_ICON + '<span>Book</span></button>' +
      '</div>' +
    '</div>';
}

// Move to Inquiries asks first (2026-09-24; was "Undo move", then "← Inquiries"): a confirm box, the circular-arrow icon
// on its action, then the real send-back.
function _trReopenAsk(email, col, btn) {
  rpmConfirm({
    title: "Move to Inquiries?",
    confirmLabel: "Move",
    icon: REDO_ICON
  }).then(function (ok) { if (ok) _trReopen(email, col, btn); });
}

// Send an accepted student back to the Inquiries tab. Clears the Decision cell;
// nothing is deleted, so they reappear there as an open card with every field
// intact. For the ones you said Yes to and then never booked.
function _trReopen(email, col, btn) {
  var url = getScriptUrl();
  if (!url || !email) return;
  // The card dims while it works, the same .inq-busy fade as an Inquiries
  // card after Yes / No.
  var card = btn && btn.closest('.inq-dcard');
  if (card) card.classList.add('inq-busy');
  if (btn) { btn.disabled = true; btn.textContent = "Moving\u2026"; }
  fetch(url + '?action=reopenInquiry&email=' + encodeURIComponent(email) + '&col=' + encodeURIComponent(col || ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        if (card) card.classList.remove('inq-busy');
        if (btn) { btn.disabled = false; btn.innerHTML = _TR_BACK_LABEL; }
        _trStatus('\u26a0 ' + (d.message || 'Could not send back.'), 'var(--accent)');
        return;
      }
      _trLoadAccepted();
      _trStatus('Sent back to Inquiries \u2014 waiting there as an open card.', 'var(--accent2)');
    })
    .catch(function () {
      if (card) card.classList.remove('inq-busy');
      if (btn) { btn.disabled = false; btn.innerHTML = _TR_BACK_LABEL; }
      _trStatus('\u274c Could not reach the portal.', 'var(--accent)');
    });
}

// ── First contact composer ───────────────────────────────────────────────────
// Temporary, deliberately dumb: you write the email, this supplies the logo and
// the house formatting and sends it. No canned body — the point of this email is
// that it is written to the person. The SMS below is fixed and gets copied into
// iMessage by hand, because that conversation stays on the personal number.
var _trAcceptedCache = [];

// Both composers and the Trial tab's fields carry class="rpm-field" now - the
// one type the whole portal types into, defined in styles.css. They used to be
// three inline settings built as strings here.
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
function _trRenderOfferedSlots(email, p) {
  p = p || 'tr';
  var box = document.getElementById(p + 'OfferedSlots');
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
          return '<button class="db-mini-btn" onclick="_trPickSlot(\'' + s.date + '\',\'' + s.time + '\',\'' + p + '\')">' +
                   inqEsc(s.label) +
                 '</button>';
        }).join('') +
      '</div>' +
    '</div>';
}

// Chip click just fills date and time; name and email are already in place.
function _trPickSlot(date, time, p) {
  p = p || 'tr';
  function set(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
  set(p + 'Date', date);
  set(p + 'Time', time);
  _trDtShow(p);
  if (p === 'tb') _trBookWinPaint();
  else _trStatus('Set to ' + date + ' at ' + time + '. Check it, then Book trial.', 'var(--accent2)');
}

// The new-message flag, on the card itself. This replaced the ACTIVE/WAITING
// strip that used to sit above the cards: a list of first names at the top of
// the tab said nothing the cards could not say, and it said it in a second
// place that had to be read separately. What actually matters is the one thing
// you cannot see from a closed card — they wrote back and you have not answered.
// Shown only when the LAST message in the thread is theirs, so it clears itself
// the moment you reply.
function _trPaintNewMsg(email, t) {
  var el = document.getElementById('fcnm-' + emailToId(email || ''));
  if (!el) return;
  el.innerHTML = (t && t.theirTurn)
    ? '<span class="fc-new">\u25cf New message</span>'
    : '';
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
      if (!d.success || !d.threads) return;
      _trThreadCache = d.threads;
      _trSetInitiateBadge(d.threads);
      Object.keys(d.threads).forEach(function (email) {
        var box = document.getElementById('fcth-' + emailToId(email));
        if (!box) return;
        var t = d.threads[email];
        _trPaintNewMsg(email, t);
        if (!t.messages || !t.messages.length) { box.innerHTML = ''; return; }
        var id = emailToId(email);
        // Collapsed like Trial's. A repaint (e.g. after sending a reply) keeps
        // a thread open if it was open.
        var prev = document.getElementById('fcmsg-' + id);
        var wasOpen = !!(prev && prev.style.display !== 'none');
        box.innerHTML =
          '<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:16px">' +
            _trBounceRow(t) +
            _trThreadSummary(id, t.messages) +
            '<div id="fcmsg-' + id + '" style="display:none">' +
              t.messages.map(function (m) { return _trMsgRow(m, ((_trFindAccepted(email) || {}).name || '').split(' ')[0]); }).join('') +
              (t.threadId
                ? '<div id="fcrp-' + id + '">' +
                    '<button class="db-mini-btn" onclick="_trOpenReply(\'' + id + '\',\'' + t.threadId + '\')">Reply</button>' +
                  '</div>'
                : '') +
              '<button class="tr-open-btn small" style="margin-top:10px" onclick="_trToggleThread(\'' + id + '\',true)">Hide \u25b4</button>' +
            '</div>' +
          '</div>';
        if (wasOpen) _trToggleThread(id);
      });
    })
    .catch(function () { /* leave the cards alone if Gmail is unreachable */ });
}

function _trOpenReply(id, threadId) {
  var box = document.getElementById('fcrp-' + id);
  if (!box) return;
  box.innerHTML =
    '<textarea id="fcrpb-' + id + '" rows="5" placeholder="Reply in this thread…" class="rpm-field"></textarea>' +
    '<div id="fcrps-' + id + '"></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button class="db-mini-btn" onclick="_trCancelReply(\'' + id + '\',\'' + threadId + '\')">Cancel</button>' +
      '<button class="db-mini-btn strong" id="fcrpbtn-' + id + '" onclick="_trSendReply(\'' + id + '\',\'' + threadId + '\')" ' +
       'style="display:inline-flex;align-items:center;gap:7px">' + SEND_ICON + '<span>Send reply</span></button>' +
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
  if (btn) { btn.disabled = true; _trSetLabel(btn, 'Sending…'); }
  fetch(url + '?action=replyFirstContact&threadId=' + encodeURIComponent(threadId) +
        '&body=' + encodeURIComponent(body))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        if (btn) { btn.disabled = false; _trSetLabel(btn, 'Send reply'); }
        if (st) st.innerHTML = '<div style="color:var(--accent);font-family:\'DM Mono\',monospace;font-size:11px;margin-top:6px">⚠ ' + (d.message || 'Could not send') + '</div>';
        return;
      }
      _trRefreshThreads();   // redraw so the reply appears in the thread
      _trLoadThreads();      // and repaint Initiate, so the New message flag clears
    })
    .catch(function () {
      if (btn) { btn.disabled = false; _trSetLabel(btn, 'Send reply'); }
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

// them: their first name, so the header reads as the title of each message.
// The website's form email (Bandzoogle) opens the thread under their address,
// so it read as their first message: tracking links plus the form fields the
// card already shows. It collapses to one line.
function _trIsFormEmail(m) {
  var t = (m && m.text) || '';
  return !m.fromMe && (/New form submission for/i.test(t) || /bandzoogle\.com\/ls\/click/i.test(t));
}

function _trMsgRow(m, them) {
  if (_trIsFormEmail(m)) {
    return '<div class="tr-msg"><div style="border-left:2px solid var(--border);padding:0 0 0 9px;margin-bottom:20px">' +
        '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--muted);margin:6px 0">' +
          'Form submitted' +
          '<span style="font-size:10px"> · ' + inqEsc(m.date) + ' ' + inqEsc(m.time) + '</span>' +
        '</div>' +
      '</div></div>';
  }
  var mine = !!m.fromMe;
  var who  = mine ? 'You' : (them || 'Them');
  // Them green, you amber: each side of the exchange has its own colour, so
  // who said what reads down the edge without reading the headers.
  var edge = mine ? 'var(--warn)' : 'var(--green)';
  return '<div class="tr-msg"><div style="border-left:2px solid ' + edge + ';padding:0 0 0 9px;margin-bottom:20px">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:' + edge + ';margin:6px 0 16px">' +
        inqEsc(who) +
        '<span style="font-size:10px;color:var(--muted)"> · ' + inqEsc(m.date) + ' ' + inqEsc(m.time) + '</span>' +
      '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:11px;line-height:1.5;color:rgba(255,255,255,.62);margin-top:2px;white-space:pre-wrap;overflow-wrap:anywhere">' +
        inqEsc(m.text) +
      '</div>' +
    '</div></div>';
}

function _trPhonePretty(raw) {
  var d = (raw || "").toString().replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  if (d.length !== 10) return (raw || "").toString();
  return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
}

// Set a button's words without eating its icon: the iconed buttons are an
// <svg> plus a <span>, and textContent on the button itself would replace both
// with a bare string. Safe on plain buttons too - they have no span, so it
// falls back to the button.
function _trSetLabel(btn, msg) {
  if (!btn) return;
  (btn.querySelector("span") || btn).textContent = msg;
}

// The same, put back after a moment: the Copied confirmation.
function _trFlashLabel(btn, msg) {
  var el = btn.querySelector("span") || btn;
  var was = el.textContent;
  el.textContent = msg;
  setTimeout(function () { el.textContent = was; }, 1600);
}

function _trCopyPhone(btn, digits) {
  var done = function () { _trFlashLabel(btn, "Copied \u2713"); };
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


  var overlay = document.createElement("div");
  overlay.id = "trFcModal";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;" +
                          "align-items:center;justify-content:center;padding:18px;overflow:auto";
  overlay.innerHTML =
    "<div style='background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:600px;width:100%;padding:28px;box-sizing:border-box;max-height:92vh;overflow:auto'>" +
      // Same header as the lesson card modal: NAME in Bebas and accent, the
      // section after it in grey. One header shape for every panel that is
      // about one person, instead of this one inventing its own.
      "<div class='settings-title' style='margin-bottom:8px'>" +
        "<span>" + inqEsc(a.name || "") +
          "<span style='color:var(--muted)'> \u00b7 Compose</span></span>" +
        "<button class='settings-close' onclick='_trCloseEmail()'>✕</button>" +
      "</div>" +
      "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--muted);margin-bottom:20px'>" +
        "To: " + inqEsc(email) + "</div>" +
      // Marks the email half of the panel, the way the phone marks the text
      // half further down. Grey, so the red title still leads.
      "<input id='trFcSubject' value='About Your Trial Lesson Request' class='rpm-field' style='margin-bottom:14px'>" +
      "<textarea id='trFcBody' rows='16' class='rpm-field'>" + inqEsc(body) + "</textarea>" +
      "<div id='trFcStatus'></div>" +
      "<div style='display:flex;gap:8px;margin-top:20px'>" +
        "<button class='db-mini-btn' id='trFcPrevBtn' onclick='_trPreviewEmail()'>Preview</button>" +
        // Not green: green in this portal means done, and a button that has
        // not been pressed yet should not wear the colour of the thing it is
        // about to do. .strong is grey, a step brighter than the buttons
        // around it, which is all a primary action needs here.
        //
        // The span holds the words: _trSetLabel writes it for the Sending and
        // Sent states, so the plane beside it survives them.
        "<button class='db-mini-btn strong' id='trFcSendBtn' onclick='_trSendEmail()' " +
          "style='display:inline-flex;align-items:center;gap:7px'>" + SEND_ICON + "<span>Send</span></button>" +
      "</div>" +
      "<div id='trFcPreview'></div>" +
      "<hr class='divider' style='margin:34px 0 24px'>" +
      // The text half is built exactly like the email half above it: the same
      // title, the number where the address sits, the phone icon where the
      // envelope sits. Two halves of one job, so they read as a pair rather
      // than an email panel with a note stapled underneath.
      // No name on this one. The panel's own header said who this is, and the
      // number under it says which line - repeating "Jason Diller" here only
      // competes with the title at the top.
      "<div class='settings-title' style='margin-bottom:8px;color:var(--muted)'>" +
        "<span>Text</span></div>" +
      "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--muted);margin-bottom:20px'>" +
        (phonePretty ? inqEsc(phonePretty) : "No phone number on file") + "</div>" +
      // Smaller again than the email boxes above it, and in mono rather than
      // the composer's Arial. This one is not really read, it is copied, so it
      // only has to be legible enough to confirm it is the right message - and
      // the different face says at a glance that it is not part of the email.
      "<textarea id='trFcSms' rows='3' readonly class='rpm-field' style='font-size:10px'>" + inqEsc(sms) + "</textarea>" +
      // A clipboard convenience, so it is a standard button: it used to be
      // 12px in --text at radius 10, which made it the brightest thing in the
      // panel, louder than Send. Full width is kept; the type is not.
      // Three buttons, one job: get this text into iMessage. They were a full
      // width bar with two smaller ones parked underneath, which made the copy
      // button look like the step and the other two like an afterthought. One
      // row, one type, equal share of the width. The number stays on its
      // button because the number is what you tap.
      (phoneDigits
        ? "<div style='display:flex;gap:8px;margin-top:18px'>" +
            "<button class='db-mini-btn' style='flex:1;padding:9px;display:inline-flex;align-items:center;justify-content:center;gap:7px' onclick='_trCopySms(this)'>" +
              COPY_ICON + "<span>Copy Text</span></button>" +
            "<button class='db-mini-btn' style='flex:1;padding:9px;display:inline-flex;align-items:center;justify-content:center;gap:7px' " +
              "onclick='_trCopyPhone(this,\"" + phoneDigits + "\")'>" +
              COPY_ICON + "<span>Copy Phone #</span></button>" +
            "<a class='db-mini-btn' style='flex:1;padding:9px;display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none' " +
              "href='sms:" + phoneDigits + "'>" + OPEN_OUT_ICON + "<span>Open Messages</span></a>" +
          "</div>"
        : "<div style='display:flex;gap:8px;margin-top:18px'>" +
            "<button class='db-mini-btn' style='flex:1;padding:9px;display:inline-flex;align-items:center;justify-content:center;gap:7px' onclick='_trCopySms(this)'>" +
              COPY_ICON + "<span>Copy Text</span></button>" +
          "</div>") +
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
  // The label only. textContent here would take the icon with it.
  var done = function () { _trFlashLabel(btn, "Copied ✓"); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); document.execCommand("copy"); done(); });
  } else { ta.select(); document.execCommand("copy"); done(); }
}

// Render exactly what will be sent (logo shown as a placeholder — the real one
// is a cid: attachment that only resolves inside the email itself).
function _trPreviewEmail() {
  _trRenderPreview((document.getElementById("trFcBody") || {}).value || "", "trFcPreview");
}

// Shared by every composer that sends the house email (Initiate here, and the
// Inquiries Maybe / No popup): renders body in the real shell into boxId.
function _trRenderPreview(body, boxId) {
  var url = getScriptUrl();
  var box = document.getElementById(boxId);
  if (!url || !box) return;
  box.innerHTML = "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--muted);margin-top:12px'>Rendering…</div>";
  fetch(url + "?action=previewFirstContact&body=" + encodeURIComponent(body))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { box.innerHTML = "<div style='color:var(--accent);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:12px'>⚠ " + (d.message || "Could not render") + "</div>"; return; }
      // The logo is a cid: attachment that only resolves inside the real
      // email, so the preview draws a marker where it will sit. Dropping it
      // entirely was tried and left you wondering every time whether the logo
      // was still going out. Toned for the beige card, not the old white one.
      var html = d.html.replace(/<img[^>]*cid:logo[^>]*>/i,
        "<div style=\"width:64px;height:64px;border:1px dashed #9a978f;border-radius:8px;" +
        "display:inline-flex;align-items:center;justify-content:center;" +
        "font:9px/1.2 monospace;letter-spacing:1px;color:#6f6c65\">LOGO</div>");
      box.innerHTML =
        // 20 above and below the buttons, so they sit centred between the
        // box you typed in and the paper it becomes.
        "<div style='margin-top:20px'>" +
          // Same face and metrics as the box you typed it in, so the preview
          // is the same text on paper rather than a different setting.
          //
          // Paper, but dimmed: a white card in a portal this dark is a jolt
          // every time it opens. #d9d5ce still reads as light-on-dark - which
          // is what the recipient will see - without the glare.
          "<div class='fc-preview' style='position:relative;background:#d9d5ce;color:#1b1b1b;border:1px solid var(--border);border-radius:10px;padding:22px;" +
              "font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6'>" + html +
            // The portal's own close icon, painted dark for the paper.
            // No data-tip: the tooltip draws in ::before, which is where
            // .settings-close paints its icon.
            "<button class='settings-close fc-preview-x' aria-label='Close preview' " +
              "onclick='document.getElementById(\"" + boxId + "\").innerHTML=\"\"'>✕</button>" +
          "</div>" +
          // Closes from the bottom, where you are once you have read it - the
          // same quiet Hide as an opened email thread.
          "<button class='tr-open-btn small' style='margin-top:10px' " +
            "onclick='document.getElementById(\"" + boxId + "\").innerHTML=\"\"'>Hide \u25b4</button>" +
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
  if (btn) { btn.disabled = true; _trSetLabel(btn, "Sending…"); }
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
        if (btn) { btn.disabled = false; _trSetLabel(btn, "Send"); }
        if (st) st.innerHTML = "<div style='color:var(--accent);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:8px'>⚠ " + (d.message || "Could not send") + "</div>";
        return;
      }
      if (st) st.innerHTML = "<div style='color:var(--green);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:8px'>✓ Sent. Now copy the text below into iMessage.</div>";
      if (btn) _trSetLabel(btn, "Sent ✓");
      _trLoadAccepted();
    })
    .catch(function () {
      if (btn) { btn.disabled = false; _trSetLabel(btn, "Send"); }
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

// ── Booking an accepted inquiry: its own window ─────────────────────────────
// Booking someone who already inquired used to unfold the manual form further
// down the tab, prefill four boxes with what the card already said, and leave
// you to scroll and read a status line telling you what to do next. The card
// already knows who they are; the only open question is when. So it opens the
// same kind of window as Pick a time: the name in the title, one picker, one
// button that says exactly what it will do.
// The fields _trBook needs ride along as hidden inputs under the "tb" prefix,
// so the booking call itself is unchanged.
var _trBookWin = null;   // { name, email, busy }

function _trBookAccepted(name, email) {
  var parts = (name || '').split(' ');
  var last  = parts.length > 1 ? parts.pop() : '';
  var first = parts.join(' ');
  _trBookWin = { name: name || '', email: email || '', first: first, last: last, busy: false };

  var ov = document.getElementById('tbOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'settings-overlay';
    ov.id = 'tbOverlay';
    // 460, the width every Trial step window shares (2026-09-25, was 380).
    ov.innerHTML = '<div class="settings-modal" id="tbModal" style="max-width:460px"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) _trBookWinClose(); });
    document.body.appendChild(ov);
  }
  ov.classList.add('open');

  var def = _trDtDefault();
  document.getElementById('tbModal').innerHTML =
    '<div class="settings-title"><span>' + inqEsc(name || '') +
      '<span style="color:var(--muted);font-weight:400"> · Book a trial</span></span>' +
      '<button class="settings-close" onclick="_trBookWinClose()">✕</button></div>' +
    '<input type="hidden" id="tbFirst" value="' + _trEsc(first) + '">' +
    '<input type="hidden" id="tbLast" value="' + _trEsc(last) + '">' +
    '<input type="hidden" id="tbEmail" value="' + _trEsc(email || '') + '">' +
    '<input type="hidden" id="tbPhone" value="">' +
    '<div id="tbOfferedSlots" style="margin-bottom:10px"></div>' +
    // The label is a sentence the picker finishes, so the button underneath
    // does not have to say the date a third time - the title already has the
    // name, this line has the when, and Book trial is just the verb. It needs
    // room to read as a sentence rather than a caption stuck to the row.
    // Left, like Pick a time (2026-09-25, was centered).
    '<div style="margin:22px 0 6px">' + _trDtHtml('tb') + '</div>' +
    '<div id="tbStatus" style="margin-top:12px"></div>' +
    // Bottom right, where every other window in the portal puts the button
    // that ends it. Just "Book": the title says a trial, the line above says
    // when, so the verb is the only word left to add.
    // Green, the same .go as Save, because the footer slot is shared between
    // buttons that commit and buttons that only close. Plain down there reads
    // as Done - the harmless way out every other window trains you to click -
    // and this one creates a calendar event and mails the student.
    // The ✕ in the corner is the way out (2026-09-25, was a Cancel here):
    // the footer holds only the action.
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:24px">' +
      // Trying (2026-09-24): the card's Book face (bright grey + calendar)
      // instead of green, and keyboard-only: Enter on the date/time lands
      // here, Enter again books.
      '<button class="link-btn bright" id="tbBookBtn" ' +
        'onclick="_trBook(\'tb\')" data-tip="Instant.\nCreates the calendar event.\nEmails them the confirmation." data-tip-wrap data-tip-left>' + _TR_TB_BOOK_LABEL + '</button>' +
    '</div>';

  _trRenderOfferedSlots(email, 'tb');
  var f = document.getElementById('tbDateLbl');
  if (f) f.focus();
}

var _TR_TB_BOOK_LABEL = CALENDAR_ICON + '<span>Book</span>';

function _trBookWinClose() {
  if (_trBookWin && _trBookWin.busy) return;   // never close mid-send
  var ov = document.getElementById('tbOverlay');
  if (ov) ov.classList.remove('open');
  _trBookWin = null;
}

// The button reads Book and stays that way; the date it will use is the one in
// the sentence above it, which is the only place that has to be right.
function _trBookWinPaint() {
  var btn = document.getElementById('tbBookBtn');
  if (!btn || btn.disabled) return;
  btn.innerHTML = _TR_TB_BOOK_LABEL;
}

// ── Door 1: manual booking form ──────────────────────────────────────────────
function _trManualFormHtml(p) {
  p = p || 'tr';
  function inp(id, ph, type) {
    return '<input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + ph + '" ' +
      'style="box-sizing:border-box;background:var(--bg);border:1px solid rgba(255,255,255,0.1);border-radius:6px;' +
      'padding:6px 10px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:11px">';
  }
  return '<div class="section-label" style="margin-bottom:10px">Book a trial</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">' +
      // Booked from a card, the name and email are already known - the card is
      // where they came from. Four boxes asking for them again is four chances
      // to typo something that was right. They collapse to one line, with Edit
      // for the rare case the inquiry had the address wrong.
      '<div id="' + p + 'Who" style="display:none"></div>' +
      '<div id="' + p + 'Ident" style="display:flex;flex-direction:column;gap:8px">' +
        '<div style="display:flex;gap:8px">' +
          '<span style="flex:1">' + inp(p + 'First', 'First') + '</span>' +
          '<span style="flex:1">' + inp(p + 'Last', 'Last') + '</span>' +
        '</div>' +
        inp(p + 'Email', 'Email', 'email') +
        inp(p + 'Phone', 'Phone', 'tel') +
      '</div>' +
      '<div id="' + p + 'OfferedSlots"></div>' +
      _trDtHtml(p) +
    '</div>' +
    '<button class="db-mini-btn" id="' + p + 'BookBtn" onclick="_trBook(\'' + p + '\')" ' +
      'style="min-width:120px;text-align:left;' + _TR_CAPS + ';font-size:9px;padding:5px 10px;color:#ff5a4d;' +
      'background:' + _skFade('#ff5a4d') + ';border-color:rgba(255,255,255,0.1)">＋ Book trial</button>';
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
  if (p === 'tb') {
    // The card's window: the whole window fades like a waiting card, and the
    // button says what Google is doing (the dots come from core/utils.js).
    var md = document.getElementById('tbModal');
    if (md) md.classList.add('tb-busy');
    if (btn) { btn.disabled = true; btn.style.cursor = 'wait'; btn.textContent = 'Creating event…'; }
  } else if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'wait'; btn.textContent = 'Booking…'; }
  if (p === 'tb' && _trBookWin) _trBookWin.busy = true;   // Done and ✕ are dead until it lands
  if (p === 'ts') _tsBusy = true;
  // The card's window says nothing while it books: Book's own tip already
  // says it creates the calendar event, and the button shows Booking + dots.
  if (p !== 'tb') _trStatus('Creating the calendar event…', 'var(--accent2)', p);
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
      if (p === 'tb') {
        // The window's whole job is done; say so on the tab behind it, where
        // the card that started this is about to disappear.
        if (_trBookWin) _trBookWin.busy = false;
        _trBookWinClose();
        _trLoadAccepted();
        return;
      }
      if (p === 'ts') {
        // The new card lands on the tab behind the window.
        _tsBusy = false;
        _tsClose();
        initTrialStageTab();
        return;
      }
      ['First','Middle','Last','Email','Phone','Date','Time'].forEach(function (f) { var el = document.getElementById(p + f); if (el) el.value = ''; });
      _trDtShow(p);
      var sb = document.getElementById(p + 'OfferedSlots'); if (sb) sb.innerHTML = '';
      if (p === 'tr') _trLoadAccepted(); else initTrialStageTab();
    })
    .catch(function () { _trRestoreBook(p); _trStatus('❌ Could not reach the portal.', 'var(--accent)', p); });
}

function _trRestoreBook(p) {
  p = p || 'tr';
  if (p === 'tb' && _trBookWin) _trBookWin.busy = false;
  if (p === 'tb') { var md = document.getElementById('tbModal'); if (md) md.classList.remove('tb-busy'); }
  if (p === 'ts') _tsBusy = false;
  var btn = document.getElementById(p + 'BookBtn');
  if (!btn) return;
  btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = 'pointer';
  if (p === 'tb') _trBookWinPaint();
  else if (p === 'ts') btn.textContent = 'Book';
  else btn.textContent = '＋ Book trial';
}

// ── Trial date/time stepper ─────────────────────────────────────────────────
// ▲ Sun, Sep 13 ▼   ▲ 10:30 PM ▼   (day steps ±1, time steps ±15 min)
// The portal's one arrow rule, the one the Payments and Travel date fields
// already keep on the keyboard: VERTICAL arrows change the value under them,
// HORIZONTAL arrows move between fields. So both halves step with ▲▼, and
// Left/Right hops date <-> time rather than nudging a number. This picker used
// to break it twice - ◀▶ on the date, ▲▼ on the time, in the same row.
// The labels are buttons so they can hold focus and take ↑↓ / ←→ themselves.
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
  // The arrows stack to the left of the value and stay small: they say the
  // value moves, the value itself is what you click. See .dt-row.
  var btn = function (fn, n, dir) {
    return '<button type="button" class="dt-arrow" tabindex="-1" ' +
      'onclick="' + fn + '(\'' + p + '\',' + n + ')">' + dtArrow(dir) + '</button>';
  };
  // The card's Book a trial window (tb): ▲ above each pill, ▼ below, big
  // enough to tap. Clicking one also lights the pill, so the keys carry on
  // from there.
  var tri = function (fn, n, id, down) {
    return '<button type="button" class="tb-tri' + (down ? ' down' : '') + '" tabindex="-1" ' +
      'onclick="' + fn + '(\'' + p + '\',' + n + ');document.getElementById(\'' + id + '\').focus()">' + TRI_ICON + '</button>';
  };
  var seg = function (id, order, fn, step, w, txt) {
    if (p === 'tb') {
      return '<div class="tb-col">' + tri(fn, step, id) +
        '<div class="dt-seg">' +
          '<button type="button" class="dt-val" id="' + id + '" data-dt-nav="' + order + '" ' +
            'style="min-width:' + w + 'px" onkeydown="_trDtKey(event,\'' + p + '\',\'' + fn + '\',' + step + ')">' + txt + '</button>' +
        '</div>' + tri(fn, -step, id, true) + '</div>';
    }
    return '<div class="dt-seg">' +
        '<span class="dt-stack">' + btn(fn, step, 1) + btn(fn, -step, -1) + '</span>' +
        '<button type="button" class="dt-val" id="' + id + '" data-dt-nav="' + order + '" ' +
          'style="min-width:' + w + 'px" onkeydown="_trDtKey(event,\'' + p + '\',\'' + fn + '\',' + step + ')">' + txt + '</button>' +
      '</div>';
  };
  return '<input type="hidden" id="' + p + 'Date" value="' + def.date + '">' +
    '<input type="hidden" id="' + p + 'Time" value="' + def.time + '">' +
    '<div class="dt-row" id="' + p + 'DtRow">' +
      seg(p + 'DateLbl', 0, '_trDtStepDate', 1,  78, _trDtDateLabel(def.date)) +
      seg(p + 'TimeLbl', 1, '_trDtStepTime', 15, 52, _trDtTimeLabel(def.time)) +
    '</div>';
}

// ↑↓ steps the focused field, ←→ moves to the next one. The horizontal keys
// never change a value - that is the whole point of the split.
function _trDtKey(e, p, fn, step) {
  var f = fn === '_trDtStepDate' ? _trDtStepDate : _trDtStepTime;
  if (e.key === 'ArrowUp')   { e.preventDefault(); f(p, step);  return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); f(p, -step); return; }
  // tb only: Enter moves to Book (lit), a second Enter presses it.
  if (e.key === 'Enter' && p === 'tb') {
    e.preventDefault();
    var bk = document.getElementById('tbBookBtn');
    if (bk && !bk.disabled) bk.focus();
    return;
  }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  var row = document.getElementById(p + 'DtRow');
  if (!row) return;
  var here = parseInt(e.target.getAttribute('data-dt-nav'), 10);
  var next = row.querySelector('[data-dt-nav="' + (here + (e.key === 'ArrowRight' ? 1 : -1)) + '"]');
  if (next) next.focus();
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
  if (p === 'tb') _trBookWinPaint();
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
  body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';

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
      // The opener goes first, not last. Booking by hand is something you
      // arrive at the tab already meaning to do; it should not be behind a
      // scroll past every trial in progress.
      if (!_trStageCache.length) { body.innerHTML = '<div class="empty-state">None</div>' + _trStageBookHtml(); return; }
      body.innerHTML = _trStageCache.map(_trStageCard).join('') + _trStageBookHtml();
      _trPaintPaid();
      _trLoadStageThreads();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not load.</div>'; });
}

function _trStageCard(a) {
  var when = a.trialDateLabel || '';
  return '<div class="inq-dcard accepted" id="trcard-' + emailToId(a.email || '') + '">' +
      '<div class="inq-name-line"><span class="inq-name">' + inqEsc(a.name || '—') + '</span></div>' +
      // "TRIAL - Sun, Sep 13 - 11:15 AM" on its own line, then a divider.
      (when
        ? '<div style="font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:0.3px;margin-top:4px;color:' +
            (a.trialPast ? 'var(--muted)' : 'var(--green)') + '">' +
            'TRIAL ON - ' + inqEsc(when.replace(/^(\w{3})\s+/, '$1, ').replace(/\s+·\s+/, ', ')) +
          '</div>'
        : '') +
      '<hr class="divider" style="margin:18px 0 0">' +
      '<div id="trpaid-' + emailToId(a.email || '') + '"></div>' +
      _trStepsHtml(a) +
      '<hr class="divider" style="margin:0 0 20px">' +
      '<div class="inq-fields">' + inqCardFieldsHtml(a) + '</div>' +
      '<div class="fc-thread" id="fcth-' + emailToId(a.email || '') + '"></div>' +
      _trActionsHtml(a) +
    '</div>';
}

// ── The checklist ────────────────────────────────────────────────────────────
// Two lists of step buttons at the top of each card. Each opens its own small
// window; a done step just gets a check mark. Make student (red, bottom of the
// card) only works once the six decision steps on the left AND Log lesson are done.
//   Left, the decision:
//   Info        Save pressed in the Info window (boxes may stay empty)
//   Dropbox     folder created + shared with their Dropbox email
//   Frequency   Weekly / Biweekly
//   Pick a time the first regular lesson, date + time, in the future
//   Payment     ticks when the trial payment is found (or Paid on the row); window shows it
//   Terms       the button ticks once they are sent, but Make student still
//               waits for the acknowledgment form to come back
//   Right, the lesson itself:
//   Log lesson  typed or dictated (REQUIRED for Make student)
//   Send HW     drop files into their Dropbox folder (never required)
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
// Right: the lesson itself. Log lesson is required; Send HW never is.
var _TR_STEPS = [
  { key: 'info',  label: 'Info' },
  { key: 'dbx',   label: 'Dropbox' },
  { key: 'freq',  label: 'Frequency' },
  { key: 'time',  label: 'Pick a time' },
  { key: 'pay',   label: 'Payment' },                   // trial payment; the window shows what was found
  { key: 'terms', label: 'Send Terms' },               // email 1: Terms & Conditions + form
  { key: 'setup', label: 'Send Documents' },            // email 2: Dropbox + Texting, once the terms are back
  { key: 'log',   label: 'Log lesson', lesson: true, required: true },
  { key: 'hw',    label: 'Send HW',    lesson: true, required: true }
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

// { info, dbx, log, freq, time, terms: true/false, termsBack, termsSent, ready, missing[] }
// terms is the GATE: form back, nothing less. termsSent only brightens the
// step button, so a sent-but-not-returned form still blocks Make student.
function _trStepState(a) {
  var s = a.lesson || {};
  var st = {
    info:  s.infoDone === true || String(s.infoDone || '').toUpperCase() === 'TRUE',
    dbx:   !!s.dropboxMade,
    log:   _trFilled(s.whatWeDid),
    hw:    s.hwSent === true || String(s.hwSent || '').toUpperCase() === 'TRUE',
    freq:  /^(weekly|biweekly)$/i.test(String(s.frequency || '').trim()),
    time:  (function () { var d = _trFirstLessonDate(s.firstLesson); return !!d && d > new Date(); })(),
    pay:   s.paid === true || String(s.paid || '').toUpperCase() === 'TRUE' || !!_trTrialPayFor(a.email),
    terms: !!s.termsSent,
    back:  !!s.termsBack,
    termsBack: !!s.termsBack,
    termsSent: !!s.termsSent,
    setup: !!s.setupSent,
    setupSent: !!s.setupSent
  };
  st.missing = _TR_STEPS.filter(function (x) { return (!x.lesson || x.required) && !st[x.key]; })
    .map(function (x) {
      // The button labels are steps, not reasons. Say what is actually missing.
      if (x.key === 'terms') return 'Terms not sent';
      if (x.key === 'setup') return 'Documents not sent';
      return x.label;
    });
  // Terms back is not a step (it happens on its own), but Make student still
  // waits for it. The card's Status bar shows it.
  if (!st.termsBack) st.missing.push('Terms not back yet');
  st.ready = !st.missing.length;
  return st;
}

// Status: where the documents stand. Not a step - nothing to do here, it
// changes on its own (Send Documents → Waiting, form back → Accepted) - so it
// sits in the bottom row, left of Confirm Student, the same size, opening the
// dates. Grey / amber / green like the Inquiries decision buttons.
function _trStatusHtml(a) {
  var st = _trStepState(a);
  var v = st.termsBack ? ['Accepted', ' yes'] : (st.termsSent ? ['Waiting', ' maybe'] : ['Not sent', '']);
  return '<button class="inq-db opens-window' + v[1] + '" style="margin-right:auto" ' +
      'onclick="_tlOpen(\'' + _trEsc(a.email || '') + '\',\'status\')">Status: ' + v[0] + '</button>';
}

var _TR_CAPS = 'color:rgba(255,255,255,0.62);text-transform:uppercase;letter-spacing:1px;font-size:10px;padding:5px 9px';

// The step lists, at the top of the card: decision steps on the left, lesson
// steps on the right. Every box looks the same; done just gets a check mark.
function _trStepsHtml(a) {
  var id = emailToId(a.email || '');
  var em = _trEsc(a.email || '');
  var st = _trStepState(a);

  // One numbered list, split across two columns rather than two lists that
  // each start at 1. The lesson steps used to number themselves 1 and 2 beside
  // a left column that ran 1 to 7, which read as two separate checklists when
  // it is one: nine steps, five then four.
  var all = _TR_STEPS.filter(function (x) { return !x.lesson; })
              .concat(_TR_STEPS.filter(function (x) { return x.lesson; }));
  var SPLIT = 5;

  function step(x, n) {
    var done = x.key === 'terms' ? (st.termsBack || st.termsSent) : st[x.key];
    // A logged lesson is logged: step 8 keeps its tick but no longer opens.
    var flat = x.noWindow || (x.key === 'log' && done);
    return '<div class="tr-step' + (done ? ' is-done' : '') + '">' +
             '<span class="tr-step-n">' + n + '.</span>' +
             '<button class="tr-step-b' + (x.lesson ? ' lesson' : '') + (done ? ' done' : '') + (flat ? ' flat' : '') + '" ' +
               (flat ? 'tabindex="-1"' : 'onclick="_tlOpen(\'' + em + '\',\'' + x.key + '\')"') + '>' +
               '<span>' + x.label + '</span>' +
             '</button>' +
           '</div>';
  }
  function col(from, to) {
    return '<div class="tr-col">' +
      all.slice(from, to).map(function (x, i) { return step(x, from + i + 1); }).join('') +
    '</div>';
  }
  return '<div class="tr-steps" id="trsteps-' + id + '">' +
      col(0, SPLIT) + col(SPLIT, all.length) +
    '</div>';
}

// Make student + Not continuing, at the bottom of the card. Make student is
// red; it only works once the five decision steps are done.
function _trActionsHtml(a) {
  var id = emailToId(a.email || '');
  var em = _trEsc(a.email || '');
  // The same pair as the inquiry card's Yes / No, one stage later: two
  // mutually exclusive outcomes, either of which ends the card. So they use
  // the same buttons, .inq-db yes / no, rather than a look of their own.
  // Confirm is always clickable: _msOpen says what is still missing.
  return '<div id="tracts-' + id + '" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">' +
      '<div class="inq-acts">' +
        _trStatusHtml(a) +
        '<button class="inq-db yes opens-window" onclick="_msOpen(\'' + em + '\')" ' +
          'data-tip="Opens a window.\nChecks the steps and makes them a student.\nCard disappears from Trial.\nStays in Inquiry Archive.\n(Not in Email list.)" data-tip-wrap data-tip-left>Confirm Student</button>' +
        '<button class="inq-db no opens-window" id="trnobtn-' + id + '" ' +
          'onclick="_trNotContinuing(\'' + id + '\',\'' + em + '\',\'' + _trEsc(a.name || '') + '\')" ' +
          'data-tip="Opens a window.\nPick Not Continued or No Show.\nCard disappears from Trial.\nStays in Inquiry Archive.\n(Not in Email list.)" data-tip-wrap data-tip-left>Dismiss</button>' +
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
    // 460, the one width every Trial window and Book a trial share (2026-09-25).
    ov.innerHTML = '<div class="settings-modal" id="tlModal" style="max-width:460px;max-height:90vh;overflow-y:auto"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) _tlClose(); });
    document.body.appendChild(ov);
  }
  ov.classList.add('open');
  document.getElementById('tlModal').innerHTML = _tlTitle() + '<div class="empty-state rpm-loading">Loading</div>';

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
   'pencilledSpot', 'phone', 'city', 'schoolJob', 'interests', 'dropboxEmail', 'sentDate', 'returnDate', 'setupDate']
    .forEach(function (k) { patch[k] = rec[k] || ''; });
  patch.dropboxMade = String(rec.dropboxMade || '').toUpperCase() === 'TRUE';
  patch.termsSent   = String(rec.termsSent || '').toUpperCase() === 'TRUE';
  patch.termsBack   = String(rec.termsBack || '').toUpperCase() === 'TRUE';
  patch.setupSent   = String(rec.setupSent || '').toUpperCase() === 'TRUE';
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
  var step = _TR_STEPS.filter(function (x) { return x.key === _tl.step; })[0] ||
             (_tl.step === 'status' ? { label: 'Status' } : null);
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

// The row a step's buttons sit in: bottom right, where Save and Book sit.
// One face for all of them (.link-btn): the action bright grey, anything
// beside it dim, green only once it has worked (2026-09-25).
function _tlActs(html) {
  return '<div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:16px">' + html + '</div>';
}

function _tlRender() {
  if (!_tl) return;
  var a = _tl.card, s = a.lesson || {};
  var body = { info: _tlInfoHtml, dbx: _tlDbxHtml, log: _tlLogHtml, hw: _tlHwHtml,
               freq: _tlFreqHtml, time: _tlTimeHtml, pay: _tlPayHtml, terms: _tlTermsHtml, setup: _tlSetupHtml, status: _tlStatusHtml }[_tl.step] || _tlInfoHtml;
  document.getElementById('tlModal').innerHTML =
    _tlTitle() +
    (_tl.loadError ? '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--accent);margin-bottom:8px">⚠ ' + inqEsc(_tl.loadError) + '</div>' : '') +
    body(a, s) +
    // The ✕ is the only way out (2026-09-25); the footer holds just the
    // action, bottom right, bright grey (green is for done, and an unpressed
    // Save isn't). Steps with nothing to save have no footer at all.
    (_tl.step === 'info' || _tl.step === 'freq'
      ? '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">' +
          (_tl.step === 'info'
            ? '<button class="link-btn bright" id="tlInfoSave" onclick="_tlSaveInfo()">Save</button>'
            : '<button class="link-btn bright" id="tlFreqSave" onclick="_tlSaveFreq()">Save</button>') +
        '</div>'
      : '');
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
  // The window's icon sits under the title, above the first field.
  return '<div style="margin:4px 0 18px">' + INFO_ICON + '</div>' +
  _TR_INFO.map(function (f) {
    var v = inqEsc(val(f.key));
    return '<div style="margin-bottom:16px">' +
        '<div class="field-label">' + f.label + '</div>' +
        (f.multi
          ? '<textarea id="tli-' + f.key + '" rows="3" class="rpm-field">' + v + '</textarea>'
          : '<input id="tli-' + f.key + '" type="text" value="' + v.replace(/"/g, '&quot;') + '" class="rpm-field">') +
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
  // A failed save leaves the window open with the message; _tlSaveFields
  // puts Save back so he can retry.
  _tlSaveFields(fields, 'tlInfoMsg', function () { _tlClose(); });
}

// ── 2 · Dropbox ──
function _tlDbxHtml(a, s) {
  var rec = _tl.rec || {};
  var made = !!s.dropboxMade;
  var dbxEmail = rec.dropboxEmail || s.dropboxEmail || a.email || '';
  // The folder name is shown, not editable: Send HW and Make Student both
  // expect the folder to be exactly the student's full name.
  return '<div style="margin:4px 0 18px">' + FOLDER_ICON.replace('class="folder-icon"', 'class="win-icon"').replace('width="15" height="12"', 'width="40" height="32"') + '</div>' +
    // Same rhythm as Info: label on its box, 16px to the next label.
    '<div style="margin-bottom:16px">' +
      '<div class="field-label">Folder name</div>' +
      // A box like the email's so the two values line up, but read-only:
      // Send HW and Make Student find the folder by the student's full name.
      '<input class="rpm-field" id="tlDbxFolder" readonly tabindex="-1" style="cursor:default" value="' + _msAttr(a.name || '') + '">' +
    '</div>' +
    '<label class="field-label" for="tlDbxEmail">Account email</label>' +
    '<input class="rpm-field" id="tlDbxEmail" value="' + _msAttr(dbxEmail) + '"' + (made ? ' disabled' : '') + '>' +
    _tlMsg('tlDbxMsg') +
    _tlActs('<button class="link-btn ' + (made ? 'green' : 'bright') + '" id="tlDbxBtn"' +
      (made ? ' disabled' : '') + ' onclick="_tlDropbox()">' +
      (made ? 'Folder made ✓' : 'Create & share') + '</button>');
}

// ── Log lesson ──
// The same window as Home's Log Lesson (#logPanel, lessons.js): three rows,
// mic button, Log. Rows join as "Row 1 - Row 2 - Row 3" in Title Case. Only
// Log saves, and a logged lesson is final: step 8 stops opening this window
// (see _trStepsHtml), so it always starts empty.
var _TL_ROWS = ['', '', ''];   // three rows, no placeholder text

function _tlLogHtml(a, s) {
  _tl.row = 0;
  return '<div style="margin:4px 0 18px">' + LOG_ICON + '</div>' +
    '<div class="ll-rows">' +
      _TL_ROWS.map(function (ph, i) {
        return '<input type="text" class="rpm-field ll-row' + (i ? '' : ' active') + '" id="tlRow-' + i + '" ' +
          'onfocus="_tlRow(' + i + ')" oninput="_tlLogReady()">';
      }).join('') +
    '</div>' +
    '<div class="ll-acts" style="margin-top:16px">' +
      // The mic is a tool, not an action: a bare icon on the left, apart
      // from Log, which is the button on the right.
      '<button class="link-btn tl-mic" id="tlMicBtn" data-tip="Starts or stops dictation." onclick="_tlMic()">' + MIC_ICON + '</button>' +
      '<span class="ll-state" id="tlWhatMsg" style="flex:1"></span>' +
      '<button class="link-btn bright" id="tlLogBtn" onclick="_tlLogWhat()" disabled>Log</button>' +
    '</div>';
}

// The grey ring (.active) marks the row the mic writes into.
function _tlRow(i) {
  if (!_tl) return;
  _tl.row = i;
  document.querySelectorAll('#tlModal .ll-row').forEach(function (el, j) { el.classList.toggle('active', j === i); });
}

// Log wakes up once any row has words in it, as on Home.
function _tlLogReady() {
  var b = document.getElementById('tlLogBtn');
  if (!b || !_tl || _tl.logged || _tl.logging) return;
  b.disabled = !_TL_ROWS.some(function (x, i) { var t = document.getElementById('tlRow-' + i); return t && t.value.trim(); });
}

var _tlMicRec = null;

function _tlMic() {
  if (_tlMicRec) { try { _tlMicRec.stop(); } catch (e) {} return; }
  if (!_tl || _tl.logged) return;
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { _tlSetMsg('tlWhatMsg', '⚠ Speech not supported here. Use Chrome.', 'var(--accent)'); return; }
  var r = new Rec();
  r.lang = 'en-US'; r.continuous = true; r.interimResults = true;

  // Words go into whichever row is active; tapping another row mid-recording
  // carries on there, appending to what that row already holds.
  var cur = -1, base = '', finals = '';
  function target() {
    var i = (_tl && _tl.row) || 0;
    if (i !== cur) {
      cur = i; finals = '';
      var t0 = document.getElementById('tlRow-' + i);
      base = t0 ? t0.value.replace(/\s+$/, '') : '';
    }
    return document.getElementById('tlRow-' + i);
  }
  function join(interim) {
    var said = (finals + ' ' + (interim || '')).replace(/\s+/g, ' ').trim();
    return [base, said].filter(function (x) { return x; }).join(' ');
  }
  function micLook(on) {
    var b = document.getElementById('tlMicBtn');
    if (b) { b.innerHTML = on ? MIC_STOP_ICON : MIC_ICON; b.classList.toggle('rec', on); }
  }
  r.onstart = function () {
    micLook(true);
    _tlSetMsg('tlWhatMsg', 'Recording', 'var(--accent)');
    try { playBeep(880, 100); } catch (e) {}
  };
  r.onresult = function (ev) {
    var t = target();
    var interim = '';
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) finals += ' ' + ev.results[i][0].transcript;
      else interim += ev.results[i][0].transcript;
    }
    if (t) t.value = join(interim);
    _tlLogReady();
  };
  r.onend = function () {
    _tlMicRec = null;
    var t = cur >= 0 ? document.getElementById('tlRow-' + cur) : null;
    if (t) t.value = join('');
    micLook(false);
    _tlSetMsg('tlWhatMsg', '');
    try { playBeep(440, 80, 0.15); } catch (e) {}
    if (_tl && _tl.logAfterMic) { _tl.logAfterMic = false; _tlLogWhat(); }
  };
  r.onerror = function (e) {
    if (e.error === 'no-speech') return;
    _tlSetMsg('tlWhatMsg', '⚠ Mic: ' + e.error, 'var(--accent)');
  };
  _tlMicRec = r;
  r.start();
}

// Log: join the rows and save. If the mic is still on, stop it first and log
// once the last words are in. The window stays open and says so; Done closes.
function _tlLogWhat() {
  if (!_tl || _tl.logged || _tl.logging) return;
  if (_tlMicRec) { _tl.logAfterMic = true; try { _tlMicRec.stop(); } catch (e) {} return; }
  var v = _TL_ROWS.map(function (x, i) { var t = document.getElementById('tlRow-' + i); return t ? t.value.trim() : ''; })
    .filter(function (x) { return x; }).map(toTitleCase).join(' - ');
  if (!v) { _tlSetMsg('tlWhatMsg', 'Nothing to log yet.', 'var(--accent)'); return; }
  var btn = document.getElementById('tlLogBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Logging…'; }
  _tl.logging = true;
  _tlSaveFields({ whatWeDid: v }, 'tlWhatMsg', function () {
    if (!_tl) return;
    _tl.logged = true;
    _TL_ROWS.forEach(function (x, i) { var t = document.getElementById('tlRow-' + i); if (t) t.readOnly = true; });
    var mic = document.getElementById('tlMicBtn');
    if (mic) mic.disabled = true;
    var b = document.getElementById('tlLogBtn');
    if (b) { b.textContent = 'Logged ✓'; b.className = 'link-btn green'; }
    _tlSetMsg('tlWhatMsg', 'Lesson logged ✓', 'var(--green)');
  });
  setTimeout(function () {
    if (!_tl || _tl.logged) return;
    _tl.logging = false;
    var b = document.getElementById('tlLogBtn');
    if (b) { b.disabled = false; b.textContent = 'Log'; }
  }, 8000);
}

// ── + · Send HW ──
function _tlHwHtml(a, s) {
  if (!s.dropboxMade) {
    return '<div class="empty-state" style="padding:22px 10px">Make their Dropbox folder first.<br><br>' +
      '<button class="link-btn" onclick="_tl.step=\'dbx\';_tlRender()">Go to Dropbox →</button></div>';
  }
  var done = s.hwSent === true || String(s.hwSent || '').toUpperCase() === 'TRUE';
  // Some trials genuinely have nothing to send. The step still has to be
  // answered, so say so on the record rather than leaving it hanging.
  return '<div id="tlUpload">' + _tlUploadHtml(a.name) + '</div>' +
    _tlMsg('tlHwMsg') +
    _tlActs('<button class="link-btn' + (done ? ' green' : '') + '" id="tlHwNoneBtn" onclick="_tlHwNone()">' +
        (done ? 'Sent \u2713 \u00b7 undo' : 'No material to send') +
      '</button>');
}

// Marks the step done (or undoes it) without an upload.
function _tlHwNone() {
  if (!_tl) return;
  var s = _tl.card.lesson || {};
  var done = s.hwSent === true || String(s.hwSent || '').toUpperCase() === 'TRUE';
  _tlSaveFields({ hwSent: done ? 'false' : 'true' }, 'tlHwMsg', function () {
    if (_tl) _tlRender();
  });
}

// ── 4 · Frequency ──
// Tapping only picks; tapping the picked one again un-picks it. Save writes
// it (blank included, to reset) and closes. Closing without Save keeps
// whatever was saved before.
function _tlFreqCur() {
  return String(_tl.freqPick !== undefined ? _tl.freqPick : ((_tl.card.lesson || {}).frequency || ''));
}

// The window icon row (under the title) for Frequency and Pick a time.
function _tlCalIcon() {
  return '<div style="margin:4px 0 18px">' +
    CALENDAR_ICON.replace('class="calendar-icon"', 'class="win-icon"') + '</div>';
}

function _tlFreqHtml(a, s) {
  var f = _tlFreqCur().toLowerCase();
  function pick(v) {
    var on = f === v.toLowerCase();
    // The date / time pickers' grey box (2026-09-25), in caps: the picked
    // one lit soft white, the other dim. ←→ pick, Enter saves.
    return '<button type="button" class="tl-seg-opt' + (on ? ' on' : '') + '" tabindex="-1"' +
      ' onclick="_tlSetFreq(\'' + v + '\')">' + v + '</button>';
  }
  return _tlCalIcon() +
    '<div class="tl-seg">' + pick('Weekly') + pick('Biweekly') + '</div>' +
    _tlMsg('tlFreqMsg');
}

function _tlSetFreq(v) {
  if (!_tl) return;
  _tl.freqPick = _tlFreqCur().toLowerCase() === v.toLowerCase() ? '' : v;
  _tlRender();
}

document.addEventListener('keydown', function (e) {
  if (!_tl || _tl.step !== 'freq' || _tl.busy) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    _tl.freqPick = e.key === 'ArrowLeft' ? 'Weekly' : 'Biweekly';
    _tlRender();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    _tlSaveFreq();
  }
});

function _tlSaveFreq() {
  if (!_tl) return;
  var v = _tlFreqCur();
  var btn = document.getElementById('tlFreqSave');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }
  _tlSaveFields({ frequency: v }, 'tlFreqMsg', function () { _tlClose(); });
}

// ── 5 · Pick a time (first lesson) ──
// Nothing is saved until Set. Saves First Lesson
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

// Book a trial's picker (2026-09-25): the first lesson's date and time in one
// grey box, ▲ / ▼ above and below each. The regular spot is not asked for
// separately: it is the first lesson's weekday and time, so the line under it
// says so. Hover or click makes a field the lit one and it stays lit; ↑↓
// change it, ←→ move between the two, Enter sets. Keys are read by the one
// document listener below, so nothing has to hold browser focus.
var _TL_PT = ['_tlStepDay', '_tlStepMins'];
var _TL_PT_STEP = [1, 30];

function _tlTimeHtml(a, s) {
  var w = _tlTimeState();
  var v = _tlTimeValue();
  var spot = _tlSpotStr(w.date.getDay(), w.mins);
  var saved = String(s.firstLesson || '') === v && String(s.pencilledSpot || '') === spot;
  var past = _trFirstLessonDate(v) <= new Date();
  var on = _tl.ptOn || 0;
  var freq = String(s.frequency || '').trim();
  var h = Math.floor(w.mins / 60), mi = w.mins % 60, d = w.date;
  var dateTxt = _MS_DAYS[d.getDay()] + ', ' + _MS_MONTHS[d.getMonth()] + ' ' + d.getDate();
  var timeTxt = ((h % 12) || 12) + ':' + _msPad(mi) + (h < 12 ? ' AM' : ' PM');
  var tri = function (i, n, down) {
    return '<button type="button" class="tb-tri' + (down ? ' down' : '') + '" tabindex="-1" ' +
      'onclick="_tlPtOn(' + i + ');' + _TL_PT[i] + '(' + n + ')">' + TRI_ICON + '</button>';
  };
  var col = function (i, w, label) {
    return '<div class="tb-col">' + tri(i, _TL_PT_STEP[i]) +
      '<div class="dt-seg"><button type="button" class="dt-val' + (on === i ? ' on' : '') + '" tabindex="-1" data-pt="' + i + '" ' +
        'style="min-width:' + w + 'px" onmousemove="_tlPtHover(event,' + i + ')" onclick="_tlPtOn(' + i + ')">' + label + '</button></div>' +
      tri(i, -_TL_PT_STEP[i], true) + '</div>';
  };
  return _tlCalIcon() +
    '<div class="dt-row" id="tlDtRow" style="margin-top:6px">' + col(0, 90, dateTxt) + col(1, 68, timeTxt) + '</div>' +
    '<div class="pt-sum">Starting ' + inqEsc(dateTxt) + ' · ' + timeTxt + ' · ' +
      '<span class="pt-freq">' + (freq ? inqEsc(freq) : 'Frequency not set') + '</span></div>' +
    (past ? '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--accent);margin-top:8px">⚠ That is in the past.</div>' : '') +
    _tlMsg('tlTimeMsg') +
    _tlActs(saved
        ? '<button class="link-btn green" disabled>Set ✓</button>'
        : '<button class="link-btn bright" id="tlTimeSet"' + (past ? ' disabled' : '') +
            ' onclick="_tlSaveTime()">Set</button>');
}

function _tlPtOn(i) {
  if (!_tl) return;
  _tl.ptOn = i;
  var els = document.querySelectorAll('#tlModal [data-pt]');
  for (var k = 0; k < els.length; k++) els[k].classList.toggle('on', +els[k].getAttribute('data-pt') === i);
}

// Every step redraws the window, and the browser then reports the new field
// under a still mouse as hovered. Only a mouse that actually moved counts.
var _tlPtXY = '';
function _tlPtHover(e, i) {
  var xy = e.screenX + ',' + e.screenY;
  if (xy === _tlPtXY) return;
  _tlPtXY = xy;
  if (_tl && _tl.ptOn !== i) _tlPtOn(i);
}

document.addEventListener('keydown', function (e) {
  if (!_tl || _tl.step !== 'time' || !_tl.rec || _tl.busy) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  var on = _tl.ptOn || 0;
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    window[_TL_PT[on]](e.key === 'ArrowUp' ? _TL_PT_STEP[on] : -_TL_PT_STEP[on]);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    _tlPtOn(Math.max(0, Math.min(_TL_PT.length - 1, on + (e.key === 'ArrowRight' ? 1 : -1))));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    _tlSaveTime();
  }
});

function _tlAt(date, mins) { var t = new Date(date); t.setHours(0, mins, 0, 0); return t; }

// First lesson date: a day at a time, never back into the past.
function _tlStepDay(n) {
  if (!_tl) return;
  var w = _tlTimeState();
  var nd = new Date(w.date); nd.setDate(nd.getDate() + n);
  if (n < 0 && _tlAt(nd, w.mins) <= new Date()) return;
  w.date = nd;
  _tlRender();
}

function _tlStepMins(n) {
  if (!_tl) return;
  var w = _tlTimeState();
  w.mins = Math.min(23 * 60 + 30, Math.max(0, Math.round(w.mins / 30) * 30 + n));
  _tlRender();
}

// Set (or Enter): save, then close like the Frequency window.
function _tlSaveTime() {
  if (!_tl) return;
  var w = _tlTimeState();
  var v = _tlTimeValue();
  if (_trFirstLessonDate(v) <= new Date()) return;
  var spot = _tlSpotStr(w.date.getDay(), w.mins);
  var btn = document.getElementById('tlTimeSet');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  _tlMark({ firstLesson: v, pencilledSpot: spot });
  _tlSaveFields({ firstLesson: v, pencilledSpot: spot }, 'tlTimeMsg', function () { _tlClose(); });
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
    return '<div style="margin:4px 0 18px">' + PAY_ICON + '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:' + color + '">' + txt + '</div>';
  };
  if (p) {
    var date = String(p.date || '').replace(/,?\s*\d{4}$/, '');
    return line('✓ ' + inqEsc(p.method || '') + ' ' + inqEsc(p.amount || '') + ' · ' + inqEsc(date), 'var(--green)');
  }
  if (s.paid === true || String(s.paid || '').toUpperCase() === 'TRUE') return line('✓ Paid (ticked on the Trial row)', 'var(--green)');
  return line('No trial payment found yet.', 'var(--muted)');
}

// ── 6 · Terms ──
// Two emails, two steps (2026-09-26): with everything in one email the terms
// got skimmed. Send Terms is the terms alone; Send Documents (Dropbox +
// Texting) unlocks once the form is back. Each list opens the real documents.
// Same links as TL_LINK_* in RPM_TrialLesson.gs - change them in both places.
var _TL_LINKS = {
  dropbox: 'https://drive.google.com/file/d/1OnCnnQi9AuEqz9oZs0Dru3iF98SKxFjJ/view?usp=sharing',
  phone:   'https://drive.google.com/file/d/1iZRyYgyU5hLDMDOiUugqNgcVVQkr89gn/view?usp=sharing',
  terms:   'https://drive.google.com/file/d/1u-gC8TH6lFhCdR4VMuHXviZG8MbTWU6g/view?usp=sharing',
  form:    'https://docs.google.com/forms/d/e/1FAIpQLSeBKLJUKPqf6ExNsfvD5pdt9UqR1nNt6Flu_VJv6LMsCFCfug/viewform'
};

// One email's window body: icon, its documents, Preview + Send, the preview.
// Each email is sent once: after that its Send stays off, green.
function _tlEmailHtml(which, list, sent, lockNote) {
  return '<div style="margin:4px 0 18px">' + DOCS_ICON + '</div>' +
    '<div class="field-label">Documents</div>' +
    '<div class="tl-docs">' + list.map(function (x) {
      return '<a class="tl-doc" href="' + x[1] + '" target="_blank" rel="noopener">' +
        '<span>' + inqEsc(x[0]) + '</span>' + OPEN_OUT_ICON + '</a>';
    }).join('') + '</div>' +
    _tlMsg('tlMsg-' + which) +
    _tlActs((lockNote ? '<span class="ll-state" style="flex:1">' + lockNote + '</span>' : '') +
      '<button class="link-btn" onclick="_tlPreview(\'' + which + '\')">Preview</button>' +
      '<button class="link-btn ' + (sent ? 'green' : 'bright') + '" id="tlSendBtn-' + which + '"' +
        (sent || lockNote ? ' disabled' : ' onclick="_tlSend(\'' + which + '\')"') + '>' +
        (sent ? '<span>Sent ✓</span>' : SEND_ICON + '<span>Send</span>') + '</button>') +
    '<div id="tlPreview-' + which + '"></div>';
}

function _tlTermsHtml(a, s) {
  return _tlEmailHtml('terms', [['Terms & Conditions', _TL_LINKS.terms], ['Acknowledgment Form', _TL_LINKS.form]], !!s.termsSent);
}

// Preview works anytime, so what goes out later can be read now.
function _tlSetupHtml(a, s) {
  var locked = !s.termsBack && !s.setupSent;
  return _tlEmailHtml('setup', [['Dropbox', _TL_LINKS.dropbox], ['Texting', _TL_LINKS.phone]], !!s.setupSent,
    locked ? 'Send unlocks when the terms are back.' : '');
}

// ── Status ──
// Read-only: when the documents went out, and when the form came back.
function _tlStatusHtml(a, s) {
  var rec = _tl.rec || {};
  var sent = s.termsSent ? (rec.sentDate || s.sentDate || 'Sent') : 'Not sent';
  var back = s.termsBack ? (rec.returnDate || s.returnDate || 'Back') : (s.termsSent ? 'Waiting' : 'Not sent yet');
  function box(label, v) {
    return '<div style="margin-bottom:16px"><div class="field-label">' + label + '</div>' +
      '<input class="rpm-field" readonly tabindex="-1" style="cursor:default" value="' + _msAttr(v) + '"></div>';
  }
  var setup = s.setupSent ? (rec.setupDate || s.setupDate || 'Sent') : (s.termsBack ? 'Not sent yet' : 'After the terms are back');
  return '<div style="margin:4px 0 18px">' + DOCS_ICON + '</div>' +
    box('Terms sent on', sent) + box('Terms back on', back) + box('Setup sent on', setup);
}

// One save call for any Trial Lessons fields. saveTrialRecord_ only writes the
// keys it is sent, so nothing else on the row can be clobbered.
// Saving… → the window closes (saved) or a red line (not saved, press Save
// again). If Google has not answered in 20s, say so instead of waiting forever.
var _TL_SAVE_LIMIT = 20000;

function _tlSaveFields(fields, msgId, onOk) {
  var url = getScriptUrl();
  if (!url || !_tl) return;
  var email = _tl.card.email || '';
  _tlSetMsg(msgId, 'Saving…');
  function fail(txt) { _tlSetMsg(msgId, txt, 'var(--accent)'); _tlResetSaveBtns(); }
  var timer = setTimeout(function () { fail('❌ No answer from Google. Press Save again.'); }, _TL_SAVE_LIMIT);
  var qs = Object.keys(fields).map(function (k) { return '&' + k + '=' + encodeURIComponent(fields[k]); }).join('');
  fetch(url + '?action=saveTrialRecord&email=' + encodeURIComponent(email) + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      clearTimeout(timer);
      if (!d.success) { fail('⚠ ' + (d.message || 'Not saved')); return; }
      if (d.skipped && d.skipped.length) { fail('⚠ No column on the sheet: ' + d.skipped.join(', ')); return; }
      if (_tl && _tl.rec) Object.keys(fields).forEach(function (k) { _tl.rec[k] = fields[k]; });
      _tlMarkEmail(email, fields);
      _tlSetMsg(msgId, 'Saved ✓', 'var(--green)');
      if (onOk) onOk();
    })
    .catch(function () { clearTimeout(timer); fail('❌ Not saved. Press Save again.'); });
}

// After a failed save, put the Save / Set buttons back so it can be retried.
function _tlResetSaveBtns() {
  if (!_tl) return;
  [['tlInfoSave', 'Save'], ['tlFreqSave', 'Save'], ['tlTimeSet', 'Set']].forEach(function (x) {
    var b = document.getElementById(x[0]);
    if (b) { b.disabled = false; b.textContent = x[1]; }
  });
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
      '<button class="link-btn" style="flex:1;justify-content:center;padding:7px 10px" onclick="openDropboxLocalFolder(document.getElementById(\'tlDrop\').dataset.folder)" ' +
        'data-tip="Opens elsewhere. (Their Dropbox folder in Finder.)\nDrag folders in and Dropbox uploads them.">\ud83d\udcc1 Open in Finder</button>' +
      '<button class="link-btn" style="flex:1;justify-content:center;padding:7px 10px" onclick="document.getElementById(\'tlFolderIn\').click()">\ud83d\udcc2 Browse folder</button>' +
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
      if (ok) _tlSaveFields({ hwSent: 'true' }, 'tlHwMsg');
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
        btn.style.borderColor = ''; btn.style.color = '';
        _tlSetMsg('tlDbxMsg', '\u26a0 ' + (d.message || 'Not created'), 'var(--accent)');
        return;
      }
      btn.textContent = 'Folder made \u2713'; btn.style.borderColor = ''; btn.style.color = ''; btn.className = 'link-btn green';
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
      btn.style.animation = ''; btn.style.borderColor = ''; btn.style.color = '';
      _tlSetMsg('tlDbxMsg', '\u274c No answer. Check the Dropbox tab before trying again: it may have gone through.', 'var(--accent)');
    });
}

// which: 'terms' (email 1) or 'setup' (email 2)
function _tlPreview(which) {
  var url = getScriptUrl();
  if (!url || !_tl) return;
  var box = document.getElementById('tlPreview-' + which);
  box.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + '?action=previewTrialTerms&which=' + which + '&name=' + encodeURIComponent(_tl.card.name || ''))
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
  // Same marker as the composer preview: you can see the logo is going.
  var body = String(html || '').replace(/<img [^>]*cid:logo[^>]*>/,
    '<div style="width:64px;height:64px;border:1px dashed #9a978f;border-radius:8px;' +
    'display:inline-flex;align-items:center;justify-content:center;' +
    'font:9px/1.2 monospace;letter-spacing:1px;color:#6f6c65">LOGO</div>');
  // No To line (the window already says who). The subject sits inside the
  // white card, above the body, set apart by a rule (2026-09-26).
  return '<div style="margin-top:12px;border:1px solid var(--border);border-radius:10px;overflow:hidden">' +
      '<div class="fc-preview" style="background:#d9d5ce;color:#1b1b1b;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6">' +
        '<div style="padding-bottom:10px;margin-bottom:14px;border-bottom:1px solid #b9b5ad">SBJ: ' + inqEsc(subject || '') + '</div>' +
        body + '</div>' +
    '</div>';
}

function _tlSend(which) {
  var url = getScriptUrl();
  if (!url || !_tl || _tl.busy) return;
  var a = _tl.card, msg = 'tlMsg-' + which, setup = which === 'setup';
  var btn = document.getElementById('tlSendBtn-' + which);
  var lbl = btn.querySelector('span');
  _tl.busy = true; btn.disabled = true; lbl.textContent = 'Sending…';
  _tlSetMsg(msg, 'Sending to ' + (a.email || '') + '…');
  fetch(url + '?action=sendTrialTerms&which=' + which + '&email=' + encodeURIComponent(a.email || '') + '&name=' + encodeURIComponent(a.name || ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!_tl) return;
      _tl.busy = false; btn.disabled = false;
      if (!d.success) {
        lbl.textContent = 'Send';
        _tlSetMsg(msg, '⚠ ' + (d.message || 'Not sent'), 'var(--accent)');
        return;
      }
      btn.innerHTML = '<span>Sent ✓</span>'; btn.disabled = true; btn.onclick = null;
      btn.className = 'link-btn green';
      _tl.rec = _tl.rec || {};
      var patch = setup ? { setupSent: true, setupDate: d.sentDate } : { termsSent: true, sentDate: d.sentDate };
      Object.keys(patch).forEach(function (k) { _tl.rec[k] = patch[k] === true ? 'TRUE' : patch[k]; });
      _tlMark(patch);
      _tlSetMsg(msg, 'Sent to ' + (a.email || '') + ' · ' + d.sentDate +
        (d.stamped ? '' : ' (Could not tick it on the sheet.)'), 'var(--green)');
    })
    .catch(function () {
      if (!_tl) return;
      _tl.busy = false; btn.disabled = false; lbl.textContent = 'Send';
      _tlSetMsg(msg, '❌ No answer. Check Sent mail before sending again.', 'var(--accent)');
    });
}

function _trFieldHtml(id, email, f, val) {
  var multi = (f.key === 'notes' || f.key === 'goals' || f.key === 'availability');
  var common = 'id="trf-' + id + '-' + f.key + '" ' +
    'onblur="_trSaveField(\'' + id + '\',\'' + _trEsc(email) + '\',\'' + f.key + '\',this)" ' +
    'class="rpm-field"';
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
// Dismiss opens a window with the two ways a Trial can end without a student:
// Not Continued (took the lesson, outcome Unsuccessful) or No Show (never
// came, outcome No Show). Picking one closes the Trial; closing the window
// changes nothing. No Show used to live in the Log lesson window.
function _trNotContinuing(id, email, name) {
  var url = getScriptUrl();
  if (!url || !email) return;
  _trDismissClose();
  var ov = document.createElement('div');
  ov.className = 'rpm-dlg-overlay';
  ov.id = 'trDismissWin';
  ov.innerHTML =
    '<div class="rpm-dlg" role="dialog" aria-modal="true">' +
      '<div class="settings-title" style="margin-bottom:10px">' +
        '<span>' + inqEsc(name || email) + '<span style="color:var(--muted)"> \u00b7 Dismiss</span></span>' +
        '<button class="settings-close" onclick="_trDismissClose()">\u2715</button>' +
      '</div>' +
      '<div class="rpm-dlg-msg">How did the Trial end?</div>' +
      '<div class="rpm-dlg-acts" style="justify-content:flex-start">' +
        '<button class="inq-db no" id="trDzNC" onclick="_trNotContinuingGo(\'' + id + '\',\'' + _trEsc(email) + '\',\'Unsuccessful\')">Not Continued</button>' +
        '<button class="inq-db maybe" id="trDzNS" onclick="_trNotContinuingGo(\'' + id + '\',\'' + _trEsc(email) + '\',\'No Show\')">No Show</button>' +
      '</div>' +
      '<div id="trDzMsg" class="rpm-dlg-msg" style="min-height:16px"></div>' +
    '</div>';
  ov.addEventListener('click', function (e) { if (e.target === ov) _trDismissClose(); });
  document.body.appendChild(ov);
}

function _trDismissClose() {
  var w = document.getElementById('trDismissWin');
  if (w && !w._busy) w.remove();
}

function _trNotContinuingGo(id, email, outcome) {
  var url = getScriptUrl();
  var win = document.getElementById('trDismissWin');
  if (!url || !win || win._busy) return;
  win._busy = true;
  var nc = document.getElementById('trDzNC'), ns = document.getElementById('trDzNS');
  var pressed = outcome === 'No Show' ? ns : nc;
  [nc, ns].forEach(function (b) { if (b) b.disabled = true; });
  if (pressed) pressed.textContent = 'Saving\u2026';
  fetch(url + '?action=closeTrial&email=' + encodeURIComponent(email) + '&outcome=' + encodeURIComponent(outcome))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      win._busy = false;
      if (!d || !d.success) {
        [nc, ns].forEach(function (b) { if (b) b.disabled = false; });
        if (nc) nc.textContent = 'Not Continued';
        if (ns) ns.textContent = 'No Show';
        var m = document.getElementById('trDzMsg');
        if (m) { m.textContent = '\u26a0 ' + ((d && d.message) || 'Not saved'); m.style.color = 'var(--accent)'; }
        return;
      }
      _trDismissClose();
      _trDropStageCard(email);
    })
    .catch(function () {
      win._busy = false;
      [nc, ns].forEach(function (b) { if (b) b.disabled = false; });
      if (nc) nc.textContent = 'Not Continued';
      if (ns) ns.textContent = 'No Show';
      var m = document.getElementById('trDzMsg');
      if (m) { m.textContent = '\u274c Could not reach the portal.'; m.style.color = 'var(--accent)'; }
    });
}

// Take one person off the Trial tab (outcome settled): cache, card, payments.
function _trDropStageCard(email) {
  _trStageCache = _trStageCache.filter(function (a) { return (a.email || '') !== email; });
  var card = document.getElementById('trcard-' + emailToId(email || ''));
  if (card) card.remove();
  _trPayRender();
  var body = document.getElementById('trialStageBody');
  if (body && !_trStageCache.length) body.innerHTML = '<div class="empty-state">None</div>' + _trStageBookHtml();
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
          '<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:16px">' +
            // A bounce is never hidden. It is the one thing on this card that
            // means something is broken right now.
            _trBounceRow(t) +
            _trThreadSummary(id, msgs) +
            '<div id="fcmsg-' + id + '" style="display:none">' +
              msgs.map(function (m) { return _trMsgRow(m, (a.name || '').split(' ')[0]); }).join('') +
              // Reply sits inside the opened thread: nobody replies unread.
              (hasThread
                ? '<div id="fcrp-' + id + '">' +
                    '<button class="db-mini-btn" onclick="_trOpenReply(\'' + id + '\',\'' + t.threadId + '\')">Reply</button>' +
                  '</div>'
                : '') +
              // A long thread pushes the top toggle off screen, so the thread
              // closes from its own bottom too.
              '<button class="tr-open-btn small" style="margin-top:10px" onclick="_trToggleThread(\'' + id + '\',true)">Hide \u25b4</button>' +
            '</div>' +
            (hasThread
              ? ''
              // No thread to reply into (booked without an email exchange), so
              // fall back to the composer, which starts one.
              : '<button class="db-mini-btn go opens-window" onclick="_trOpenEmail(\'' + _trEsc(a.email || '') + '\')">Email</button>') +
          '</div>';
      });
    })
    .catch(function () { /* leave the cards alone */ });
}

// Booking someone by hand belongs here, not in Initiate. Initiate is for people
// who inquired, and booking one of them is driven from their card. This is the
// other case: a trial that never came through the form. Own id prefix ("ts") so
// its fields cannot collide with Initiate's, since both panels live in the DOM.
// Bottom of the tab: it is the rare path, so it sits under the cards instead of
// between the section label and them. It opens a window like every other form
// on this tab, rather than unfolding the form in the page.
function _trStageBookHtml() {
  return '<hr class="divider" style="margin:36px 0 32px">' +
    '<button class="tr-open-btn opens-window" onclick="_tsShowBook()">Book a trial manually</button>';
}

var _tsBusy = false;

function _tsShowBook() {
  var ov = document.getElementById('tsOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'settings-overlay';
    ov.id = 'tsOverlay';
    ov.innerHTML = '<div class="settings-modal" id="tsModal" style="max-width:460px"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) _tsClose(); });
    document.body.appendChild(ov);
  }
  _tsBusy = false;
  function inp(id, ph, type) {
    return '<input class="rpm-field" id="' + id + '" type="' + (type || 'text') + '" placeholder="' + ph + '">';
  }
  document.getElementById('tsModal').innerHTML =
    '<div class="settings-title"><span>Book a trial' +
      '<span style="color:var(--muted);font-weight:400"> · Manually</span></span>' +
      '<button class="settings-close" onclick="_tsClose()">✕</button></div>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      '<div style="display:flex;gap:8px">' + inp('tsFirst', 'First') + inp('tsLast', 'Last') + '</div>' +
      inp('tsEmail', 'Email', 'email') +
      inp('tsPhone', 'Phone', 'tel') +
    '</div>' +
    '<div style="margin:22px 0 6px">' + _trDtHtml('ts') + '</div>' +
    '<div id="tsStatus" style="margin-top:12px"></div>' +
    // Same footer as the Book window on an inquiry card: green, bottom right,
    // because it creates a calendar event and mails the student.
    '<div style="display:flex;justify-content:flex-end;margin-top:24px">' +
      '<button class="db-mini-btn go" id="tsBookBtn" style="padding:7px 20px" ' +
        'onclick="_trBook(\'ts\')" data-tip="Instant.\nCreates the calendar event.\nEmails them the confirmation." data-tip-wrap data-tip-left>Book</button>' +
    '</div>';
  ov.classList.add('open');
  var f = document.getElementById('tsFirst');
  if (f) f.focus();
}

function _tsClose() {
  if (_tsBusy) return;   // never close mid-send
  var ov = document.getElementById('tsOverlay');
  if (ov) ov.classList.remove('open');
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
  if (!body) return;
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';

  fetch(url + '?action=getTrialPayments')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      _trPayCache = [];
      _trPayOk    = false;
      if (!d.success) {
        // d.error catches a missing router line, which otherwise reads as a
        // vague "could not load" and sends you looking in the wrong place.
        body.innerHTML = '<div class="empty-state">⚠ ' + inqEsc(d.message || d.error || 'Could not load') + '</div>';
        return;
      }
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
  if (!_trPayCache.length) { body.innerHTML = '<div class="empty-state">None</div>'; _trPaintPaid(); return; }
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
    ? ''
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
          '<span class="incoming-date">' + inqEsc(String(p.date || '').replace(/,?\s*\d{4}$/, '')) + '</span>' +
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
// Initiate collapses the same way: long threads (quoted form notifications,
// tracking links) buried the cards.
function _trThreadSummary(id, msgs) {
  if (!msgs.length) {
    return '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);margin-bottom:8px">' +
        'No email exchange yet.' +
      '</div>';
  }
  var last = msgs[msgs.length - 1];
  var who  = last.fromMe ? 'Last From You' : 'Last From Them';
  return '<div id="fcsum-' + id + '" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">' +
      '<button class="tr-open-btn small" id="fctog-' + id + '" onclick="_trToggleThread(\'' + id + '\')">Show \u25be</button>' +
      '<span style="font-family:\'DM Mono\',monospace;font-size:10px;color:' +
        (last.fromMe ? 'var(--muted)' : 'var(--green)') + '">' +
        msgs.length + (msgs.length === 1 ? ' Message, ' : ' Messages, ') + who +
      '</span>' +
    '</div>';
}

function _trToggleThread(id, fromBottom) {
  var box = document.getElementById('fcmsg-' + id);
  var btn = document.getElementById('fctog-' + id);
  if (!box) return;
  var open = box.style.display !== 'none';
  box.style.display = open ? 'none' : '';
  if (btn) btn.textContent = open ? 'Show \u25be' : 'Hide \u25b4';
  // Closed from the bottom: the page would otherwise be left somewhere below
  // the card, so bring the summary line back into view.
  if (open && fromBottom) {
    var sum = document.getElementById('fcsum-' + id);
    if (sum) sum.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
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
  if (!st.ready) {
    _msOverlay();
    document.getElementById('msModal').innerHTML =
      '<div class="settings-title"><span>' + inqEsc(a.name || '') +
        '<span style="color:var(--muted);font-weight:400"> · Not ready yet</span></span>' +
        '<button class="settings-close" onclick="_msClose()">✕</button></div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Still missing:</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:5px">' +
      _TR_STEPS.map(function (x, i) {
        if ((x.lesson && !x.required) || st[x.key]) return '';
        var mc = x.lesson ? '#4a9eff' : '#ff7a3c';
        // Opens that step's window straight from here.
        return '<button class="db-mini-btn" style="min-width:120px;text-align:left;' + _TR_CAPS + ';font-size:9px;padding:3px 8px;color:' + mc + ';background:' +
                 _skFade(mc) + ';border-color:rgba(255,255,255,0.1)" ' +
                 'onclick="_msClose();_tlOpen(\'' + _trEsc(email) + '\',\'' + x.key + '\')">' + (x.lesson ? '' : (i + 1) + '. ') + x.label + '</button>';
      }).join('') +
      // Not a step, but still required: opens the Status window.
      (st.termsBack ? '' :
        '<button class="db-mini-btn" style="min-width:120px;text-align:left;' + _TR_CAPS + ';font-size:9px;padding:3px 8px;color:#f0a500;background:' +
          _skFade('#f0a500') + ';border-color:rgba(255,255,255,0.1)" ' +
          'onclick="_msClose();_tlOpen(\'' + _trEsc(email) + '\',\'status\')">Terms not back yet</button>') +
      '</div>' +
      '<div style="text-align:right;margin-top:16px"><button class="db-mini-btn" style="padding:7px 20px" onclick="_msClose()">OK</button></div>';
    return;
  }
  var s = a.lesson || {};
  _ms = {
    card: a,
    name: [s.first, s.last].filter(_trFilled).join(' ').trim() || a.name || '',
    cadence: String(s.frequency || '').toLowerCase() === 'biweekly' ? 'biweekly' : 'weekly',
    start: _trFirstLessonDate(s.firstLesson),
    rateEdited: false, busy: false, done: false
  };

  _msOverlay();
  _msRenderForm();
  _msLoadRates();
}

function _msOverlay() {
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

function _msLbl(t) { return '<label class="field-label" style="margin-top:6px">' + t + '</label>'; }
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
  var a  = _ms.card;
  var st = _trStepState(a);
  var rate = (_msRates && _msRates[_ms.cadence]) || '';
  var tp = _trTrialPayFor(a.email);

  // Only the lines that carry a value. The tick column is gone and so are the
  // rows that were nothing but a tick - Info and Dropbox: the step list on the
  // card behind this window already says what is done, and repeating it here
  // in green made the finished work the loudest thing on a confirm screen.
  function row(k, v, color) {
    if (!v) return '';
    return '<div style="display:flex;gap:12px;padding:4px 0;font-family:\'DM Mono\',monospace;font-size:12px">' +
        '<span class="field-label" style="width:104px;flex:none;margin:0;padding-top:1px">' + k + '</span>' +
        '<span style="color:' + (color || 'rgba(255,255,255,0.82)') + '">' + v + '</span>' +
      '</div>';
  }

  document.getElementById('msModal').innerHTML =
    '<div class="settings-title">Confirm as student<button class="settings-close" id="msX" onclick="_msClose()">✕</button></div>' +

    '<div style="font-family:\'Syne\',sans-serif;font-size:20px;font-weight:400;color:var(--text);margin:2px 0 12px">' + inqEsc(_ms.name) + '</div>' +
    '<div style="border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:10px 0;margin-bottom:16px">' +
      row('Frequency', _ms.cadence === 'biweekly' ? 'Biweekly' : 'Weekly') +
      row('First lesson', inqEsc(_msWhenLabel())) +
      // Only worth a line when something is missing.
      row('Payment', tp ? '' : 'No trial payment found', 'var(--muted)') +
      row('Terms',   st.termsBack ? 'Back' : (st.termsSent ? 'Sent' : 'Not sent yet'),
          st.termsBack ? null : 'var(--muted)') +
    '</div>' +

    _msLbl('Rate ($ per lesson)') +
    '<input class="settings-input" id="msRate" inputmode="decimal" value="' + _msAttr(rate) + '" oninput="_ms.rateEdited=true">' +
    '<div id="msRateHint" style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);margin:-6px 0 10px"></div>' +

    '<label style="display:block;font-family:\'DM Mono\',monospace;font-size:12px;color:rgba(255,255,255,0.82);margin:4px 0 16px">' +
      '<input type="checkbox" id="msText" checked> Send welcome text</label>' +

    '<div style="display:flex;justify-content:flex-end">' +
      '<button id="msGoBtn" onclick="_msMake()" ' +
        'style="background:var(--green);color:#0b0b0b;border:none;border-radius:8px;padding:8px 18px;' +
        'font-family:\'DM Mono\',monospace;font-size:12px;font-weight:500;letter-spacing:0.5px;cursor:pointer;' +
        'display:inline-flex;align-items:center;justify-content:center;gap:8px">' +
        'Confirm as student</button>' +
    '</div>' +
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
