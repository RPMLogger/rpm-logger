// ─── TABS / EMAILS.JS ───────────────────────────────────────────────────────
// Emails tab (2026-11-02; two panes 2026-11-12, user): like Comms / Mail —
// Mail's sidebar (the two mailboxes), the list, the open email on the right.
//   Students     the 7 NEWEST emails from students and trial people
//                (user, 2026-11-12; was the last 7 days), new ones first.
//   G Business   the G-Business label, all of 2026.
// Subscriptions + Everything else were dropped (user: Gmail has them).
// A glance only (user, 2026-11-12): plain text, no reply box — Open in Gmail
// to reply there. Backend RPM_Emails.js (getEmails&section=…). Texts stay in Comms.
//
// New = unread in Gmail, or (from Nov 2 2026) not yet opened here. The tab
// badge + Home rack screen count new Student + G Business emails; each mailbox
// shows its own. Re-checked every 10 min while the portal is open.

var EM_SECTIONS = [
  { key: "students",  title: "Students",   note: "Last 7 emails" },
  { key: "gbusiness", title: "G Business", note: "All of 2026" }
];
var _emData = {};          // section key → rows (null while loading, {err} on failure)
var _emKey = "students";   // the switch that's on
var _emCur = null;         // the email open on the right: { key, e }
var _emCounts = { students: 0, gbusiness: 0, names: [] };

function initEmailsTab() {
  var hb = document.querySelector("#tab-emails .em-headbox");
  if (hb && !hb.querySelector(".ms-switch")) hb.insertAdjacentHTML("beforeend", rpmMsgSwitchHtml("emails"));   // Texts / Emails (2026-11-22)
  _emPlates();
  emShow(_emKey);
}

// Turn a switch on: load that list (fresh each time) and draw it.
function emShow(key) {
  if (_emKey !== key) _emPane(null);
  _emKey = key;
  document.querySelectorAll("#tab-emails .em-box").forEach(function (b) {
    b.classList.toggle("cm-on", b.getAttribute("data-em") === key);
  });
  var s = EM_SECTIONS.filter(function (x) { return x.key === key; })[0];
  if (!Array.isArray(_emData[key])) _emData[key] = null;
  _emRender();
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getEmails&section=" + key)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) throw new Error((data && data.message) || "No answer");
      var rows = data.emails || [];
      if (key === "students")   // the 7 newest only (the backend sends just that; this keeps it so either way)
        rows = rows.sort(function (a, b) { return b.ts - a.ts; }).slice(0, 7);
      _emData[key] = rows;
      _emRender();
      _emReopenLast(key);
    })
    .catch(function (err) { _emData[key] = { err: err.message }; _emRender(); });
}

function _emRender() {
  var list = document.getElementById("emList");
  if (!list) return;
  var key = _emKey, rows = _emData[key];
  if (rows === null || rows === undefined) { list.innerHTML = '<div class="empty-state rpm-loading">Loading</div>'; return; }
  if (rows.err) { list.innerHTML = '<div id="emErr"></div>'; rpmFail(document.getElementById("emErr"), rows.err, "left"); return; }
  if (!rows.length) {
    list.innerHTML = '<div class="cm-none cm-list-empty">' +
      (key === "students" ? "No emails from students yet." : "No Google Business emails in 2026.") + '</div>';
    return;
  }
  // New ones first, then newest first.
  var order = rows.map(function (e, i) { return i; }).sort(function (a, b) {
    return (_emHot(rows[b]) - _emHot(rows[a])) || (rows[b].ts - rows[a].ts);
  });
  list.innerHTML = order.map(function (i) { return _emRowHtml(key, i, rows[i]); }).join("");
}

// The list's date, the same in both mailboxes (user, 2026-11-22): "Nov 5", the year only when
// it isn't this year. Was the weekday + time for Students ("Thu 2:56 PM"), which made a
// 17-day-old email look like this week's. The time stays in the open email's header.
function _emWhen(e) {
  var d = e.ts ? new Date(e.ts) : null;
  if (!d || isNaN(d)) return e.date || '';
  var s = MONTHS[d.getMonth()] + ' ' + d.getDate();
  return d.getFullYear() === new Date().getFullYear() ? s : s + ', ' + d.getFullYear();
}

function _emHot(e) { return e.isNew || e.unread ? 1 : 0; }

function _emRowHtml(key, i, e) {
  var who = key === "students" ? e.name : e.from;
  var on = _emCur && _emCur.e.id === e.id;
  return '<div class="cm-conv' + (_emHot(e) ? ' cm-wait' : '') + (on ? ' em-on' : '') + '" onclick="_emOpen(\'' + key + '\',' + i + ')">' +
    '<span class="cm-dot"></span>' +
    '<span class="cm-conv-main">' +
      '<span class="cm-conv-top"><span class="cm-conv-name">' + inqEsc(who) + '</span>' +
        '<span class="cm-conv-when">' + inqEsc(_emWhen(e)) + '</span></span>' +
      '<span class="em-subj">' + inqEsc(e.subject) + '</span>' +
      (e.snippet ? '<span class="cm-conv-prev">' + inqEsc(e.snippet) + '</span>' : '') +
    '</span></div>';
}

// The right pane: nothing open (null) → "Pick an email", else the head (with Open in Gmail) + the email.
function _emPane(cur) {
  _emCur = cur;
  var head = document.getElementById("emHead"), read = document.getElementById("emRead");
  if (!head) return;
  if (!cur) {
    head.innerHTML = "";
    read.innerHTML = '<div class="cm-none cm-thread-empty em-pick">Pick an email on the left.</div>';
    return;
  }
  var e = cur.e, student = cur.key === "students";
  var who = student ? e.name : e.from;
  head.innerHTML = '<span class="cm-ava">' + inqEsc(_emInitials(who)) + '</span>' +
    '<span class="em-head-main"><span class="em-head-from">' + inqEsc(who) + '</span>' +
      '<span class="em-head-subj">' + inqEsc(e.subject) + '</span>' +
      '<span class="em-head-to">' + (student ? 'From: ' + inqEsc(e.email) : 'To: redpickmusic@gmail.com') + '</span></span>' +
    '<span class="em-head-side"><span class="em-head-when">' + inqEsc(student && e.time ? e.time + ' · ' + e.date : e.date) + '</span>' +
      '<a class="link-btn em-gmail" href="https://mail.google.com/mail/u/0/#all/' + encodeURIComponent(e.id) + '" target="_blank" rel="noopener" ' +
        'data-tip="Opens elsewhere.\nThis email in Gmail, to reply there." data-tip-left><span>Open in Gmail</span><span data-icon="out">' + OPEN_OUT_ICON + '</span></a></span>';
  read.innerHTML = '<div id="emMsgStatus" class="em-status"></div>';
}

function _emInitials(name) {
  var w = String(name || "?").replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  return ((w[0] || "?")[0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}

// Like Mac Mail (user, 2026-11-16): coming back to the tab (or a mailbox) shows
// the email last opened there, not "Pick an email". Remembered per mailbox in
// this browser. It was opened before, so reopening it marks nothing.
function _emLastKey(key) { return "rpmEmLast_" + key; }
function _emReopenLast(key) {
  if (_emCur || _emKey !== key) return;
  var id = null;
  try { id = localStorage.getItem(_emLastKey(key)); } catch (x) {}
  if (!id) return;
  var rows = _emData[key] || [];
  for (var i = 0; i < rows.length; i++) if (rows[i].id === id) { _emOpen(key, i, true); return; }
}

function _emOpen(key, i, reopen) {
  var e = (_emData[key] || [])[i];
  if (!e) return;
  try { localStorage.setItem(_emLastKey(key), e.id); } catch (x) {}
  _emPane({ key: key, e: e });
  _emRender();
  rpmSetLoading(document.getElementById("emMsgStatus"), "Opening");
  fetch(getScriptUrl() + "?action=getGBusinessMessage&id=" + encodeURIComponent(e.id))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) throw new Error((data && data.message) || "No answer");
      if (!_emCur || _emCur.e !== e) return;   // another one was picked meanwhile
      var st = document.getElementById("emMsgStatus");
      if (st) st.innerHTML = "";
      _emShowBody(key, e, data.html || "");
      if (_emHot(e) && !reopen) _emMarkRead(key, e);
    })
    .catch(function (err) {
      var st = document.getElementById("emMsgStatus");
      if (st && _emCur && _emCur.e === e) rpmFail(st, err.message, "left");
    });
}

// The email in the portal's look (user, 2026-11-12: "gray screen and text"):
// plain text on the grey screen, links kept, pictures and the sender's layout
// dropped. A student's: only their own words, the quoted email under a reply cut off.
function _emShowBody(key, e, html) {
  var read = document.getElementById("emRead");
  if (!read) return;
  // Cutting the quote can leave nothing when the whole email IS a quote (Mac Mail's
  // Share wraps it all in one, 2026-11-16 Tianyi Cao): then show it uncut.
  var text = _emPlain(html, key === "students") || (key === "students" ? _emPlain(html, false) : "");
  read.innerHTML = '<div class="em-text">' + (text || "(no text)") + '</div>';
}

// The email's HTML → safe portal HTML: escaped text, line breaks, and its links
// (as underlined words). cutQuote: drop the quoted email under a reply
// (Gmail / Apple Mail / Outlook / Yahoo).
function _emPlain(html, cutQuote) {
  var doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, head, title, img").forEach(function (n) { n.remove(); });
  // Hidden preview text marketing emails carry (display:none, 0 size, invisible).
  doc.querySelectorAll("[style]").forEach(function (n) {
    var st = (n.getAttribute("style") || "").toLowerCase().replace(/\s+/g, "");
    if (/display:none|visibility:hidden|max-height:0|font-size:0|opacity:0|mso-hide:all/.test(st)) n.remove();
  });
  if (cutQuote) doc.querySelectorAll("blockquote, .gmail_quote, .gmail_attr, #appendonsend, [id^=divRplyFwdMsg], .yahoo_quoted").forEach(function (n) { n.remove(); });
  var out = "";
  function nl() { if (out && !/\n$/.test(out)) out += "\n"; }
  (function walk(n) {
    if (n.nodeType === 3) { out += inqEsc(n.nodeValue.replace(/[\u00ad\u034f\u200b-\u200f\u2060\ufeff]/g, "").replace(/\s+/g, " ")); return; }
    if (n.nodeType !== 1) return;
    var tag = n.tagName;
    if (tag === "BR") { out += "\n"; return; }
    var block = /^(DIV|P|TR|LI|H[1-6]|TABLE|UL|OL|CENTER|SECTION)$/.test(tag);
    if (block) nl();
    var href = tag === "A" ? (n.getAttribute("href") || "") : "";
    var link = /^https?:/i.test(href);
    if (link) out += '<a href="' + inqEsc(href) + '" target="_blank" rel="noopener">';
    for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
    if (link) out += '</a>';
    if (block) nl();
  })(doc.body || doc);
  var t = out.split("\n").map(function (l) { return l.trim(); }).join("\n");
  if (cutQuote) {
    var cut = t.search(/\n(On .{0,300}wrote:|-{2,}\s*Original Message|From: .*\nSent: )/i);
    if (cut > 0) t = t.slice(0, cut);
  }
  t = t.replace(/<a [^>]*>\s*<\/a>/g, "");   // links that were only a picture
  // A student's blank lines are theirs; a designed email's come from its tables, so they go.
  return t.replace(cutQuote ? /\n{3,}/g : /\n{2,}/g, cutQuote ? "\n\n" : "\n").trim();
}

function _emMarkRead(key, e) {
  var action = key === "gbusiness" ? "markGBusinessRead" : "markEmailRead";
  fetch(getScriptUrl() + "?action=" + action + "&id=" + encodeURIComponent(e.id))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) return;
      e.unread = false;
      e.isNew = false;
      _emRender();
      fetchEmailsUnread();
    })
    .catch(function () {});
}

// New-email counts: the Emails tab badge (both), each switch, and the Home
// rack screen (students on their own line, with who wrote).
// core/api.js calls it at portal start; it re-checks every 10 min after that.
function fetchEmailsUnread() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getEmailsUnread")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) return;
      var n = data.count || 0, stu = data.students || 0;
      _emCounts = { students: stu, gbusiness: data.gbusiness != null ? data.gbusiness : Math.max(0, n - stu), names: data.names || [] };
      var b = document.getElementById("emNavBadge");
      if (b) {
        if (n > 0) { b.textContent = n; b.style.display = ""; }
        else { b.style.display = "none"; }
      }
      _emPlates();
    })
    .catch(function () {});
}

function _emPlates() {
  var a = document.getElementById("emStuN"), g = document.getElementById("emGbN");
  if (a) a.textContent = _emCounts.students || "";
  if (g) g.textContent = _emCounts.gbusiness || "";
}

setInterval(function () { if (!document.hidden) fetchEmailsUnread(); }, 10 * 60 * 1000);

// ─── TEXTS / EMAILS SWITCH (user, 2026-11-22) ───────────────────────────────
// Two lit amber buttons like Fixed schedule's Full / Half, in both head boxes
// (Comms' TWILIO box and Emails'). The page you're on is lit; the other one is
// dark and jumps there. Same-size boxes, so it reads as one box flipping.
function rpmMsgSwitchHtml(on) {
  _rpmMsgSwitchCss();
  var b = function (key, label, tab) {
    var lit = key === on;
    return "<span class='ms-amp'><button type='button'" + (lit ? " class='lit' aria-pressed='true'" : " onclick=\"switchTab('" + tab + "')\"") +
      " data-tip='" + (lit ? "You're here." : "Instant.\nShows " + label + ".") + "'>" + label + "</button></span>";
  };
  return "<span class='ms-switch'>" + b("texts", "Texts", "comms") + b("emails", "Emails", "emails") + "</span>";
}
function _rpmMsgSwitchCss() {
  if (document.getElementById("msSwitchCss")) return;
  var st = document.createElement("style");
  st.id = "msSwitchCss";
  st.textContent =
    "html body .ms-switch{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;gap:6px;z-index:1}" +
    "html body .ms-amp{display:block;padding:2px;background:#0b0b0b;border-radius:3px;box-shadow:inset 0 1px 1px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.05)}" +
    "html body .ms-amp>button{display:block;width:48px;height:14px;padding:0 0 0 1.5px;border:0;border-radius:2px;cursor:pointer;font:700 7px/14px 'DM Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;" +
      "color:#5e4d2a;background:#17140c;box-shadow:inset 0 1px 0 rgba(255,230,150,.05),inset 0 -2px 3px rgba(0,0,0,.4)}" +   // unlit
    "html body .ms-amp>button:hover{color:#8a7038}" +
    "html body .ms-amp>button.lit{cursor:default;color:#1c1504;text-shadow:0 1px 0 rgba(255,225,140,.18);background:radial-gradient(ellipse 70% 85% at 50% 45%,#c09e34 0%,#a07b1e 45%,#6e5310 85%,#523e0c 100%);" +
      "box-shadow:inset 0 1px 0 rgba(255,230,150,.25),inset 0 -2px 3px rgba(0,0,0,.4),inset 0 0 4px rgba(0,0,0,.35),0 0 4px rgba(220,170,40,.12)}";   // lit = Full / Half's amber
  document.head.appendChild(st);
}
